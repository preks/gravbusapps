import { CHAT_API_URL } from '@/common/utils/serviceResolver'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { RestClient, type RequestOptions } from '../rest/RestClient'

type ChatQueryParams = Record<string, string | number | boolean>
type ChatPaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const inFlightConversationsRequests = new Map<string, Promise<unknown>>()
const conversationsResponseCache = new Map<string, { ts: number; value: unknown }>()
const CONVERSATIONS_CACHE_TTL_MS = 1000

function createQueryParams(params: Record<string, string | number | boolean | undefined>): ChatQueryParams | undefined {
  const filteredEntries = Object.entries(params).filter(
    (entry): entry is [string, string | number | boolean] => entry[1] !== undefined
  )

  if (filteredEntries.length === 0) {
    return undefined
  }

  return Object.fromEntries(filteredEntries)
}

function mergeRequestOptions(
  params?: ChatQueryParams,
  options: RequestOptions = {}
): Omit<RequestOptions, 'body'> & { params?: ChatQueryParams } {
  if (!params) {
    return options
  }

  return {
    ...options,
    params: options.params ? { ...options.params, ...params } : params
  }
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>
  }

  return undefined
}

function safeString(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  return ''
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value)

    if (Number.isFinite(parsedValue)) {
      return parsedValue
    }
  }

  return fallback
}

function hashToken(token: string): number {
  let hash = 5381

  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 33) ^ (token.codePointAt(index) ?? 0)
  }

  return hash >>> 0
}

function normalizeSender(sender: unknown): Record<string, unknown> | undefined {
  const senderRecord = toRecord(sender)

  if (!senderRecord) {
    return undefined
  }

  const avatarUrl = senderRecord.avatar_url ?? senderRecord.avatarUrl

  return {
    ...senderRecord,
    avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined
  }
}

function normalizeMessage<T = unknown>(raw: unknown): T {
  const messageRecord = toRecord(raw)

  if (!messageRecord) {
    return {
      id: '',
      conversationId: '',
      senderId: null,
      type: 'text',
      content: '',
      createdAt: '',
      updatedAt: ''
    } as T
  }

  const createdAt = messageRecord.created_at ?? messageRecord.createdAt
  const updatedAt = messageRecord.updated_at ?? messageRecord.updatedAt ?? createdAt
  const editedAt = messageRecord.edited_at ?? messageRecord.editedAt
  const quotedMessageId = messageRecord.quoted_message_id ?? messageRecord.quotedMessageId
  const quotedMessageRaw = messageRecord.quotedMessage ?? messageRecord.quoted_message
  const quotedMessage = quotedMessageRaw ? normalizeMessage(quotedMessageRaw) : undefined
  const quotedSnapshotRaw = toRecord(messageRecord.quoted_message_snapshot ?? messageRecord.quotedMessageSnapshot)
  const quotedMessageSnapshot =
    quotedSnapshotRaw && typeof quotedSnapshotRaw.content === 'string'
      ? {
          content: String(quotedSnapshotRaw.content),
          ...(quotedSnapshotRaw.createdAt != null && { createdAt: String(quotedSnapshotRaw.createdAt) }),
          ...(quotedSnapshotRaw.senderDisplayName != null && {
            senderDisplayName: String(quotedSnapshotRaw.senderDisplayName)
          })
        }
      : undefined

  return {
    ...messageRecord,
    id: safeString(messageRecord.id),
    conversationId: safeString(messageRecord.conversation_id ?? messageRecord.conversationId),
    senderId: (messageRecord.sender_id ?? messageRecord.senderId ?? null) as string | null,
    type: safeString(messageRecord.type || 'text') || 'text',
    content: safeString(messageRecord.content),
    metadata: messageRecord.metadata,
    parentId: (messageRecord.reply_to_id ?? messageRecord.parentId ?? messageRecord.replyToId) as string | undefined,
    isEdited: Boolean(messageRecord.is_edited ?? messageRecord.isEdited),
    isDeleted: Boolean(messageRecord.is_deleted ?? messageRecord.isDeleted),
    ...(editedAt ? { editedAt: String(editedAt) } : {}),
    createdAt: safeString(createdAt) || new Date().toISOString(),
    updatedAt: safeString(updatedAt) || safeString(createdAt) || new Date().toISOString(),
    sender: normalizeSender(messageRecord.sender),
    reactions: messageRecord.reactions,
    status: messageRecord.status,
    ...(quotedMessageId ? { quotedMessageId: String(quotedMessageId) } : {}),
    ...(quotedMessage ? { quotedMessage } : {}),
    ...(quotedMessageSnapshot ? { quotedMessageSnapshot } : {})
  } as T
}

