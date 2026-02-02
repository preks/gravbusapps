import axios, { AxiosInstance } from 'axios'
import type { User, Conversation, Message, PaginatedResponse, ConversationType } from '../types'

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
  async getConversations(page: number = 1, limit: number = 20) {
    const response = await this.client.get<
      | PaginatedResponse<Conversation>
      | { conversations: Conversation[]; total: number; page: number; limit: number; totalPages: number }
    >('/conversations', {
      params: { page, limit }
    })
    // Backend returns { conversations: [...] } but we expect { data: [...] }
    if ('conversations' in response.data) {
      return {
        data: response.data.conversations,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      }
    }
    return response.data
  }

  async getConversationById(conversationId: string) {
    const response = await this.client.get<Conversation>(`/conversations/${conversationId}`)
    return response.data
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

  // Message endpoints
  async getMessages(conversationId: string, page: number = 1, limit: number = 100) {
    const response = await this.client.get<
      | PaginatedResponse<Message>
      | { messages: Message[]; total: number; page: number; limit: number; totalPages: number }
    >(`/messages/conversation/${conversationId}`, {
      params: { page, limit }
    })
    // Backend returns { messages: [...] } but we expect { data: [...] }
    if ('messages' in response.data) {
      return {
        data: response.data.messages,
        total: response.data.total,
        page: response.data.page,
        limit: response.data.limit,
        totalPages: response.data.totalPages
      }
    }
    return response.data
  }

  async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    parentId?: string,
    metadata?: Record<string, any>
  ) {
    const payload = {
      conversationId,
      content,
      senderId,
      ...(parentId && { parentId }),
      ...(metadata && { metadata })
    }

    const response = await this.client.post<Message>('/messages', payload)
    return response.data
  }

  async updateMessage(messageId: string, content: string) {
    const response = await this.client.patch<Message>(`/messages/${messageId}`, { content })
    return response.data
  }

  async deleteMessage(messageId: string) {
    await this.client.delete(`/messages/${messageId}`)
  }

  async markAsRead(conversationId: string) {
    await this.client.post(`/messages/conversation/${conversationId}/mark-read`)
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
   * Get call history for current user
   */
  async getCallHistory(page: number = 1, limit: number = 20) {
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
