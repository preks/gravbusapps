import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'
import type {
  AgentRegistryEntry,
  Connection,
  ConnectionAnalytics,
  ConnectionConfig,
  ConnectionCreateRequest,
  ExecutionAnalytics,
  ExecutionListItem,
  ExecutionLog,
  ExecutionTrace,
  AlertRule,
  AlertRuleCreateRequest,
  ActiveAlert,
  MeshSession,
  SessionMessage,
  SessionCommEvent
} from '@/business-apps/platform/apps/agent-mesh/types/agentMesh'

// --- Types (minimal, aligned with prompt-manager.openapi.json) ---
export interface Paging {
  limit: number
  offset: number
  totalRecords: number
}

export type PromptType = 'completion' | 'chat'
export type AgentType = 'flow' | 'everyai' | 'general'
export type ResponseStyle = 'formal' | 'conversational' | 'technical'
export type CitationMode = 'always' | 'when_needed' | 'never'

export interface PromptContent {
  template: string | null
  parameters: string[]
}

export interface ToolPolicy {
  /** MCP tool names (actions) that are allowed for this prompt */
  allowedTools: string[]
}

/** Per-prompt tool policies, keyed by tool code (e.g. `mcp.flow-engine`) */
export type ToolPolicies = Record<string, ToolPolicy>

export interface KnowledgeSource {
  id?: string // Assigned by backend on save; optional for creation
  type: 'document' | 'url' | 'content_entry' | 'catalog' | 'note' | 'spreadsheet' | 'slide' // content_entry = internal knowledge base, catalog = catalog entries, note/spreadsheet/slide = workspace content
  name: string
  description?: string
  url?: string
  fileId?: string
  fileName?: string
  fileSize?: number
  mimeType?: string
  contentEntryId?: string // For internal content
  catalogIdentifier?: string // For catalog sources (e.g., "ContentCategory")
  catalogVersion?: string // For catalog sources (e.g., "v1")
  catalogEntryCount?: number // Number of entries in the catalog
  extractedContent?: string // Extracted text from documents (parsed by FlowBot)
  lastUpdated: string
  createdAt: string
}

export interface PromptAgentCard {
  division?: string
  data_domains?: string[]
  capabilities?: string[]
  access_policy?: string
  allowed_callers?: string[]
  version?: string
}

export interface PromptODM {
  _id?: string
  name: string
  created_at?: string
  description?: string
  type?: PromptType
  system_content?: PromptContent | null
  user_content: PromptContent
  tools?: string[]
  toolPolicies?: ToolPolicies
  model: { id: string; collection: string }
  model_settings?: Record<string, unknown>
  response_schema?: Record<string, unknown> | null
  version: number
  workspace: { id: string; collection: string }
  revision_message?: string
  // Every Experts fields
  agent_type?: AgentType
  specialty?: string
  response_style?: ResponseStyle
  avatar?: string
  color?: string
  citation_mode?: CitationMode
  knowledge_sources?: KnowledgeSource[]
  is_public?: boolean
  created_by?: string
  tags?: string[]
  // Agent Mesh fields
  agent_card?: PromptAgentCard | null
}

export interface PromptPage {
  data: PromptODM[]
  paging: Paging
}

export interface WorkspaceODM {
  _id?: string
  name: string
  created_at?: string
  modified_at?: string
  default?: boolean
}

export interface WorkspacePage {
  data: WorkspaceODM[]
  paging: Paging
}

export interface WorkspaceDetails {
  name: string
  default?: boolean
}

export interface WorkspacePatchDetails {
  name?: string | null
  default?: boolean | null
}

export interface PromptDetails {
  description?: string
  type?: PromptType
  systemContent?: string | null
  userContent: string
  tools?: string[]
  toolPolicies?: ToolPolicies
  modelId: string
  modelSettings?: Record<string, unknown>
  responseSchema?: Record<string, unknown> | null
  name: string
  workspaceId: string
  // Every Experts fields
  agentType?: AgentType
  specialty?: string
  responseStyle?: ResponseStyle
  avatar?: string
  color?: string
  citationMode?: CitationMode
  knowledgeSources?: KnowledgeSource[]
  isPublic?: boolean
  tags?: string[]
}

export interface PromptPutDetails {
  description?: string
  type?: PromptType
  systemContent?: string | null
  userContent: string
  tools?: string[]
  toolPolicies?: ToolPolicies
  modelId: string
  modelSettings?: Record<string, unknown>
  responseSchema?: Record<string, unknown> | null
  revisionMessage?: string
  // Every Experts fields
  agentType?: AgentType
  specialty?: string
  responseStyle?: ResponseStyle
  avatar?: string
  color?: string
  citationMode?: CitationMode
  knowledgeSources?: KnowledgeSource[]
  isPublic?: boolean
  tags?: string[]
}

