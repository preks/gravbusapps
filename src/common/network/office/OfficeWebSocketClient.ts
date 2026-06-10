import { DOCUMENT_WEB_SOCKET_URL } from '@/common/utils/serviceResolver'
import { io, type Socket } from 'socket.io-client'

const OFFICE_CLIENT_VERSION = '1'

// See CollaborationClient: on an auth rejection the server force-disconnects, so
// reconnecting immediately just replays the rejected token in a tight loop. Back
// off and wait for a refreshed token instead.
const AUTH_RECONNECT_DELAY_MS = 30000

function isAuthRejectionMessage(message?: string): boolean {
  if (!message) return false
  const normalized = message.toLowerCase()
  return normalized.includes('auth') || normalized.includes('token') || normalized.includes('unauthorized')
}

export type OfficeEntityType = 'document' | 'spreadsheet' | 'note' | 'slide' | 'whiteboard' | 'presentation'

export type OfficeWebSocketOptions = {
  connectionTimeout?: number
  reconnectionAttempts?: number
  reconnectionDelayMax?: number
  path?: string
  enablePollingFallback?: boolean
}

function resolveSocketTransports(enablePollingFallback: boolean) {
  return enablePollingFallback ? ['websocket', 'polling'] : ['websocket']
}

export type OfficeSocketConnectionStatus = {
  connected: boolean
  socketId?: string
  transport?: string
  reconnectAttempts: number
  maxReconnectAttempts: number
  url: string
}

export type OfficeSocketEventHandler<T = unknown> = (data: T) => void

