/**
 * AI Builder Service Client
 *
 * Client for interacting with the AI Builder service.
 * Handles sessions, chat history, admin configuration, and publishing.
 */

import { AI_BUILDER_API_URL } from '@/common/utils/serviceResolver'

// ============================================================================
// Types
// ============================================================================

export interface SessionUser {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  email?: string
  pictureThumbnail?: string
  consentToStorePii: boolean
}

export interface SessionMetadata {
  sessionId: string
  repoId: string | null
  namespace?: string | null
  targetPath: string | null
  resourceUrl: string | null
  createdAt: string
  lastModified: string
  fileCount: number
  createdBy: SessionUser
  description?: string
}

export interface SaveSessionRequest {
  sessionId?: string
  repoId?: string
  targetPath: string | null
  resourceUrl: string | null
  fileCount: number
  description?: string
  createdBy: SessionUser
}

export interface SaveSessionResponse {
  success: boolean
  action: 'created' | 'updated'
  sessionId: string
  error?: string
  message?: string
}

export interface ListSessionsResponse {
  success: boolean
  sessions: SessionMetadata[]
  error?: string
  message?: string
}

export interface GetSessionResponse {
  success: boolean
  session?: SessionMetadata
  error?: string
  message?: string
}

export interface DeleteSessionResponse {
  success: boolean
  sessionId: string
  error?: string
  message?: string
}

export interface ToolCall {
  tool: string
  args?: string
  result?: string
  status: 'running' | 'complete'
  id: string
  order?: number
  displayTitle?: string
  displayDetail?: string
  displayKind?: 'info' | 'success' | 'warning' | 'error'
  displayStep?: 'call' | 'progress' | 'result'
  progressLines?: string[]
}

export interface ChatMessageBlock {
  type: 'thinking' | 'response'
  content: string
  collapsed?: boolean
  order?: number
}

export interface DecisionPromptOption {
  id: string
  title: string
  description: string
  riskLevel?: 'low' | 'medium' | 'high'
  destructive?: boolean
  requiresExplicitConsent?: boolean
}

export interface DecisionPromptTool {
  name: string
  description: string
}

export interface DecisionPromptState {
  decisionId?: string
  riskSummary?: string
  options: DecisionPromptOption[]
  availableTools?: DecisionPromptTool[]
}

/**
 * Chat message contract aligned with backend ChatHistoryMessageDto.
 * Required persisted metadata for author identity and round-trip:
 * - createdBy: user id for user messages; 'orchestrator-system' for system messages
 * - messageId, createdAt/serverCreatedAt for restore/version flows
 * - editHistory for collaboration attribution
 * Adapters MUST preserve these fields when persisting; do not strip on save.
 */
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  thinkingLog?: string
  thinkingCollapsed?: boolean
  blocks?: ChatMessageBlock[]
  decisionPrompt?: DecisionPromptState
  /** Author user id (user messages) or 'orchestrator-system' (system messages). Required for identity round-trip. */
  createdBy?: string
  /** Edit history for collaboration attribution. Preserve on save. */
  editHistory?: Array<{
    userId: string
    editedAt: string
  }>
  messageId?: string
  createdAt?: string
  serverCreatedAt?: string
}

