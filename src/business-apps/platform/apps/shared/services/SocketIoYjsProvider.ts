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
  ydoc: Y.Doc
  awareness: Awareness
  onSyncedChange?: (isSynced: boolean) => void
  onBootstrapRequired?: (html: string) => Promise<void> | void
  onLocalDocumentChange?: () => void
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
  private ydoc: Y.Doc

  private destroyed = false
  private synced = false
  private started = false

  private onSyncedChange?: (isSynced: boolean) => void
  private onBootstrapRequired?: (html: string) => Promise<void> | void
  private onLocalDocumentChange?: () => void

  private retrySyncTimeout: number | null = null

  constructor(options: SocketIoYjsProviderOptions) {
    this.socket = options.socket
    this.documentId = options.documentId
    this.ydoc = options.ydoc
    this.awareness = options.awareness
    this.onSyncedChange = options.onSyncedChange
    this.onBootstrapRequired = options.onBootstrapRequired
    this.onLocalDocumentChange = options.onLocalDocumentChange
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
      void this.sync()
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

  private handleSocketConnect = () => {
    if (this.destroyed) return
    void this.sync()
  }

  private sync = async () => {
    if (this.destroyed) return
    if (!this.documentId) return

    // Avoid spamming syncs when already synced.
    if (this.synced) return

    console.log('[SocketIoYjsProvider] Starting sync for document:', this.documentId)

    const response = await emitWithAck<YjsSyncResponse>(
      this.socket,
      'yjs_sync_request',
      { documentId: this.documentId },
      10000
    ).catch((err: Error) => ({ success: false, error: err.message } as const))

    console.log('[SocketIoYjsProvider] Sync response:', response)

    if (this.destroyed) return

    if (!response.success) {
      console.error('[SocketIoYjsProvider] Sync failed:', response.error)
      // Retry with backoff
      this.retrySyncTimeout = window.setTimeout(() => void this.sync(), 1500)
      return
    }

    if (response.status === 'ready' || response.status === 'already_ready') {
      console.log('[SocketIoYjsProvider] Applying ready state, status:', response.status)
      if (response.status === 'ready') {
        console.log('[SocketIoYjsProvider] State base64 length:', response.state?.length)
        this.applyDocState(response.state)
        if (response.awareness) {
          this.applyAwarenessState(response.awareness)
        }
      }
      this.setSynced(true)
      console.log('[SocketIoYjsProvider] Sync complete - isYjsSynced set to true, editor should be editable now')
      return
    }

    if (response.status === 'bootstrap' && response.role === 'initializer') {
      // The server needs one client to initialize the Yjs state from HTML.
      console.log('[SocketIoYjsProvider] Bootstrap required - initializing from HTML:', response.initialHtml?.substring(0, 50))
      try {
        await this.onBootstrapRequired?.(response.initialHtml)
        console.log('[SocketIoYjsProvider] Bootstrap callback completed')
      } catch (error) {
        console.error('[SocketIoYjsProvider] Bootstrap callback failed:', error)
        // Retry to get a new initializer role if needed
        this.retrySyncTimeout = window.setTimeout(() => void this.sync(), 1500)
        return
      }

      if (this.destroyed) return

      // Send full state to server as the bootstrap snapshot.
      const fullStateBase64 = uint8ArrayToBase64(Y.encodeStateAsUpdate(this.ydoc))
      console.log('[SocketIoYjsProvider] Sending bootstrap state to server, length:', fullStateBase64.length)
      const bootstrapResp = await emitWithAck<{ success: boolean; error?: string }>(
        this.socket,
        'yjs_bootstrap',
        { documentId: this.documentId, state: fullStateBase64 },
        15000
      ).catch((err: Error) => ({ success: false, error: err.message }))

      console.log('[SocketIoYjsProvider] Bootstrap response:', bootstrapResp)

      if (!bootstrapResp.success) {
        console.error('[SocketIoYjsProvider] Bootstrap failed:', bootstrapResp.error)
        this.retrySyncTimeout = window.setTimeout(() => void this.sync(), 1500)
        return
      }

      this.setSynced(true)
      console.log('[SocketIoYjsProvider] Bootstrap complete - editor should be editable now')
      return
    }

    if (response.status === 'waiting') {
      // We'll wait for server broadcast `yjs_sync_response` and also retry in case it never arrives.
      console.log('[SocketIoYjsProvider] Waiting for bootstrap from another client...')
      this.retrySyncTimeout = window.setTimeout(() => void this.sync(), 1500)
    }
  }

  private applyDocState(stateBase64: string) {
    try {
      const stateBytes = base64ToUint8Array(stateBase64)
      console.log('[SocketIoYjsProvider] Applying doc state, length:', stateBytes.length)
      Y.applyUpdate(this.ydoc, stateBytes, 'remote')
      
      // Debug: Check what's in the Yjs doc now (TipTap uses 'default' fragment by default)
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

    // Only use this as a bootstrap/waiting escape hatch.
    if (this.synced) return

    this.applyDocState(event.state)
    if (event.awareness) {
      this.applyAwarenessState(event.awareness)
    }
    this.setSynced(true)
  }

  private handleRemoteYjsUpdate = (event: { documentId: string; update: string }) => {
    if (this.destroyed) return
    if (!event || event.documentId !== this.documentId) return
    this.applyDocState(event.update)
  }

  private handleRemoteAwarenessUpdate = (event: { documentId: string; update: string }) => {
    if (this.destroyed) return
    if (!event || event.documentId !== this.documentId) return
    this.applyAwarenessState(event.update)
  }

  private handleLocalYjsUpdate = (_update: Uint8Array, origin: unknown) => {
    if (this.destroyed) return
    if (!this.synced) return
    if (origin === 'remote') return

    const updateBase64 = uint8ArrayToBase64(_update)
    this.socket.emit('yjs_update', { documentId: this.documentId, update: updateBase64 })
    this.onLocalDocumentChange?.()
  }

  private handleLocalAwarenessUpdate = (
    {
      added,
      updated,
      removed,
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
    this.socket.emit('yjs_awareness_update', { documentId: this.documentId, update: uint8ArrayToBase64(update) })
  }
}

