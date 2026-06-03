/**
 * EmailApiService
 *
 * Connects to the document-service backend API for email management.
 */
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import { normalizeLabels, normalizeLabelObjects, normalizeAddLabelInputs } from '../utils/labelUtils'
import {
  parseEmailAssistantCapabilities,
  parseEmailAssistantPolicy,
  parseEmailAssistantResponse
} from '../utils/emailAssistantParsers'
import {
  normalizeMessageSummaryResult,
  normalizeThreadSummaryResultSuggestions
} from '../utils/emailSummarizeSuggestionNormalize'
import type {
  EmailAccount,
  EmailFolder,
  EmailMessage,
  EmailMessageSummary,
  EmailLabel,
  AddLabelInput,
  EmailLabelSuggestion,
  PaginatedResponse,
  CreateEmailAccountRequest,
  SendEmailRequest,
  ExternalCalendarEvent,
  ThreadSummaryResult,
  MessageSummaryResult,
  EmailAssistantCapabilities,
  EmailAssistantDraftRequest,
  EmailAssistantPolicy,
  EmailAssistantPolicyUpdateRequest,
  EmailAssistantReplySuggestRequest,
  EmailAssistantResponse,
  EmailAssistantRewriteRequest,
  EmailAssistantTemperatureCheckRequest
} from '../types'

const API_URL = getDocumentServiceApiUrl()

let currentAccessToken: string | null = null

function normalizeMessageSummary(message: EmailMessageSummary): EmailMessageSummary {
  return { ...message, labels: normalizeLabelObjects((message as unknown as Record<string, unknown>).labels) }
}

function normalizeMessage(message: EmailMessage): EmailMessage {
  return { ...message, labels: normalizeLabelObjects((message as unknown as Record<string, unknown>).labels) }
}

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
  return (text ? JSON.parse(text) : null) as T
}

// Typed outcome of the Workforce debug re-emit endpoint.
// Mirrors document-service ``ForwardResult``.
export type WorkforceForwardReason =
  | 'not_configured'
  | 'unknown_message'
  | 'not_received_status'
  | 'not_inbox_folder'
  | 'no_account_address'
  | 'forwarding_disabled'
  | 'no_workforce_mailbox'
  | 'forward_failed'