export interface PromptPatchDetails {
  description?: string | null
  type?: PromptType | null
  systemContent?: string | null
  userContent?: string | null
  tools?: string[] | null
  toolPolicies?: ToolPolicies | null
  modelId?: string | null
  modelSettings?: Record<string, unknown> | null
  responseSchema?: Record<string, unknown> | null
  revisionMessage?: string
  // Every Experts fields
  agentType?: AgentType | null
  specialty?: string | null
  responseStyle?: ResponseStyle | null
  avatar?: string | null
  color?: string | null
  citationMode?: CitationMode | null
  knowledgeSources?: KnowledgeSource[] | null
  isPublic?: boolean | null
  tags?: string[] | null
}

export interface PromptExecuteResponse<T = unknown> {
  content: T | string | null
}

export interface PromptManagerUserDataRecord<TData = unknown> {
  user_id: string
  key: string
  data: TData
  updated_at: string
}

/** Knowledge source entry for execute-json (e.g. catalog reference). */
export interface ExecutePromptJsonKnowledgeSource {
  type: string
  name?: string
  catalogIdentifier?: string
  catalogVersion?: string
  [key: string]: unknown
}

/** Request body for POST /api/v1/prompts/execute-json (execute prompt with JSON + document links) */
export interface ExecutePromptJsonBody {
  model_id?: string
  model_service?: string
  model_name?: string
  system_content?: string
  user_content?: string
  tools?: string[]
  model_settings?: Record<string, unknown>
  response_schema?: Record<string, unknown>
  system_params?: Record<string, unknown>
  user_params?: Record<string, unknown>
  document_links?: string[]
  knowledge_sources?: ExecutePromptJsonKnowledgeSource[]
  citation_mode?: string
  response_style?: string
  context?: Record<string, unknown>
}

// --- Telemetry / Executions ---
export type ExecutionRunStatus = 'running' | 'success' | 'error'

export interface ExecutionRun {
  executionId: string
  createdAt: string
  startedAt: string
  finishedAt?: string | null
  durationMs?: number | null
  status: ExecutionRunStatus
  errorType?: string | null
  errorMessage?: string | null

  promptId?: string | null
  promptVersion?: number | null
  promptName?: string | null
  agentType?: string | null
  tags?: string[] | null

  policyRootIds?: string[] | null
  policyVersionIds?: string[] | null

  aiService?: string | null
  aiModel?: string | null

  toolCallsCount?: number
  toolsUsed?: string[] | null
  knowledgeSourceIds?: string[] | null

  finalOutputPreview?: string | null
  reasoningSummary?: Record<string, any> | null

  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  llmRequests?: number
}

export interface ExecutionRunPage {
  data: ExecutionRun[]
  paging: Paging
}

export interface ExecutionTraceEvent {
  executionId: string
  seq: number
  ts: string
  eventType: string
  data: Record<string, any>
}

export interface ExecutionTracePage {
  data: ExecutionTraceEvent[]
  paging: Paging
}

export interface ExecutionStatsResponse {
  total: number
  success: number
  error: number
  running: number
}

export interface ExecutionTimeseriesPoint {
  day: string
  total: number
  success: number
  error: number
  running: number
  avgDurationMs?: number | null
  toolCalls: number
}

export interface ExecutionTimeseriesResponse {
  data: ExecutionTimeseriesPoint[]
  resolution?: string
}

export interface ExecutionTopToolItem {
  tool: string
  count: number
}

export interface ExecutionTopToolsResponse {
  data: ExecutionTopToolItem[]
}

/** Attachment to pass to prompt execution */
export interface PromptAttachment {
  id: string
  name: string
  url: string
  type?: string
  mimeType?: string
  size?: number
}

/** Options for executing a prompt with additional context */
export interface PromptExecuteOptions {
  /** User parameters for the prompt template */
  userParams?: Record<string, any>
  /** System parameters for the prompt template */
  systemParams?: Record<string, any>
  /** Attachments (files) to include with the execution */
  attachments?: PromptAttachment[]
  /** Additional context to pass to the LLM */
  context?: Record<string, any>
}

export interface AIServiceODM {
  _id?: string
  name: string
  created_at?: string
}

export interface AIModelODM {
  _id?: string
  name: string
  created_at?: string
  service: { id: string; collection: string }
}

export interface AIModelPage {
  data: AIModelODM[]
  paging: Paging
}

export interface MCPConfig {
  serverId?: string
  transport: 'sse' | 'websocket' | 'http'
  url: string
  env?: Record<string, string>
}

export interface ToolSettings {
  // Key-value pairs for runtime configuration (credentials, env vars, auth, etc.)
  // These will be provided to the function/MCP at runtime
  config?: Record<string, string>
}

