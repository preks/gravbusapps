import { io, Socket } from 'socket.io-client'
import type { Message, TypingIndicator, PresenceStatus } from '../types'

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
      path: options.path || '/socket.io',
      enablePollingFallback: options.enablePollingFallback !== false // default true
    }
    this.maxReconnectAttempts = this.options.reconnectionAttempts || 10
  }

  connect(token: string) {
    // Build transports array based on configuration
    const transports = this.options.enablePollingFallback ? ['websocket', 'polling'] : ['websocket']

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

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0 // Reset reconnect counter on successful connection
      console.debug('Chat WebSocket connected', {
        socketId: this.socket?.id,
        connected: this.socket?.connected,
        transport: this.socket?.io?.engine?.transport?.name,
        url: this.url
      })
    })

    this.socket.on('disconnect', reason => {
      console.debug('Chat WebSocket disconnected:', {
        reason,
        socketId: this.socket?.id
      })

      // Handle different disconnect reasons
      if (reason === 'io server disconnect') {
        // Server forcibly disconnected - attempt manual reconnection
        console.debug('Server disconnected, attempting manual reconnection...')
        this.socket?.connect()
      }
    })

    this.socket.on('connect_error', error => {
      this.reconnectAttempts++
      console.error('Chat WebSocket connection error:', {
        error: error.message,
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        transport: this.socket?.io?.engine?.transport?.name
      })

      // If max attempts reached and polling fallback is enabled, suggest fallback
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Connection failed.')
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
    this.socket?.on('new_message', handler)
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

  // Emit events
  joinConversation(conversationId: string) {
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
    const payload = {
      conversationId,
      content,
      senderId,
      ...(parentId && { parentId }),
      ...(metadata && { metadata })
    }

    this.socket?.emit('send_message', payload)
  }

  sendTypingStart(conversationId: string) {
    this.socket?.emit('typing_start', { conversationId })
  }

  sendTypingStop(conversationId: string) {
    this.socket?.emit('typing_stop', { conversationId })
  }

  // Remove event listeners
  off(event: string, handler?: ChatEventHandler) {
    this.socket?.off(event, handler)
  }
}
