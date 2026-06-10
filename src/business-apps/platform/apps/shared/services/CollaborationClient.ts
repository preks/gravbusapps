import { io, Socket } from 'socket.io-client'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { getSpreadsheetServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/spreadsheetServiceUrl'

// Client version for tracking
const CLIENT_VERSION = '1'

// When the server rejects us for an auth reason (expired/invalid token) it emits an
// `error` event and force-disconnects. Reconnecting immediately with the same token
// just gets rejected again, producing a tight loop that floods the server with
// `Rejecting socket ... invalid auth token` warnings. Instead we back off and wait
// for a fresh token (delivered via setAccessToken) before retrying.
const AUTH_RECONNECT_DELAY_MS = 30000

function isAuthRejectionMessage(message?: string): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes('auth') || normalized.includes('token') || normalized.includes('unauthorized')
}

export interface DocumentParticipant {
  userId: string
  userName: string
  userColor: string
  socketId: string
  avatarUrl?: string
  cursor?: {
    line?: number
    column?: number
    offset?: number
    path?: string[]
  }
  selection?: {
    start: { line?: number; column?: number; offset?: number }
    end: { line?: number; column?: number; offset?: number }
  }
  lastActiveAt: Date
}

export interface DocumentOperation {
  type: string
  data?: unknown
  path?: string
  baseVersion?: number
  broadcastOnly?: boolean
  version?: number
}

export interface CollaborationWebSocketOptions {
  connectionTimeout?: number
  reconnectionAttempts?: number
  reconnectionDelayMax?: number
  path?: string
  namespace?: string
  enablePollingFallback?: boolean
  serviceApiUrl?: string
  debug?: boolean
  onReconnectFailed?: () => void
}

export type CollaborationEventHandler = (data: any) => void

function resolveSocketTransports(enablePollingFallback: boolean) {
  return enablePollingFallback ? ['websocket', 'polling'] : ['websocket']
}

function isCollaborationDebugEnabled(explicitDebug?: boolean): boolean {
  if (explicitDebug === true) return true
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('nw-collab-debug') === 'true'
  } catch {
    return false
  }
}

export class CollaborationClient {
  private socket: Socket | null = null
  private accessToken = ''
  private url: string
  private options: CollaborationWebSocketOptions
  private reconnectAttempts = 0
  private maxReconnectAttempts: number
  private debug: boolean
  private onReconnectFailed?: () => void
  private lastAuthErrorAt = 0
  private authReconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(url: string, options: CollaborationWebSocketOptions = {}) {
    this.url = url
    this.debug = options.debug ?? false
    this.onReconnectFailed = options.onReconnectFailed
    this.options = {
      connectionTimeout: options.connectionTimeout || 20000,
      reconnectionAttempts: options.reconnectionAttempts || 10,
      reconnectionDelayMax: options.reconnectionDelayMax || 10000,
      path: options.path || '/socket.io',
      enablePollingFallback: options.enablePollingFallback !== false // default true
    }
    this.maxReconnectAttempts = this.options.reconnectionAttempts || 10
  }

  setAccessToken(token: string) {
    if (!token || token === this.accessToken) {
      return
    }

    this.accessToken = token
    if (!this.socket) {
      return
    }

    // A fresh token arrived. If we were backing off after an auth rejection,
    // cancel the wait and reconnect now so the user recovers immediately.
    if (this.authReconnectTimer) {
      this.clearAuthReconnectTimer()
      this.lastAuthErrorAt = 0
      this.forceReconnect()
      return
    }

    if (this.socket.connected) {
      this.forceReconnect()
    }
  }

  private clearAuthReconnectTimer() {
    if (this.authReconnectTimer) {
      clearTimeout(this.authReconnectTimer)
      this.authReconnectTimer = null
    }
  }

  private scheduleAuthReconnect() {
    if (this.authReconnectTimer) {
      return
    }

    console.warn(
      `[CollaborationClient] Auth rejected; backing off ${AUTH_RECONNECT_DELAY_MS}ms before retrying (waiting for refreshed token).`
    )
    this.authReconnectTimer = setTimeout(() => {
      this.authReconnectTimer = null
      if (this.socket && !this.socket.connected) {
        this.socket.connect()
      }
    }, AUTH_RECONNECT_DELAY_MS)
  }

