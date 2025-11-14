// Chat Service Types

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
  CONTEXT = 'context',
  AI = 'ai'
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  SYSTEM = 'system'
}

export interface User {
  id: string
  keycloakId: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  isActive: boolean
  lastSeenAt?: Date | string
  createdAt: Date | string
  updatedAt: Date | string
}

export interface Conversation {
  id: string
  type: ConversationType
  name?: string
  description?: string
  avatarUrl?: string
  contextType?: string
  contextId?: string
  isActive: boolean
  createdBy: string
  createdAt: Date | string
  updatedAt: Date | string
  participants?: ConversationParticipant[]
  lastMessage?: Message
  unreadCount?: number
}

export interface ConversationParticipant {
  id: string
  conversationId: string
  userId: string
  role: 'admin' | 'member'
  joinedAt: Date | string
  lastReadAt?: Date | string
  user?: User
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  type: MessageType
  content: string
  metadata?: Record<string, any>
  parentId?: string
  isEdited: boolean
  isDeleted: boolean
  createdAt: Date | string
  updatedAt: Date | string
  sender?: User
  reactions?: MessageReaction[]
  replies?: Message[]
  status?: 'sent' | 'delivered' | 'read'
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: Date | string
  user?: User
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TypingIndicator {
  conversationId: string
  userId: string
  username: string
  isTyping: boolean
}

export interface PresenceStatus {
  userId: string
  status: 'online' | 'away' | 'offline'
  lastSeen?: Date | string
}
