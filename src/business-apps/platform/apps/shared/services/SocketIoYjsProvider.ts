import type { Socket } from 'socket.io-client'
import * as Y from 'yjs'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'

type YjsSyncResponse =
  | { success: true; status: 'ready'; state: string; awareness: string | null }
  | { success: true; status: 'bootstrap'; role: 'initializer'; initialHtml: string }
  | { success: true; status: 'waiting' }
  | { success: true; status: 'already_ready' }
  | { success: false; error: string }

type YjsEntityType = 'document' | 'note' | 'slide' | 'whiteboard'

type YjsSyncResponseEvent = {
  documentId: string
  entityType?: YjsEntityType
  state: string
  awareness: string | null
}

type YjsRoomStatusEvent = {
  entityType?: YjsEntityType
  entityId: string
  status: 'readonly' | 'trashed' | 'error'
  reason: string
}

type YjsUpdateAck = {
  success: boolean
  error?: string
}

function uint8ArrayToBase64(value: Uint8Array): string {
  // Avoid stack overflows by chunking.
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < value.length; i += chunkSize) {
    const chunk = value.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }
  return btoa(binary)
}

function base64ToUint8Array(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function emitWithAck<TResponse>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs: number
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`Timeout waiting for ack: ${event}`)), timeoutMs)
    socket.emit(event, payload, (response: TResponse) => {
      window.clearTimeout(timeout)
      resolve(response)
    })
  })
}

export interface SocketIoYjsProviderOptions {
  socket: Socket
  documentId: string
  entityType?: YjsEntityType
  ydoc: Y.Doc
  awareness: Awareness
  getDocumentSnapshot?: () => string | undefined
  onSyncedChange?: (isSynced: boolean) => void
  onBootstrapRequired?: (html: string) => Promise<void> | void
  onReadyStateApplied?: (info: {
    source: 'sync' | 'event'
    status: 'ready' | 'already_ready'
    fragmentLength: number
  }) => Promise<void> | void
  onLocalDocumentChange?: () => void
  onRemoteDocumentChange?: () => void
  onRemoteAwarenessChange?: () => void
  /** Resolve before first apply of doc/awareness state so the editor view can mount. */
  onBeforeFirstSync?: () => Promise<void>
  /** Max wait for `yjs_sync_request` ack (large docs / busy main thread need more time). Default 60s. */
  syncAckTimeoutMs?: number
}

const DEFAULT_YJS_SYNC_ACK_TIMEOUT_MS = 60_000

/**
 * SocketIoYjsProvider
 *
 * Minimal Yjs provider that syncs through the document-service Socket.IO collaboration gateway.
 * - Sync: `yjs_sync_request` → `yjs_update`
 * - Awareness: `yjs_awareness_update`
 * - Bootstrap for legacy docs: `yjs_bootstrap`
 */
export class SocketIoYjsProvider {
  public awareness: Awareness

  private socket: Socket
  private documentId: string
  private entityType: YjsEntityType
  private ydoc: Y.Doc

  private destroyed = false
  private synced = false
  private started = false

  private onSyncedChange?: (isSynced: boolean) => void
  private onBootstrapRequired?: (html: string) => Promise<void> | void
  private readonly onReadyStateApplied?: (info: {
    source: 'sync' | 'event'
    status: 'ready' | 'already_ready'
    fragmentLength: number
  }) => Promise<void> | void
  private onLocalDocumentChange?: () => void
  private onRemoteDocumentChange?: () => void
  private onRemoteAwarenessChange?: () => void
  private readonly getDocumentSnapshot?: () => string | undefined
  private readonly onBeforeFirstSync?: () => Promise<void>
  private hasWaitedForReady = false

  private retrySyncTimeout: number | null = null
  private pendingLocalDocUpdates: Uint8Array[] = []
  private pendingLocalAwarenessUpdates: Uint8Array[] = []
  private pendingRemoteDocUpdates: Uint8Array[] = []
  private remoteDocFlushTimerId: ReturnType<typeof setTimeout> | null = null
  private pendingLocalDocFlush: Uint8Array[] = []
  private localDocFlushTimerId: ReturnType<typeof setTimeout> | null = null
  private isApplyingRemoteDocUpdate = false
  private readonly syncAckTimeoutMs: number
  private remoteUpdateCount = 0
  private localUpdateCount = 0