  connect(token: string) {
    const nextToken = token || this.accessToken
    if (!nextToken) {
      throw new Error('[CollaborationClient] Access token required before connecting.')
    }

    if (this.socket) {
      this.accessToken = nextToken
      this.clearAuthReconnectTimer()
      this.lastAuthErrorAt = 0

      if (this.socket.connected) {
        return this.socket
      }

      this.socket.connect()
      return this.socket
    }

    this.accessToken = nextToken
    // Build transports array based on configuration
    const enablePollingFallback = this.options.enablePollingFallback !== false
    const transports = resolveSocketTransports(enablePollingFallback)

    if (this.debug) {
      console.log('[CollaborationClient] INITIATING CONNECTION')
      console.log('[CollaborationClient] Client Version:', CLIENT_VERSION)
      console.log('[CollaborationClient] URL:', this.url)
      console.log('[CollaborationClient] Path:', this.options.path)
      console.log('[CollaborationClient] Transports:', transports)
      console.log('[CollaborationClient] Full connection URL:', `${this.url}${this.options.path}`)
    }

    this.socket = io(this.url, {
      // Use a callback so every (re)connection attempt reads the *latest* token
      // rather than freezing the one captured at first connect.
      auth: cb => cb({ token: this.accessToken, clientVersion: CLIENT_VERSION }),
      transports,
      tryAllTransports: enablePollingFallback,
      path: this.options.path,
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: this.options.reconnectionDelayMax,
      reconnectionAttempts: this.options.reconnectionAttempts,
      timeout: this.options.connectionTimeout,
      upgrade: true,
      rememberUpgrade: true,
      forceNew: false,
      query: {
        clientType: 'web',
        clientVersion: CLIENT_VERSION,
        timestamp: Date.now().toString()
      },
      autoConnect: true,
      randomizationFactor: 0.5
    })

    // Log transport upgrade attempts
    this.socket.io.engine.on('upgrading', transport => {
      if (this.debug) console.log('[CollaborationClient] Upgrading transport to:', transport.name)
    })

    this.socket.io.engine.on('upgrade', transport => {
      if (this.debug) console.log('[CollaborationClient] Transport upgraded to:', transport.name)
    })

    this.socket.io.engine.on('upgradeError', error => {
      console.error('[CollaborationClient] Upgrade error:', error)
    })

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0
      this.lastAuthErrorAt = 0
      this.clearAuthReconnectTimer()
      if (this.debug) {
        console.log(
          `[CollaborationClient] CONNECTED! Socket ID: ${this.socket?.id}, Transport: ${this.socket?.io?.engine?.transport?.name}`
        )
      }
    })

    this.socket.on('disconnect', reason => {
      console.warn('[CollaborationClient] Disconnected:', reason)

      if (reason === 'io server disconnect') {
        // The server force-disconnects on auth rejection. If the disconnect
        // immediately follows an auth error, reconnecting now would just replay
        // the same rejected token, so back off and wait for a refreshed token.
        if (Date.now() - this.lastAuthErrorAt < 5000) {
          this.scheduleAuthReconnect()
          return
        }
        console.warn('[CollaborationClient] Server disconnected, attempting manual reconnection...')
        this.socket?.connect()
      } else if (reason === 'ping timeout') {
        console.error('[CollaborationClient] Connection lost due to ping timeout')
      } else if (reason === 'transport close') {
        console.error('[CollaborationClient] Transport connection closed')
      } else if (reason === 'transport error') {
        console.error('[CollaborationClient] Transport connection error')
      }
    })

    this.socket.on('connect_error', error => {
      this.reconnectAttempts++
      console.error(`[CollaborationClient] CONNECTION ERROR: ${error.message}, attempt: ${this.reconnectAttempts}`)

      if (isAuthRejectionMessage(error.message)) {
        this.lastAuthErrorAt = Date.now()
      }

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[CollaborationClient] Max reconnection attempts reached')
      }
    })

    this.socket.on('error', error => {
      console.error('[CollaborationClient] Error:', error)
      const message = typeof error === 'string' ? error : (error as { message?: string } | null | undefined)?.message
      if (isAuthRejectionMessage(message)) {
        this.lastAuthErrorAt = Date.now()
      }
    })

    this.socket.io.on('reconnect', () => {
      if (this.debug) console.log('[CollaborationClient] Reconnected after disconnect, socketId:', this.socket?.id)
    })

    this.socket.io.on('reconnect_failed', () => {
      console.error('[CollaborationClient] Reconnection failed after all attempts')
      this.onReconnectFailed?.()
    })

    return this.socket
  }

  disconnect() {
    this.clearAuthReconnectTimer()
    this.lastAuthErrorAt = 0
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.reconnectAttempts = 0
  }

  isConnected() {
    return this.socket?.connected || false
  }

  getSocket() {
    return this.socket
  }

  getConnectionStatus() {
    return {
      connected: this.socket?.connected || false,
      socketId: this.socket?.id,
      transport: this.socket?.io?.engine?.transport?.name,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      url: this.url
    }
  }

  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.reconnectAttempts = 0
      this.socket.connect()
    }
  }

  isHealthy() {
    return this.socket?.connected && this.reconnectAttempts < this.maxReconnectAttempts
  }

  // Document/Spreadsheet collaboration events

  /**
   * Join a document, spreadsheet, or note for collaboration
   */
  joinDocument(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string,
    onParticipantsReceived?: (participants: any[]) => void
  ) {
    const joinStartedAt = Date.now()
    const room = `${entityType}:${entityId}`

    if (!this.socket?.connected) {
      console.error('[CollaborationClient] join_document called but socket not connected', { room })
      return
    }

    if (this.debug) {
      console.log('[CollaborationClient] Joining document (emit):', { entityType, entityId, socketId: this.socket?.id })
    }

    let callbackFired = false
    this.socket.emit('join_document', { entityType, entityId }, (response: any) => {
      callbackFired = true
      const elapsed = Date.now() - joinStartedAt
      if (this.debug) {
        console.log('[CollaborationClient] Join document response:', {
          success: response?.success,
          participantsCount: response?.participants?.length ?? 0,
          elapsedMs: elapsed,
          room
        })
      }

      if (response?.success === true) {
        onParticipantsReceived?.(Array.isArray(response.participants) ? response.participants : [])
      } else if (response?.success === false) {
        console.warn('[CollaborationClient] join_document failed:', response?.error ?? 'unknown')
      } else if (!response) {
        console.warn('[CollaborationClient] join_document callback received null/undefined response')
      }
    })

    // Warn if callback doesn't fire within 5s (indicates server/network issue)
    setTimeout(() => {
      if (!callbackFired) {
        console.warn(
          '[CollaborationClient] join_document callback NOT received after 5s - possible timeout/lost response',
          {
            room
          }
        )
      }
    }, 5000)
  }

  /**
   * Leave a document, spreadsheet, or note
   */
  leaveDocument(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string
  ) {
    if (this.debug) console.log('[CollaborationClient] Leaving document:', { entityType, entityId })
    this.socket?.emit('leave_document', { entityType, entityId })
  }

  /**
   * Send a document operation (edit, insert, delete, etc.)
   * No retry logic — callers (e.g. SpreadsheetCollaborationManager) handle retries.
   */
  sendDocumentOperation(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string,
    operation: DocumentOperation,
    onAckFailure?: (operation: DocumentOperation) => void
  ) {
    if (!this.socket?.connected) {
      console.warn('[CollaborationClient] Cannot send operation (socket not connected):', operation.type)
      onAckFailure?.(operation)
      return false
    }

    let ackReceived = false
    const ackTimeout = setTimeout(() => {
      if (!ackReceived) {
        ackReceived = true
        console.warn('[CollaborationClient] document_operation ack timeout (5s):', operation.type)
        onAckFailure?.(operation)
      }
    }, 5000)

    this.socket.emit('document_operation', { entityType, entityId, operation }, (response: any) => {
      if (ackReceived) return
      ackReceived = true
      clearTimeout(ackTimeout)
      if (response?.success === false) {
        console.warn('[CollaborationClient] document_operation ack failure:', operation.type, response?.error)
        onAckFailure?.(operation)
      }
    })
    return true
  }

  /**
   * Send document_operation and await ack (success + optional sheet version).
   * Used when spreadsheet cell edits must be persisted via the collaboration gateway.
   */
  sendDocumentOperationAsync(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string,
    operation: DocumentOperation,
    timeoutMs = 15000
  ): Promise<{ success: boolean; version?: number; error?: string }> {
    return new Promise(resolve => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: 'not_connected' })
        return
      }
      let settled = false
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        resolve({ success: false, error: 'timeout' })
      }, timeoutMs)
      this.socket.emit('document_operation', { entityType, entityId, operation }, (response: unknown) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (response == null) {
          resolve({ success: false, error: 'empty_ack' })
          return
        }
        const r = response as { success?: boolean; version?: number; error?: string }
        if (r.success === false) {
          resolve({ success: false, error: String(r?.error ?? 'ack_failure') })
          return
        }
        const v = r.version
        resolve({
          success: true,
          version: typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.trunc(v) : undefined
        })
      })
    })
  }

  /**
   * Send cursor position update
   */
  sendCursorMove(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string,
    position: {
      line?: number
      column?: number
      offset?: number
      path?: string[]
    }
  ) {
    if (!this.socket?.connected) {
      return
    }

    this.socket.emit('cursor_move', {
      entityType,
      entityId,
      position: {
        line: position?.line,
        column: position?.column,
        offset: position?.offset,
        path: position?.path
      }
    })
  }

  /**
   * Send selection change
   */
  sendSelectionChange(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string,
    selection: {
      start: { line?: number; column?: number; offset?: number }
      end: { line?: number; column?: number; offset?: number }
    } | null
  ) {
    this.socket?.emit('selection_change', {
      entityType,
      entityId,
      selection
    })
  }

  /**
   * Send typing start indicator
   */
  sendTypingStart(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string
  ) {
    this.socket?.emit('typing_start', { entityType, entityId })
  }

  /**
   * Send typing stop indicator
   */
  sendTypingStop(
    entityType: 'document' | 'spreadsheet' | 'note' | 'whiteboard' | 'slide' | 'presentation',
    entityId: string
  ) {
    this.socket?.emit('typing_stop', { entityType, entityId })
  }

  // Event listeners

  on(event: string, handler: CollaborationEventHandler) {
    this.socket?.on(event, handler)

    return () => {
      this.socket?.off(event, handler)
    }
  }

  onConnect(handler: () => void) {
    return this.on('connect', handler)
  }

  onDisconnect(handler: (reason: string) => void) {
    return this.on('disconnect', handler)
  }

  onConnectError(handler: (error: Error) => void) {
    return this.on('connect_error', handler)
  }

  onUserJoined(handler: (data: { userId: string; userName: string; userColor: string; socketId: string }) => void) {
    return this.on('user_joined', handler)
  }

  onUserLeft(handler: (data: { userId: string; userName: string; socketId: string }) => void) {
    return this.on('user_left', handler)
  }

  onParticipantsUpdated(
    handler: (data: { entityType: 'document' | 'spreadsheet' | 'note'; entityId: string; participants: any[] }) => void
  ) {
    return this.on('participants_updated', handler)
  }

  onOperationApplied(
    handler: (data: {
      userId: string
      userName: string
      operation: DocumentOperation
      version?: number
      timestamp: number
    }) => void
  ) {
    return this.on('operation_applied', handler)
  }

  onCursorUpdate(
    handler: (data: {
      userId: string
      userName: string
      userColor: string
      position: {
        line?: number
        column?: number
        offset?: number
        path?: string[]
      }
    }) => void
  ) {
    return this.on('cursor_update', handler)
  }

  onSelectionUpdate(
    handler: (data: {
      userId: string
      userName: string
      userColor: string
      selection: {
        start: { line?: number; column?: number; offset?: number }
        end: { line?: number; column?: number; offset?: number }
      } | null
    }) => void
  ) {
    return this.on('selection_update', handler)
  }

  onUserTyping(handler: (data: { userId: string; userName: string; isTyping: boolean }) => void) {
    return this.on('user_typing', handler)
  }

  onDocumentSaved(handler: (data: { userId: string; version: number; timestamp: number }) => void) {
    return this.on('document_saved', handler)
  }

  onVersionCreated(handler: (data: { version: number; userId: string; timestamp: number }) => void) {
    return this.on('version_created', handler)
  }

  // ============ Comment Events ============

  onCommentCreated(
    handler: (data: {
      comment: {
        id: string
        type: string
        content: string
        createdBy: string
        createdByName?: string
        parentId?: string
      }
      timestamp: number
    }) => void
  ) {
    return this.on('comment:created', handler)
  }

  onCommentUpdated(
    handler: (data: { commentId: string; updates: Record<string, unknown>; timestamp: number }) => void
  ) {
    return this.on('comment:updated', handler)
  }

  onCommentResolved(handler: (data: { commentId: string; resolvedBy: string; timestamp: number }) => void) {
    return this.on('comment:resolved', handler)
  }

  onCommentDeleted(handler: (data: { commentId: string; timestamp: number }) => void) {
    return this.on('comment:deleted', handler)
  }

  // ============ Lock Events ============

  onLockAcquired(
    handler: (data: {
      lock: {
        lockedBy: string
        lockedByName?: string
        lockedAt: string
        lockExpiry: string
        lockReason?: string
      }
      timestamp: number
    }) => void
  ) {
    return this.on('lock:acquired', handler)
  }

  onLockReleased(handler: (data: { unlockedBy: string; timestamp: number }) => void) {
    return this.on('lock:released', handler)
  }

  // ============ Publishing Events ============

  onPublishStatusChanged(
    handler: (data: {
      status: string
      metadata: {
        publishedAt?: string
        publishedBy?: string
        publishVersion?: number
      }
      timestamp: number
    }) => void
  ) {
    return this.on('publish:status_changed', handler)
  }

  // Remove event listeners
  off(event: string, handler?: CollaborationEventHandler) {
    this.socket?.off(event, handler)
  }

  removeAllListeners() {
    this.socket?.removeAllListeners()
  }
}