function normalizeConversationLastMessage<T = unknown>(conversation: unknown): T {
  const conversationRecord = toRecord(conversation)

  if (!conversationRecord) {
    return conversation as T
  }

  if (!conversationRecord.lastMessage) {
    return conversationRecord as T
  }

  return {
    ...conversationRecord,
    lastMessage: normalizeMessage(conversationRecord.lastMessage)
  } as T
}

function normalizePaginatedResponse<T = unknown>(
  response: unknown,
  collectionKey: string,
  page: number,
  limit: number,
  itemNormalizer: (item: unknown) => T
): ChatPaginatedResponse<T> | T {
  const responseRecord = toRecord(response)

  if (!responseRecord) {
    return response as T
  }

  const directCollection = responseRecord[collectionKey]
  const dataCollection = responseRecord.data

  if (Array.isArray(directCollection)) {
    const normalizedItems = directCollection.map(itemNormalizer)
    const resolvedLimit = safeNumber(responseRecord.limit, limit)
    const resolvedTotal = safeNumber(responseRecord.total, normalizedItems.length)

    return {
      data: normalizedItems,
      total: resolvedTotal,
      page: safeNumber(responseRecord.page, page),
      limit: resolvedLimit,
      totalPages: safeNumber(responseRecord.totalPages, Math.ceil(resolvedTotal / Math.max(resolvedLimit, 1)))
    }
  }

  if (Array.isArray(dataCollection)) {
    return {
      ...(responseRecord as Record<string, unknown>),
      data: dataCollection.map(itemNormalizer)
    } as T
  }

  return response as T
}

function normalizeArrayResponse<T = unknown>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[]
  }

  const responseRecord = toRecord(response)

  if (responseRecord && Array.isArray(responseRecord.data)) {
    return responseRecord.data as T[]
  }

  return []
}

function normalizeCallHistoryResponse<T = unknown>(response: unknown): T {
  if (!Array.isArray(response)) {
    return [] as T
  }

  return response.map(entry => {
    const entryRecord = toRecord(entry)

    if (!entryRecord) {
      return { type: '', item: {} }
    }

    const { type, ...item } = entryRecord

    return {
      type: typeof type === 'string' ? type : '',
      item
    }
  }) as T
}

function createUploadFormData(filesOrFormData: File[] | FormData): FormData {
  if (filesOrFormData instanceof FormData) {
    return filesOrFormData
  }

  const formData = new FormData()

  filesOrFormData.forEach(file => {
    formData.append('files', file)
  })

  return formData
}

export class ChatClient extends RestClient {
  private accessToken = ''

  constructor() {
    super(CHAT_API_URL, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.accessToken = accessToken
    this.headers.Authorization = setAccessTokenToAuthorizationHeader(accessToken)
  }

  getCurrentUser<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/auth/me', options)
  }

  searchUsers<T = any>(query: string, limit: number = 20, options: RequestOptions = {}) {
    return this.get<T>('/users/search', mergeRequestOptions(createQueryParams({ q: query, limit }), options))
  }

  getUserById<T = any>(userId: string, options: RequestOptions = {}) {
    return this.get<T>(`/users/${userId}`, options)
  }

  getRecentlyActiveUsers<T = any>(limit: number = 20, options: RequestOptions = {}) {
    return this.get<T>('/users/recent', mergeRequestOptions(createQueryParams({ limit }), options))
  }