  constructor(options: SocketIoYjsProviderOptions) {
    this.socket = options.socket
    this.documentId = options.documentId
    this.entityType = options.entityType || 'document'
    this.ydoc = options.ydoc
    this.awareness = options.awareness
    this.getDocumentSnapshot = options.getDocumentSnapshot
    this.onSyncedChange = options.onSyncedChange
    this.onBootstrapRequired = options.onBootstrapRequired
    this.onReadyStateApplied = options.onReadyStateApplied
    this.onLocalDocumentChange = options.onLocalDocumentChange
    this.onRemoteDocumentChange = options.onRemoteDocumentChange
    this.onRemoteAwarenessChange = options.onRemoteAwarenessChange
    this.onBeforeFirstSync = options.onBeforeFirstSync
    this.syncAckTimeoutMs =
      typeof options.syncAckTimeoutMs === 'number' && options.syncAckTimeoutMs > 0
        ? options.syncAckTimeoutMs
        : DEFAULT_YJS_SYNC_ACK_TIMEOUT_MS
  }

  private async waitReadyIfNeeded(): Promise<void> {
    if (!this.onBeforeFirstSync || this.hasWaitedForReady) return
    await this.onBeforeFirstSync()
    this.hasWaitedForReady = true
  }

  start() {
    if (this.started) return
    this.started = true

    this.socket.on('connect', this.handleSocketConnect)
    this.socket.on('disconnect', this.handleSocketDisconnect)
    this.socket.on('yjs_update', this.handleRemoteYjsUpdate)
    this.socket.on('yjs_awareness_update', this.handleRemoteAwarenessUpdate)
    this.socket.on('yjs_sync_response', this.handleSyncResponseEvent)
    this.socket.on('yjs_room_status', this.handleRoomStatus)

    this.ydoc.on('update', this.handleLocalYjsUpdate)
    this.awareness.on('update', this.handleLocalAwarenessUpdate)

    if (this.socket.connected) {
      this.triggerSync()
    }
  }

  destroy() {
    this.destroyed = true

    if (this.retrySyncTimeout !== null) {
      window.clearTimeout(this.retrySyncTimeout)
      this.retrySyncTimeout = null
    }
    if (this.remoteDocFlushTimerId !== null) {
      clearTimeout(this.remoteDocFlushTimerId)
      this.remoteDocFlushTimerId = null
    }
    if (this.localDocFlushTimerId !== null) {
      clearTimeout(this.localDocFlushTimerId)
      this.localDocFlushTimerId = null
    }
    this.pendingLocalDocUpdates = []
    this.pendingLocalDocFlush = []
    this.pendingLocalAwarenessUpdates = []
    this.pendingRemoteDocUpdates = []

    this.socket.off('connect', this.handleSocketConnect)
    this.socket.off('disconnect', this.handleSocketDisconnect)
    this.socket.off('yjs_update', this.handleRemoteYjsUpdate)
    this.socket.off('yjs_awareness_update', this.handleRemoteAwarenessUpdate)
    this.socket.off('yjs_sync_response', this.handleSyncResponseEvent)
    this.socket.off('yjs_room_status', this.handleRoomStatus)

    this.ydoc.off('update', this.handleLocalYjsUpdate)
    this.awareness.off('update', this.handleLocalAwarenessUpdate)
  }

  isSynced() {
    return this.synced
  }

  flushPendingLocalUpdates() {
    if (this.localDocFlushTimerId !== null) {
      clearTimeout(this.localDocFlushTimerId)
      this.localDocFlushTimerId = null
    }
    this.flushLocalDocUpdates()
  }

  requestResync() {
    this.setSynced(false)
    this.triggerSync()
  }