export interface SchemaConfig {
  input?: Record<string, unknown> // JSON Schema for input/parameters
  output?: Record<string, unknown> // JSON Schema for output/result
}

export interface ToolODM {
  _id?: string
  /** Stable tool identifier used in prompts (e.g. `mcp.flow-engine`) */
  code?: string
  name: string
  created_at?: string
  description?: string
  type: 'mcp'
  config: MCPConfig
  settings?: ToolSettings
  schemaConfig?: SchemaConfig
  schema_config?: SchemaConfig // Backend returns snake_case
  externalConnectionId?: string | null
  external_connection_id?: string | null
  active?: boolean
  /** Internal tools are preconfigured and read-only */
  internal?: boolean
}

export interface McpAvailableAction {
  name: string
  description?: string
  inputSchema?: Record<string, unknown> | null
}

export interface McpAvailableActionsResponse {
  toolId: string
  toolCode?: string | null
  serverId?: string | null
  externalConnectionId?: string | null
  url: string
  tools: McpAvailableAction[]
}

export interface ToolPage {
  data: ToolODM[]
  paging: Paging
}

export interface MCPToolDetails {
  name: string
  description?: string
  type: 'mcp'
  config: MCPConfig
  settings?: ToolSettings
  schemaConfig?: SchemaConfig
  externalConnectionId?: string | null
}

export type ToolDetails = MCPToolDetails

export interface ToolPutDetails {
  name?: string
  description?: string
  type?: 'mcp'
  config?: MCPConfig
  settings?: ToolSettings
  schemaConfig?: SchemaConfig
  externalConnectionId?: string | null
}

export interface ToolPatchDetails {
  name?: string | null
  description?: string | null
  type?: 'mcp' | null
  config?: MCPConfig | null
  settings?: ToolSettings | null
  schemaConfig?: SchemaConfig | null
  externalConnectionId?: string | null
  active?: boolean | null
}

export type ExternalConnectionKind = 'mcp' | 'structured' | 'unstructured'
export type ExternalConnectionLane = 'mcp_servers' | 'data_bridge' | 'anypoint_connect'
export type ConnectorProviderFormMode = 'custom_form' | 'oauth' | 'mcp_url'

export interface ConnectorProviderConfigField {
  key: string
  fieldType: 'text' | 'password' | 'url' | 'number' | 'textarea'
  required?: boolean
}

export interface ConnectorProviderODM {
  _id?: string
  providerId: string
  provider_id?: string
  name: string
  description?: string
  kind: ExternalConnectionKind
  lane: ExternalConnectionLane
  iconKey: string
  icon_key?: string
  formMode: ConnectorProviderFormMode
  form_mode?: ConnectorProviderFormMode
  configFields?: ConnectorProviderConfigField[] | null
  config_fields?: ConnectorProviderConfigField[] | null
  helpUrl?: string | null
  help_url?: string | null
  connectorId?: string | null
  connector_id?: string | null
  connectorName?: string | null
  connector_name?: string | null
  consumerTypes?: string[] | null
  consumer_types?: string[] | null
  active?: boolean
  managed?: boolean
  sortOrder?: number | null
  sort_order?: number | null
}

export interface ExternalConnectionODM {
  _id?: string
  connectionId: string
  connection_id?: string
  name: string
  description?: string
  kind: ExternalConnectionKind
  lane: ExternalConnectionLane
  providerId?: string | null
  provider_id?: string | null
  connectorId?: string | null
  connector_id?: string | null
  connectorName?: string | null
  connector_name?: string | null
  url?: string | null
  transport?: 'http' | 'sse' | 'websocket' | null
  env?: Record<string, string> | null
  config?: Record<string, string>
  consumerTypes?: string[] | null
  consumer_types?: string[] | null
  active?: boolean
  managed?: boolean
  internal?: boolean
}

export interface ExternalConnectionDetails {
  name: string
  description?: string
  kind: ExternalConnectionKind
  lane: ExternalConnectionLane
  providerId?: string | null
  connectorId?: string | null
  connectorName?: string | null
  url?: string | null
  transport?: 'http' | 'sse' | 'websocket' | null
  env?: Record<string, string> | null
  config?: Record<string, string> | null
  consumerTypes?: string[] | null
  active?: boolean | null
  managed?: boolean | null
  internal?: boolean | null
}

export interface ExternalConnectionPatchDetails {
  name?: string | null
  description?: string | null
  lane?: ExternalConnectionLane | null
  providerId?: string | null
  connectorId?: string | null
  connectorName?: string | null
  url?: string | null
  transport?: 'http' | 'sse' | 'websocket' | null
  env?: Record<string, string> | null
  config?: Record<string, string> | null
  consumerTypes?: string[] | null
  active?: boolean | null
  managed?: boolean | null
  internal?: boolean | null
}