  getConversations<T = any>(
    page: number = 1,
    limit: number = 20,
    filters: { search?: string; filter?: 'all' | 'direct' | 'group' | 'meeting'; unreadOnly?: boolean } = {},
    options: RequestOptions = {}
  ) {
    const tokenKey = this.accessToken ? String(hashToken(this.accessToken)) : 'no-token'
    const filterKey = JSON.stringify(filters)
    const cacheKey = `${this.baseUrl}|${tokenKey}|${page}|${limit}|${filterKey}`
    const cachedResponse = conversationsResponseCache.get(cacheKey)

    if (cachedResponse && Date.now() - cachedResponse.ts < CONVERSATIONS_CACHE_TTL_MS) {
      return Promise.resolve(cachedResponse.value as T)
    }

    const existingRequest = inFlightConversationsRequests.get(cacheKey)

    if (existingRequest) {
      return existingRequest as Promise<T>
    }

    const requestPromise = this.get<unknown>(
      '/conversations',
      mergeRequestOptions(
        createQueryParams({
          page,
          limit,
          search: filters.search || undefined,
          filter: filters.filter && filters.filter !== 'all' ? filters.filter : undefined,
          unreadOnly: filters.unreadOnly === true ? true : undefined
        }),
        options
      )
    )
      .then(response =>
        normalizePaginatedResponse(response, 'conversations', page, limit, normalizeConversationLastMessage)
      )
      .then(response => {
        conversationsResponseCache.set(cacheKey, { ts: Date.now(), value: response })

        if (conversationsResponseCache.size > 50) {
          const firstKey = conversationsResponseCache.keys().next().value

          if (firstKey) {
            conversationsResponseCache.delete(firstKey)
          }
        }

        return response as T
      })
      .finally(() => {
        if (inFlightConversationsRequests.get(cacheKey) === requestPromise) {
          inFlightConversationsRequests.delete(cacheKey)
        }
      })

    inFlightConversationsRequests.set(cacheKey, requestPromise)

    return requestPromise
  }

  async getConversationById<T = any>(conversationId: string, options: RequestOptions = {}) {
    const response = await this.get<unknown>(`/conversations/${conversationId}`, options)
    return normalizeConversationLastMessage<T>(response)
  }

