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

/** Email message summary (for list view) */
export interface EmailMessageSummary {
  id: string
  accountId: string
  folderId: string
  messageId?: string
  threadId?: string
  subject: string
  fromAddress: EmailAddress
  toAddresses: EmailAddress[]
  date: string
  snippet: string
  status: EmailMessageStatus
  isRead: boolean
  isStarred: boolean
  hasAttachments: boolean
  importance: string
  crmEntityType?: string
  crmEntityId?: string
  attachments?: EmailAttachment[]
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
}

/** Compose mode types */
export type ComposeMode = 'new' | 'reply' | 'reply-all' | 'forward'
