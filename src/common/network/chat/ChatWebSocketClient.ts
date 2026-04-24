import { CHAT_WEB_SOCKET_URL } from '@/common/utils/serviceResolver'
import { io, type Socket } from 'socket.io-client'

const CHAT_CLIENT_VERSION = '2'
const DEFAULT_SOCKET_PATH = '/chat-service/socket.io'

export type ChatWebSocketOptions = {
  connectionTimeout?: number
  reconnectionAttempts?: number
  reconnectionDelayMax?: number
  path?: string
  enablePollingFallback?: boolean
}

export type ChatSocketConnectionStatus = {
  connected: boolean
  socketId?: string
  transport?: string
  reconnectAttempts: number
  maxReconnectAttempts: number
  url: string
}

export type ChatSocketEventHandler<T = unknown> = (data: T) => void

function resolveSocketTransports(enablePollingFallback: boolean) {
  return enablePollingFallback ? ['websocket', 'polling'] : ['websocket']
}

function resolveSocketOptions(options: ChatWebSocketOptions): Required<ChatWebSocketOptions> {
  return {
    connectionTimeout: options.connectionTimeout ?? 20000,
    reconnectionAttempts: options.reconnectionAttempts ?? 10,
    reconnectionDelayMax: options.reconnectionDelayMax ?? 10000,
    path: options.path ?? DEFAULT_SOCKET_PATH,
    enablePollingFallback: options.enablePollingFallback !== false
  }
}

function toSocketAuth(accessToken: string): Record<string, string> {
  return {
    token: accessToken,
    clientVersion: CHAT_CLIENT_VERSION
  }
}

function toSocketEventName(event: string): string {
  const eventMap: Record<string, string> = {
    'presence:update': 'user_status_change',
    'typing:update': 'user_typing',
    'message:new': 'new_message',
    'message:update': 'message:updated',
    'message:delete': 'message:deleted',
    'message:status': 'message:status',
    'conversation:update': 'conversation_updated'
  }

  return eventMap[event] ?? event
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return undefined
}

function safeString(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return ''
}

function normalizeSender(sender: unknown): Record<string, unknown> | undefined {
  const senderRecord = toRecord(sender)

  if (!senderRecord) {
    return undefined
  }

  const avatarUrl = senderRecord.avatar_url ?? senderRecord.avatarUrl

  return {
    ...senderRecord,
    avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined
  }
}

function normalizeMessage<T = unknown>(raw: unknown): T {
  const messageRecord = toRecord(raw)

  if (!messageRecord) {
    return {
      id: '',
      conversationId: '',
      senderId: null,
      type: 'text',
      content: '',
      createdAt: '',
      updatedAt: ''
    } as T
  }

  const createdAt = messageRecord.created_at ?? messageRecord.createdAt
  const updatedAt = messageRecord.updated_at ?? messageRecord.updatedAt ?? createdAt
  const editedAt = messageRecord.edited_at ?? messageRecord.editedAt
  const quotedMessageId = messageRecord.quoted_message_id ?? messageRecord.quotedMessageId
  const quotedMessageRaw = messageRecord.quotedMessage ?? messageRecord.quoted_message
  const quotedSnapshotRaw = toRecord(messageRecord.quoted_message_snapshot ?? messageRecord.quotedMessageSnapshot)
  const quotedMessageSnapshot =
    quotedSnapshotRaw && typeof quotedSnapshotRaw.content === 'string'
      ? {
          content: String(quotedSnapshotRaw.content),
          ...(quotedSnapshotRaw.createdAt != null ? { createdAt: String(quotedSnapshotRaw.createdAt) } : {}),
          ...(quotedSnapshotRaw.senderDisplayName != null
            ? { senderDisplayName: String(quotedSnapshotRaw.senderDisplayName) }
            : {})
        }
      : undefined

  return {
    ...messageRecord,
    id: safeString(messageRecord.id),
    conversationId: safeString(messageRecord.conversation_id ?? messageRecord.conversationId),
    senderId: (messageRecord.sender_id ?? messageRecord.senderId ?? null) as string | null,
    type: safeString(messageRecord.type || 'text') || 'text',
    content: safeString(messageRecord.content),
    metadata: messageRecord.metadata,
    parentId: (messageRecord.reply_to_id ?? messageRecord.parentId ?? messageRecord.replyToId) as string | undefined,
    isEdited: Boolean(messageRecord.is_edited ?? messageRecord.isEdited),
    isDeleted: Boolean(messageRecord.is_deleted ?? messageRecord.isDeleted),
    ...(editedAt ? { editedAt: String(editedAt) } : {}),
    createdAt: safeString(createdAt) || new Date().toISOString(),
    updatedAt: safeString(updatedAt) || safeString(createdAt) || new Date().toISOString(),
    sender: normalizeSender(messageRecord.sender),
    reactions: messageRecord.reactions,
    status: messageRecord.status,
    ...(quotedMessageId ? { quotedMessageId: String(quotedMessageId) } : {}),
    ...(quotedMessageRaw ? { quotedMessage: normalizeMessage(quotedMessageRaw) } : {}),
    ...(quotedMessageSnapshot ? { quotedMessageSnapshot } : {})
  } as T
}