  private setSynced(next: boolean) {
    if (this.synced === next) return
    this.synced = next
    this.onSyncedChange?.(next)

    if (!next) {
      if (this.localDocFlushTimerId !== null) {
        clearTimeout(this.localDocFlushTimerId)
        this.localDocFlushTimerId = null
      }
      const buffered = this.pendingLocalDocFlush.splice(0)
      if (buffered.length > 0) {
        const merged = buffered.length === 1 ? buffered[0] : Y.mergeUpdates(buffered)
        this.pendingLocalDocUpdates.push(merged)
      }
      return
    }

    if (this.pendingLocalDocUpdates.length > 0) {
      const updates = this.pendingLocalDocUpdates.splice(0)
      updates.forEach(update => {
        this.socket.emit('yjs_update', {
          documentId: this.documentId,
          entityType: this.entityType,
          update: uint8ArrayToBase64(update),
          ...(this.entityType === 'note' ? { htmlSnapshot: this.getDocumentSnapshot?.() } : {})
        })
      })
    }
    if (this.pendingLocalAwarenessUpdates.length > 0) {
      const updates = this.pendingLocalAwarenessUpdates.splice(0)
      updates.forEach(update => {
        this.socket.emit('yjs_awareness_update', {
          documentId: this.documentId,
          entityType: this.entityType,
          update: uint8ArrayToBase64(update)
        })
      })
    }
  }

