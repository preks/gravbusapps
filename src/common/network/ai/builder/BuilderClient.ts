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
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  thinkingLog?: string
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
  repoId: string | null
  indexStatus: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAutoInitConfigRequest {
  url: string
  owner: string
  name: string
  branch: string
  enabled?: boolean
}

export interface UpdateAutoInitConfigRequest {
  url?: string
  owner?: string
  name?: string
  branch?: string
  enabled?: boolean
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
      const response = await fetch(`${this.baseUrl}/chat/history`, {
        method: 'POST',
        headers: this.getHeaders(true),
        body: JSON.stringify({
          repoId,
          sessionId,
          messages
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
      messageId?: string
      createdAt?: string
    }> = [],
    useAgenticMode: boolean = true,
    buildEnabled: boolean = true,
    sessionId?: string,
    llmProvider: 'claude' | 'openai' = 'claude',
    customSystemPrompt?: string
  ): Promise<ReadableStream> {
    const endpoint = useAgenticMode ? '/analyze/query-agentic' : '/analyze/query'

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({
        repoId,
        query,
        stream: true,
        conversationHistory,
        buildEnabled,
        sessionId,
        llmProvider,
        customSystemPrompt
      })
    })

    if (!response.ok || !response.body) {
      throw new Error('Failed to query code')
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
