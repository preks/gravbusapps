import { io, Socket } from 'socket.io-client'
import type { Message, TypingIndicator, PresenceStatus, ActiveCall } from '../types'
import type { CallSignal, CallType, CallParticipant } from './webrtcClient'

export type ChatEventHandler = (data: any) => void

export interface ChatWebSocketOptions {
  connectionTimeout?: number
  reconnectionAttempts?: number
  reconnectionDelayMax?: number
  path?: string
  enablePollingFallback?: boolean
}

export class ChatWebSocketClient {
  private socket: Socket | null = null
  private url: string
  private options: ChatWebSocketOptions
  private reconnectAttempts = 0
  private maxReconnectAttempts: number

  constructor(url: string, options: ChatWebSocketOptions = {}) {
    this.url = url
    this.options = {
      connectionTimeout: options.connectionTimeout || 20000, // 20s timeout
      reconnectionAttempts: options.reconnectionAttempts || 10,
      reconnectionDelayMax: options.reconnectionDelayMax || 10000,
      // Include /chat-service prefix so Kong strip-path=true forwards to upstream /socket.io
      path: options.path || '/chat-service/socket.io',
      enablePollingFallback: options.enablePollingFallback !== false // default true
    }
    this.maxReconnectAttempts = this.options.reconnectionAttempts || 10
  }

  connect(token: string) {
    // Build transports array based on configuration
    const transports = this.options.enablePollingFallback ? ['websocket', 'polling'] : ['websocket']

    console.log('======================================')
    console.log('🔌 [ChatWebSocketClient] INITIATING CONNECTION')
    console.log('======================================')
    console.log('URL:', this.url)
    console.log('Path:', this.options.path)
    console.log('Transports:', transports)
    console.log('Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'NO TOKEN')
    console.log('Full connection URL will be:', `${this.url}${this.options.path}`)
    console.log('Options:', {
      reconnection: true,
      timeout: this.options.connectionTimeout,
      reconnectionAttempts: this.options.reconnectionAttempts
    })
    console.log('======================================')

    this.socket = io(this.url, {
      auth: {
        token
      },
      transports,
      path: this.options.path,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: this.options.reconnectionDelayMax,
      reconnectionAttempts: this.options.reconnectionAttempts,
      timeout: this.options.connectionTimeout,
      // Add upgrade configuration for better cluster compatibility
      upgrade: true,
      rememberUpgrade: true,
      // Force new connection to avoid stale connections
      forceNew: false,
      // Add query parameters for load balancer sticky sessions
      query: {
        clientType: 'web',
        timestamp: Date.now().toString()
      },
      // Enable ping/pong for connection health monitoring
      autoConnect: true,
      randomizationFactor: 0.5
    })

    // Log transport upgrade attempts
    this.socket.io.engine.on('upgrading', transport => {
      console.log('🔄 [ChatWebSocketClient] Upgrading transport to:', transport.name)
    })

    this.socket.io.engine.on('upgrade', transport => {
      console.log('✅ [ChatWebSocketClient] Transport upgraded to:', transport.name)
    })

    this.socket.io.engine.on('upgradeError', error => {
      console.error('❌ [ChatWebSocketClient] Upgrade error:', error)
    })

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0 // Reset reconnect counter on successful connection
      console.log('======================================')
      console.log('✅ WebSocket CONNECTED SUCCESSFULLY!')
      console.log('======================================')
      console.log('Socket ID:', this.socket?.id)
      console.log('Connected:', this.socket?.connected)
      console.log('Transport:', this.socket?.io?.engine?.transport?.name)
      console.log('URL:', this.url)
      console.log('Timestamp:', new Date().toISOString())
      console.log('======================================')
    })

