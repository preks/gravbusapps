import axios, { AxiosInstance } from 'axios'
import type { User, Conversation, Message, PaginatedResponse, ConversationType } from '../types'

type NormalizedConversationsResponse = PaginatedResponse<Conversation>

/** Coerce to string only for primitives to avoid [object Object] from API. */
function safeString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return ''
}

/** Normalize sender from API (snake_case → camelCase) so avatarUrl is available. */
function normalizeSender(sender: unknown): Message['sender'] | undefined {
  if (sender == null || typeof sender !== 'object') return undefined
  const s = sender as Record<string, unknown>
  const avatarUrl = (s.avatar_url ?? s.avatarUrl) as string | undefined
  return {
    ...s,
    avatarUrl: avatarUrl ?? (s.avatarUrl as string | undefined)
  } as Message['sender']
}

/** Normalize a message from API (snake_case, quotedMessage). Used for list, search, new_message, reactions. */
export function normalizeMessage(raw: unknown): Message {
  if (raw == null || typeof raw !== 'object') {
    return {
      id: '',
      conversationId: '',
      senderId: null,
      type: 'text',
      content: '',
      createdAt: '',
      updatedAt: ''
    } as Message
  }
  const m = raw as Record<string, unknown>
  const createdAt = (m.created_at ?? m.createdAt) as string | undefined
  const updatedAt = (m.updated_at ?? m.updatedAt ?? m.created_at ?? m.createdAt) as string | undefined
  const editedAt = (m.edited_at ?? m.editedAt) as string | undefined
  const quotedMessageId = (m.quoted_message_id ?? m.quotedMessageId) as string | undefined
  const quotedMessageRaw = m.quotedMessage ?? m.quoted_message
  const quotedMessage =
    quotedMessageRaw != null && typeof quotedMessageRaw === 'object' ? normalizeMessage(quotedMessageRaw) : undefined
  const quotedSnapshotRaw = m.quoted_message_snapshot ?? m.quotedMessageSnapshot
  const quotedMessageSnapshot =
    quotedSnapshotRaw != null &&
    typeof quotedSnapshotRaw === 'object' &&
    typeof (quotedSnapshotRaw as any).content === 'string'
      ? {
          content: String((quotedSnapshotRaw as any).content),
          ...((quotedSnapshotRaw as any).createdAt != null && {
            createdAt: String((quotedSnapshotRaw as any).createdAt)
          }),
          ...((quotedSnapshotRaw as any).senderDisplayName != null && {
            senderDisplayName: String((quotedSnapshotRaw as any).senderDisplayName)
          })
        }
      : undefined
  return {
    id: safeString(m.id),
    conversationId: safeString(m.conversation_id ?? m.conversationId),
    senderId: (m.sender_id ?? m.senderId) as string | null,
    type: (m.type ?? 'text') as Message['type'],
    content: safeString(m.content),
    metadata: (m.metadata as Message['metadata']) ?? undefined,
    parentId: (m.reply_to_id ?? m.parentId ?? m.replyToId) as string | undefined,
    isEdited: Boolean(m.is_edited ?? m.isEdited),
    isDeleted: Boolean(m.is_deleted ?? m.isDeleted),
    ...(editedAt && { editedAt }),
    createdAt: createdAt ?? updatedAt ?? new Date().toISOString(),
    updatedAt: updatedAt ?? createdAt ?? new Date().toISOString(),
    sender: normalizeSender(m.sender),
    reactions: (m.reactions as Message['reactions']) ?? undefined,
    status: (m.status as Message['status']) ?? undefined,
    ...(quotedMessageId && { quotedMessageId }),
    ...(quotedMessage && { quotedMessage }),
    ...(quotedMessageSnapshot && { quotedMessageSnapshot })
  } as Message
}

/** Backend returns lastMessage with snake_case; normalize to camelCase for frontend. */
function normalizeLastMessage(lastMessage: unknown): Message | undefined {
  if (lastMessage == null || typeof lastMessage !== 'object') return undefined
  return normalizeMessage(lastMessage)
}

