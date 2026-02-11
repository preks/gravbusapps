/**
 * EmailApiService
 *
 * Connects to the document-service backend API for email management.
 */
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type {
  EmailAccount,
  EmailFolder,
  EmailMessage,
  EmailMessageSummary,
  PaginatedResponse,
  CreateEmailAccountRequest,
  SendEmailRequest,
  ExternalCalendarEvent,
  ThreadSummaryResult
} from '../types'

const API_URL = getDocumentServiceApiUrl()

let currentAccessToken: string | null = null

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = currentAccessToken
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export const EmailApiService = {
  setAccessToken(token: string | null) {
    currentAccessToken = token
  },

  // ============ Accounts ============
  async listAccounts(): Promise<EmailAccount[]> {
    return apiRequest<EmailAccount[]>('/emails/accounts')
  },

  async createAccount(data: CreateEmailAccountRequest): Promise<EmailAccount> {
    return apiRequest<EmailAccount>('/emails/accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async updateAccount(id: string, data: Partial<CreateEmailAccountRequest>): Promise<EmailAccount> {
    return apiRequest<EmailAccount>(`/emails/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  },

  async deleteAccount(id: string): Promise<void> {
    await apiRequest(`/emails/accounts/${id}`, { method: 'DELETE' })
  },

  async syncAccount(id: string): Promise<void> {
    await apiRequest(`/emails/accounts/${id}/sync`, { method: 'POST' })
  },

  async testConnection(data: CreateEmailAccountRequest): Promise<{ success: boolean; error?: string }> {
    return apiRequest('/emails/accounts/test', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  // ============ Folders ============
  async listFolders(accountId?: string): Promise<EmailFolder[]> {
    const params = accountId ? `?accountId=${accountId}` : ''
    return apiRequest<EmailFolder[]>(`/emails/folders${params}`)
  },

  // ============ Messages ============
  async listMessages(options: {
    accountId?: string
    folderId?: string
    threadId?: string
    search?: string
    unreadOnly?: boolean
    starredOnly?: boolean
    hasAttachments?: boolean
    crmEntityType?: string
    crmEntityId?: string
    page?: number
    limit?: number
  }): Promise<PaginatedResponse<EmailMessageSummary>> {
    const params = new URLSearchParams()
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) params.set(key, String(value))
    })
    return apiRequest(`/emails/messages?${params.toString()}`)
  },

  async getMessage(id: string): Promise<EmailMessage> {
    return apiRequest<EmailMessage>(`/emails/messages/${id}`)
  },

  async getThread(threadId: string): Promise<EmailMessage[]> {
    return apiRequest<EmailMessage[]>(`/emails/threads/${threadId}`)
  },

  async summarizeThread(threadId: string): Promise<ThreadSummaryResult> {
    return apiRequest<ThreadSummaryResult>(`/emails/threads/${threadId}/summarize`, {
      method: 'POST'
    })
  },

  async sendEmail(data: SendEmailRequest): Promise<EmailMessage> {
    return apiRequest<EmailMessage>('/emails/send', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async markRead(id: string, isRead: boolean): Promise<void> {
    await apiRequest(`/emails/messages/${id}/read`, {
      method: 'PATCH',
      body: JSON.stringify({ isRead })
    })
  },

  async toggleStar(id: string): Promise<{ isStarred: boolean }> {
    return apiRequest(`/emails/messages/${id}/star`, { method: 'PATCH' })
  },

  async moveToFolder(id: string, folderId: string): Promise<void> {
    await apiRequest(`/emails/messages/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId })
    })
  },

  async deleteMessage(id: string): Promise<void> {
    await apiRequest(`/emails/messages/${id}`, { method: 'DELETE' })
  },

  async batchMarkRead(messageIds: string[], isRead: boolean): Promise<void> {
    await apiRequest('/emails/messages/batch/read', {
      method: 'POST',
      body: JSON.stringify({ messageIds, isRead })
    })
  },

  async linkToCrm(messageId: string, crmEntityType: string, crmEntityId: string): Promise<void> {
    await apiRequest(`/emails/messages/${messageId}/crm-link`, {
      method: 'PATCH',
      body: JSON.stringify({ crmEntityType, crmEntityId })
    })
  },

  // ============ Attachments ============
  /**
   * Downloads an attachment and returns a Blob URL for the browser.
   */
  async downloadAttachment(messageId: string, attachmentId: string): Promise<{ url: string; filename: string }> {
    const token = currentAccessToken
    const response = await fetch(`${API_URL}/emails/messages/${messageId}/attachments/${attachmentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })

    if (!response.ok) {
      throw new Error(`Failed to download attachment: ${response.statusText}`)
    }

    const contentDisposition = response.headers.get('content-disposition') || ''
    const filenameMatch = contentDisposition.match(/filename="?([^";\n]+)"?/)
    const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'attachment'

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    return { url, filename }
  },

  // ============ Contacts Search ============
  /**
   * Search contacts from a connected provider account (Microsoft/Google).
   */
  async searchProviderContacts(
    accountId: string,
    query: string,
    limit = 15
  ): Promise<Array<{ name: string; email: string; avatarUrl?: string; source: 'microsoft' | 'google' }>> {
    if (!query || query.trim().length < 2) return []
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    return apiRequest(`/emails/accounts/${accountId}/contacts/search?${params.toString()}`)
  },

  // ============ Calendar Sync ============
  /**
   * Fetches external calendar events for an account within a date range.
   */
  async getCalendarEvents(accountId: string, startDate: string, endDate: string): Promise<ExternalCalendarEvent[]> {
    const params = new URLSearchParams({ startDate, endDate })
    return apiRequest<ExternalCalendarEvent[]>(`/emails/accounts/${accountId}/calendar/events?${params.toString()}`)
  }
}

export default EmailApiService