export class ChatWebSocketClient {
  private socket: Socket | null = null
  private accessToken = ''
  private reconnectAttempts = 0
  private reconnectBlockedUntilTokenRefresh = false
  private readonly url: string
  private readonly options: Required<ChatWebSocketOptions>
  private readonly maxReconnectAttempts: number

  constructor(url: string = CHAT_WEB_SOCKET_URL, options: ChatWebSocketOptions = {}) {
    this.url = url
    this.options = resolveSocketOptions(options)
    this.maxReconnectAttempts = this.options.reconnectionAttempts
  }

  setAccessToken(accessToken: string) {
    if (!accessToken || accessToken === this.accessToken) {
      return
    }

    this.accessToken = accessToken
    this.reconnectBlockedUntilTokenRefresh = false

    if (!this.socket) {
      return
    }

    this.socket.auth = toSocketAuth(accessToken)

    if (this.socket.connected) {
      this.forceReconnect()
    }
  }

  connect(accessToken?: string) {
    const resolvedAccessToken = accessToken ?? this.accessToken
    const accessTokenChanged = Boolean(resolvedAccessToken && resolvedAccessToken !== this.accessToken)

    if (!resolvedAccessToken) {
      throw new Error('[ChatWebSocketClient] Access token required before connecting.')
    }

    this.accessToken = resolvedAccessToken
    if (accessTokenChanged) {
      this.reconnectBlockedUntilTokenRefresh = false
    }

    if (this.socket) {
      this.socket.auth = toSocketAuth(this.accessToken)

      if (this.socket.connected) {
        if (accessTokenChanged) {
          this.forceReconnect()
        }
      } else if (this.reconnectBlockedUntilTokenRefresh && !accessTokenChanged) {
        return this.socket
      } else {
        this.socket.connect()
      }

      return this.socket
    }

    const transports = resolveSocketTransports(this.options.enablePollingFallback)

    this.socket = io(this.url, {
      auth: toSocketAuth(this.accessToken),
      transports,
      tryAllTransports: this.options.enablePollingFallback,
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
        clientVersion: CHAT_CLIENT_VERSION,
        timestamp: Date.now().toString()
      },
      autoConnect: true,
      randomizationFactor: 0.5
    })

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0
      this.reconnectBlockedUntilTokenRefresh = false
    })

    this.socket.on('disconnect', reason => {
      if (reason === 'io server disconnect' && !this.reconnectBlockedUntilTokenRefresh) {
        this.socket?.connect()
      }
    })

    this.socket.on('error', payload => {
      const errorMessage = toRecord(payload)?.message

      if (errorMessage === 'Invalid authentication token' || errorMessage === 'No authentication token provided') {
        this.reconnectBlockedUntilTokenRefresh = true
      }
    })

    this.socket.on('connect_error', () => {
      this.reconnectAttempts += 1
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.reconnectAttempts = 0
    this.reconnectBlockedUntilTokenRefresh = false
  }

  isConnected() {
    return this.socket?.connected ?? false
  }

  getSocket() {
    return this.socket
  }

  getConnectionStatus(): ChatSocketConnectionStatus {
    return {
      connected: this.socket?.connected ?? false,
      socketId: this.socket?.id,
      transport: this.socket?.io?.engine?.transport?.name,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      url: this.url
    }
  }

  forceReconnect() {
    if (!this.socket) {
      return
    }

    this.socket.disconnect()
    this.reconnectAttempts = 0
    this.socket.auth = toSocketAuth(this.accessToken)
    this.socket.connect()
  }

  isHealthy() {
    return Boolean(this.socket?.connected) && this.reconnectAttempts < this.maxReconnectAttempts
  }

  on<T = unknown>(event: string, handler: ChatSocketEventHandler<T>) {
    const backendEvent = toSocketEventName(event)
    this.socket?.on(backendEvent, handler as ChatSocketEventHandler)

    return () => {
      this.socket?.off(backendEvent, handler as ChatSocketEventHandler)
    }
  }

  off<T = unknown>(event: string, handler?: ChatSocketEventHandler<T>) {
    const backendEvent = toSocketEventName(event)
    this.socket?.off(backendEvent, handler as ChatSocketEventHandler | undefined)
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

  private emitWithAck<T = unknown>(event: string, payload?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'))
        return
      }

      const handleResponse = (response: T) => {
        resolve(response)
      }

      if (payload === undefined) {
        this.socket.emit(event, handleResponse)
        return
      }

      this.socket.emit(event, payload, handleResponse)
    })
  }

  onConnect(handler: () => void) {
    this.socket?.on('connect', handler)

    return () => {
      this.socket?.off('connect', handler)
    }
  }

  onDisconnect(handler: (reason: string) => void) {
    this.socket?.on('disconnect', handler)

    return () => {
      this.socket?.off('disconnect', handler)
    }
  }

  onConnectError(handler: (error: Error) => void) {
    this.socket?.on('connect_error', handler)

    return () => {
      this.socket?.off('connect_error', handler)
    }
  }

  onNewMessage<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('new_message', (raw: unknown) => {
      handler(normalizeMessage<T>(raw))
    })
  }

  onMessageUpdated<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('message:updated', (raw: unknown) => {
      handler(normalizeMessage<T>(raw))
    })
  }

  onMessageDeleted(handler: ChatSocketEventHandler<{ messageId: string; conversationId: string }>) {
    return this.on('message:deleted', handler)
  }

  onUserTyping<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('user_typing', handler)
  }

  onUserJoined(handler: ChatSocketEventHandler<{ conversationId: string; userId: string }>) {
    return this.on('user:joined', handler)
  }

  onUserLeft(handler: ChatSocketEventHandler<{ conversationId: string; userId: string }>) {
    return this.on('user:left', handler)
  }

  onNudgeReceived(
    handler: ChatSocketEventHandler<{ conversationId: string; fromUserId: string; fromUserName: string }>
  ) {
    return this.on('nudge:received', handler)
  }

  onMessageRead(handler: ChatSocketEventHandler<{ messageId: string; conversationId: string; readBy: string }>) {
    return this.on('message:read', handler)
  }

  onMessageDelivered(
    handler: ChatSocketEventHandler<{ messageId: string; conversationId: string; deliveredTo: string }>
  ) {
    return this.on('message:delivered', handler)
  }

  onConversationUpdated(handler: ChatSocketEventHandler<{ conversationId: string }>) {
    return this.on('conversation_updated', handler)
  }

  onConversationCreated<T = unknown>(handler: ChatSocketEventHandler<{ conversation: T }>) {
    return this.on('conversation_created', handler)
  }

  onParticipantRemoved(handler: ChatSocketEventHandler<{ conversationId: string }>) {
    return this.on('participant_removed', handler)
  }

  onConversationRead(handler: ChatSocketEventHandler<{ conversationId: string; userId: string; readAt: string }>) {
    return this.on('conversation:read', handler)
  }

  onConversationUnread(handler: ChatSocketEventHandler<{ conversationId: string; userId: string }>) {
    return this.on('conversation:unread', handler)
  }

  onConversationCallStarted<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('conversation:call-started', handler)
  }

  onConversationCallEnded(handler: ChatSocketEventHandler<{ conversationId: string; roomId: string }>) {
    return this.on('conversation:call-ended', handler)
  }

  onCallHistoryMissedCount(handler: ChatSocketEventHandler<{ count: number }>) {
    return this.on('call_history:missed_count', handler)
  }

  onConversationActiveCalls<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('conversation:active-calls', handler)
  }

  joinConversation(conversationId: string, lastMessageTimestamp: number = 0) {
    return this.emit('join_conversation', { conversationId, lastMessageTimestamp })
  }

  leaveConversation(conversationId: string) {
    return this.emit('leave_conversation', { conversationId })
  }

  markConversationAsRead(conversationId: string) {
    return this.emit('conversation:mark-read', { conversationId })
  }

  markConversationAsUnread(conversationId: string) {
    return this.emit('conversation:mark-unread', { conversationId })
  }

  sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    parentId?: string,
    metadata?: Record<string, unknown>,
    quotedMessageId?: string
  ) {
    return this.emit('send_message', {
      conversationId,
      content,
      senderId,
      ...(parentId ? { parentId } : {}),
      ...(metadata ? { metadata } : {}),
      ...(quotedMessageId ? { quotedMessageId } : {})
    })
  }

  sendTypingStart(conversationId: string) {
    return this.emit('typing_start', { conversationId })
  }

  sendTypingStop(conversationId: string) {
    return this.emit('typing_stop', { conversationId })
  }

  sendNudge(conversationId: string, toUserId: string) {
    return this.emit('nudge:send', { conversationId, toUserId })
  }

  requestActiveCalls() {
    return this.emit('conversation:get-active-calls')
  }

  onUserStatusChange<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('user_status_change', handler)
  }

  onUserStatusInitialized<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('user_status_initialized', handler)
  }

  async setUserStatus<T extends { success?: boolean; status?: string } = { success: boolean; status?: string }>(
    payload: Record<string, unknown>
  ): Promise<T> {
    const response = await this.emitWithAck<T>('user:set_status', payload)

    if (!response?.success) {
      throw new Error('Failed to set status')
    }

    return response
  }

  getUserStatus<T = unknown>(userId: string): Promise<T> {
    return this.emitWithAck<T>('user:get_status', { userId })
  }

  getBulkUserStatuses<T = { statuses: Record<string, unknown> }>(userIds: string[]): Promise<T> {
    return this.emitWithAck<T>('user:get_bulk_statuses', { userIds })
  }

  requestAllStatuses<T = { success: boolean; userCount: number }>(): Promise<T> {
    return this.emitWithAck<T>('user:request_all_statuses')
  }

  initiateCall(payload: Record<string, unknown>) {
    return this.emit('call:initiate', payload)
  }

  acceptCall(payload: Record<string, unknown>) {
    return this.emit('call:accept', payload)
  }

  rejectCall(payload: Record<string, unknown>) {
    return this.emit('call:reject', payload)
  }

  endCall(payload: Record<string, unknown>) {
    return this.emit('call:end', payload)
  }

  sendCallOffer(payload: Record<string, unknown>) {
    return this.emit('call:offer', payload)
  }

  sendCallAnswer(payload: Record<string, unknown>) {
    return this.emit('call:answer', payload)
  }

  sendIceCandidate(payload: Record<string, unknown>) {
    return this.emit('call:ice-candidate', payload)
  }

  sendBusy(payload: Record<string, unknown>) {
    return this.emit('call:busy', payload)
  }

  onCallInitiate<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:initiate', handler)
  }

  onCallAccept<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:accept', handler)
  }

  onCallReject<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:reject', handler)
  }

  onCallEnd<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:end', handler)
  }

  onCallOffer<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:offer', handler)
  }

  onCallAnswer<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:answer', handler)
  }

  onCallIceCandidate<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:ice-candidate', handler)
  }

  onCallBusy<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('call:busy', handler)
  }

  removeCallListeners() {
    this.socket?.off('call:initiate')
    this.socket?.off('call:accept')
    this.socket?.off('call:reject')
    this.socket?.off('call:end')
    this.socket?.off('call:offer')
    this.socket?.off('call:answer')
    this.socket?.off('call:ice-candidate')
    this.socket?.off('call:busy')
  }

  inviteToGroupCall(payload: Record<string, unknown>) {
    return this.emit('group-call:invite', payload)
  }

  joinGroupCall(payload: Record<string, unknown>) {
    return this.emit('group-call:join', payload)
  }

  leaveGroupCall(payload: Record<string, unknown>) {
    return this.emit('group-call:leave', payload)
  }

  sendGroupCallOffer(payload: Record<string, unknown>) {
    return this.emit('group-call:offer', payload)
  }

  sendGroupCallAnswer(payload: Record<string, unknown>) {
    return this.emit('group-call:answer', payload)
  }

  sendGroupCallIceCandidate(payload: Record<string, unknown>) {
    return this.emit('group-call:ice-candidate', payload)
  }

  onGroupCallInvite<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('group-call:invite', handler)
  }

  onGroupCallParticipantJoined<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('group-call:participant-joined', handler)
  }

  onGroupCallParticipantLeft(handler: ChatSocketEventHandler<{ roomId: string; participantId: string }>) {
    return this.on('group-call:participant-left', handler)
  }

  onGroupCallOffer<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('group-call:offer', handler)
  }

  onGroupCallAnswer<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('group-call:answer', handler)
  }

  onGroupCallIceCandidate<T = unknown>(handler: ChatSocketEventHandler<T>) {
    return this.on('group-call:ice-candidate', handler)
  }

  kickGroupCallParticipant(payload: Record<string, unknown>) {
    return this.emit('group-call:kick', payload)
  }

  onGroupCallKicked(handler: ChatSocketEventHandler<{ roomId: string; kickedBy: string; reason?: string }>) {
    return this.on('group-call:kicked', handler)
  }

  notifyConversationCallStarted(payload: Record<string, unknown>) {
    return this.emit('conversation:call-started', payload)
  }

  notifyConversationCallEnded(payload: Record<string, unknown>) {
    return this.emit('conversation:call-ended', payload)
  }

  removeGroupCallListeners() {
    this.socket?.off('group-call:invite')
    this.socket?.off('group-call:participant-joined')
    this.socket?.off('group-call:participant-left')
    this.socket?.off('group-call:offer')
    this.socket?.off('group-call:answer')
    this.socket?.off('group-call:ice-candidate')
    this.socket?.off('group-call:kicked')
  }
}

export const chatWebSocketClient = new ChatWebSocketClient()
