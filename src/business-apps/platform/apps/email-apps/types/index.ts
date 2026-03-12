/** Email address with optional display name */
export interface EmailAddress {
  name?: string
  address: string
}

/** Provider types for email accounts */
export type EmailAccountProvider = 'imap_smtp' | 'microsoft' | 'google' | 'other'

/** Account connection status */
export type EmailAccountStatus = 'active' | 'disconnected' | 'error' | 'syncing'

/** Connected email account */
export interface EmailAccount {
  id: string
  displayName: string
  emailAddress: string
  provider: EmailAccountProvider
  status: EmailAccountStatus
  isDefault: boolean
  signature?: string
  lastSyncAt?: string
  lastSyncError?: string
  createdAt: string
  /** Whether calendar sync is enabled for this account */
  calendarSyncEnabled?: boolean
}

/** Well-known folder types */
export type EmailFolderType = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'archive' | 'starred' | 'custom'

/** Email folder */
export interface EmailFolder {
  id: string
  accountId: string
  name: string
  path: string
  type: EmailFolderType
  unreadCount: number
  totalCount: number
  parentId?: string
  sortOrder: number
}

/** Email message status */
export type EmailMessageStatus = 'received' | 'sent' | 'draft' | 'sending' | 'failed'

/** Email attachment metadata */
export interface EmailAttachment {
  id: string
  filename: string
  contentType: string
  size: number
  isInline: boolean
}

/** Reusable email label assigned to messages */
export interface EmailLabel {
  id: string
  name: string
  color: string | null
}

/** Input payload used when creating/upserting labels on a message */
export interface AddLabelInput {
  name: string
  color?: string
}

/** Email message summary (for list view) */
export interface EmailMessageSummary {
  id: string
  accountId: string
  folderId: string
  messageId?: string
  threadId?: string
  /** Number of messages in the thread (populated by backend) */
  threadMessageCount?: number
  subject: string
  fromAddress: EmailAddress
  toAddresses: EmailAddress[]
  date: string
  snippet: string
  status: EmailMessageStatus
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  labels?: EmailLabel[]
  importance: string
  crmEntityType?: string
  crmEntityId?: string
  attachments?: EmailAttachment[]
}

/** AI-generated thread summary from Groq */
export interface ThreadSummaryResult {
  threadId: string
  summary: string
  messageCount: number
  participants: string[]
  keyPoints: string[]
}

/** Full email message (for reader view) */
export interface EmailMessage extends EmailMessageSummary {
  ccAddresses: EmailAddress[]
  bccAddresses: EmailAddress[]
  replyToAddresses: EmailAddress[]
  textBody?: string
  htmlBody?: string
  inReplyTo?: string
  references?: string
  headers: Record<string, string>
  rawSize: number
}

/** Label suggestion from reusable labels catalog */
export interface EmailLabelSuggestion {
  id: string
  name: string
}

/** Paginated response from API */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/** OAuth provider configuration */
export interface OAuthProviderConfig {
  clientId?: string
  clientSecret?: string
  tenantId?: string
}

/** Create account request */
export interface CreateEmailAccountRequest {
  displayName: string
  emailAddress: string
  provider?: EmailAccountProvider
  imapHost?: string
  imapPort?: number
  imapSecure?: boolean
  smtpHost?: string
  smtpPort?: number
  smtpSecure?: boolean
  authUser?: string
  authPass?: string
  oauthAccessToken?: string
  oauthRefreshToken?: string
  oauthProviderConfig?: OAuthProviderConfig
  signature?: string
  isDefault?: boolean
}

/** Attachment to send with an email (base64-encoded) */
export interface SendAttachment {
  filename: string
  contentType: string
  content: string // base64
  size?: number
  isInline?: boolean
}

/** Send email request */
export interface SendEmailRequest {
  accountId: string
  to: EmailAddress[]
  cc?: EmailAddress[]
  bcc?: EmailAddress[]
  subject: string
  textBody?: string
  htmlBody?: string
  inReplyTo?: string
  threadId?: string
  isDraft?: boolean
  crmEntityType?: string
  crmEntityId?: string
  attachments?: SendAttachment[]
}

/** Compose mode types */
export type ComposeMode = 'new' | 'reply' | 'reply-all' | 'forward'

// ========== Directory / Contact types ==========

/** A contact entry from the company directory or recent recipients */
export interface EmailContact {
  id: string
  name: string
  email: string
  avatarUrl?: string
  source: 'directory' | 'recent' | 'manual'
}

// ========== External Calendar Event types ==========

/** External calendar event from a provider (Microsoft/Google) */
export interface ExternalCalendarEvent {
  id: string
  externalId: string
  accountId: string
  provider: 'microsoft' | 'google'
  title: string
  description?: string
  start: string
  end: string
  allDay: boolean
  location?: string
  meetingLink?: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
  isOrganizer: boolean
  organizer?: {
    name?: string
    email: string
  }
  attendees?: Array<{
    name?: string
    email: string
    status: 'accepted' | 'declined' | 'tentative' | 'needsAction'
    isOptional?: boolean
  }>
  recurrence?: string
  externalLink?: string
  color?: string
}

export type {
  EmailAssistantTone,
  EmailAssistantFormality,
  EmailAssistantLength,
  EmailAssistantRewriteAction,
  EmailAssistantRiskLevel,
  EmailAssistantDraft,
  EmailAssistantInsights,
  EmailAssistantTemperatureCheck,
  EmailAssistantMeta,
  EmailAssistantMissingContextPrompt,
  EmailAssistantResponse,
  EmailAssistantCapabilities,
  EmailAssistantDraftRequest,
  EmailAssistantRewriteRequest,
  EmailAssistantTemperatureCheckRequest,
  EmailAssistantReplySuggestRequest,
  EmailAssistantPolicy,
  EmailAssistantPolicyUpdateRequest
} from './emailAssistant.types'
