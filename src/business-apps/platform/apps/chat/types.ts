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
  keycloakId?: string
  username?: string
  email: string
  firstName?: string
  lastName?: string
  displayName?: string
  avatarUrl?: string
  employeeId?: string
  isActive?: boolean
  isOnline?: boolean
  lastSeen?: Date | string
  lastSeenAt?: Date | string // Legacy field name
  statusMessage?: string
  timezone?: string
  language?: string
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

// Backend sends this format for user_status_change event
export interface PresenceStatus {
  userId: string
  isOnline: boolean
  timestamp?: Date | string
}

// Entity Reference Types for @ mentions
export type EntityType =
  // CRM entities
  | 'lead'
  | 'contact'
  | 'account'
  | 'opportunity'
  // IRM entities
  | 'investment_lead'
  | 'investment_contact'
  | 'investment_account'
  | 'investment_opportunity'
  | 'investment'
  // Intranet content
  | 'news_article'
  | 'knowledge_article'
  | 'intranet_article'
  | 'document_article'
  // Other entities
  | 'employee'
  | 'campaign'
  | 'expense_request'

export interface EntityReference {
  id: string
  type: EntityType | string
  name: string
  subtitle?: string
  pictureThumbnail?: string
}

export interface MessageEntityReference extends EntityReference {
  startIndex: number
  endIndex: number
}

// Entity navigation paths (platform URLs that work with navigateTo)
export const ENTITY_NAVIGATION_PATHS: Record<EntityType, string> = {
  // CRM
  lead: '/platform/crm/lead-record',
  contact: '/platform/crm/contact-record',
  account: '/platform/crm/account-record',
  opportunity: '/platform/crm/opportunity-record',
  // IRM
  investment_lead: '/platform/irm/lead-record',
  investment_contact: '/platform/irm/contact-record',
  investment_account: '/platform/irm/account-record',
  investment_opportunity: '/platform/irm/opportunity-record',
  investment: '/platform/irm/investment-record',
  // Intranet content
  news_article: '/platform/content/intranet/content-record',
  knowledge_article: '/platform/content/intranet/content-record',
  intranet_article: '/platform/content/intranet/content-record',
  document_article: '/platform/content/intranet/content-record',
  // Other
  employee: '/platform/employee-record',
  campaign: '/platform/crm/campaign-record',
  expense_request: '/platform/fin/expenses/expense-request-record'
}

export const ENTITY_QUERY_PARAMS: Record<EntityType, string> = {
  // CRM
  lead: 'leadId',
  contact: 'contactId',
  account: 'accountId',
  opportunity: 'opportunityId',
  // IRM
  investment_lead: 'leadId',
  investment_contact: 'contactId',
  investment_account: 'accountId',
  investment_opportunity: 'opportunityId',
  investment: 'investmentId',
  // Intranet content
  news_article: 'contentId',
  knowledge_article: 'contentId',
  intranet_article: 'contentId',
  document_article: 'contentId',
  // Other
  employee: 'employeeId',
  campaign: 'campaignId',
  expense_request: 'expenseRequestId'
}

const SUPPORTED_ENTITY_TYPES = new Set<EntityType>(Object.keys(ENTITY_NAVIGATION_PATHS) as EntityType[])
const LOGGED_UNSUPPORTED_TYPES = new Set<string>()

export const isSupportedEntityType = (type: string): type is EntityType =>
  SUPPORTED_ENTITY_TYPES.has(type as EntityType)

export const warnOnceForUnsupportedEntityType = (type: string, payload?: unknown) => {
  if (LOGGED_UNSUPPORTED_TYPES.has(type)) {
    return
  }
  LOGGED_UNSUPPORTED_TYPES.add(type)
  console.warn('[Chat] Unsupported entity reference type', payload ?? type)
}