export interface ExternalConnectionPage {
  data: ExternalConnectionODM[]
  paging: Paging
}

export interface ConnectorProviderPage {
  data: ConnectorProviderODM[]
  paging: Paging
}

export interface ConnectorProviderInstantiationDetails {
  name: string
  description?: string
  url?: string | null
  transport?: 'http' | 'sse' | 'websocket' | null
  env?: Record<string, string> | null
  config?: Record<string, string> | null
  consumerTypes?: string[] | null
  active?: boolean | null
}

export interface ExternalConnectionAvailableActionsResponse {
  connectionId: string
  url: string
  tools: McpAvailableAction[]
}

export interface ExternalConnectionHealthResponse {
  connectionId: string
  success: boolean
  message: string
  details?: Record<string, unknown>
}

export interface AIServicePage {
  data: AIServiceODM[]
  paging: Paging
}

export interface MeshLayoutPosition {
  agent_id: string
  x: number
  y: number
}

export interface MeshLayoutResponse {
  positions: MeshLayoutPosition[]
}

// --- Client ---
export class PromptManagerClient extends RestClient {
  /**
   * @param baseUrl - API base including `/api/v1` (defaults to global Prompt Manager URL).
   *                  Use a dedicated base for feature-scoped routing (e.g. spreadsheet AI → Flowbot mount).
   */
  constructor(baseUrl: string = PROMPT_MANAGER_API_URL) {
    super(baseUrl, {})
  }

  private hasHttpStatus(error: unknown, status: number): boolean {
    return error instanceof Error && error.message.includes(`REST request failed: ${status}`)
  }