export interface AutoInitConfig {
  id: string
  url: string
  owner: string
  name: string
  branch: string
  enabled: boolean
  autoInitOnStartup: boolean
  supportsPublish: boolean
  publishBasePath: string | null
  publishAssetsPath: string | null
  publishAzureEnabled: boolean
  blockedBranches: string[]
  repoId: string | null
  indexStatus: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAutoInitConfigRequest {
  url: string
  branch: string
  autoInitOnStartup?: boolean
  blockedBranches?: string[]
  enabled?: boolean
  supportsPublish?: boolean
  publishBasePath?: string
  publishAssetsPath?: string
  publishAzureEnabled?: boolean
}

export interface UpdateAutoInitConfigRequest {
  branch?: string
  autoInitOnStartup?: boolean
  blockedBranches?: string[]
  enabled?: boolean
  supportsPublish?: boolean
  publishBasePath?: string
  publishAssetsPath?: string
  publishAzureEnabled?: boolean
}

export interface IndexProgress {
  totalFiles: number
  processedFiles: number
  totalChunks: number
  processedChunks: number
  currentFile?: string
  status: 'scanning' | 'parsing' | 'embedding' | 'storing' | 'completed' | 'failed'
  error?: string
}

export interface IndexingStatus {
  configId: string
  url: string
  owner: string
  name: string
  repoId: string | null
  indexStatus: string | null
  progress: IndexProgress | null
}

export interface PublishRequest {
  repoId: string
  sessionId: string
  versionType?: 'major' | 'minor'
  versionNote?: string
}

export interface PublishResponse {
  success: boolean
  targetPath: string
  resourceUrl?: string
  azureUrl?: string
  message: string
  error?: string
}

export interface LatestPublishedResourceVersion {
  repoId: string
  targetPath: string | null
  sessionId: string | null
  versionMajor: number
  versionMinor: number
  resourceUrl: string
  azureUrl: string | null
  publishedAt: string | null
  firstPublishedAt: string | null
}

export type BuilderMetricsTimeframe = 'last24h' | 'last7d' | 'last30d' | 'mtd' | 'all'

export interface SessionUsageMetric {
  sessionId: string
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCalls: number
  timeframeInputTokens: number
  timeframeOutputTokens: number
  timeframeTokens: number
  timeframeCalls: number
  lastUsedAt: string | null
  timeframeCostUsd: number
  totalCostUsd: number
}

export interface SessionUsageMetricsResponse {
  generatedAt: string
  timeframe: BuilderMetricsTimeframe
  sessions: SessionUsageMetric[]
}

export interface AiModelUsageMetric {
  model: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCalls: number
  timeframeInputTokens: number
  timeframeOutputTokens: number
  timeframeCalls: number
  priceInputUsdPerMillion: number
  priceOutputUsdPerMillion: number
  timeframeCostUsd: number
  totalCostUsd: number
}

export interface AiTotalsMetric {
  totalInputTokens: number
  totalOutputTokens: number
  totalCalls: number
  timeframeInputTokens: number
  timeframeOutputTokens: number
  timeframeCalls: number
  timeframeCostUsd: number
  totalCostUsd: number
}

export interface LlmPricingConfigEntry {
  id: string
  provider: string
  model: string
  inputUsdPerMillion: number
  outputUsdPerMillion: number
  source: string
  updatedAt: string | null
}

export interface LlmPricingConfigResponse {
  generatedAt: string
  note: string
  entries: LlmPricingConfigEntry[]
}

export interface UpdateLlmPricingConfigRequest {
  entries: Array<{
    id?: string
    provider: string
    model?: string
    inputUsdPerMillion: number
    outputUsdPerMillion: number
  }>
}

export interface MetricsTimeseriesPoint {
  bucketStart: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  calls: number
  totalCostUsd: number
}

export interface MetricsTimeseriesResponse {
  generatedAt: string
  timeframe: BuilderMetricsTimeframe
  points: MetricsTimeseriesPoint[]
}

export interface BuilderServiceMetricsResponse {
  generatedAt: string
  timeframe: BuilderMetricsTimeframe
  sessions: {
    total: number
    withinTimeframe: number
  }
  screens: {
    versionsCreated: number
    versionsPublished: number
    createdWithinTimeframe: number
    publishedWithinTimeframe: number
  }
  builds: {
    total: number
    completed: number
    failed: number
    successRate: number
    avgDurationSeconds: number
    withinTimeframe: number
  }
  ai: {
    byModel: AiModelUsageMetric[]
    totals: AiTotalsMetric
  }
  orchestration: {
    total: number
    completed: number
    failed: number
    running: number
    withinTimeframe: number
  }
}

// ============================================================================
// Client
// ============================================================================

export class BuilderClient {
  private readonly baseUrl: string
  private accessToken?: string

  constructor(accessToken?: string) {
    this.baseUrl = AI_BUILDER_API_URL
    this.accessToken = accessToken
  }

  /**
   * Get the base URL (useful for external dependencies)
   */
  getBaseUrl(): string {
    return this.baseUrl
  }

  /**
   * Set or update the access token
   */
  setAccessToken(token: string): void {
    this.accessToken = token
  }

  /**
   * Get headers for requests
   */
  private getHeaders(includeAuth = false): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    }

    if (includeAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    return headers
  }