    this.socket.on('disconnect', reason => {
      console.warn('⚠️ Chat WebSocket disconnected:', {
        reason,
        socketId: this.socket?.id,
        timestamp: new Date().toISOString()
      })

      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server forcibly disconnected - attempt manual reconnection
        console.warn('Server disconnected client, attempting manual reconnection...')
        this.socket?.connect()
      } else if (reason === 'io client disconnect') {
        console.log('Client intentionally disconnected')
      } else if (reason === 'ping timeout') {
        console.error('Connection lost due to ping timeout')
      } else if (reason === 'transport close') {
        console.error('Transport connection closed')
      } else if (reason === 'transport error') {
        console.error('Transport connection error')
      }
    })

    this.socket.on('connect_error', error => {
      this.reconnectAttempts++
      console.log('======================================')
      console.error('❌ WebSocket CONNECTION ERROR')
      console.log('======================================')
      console.error('Error Message:', error.message)
      console.error('Error Type:', error.type)
      console.error('Error Description:', error.description)
      console.error('Attempt:', this.reconnectAttempts, '/', this.maxReconnectAttempts)
      console.error('Transport:', this.socket?.io?.engine?.transport?.name)
      console.error('URL:', this.url)
      console.error('Path:', this.options.path)
      console.error('Timestamp:', new Date().toISOString())
      console.log('======================================')

      // Log additional debugging info on first error
      if (this.reconnectAttempts === 1) {
        console.log('📋 Connection Configuration:')
        console.log({
          url: this.url,
          path: this.options.path,
          transports: this.socket?.io?.opts?.transports,
          autoConnect: this.socket?.io?.opts?.autoConnect,
          reconnection: this.socket?.io?.opts?.reconnection,
          timeout: this.socket?.io?.opts?.timeout
        })
      }

      // If max attempts reached and polling fallback is enabled, suggest fallback
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Max reconnection attempts reached. Connection failed completely.')
        console.error('Please check:')
        console.error('1. Is the chat-service backend running?')
        console.error('2. Are CORS settings configured correctly?')
        console.error('3. Is the WebSocket path correct?')
        console.error(`4. Can you access ${this.url}${this.options.path}?`)
      }
    })

    this.socket.on('error', error => {
      console.error('Chat WebSocket error:', error)
    })

    // Add reconnect failed listener
    this.socket.io.on('reconnect_failed', () => {
      console.error('Reconnection failed after all attempts')
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

  /**
   * Get detailed connection status information
   */
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

  /**
   * Manually force a reconnection attempt
   */
  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.reconnectAttempts = 0
      this.socket.connect()
    }
  }

  /**
   * Check if socket is in a healthy state
   */
  isHealthy() {
    return this.socket?.connected && this.reconnectAttempts < this.maxReconnectAttempts
  }

  // Event listeners
  onNewMessage(handler: (message: Message) => void) {
    console.log('[WebSocket] Registering new_message event listener')
    this.socket?.on('new_message', (message: Message) => {
      console.log('[WebSocket] new_message event received:', message.id)
      handler(message)
    })
  }

  onMessageUpdated(handler: (message: Message) => void) {
    this.socket?.on('message:updated', handler)
  }

  onMessageDeleted(handler: (data: { messageId: string; conversationId: string }) => void) {
    this.socket?.on('message:deleted', handler)
  }

  onUserTyping(handler: (data: TypingIndicator) => void) {
    this.socket?.on('user_typing', handler)
  }

  onPresence(handler: (data: PresenceStatus) => void) {
    this.socket?.on('user_status_change', handler)
  }

  onUserJoined(handler: (data: { conversationId: string; userId: string }) => void) {
    this.socket?.on('user:joined', handler)
  }

  onUserLeft(handler: (data: { conversationId: string; userId: string }) => void) {
    this.socket?.on('user:left', handler)
  }

  onMessageRead(handler: (data: { messageId: string; conversationId: string; readBy: string }) => void) {
    this.socket?.on('message:read', handler)
  }

  onMessageDelivered(handler: (data: { messageId: string; conversationId: string; deliveredTo: string }) => void) {
    this.socket?.on('message:delivered', handler)
  }

  onConversationUpdated(handler: (data: { conversationId: string }) => void) {
    this.socket?.on('conversation_updated', handler)
  }

  onConversationCreated(handler: (data: { conversation: any }) => void) {
    this.socket?.on('conversation_created', handler)
  }

  onConversationCallStarted(handler: (data: ActiveCall) => void) {
    this.socket?.on('conversation:call-started', handler)
  }

  onConversationCallEnded(handler: (data: { conversationId: string; roomId: string }) => void) {
    this.socket?.on('conversation:call-ended', handler)
  }

  onConversationActiveCalls(handler: (data: ActiveCall[]) => void) {
    this.socket?.on('conversation:active-calls', handler)
  }

  // Emit events
  joinConversation(conversationId: string) {
    console.log('[WebSocket] Emitting join_conversation:', conversationId)
    this.socket?.emit('join_conversation', { conversationId })
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('leave_conversation', { conversationId })
  }

  sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    parentId?: string,
    metadata?: Record<string, any>
  ) {
    console.log('[ChatWebSocketClient] sendMessage called', {
      conversationId,
      senderId,
      contentLength: content?.length,
      hasParentId: !!parentId,
      hasMetadata: !!metadata,
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id
    })

    if (!this.socket) {
      console.error('[ChatWebSocketClient] Cannot send message: socket is null')
      return
    }

    if (!this.socket.connected) {
      console.error('[ChatWebSocketClient] Cannot send message: socket not connected')
      return
    }

    const payload = {
      conversationId,
      content,
      senderId,
      ...(parentId && { parentId }),
      ...(metadata && { metadata })
    }

    console.log('[ChatWebSocketClient] Emitting send_message event', payload)
    this.socket.emit('send_message', payload, (response: any) => {
      console.log('[ChatWebSocketClient] send_message acknowledgment received', response)
    })
    console.log('[ChatWebSocketClient] send_message emitted')
  }

  sendTypingStart(conversationId: string) {
    this.socket?.emit('typing_start', { conversationId })
  }

  sendTypingStop(conversationId: string) {
    this.socket?.emit('typing_stop', { conversationId })
  }

  requestActiveCalls() {
    console.debug('Requesting active calls')
    this.socket?.emit('conversation:get-active-calls')
  }

  // ==================== Call Signaling Events ====================

  /**
   * Initiate a call to another user
   */
  initiateCall(signal: {
    callId: string
    callType: CallType
    from: CallParticipant
    to: CallParticipant
    conversationId?: string
  }) {
    console.debug('Emitting call:initiate', signal)
    this.socket?.emit('call:initiate', signal)
  }

  /**
   * Accept an incoming call
   */
  acceptCall(signal: { callId: string; callType: CallType; from: CallParticipant; to: CallParticipant }) {
    console.debug('Emitting call:accept', signal)
    this.socket?.emit('call:accept', signal)
  }

  /**
   * Reject an incoming call
   */
  rejectCall(signal: { callId: string; from: CallParticipant; to: CallParticipant; reason?: string }) {
    console.debug('Emitting call:reject', signal)
    this.socket?.emit('call:reject', signal)
  }

  /**
   * End an active call
   */
  endCall(signal: { callId: string; from: CallParticipant; to: CallParticipant }) {
    console.debug('Emitting call:end', signal)
    this.socket?.emit('call:end', signal)
  }

  /**
   * Send WebRTC offer
   */
  sendCallOffer(signal: {
    callId: string
    callType: CallType
    from: CallParticipant
    to: CallParticipant
    payload: RTCSessionDescriptionInit
  }) {
    console.debug('Emitting call:offer', signal)
    this.socket?.emit('call:offer', signal)
  }

  /**
   * Send WebRTC answer
   */
  sendCallAnswer(signal: {
    callId: string
    callType: CallType
    from: CallParticipant
    to: CallParticipant
    payload: RTCSessionDescriptionInit
  }) {
    console.debug('Emitting call:answer', signal)
    this.socket?.emit('call:answer', signal)
  }

  /**
   * Send ICE candidate
   */
  sendIceCandidate(signal: {
    callId: string
    from: CallParticipant
    to: CallParticipant
    payload: RTCIceCandidateInit
  }) {
    console.debug('Emitting call:ice-candidate')
    this.socket?.emit('call:ice-candidate', signal)
  }

  /**
   * Signal that user is busy (already in a call)
   */
  sendBusy(signal: { callId: string; from: CallParticipant; to: CallParticipant }) {
    console.debug('Emitting call:busy', signal)
    this.socket?.emit('call:busy', signal)
  }

  // Call event listeners
  onCallInitiate(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:initiate', handler)
  }

  onCallAccept(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:accept', handler)
  }

  onCallReject(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:reject', handler)
  }

  onCallEnd(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:end', handler)
  }

  onCallOffer(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:offer', handler)
  }

  onCallAnswer(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:answer', handler)
  }

  onCallIceCandidate(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:ice-candidate', handler)
  }

  onCallBusy(handler: (signal: CallSignal) => void) {
    this.socket?.on('call:busy', handler)
  }

  /**
   * Remove all call event listeners
   */
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

  // ==================== Group Call Signaling Events ====================

  /**
   * Invite participants to a group call
   */
  inviteToGroupCall(signal: {
    roomId: string
    callType: 'audio' | 'video'
    from: { id: string; odId: string; odName: string; avatarUrl?: string }
    participants: Array<{ id: string; odId: string; odName: string; avatarUrl?: string }>
    conversationName?: string
  }) {
    console.debug('Emitting group-call:invite', signal)
    this.socket?.emit('group-call:invite', signal)
  }

  /**
   * Join a group call room
   */
  joinGroupCall(signal: {
    roomId: string
    callType: 'audio' | 'video'
    participant: { id: string; odId: string; odName: string; avatarUrl?: string }
  }) {
    console.debug('Emitting group-call:join', signal)
    this.socket?.emit('group-call:join', signal)
  }

  /**
   * Leave a group call room
   */
  leaveGroupCall(signal: { roomId: string; participantId: string }) {
    console.debug('Emitting group-call:leave', signal)
    this.socket?.emit('group-call:leave', signal)
  }

  /**
   * Send offer to a specific participant in group call
   */
  sendGroupCallOffer(signal: {
    roomId: string
    fromParticipantId: string
    toParticipantId: string
    payload: RTCSessionDescriptionInit
  }) {
    console.debug('Emitting group-call:offer')
    this.socket?.emit('group-call:offer', signal)
  }

  /**
   * Send answer to a specific participant in group call
   */
  sendGroupCallAnswer(signal: {
    roomId: string
    fromParticipantId: string
    toParticipantId: string
    payload: RTCSessionDescriptionInit
  }) {
    console.debug('Emitting group-call:answer')
    this.socket?.emit('group-call:answer', signal)
  }

  /**
   * Send ICE candidate to a specific participant in group call
   */
  sendGroupCallIceCandidate(signal: {
    roomId: string
    fromParticipantId: string
    toParticipantId: string
    payload: RTCIceCandidateInit
  }) {
    console.debug('Emitting group-call:ice-candidate')
    this.socket?.emit('group-call:ice-candidate', signal)
  }

  // Group call event listeners
  onGroupCallInvite(
    handler: (signal: {
      roomId: string
      callType: 'audio' | 'video'
      from: { id: string; odId: string; odName: string; avatarUrl?: string }
      conversationName?: string
    }) => void
  ) {
    this.socket?.on('group-call:invite', handler)
  }

  onGroupCallParticipantJoined(
    handler: (signal: {
      roomId: string
      participant: { id: string; odId: string; odName: string; avatarUrl?: string }
      existingParticipants: Array<{ id: string; odId: string; odName: string; avatarUrl?: string }>
    }) => void
  ) {
    this.socket?.on('group-call:participant-joined', handler)
  }

  onGroupCallParticipantLeft(handler: (signal: { roomId: string; participantId: string }) => void) {
    this.socket?.on('group-call:participant-left', handler)
  }

  onGroupCallOffer(
    handler: (signal: {
      roomId: string
      fromParticipantId: string
      fromParticipant: { id: string; odId: string; odName: string; avatarUrl?: string }
      payload: RTCSessionDescriptionInit
    }) => void
  ) {
    this.socket?.on('group-call:offer', handler)
  }

  onGroupCallAnswer(
    handler: (signal: { roomId: string; fromParticipantId: string; payload: RTCSessionDescriptionInit }) => void
  ) {
    this.socket?.on('group-call:answer', handler)
  }

  onGroupCallIceCandidate(
    handler: (signal: { roomId: string; fromParticipantId: string; payload: RTCIceCandidateInit }) => void
  ) {
    this.socket?.on('group-call:ice-candidate', handler)
  }

  /**
   * Kick a participant from a group call (host only)
   */
  kickGroupCallParticipant(signal: { roomId: string; hostId: string; participantId: string }) {
    console.debug('Emitting group-call:kick', signal)
    this.socket?.emit('group-call:kick', signal)
  }

  /**
   * Listen for being kicked from a call
   */
  onGroupCallKicked(handler: (signal: { roomId: string; kickedBy: string; reason?: string }) => void) {
    this.socket?.on('group-call:kicked', handler)
  }

  /**
   * Notify all conversation members about an active call
   * This broadcasts to everyone in the conversation, not just call participants
   */
  notifyConversationCallStarted(signal: {
    conversationId: string
    roomId: string
    callType: 'audio' | 'video'
    startedBy: { id: string; odId: string; odName: string; avatarUrl?: string }
    participantIds: string[]
    startedAt: string
  }) {
    console.debug('Emitting conversation:call-started', signal)
    this.socket?.emit('conversation:call-started', signal)
  }

  /**
   * Notify all conversation members that a call has ended
   */
  notifyConversationCallEnded(signal: { conversationId: string; roomId: string }) {
    console.debug('Emitting conversation:call-ended', signal)
    this.socket?.emit('conversation:call-ended', signal)
  }

  /**
   * Listen for active calls response (sent after requesting)
   */
  onActiveCalls(
    handler: (
      calls: Array<{
        conversationId: string
        roomId: string
        callType: 'audio' | 'video'
        startedBy: { id: string; odId: string; odName: string; avatarUrl?: string }
        participantIds: string[]
      }>
    ) => void
  ) {
    this.socket?.on('conversation:active-calls', handler)
  }

  /**
   * Remove group call event listeners
   * NOTE: Does NOT remove conversation:call-started, conversation:call-ended, conversation:active-calls
   * because those may be managed by other hooks (like useChatClient) or need specific cleanup
   */
  removeGroupCallListeners() {
    this.socket?.off('group-call:invite')
    this.socket?.off('group-call:participant-joined')
    this.socket?.off('group-call:participant-left')
    this.socket?.off('group-call:offer')
    this.socket?.off('group-call:answer')
    this.socket?.off('group-call:ice-candidate')
    this.socket?.off('group-call:kicked')
    // conversation:* listeners should be removed individually using off(event, handler)
    // or by the component that registered them
  }

  // Remove event listeners
  off(event: string, handler?: ChatEventHandler) {
    this.socket?.off(event, handler)
  }
}