export type WorkforceForwardResult =
  | { ok: true; sessionId: string | null; mailbox: string }
  | { ok: false; reason: WorkforceForwardReason; detail?: string }

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
    labels?: string[]
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
      if (value === undefined || value === null) return
      if (Array.isArray(value)) {
        value
          .map(v => String(v).trim())
          .filter(Boolean)
          .forEach(v => params.append(key, v))
        return
      }
      params.set(key, String(value))
    })
    const response = await apiRequest<PaginatedResponse<EmailMessageSummary>>(`/emails/messages?${params.toString()}`)
    return {
      ...response,
      items: response.items.map(normalizeMessageSummary)
    }
  },

  async getMessage(id: string): Promise<EmailMessage> {
    const response = await apiRequest<EmailMessage>(`/emails/messages/${id}`)
    return normalizeMessage(response)
  },

  async getThread(threadId: string): Promise<EmailMessage[]> {
    const response = await apiRequest<EmailMessage[]>(`/emails/threads/${threadId}`)
    return response.map(normalizeMessage)
  },

  async summarizeThread(threadId: string): Promise<ThreadSummaryResult> {
    const result = await apiRequest<ThreadSummaryResult>(`/emails/threads/${threadId}/summarize`, {
      method: 'POST'
    })
    return normalizeThreadSummaryResultSuggestions({ ...result, suggestions: result.suggestions ?? [] })
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

  /**
   * AI-summarize a single email message.
   * Returns summary text plus structured suggestions (tasks, follow-ups, etc.).
   */
  async summarizeMessage(messageId: string): Promise<MessageSummaryResult> {
    const result = await apiRequest<MessageSummaryResult>(`/emails/messages/${messageId}/summarize`, {
      method: 'POST'
    })
    return normalizeMessageSummaryResult(result)
  },

  /**
   * Debug: re-emit an already-synced email through the Workforce inbound-email
   * forwarder. Lets us trigger a Workforce Agent run from an existing inbox
   * message instead of waiting for a real inbound email during testing.
   */
  async resendMessageToWorkforce(messageId: string): Promise<WorkforceForwardResult> {
    return apiRequest<WorkforceForwardResult>(`/emails/messages/${messageId}/resend-to-workforce`, { method: 'POST' })
  },

  /**
   * Get a CRM-linked email (shared endpoint, no ownership check).
   * Only works for emails that have been linked to a CRM entity.
   */
  async getSharedMessage(messageId: string): Promise<EmailMessage> {
    return apiRequest<EmailMessage>(`/emails/messages/${messageId}/shared`)
  },

  async addMessageLabels(messageId: string, labels: AddLabelInput[]): Promise<{ labels: EmailLabel[] }> {
    const normalized = normalizeAddLabelInputs(labels)
    if (normalized.length === 0) return { labels: [] }

    const response = await apiRequest<{ labels: unknown[] }>(`/emails/messages/${messageId}/labels/add`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: normalized })
    })
    return { labels: normalizeLabelObjects(response.labels) }
  },

  async removeMessageLabels(messageId: string, labels: string[]): Promise<{ labels: EmailLabel[] }> {
    const normalized = normalizeLabels(labels)
    if (normalized.length === 0) return { labels: [] }

    const response = await apiRequest<{ labels: unknown[] }>(`/emails/messages/${messageId}/labels/remove`, {
      method: 'PATCH',
      body: JSON.stringify({ labels: normalized })
    })
    return { labels: normalizeLabelObjects(response.labels) }
  },

  async searchLabelSuggestions(query: string, limit = 10): Promise<EmailLabelSuggestion[]> {
    const q = query.trim()
    if (!q) return []
    const params = new URLSearchParams({ q, limit: String(limit) })
    return apiRequest<EmailLabelSuggestion[]>(`/emails/labels/suggestions?${params.toString()}`)
  },

  async softDeleteLabelByName(name: string): Promise<{ success: boolean }> {
    const normalized = normalizeLabels([name])
    if (normalized.length === 0) return { success: true }

    return apiRequest<{ success: boolean }>('/emails/labels/soft-delete', {
      method: 'PATCH',
      body: JSON.stringify({ name: normalized[0] })
    })
  },

  async softDeleteLabelById(id: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/emails/labels/${id}`, { method: 'DELETE' })
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
  },

  // ============ Assistant ============
  async getAssistantCapabilities(options?: { signal?: AbortSignal }): Promise<EmailAssistantCapabilities> {
    const response = await apiRequest<unknown>('/emails/assistant/capabilities', {
      signal: options?.signal
    })
    return parseEmailAssistantCapabilities(response)
  },

  async generateAssistantDraft(
    data: EmailAssistantDraftRequest,
    options?: { signal?: AbortSignal }
  ): Promise<EmailAssistantResponse> {
    const response = await apiRequest<unknown>('/emails/assistant/draft', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options?.signal
    })
    return parseEmailAssistantResponse(response)
  },

  async rewriteAssistantDraft(
    data: EmailAssistantRewriteRequest,
    options?: { signal?: AbortSignal }
  ): Promise<EmailAssistantResponse> {
    const response = await apiRequest<unknown>('/emails/assistant/rewrite', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options?.signal
    })
    return parseEmailAssistantResponse(response)
  },

  async runAssistantTemperatureCheck(
    data: EmailAssistantTemperatureCheckRequest,
    options?: { signal?: AbortSignal }
  ): Promise<EmailAssistantResponse> {
    const response = await apiRequest<unknown>('/emails/assistant/temperature-check', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options?.signal
    })
    return parseEmailAssistantResponse(response)
  },

  async suggestAssistantReply(
    data: EmailAssistantReplySuggestRequest,
    options?: { signal?: AbortSignal }
  ): Promise<EmailAssistantResponse> {
    const response = await apiRequest<unknown>('/emails/assistant/reply-suggest', {
      method: 'POST',
      body: JSON.stringify(data),
      signal: options?.signal
    })
    return parseEmailAssistantResponse(response)
  },

  async getAssistantPolicy(options?: { signal?: AbortSignal }): Promise<EmailAssistantPolicy> {
    const response = await apiRequest<unknown>('/emails/assistant/policy', {
      signal: options?.signal
    })
    return parseEmailAssistantPolicy(response)
  },

  async updateAssistantPolicy(
    data: EmailAssistantPolicyUpdateRequest,
    options?: { signal?: AbortSignal }
  ): Promise<EmailAssistantPolicy> {
    const response = await apiRequest<unknown>('/emails/assistant/policy', {
      method: 'PUT',
      body: JSON.stringify(data),
      signal: options?.signal
    })
    return parseEmailAssistantPolicy(response)
  }
}

export default EmailApiService