  private truncateText(value: unknown, maxChars: number): string | undefined {
    if (typeof value !== 'string') return undefined
    const normalized = value.trim()
    if (!normalized) return undefined
    if (normalized.length <= maxChars) return normalized
    return `${normalized.slice(0, maxChars)}\n\n... (truncated)`
  }

  private compactChatHistoryForSave(
    messages: ChatMessage[],
    options?: {
      maxMessages?: number
      maxTotalChars?: number
      maxContentChars?: number
      maxThinkingChars?: number
      maxToolCallsPerMessage?: number
      maxToolArgsChars?: number
      maxToolResultChars?: number
    }
  ): ChatMessage[] {
    const maxMessages = options?.maxMessages ?? 100
    const maxTotalChars = options?.maxTotalChars ?? 120_000
    const maxContentChars = options?.maxContentChars ?? 6_000
    const maxThinkingChars = options?.maxThinkingChars ?? 2_500
    const maxToolCallsPerMessage = options?.maxToolCallsPerMessage ?? 8
    const maxToolArgsChars = options?.maxToolArgsChars ?? 1_200
    const maxToolResultChars = options?.maxToolResultChars ?? 2_000

    const source = Array.isArray(messages) ? messages.slice(-maxMessages) : []
    const compacted: ChatMessage[] = source.map(message => {
      const compactToolCalls =
        Array.isArray(message.toolCalls) && message.toolCalls.length > 0
          ? message.toolCalls.slice(-maxToolCallsPerMessage).map(
              (call): ToolCall => ({
                tool: String(call.tool || 'unknown'),
                status: call.status === 'running' ? 'running' : 'complete',
                id: String(call.id || ''),
                order: typeof call.order === 'number' && Number.isFinite(call.order) ? call.order : undefined,
                args: this.truncateText(call.args, maxToolArgsChars),
                result: this.truncateText(call.result, maxToolResultChars),
                displayTitle: this.truncateText(call.displayTitle, 240),
                displayDetail: this.truncateText(call.displayDetail, 700),
                displayKind:
                  call.displayKind === 'info' ||
                  call.displayKind === 'success' ||
                  call.displayKind === 'warning' ||
                  call.displayKind === 'error'
                    ? call.displayKind
                    : undefined,
                displayStep:
                  call.displayStep === 'call' || call.displayStep === 'progress' || call.displayStep === 'result'
                    ? call.displayStep
                    : undefined,
                progressLines: Array.isArray(call.progressLines)
                  ? call.progressLines
                      .filter((line: unknown): line is string => typeof line === 'string' && line.trim().length > 0)
                      .slice(-30)
                      .map(line => this.truncateText(line, 240) || '')
                      .filter(Boolean)
                  : undefined
              })
            )
          : undefined
      const compactBlocks =
        Array.isArray(message.blocks) && message.blocks.length > 0
          ? message.blocks
              .slice(-50)
              .map((block): ChatMessageBlock | undefined => {
                const type = block?.type === 'thinking' ? 'thinking' : block?.type === 'response' ? 'response' : null
                if (!type) return undefined
                const maxBlockChars = type === 'thinking' ? maxThinkingChars : maxContentChars
                const content = this.truncateText(block.content, maxBlockChars)
                if (!content) return undefined
                return {
                  type,
                  content,
                  collapsed: type === 'thinking' ? block.collapsed !== false : undefined,
                  order: typeof block.order === 'number' && Number.isFinite(block.order) ? block.order : undefined
                }
              })
              .filter((block): block is ChatMessageBlock => !!block)
          : undefined

      return {
        role: message.role,
        content: this.truncateText(message.content, maxContentChars) ?? '',
        toolCalls: compactToolCalls,
        thinkingLog: this.truncateText(message.thinkingLog, maxThinkingChars),
        thinkingCollapsed: typeof message.thinkingCollapsed === 'boolean' ? message.thinkingCollapsed : undefined,
        blocks: compactBlocks,
        createdBy: typeof message.createdBy === 'string' ? message.createdBy : undefined,
        editHistory: Array.isArray(message.editHistory)
          ? message.editHistory
              .map((entry: { userId?: string; editedAt?: string }) =>
                entry?.userId && entry?.editedAt ? { userId: entry.userId, editedAt: entry.editedAt } : null
              )
              .filter((e): e is { userId: string; editedAt: string } => e !== null)
          : undefined,
        messageId: message.messageId,
        createdAt: message.createdAt,
        serverCreatedAt: message.serverCreatedAt
      }
    })

    let totalChars = 0
    const bounded: ChatMessage[] = []
    for (let i = compacted.length - 1; i >= 0; i -= 1) {
      const message = compacted[i]
      const toolChars =
        message.toolCalls?.reduce((acc, call) => acc + (call.args?.length ?? 0) + (call.result?.length ?? 0), 0) ?? 0
      const blockChars = message.blocks?.reduce((acc, block) => acc + (block.content?.length ?? 0), 0) ?? 0
      const messageChars = (message.content?.length ?? 0) + (message.thinkingLog?.length ?? 0) + blockChars + toolChars
      if (bounded.length > 0 && totalChars + messageChars > maxTotalChars) break
      bounded.unshift(message)
      totalChars += messageChars
    }

    return bounded
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Save or update a session
   */
  async saveSession(request: SaveSessionRequest): Promise<SaveSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(request)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to save session')
    }