  createConversation<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/conversations', body, options)
  }

  getOrCreateDirectConversation<T = any>(userId: string, options: RequestOptions = {}) {
    return this.post<T>('/conversations/direct', { userId }, options)
  }

  getOrCreateDirectConversationByKeycloakId<T = any>(keycloakId: string, options: RequestOptions = {}) {
    return this.getOrCreateDirectConversation<T>(keycloakId, options)
  }

  getOrCreateContextConversation<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/conversations/context', body, options)
  }

  getOrCreateAiAgentConversation<T = any>(body: unknown = {}, options: RequestOptions = {}) {
    return this.post<T>('/conversations/ai-agent', body, options)
  }

  createGroupConversation<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/conversations/group', body, options)
  }

  addParticipant<T = any>(conversationId: string, userId: string, options: RequestOptions = {}) {
    return this.post<T>(`/conversations/${conversationId}/participants`, { userId }, options)
  }

  removeParticipant<T = any>(conversationId: string, userId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/conversations/${conversationId}/participants/${userId}`, options)
  }

  updateParticipantRole<T = any>(
    conversationId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member',
    options: RequestOptions = {}
  ) {
    return this.patch<T>(`/conversations/${conversationId}/participants/${userId}/role`, { role }, options)
  }

  deleteConversation<T = any>(conversationId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/conversations/${conversationId}`, options)
  }

  updateConversation<T = any>(conversationId: string, body: unknown, options: RequestOptions = {}) {
    return this.patch<T>(`/conversations/${conversationId}`, body, options)
  }

  updateConversationPreferences<T = any>(conversationId: string, body: unknown, options: RequestOptions = {}) {
    return this.patch<T>(`/conversations/${conversationId}/me/preferences`, body, options)
  }

  async getMessage<T = any>(messageId: string, options: RequestOptions = {}) {
    const response = await this.get<unknown>(`/messages/${messageId}`, options)
    return normalizeMessage<T>(response)
  }

  async getMessages<T = any>(
    conversationId: string,
    page: number = 1,
    limit: number = 100,
    before?: string,
    options: RequestOptions = {}
  ) {
    const response = await this.get<unknown>(
      `/messages/conversation/${conversationId}`,
      mergeRequestOptions(createQueryParams({ page, limit, before }), options)
    )

    return normalizePaginatedResponse(response, 'messages', page, limit, normalizeMessage) as T
  }

  async searchMessages<T = any>(
    conversationId: string,
    query: string,
    searchOptions: { page?: number; limit?: number } = {},
    options: RequestOptions = {}
  ) {
    const page = searchOptions.page ?? 1
    const limit = searchOptions.limit ?? 20
    const response = await this.get<unknown>(
      '/messages/search',
      mergeRequestOptions(createQueryParams({ query: query.trim(), conversationId, page, limit }), options)
    )

    return normalizePaginatedResponse(response, 'messages', page, limit, normalizeMessage) as T
  }

  async sendMessage<T = any>(
    conversationId: string,
    content: string,
    senderId: string,
    parentId?: string,
    metadata?: Record<string, unknown>,
    quotedMessageId?: string,
    options: RequestOptions = {}
  ) {
    const response = await this.post<unknown>(
      '/messages',
      {
        conversationId,
        content,
        senderId,
        ...(parentId && { parentId }),
        ...(metadata && { metadata }),
        ...(quotedMessageId && { quotedMessageId })
      },
      options
    )

    return normalizeMessage<T>(response)
  }

  async updateMessage<T = any>(messageId: string, content: string, options: RequestOptions = {}) {
    const response = await this.patch<unknown>(`/messages/${messageId}`, { content }, options)
    return normalizeMessage<T>(response)
  }

  deleteMessage<T = any>(messageId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/messages/${messageId}`, options)
  }

  async addReaction<T = any>(messageId: string, emoji: string, options: RequestOptions = {}) {
    const response = await this.post<unknown>(`/messages/${messageId}/reactions`, { emoji }, options)
    return normalizeMessage<T>(response)
  }

  async removeReaction<T = any>(messageId: string, emoji: string, options: RequestOptions = {}) {
    const response = await this.delete<unknown>(
      `/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
      options
    )
    return normalizeMessage<T>(response)
  }

  markConversationRead<T = any>(conversationId: string, options: RequestOptions = {}) {
    return this.post<T>(`/messages/conversation/${conversationId}/mark-read`, undefined, options)
  }

  markConversationUnread<T = any>(conversationId: string, options: RequestOptions = {}) {
    return this.post<T>(`/messages/conversation/${conversationId}/mark-unread`, undefined, options)
  }

  createMeeting<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/meetings', body, options)
  }

  getMeeting<T = any>(meetingId: string, options: RequestOptions = {}) {
    return this.get<T>(`/meetings/${meetingId}`, options)
  }

  updateMeeting<T = any>(meetingId: string, body: unknown, options: RequestOptions = {}) {
    return this.patch<T>(`/meetings/${meetingId}`, body, options)
  }

  cancelMeeting<T = any>(meetingId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/meetings/${meetingId}`, options)
  }

  getCalendarEvents<T = any>(startDate: string, endDate: string, options: RequestOptions = {}) {
    return this.get<T>(
      '/meetings/calendar/events',
      mergeRequestOptions(createQueryParams({ startDate, endDate }), options)
    )
  }

  getCalendarEventsByPath<T = any>(params?: Record<string, string>, options: RequestOptions = {}) {
    return this.get<T>('/calendar/events', mergeRequestOptions(params, options))
  }

  getPendingInvitations<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/meetings/invitations/pending', options)
  }

  getOrganizedMeetings<T = any>(includeCompleted?: boolean, options: RequestOptions = {}) {
    return this.get<T>(
      '/meetings/organized/list',
      mergeRequestOptions(createQueryParams({ includeCompleted: !!includeCompleted }), options)
    )
  }

  respondToInvitation<T = any>(meetingId: string, body: unknown, options: RequestOptions = {}) {
    return this.post<T>(`/meetings/${meetingId}/respond`, body, options)
  }

  inviteToMeeting<T = any>(meetingId: string, body: unknown, options: RequestOptions = {}) {
    return this.post<T>(`/meetings/${meetingId}/invite`, body, options)
  }

  startMeeting<T = any>(meetingId: string, options: RequestOptions = {}) {
    return this.post<T>(`/meetings/${meetingId}/start`, undefined, options)
  }

  endMeeting<T = any>(meetingId: string, options: RequestOptions = {}) {
    return this.post<T>(`/meetings/${meetingId}/end`, undefined, options)
  }

  linkWebrtcSession<T = any>(meetingId: string, cloudFlareMeetingId: string, options: RequestOptions = {}) {
    return this.post<T>(`/meetings/${meetingId}/link-webrtc-session`, { cloudFlareMeetingId }, options)
  }

  resolveMeetingSession<T = any>(meetingId: string, options: RequestOptions = {}) {
    return this.post<T>(`/meetings/${meetingId}/resolve-session`, undefined, options)
  }

  getIceServers<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/webrtc/ice-servers', options)
  }

  getActiveWebrtcSessions<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/webrtc/sessions/active', options)
  }

  getWebrtcSessionsHistory<T = any>(page: number = 1, limit: number = 20, options: RequestOptions = {}) {
    return this.get<T>('/webrtc/sessions/history', mergeRequestOptions(createQueryParams({ page, limit }), options))
  }

  getWebrtcSessionsStats<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/webrtc/sessions/stats', options)
  }

  realtimeKitCreateMeeting<T = any>(body: unknown, options: RequestOptions = {}) {
    return this.post<T>('/realtimekit/meetings', body, options)
  }

  realtimeKitAddParticipant<T = any>(meetingId: string, body: unknown, options: RequestOptions = {}) {
    return this.post<T>(`/realtimekit/meetings/${meetingId}/participants`, body, options)
  }

  realtimeKitGetActiveCallByConversation<T = any>(conversationId: string, options: RequestOptions = {}) {
    return this.get<T>(`/realtimekit/conversations/${encodeURIComponent(conversationId)}/active-call`, options)
  }

  realtimeKitGetMeetingDetails<T = any>(meetingId: string, options: RequestOptions = {}) {
    return this.get<T>(`/realtimekit/meetings/${meetingId}`, options)
  }

  realtimeKitEndMeeting<T = any>(meetingId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/realtimekit/meetings/${meetingId}`, options)
  }

  realtimeKitGetActiveMeetings<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/realtimekit/meetings', options)
  }

  getCallSessions<T = any>(
    params?: { meetingId?: string; conversationId?: string; limit?: number },
    options: RequestOptions = {}
  ) {
    return this.get<T>('/call-sessions', mergeRequestOptions(createQueryParams(params ?? {}), options))
  }

  async getCallSessionsUserHistory<T = any>(userId: string, limit: number = 50, options: RequestOptions = {}) {
    const response = await this.get<unknown>(
      `/call-sessions/users/${encodeURIComponent(userId)}/history`,
      mergeRequestOptions(createQueryParams({ limit }), options)
    )

    return normalizeArrayResponse(response) as T
  }

  getCallSessionTranscriptData<T = any>(sessionId: string, options: RequestOptions = {}) {
    return this.get<T>(`/call-sessions/${sessionId}/transcript-data`, options)
  }

  createMeetingMinutes<T = any>(sessionId: string, options: RequestOptions = {}) {
    return this.post<T>(`/call-sessions/${sessionId}/create-meeting-minutes`, undefined, options)
  }

  async getCallInviteOutcomesMine<T = any>(
    params?: { outcome?: string; since?: string; limit?: number },
    options: RequestOptions = {}
  ) {
    const response = await this.get<unknown>(
      '/call-invite-outcomes/mine',
      mergeRequestOptions(createQueryParams(params ?? { limit: 50 }), options)
    )

    return normalizeArrayResponse(response) as T
  }

  async getCallHistory<T = any>(
    params: { status?: string; callType?: string; limit?: number; offset?: number },
    options: RequestOptions = {}
  ) {
    const response = await this.get<unknown>('/call-history', mergeRequestOptions(createQueryParams(params), options))
    return normalizeCallHistoryResponse<T>(response)
  }

  async getMissedCallsCount(options: RequestOptions = {}) {
    const response = await this.get<{ count?: number }>('/call-history/missed-count', options)
    return response?.count ?? 0
  }

  markCallHistorySeen<T = any>(options: RequestOptions = {}) {
    return this.post<T>('/call-history/mark-seen', undefined, options)
  }

  uploadFiles<T = any>(conversationId: string, filesOrFormData: File[] | FormData, options: RequestOptions = {}) {
    return this.post<T>(`/files/upload/${conversationId}`, createUploadFormData(filesOrFormData), options)
  }

  addExpert<T = any>(conversationId: string, expertId: string, options: RequestOptions = {}) {
    return this.post<T>(`/conversations/${conversationId}/experts`, { expertId }, options)
  }

  removeExpert<T = any>(conversationId: string, expertId: string, options: RequestOptions = {}) {
    return this.delete<T>(`/conversations/${conversationId}/experts/${expertId}`, options)
  }

  getActiveExperts<T = any>(conversationId: string, options: RequestOptions = {}) {
    return this.get<T>(`/conversations/${conversationId}/experts`, options)
  }

  getAnalyticsUserOverview<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/analytics/user/overview', options)
  }

  getAnalyticsUserContacts<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/analytics/user/contacts', options)
  }

  getAnalyticsUserActivity<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/analytics/user/activity', options)
  }

  getAnalyticsUserReactions<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/analytics/user/reactions', options)
  }

  getAnalyticsGlobalStats<T = any>(options: RequestOptions = {}) {
    return this.get<T>('/analytics/global', options)
  }
}

export const chatClient = new ChatClient()
