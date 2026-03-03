import type { Socket } from 'socket.io-client'
import * as Y from 'yjs'
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness'

type YjsSyncResponse =
  | { success: true; status: 'ready'; state: string; awareness: string | null }
  | { success: true; status: 'bootstrap'; role: 'initializer'; initialHtml: string }
  | { success: true; status: 'waiting' }
  | { success: true; status: 'already_ready' }
  | { success: false; error: string }

type YjsSyncResponseEvent = {
  documentId: string
  entityType?: 'document' | 'note' | 'slide'
  state: string
  awareness: string | null
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
  entityType?: 'document' | 'note' | 'slide'
  ydoc: Y.Doc
  awareness: Awareness
  onSyncedChange?: (isSynced: boolean) => void
  onBootstrapRequired?: (html: string) => Promise<void> | void
  onLocalDocumentChange?: () => void
  /** Resolve before first apply of doc/awareness state so the editor view can mount. */
  onBeforeFirstSync?: () => Promise<void>
}

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
  private entityType: 'document' | 'note' | 'slide'
  private ydoc: Y.Doc

  private destroyed = false
  private synced = false
  private started = false

  private onSyncedChange?: (isSynced: boolean) => void
  private onBootstrapRequired?: (html: string) => Promise<void> | void
  private onLocalDocumentChange?: () => void
  private readonly onBeforeFirstSync?: () => Promise<void>
  private hasWaitedForReady = false

  private retrySyncTimeout: number | null = null

  constructor(options: SocketIoYjsProviderOptions) {
    this.socket = options.socket
    this.documentId = options.documentId
    this.entityType = options.entityType || 'document'
    this.ydoc = options.ydoc
    this.awareness = options.awareness
    this.onSyncedChange = options.onSyncedChange
    this.onBootstrapRequired = options.onBootstrapRequired
    this.onLocalDocumentChange = options.onLocalDocumentChange
    this.onBeforeFirstSync = options.onBeforeFirstSync
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
    this.socket.on('yjs_update', this.handleRemoteYjsUpdate)
    this.socket.on('yjs_awareness_update', this.handleRemoteAwarenessUpdate)
    this.socket.on('yjs_sync_response', this.handleSyncResponseEvent)

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

    this.socket.off('connect', this.handleSocketConnect)
    this.socket.off('yjs_update', this.handleRemoteYjsUpdate)
    this.socket.off('yjs_awareness_update', this.handleRemoteAwarenessUpdate)
    this.socket.off('yjs_sync_response', this.handleSyncResponseEvent)

    this.ydoc.off('update', this.handleLocalYjsUpdate)
    this.awareness.off('update', this.handleLocalAwarenessUpdate)
  }

  isSynced() {
    return this.synced
  }

  private setSynced(next: boolean) {
    if (this.synced === next) return
    this.synced = next
    this.onSyncedChange?.(next)
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
        10000
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  private handleSyncFailure(response: Extract<YjsSyncResponse, { success: false }>) {
    console.error('[SocketIoYjsProvider] Sync failed:', response.error)
    this.scheduleSyncRetry()
  }

  private async handleReadyStatus(
    response: Extract<YjsSyncResponse, { success: true; status: 'ready' | 'already_ready' }>
  ): Promise<boolean> {
    if (response.status !== 'ready' && response.status !== 'already_ready') return false

    await this.waitReadyIfNeeded()
    if (this.destroyed) return false

    console.log('[SocketIoYjsProvider] Applying ready state, status:', response.status)
    if (response.status === 'ready') {
      this.applyDocState(response.state)
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

  private async handleBootstrapInitializer(
    response: Extract<YjsSyncResponse, { success: true; status: 'bootstrap'; role: 'initializer' }>
  ): Promise<boolean> {
    if (response.status !== 'bootstrap' || response.role !== 'initializer') return false

    try {
      await this.onBootstrapRequired?.(response.initialHtml)
    } catch (error) {
      console.error('[SocketIoYjsProvider] Bootstrap callback failed:', error)
      this.scheduleSyncRetry()
      return true
    }

    if (this.destroyed) return true

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

    this.setSynced(true)
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

    console.log(`[SocketIoYjsProvider] Starting sync for ${this.entityType}:`, this.documentId)

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

  private applyDocState(stateBase64: string) {
    try {
      const stateBytes = base64ToUint8Array(stateBase64)
      console.log('[SocketIoYjsProvider] Applying doc state, length:', stateBytes.length)
      Y.applyUpdate(this.ydoc, stateBytes, 'remote')

      const fragment = this.ydoc.getXmlFragment('default')
      console.log('[SocketIoYjsProvider] After applying state, fragment length:', fragment.length)
      console.log('[SocketIoYjsProvider] Fragment content:', fragment.toJSON())
    } catch (error) {
      console.error('[SocketIoYjsProvider] Failed applying doc state:', error)
    }
  }

  private applyAwarenessState(updateBase64: string) {
    try {
      applyAwarenessUpdate(this.awareness, base64ToUint8Array(updateBase64), 'remote')
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
      this.applyDocState(event.state)
      if (event.awareness) {
        this.applyAwarenessState(event.awareness)
      }
      this.setSynced(true)
    })
  }

  private readonly handleRemoteYjsUpdate = (event: {
    documentId: string
    entityType?: 'document' | 'note' | 'slide'
    update: string
  }) => {
    if (this.destroyed) return
    if (!event || event.documentId !== this.documentId) return
    const eventEntityType = event.entityType || 'document'
    if (eventEntityType !== this.entityType) return
    void this.waitReadyIfNeeded().then(() => {
      if (this.destroyed) return
      this.applyDocState(event.update)
    })
  }

  private handleRemoteAwarenessUpdate = (event: {
    documentId: string
    entityType?: 'document' | 'note' | 'slide'
    update: string
  }) => {
    if (this.destroyed) return
    if (!event || event.documentId !== this.documentId) return
    const eventEntityType = event.entityType || 'document'
    if (eventEntityType !== this.entityType) return
    void this.waitReadyIfNeeded().then(() => {
      if (this.destroyed) return
      this.applyAwarenessState(event.update)
    })
  }

  private handleLocalYjsUpdate = (_update: Uint8Array, origin: unknown) => {
    if (this.destroyed) return
    if (!this.synced) return
    if (origin === 'remote') return

    const updateBase64 = uint8ArrayToBase64(_update)
    this.socket.emit('yjs_update', { documentId: this.documentId, entityType: this.entityType, update: updateBase64 })
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
    if (!this.synced) return
    if (origin === 'remote') return

    const changed = [...added, ...updated, ...removed]
    if (changed.length === 0) return

    const update = encodeAwarenessUpdate(this.awareness, changed)
    this.socket.emit('yjs_awareness_update', {
      documentId: this.documentId,
      entityType: this.entityType,
      update: uint8ArrayToBase64(update)
    })
  }
}