    return data
  }

  /**
   * List all sessions (or filter by userId if provided)
   */
  async listSessions(userId: string = '', limit: number = 50): Promise<ListSessionsResponse> {
    const url = userId
      ? `${this.baseUrl}/sessions?userId=${userId}&limit=${limit}`
      : `${this.baseUrl}/sessions?limit=${limit}`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to list sessions')
    }

    return data
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<GetSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to get session')
    }

    return data
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
    const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(true)
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to delete session')
    }

    return data
  }

  // ============================================================================
  // Chat History
  // ============================================================================

  /**
   * Load chat history for a session
   */
  async loadChatHistory(repoId: string, sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/history?repoId=${repoId}&sessionId=${sessionId}`, {
        headers: this.getHeaders(true)
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      return data.messages || []
    } catch {
      return []
    }
  }

  /**
   * Save chat history for a session
   */
  async saveChatHistory(repoId: string, sessionId: string, messages: ChatMessage[]): Promise<boolean> {
    try {
      const compactMessages = this.compactChatHistoryForSave(messages)
      let response = await fetch(`${this.baseUrl}/chat/history`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          repoId,
          sessionId,
          messages: compactMessages
        })
      })

      // Retry once with an even smaller payload if upstream rejects body size.
      if (response.status === 413) {
        const aggressiveMessages = this.compactChatHistoryForSave(messages, {
          maxMessages: 40,
          maxTotalChars: 35_000,
          maxContentChars: 2_000,
          maxThinkingChars: 800,
          maxToolCallsPerMessage: 4,
          maxToolArgsChars: 400,
          maxToolResultChars: 700
        })
        response = await fetch(`${this.baseUrl}/chat/history`, {
          method: 'POST',
          headers: this.getHeaders(true),
          body: JSON.stringify({
            repoId,
            sessionId,
            messages: aggressiveMessages
          })
        })
      }

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Append or update one chat message for a session
   */
  async appendChatMessage(repoId: string, sessionId: string, message: ChatMessage): Promise<boolean> {
    try {
      const compact = this.compactChatHistoryForSave([message], {
        maxMessages: 1,
        maxTotalChars: 25_000,
        maxContentChars: 8_000,
        maxThinkingChars: 3_000,
        maxToolCallsPerMessage: 12,
        maxToolArgsChars: 2_000,
        maxToolResultChars: 4_000
      })
      const payloadMessage = compact[0] ?? message
      const response = await fetch(`${this.baseUrl}/chat/history/append`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          repoId,
          sessionId,
          message: payloadMessage
        })
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Trim history up to and including a message ID
   */
  async trimChatHistory(repoId: string, sessionId: string, messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/history/trim`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          repoId,
          sessionId,
          messageId
        })
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Clear chat history for a session
   */
  async clearChatHistory(repoId: string, sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/history?repoId=${repoId}&sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: this.getHeaders(true)
      })

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Restore session files and chat to a specific message
   */
  async restoreToMessage(params: {
    repoId: string
    sessionId: string
    targetPath: string
    messageId: string
    restoreChat?: boolean
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/versions/restore/message`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        repoId: params.repoId,
        sessionId: params.sessionId,
        targetPath: params.targetPath,
        messageId: params.messageId,
        applyToCache: true,
        restoreChat: params.restoreChat !== false
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to restore message')
    }
  }

  /**
   * Restore session files and chat to initial state
   */
  async restoreToInitial(params: {
    repoId: string
    sessionId: string
    targetPath: string
    restoreChat?: boolean
  }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/versions/restore/initial`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        repoId: params.repoId,
        sessionId: params.sessionId,
        targetPath: params.targetPath,
        applyToCache: true,
        restoreChat: params.restoreChat !== false
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to restore initial state')
    }
  }

  // ============================================================================
  // Admin - Auto-Init Configurations
  // ============================================================================

  /**
   * Get all auto-init configurations
   */
  async getAutoInitConfigs(): Promise<AutoInitConfig[]> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to fetch auto-init configurations')
    }

    return response.json()
  }

  /**
   * Get a single auto-init configuration by ID
   */
  async getAutoInitConfig(id: string): Promise<AutoInitConfig> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs/${id}`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to fetch auto-init configuration')
    }

    return response.json()
  }

  /**
   * Create a new auto-init configuration
   */
  async createAutoInitConfig(request: CreateAutoInitConfigRequest): Promise<AutoInitConfig> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to create auto-init configuration')
    }

    return response.json()
  }

  /**
   * Update an auto-init configuration
   */
  async updateAutoInitConfig(id: string, request: UpdateAutoInitConfigRequest): Promise<AutoInitConfig> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to update auto-init configuration')
    }

    return response.json()
  }

  /**
   * Delete an auto-init configuration
   */
  async deleteAutoInitConfig(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to delete auto-init configuration')
    }
  }

  /**
   * Trigger a sync for a configured repository
   */
  async syncAutoInitConfig(
    id: string,
    forceReindex = false
  ): Promise<{ success: boolean; message: string; hasChanges?: boolean }> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs/${id}/sync`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({ forceReindex })
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to sync repository')
    }

    return response.json()
  }

  /**
   * Get indexing status for all configured repositories
   */
  async getAllIndexingStatus(): Promise<IndexingStatus[]> {
    const response = await fetch(`${this.baseUrl}/admin/indexing-status`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to get indexing status')
    }

    return response.json()
  }

  /**
   * Get indexing status for a specific configured repository
   */
  async getIndexingStatus(configId: string): Promise<{
    repoId: string | null
    indexStatus: string | null
    progress: IndexProgress | null
  }> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs/${configId}/status`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.message || 'Failed to get indexing status')
    }

    return response.json()
  }

  // ============================================================================
  // Publishing
  // ============================================================================

  /**
   * Publish generated content to the platform
   *
   * This function calls the publish API which:
   * 1. Gets targetPath and resourceUrl from the session
   * 2. Fetches file changes from the session
   * 3. Applies changes to the repository
   * 4. Builds the content with npm run build
   * 5. Optionally uploads to Azure blob storage (if enabled for the repo)
   * 6. Optionally registers the content in the platform (if resourceUrl in session)
   */
  async publishScreen(request: PublishRequest): Promise<PublishResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/publish`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        let errorDetails = 'Failed to publish'
        try {
          const errorData = await response.json()
          errorDetails = errorData.error || errorData.message || errorData.details || errorDetails

          if (errorData.buildError) {
            errorDetails = `Build Error:\n${errorData.buildError}`
          }

          if (errorData.stderr) {
            errorDetails = `${errorDetails}\n\nError Output:\n${errorData.stderr}`
          }
        } catch {
          try {
            errorDetails = await response.text()
          } catch {
            errorDetails = `HTTP ${response.status}: ${response.statusText}`
          }
        }

        throw new Error(errorDetails)
      }

      const data = await response.json()
      return {
        success: true,
        targetPath: data.targetPath,
        resourceUrl: data.resourceUrl,
        azureUrl: data.azureUrl,
        message: data.message || 'Published successfully'
      }
    } catch (error) {
      console.error('Publish screen failed', error)
      throw error
    }
  }

  /**
   * Publish generated content to the platform with SSE progress.
   */
  async publishScreenStream(request: PublishRequest): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/publish/stream`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      let errorDetails = 'Failed to publish'
      try {
        const errorData = await response.json()
        errorDetails = errorData.error || errorData.message || errorData.details || errorDetails
      } catch {
        try {
          errorDetails = await response.text()
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`
        }
      }
      throw new Error(errorDetails)
    }

    if (!response.body) {
      throw new Error('Publish stream not available')
    }

    return response.body
  }

  async listLatestPublishedResources(params?: {
    prefix?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ data: LatestPublishedResourceVersion[]; totalCount: number }> {
    const query = new URLSearchParams()
    if (params?.prefix) query.set('prefix', params.prefix)
    if (params?.search) query.set('search', params.search)
    if (typeof params?.limit === 'number') query.set('limit', String(params.limit))
    if (typeof params?.offset === 'number') query.set('offset', String(params.offset))

    const url = query.toString()
      ? `${this.baseUrl}/versions/published/latest?${query.toString()}`
      : `${this.baseUrl}/versions/published/latest`

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.error || payload?.message || 'Failed to load latest published resources')
    }

    return {
      data: Array.isArray(payload?.data) ? payload.data : [],
      totalCount: Number(payload?.totalCount ?? payload?.paging?.totalRecords ?? 0)
    }
  }

  async getSessionUsageMetrics(params?: {
    timeframe?: BuilderMetricsTimeframe
    sessionIds?: string[]
    limit?: number
  }): Promise<SessionUsageMetricsResponse> {
    const query = new URLSearchParams()
    if (params?.timeframe) query.set('timeframe', params.timeframe)
    if (Array.isArray(params?.sessionIds) && params.sessionIds.length > 0) {
      query.set('sessionIds', params.sessionIds.join(','))
    }
    if (typeof params?.limit === 'number') query.set('limit', String(params.limit))

    const url = query.toString()
      ? `${this.baseUrl}/metrics/sessions?${query.toString()}`
      : `${this.baseUrl}/metrics/sessions`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || 'Failed to load session usage metrics')
    }

    return {
      generatedAt: typeof payload?.generatedAt === 'string' ? payload.generatedAt : new Date().toISOString(),
      timeframe: (payload?.timeframe || params?.timeframe || 'last7d') as BuilderMetricsTimeframe,
      sessions: Array.isArray(payload?.sessions) ? payload.sessions : []
    }
  }

  async getServiceMetrics(timeframe: BuilderMetricsTimeframe = 'last7d'): Promise<BuilderServiceMetricsResponse> {
    const response = await fetch(`${this.baseUrl}/metrics?timeframe=${encodeURIComponent(timeframe)}`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || 'Failed to load AI Builder metrics')
    }

    return payload as BuilderServiceMetricsResponse
  }

  async getMetricsTimeseries(timeframe: BuilderMetricsTimeframe = 'last7d'): Promise<MetricsTimeseriesResponse> {
    const response = await fetch(`${this.baseUrl}/metrics/timeseries?timeframe=${encodeURIComponent(timeframe)}`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || 'Failed to load AI Builder timeseries metrics')
    }
    return payload as MetricsTimeseriesResponse
  }

  async getLlmPricingConfig(): Promise<LlmPricingConfigResponse> {
    const response = await fetch(`${this.baseUrl}/metrics/pricing`, {
      method: 'GET',
      headers: this.getHeaders(true)
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || 'Failed to load LLM pricing configuration')
    }
    return payload as LlmPricingConfigResponse
  }

  async updateLlmPricingConfig(request: UpdateLlmPricingConfigRequest): Promise<LlmPricingConfigResponse> {
    const response = await fetch(`${this.baseUrl}/metrics/pricing`, {
      method: 'PUT',
      headers: this.getHeaders(true),
      body: JSON.stringify(request)
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || payload?.message || 'Failed to update LLM pricing configuration')
    }
    return payload as LlmPricingConfigResponse
  }

  /**
   * Build preview bundle with SSE progress.
   */
  async buildPreviewStream(params: { sessionId: string; bundle?: boolean }): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/previews/build/stream`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      let errorDetails = 'Failed to build preview'
      try {
        const errorData = await response.json()
        errorDetails = errorData.error || errorData.message || errorData.details || errorDetails
      } catch {
        try {
          errorDetails = await response.text()
        } catch {
          errorDetails = `HTTP ${response.status}: ${response.statusText}`
        }
      }
      throw new Error(errorDetails)
    }

    if (!response.body) {
      throw new Error('Preview stream not available')
    }

    return response.body
  }

  /**
   * Validate target path format
   */
  validateTargetPath(path: string): {
    valid: boolean
    error?: string
  } {
    if (!path) {
      return { valid: false, error: 'Target path is required' }
    }

    if (path.startsWith('src/')) {
      return {
        valid: false,
        error: 'Target path should not include src/ prefix'
      }
    }

    const parts = path.split('/').filter(Boolean)
    if (parts.length < 1) {
      return {
        valid: false,
        error: 'Target path must have at least 1 part'
      }
    }

    return { valid: true }
  }

  /**
   * Validate resource URL format
   */
  validateResourceUrl(url: string | undefined): {
    valid: boolean
    error?: string
  } {
    if (!url) {
      return { valid: true }
    }

    if (!url.startsWith('/')) {
      return {
        valid: false,
        error: 'Resource URL must start with /'
      }
    }

    const parts = url.split('/').filter(Boolean)
    if (parts.length < 2) {
      return {
        valid: false,
        error: 'Resource URL must have at least 2 parts (e.g., /apps/screen-name)'
      }
    }

    return { valid: true }
  }

  /**
   * Generate suggested resource URL from target path
   */
  suggestResourceUrl(targetPath: string): string {
    const parts = targetPath.split('/')
    if (parts.length >= 4 && parts[2] === 'apps') {
      const module = parts[0]
      const screenName = parts[3]
      return `/apps/${module}/${screenName}`
    }
    return ''
  }

  // ============================================================================
  // App Configuration
  // ============================================================================

  /**
   * Fetch app configuration from admin endpoint
   */
  async fetchAppConfig(): Promise<{
    repositoryId: string
    configured: boolean
    message?: string
  }> {
    const response = await fetch(`${this.baseUrl}/admin/auto-init-configs`, {
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      throw new Error('Failed to fetch app configuration')
    }

    const configs = await response.json()
    const enabledConfigs = configs.filter((c: { enabled: boolean }) => c.enabled)

    if (enabledConfigs.length === 0) {
      return {
        repositoryId: '',
        configured: false,
        message: 'No auto-init configurations found. Please configure repositories in Settings.'
      }
    }

    const repositoryIds = enabledConfigs
      .filter((c: { repoId?: string | null }) => c.repoId)
      .map((c: { repoId: string }) => c.repoId)

    if (repositoryIds.length === 0) {
      return {
        repositoryId: '',
        configured: true,
        message: 'Repositories configured but not yet initialized. Please wait for initialization to complete.'
      }
    }

    return {
      repositoryId: repositoryIds[0],
      configured: true
    }
  }

  // ============================================================================
  // Code Query & Analysis
  // ============================================================================

  private async parseQueryCodeError(response: Response): Promise<string> {
    const fallback = `Failed to query code (${response.status})`
    try {
      const errorData = (await response.json()) as {
        message?: string
        error?: string
        details?: string
        errors?: Array<{ detail?: string; message?: string }>
      }
      if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
        const firstError = errorData.errors[0]
        return firstError?.detail ?? firstError?.message ?? errorData.message ?? errorData.error ?? fallback
      }
      return errorData.message ?? errorData.error ?? errorData.details ?? fallback
    } catch {
      try {
        const text = await response.text()
        if (text) return text
      } catch {
        // Keep fallback message
      }
    }
    return fallback
  }

  /**
   * Query code using AI
   */
  async queryCode(
    repoId: string,
    query: string,
    conversationHistory: Array<{
      role: 'user' | 'assistant'
      content: string
      toolCalls?: Array<{
        tool: string
        args?: string
        result?: string
        status: 'running' | 'complete'
        id: string
      }>
      thinkingLog?: string
      thinkingCollapsed?: boolean
      blocks?: ChatMessageBlock[]
      messageId?: string
      createdAt?: string
    }> = [],
    useAgenticMode: boolean = true,
    buildEnabled: boolean = true,
    sessionId?: string,
    llmProvider: 'claude' | 'openai' = 'claude',
    customSystemPrompt?: string
  ): Promise<ReadableStream> {
    void useAgenticMode
    void buildEnabled
    void llmProvider
    const MAX_MESSAGES = 10
    const MAX_SINGLE_MESSAGE_CHARS = 3000
    const MAX_TOTAL_CHARS = 20000

    const compactHistory = conversationHistory.slice(-MAX_MESSAGES).map(message => {
      const rawContent = typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? '')
      const normalizedContent = rawContent.trim()
      const content =
        normalizedContent.length > MAX_SINGLE_MESSAGE_CHARS
          ? `${normalizedContent.slice(0, MAX_SINGLE_MESSAGE_CHARS)}\n\n... (history message truncated)`
          : normalizedContent
      return {
        role: message.role,
        content
      }
    })

    let totalChars = 0
    const boundedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
    for (let i = compactHistory.length - 1; i >= 0; i -= 1) {
      const item = compactHistory[i]
      if (!item.content) continue
      const nextTotal = totalChars + item.content.length
      if (nextTotal > MAX_TOTAL_CHARS) break
      boundedHistory.unshift(item)
      totalChars = nextTotal
    }

    const response = await fetch(`${this.baseUrl}/orchestration/turns/stream`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        intent: 'ui_mutate',
        scope: 'ui_only',
        repoId,
        sessionId,
        prompt: query,
        conversationHistory: boundedHistory,
        customSystemPrompt
      })
    })

    if (!response.ok) {
      throw new Error(await this.parseQueryCodeError(response))
    }

    if (!response.body) {
      throw new Error('Failed to query code: response stream is not available')
    }

    return response.body
  }

  // ============================================================================
  // Git Operations
  // ============================================================================

  /**
   * Download patch file for a session
   */
  async downloadPatch(repoId: string, sessionId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/git/patch?repoId=${repoId}&sessionId=${sessionId}`, {
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      let errorMessage = 'Failed to download patch'
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch {
        // Response wasn't JSON, use default message
      }
      throw new Error(errorMessage)
    }

    return response.blob()
  }

  /**
   * Get changes for a session
   */
  async getChanges(
    repoId: string,
    sessionId: string
  ): Promise<{
    summary?: {
      total: number
      files: Array<{
        path: string
        type: string
        filePath?: string
        newContent?: string
        changeType?: string
      }>
    }
    changes?: Array<{
      path: string
      type: string
      filePath?: string
      newContent?: string
      changeType?: string
    }>
  }> {
    const response = await fetch(`${this.baseUrl}/git/changes?repoId=${repoId}&sessionId=${sessionId}`, {
      headers: this.getHeaders(true)
    })

    if (!response.ok) {
      throw new Error('Failed to get changes')
    }

    return response.json()
  }

  // ============================================================================
  // Tool Execution
  // ============================================================================

  /**
   * Execute a tool (for FileExplorer, FilePreview, etc.)
   */
  async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    repoId: string,
    sessionId: string
  ): Promise<{
    success: boolean
    content?: string
    source?: string
    tree?: unknown
    [key: string]: unknown
  }> {
    const response = await fetch(`${this.baseUrl}/tools/execute`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        toolName,
        args,
        repoId,
        sessionId
      })
    })

    if (!response.ok) {
      throw new Error('Failed to execute tool')
    }

    return response.json()
  }

  /**
   * Get preview file URL. Endpoint: /previews/{sessionId}/{fileName}
   */
  getPreviewFileUrl(sessionId: string, fileName: string, query?: Record<string, string | number | boolean>): string {
    const base = `${this.baseUrl}/previews/${encodeURIComponent(sessionId)}/${encodeURIComponent(fileName)}`
    if (!query || Object.keys(query).length === 0) {
      return base
    }
    const searchParams = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      searchParams.set(key, String(value))
    }
    return `${base}?${searchParams.toString()}`
  }

  /**
   * @deprecated Use getPreviewFileUrl(sessionId, fileName) for preview assets
   * Get preview data with source files and private packages for LiveCodes
   * Returns source files + package URLs for private dependencies
   */
  async getPreviewData(
    repoId: string,
    sessionId: string
  ): Promise<{
    sourceFiles: Record<string, string>
    privatePackages: Record<
      string,
      {
        url: string
        version: string
      }
    >
  }> {
    const response = await fetch(
      `${this.baseUrl}/previews?repoId=${encodeURIComponent(repoId)}&sessionId=${encodeURIComponent(sessionId)}`,
      {
        method: 'GET',
        headers: this.getHeaders(false)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Preview data fetch failed: ${response.status} - ${errorText}`)
    }

    return response.json()
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const builderClient = new BuilderClient()

export function createBuilderClient(accessToken?: string): BuilderClient {
  return new BuilderClient(accessToken)
}