export interface OfficeDocumentParticipant {
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

export interface OfficeDocumentOperation {
  type: string
  data?: unknown
  path?: string
  baseVersion?: number
  broadcastOnly?: boolean
}

export type OfficeDocumentOperationAckResult = { success: boolean; version?: number; error?: string }

type JoinDocumentResponse = {
  success?: boolean
  participants?: unknown[]
  error?: string
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function resolveSocketOptions(options: OfficeWebSocketOptions, defaultPath: string): Required<OfficeWebSocketOptions> {
  return {
    connectionTimeout: options.connectionTimeout ?? 20000,
    reconnectionAttempts: options.reconnectionAttempts ?? 10,
    reconnectionDelayMax: options.reconnectionDelayMax ?? 10000,
    path: options.path ?? defaultPath,
    enablePollingFallback: options.enablePollingFallback !== false
  }
}

function resolveSocketTarget(url: string): { socketUrl: string; socketPath: string } {
  const resolvedUrl = new URL(url)
  let servicePath = trimTrailingSlash(resolvedUrl.pathname)

  // Defensive: if the configured URL already ends with `/socket.io`, drop it so we
  // do not produce a doubled `/socket.io/socket.io` path when we append it below.
  if (servicePath.endsWith('/socket.io')) {
    servicePath = servicePath.slice(0, -'/socket.io'.length)
  }

  return {
    socketUrl: `${resolvedUrl.origin}/collaboration`,
    socketPath: servicePath ? `${servicePath}/socket.io` : '/socket.io'
  }
}

function toSocketAuth(accessToken: string): Record<string, string> {
  return {
    token: accessToken,
    clientVersion: OFFICE_CLIENT_VERSION
  }
}

export class OfficeWebSocketClient {
  private socket: Socket | null = null
  private accessToken = ''
  private reconnectAttempts = 0
  private lastAuthErrorAt = 0
  private authReconnectTimer: ReturnType<typeof setTimeout> | null = null
  /**
   * When set, used as the socket.io base URL. When omitted, `DOCUMENT_WEB_SOCKET_URL` is used
   * so the client matches runtime document-service config.
   */
  private readonly explicitBaseUrl: string | undefined
  private readonly baseOptions: OfficeWebSocketOptions
  private readonly maxReconnectAttempts: number

  constructor(baseUrl?: string, options: OfficeWebSocketOptions = {}) {
    this.explicitBaseUrl = baseUrl
    this.baseOptions = options
    this.maxReconnectAttempts = resolveSocketOptions(options, '/socket.io').reconnectionAttempts
  }

  private resolveConnectBase(): { socketUrl: string; socketPath: string } {
    const raw = this.explicitBaseUrl ?? DOCUMENT_WEB_SOCKET_URL
    return resolveSocketTarget(raw)
  }

  private getConnectOptions(): Required<OfficeWebSocketOptions> {
    const target = this.resolveConnectBase()
    return resolveSocketOptions(this.baseOptions, target.socketPath)
  }

  setAccessToken(accessToken: string) {
    if (!accessToken || accessToken === this.accessToken) {
      return
    }

    this.accessToken = accessToken

    if (!this.socket) {
      return
    }

    // Fresh token: if we were backing off after an auth rejection, recover now.
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

    this.authReconnectTimer = setTimeout(() => {
      this.authReconnectTimer = null
      if (this.socket && !this.socket.connected) {
        this.socket.connect()
      }
    }, AUTH_RECONNECT_DELAY_MS)
  }

  connect(accessToken?: string) {
    const resolvedAccessToken = accessToken ?? this.accessToken
    const accessTokenChanged = Boolean(resolvedAccessToken && resolvedAccessToken !== this.accessToken)

    if (!resolvedAccessToken) {
      throw new Error('[OfficeWebSocketClient] Access token required before connecting.')
    }

    this.accessToken = resolvedAccessToken

    if (this.socket) {
      this.clearAuthReconnectTimer()
      this.lastAuthErrorAt = 0

      if (this.socket.connected) {
        if (accessTokenChanged) {
          this.forceReconnect()
        }
      } else {
        this.socket.connect()
      }

      return this.socket
    }

    const target = this.resolveConnectBase()
    const options = this.getConnectOptions()
    const transports = resolveSocketTransports(options.enablePollingFallback)

    this.socket = io(target.socketUrl, {
      // Callback form so reconnect attempts read the latest token, not a frozen one.
      auth: cb => cb(toSocketAuth(this.accessToken)),
      transports,
      tryAllTransports: options.enablePollingFallback,
      path: options.path,
      reconnection: true,
      reconnectionDelay: 5000,
      reconnectionDelayMax: options.reconnectionDelayMax,
      reconnectionAttempts: options.reconnectionAttempts,
      timeout: options.connectionTimeout,
      upgrade: true,
      rememberUpgrade: true,
      forceNew: false,
      query: {
        clientType: 'web',
        clientVersion: OFFICE_CLIENT_VERSION,
        timestamp: Date.now().toString()
      },
      autoConnect: true,
      randomizationFactor: 0.5
    })

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0
      this.lastAuthErrorAt = 0
      this.clearAuthReconnectTimer()
    })

    this.socket.on('disconnect', reason => {
      if (reason === 'io server disconnect') {
        // Server force-disconnects on auth rejection; don't immediately replay a
        // rejected token (that creates a reconnect storm). Back off instead.
        if (Date.now() - this.lastAuthErrorAt < 5000) {
          this.scheduleAuthReconnect()
          return
        }
        this.socket?.connect()
      }
    })

    this.socket.on('connect_error', (error: Error) => {
      this.reconnectAttempts += 1
      if (isAuthRejectionMessage(error?.message)) {
        this.lastAuthErrorAt = Date.now()
      }
    })

    this.socket.on('error', (error: unknown) => {
      const message = typeof error === 'string' ? error : (error as { message?: string } | null | undefined)?.message
      if (isAuthRejectionMessage(message)) {
        this.lastAuthErrorAt = Date.now()
      }
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
    return this.socket?.connected ?? false
  }

  getSocket() {
    return this.socket
  }

  getConnectionStatus(): OfficeSocketConnectionStatus {
    const options = this.getConnectOptions()
    const target = this.resolveConnectBase()
    return {
      connected: this.socket?.connected ?? false,
      socketId: this.socket?.id,
      transport: this.socket?.io?.engine?.transport?.name,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      url: `${target.socketUrl}${options.path}`
    }
  }

  forceReconnect() {
    if (!this.socket) {
      return
    }

    this.socket.disconnect()
    this.reconnectAttempts = 0
    this.socket.connect()
  }

  isHealthy() {
    return Boolean(this.socket?.connected) && this.reconnectAttempts < this.maxReconnectAttempts
  }

  on<T = unknown>(event: string, handler: OfficeSocketEventHandler<T>) {
    this.socket?.on(event, handler as OfficeSocketEventHandler)

    return () => {
      this.socket?.off(event, handler as OfficeSocketEventHandler)
    }
  }

  off<T = unknown>(event: string, handler?: OfficeSocketEventHandler<T>) {
    this.socket?.off(event, handler as OfficeSocketEventHandler | undefined)
  }

  emit(event: string, payload?: unknown) {
    if (!this.socket?.connected) {
      return false
    }

    if (payload === undefined) {
      this.socket.emit(event)
      return true
    }

    this.socket.emit(event, payload)
    return true
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

  joinDocument(
    entityType: OfficeEntityType,
    entityId: string,
    onParticipantsReceived?: (participants: unknown[]) => void
  ) {
    if (!this.socket?.connected) {
      return false
    }

    this.socket.emit('join_document', { entityType, entityId }, (response: JoinDocumentResponse) => {
      if (!response?.success) return
      const participants = Array.isArray(response.participants) ? response.participants : []
      onParticipantsReceived?.(participants)
    })

    return true
  }

  leaveDocument(entityType: OfficeEntityType, entityId: string) {
    return this.emit('leave_document', { entityType, entityId })
  }

  sendDocumentOperation(
    entityType: OfficeEntityType,
    entityId: string,
    operation: OfficeDocumentOperation,
    onAckFailure?: (operation: OfficeDocumentOperation) => void
  ) {
    if (!this.socket?.connected) {
      onAckFailure?.(operation)
      return false
    }

    let ackReceived = false
    const ackTimeout = setTimeout(() => {
      if (ackReceived) {
        return
      }

      ackReceived = true
      onAckFailure?.(operation)
    }, 5000)

    this.socket.emit('document_operation', { entityType, entityId, operation }, (response: unknown) => {
      if (ackReceived) {
        return
      }

      ackReceived = true
      clearTimeout(ackTimeout)

      const resolvedResponse = response as { success?: boolean; error?: string } | null
      if (resolvedResponse?.success === false) {
        onAckFailure?.(operation)
      }
    })
    return true
  }

  sendDocumentOperationAsync(
    entityType: OfficeEntityType,
    entityId: string,
    operation: OfficeDocumentOperation,
    timeoutMs = 15000
  ): Promise<OfficeDocumentOperationAckResult> {
    return new Promise(resolve => {
      if (!this.socket?.connected) {
        resolve({ success: false, error: 'not_connected' })
        return
      }

      let settled = false
      const timer = setTimeout(() => {
        if (settled) {
          return
        }

        settled = true
        resolve({ success: false, error: 'timeout' })
      }, timeoutMs)

      this.socket.emit('document_operation', { entityType, entityId, operation }, (response: unknown) => {
        if (settled) {
          return
        }

        settled = true
        clearTimeout(timer)

        if (response == null) {
          resolve({ success: false, error: 'empty_ack' })
          return
        }

        const resolvedResponse = response as { success?: boolean; version?: number; error?: string }
        if (resolvedResponse.success === false) {
          resolve({ success: false, error: String(resolvedResponse.error ?? 'ack_failure') })
          return
        }

        const version = resolvedResponse.version
        resolve({
          success: true,
          version:
            typeof version === 'number' && Number.isFinite(version) && version >= 0 ? Math.trunc(version) : undefined
        })
      })
    })
  }

  sendCursorMove(
    entityType: OfficeEntityType,
    entityId: string,
    position: {
      line?: number
      column?: number
      offset?: number
      path?: string[]
    }
  ) {
    return this.emit('cursor_move', {
      entityType,
      entityId,
      position: {
        line: position.line,
        column: position.column,
        offset: position.offset,
        path: position.path
      }
    })
  }

  sendSelectionChange(
    entityType: OfficeEntityType,
    entityId: string,
    selection: {
      start: { line?: number; column?: number; offset?: number }
      end: { line?: number; column?: number; offset?: number }
    } | null
  ) {
    return this.emit('selection_change', { entityType, entityId, selection })
  }

  sendTypingStart(entityType: OfficeEntityType, entityId: string) {
    return this.emit('typing_start', { entityType, entityId })
  }

  sendTypingStop(entityType: OfficeEntityType, entityId: string) {
    return this.emit('typing_stop', { entityType, entityId })
  }

  onUserJoined(
    handler: OfficeSocketEventHandler<{
      userId: string
      userName: string
      userColor: string
      socketId: string
      avatarUrl?: string
      avatar?: string
    }>
  ) {
    return this.on('user_joined', handler)
  }

  onUserLeft(handler: OfficeSocketEventHandler<{ userId: string; userName: string; socketId: string }>) {
    return this.on('user_left', handler)
  }

  onOperationApplied(
    handler: OfficeSocketEventHandler<{
      userId: string
      userName: string
      operation: OfficeDocumentOperation
      version?: number
      timestamp: number
    }>
  ) {
    return this.on('operation_applied', handler)
  }

  onCursorUpdate(
    handler: OfficeSocketEventHandler<{
      userId: string
      userName: string
      userColor: string
      position: OfficeDocumentParticipant['cursor']
    }>
  ) {
    return this.on('cursor_update', handler)
  }

  onSelectionUpdate(
    handler: OfficeSocketEventHandler<{
      userId: string
      userName: string
      userColor: string
      selection: OfficeDocumentParticipant['selection']
    }>
  ) {
    return this.on('selection_update', handler)
  }

  onUserTyping(handler: OfficeSocketEventHandler<{ userId: string; userName: string; isTyping: boolean }>) {
    return this.on('user_typing', handler)
  }

  onDocumentSaved(handler: OfficeSocketEventHandler<{ userId: string; version: number; timestamp: number }>) {
    return this.on('document_saved', handler)
  }

  onVersionCreated(handler: OfficeSocketEventHandler<{ version: number; userId: string; timestamp: number }>) {
    return this.on('version_created', handler)
  }

  onCommentCreated(
    handler: OfficeSocketEventHandler<{
      comment: {
        id: string
        type: string
        content: string
        createdBy: string
        createdByName?: string
        parentId?: string
      }
      timestamp: number
    }>
  ) {
    return this.on('comment:created', handler)
  }

  onCommentUpdated(
    handler: OfficeSocketEventHandler<{ commentId: string; updates: Record<string, unknown>; timestamp: number }>
  ) {
    return this.on('comment:updated', handler)
  }

  onCommentResolved(handler: OfficeSocketEventHandler<{ commentId: string; resolvedBy: string; timestamp: number }>) {
    return this.on('comment:resolved', handler)
  }

  onCommentDeleted(handler: OfficeSocketEventHandler<{ commentId: string; timestamp: number }>) {
    return this.on('comment:deleted', handler)
  }

  onLockAcquired(
    handler: OfficeSocketEventHandler<{
      lock: {
        lockedBy: string
        lockedByName?: string
        lockedAt: string
        lockExpiry: string
        lockReason?: string
      }
      timestamp: number
    }>
  ) {
    return this.on('lock:acquired', handler)
  }

  onLockReleased(handler: OfficeSocketEventHandler<{ unlockedBy: string; timestamp: number }>) {
    return this.on('lock:released', handler)
  }

  onPublishStatusChanged(
    handler: OfficeSocketEventHandler<{
      status: string
      metadata: {
        publishedAt?: string
        publishedBy?: string
        publishVersion?: number
      }
      timestamp: number
    }>
  ) {
    return this.on('publish:status_changed', handler)
  }
}

export const officeWebSocketClient = new OfficeWebSocketClient()
