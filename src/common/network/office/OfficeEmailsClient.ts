import type { RestClient } from '../rest/RestClient'
import { ResponseType } from '../rest/RestClient'
import type { RequestOptions } from '../rest/RestClient'

export class OfficeEmailsClient {
  constructor(private readonly client: RestClient) {}

  getAccounts<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/emails/accounts', options)
  }
  createAccount<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/accounts', body, options)
  }
  getAccount<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/accounts/${id}`, options)
  }
  testAccount<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/accounts/test', body, options)
  }
  deleteAccount(id: string, options?: RequestOptions) {
    return this.client.delete(`/emails/accounts/${id}`, options)
  }
  syncAccount(id: string, options?: RequestOptions) {
    return this.client.post(`/emails/accounts/${id}/sync`, undefined, options)
  }
  getFolders<T = any>(params?: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/folders${params ?? ''}`, options)
  }
  getMessages<T = any>(params: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/messages?${params}`, options)
  }
  getMessage<T = any>(id: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/messages/${id}`, options)
  }
  getThread<T = any>(threadId: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/threads/${threadId}`, options)
  }
  summarizeThread<T = any>(threadId: string, options?: RequestOptions) {
    return this.client.post<T>(`/emails/threads/${threadId}/summarize`, undefined, options)
  }
  send<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/send', body, options)
  }
  markRead(id: string, options?: RequestOptions) {
    return this.client.post(`/emails/messages/${id}/read`, undefined, options)
  }
  starMessage<T = any>(id: string, options?: RequestOptions) {
    return this.client.patch<T>(`/emails/messages/${id}/star`, undefined, options)
  }
  moveMessage(id: string, body: any, options?: RequestOptions) {
    return this.client.post(`/emails/messages/${id}/move`, body, options)
  }
  deleteMessage(id: string, options?: RequestOptions) {
    return this.client.delete(`/emails/messages/${id}`, options)
  }
  batchRead(body: any, options?: RequestOptions) {
    return this.client.post('/emails/messages/batch/read', body, options)
  }
  messageCrmLink<T = any>(messageId: string, body: any, options?: RequestOptions) {
    return this.client.post<T>(`/emails/messages/${messageId}/crm-link`, body, options)
  }
  messageSummarize<T = any>(messageId: string, options?: RequestOptions) {
    return this.client.post<T>(`/emails/messages/${messageId}/summarize`, undefined, options)
  }
  getMessageShared<T = any>(messageId: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/messages/${messageId}/shared`, options)
  }
  getMessageAttachmentDownload(messageId: string, attachmentId: string, options?: RequestOptions) {
    return this.client.get<Blob>(`/emails/messages/${messageId}/attachments/${attachmentId}/download`, {
      ...options,
      responseType: ResponseType.BLOB
    } as RequestOptions)
  }
  getProviderSettingsPublic<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/emails/provider-settings/public', options)
  }
  getProviderSettings<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/emails/provider-settings', options)
  }
  updateProviderSettings<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/provider-settings', body, options)
  }
  putProviderSettings<T = any>(body: any, options?: RequestOptions) {
    return this.client.put<T>('/emails/provider-settings', body, options)
  }
  oauthMicrosoftExchange<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/oauth/microsoft/exchange', body, options)
  }
  oauthGoogleExchange<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/oauth/google/exchange', body, options)
  }
  searchContacts(accountId: string, params: string, options?: RequestOptions) {
    return this.client.get(`/emails/accounts/${accountId}/contacts/search?${params}`, options)
  }
  getCalendarEvents<T = any>(accountId: string, params: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/accounts/${accountId}/calendar/events?${params}`, options)
  }
  addMessageLabels<T = any>(messageId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/emails/messages/${messageId}/labels/add`, body, options)
  }
  removeMessageLabels<T = any>(messageId: string, body: any, options?: RequestOptions) {
    return this.client.patch<T>(`/emails/messages/${messageId}/labels/remove`, body, options)
  }
  searchLabelSuggestions<T = any>(params: string, options?: RequestOptions) {
    return this.client.get<T>(`/emails/labels/suggestions?${params}`, options)
  }
  softDeleteLabel<T = any>(body: any, options?: RequestOptions) {
    return this.client.patch<T>('/emails/labels/soft-delete', body, options)
  }
  deleteLabel<T = any>(labelId: string, options?: RequestOptions) {
    return this.client.delete<T>(`/emails/labels/${labelId}`, options)
  }
  getAssistantCapabilities<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/emails/assistant/capabilities', options)
  }
  generateAssistantDraft<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/assistant/draft', body, options)
  }
  rewriteAssistantDraft<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/assistant/rewrite', body, options)
  }
  runAssistantTemperatureCheck<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/assistant/temperature-check', body, options)
  }
  suggestAssistantReply<T = any>(body: any, options?: RequestOptions) {
    return this.client.post<T>('/emails/assistant/reply-suggest', body, options)
  }
  getAssistantPolicy<T = any>(options?: RequestOptions) {
    return this.client.get<T>('/emails/assistant/policy', options)
  }
  updateAssistantPolicy<T = any>(body: any, options?: RequestOptions) {
    return this.client.put<T>('/emails/assistant/policy', body, options)
  }
}
