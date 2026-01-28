import { io, Socket } from 'socket.io-client'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

// Client version for tracking
const CLIENT_VERSION = '1'

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
}

export interface CollaborationWebSocketOptions {
  connectionTimeout?: number
  reconnectionAttempts?: number
  reconnectionDelayMax?: number
  path?: string
  enablePollingFallback?: boolean
}

export type CollaborationEventHandler = (data: any) => void

export class CollaborationClient {
  private socket: Socket | null = null
  private url: string
  private options: CollaborationWebSocketOptions
  private reconnectAttempts = 0
  private maxReconnectAttempts: number

  constructor(url: string, options: CollaborationWebSocketOptions = {}) {
    this.url = url
    this.options = {
      connectionTimeout: options.connectionTimeout || 20000,
      reconnectionAttempts: options.reconnectionAttempts || 10,
      reconnectionDelayMax: options.reconnectionDelayMax || 10000,
      path: options.path || '/socket.io',
      enablePollingFallback: options.enablePollingFallback !== false // default true
    }
    this.maxReconnectAttempts = this.options.reconnectionAttempts || 10
  }

  connect(token: string) {
    // Build transports array based on configuration
    const transports = this.options.enablePollingFallback ? ['websocket', 'polling'] : ['websocket']

    console.log('[CollaborationClient] INITIATING CONNECTION')
    console.log('[CollaborationClient] Client Version:', CLIENT_VERSION)
    console.log('[CollaborationClient] URL:', this.url)
    console.log('[CollaborationClient] Path:', this.options.path)
    console.log('[CollaborationClient] Transports:', transports)
    console.log('[CollaborationClient] Full connection URL:', `${this.url}${this.options.path}`)

    this.socket = io(this.url, {
      auth: {
        token,
        clientVersion: CLIENT_VERSION
      },
      transports,
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
      console.log('[CollaborationClient] Upgrading transport to:', transport.name)
    })

    this.socket.io.engine.on('upgrade', transport => {
      console.log('[CollaborationClient] Transport upgraded to:', transport.name)
    })

    this.socket.io.engine.on('upgradeError', error => {
      console.error('[CollaborationClient] Upgrade error:', error)
    })

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0
      console.log(
        `[CollaborationClient] CONNECTED! Socket ID: ${this.socket?.id}, Transport: ${this.socket?.io?.engine?.transport?.name}`
      )
    })

    this.socket.on('disconnect', reason => {
      console.warn('[CollaborationClient] Disconnected:', reason)

      if (reason === 'io server disconnect') {
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

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[CollaborationClient] Max reconnection attempts reached')
      }
    })

    this.socket.on('error', error => {
      console.error('[CollaborationClient] Error:', error)
    })

    this.socket.io.on('reconnect_failed', () => {
      console.error('[CollaborationClient] Reconnection failed after all attempts')
    })

    return this.socket
  }

  disconnect() {
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
    entityType: 'document' | 'spreadsheet' | 'note',
    entityId: string,
    onParticipantsReceived?: (participants: any[]) => void
  ) {
    console.log('[CollaborationClient] Joining document:', { entityType, entityId })
    this.socket?.emit('join_document', { entityType, entityId }, (response: any) => {
      console.log('[CollaborationClient] Join document response:', response)

      // Call callback with participants list
      if (response?.success && response?.participants) {
        onParticipantsReceived?.(response.participants)
      }
    })
  }

  /**
   * Leave a document, spreadsheet, or note
   */
  leaveDocument(entityType: 'document' | 'spreadsheet' | 'note', entityId: string) {
    console.log('[CollaborationClient] Leaving document:', { entityType, entityId })
    this.socket?.emit('leave_document', { entityType, entityId })
  }

  /**
   * Send a document operation (edit, insert, delete, etc.)
   */
  sendDocumentOperation(
    entityType: 'document' | 'spreadsheet' | 'note',
    entityId: string,
    operation: DocumentOperation
  ) {
    if (!this.socket?.connected) {
      console.error('[CollaborationClient] Cannot send operation: socket not connected')
      return
    }

    console.log('[CollaborationClient] Sending operation:', { entityType, entityId, operation })
    this.socket.emit(
      'document_operation',
      {
        entityType,
        entityId,
        operation
      },
      (response: any) => {
        console.log('[CollaborationClient] Operation response:', response)
      }
    )
  }

  /**
   * Send cursor position update
   */
  sendCursorMove(
    entityType: 'document' | 'spreadsheet' | 'note',
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
    entityType: 'document' | 'spreadsheet' | 'note',
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
  sendTypingStart(entityType: 'document' | 'spreadsheet' | 'note', entityId: string) {
    this.socket?.emit('typing_start', { entityType, entityId })
  }

  /**
   * Send typing stop indicator
   */
  sendTypingStop(entityType: 'document' | 'spreadsheet' | 'note', entityId: string) {
    this.socket?.emit('typing_stop', { entityType, entityId })
  }

  // Event listeners

  onUserJoined(handler: (data: { userId: string; userName: string; userColor: string; socketId: string }) => void) {
    this.socket?.on('user_joined', handler)
  }

  onUserLeft(handler: (data: { userId: string; userName: string; socketId: string }) => void) {
    this.socket?.on('user_left', handler)
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
    this.socket?.on('operation_applied', handler)
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
    this.socket?.on('cursor_update', handler)
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
    this.socket?.on('selection_update', handler)
  }

  onUserTyping(handler: (data: { userId: string; userName: string; isTyping: boolean }) => void) {
    this.socket?.on('user_typing', handler)
  }

  onDocumentSaved(handler: (data: { userId: string; version: number; timestamp: number }) => void) {
    this.socket?.on('document_saved', handler)
  }

  onVersionCreated(handler: (data: { version: number; userId: string; timestamp: number }) => void) {
    this.socket?.on('version_created', handler)
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
    this.socket?.on('comment:created', handler)
  }

  onCommentUpdated(
    handler: (data: { commentId: string; updates: Record<string, unknown>; timestamp: number }) => void
  ) {
    this.socket?.on('comment:updated', handler)
  }

  onCommentResolved(handler: (data: { commentId: string; resolvedBy: string; timestamp: number }) => void) {
    this.socket?.on('comment:resolved', handler)
  }

  onCommentDeleted(handler: (data: { commentId: string; timestamp: number }) => void) {
    this.socket?.on('comment:deleted', handler)
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
    this.socket?.on('lock:acquired', handler)
  }

  onLockReleased(handler: (data: { unlockedBy: string; timestamp: number }) => void) {
    this.socket?.on('lock:released', handler)
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
    this.socket?.on('publish:status_changed', handler)
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
  const apiUrl = getDocumentServiceApiUrl()

  // Remove /api/v1 suffix if present to get base service URL
  // e.g., 'https://newwork-dev.newwork.com/document/api/v1' -> 'https://newwork-dev.newwork.com/document'
  const serviceUrl = apiUrl.replace(/\/api\/v1$/, '')

  // Extract the service path (e.g., '/document') for socket.io path
  const urlObj = new URL(serviceUrl)
  const servicePath = urlObj.pathname // e.g., '/document'

  // For localhost, use simple path; for production use service path
  const isLocalhost = urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'

  // Socket.io namespace URL is: origin + namespace (NOT service path)
  // The namespace on the server is '/collaboration'
  const wsUrl = `${urlObj.origin}/collaboration`

  // Socket.io path: for localhost use default, for production include service path
  const socketPath = isLocalhost ? '/socket.io' : `${servicePath}/socket.io`

  console.log('[CollaborationClient] Creating client:')
  console.log('[CollaborationClient]   Service URL:', serviceUrl)
  console.log('[CollaborationClient]   Is Localhost:', isLocalhost)
  console.log('[CollaborationClient]   WebSocket URL (namespace):', wsUrl)
  console.log('[CollaborationClient]   Socket.io Path:', socketPath)

  return new CollaborationClient(wsUrl, {
    ...options,
    path: socketPath
  })
}

export default CollaborationClient