  private triggerSync() {
    this.sync().catch(error => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('[SocketIoYjsProvider] Sync threw:', message)
    })
  }

  private handleSocketConnect = () => {
    if (this.destroyed) return
    this.triggerSync()
  }

  private readonly handleSocketDisconnect = () => {
    if (this.destroyed) return
    this.setSynced(false)
  }

  private scheduleSyncRetry(delayMs: number = 1500) {
    if (this.retrySyncTimeout !== null) {
      window.clearTimeout(this.retrySyncTimeout)
    }
    this.retrySyncTimeout = window.setTimeout(() => this.triggerSync(), delayMs)
  }

  private async requestSync(): Promise<YjsSyncResponse> {
    try {
      return await emitWithAck<YjsSyncResponse>(
        this.socket,
        'yjs_sync_request',
        { documentId: this.documentId, entityType: this.entityType },
        this.syncAckTimeoutMs
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  private static readonly PERMANENT_ERROR_PATTERNS = ['access', 'forbidden', 'not found', 'permission', 'unauthorized']

  private isPermanentError(error: string): boolean {
    const lower = error.toLowerCase()
    return SocketIoYjsProvider.PERMANENT_ERROR_PATTERNS.some(p => lower.includes(p))
  }

  private handleSyncFailure(response: Extract<YjsSyncResponse, { success: false }>) {
    console.error('[SocketIoYjsProvider] Sync failed:', response.error)
    if (this.isPermanentError(response.error)) {
      console.warn('[SocketIoYjsProvider] Permanent error, will not retry')
      return
    }
    this.scheduleSyncRetry()
  }

  private async handleReadyStatus(
    response: Extract<YjsSyncResponse, { success: true; status: 'ready' | 'already_ready' }>
  ): Promise<boolean> {
    if (response.status !== 'ready' && response.status !== 'already_ready') return false

    await this.waitReadyIfNeeded()
    if (this.destroyed) return false

    if (response.status === 'ready') {
      const fragmentLength = this.applyDocState(response.state)
      if (this.shouldQueueLocalDiffAfterFullSync()) {
        this.queueLocalDiffAfterFullSync(response.state)
      }
      await this.onReadyStateApplied?.({
        source: 'sync',
        status: response.status,
        fragmentLength
      })
      const awarenessPayload = response.awareness
      if (awarenessPayload) {
        // Defer awareness so the view finishes applying doc state before we dispatch again.
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })
        if (this.destroyed) return false
        this.applyAwarenessState(awarenessPayload)
      }
    }
    this.setSynced(true)
    return true
  }

  /**
   * After applying a full server snapshot, compute whatever the local ydoc has
   * that the server state didn't know about (e.g. TipTap's initial empty paragraph,
   * written to the ydoc before the provider listener was registered) and queue it
   * for sending so other peers can resolve Yjs predecessor dependencies.
   */
  private queueLocalDiffAfterFullSync(serverStateBase64: string): void {
    try {
      const serverStateBytes = base64ToUint8Array(serverStateBase64)
      const tempDoc = new Y.Doc()
      Y.applyUpdate(tempDoc, serverStateBytes)
      const serverSV = Y.encodeStateVector(tempDoc)
      tempDoc.destroy()
      const localDiff = Y.encodeStateAsUpdate(this.ydoc, serverSV)
      if (localDiff.length > 2) {
        this.pendingLocalDocUpdates.push(localDiff)
      }
    } catch (error) {
      console.error('[SocketIoYjsProvider] queueLocalDiffAfterFullSync failed:', error)
    }
  }

  private async flushLayoutAfterBootstrap(): Promise<void> {
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
  }

  /**
   * TipTap Collaboration mirrors the document into Y.XmlFragment("default").
   * Encoding the Y.Doc before that fragment is populated produces a persisted snapshot
   * that reopens as a blank editor; wait until the fragment has at least one node.
   */
  private async waitForDefaultXmlFragment(maxWaitMs: number): Promise<boolean> {
    const deadline = Date.now() + maxWaitMs
    while (Date.now() < deadline) {
      if (this.destroyed) return false
      try {
        if (this.ydoc.getXmlFragment('default').length > 0) {
          return true
        }
      } catch {
        // ignore — treat as not ready yet
      }
      await new Promise<void>(resolve => {
        window.setTimeout(resolve, 40)
      })
    }
    try {
      return this.ydoc.getXmlFragment('default').length > 0
    } catch {
      return false
    }
  }

  /**
   * Rich-text entities (document, note) bootstrap through TipTap's `default` XML fragment.
   * Slides and whiteboards use Yjs arrays/maps only and never populate that fragment,
   * so waiting for it would stall forever and block sync from completing.
   */
  private requiresDefaultXmlBootstrapGuard(): boolean {
    return this.entityType === 'document' || this.entityType === 'note'
  }

  private shouldQueueLocalDiffAfterFullSync(): boolean {
    return this.requiresDefaultXmlBootstrapGuard() || this.entityType === 'whiteboard'
  }

  private shouldPreservePendingLocalUpdatesAfterBootstrap(): boolean {
    return this.requiresDefaultXmlBootstrapGuard()
  }

  private async handleBootstrapInitializer(
    response: Extract<YjsSyncResponse, { success: true; status: 'bootstrap'; role: 'initializer' }>
  ): Promise<boolean> {
    if (response.status !== 'bootstrap' || response.role !== 'initializer') return false

    await this.waitReadyIfNeeded()
    if (this.destroyed) return true

    try {
      await this.onBootstrapRequired?.(response.initialHtml)
    } catch (error) {
      console.error('[SocketIoYjsProvider] Bootstrap callback failed:', error)
      this.scheduleSyncRetry()
      return true
    }

    if (this.destroyed) return true

    await this.flushLayoutAfterBootstrap()
    if (this.requiresDefaultXmlBootstrapGuard()) {
      const fragmentReady = await this.waitForDefaultXmlFragment(8000)
      if (!fragmentReady) {
        console.error(
          '[SocketIoYjsProvider] Collaborative default fragment still empty after bootstrap; will retry sync instead of sending poisoned Yjs state'
        )
        this.scheduleSyncRetry()
        return true
      }
    }

    const fullStateBase64 = uint8ArrayToBase64(Y.encodeStateAsUpdate(this.ydoc))
    const bootstrapResp = await emitWithAck<{ success: boolean; error?: string }>(
      this.socket,
      'yjs_bootstrap',
      { documentId: this.documentId, entityType: this.entityType, state: fullStateBase64 },
      15000
    ).catch((err: Error) => ({ success: false, error: err.message }))

    if (!bootstrapResp.success) {
      console.error('[SocketIoYjsProvider] Bootstrap failed:', bootstrapResp.error)
      this.scheduleSyncRetry()
      return true
    }

    if (!this.shouldPreservePendingLocalUpdatesAfterBootstrap()) {
      this.pendingLocalDocUpdates = []
    }

    // The server emits a full `yjs_sync_response` after accepting bootstrap.
    // Wait for that snapshot so the initializer and waiting peers converge on
    // the same authoritative Y.Doc state before we mark the provider synced.
    window.setTimeout(() => {
      if (!this.destroyed && !this.synced) {
        this.triggerSync()
      }
    }, 1500)
    return true
  }

  private handleWaitingStatus(response: Extract<YjsSyncResponse, { success: true; status: 'waiting' }>): boolean {
    if (response.status !== 'waiting') return false
    this.scheduleSyncRetry()
    return true
  }

  private sync = async () => {
    if (this.destroyed) return
    if (!this.documentId) return
    if (this.synced) return

    const response = await this.requestSync()
    if (this.destroyed) return

    if (!response.success) {
      this.handleSyncFailure(response)
      return
    }

    if (
      await this.handleReadyStatus(
        response as Extract<YjsSyncResponse, { success: true; status: 'ready' | 'already_ready' }>
      )
    )
      return
    if (
      await this.handleBootstrapInitializer(
        response as Extract<YjsSyncResponse, { success: true; status: 'bootstrap'; role: 'initializer' }>
      )
    )
      return
    this.handleWaitingStatus(response as Extract<YjsSyncResponse, { success: true; status: 'waiting' }>)
  }

  private applyDocState(stateBase64: string): number {
    try {
      const stateBytes = base64ToUint8Array(stateBase64)
      this.isApplyingRemoteDocUpdate = true
      try {
        Y.applyUpdate(this.ydoc, stateBytes)
      } finally {
        this.isApplyingRemoteDocUpdate = false
      }
      this.onRemoteDocumentChange?.()
      return this.ydoc.getXmlFragment('default').length
    } catch (error) {
      console.error('[SocketIoYjsProvider] Failed applying doc state:', error)
      return -1
    }
  }

  private applyAwarenessState(updateBase64: string) {
    try {
      applyAwarenessUpdate(this.awareness, base64ToUint8Array(updateBase64), 'remote')
      this.onRemoteAwarenessChange?.()
    } catch (error) {
      console.error('[SocketIoYjsProvider] Failed applying awareness state:', error)
    }
  }

  private handleSyncResponseEvent = (event: YjsSyncResponseEvent) => {
    if (this.destroyed) return
    if (!event || event.documentId !== this.documentId) return
    const eventEntityType = event.entityType || 'document'
    if (eventEntityType !== this.entityType) return
    if (this.synced) return

    void this.waitReadyIfNeeded().then(() => {
      if (this.destroyed) return
      const fragmentLength = this.applyDocState(event.state)
      if (this.shouldQueueLocalDiffAfterFullSync()) {
        this.queueLocalDiffAfterFullSync(event.state)
      }
      void this.onReadyStateApplied?.({
        source: 'event',
        status: 'ready',
        fragmentLength
      })
      if (event.awareness) {
        this.applyAwarenessState(event.awareness)
      }
      this.setSynced(true)
    })
  }

  private readonly handleRoomStatus = (event: YjsRoomStatusEvent) => {
    if (this.destroyed) return
    if (event?.entityId !== this.documentId) return
    const eventEntityType = event.entityType || 'document'
    if (eventEntityType !== this.entityType) return
    console.warn('[SocketIoYjsProvider] Room status changed:', event.status, event.reason)
    if (event.status === 'readonly' || event.status === 'trashed' || event.status === 'error') {
      this.setSynced(false)
    }
    if (event.status === 'error') {
      this.scheduleSyncRetry(250)
    }
  }

  private scheduleRemoteDocFlush() {
    if (this.remoteDocFlushTimerId !== null) return
    this.remoteDocFlushTimerId = setTimeout(() => {
      this.remoteDocFlushTimerId = null
      this.flushRemoteDocUpdates()
    }, 50)
  }

  private flushRemoteDocUpdates() {
    const updates = this.pendingRemoteDocUpdates.splice(0)
    if (updates.length === 0) return
    const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates)
    this.isApplyingRemoteDocUpdate = true
    try {
      Y.applyUpdate(this.ydoc, merged)
    } finally {
      this.isApplyingRemoteDocUpdate = false
    }
    this.onRemoteDocumentChange?.()
  }

  private flushLocalDocUpdates = () => {
    this.localDocFlushTimerId = null
    if (this.destroyed || !this.synced) return
    const updates = this.pendingLocalDocFlush.splice(0)
    if (updates.length === 0) return
    const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates)
    const updateBase64 = uint8ArrayToBase64(merged)
    const updateNumber = ++this.localUpdateCount
    if (this.entityType === 'slide') {
      console.info('[SocketIoYjsProvider] Sending slide Yjs update:', {
        documentId: this.documentId,
        updateNumber,
        updateBytes: merged.length,
        updateBase64Length: updateBase64.length
      })
    }
    this.socket.timeout(15000).emit(
      'yjs_update',
      {
        documentId: this.documentId,
        entityType: this.entityType,
        update: updateBase64,
        ...(this.entityType === 'note' ? { htmlSnapshot: this.getDocumentSnapshot?.() } : {})
      },
      (error: Error | null, response?: YjsUpdateAck) => {
        if (error) {
          console.error('[SocketIoYjsProvider] yjs_update ack timeout/error:', {
            documentId: this.documentId,
            updateNumber,
            message: error.message
          })
          this.setSynced(false)
          return
        }
        if (!response?.success) {
          console.error('[SocketIoYjsProvider] yjs_update rejected:', {
            documentId: this.documentId,
            updateNumber,
            error: response?.error || 'unknown'
          })
          this.setSynced(false)
        }
      }
    )
  }

  private readonly handleRemoteYjsUpdate = (event: {
    documentId: string
    entityType?: YjsEntityType
    update: string
  }) => {
    if (this.destroyed) return
    if (!event || event.documentId !== this.documentId) return
    const eventEntityType = event.entityType || 'document'
    if (eventEntityType !== this.entityType) return
    void this.waitReadyIfNeeded().then(() => {
      if (this.destroyed) return
      if (this.entityType === 'slide') {
        this.remoteUpdateCount += 1
        console.info('[SocketIoYjsProvider] Received slide Yjs update:', {
          documentId: this.documentId,
          updateNumber: this.remoteUpdateCount,
          updateBase64Length: event.update.length
        })
      }
      this.pendingRemoteDocUpdates.push(base64ToUint8Array(event.update))
      this.scheduleRemoteDocFlush()
    })
  }

  private handleRemoteAwarenessUpdate = (event: { documentId: string; entityType?: YjsEntityType; update: string }) => {
    if (this.destroyed) return
    if (!event || event.documentId !== this.documentId) return
    const eventEntityType = event.entityType || 'document'
    if (eventEntityType !== this.entityType) return
    void this.waitReadyIfNeeded().then(() => {
      if (this.destroyed) return
      this.applyAwarenessState(event.update)
    })
  }

  private handleLocalYjsUpdate = (_update: Uint8Array) => {
    if (this.destroyed) return
    if (this.isApplyingRemoteDocUpdate) return

    if (this.synced) {
      this.pendingLocalDocFlush.push(_update)
      if (this.localDocFlushTimerId === null) {
        this.localDocFlushTimerId = setTimeout(this.flushLocalDocUpdates, 50)
      }
    } else {
      this.pendingLocalDocUpdates.push(_update)
    }
    this.onLocalDocumentChange?.()
  }

  private handleLocalAwarenessUpdate = (
    {
      added,
      updated,
      removed
    }: {
      added: number[]
      updated: number[]
      removed: number[]
    },
    origin: unknown
  ) => {
    if (this.destroyed) return
    if (origin === 'remote') return

    const changed = [...added, ...updated, ...removed]
    if (changed.length === 0) return

    const update = encodeAwarenessUpdate(this.awareness, changed)
    if (this.synced) {
      this.socket.emit('yjs_awareness_update', {
        documentId: this.documentId,
        entityType: this.entityType,
        update: uint8ArrayToBase64(update)
      })
    } else {
      this.pendingLocalAwarenessUpdates.push(update)
    }
  }
}
