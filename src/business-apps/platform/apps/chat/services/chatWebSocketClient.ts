import { io, Socket } from 'socket.io-client'
import type { Message, TypingIndicator, PresenceStatus } from '../types'

export type ChatEventHandler = (data: any) => void

export class ChatWebSocketClient {
  private socket: Socket | null = null
  private url: string

  constructor(url: string) {
    this.url = url
  }

  connect(token: string) {
    this.socket = io(this.url, {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    })

    this.socket.on('connect', () => {
      console.debug('Chat WebSocket connected', {
        socketId: this.socket?.id,
        connected: this.socket?.connected,
        url: this.url
      })
    })

    this.socket.on('disconnect', reason => {
      console.debug('Chat WebSocket disconnected:', reason)
    })

    this.socket.on('connect_error', error => {
      console.error('Chat WebSocket connection error:', error)
    })

    this.socket.on('error', error => {
      console.error('Chat WebSocket error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  isConnected() {
    return this.socket?.connected || false
  }

  getSocket() {
    return this.socket
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

  sendMessage(conversationId: string, content: string, senderId: string, parentId?: string) {
    const payload = {
      conversationId,
      content,
      senderId,
      ...(parentId && { parentId })
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