/** Alias for list/search; same shape as normalizeMessage. */
function normalizeSearchMessage(raw: unknown): Message {
  return normalizeMessage(raw)
}

/** Apply lastMessage normalization to a conversation from the API. */
function normalizeConversationLastMessage<T extends { lastMessage?: unknown }>(conv: T): T {
  if (conv.lastMessage == null) return conv
  return { ...conv, lastMessage: normalizeLastMessage(conv.lastMessage) }
}

// In-flight request deduplication to prevent duplicate network calls (e.g. React StrictMode).
const inFlightConversationsRequests = new Map<string, Promise<NormalizedConversationsResponse>>()

// Short-lived response cache to avoid sequential duplicate loads (e.g. StrictMode remount).
const conversationsResponseCache = new Map<string, { ts: number; value: NormalizedConversationsResponse }>()
const CONVERSATIONS_CACHE_TTL_MS = 1000

function hashToken(token: string): number {
  // Non-cryptographic hash used only for in-memory request keys.
  // Never log tokens or this hash.
  let hash = 5381
  for (let i = 0; i < token.length; i++) {
    hash = (hash * 33) ^ (token.codePointAt(i) ?? 0)
  }
  return hash >>> 0
}

export class ChatApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor(baseURL: string, accessToken?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Add auth interceptor
    this.client.interceptors.request.use(config => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    if (accessToken) {
      this.setToken(accessToken)
    }
  }

  setToken(token: string) {
    this.token = token
  }

  // Auth endpoints
  async getCurrentUser() {
    const response = await this.client.get<User>('/auth/me')
    return response.data
  }

  // User endpoints
  async searchUsers(query: string, limit: number = 20) {
    const response = await this.client.get<User[]>('/users/search', {
      params: { q: query, limit }
    })
    return response.data
  }

  async getUserById(userId: string) {
    const response = await this.client.get<User>(`/users/${userId}`)
    return response.data
  }

  async getRecentlyActiveUsers(limit: number = 20) {
    const response = await this.client.get<User[]>('/users/recent', {
      params: { limit }
    })
    return response.data
  }

  // Conversation endpoints
  async getConversations(
    page: number = 1,
    limit: number = 20,
    filters?: { search?: string; filter?: 'all' | 'direct' | 'group' | 'meeting'; unreadOnly?: boolean }
  ) {
    const baseURL = this.client.defaults.baseURL ?? ''
    const tokenKey = this.token ? String(hashToken(this.token)) : 'no-token'
    const filterKey = filters ? JSON.stringify(filters) : ''
    const key = `${baseURL}|${tokenKey}|${page}|${limit}|${filterKey}`

    const cached = conversationsResponseCache.get(key)
    if (cached && Date.now() - cached.ts < CONVERSATIONS_CACHE_TTL_MS) {
      return cached.value
    }

    const existing = inFlightConversationsRequests.get(key)
    if (existing) {
      return existing
    }

    const params: Record<string, string | number | boolean | undefined> = { page, limit }
    if (filters?.search !== undefined && filters.search !== '') params.search = filters.search
    if (filters?.filter !== undefined && filters.filter !== 'all') params.filter = filters.filter
    if (filters?.unreadOnly === true) params.unreadOnly = true

    const requestPromise: Promise<NormalizedConversationsResponse> = this.client
      .get<
        | PaginatedResponse<Conversation>
        | { conversations: Conversation[]; total: number; page: number; limit: number; totalPages: number }
      >('/conversations', {
        params
        // Removed aggressive cache-busting for performance
        // WebSocket updates handle real-time changes, so HTTP caching is safe
      })
      .then(response => {
        // Backend returns { conversations: [...] } but we expect { data: [...] }
        // Normalize lastMessage (snake_case → camelCase) so sorting and UI work correctly.
        const rawData: Conversation[] =
          'conversations' in response.data ? response.data.conversations : response.data.data
        const normalized: NormalizedConversationsResponse =
          'conversations' in response.data
            ? {
                data: rawData.map(normalizeConversationLastMessage),
                total: response.data.total,
                page: response.data.page,
                limit: response.data.limit,
                totalPages: response.data.totalPages
              }
            : { ...response.data, data: rawData.map(normalizeConversationLastMessage) }

        conversationsResponseCache.set(key, { ts: Date.now(), value: normalized })
        if (conversationsResponseCache.size > 50) {
          // Best-effort bound to avoid unbounded growth.
          const firstKey = conversationsResponseCache.keys().next().value
          if (firstKey) {
            conversationsResponseCache.delete(firstKey)
          }
        }

        return normalized
      })
      .finally(() => {
        if (inFlightConversationsRequests.get(key) === requestPromise) {
          inFlightConversationsRequests.delete(key)
        }
      })

    inFlightConversationsRequests.set(key, requestPromise)
    return requestPromise
  }

  async getConversationById(conversationId: string) {
    const response = await this.client.get<Conversation>(`/conversations/${conversationId}`)
    return normalizeConversationLastMessage(response.data)
  }

  async createConversation(data: {
    type: ConversationType
    name?: string
    description?: string
    participantIds: string[]
    contextType?: string
    contextId?: string
  }) {
    const response = await this.client.post<Conversation>('/conversations', data)
    return response.data
  }

  async getOrCreateDirectConversation(otherUserId: string) {
    const payload = { userId: otherUserId }
    try {
      const response = await this.client.post<Conversation>('/conversations/direct', payload)
      return response.data
    } catch (error: any) {
      console.error('API Error creating direct conversation:', error.response?.data)
      throw error
    }
  }

  async getOrCreateDirectConversationByKeycloakId(keycloakId: string) {
    const payload = { userId: keycloakId }
    try {
      const response = await this.client.post<Conversation>('/conversations/direct', payload)
      return response.data
    } catch (error: any) {
      console.error('API Error creating direct conversation (keycloakId):', error.response?.data)
      throw error
    }
  }

  async getOrCreateContextConversation(data: {
    contextEntity: string
    contextEntityId: string
    name?: string
    users?: string[]
  }) {
    try {
      const response = await this.client.post<Conversation>('/conversations/context', data)
      return response.data
    } catch (error: any) {
      console.error('API Error creating context conversation:', error.response?.data)
      throw error
    }
  }

  async getOrCreateAiAgentConversation(data?: { contextEntity?: string; contextEntityId?: string; name?: string }) {
    try {
      const response = await this.client.post<Conversation>('/conversations/ai-agent', data || {})
      return response.data
    } catch (error: any) {
      console.error('API Error creating AI agent conversation:', error.response?.data)
      throw error
    }
  }

  async createGroupConversation(data: {
    name: string
    participantIds: string[]
    description?: string
    avatarUrl?: string
    contextEntity?: string
    contextEntityId?: string
  }) {
    try {
      const response = await this.client.post<Conversation>('/conversations/group', data)
      return response.data
    } catch (error: any) {
      console.error('API Error creating group conversation:', error.response?.data)
      throw error
    }
  }

  async addParticipant(conversationId: string, userId: string) {
    const response = await this.client.post(`/conversations/${conversationId}/participants`, {
      userId
    })
    return response.data
  }

  async removeParticipant(conversationId: string, userId: string) {
    await this.client.delete(`/conversations/${conversationId}/participants/${userId}`)
  }

  async updateParticipantRole(conversationId: string, userId: string, role: 'owner' | 'admin' | 'member') {
    const response = await this.client.patch(`/conversations/${conversationId}/participants/${userId}/role`, { role })
    return response.data
  }

  async deleteConversation(conversationId: string) {
    await this.client.delete(`/conversations/${conversationId}`)
  }

  async updateConversation(conversationId: string, data: { name?: string; description?: string }) {
    const response = await this.client.patch<Conversation>(`/conversations/${conversationId}`, data)
    return response.data
  }

  async updateConversationPreferences(
    conversationId: string,
    data: { isMuted?: boolean; isPinned?: boolean; pinnedOrder?: number | null }
  ): Promise<{ isMuted: boolean; isPinned: boolean; pinnedOrder: number | null }> {
    const response = await this.client.patch<{
      isMuted: boolean
      isPinned: boolean
      pinnedOrder: number | null
    }>(`/conversations/${conversationId}/me/preferences`, data)
    return response.data
  }

  // Message endpoints
  async getMessage(messageId: string): Promise<Message> {
    const response = await this.client.get<unknown>(`/messages/${messageId}`)
    return normalizeMessage(response.data)
  }

  async getMessages(conversationId: string, page: number = 1, limit: number = 100, before?: string) {
    const params: Record<string, string | number> = { page, limit }
    if (before) params.before = before
    const response = await this.client.get<
      | PaginatedResponse<Message>
      | { messages: Message[]; total: number; page: number; limit: number; totalPages: number }
    >(`/messages/conversation/${conversationId}`, {
      params
    })
    // Backend returns { messages: [...] } but we expect { data: [...] }
    if ('messages' in response.data) {
      const messages = (response.data as { messages: unknown[] }).messages ?? []
      return {
        data: messages.map(normalizeMessage),
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      }
    }
    return response.data
  }

  async searchMessages(
    conversationId: string,
    query: string,
    options?: { page?: number; limit?: number }
  ): Promise<{ data: Message[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const response = await this.client.get<{
      messages: unknown[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>('/messages/search', {
      params: { query: query.trim(), conversationId, page, limit }
    })
    const data = response.data
    const rawMessages = data.messages ?? []
    return {
      data: rawMessages.map(normalizeSearchMessage),
      total: data.total ?? 0,
      page: data.page ?? page,
      limit: data.limit ?? limit,
      totalPages: data.totalPages ?? Math.ceil((data.total ?? 0) / limit)
    }
  }

  async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    parentId?: string,
    metadata?: Record<string, any>,
    quotedMessageId?: string
  ): Promise<Message> {
    const payload = {
      conversationId,
      content,
      senderId,
      ...(parentId && { parentId }),
      ...(metadata && { metadata }),
      ...(quotedMessageId && { quotedMessageId })
    }

    const response = await this.client.post<unknown>('/messages', payload)
    return normalizeMessage(response.data)
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    const response = await this.client.patch<unknown>(`/messages/${messageId}`, { content })
    return normalizeMessage(response.data)
  }

  async deleteMessage(messageId: string) {
    await this.client.delete(`/messages/${messageId}`)
  }

  async addReaction(messageId: string, emoji: string): Promise<Message> {
    const response = await this.client.post<unknown>(`/messages/${messageId}/reactions`, { emoji })
    return normalizeMessage(response.data)
  }

  async removeReaction(messageId: string, emoji: string): Promise<Message> {
    const encodedEmoji = encodeURIComponent(emoji)
    const response = await this.client.delete<unknown>(`/messages/${messageId}/reactions/${encodedEmoji}`)
    return normalizeMessage(response.data)
  }

  async markAsRead(conversationId: string) {
    await this.client.post(`/messages/conversation/${conversationId}/mark-read`)
  }

  async markAsUnread(conversationId: string) {
    await this.client.post(`/messages/conversation/${conversationId}/mark-unread`)
  }

  // WebRTC endpoints
  /**
   * Get ICE servers configuration from the backend
   * Returns TURN servers with temporary credentials (if configured) or fallback STUN servers
   */
  async getIceServers(): Promise<IceServersResponse> {
    const response = await this.client.get<IceServersResponse>('/webrtc/ice-servers')
    return response.data
  }

  /**
   * Get active WebRTC sessions for current user
   */
  async getActiveSessions() {
    const response = await this.client.get('/webrtc/sessions/active')
    return response.data
  }

  /**
   * Get WebRTC sessions history (legacy; for call history UI use getCallHistory with status/callType).
   */
  async getWebrtcSessionsHistory(page: number = 1, limit: number = 20) {
    const response = await this.client.get('/webrtc/sessions/history', {
      params: { page, limit }
    })
    return response.data
  }

  /**
   * Get call statistics for current user
   */
  async getCallStats() {
    const response = await this.client.get('/webrtc/sessions/stats')
    return response.data
  }

  /**
   * Get call sessions the user participated in (RTK call history)
   */
  async getCallSessionsUserHistory(userId: string, limit: number = 50) {
    const response = await this.client.get<unknown[] | { data?: unknown[] }>(
      `/call-sessions/users/${encodeURIComponent(userId)}/history`,
      { params: { limit } }
    )
    const data = response.data
    if (Array.isArray(data)) return data
    if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: unknown[] }).data)) {
      return (data as { data: unknown[] }).data
    }
    return []
  }

  /**
   * Get invite outcomes for current user (missed / declined / not_answered)
   */
  async getCallInviteOutcomesMine(params?: { outcome?: string; since?: string; limit?: number }) {
    const response = await this.client.get<unknown[]>('/call-invite-outcomes/mine', { params: params ?? { limit: 50 } })
    return Array.isArray(response.data) ? response.data : []
  }

  /**
   * Get unified call history (sessions + outcomes) with status and call-type filtering (BE).
   */
  async getCallHistory(params: {
    status: import('../components/CallHistory/CallHistoryTypes').CallHistoryFilter
    callType: import('../components/CallHistory/CallHistoryTypes').CallHistoryTypeFilter
    limit?: number
    offset?: number
  }): Promise<import('../components/CallHistory/CallHistoryTypes').CallHistoryEntry[]> {
    const { status, callType, limit = 50, offset = 0 } = params
    const response = await this.client.get<Array<{ type: 'joined' | 'outcome'; [key: string]: unknown }>>(
      '/call-history',
      { params: { status, callType, limit, offset } }
    )
    const data = Array.isArray(response.data) ? response.data : []
    return data.map(entry => {
      const { type, ...rest } = entry
      return { type, item: rest }
    }) as unknown as import('../components/CallHistory/CallHistoryTypes').CallHistoryEntry[]
  }

  /**
   * Get count of missed calls not yet seen by the user (for badge).
   */
  async getMissedCallsCount(): Promise<number> {
    const response = await this.client.get<{ count: number }>('/call-history/missed-count')
    return response.data?.count ?? 0
  }

  /**
   * Mark call history as seen; resets unseen missed count (call when user opens Call History).
   */
  async markCallHistorySeen(): Promise<void> {
    await this.client.post<{ ok: boolean }>('/call-history/mark-seen')
  }

  // File upload endpoints
  async uploadFiles(conversationId: string, files: File[]): Promise<UploadedAttachment[]> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await this.client.post<UploadedAttachment[]>(`/files/upload/${conversationId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }

  // Every Experts Management
  async addExpert(conversationId: string, expertId: string) {
    const response = await this.client.post<Conversation>(`/conversations/${conversationId}/experts`, {
      expertId
    })
    return response.data
  }

  async removeExpert(conversationId: string, expertId: string) {
    const response = await this.client.delete<Conversation>(`/conversations/${conversationId}/experts/${expertId}`)
    return response.data
  }

  async getActiveExperts(conversationId: string) {
    const response = await this.client.get<string[]>(`/conversations/${conversationId}/experts`)
    return response.data
  }

  // ==================== ANALYTICS ENDPOINTS ====================

  /**
   * Get user overview statistics (messages sent/received, conversations, call minutes)
   */
  async getUserOverview(): Promise<UserOverviewResponse> {
    const response = await this.client.get<UserOverviewResponse>('/analytics/user/overview')
    return response.data
  }

  /**
   * Get user contacts - most contacted and reach out suggestions
   */
  async getUserContacts(): Promise<UserContactsResponse> {
    const response = await this.client.get<UserContactsResponse>('/analytics/user/contacts')
    return response.data
  }

  /**
   * Get user activity - daily message counts and patterns
   */
  async getUserActivity(): Promise<UserActivityResponse> {
    const response = await this.client.get<UserActivityResponse>('/analytics/user/activity')
    return response.data
  }

  /**
   * Get user reactions statistics
   */
  async getUserReactions(): Promise<UserReactionsResponse> {
    const response = await this.client.get<UserReactionsResponse>('/analytics/user/reactions')
    return response.data
  }

  /**
   * Get global platform statistics
   */
  async getGlobalStats(): Promise<GlobalStatsResponse> {
    const response = await this.client.get<GlobalStatsResponse>('/analytics/global')
    return response.data
  }

  // ==================== TRANSCRIPT / MEETING MINUTES ENDPOINTS ====================

  /**
   * Get parsed transcript data with participant info (for debugging/viewing)
   */
  async getCallSessionTranscriptData(sessionId: string): Promise<TranscriptDataResponse> {
    const response = await this.client.get<TranscriptDataResponse>(`/call-sessions/${sessionId}/transcript-data`)
    return response.data
  }

  /**
   * Create meeting minutes from call transcript
   * Backend fetches CSV, parses, calls document-service, stores noteId, and sends system message
   */
  async createMeetingMinutes(sessionId: string): Promise<CreateMeetingMinutesResponse> {
    const response = await this.client.post<CreateMeetingMinutesResponse>(
      `/call-sessions/${sessionId}/create-meeting-minutes`
    )
    return response.data
  }
}

export interface UploadedAttachment {
  id: string
  name: string
  size: number
  mimeType: string
  url: string
}

export interface IceServersResponse {
  iceServers: Array<{
    urls: string[]
    username?: string
    credential?: string
  }>
}

// ==================== ANALYTICS TYPES ====================

export interface UserOverviewResponse {
  totalMessagesSent: number
  totalMessagesReceived: number
  totalConversations: number
  activeConversations: number
  totalCallMinutes: number
  averageMessagesPerDay: number
  memberSince: string
}

export interface ContactInfo {
  userId: string
  displayName: string
  avatarUrl?: string
  messageCount: number
  lastContact: string
}

export interface ReachOutSuggestion {
  userId: string
  displayName: string
  avatarUrl?: string
  daysSinceContact: number
  reason: string
}

export interface UserContactsResponse {
  mostContacted: ContactInfo[]
  reachOutSuggestions: ReachOutSuggestion[]
}

export interface DailyMessageCount {
  date: string
  sent: number
  received: number
}

export interface UserActivityResponse {
  dailyMessages: DailyMessageCount[]
  peakHour: number
  mostActiveDay: string
}

export interface EmojiCount {
  emoji: string
  count: number
}

export interface UserReactionsResponse {
  mostUsed: EmojiCount[]
  mostReceived: EmojiCount[]
}

export interface GlobalStatsResponse {
  totalMessages: number
  totalUsers: number
  totalConversations: number
  totalCallMinutes: number
  messagesLast24h: number
  activeUsersNow: number
  topReactions: EmojiCount[]
}

// ==================== TRANSCRIPT / MEETING MINUTES TYPES ====================

export interface TranscriptParticipant {
  participantId: string
  userId: string
  displayName: string
  email: string
}

export interface TranscriptEntry {
  timestamp: number
  participantId: string
  userId: string
  speakerName: string
  text: string
}

export interface TranscriptDataResponse {
  sessionId: string
  sessionName: string
  startedAt: string
  durationSeconds: number
  participants: TranscriptParticipant[]
  transcriptEntries: TranscriptEntry[]
}

export interface CreateMeetingMinutesResponse {
  sessionId: string
  noteId: string
  transcriptId: string
  transcriptionStatus: 'COMPLETED' | 'PROCESSING' | 'FAILED'
  message: string
}