/**
 * Create a collaboration client instance
 * Automatically determines the WebSocket URL from the document service URL
 */
export function createCollaborationClient(options?: CollaborationWebSocketOptions): CollaborationClient {
  const apiUrl = options?.serviceApiUrl || getDocumentServiceApiUrl()

  // Remove /api/v1 suffix if present to get base service URL
  // e.g., 'https://newwork-dev.newwork.com/document/api/v1' -> 'https://newwork-dev.newwork.com/document'
  const serviceUrl = apiUrl.replace(/\/api\/v1$/, '')

  // Extract the service path (e.g., '/document') for socket.io path
  // Resolve relative URLs (e.g., "/local-doc-api") against the current page origin
  const urlObj = new URL(serviceUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3005')
  const servicePath = urlObj.pathname // e.g., '/document'
  const namespace = options?.namespace || '/collaboration'

  // For localhost, use simple path; for production use service path
  const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'

  // Socket.io namespace URL is: origin + namespace (NOT service path)
  // The namespace on the server is '/collaboration'
  const wsUrl = `${urlObj.origin}${namespace}`

  // Socket.io path: for localhost use default, for production include service path
  const socketPath = isLocalhost ? '/socket.io' : `${servicePath}/socket.io`

  const debugEnabled = isCollaborationDebugEnabled(options?.debug)

  if (debugEnabled) {
    console.log('[CollaborationClient] Creating client:')
    console.log('[CollaborationClient]   Service URL:', serviceUrl)
    console.log('[CollaborationClient]   Is Localhost:', isLocalhost)
    console.log('[CollaborationClient]   WebSocket URL (namespace):', wsUrl)
    console.log('[CollaborationClient]   Socket.io Path:', socketPath)
  }

  return new CollaborationClient(wsUrl, {
    ...options,
    path: socketPath,
    debug: debugEnabled
  })
}

export function createSpreadsheetCollaborationClient(options?: CollaborationWebSocketOptions): CollaborationClient {
  return createCollaborationClient({
    ...options,
    namespace: '/v2/spreadsheet-collaboration',
    serviceApiUrl: getSpreadsheetServiceApiUrl()
  })
}

export default CollaborationClient