  private normalizeAccessToken(accessToken: unknown): string | null {
    if (typeof accessToken !== 'string') return null
    const trimmed = accessToken.trim()
    if (!trimmed) return null
    if (trimmed === '[object Object]') return null
    if (trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') return null
    if (trimmed.startsWith('Bearer ')) {
      const raw = trimmed.slice('Bearer '.length).trim()
      return raw || null
    }
    return trimmed
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    const normalized = this.normalizeAccessToken(accessToken)
    if (!normalized) {
      delete this.headers['Authorization']
      if (typeof console !== 'undefined') {
        console.warn('[PromptManagerClient] Invalid access token supplied; Authorization header cleared')
      }
      return
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(normalized)
  }

  // --- Workspaces ---
  async getWorkspaces(params?: {
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<WorkspacePage> {
    return this.get<WorkspacePage>('/workspaces/', { params })
  }

  async getWorkspace(id: string): Promise<WorkspaceODM> {
    return this.get<WorkspaceODM>(`/workspaces/${encodeURIComponent(id)}`)
  }

  async createWorkspace(body: WorkspaceDetails): Promise<WorkspaceODM> {
    return this.post<WorkspaceODM>('/workspaces/', body)
  }

  async updateWorkspace(id: string, body: WorkspaceDetails): Promise<WorkspaceODM> {
    return this.put<WorkspaceODM>(`/workspaces/${encodeURIComponent(id)}`, body)
  }

  async patchWorkspace(id: string, body: WorkspacePatchDetails): Promise<WorkspaceODM> {
    return this.patch<WorkspaceODM>(`/workspaces/${encodeURIComponent(id)}`, body)
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.delete<void>(`/workspaces/${encodeURIComponent(id)}`)
  }

  // --- Prompts (Agents) ---
  async getPrompts(params?: {
    workspaceId?: string | null
    promptName?: string | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<PromptPage> {
    return this.get<PromptPage>('/prompts/', { params: params as Record<string, any> })
  }

  async getPrompt(id: string): Promise<PromptODM> {
    return this.get<PromptODM>(`/prompts/${encodeURIComponent(id)}`)
  }

  async getPromptParameters(id: string): Promise<{ system_parameters: string[]; user_parameters: string[] }> {
    return this.get<{ system_parameters: string[]; user_parameters: string[] }>(
      `/prompts/${encodeURIComponent(id)}/parameters`
    )
  }

  async createPrompt(body: PromptDetails): Promise<PromptODM> {
    return this.post<PromptODM>('/prompts/', body)
  }

  async putPrompt(id: string, body: PromptPutDetails): Promise<PromptODM> {
    return this.put<PromptODM>(`/prompts/${encodeURIComponent(id)}`, body)
  }

  async patchPrompt(id: string, body: PromptPatchDetails): Promise<PromptODM> {
    return this.patch<PromptODM>(`/prompts/${encodeURIComponent(id)}`, body)
  }

  async deletePrompt(id: string): Promise<void> {
    await this.delete<void>(`/prompts/${encodeURIComponent(id)}`)
  }

  async getPromptVersions(
    id: string,
    params?: {
      limit?: number
      offset?: number
      returnTotalRecords?: boolean
    }
  ): Promise<{ data: PromptODM[]; paging: Paging }> {
    return this.get<{ data: PromptODM[]; paging: Paging }>(`/prompts/${encodeURIComponent(id)}/versions`, {
      params
    })
  }

  // --- Execution ---
  async executePrompt(formData: FormData): Promise<PromptExecuteResponse> {
    return this.post<PromptExecuteResponse>('/prompts/execute', formData)
  }

  async executePromptById(id: string, formData: FormData): Promise<PromptExecuteResponse> {
    return this.post<PromptExecuteResponse>(`/prompts/${encodeURIComponent(id)}/execute`, formData)
  }

  /**
   * Execute prompt with JSON body and optional document links.
   * POST /prompts/execute-json
   */
  async executePromptByJson(body: ExecutePromptJsonBody): Promise<PromptExecuteResponse> {
    return this.post<PromptExecuteResponse>('/prompts/execute-json', body)
  }

  // --- User data ---
  async getUserData<TData = unknown>(key: string, userId: string): Promise<PromptManagerUserDataRecord<TData> | null> {
    try {
      return await this.get<PromptManagerUserDataRecord<TData>>(`/user-data/${encodeURIComponent(key)}`, {
        params: { user_id: userId }
      })
    } catch (error) {
      if (this.hasHttpStatus(error, 404)) {
        return null
      }
      throw error
    }
  }

  async putUserData<TData = unknown>(
    key: string,
    userId: string,
    data: TData
  ): Promise<PromptManagerUserDataRecord<TData> | null> {
    return this.put<PromptManagerUserDataRecord<TData> | null>(
      `/user-data/${encodeURIComponent(key)}`,
      { data },
      { params: { user_id: userId } }
    )
  }

  // --- Execution telemetry (runs + traces) ---
  async getExecutionRuns(params?: {
    promptId?: string | null
    status?: ExecutionRunStatus | string | null
    policyRootId?: string | null
    tag?: string | null
    toolName?: string | null
    createdAtFrom?: string | null
    createdAtTo?: string | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<ExecutionRunPage> {
    return this.get<ExecutionRunPage>('/executions/runs', { params: params as Record<string, any> })
  }

  async getExecutionRun(executionId: string): Promise<ExecutionRun> {
    return this.get<ExecutionRun>(`/executions/runs/${encodeURIComponent(executionId)}`)
  }

  async getExecutionTrace(
    executionId: string,
    params?: { limit?: number; offset?: number; returnTotalRecords?: boolean }
  ): Promise<ExecutionTracePage> {
    return this.get<ExecutionTracePage>(`/executions/runs/${encodeURIComponent(executionId)}/trace`, { params })
  }

  async getExecutionStats(params?: {
    policyRootId?: string | null
    promptId?: string | null
  }): Promise<ExecutionStatsResponse> {
    return this.get<ExecutionStatsResponse>('/executions/stats', { params: params as Record<string, any> })
  }

  async getExecutionTimeseries(params?: {
    policyRootId?: string | null
    promptId?: string | null
    days?: number
    resolution?: string | null
  }): Promise<ExecutionTimeseriesResponse> {
    return this.get<ExecutionTimeseriesResponse>('/executions/timeseries', {
      params: params as Record<string, any>
    })
  }

  async getExecutionTopTools(params?: {
    policyRootId?: string | null
    promptId?: string | null
    days?: number
    limit?: number
  }): Promise<ExecutionTopToolsResponse> {
    return this.get<ExecutionTopToolsResponse>('/executions/tools-top', {
      params: params as Record<string, any>
    })
  }

  /**
   * Execute a prompt with structured options including attachments
   * This is a convenience method that builds the FormData with proper structure
   *
   * @param id - The prompt ID to execute
   * @param options - Execution options including params and attachments
   *
   * The backend receives:
   * - user_params: JSON string of user parameters
   * - system_params: JSON string of system parameters
   * - attachments: JSON string of attachment metadata with URLs
   * - context: JSON string of additional context
   *
   * Backend is expected to:
   * 1. Parse attachments JSON to get file URLs
   * 2. Optionally fetch file contents from URLs for analysis
   * 3. Include attachment context in the LLM call
   */
  async executePromptWithOptions(id: string, options: PromptExecuteOptions): Promise<PromptExecuteResponse> {
    const formData = new FormData()

    if (options.userParams && Object.keys(options.userParams).length > 0) {
      formData.append('user_params', JSON.stringify(options.userParams))
    }

    if (options.systemParams && Object.keys(options.systemParams).length > 0) {
      formData.append('system_params', JSON.stringify(options.systemParams))
    }

    if (options.attachments && options.attachments.length > 0) {
      formData.append('attachments', JSON.stringify(options.attachments))
    }

    if (options.context && Object.keys(options.context).length > 0) {
      formData.append('context', JSON.stringify(options.context))
    }

    return this.post<PromptExecuteResponse>(`/prompts/${encodeURIComponent(id)}/execute`, formData)
  }

  /**
   * Build FormData for prompt execution with attachments
   * Utility method for custom execution flows
   */
  buildExecuteFormData(options: PromptExecuteOptions): FormData {
    const formData = new FormData()

    if (options.userParams && Object.keys(options.userParams).length > 0) {
      formData.append('user_params', JSON.stringify(options.userParams))
    }

    if (options.systemParams && Object.keys(options.systemParams).length > 0) {
      formData.append('system_params', JSON.stringify(options.systemParams))
    }

    if (options.attachments && options.attachments.length > 0) {
      formData.append('attachments', JSON.stringify(options.attachments))
    }

    if (options.context && Object.keys(options.context).length > 0) {
      formData.append('context', JSON.stringify(options.context))
    }

    return formData
  }

  // --- AI Services / Models ---
  async getAiServices(params?: {
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<AIServicePage> {
    return this.get<AIServicePage>('/ai-services/', { params })
  }

  async getAiModels(params?: {
    serviceId?: string | null
    modelName?: string | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<AIModelPage> {
    return this.get<AIModelPage>('/ai-models/', {
      params: params as Record<string, any>
    })
  }

  // --- Tools (Common List API) ---
  async getTools(params?: {
    toolName?: string | null
    toolType?: 'mcp' | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<ToolPage> {
    return this.get<ToolPage>('/tools/', { params: params as Record<string, any> })
  }

  // --- MCP Tools ---
  async getMcpTool(id: string): Promise<ToolODM> {
    return this.get<ToolODM>(`/tools/mcp/${encodeURIComponent(id)}`)
  }

  async getMcpAvailableActions(id: string): Promise<McpAvailableActionsResponse> {
    return this.get<McpAvailableActionsResponse>(`/tools/mcp/${encodeURIComponent(id)}/available-actions`)
  }

  async createMcpTool(body: MCPToolDetails): Promise<ToolODM> {
    return this.post<ToolODM>('/tools/mcp/', body)
  }

  async putMcpTool(id: string, body: MCPToolDetails): Promise<ToolODM> {
    return this.put<ToolODM>(`/tools/mcp/${encodeURIComponent(id)}`, body)
  }

  async patchMcpTool(id: string, body: ToolPatchDetails): Promise<ToolODM> {
    return this.patch<ToolODM>(`/tools/mcp/${encodeURIComponent(id)}`, body)
  }

  async deleteMcpTool(id: string): Promise<void> {
    await this.delete<void>(`/tools/mcp/${encodeURIComponent(id)}`)
  }

  // --- External Connections ---
  async getConnectorProviders(params?: {
    search?: string | null
    kind?: ExternalConnectionKind | null
    lane?: ExternalConnectionLane | null
    consumerType?: string | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<ConnectorProviderPage> {
    return this.get<ConnectorProviderPage>('/connector-providers/', {
      params: params as Record<string, any>
    })
  }

  async getConnectorProvider(providerId: string): Promise<ConnectorProviderODM> {
    return this.get<ConnectorProviderODM>(`/connector-providers/${encodeURIComponent(providerId)}`)
  }

  async instantiateConnectorProvider(
    providerId: string,
    body: ConnectorProviderInstantiationDetails
  ): Promise<ExternalConnectionODM> {
    return this.post<ExternalConnectionODM>(`/connector-providers/${encodeURIComponent(providerId)}/instantiate`, body)
  }

  async getExternalConnections(params?: {
    search?: string | null
    kind?: ExternalConnectionKind | null
    lane?: ExternalConnectionLane | null
    connectorId?: string | null
    consumerType?: string | null
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<ExternalConnectionPage> {
    return this.get<ExternalConnectionPage>('/external-connections/', {
      params: params as Record<string, any>
    })
  }

  async getExternalConnection(connectionId: string): Promise<ExternalConnectionODM> {
    return this.get<ExternalConnectionODM>(`/external-connections/${encodeURIComponent(connectionId)}`)
  }

  async createExternalConnection(body: ExternalConnectionDetails): Promise<ExternalConnectionODM> {
    return this.post<ExternalConnectionODM>('/external-connections/', body)
  }

  async putExternalConnection(connectionId: string, body: ExternalConnectionDetails): Promise<ExternalConnectionODM> {
    return this.put<ExternalConnectionODM>(`/external-connections/${encodeURIComponent(connectionId)}`, body)
  }

  async patchExternalConnection(
    connectionId: string,
    body: ExternalConnectionPatchDetails
  ): Promise<ExternalConnectionODM> {
    return this.patch<ExternalConnectionODM>(`/external-connections/${encodeURIComponent(connectionId)}`, body)
  }

  async deleteExternalConnection(connectionId: string): Promise<void> {
    await this.delete<void>(`/external-connections/${encodeURIComponent(connectionId)}`)
  }

  async getExternalConnectionAvailableActions(
    connectionId: string
  ): Promise<ExternalConnectionAvailableActionsResponse> {
    return this.get<ExternalConnectionAvailableActionsResponse>(
      `/external-connections/${encodeURIComponent(connectionId)}/available-actions`
    )
  }

  async getExternalConnectionHealth(connectionId: string): Promise<ExternalConnectionHealthResponse> {
    return this.get<ExternalConnectionHealthResponse>(
      `/external-connections/${encodeURIComponent(connectionId)}/health`
    )
  }

  // --- Agent Mesh ---
  async getAgentRegistry(params?: {
    workspaceId?: string
    agentType?: string
    division?: string
  }): Promise<AgentRegistryEntry[]> {
    return this.get<AgentRegistryEntry[]>('/agents/registry', { params: params as Record<string, string> })
  }

  async getAgentDetail(agentId: string): Promise<AgentRegistryEntry> {
    return this.get<AgentRegistryEntry>(`/agents/registry/${encodeURIComponent(agentId)}`)
  }

  async updateAgentCard(
    agentId: string,
    body: { division?: string; data_domains?: string[]; capabilities?: string[]; access_policy?: string }
  ): Promise<unknown> {
    return this.patch(`/agents/registry/${encodeURIComponent(agentId)}/card`, body)
  }

  async getMeshConnections(params?: { status?: string; callerId?: string; calleeId?: string }): Promise<Connection[]> {
    return this.get<Connection[]>('/connections/', { params: params as Record<string, string> }).catch(() =>
      this.get<Connection[]>('/connections', { params: params as Record<string, string> })
    )
  }

  async getMeshConnection(connectionId: string): Promise<Connection> {
    return this.get<Connection>(`/connections/${encodeURIComponent(connectionId)}`)
  }

  async createMeshConnection(body: ConnectionCreateRequest): Promise<Connection> {
    return this.post<Connection>('/connections/', body).catch(() => this.post<Connection>('/connections', body))
  }

  async updateMeshConnection(
    connectionId: string,
    body: { config?: ConnectionConfig; status?: string }
  ): Promise<Connection> {
    return this.put<Connection>(`/connections/${encodeURIComponent(connectionId)}`, body)
  }

  async deleteMeshConnection(connectionId: string): Promise<void> {
    await this.delete<void>(`/connections/${encodeURIComponent(connectionId)}`)
  }

  async getMeshConnectionAnalytics(connectionId: string, days?: number): Promise<ConnectionAnalytics> {
    return this.get<ConnectionAnalytics>(`/connections/${encodeURIComponent(connectionId)}/analytics`, {
      params: days ? { days } : undefined
    })
  }

  async getMeshExecutions(params?: Record<string, string | number>): Promise<ExecutionListItem[]> {
    return this.get<ExecutionListItem[]>('/executions/', { params })
  }

  async getMeshExecutionDetail(executionId: string): Promise<ExecutionLog> {
    return this.get<ExecutionLog>(`/executions/${encodeURIComponent(executionId)}`)
  }

  async getMeshExecutionTrace(correlationId: string): Promise<ExecutionTrace> {
    return this.get<ExecutionTrace>(`/executions/${encodeURIComponent(correlationId)}/trace`)
  }

  async getMeshExecutionAnalytics(params?: {
    days?: number
    promptId?: string
    connectionId?: string
  }): Promise<ExecutionAnalytics> {
    return this.get<ExecutionAnalytics>('/executions/analytics', { params: params as Record<string, string> })
  }

  async getAlertRules(params?: { status?: string; agentId?: string }): Promise<AlertRule[]> {
    return this.get<AlertRule[]>('/alerts/rules', { params: params as Record<string, string> })
  }

  async createAlertRule(body: AlertRuleCreateRequest): Promise<AlertRule> {
    return this.post<AlertRule>('/alerts/rules', body)
  }

  async updateAlertRule(ruleId: string, body: Partial<AlertRule>): Promise<AlertRule> {
    return this.put<AlertRule>(`/alerts/rules/${encodeURIComponent(ruleId)}`, body)
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    await this.delete<void>(`/alerts/rules/${encodeURIComponent(ruleId)}`)
  }

  async getActiveAlerts(): Promise<ActiveAlert[]> {
    return this.get<ActiveAlert[]>('/alerts/active')
  }

  async getMeshLayout(): Promise<MeshLayoutResponse> {
    return this.get<MeshLayoutResponse>('/agents/layout')
  }

  async saveMeshLayout(positions: MeshLayoutPosition[]): Promise<unknown> {
    return this.put('/agents/layout', { positions })
  }

  async getMeshSessions(params?: { userId?: string }): Promise<MeshSession[]> {
    return this.get<MeshSession[]>('/mesh-sessions/', { params: params as Record<string, string> })
  }

  async createMeshSession(data: {
    user_id: string
    agent_id: string
    agent_name: string
    title?: string
  }): Promise<MeshSession> {
    return this.post<MeshSession>('/mesh-sessions/', data)
  }

  async getMeshSession(sessionId: string): Promise<MeshSession> {
    return this.get<MeshSession>(`/mesh-sessions/${encodeURIComponent(sessionId)}`)
  }

  async updateMeshSession(
    sessionId: string,
    data: { messages?: SessionMessage[]; comm_events?: SessionCommEvent[]; result?: string; title?: string }
  ): Promise<MeshSession> {
    return this.put<MeshSession>(`/mesh-sessions/${encodeURIComponent(sessionId)}`, data)
  }

  async deleteMeshSession(sessionId: string): Promise<void> {
    await this.delete<void>(`/mesh-sessions/${encodeURIComponent(sessionId)}`)
  }

  // --- Every Experts (EveryAI Agents) ---
  /**
   * Get all EveryAI experts (agents with agent_type=everyai)
   */
  async getEveryAIExperts(params?: {
    search?: string | null
    tags?: string[]
    isPublic?: boolean
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<PromptPage> {
    return this.get<PromptPage>('/prompts/', {
      params: {
        ...params,
        agentType: 'everyai' // Filter for EveryAI agents only
      } as Record<string, any>
    })
  }

  /**
   * Get all General agents (agents with agent_type=general)
   * General agents are standalone agents for general purpose use (not in chat or flow)
   */
  async getGeneralAgents(params?: {
    search?: string | null
    tags?: string[]
    limit?: number
    offset?: number
    returnTotalRecords?: boolean
  }): Promise<PromptPage> {
    return this.get<PromptPage>('/prompts/', {
      params: {
        ...params,
        agentType: 'general' // Filter for General agents only
      } as Record<string, any>
    })
  }

  /**
   * Upload a document as a knowledge source for an expert
   */
  async uploadKnowledgeSource(promptId: string, file: File, description?: string): Promise<KnowledgeSource> {
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }
    return this.post<KnowledgeSource>(`/prompts/${encodeURIComponent(promptId)}/knowledge-sources/upload`, formData)
  }

  /**
   * Add a URL as a knowledge source for an expert
   */
  async addKnowledgeSourceUrl(
    promptId: string,
    url: string,
    name: string,
    description?: string
  ): Promise<KnowledgeSource> {
    return this.post<KnowledgeSource>(`/prompts/${encodeURIComponent(promptId)}/knowledge-sources/url`, {
      url,
      name,
      description
    })
  }

  /**
   * Add internal content entry as a knowledge source
   */
  async addKnowledgeSourceContent(
    promptId: string,
    contentEntryId: string,
    name: string,
    description?: string
  ): Promise<KnowledgeSource> {
    return this.post<KnowledgeSource>(`/prompts/${encodeURIComponent(promptId)}/knowledge-sources/content`, {
      contentEntryId,
      name,
      description
    })
  }

  /**
   * Add catalog as a knowledge source
   */
  async addKnowledgeSourceCatalog(
    promptId: string,
    catalogIdentifier: string,
    catalogVersion: string,
    name: string,
    description?: string
  ): Promise<KnowledgeSource> {
    return this.post<KnowledgeSource>(`/prompts/${encodeURIComponent(promptId)}/knowledge-sources/catalog`, {
      catalogIdentifier,
      catalogVersion,
      name,
      description
    })
  }

  /**
   * Remove a knowledge source from an expert
   */
  async removeKnowledgeSource(promptId: string, sourceId: string): Promise<void> {
    await this.delete<void>(
      `/prompts/${encodeURIComponent(promptId)}/knowledge-sources/${encodeURIComponent(sourceId)}`
    )
  }

  /**
   * Get all knowledge sources for an expert
   */
  async getKnowledgeSources(promptId: string): Promise<KnowledgeSource[]> {
    const response = await this.get<{ data: KnowledgeSource[] }>(
      `/prompts/${encodeURIComponent(promptId)}/knowledge-sources`
    )
    return response.data || []
  }
}

export const promptManagerClient = new PromptManagerClient()
