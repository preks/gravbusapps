import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { assignBearerAuthorizationHeader, normalizeBearerAccessToken } from '@/common/network/HeaderUtils'
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
import type {
  WorkforceActiveOverview,
  WorkforceAuditPage,
  WorkforceAgent,
  WorkforceAgentCreateInput,
  WorkforceAgentMetrics,
  WorkforceAgentMetricsSummary,
  WorkforceAgentPage,
  WorkforceAgentStatus,
  WorkforceAgentUpdateInput,
  WorkforceDeployInput,
  WorkforceLedgerPage,
  WorkforceMetricsWindow,
  WorkforceRun,
  WorkforceRunCreateInput,
  WorkforceRunListParams,
  WorkforceRunPage,
  WorkforceTrigger,
  WorkforceTriggerCreateInput,
  WorkforceTriggerUpdateInput,
  WorkforceWorkspaceMetrics
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'

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
export type EnterpriseAgentKind = 'enterprise' | 'task_expert' | 'utility'
export type ProviderKind = 'flowbot' | 'functions' | 'mcp' | 'prompt_manager'
export type RunStatus =
  | 'pending'
  | 'running'
  | 'waiting_for_user'
  | 'waiting_for_approver'
  | 'waiting_for_external_system'
  | 'scheduled'
  | 'sleeping'
  | 'retrying'
  | 'completed'
  | 'failed_recoverable'
  | 'failed_permanent'
  | 'cancelled'

export interface ApprovalPolicy {
  require_approval: boolean
  approver_roles?: string[]
  approver_user_ids?: string[]
  reason?: string
  expires_after_seconds?: number
}

export interface SkillBinding {
  skill_id: string
  tool_refs?: string[]
  approval_policy?: ApprovalPolicy
  priority?: number
  enabled?: boolean
  version?: number | null
  follow_latest?: boolean
}

export interface ProviderToolCatalogItem {
  provider: ProviderKind
  tool_ref: string
  name: string
  description?: string
  skills?: string[]
  module?: string
  input_schema?: Record<string, unknown>
  output_schema?: Record<string, unknown>
  capabilities?: {
    risk_level?: 'read' | 'write' | 'destructive'
    requires_auth?: boolean
    supports_hitl?: boolean
    supports_artifacts?: boolean
    artifact_kinds?: string[]
    tags?: string[]
  }
  annotations?: Record<string, unknown>
}

/**
 * Unified v2 provider-tool entry. Returned from
 * GET /api/v2/provider-tools, which collapses every picker-attachable
 * provider surface into a single response keyed by canonical name —
 * flowbot, functions, prompt_manager (native Deep Agent tools), mcp
 * (Connect MCP), and the skill-attachable subset of platform builtins.
 *
 * Persistence rule: skill yaml continues to store ``tool_ref`` —
 * ``canonical_name`` is the LLM-facing display name only.
 */
export interface CanonicalProviderToolEntry {
  tool_ref: string
  canonical_name: string
  /**
   * Human-facing UI label, free of source-history prefixes (``newwork_``,
   * ``function_``, …). Render this as the primary text in the picker and
   * keep ``tool_ref`` as the small technical badge. Distinct from
   * ``canonical_name`` (the LLM function-call name). May be empty on
   * responses from an older backend — callers should fall back to
   * ``canonical_name``.
   */
  display_name?: string
  /**
   * Provider source. Stage 2 broadens this to every provider the picker
   * can attach to a skill: ``flowbot`` and ``functions`` plus
   * ``prompt_manager`` (native Deep Agent tools), ``mcp`` (Connect MCP),
   * and ``builtin`` (skill-attachable platform builtins).
   */
  source: 'flowbot' | 'functions' | 'prompt_manager' | 'mcp' | 'builtin'
  description: string
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  capabilities: Record<string, unknown>
  shadowed_by: string | null
  /** False when entry is a static stub because live catalog was unreachable */
  catalog_available: boolean
  /**
   * Primary category bucket from the existing ``CATEGORY_TO_TOOL_NAMES``
   * taxonomy (HR, CRM, web, charts, mcp, etc.). The picker UI groups
   * tools by this field so users see the same buckets the runtime
   * selector uses.
   */
  category?: string | null
  /**
   * Free-form labels carried from each provider — capability tags for
   * flowbot/functions/mcp/builtin, manifest verbs+entities+business_domain
   * for native ``prompt_manager.*`` entries. Used to widen substring search
   * beyond just name/description without adding a separate index.
   */
  tags?: string[]
  /**
   * User-visible backend label for where the tool actually runs. Prefer this
   * over the raw provider source in UI badges because many prompt_manager
   * wrappers delegate to Functions, Documents, Knowledge, or Flow services.
   */
  execution_backend?: string | null
  /**
   * True when this tool's canonical name is on the service-global disabled
   * list. Disabled tools remain in the picker (block-only UX) but are
   * stripped from both the Deep Agent and Expert/PromptODM runtimes.
   * May be absent on responses from an older backend.
   */
  disabled?: boolean
  /**
   * Companion tools this tool usually needs first (e.g. a write flow that
   * links to a parent entity lists the search/read tools that resolve the
   * parent id). Empty/absent for tools with no dependencies. The picker
   * surfaces these as a non-modal "also add" hint with a link to each
   * companion's detail.
   */
  related_tools?: RelatedToolRef[]
}

/** One companion-tool association attached to a provider tool entry. */
export interface RelatedToolRef {
  /** Provider-qualified ref of the companion tool (e.g. ``flowbot.run_internal_search``). */
  tool_ref: string
  /** Why it relates: a catalog-value lookup or a parent-entity lookup. */
  relation: 'catalog_lookup' | 'entity_lookup'
  /** How strongly it is needed for THIS tool. */
  necessity: 'required' | 'conditional' | 'recommended'
  /** Human-readable explanation shown in the hint. */
  reason: string
  /** Schema fields this companion helps resolve. */
  for_fields: string[]
}

/** One flow's companion bindings with provenance, for the Tools-page editor. */
export interface FlowBindingEntry {
  flow_name: string
  tool_ref: string
  /** Rows currently in force (generated base + overrides). */
  effective: RelatedToolRef[]
  /** Schema-derived base rows, for "reset to generated". */
  generated: RelatedToolRef[]
  /** Which layer supplies the effective rows: 'persisted' | 'code' | null (base). */
  source: 'persisted' | 'code' | null
}

/** Service-global set of disabled (blocked) canonical tool names. */
export interface ToolAvailabilityResponse {
  disabled_tool_names: string[]
}

export interface DeepAgentDebugTrace {
  session_id: string
  status: string
  input: string
  output_preview?: string
  summary: {
    trace_events: number
    debug_steps: number
    decisions: number
    tool_events: number
    has_explicit_tool_rationales: boolean
  }
  known_observability_gap?: string
  steps: Array<Record<string, unknown>>
}

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
  // Enterprise AI fields
  agent_kind?: EnterpriseAgentKind
  skill_ids?: string[]
  skill_bindings?: SkillBinding[]
  default_execution_pack_ids?: string[]
  allowed_tool_provider_refs?: string[]
  handoff_policy?: Record<string, unknown>
  visibility?: string
  runtime_mode?: string
  approval_policy?: ApprovalPolicy
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
  agentKind?: EnterpriseAgentKind
  skillIds?: string[]
  skillBindings?: SkillBinding[]
  defaultExecutionPackIds?: string[]
  allowedToolProviderRefs?: string[]
  handoffPolicy?: Record<string, unknown>
  visibility?: string
  runtimeMode?: string
  approvalPolicy?: ApprovalPolicy
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
  agentKind?: EnterpriseAgentKind
  skillIds?: string[]
  skillBindings?: SkillBinding[]
  defaultExecutionPackIds?: string[]
  allowedToolProviderRefs?: string[]
  handoffPolicy?: Record<string, unknown>
  visibility?: string
  runtimeMode?: string
  approvalPolicy?: ApprovalPolicy
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
  agentKind?: EnterpriseAgentKind | null
  skillIds?: string[] | null
  skillBindings?: SkillBinding[] | null
  defaultExecutionPackIds?: string[] | null
  allowedToolProviderRefs?: string[] | null
  handoffPolicy?: Record<string, unknown> | null
  visibility?: string | null
  runtimeMode?: string | null
  approvalPolicy?: ApprovalPolicy | null
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
  /** Memoized per-tool schema details for the picker preview pane. */
  private providerToolDetailCache = new Map<string, Promise<CanonicalProviderToolEntry>>()

  constructor(baseUrl: string = PROMPT_MANAGER_API_URL) {
    super(baseUrl, {})
  }

  private hasHttpStatus(error: unknown, status: number): boolean {
    return error instanceof Error && error.message.includes(`REST request failed: ${status}`)
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    const trimmed = typeof accessToken === 'string' ? accessToken.trim() : ''
    if (!normalizeBearerAccessToken(accessToken) && trimmed.length > 0 && typeof console !== 'undefined') {
      console.warn('[PromptManagerClient] Invalid access token supplied; Authorization header cleared')
    }
    assignBearerAuthorizationHeader(this.headers, accessToken)
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

  // --- Enterprise AI contracts / provider tools ---
  async getEnterpriseAiContracts(): Promise<{
    providers: ProviderKind[]
    agentKinds: EnterpriseAgentKind[]
    runStatuses: RunStatus[]
    eventTypes: string[]
    hitlRequestTypes: string[]
    capabilityErrorCodes: string[]
  }> {
    return this.get('/enterprise-ai/contracts')
  }

  async getFlowBotProviderTools(): Promise<ProviderToolCatalogItem[]> {
    return this.get<ProviderToolCatalogItem[]>('/enterprise-ai/tools/flowbot')
  }

  async getFunctionManagerTools(): Promise<ProviderToolCatalogItem[]> {
    return this.get<ProviderToolCatalogItem[]>('/enterprise-ai/tools/functions')
  }

  async getMcpProviderTools(): Promise<ProviderToolCatalogItem[]> {
    return this.get<ProviderToolCatalogItem[]>('/enterprise-ai/tools/mcp')
  }

  async getBuiltinProviderTools(): Promise<ProviderToolCatalogItem[]> {
    return this.get<ProviderToolCatalogItem[]>('/enterprise-ai/tools/builtin')
  }

  /**
   * Stage 1 unified provider-tools view. Returns only active (non-shadowed)
   * provider tools by default. Pass ``includeShadowed: true`` for the
   * admin/debug surface — that variant should be gated by an admin-only
   * check on the caller side.
   *
   * The base RestClient is mounted at ``/prompt-manager/api/v1``; the
   * ``/../v2/...`` segment resolves through the standard URL parser to
   * ``/prompt-manager/api/v2/provider-tools`` without requiring a second
   * client instance with a different base URL.
   */
  async getCanonicalProviderTools(
    options: { includeShadowed?: boolean; includeSchema?: boolean } = {}
  ): Promise<CanonicalProviderToolEntry[]> {
    const path = '/../v2/provider-tools'
    const params: Record<string, unknown> = {}
    if (options.includeShadowed) params.include_shadowed = true
    // Default to the lite list (no input/output schema). Schemas are only
    // rendered one tool at a time in the preview pane, so the list ships the
    // metadata and the preview re-hydrates a single tool via
    // getCanonicalProviderToolDetail. Pass includeSchema:true to opt back in.
    if (options.includeSchema !== true) params.include_schema = false
    return this.get<CanonicalProviderToolEntry[]>(path, {
      params: Object.keys(params).length > 0 ? params : undefined
    })
  }

  /**
   * Full detail (including JSON schema) for a single provider tool. Used by the
   * picker preview pane after the lite list (above) omits schemas. Results are
   * memoized per tool_ref for the lifetime of the client so re-opening the same
   * preview is instant and does not re-hit the backend.
   */
  async getCanonicalProviderToolDetail(toolRef: string): Promise<CanonicalProviderToolEntry> {
    const cached = this.providerToolDetailCache.get(toolRef)
    if (cached) return cached
    const promise = this.get<CanonicalProviderToolEntry>(`/../v2/provider-tools/${encodeURIComponent(toolRef)}`).catch(
      err => {
        // Don't cache failures — a transient catalog flake should be retryable.
        this.providerToolDetailCache.delete(toolRef)
        throw err
      }
    )
    this.providerToolDetailCache.set(toolRef, promise)
    return promise
  }

  /** Read the service-global set of disabled (blocked) canonical tool names. */
  async getToolAvailability(): Promise<ToolAvailabilityResponse> {
    return this.get<ToolAvailabilityResponse>('/../v2/tool-availability')
  }

  /**
   * Enable or disable one tool globally by canonical name. Disabled tools
   * stay visible in pickers but are stripped from both runtimes.
   */
  async setToolAvailability(canonicalName: string, disabled: boolean): Promise<ToolAvailabilityResponse> {
    return this.put<ToolAvailabilityResponse>('/../v2/tool-availability', {
      canonical_name: canonicalName,
      disabled
    })
  }

  /**
   * Read the per-flow companion bindings for the Tools-page editor. Returns
   * the effective rows (generated base + overrides), the generated base (for
   * "reset"), and which layer is in force per flow.
   */
  async getFlowBindings(): Promise<FlowBindingEntry[]> {
    return this.get<FlowBindingEntry[]>('/../v2/flow-bindings')
  }

  /**
   * Persist (``rows``) or clear (``rows: null``) a UI override for one flow's
   * companion bindings. Clearing reverts to the generated base.
   */
  async updateFlowBinding(flowName: string, rows: RelatedToolRef[] | null): Promise<FlowBindingEntry> {
    return this.put<FlowBindingEntry>(`/../v2/flow-bindings/${encodeURIComponent(flowName)}`, { rows })
  }

  async invokeEnterpriseTool(toolRef: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.post<Record<string, unknown>>('/enterprise-ai/tools/invoke', {
      tool_ref: toolRef,
      payload
    })
  }

  async getDeepAgentDebugTrace(sessionId: string): Promise<DeepAgentDebugTrace> {
    return this.get<DeepAgentDebugTrace>(`/deep-agent/sessions/${encodeURIComponent(sessionId)}/debug-trace`)
  }

  async createScheduledAgentSession(body: {
    title: string
    task: string
    scheduledAt: string
    timezone?: string
    workspaceId?: string
    config?: Record<string, unknown>
    activeExternalConnectionIds?: string[]
    recurrence?: { frequency?: 'daily' | 'weekly' | 'monthly'; interval?: number; interval_days?: number } | null
  }): Promise<ScheduledDispatch> {
    return this.post<ScheduledDispatch>('/scheduled-dispatches/agent-sessions', body)
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
    search?: string
    status?: string
    // Product surface filter. Defaults server-side to 'enterprise', which
    // excludes workforce-only agents. Use 'all' to include them.
    surface?: 'enterprise' | 'workforce' | 'all'
    limit?: number
    offset?: number
  }): Promise<AgentRegistryEntry[]> {
    const raw = await this.get<{ data: AgentRegistryEntry[]; paging: Paging } | AgentRegistryEntry[]>(
      '/agents/registry',
      { params: params as Record<string, string> }
    )
    return Array.isArray(raw) ? raw : raw.data
  }

  async getAgentDetail(agentId: string): Promise<AgentRegistryEntry> {
    return this.get<AgentRegistryEntry>(`/agents/registry/${encodeURIComponent(agentId)}`)
  }

  async getBuiltinSubagents(): Promise<
    Array<{ id: string; name: string; description: string; categories: string[]; source: string }>
  > {
    return this.get('/agents/builtins')
  }

  async getAgentSkills(agentId: string): Promise<{
    agent_id: string
    source: string
    skills: Array<{
      skill_id: string
      name: string
      description: string
      status: string
      version?: number | null
      follow_latest?: boolean
      published_version?: number | null
      current_version?: number
      enabled?: boolean
    }>
    skill_bindings?: Array<{
      skill_id: string
      name: string
      description: string
      status: string
      version?: number | null
      follow_latest?: boolean
      published_version?: number | null
      current_version?: number
      enabled?: boolean
    }>
  }> {
    return this.get(`/agents/registry/${encodeURIComponent(agentId)}/skills`)
  }

  async setAgentSkills(
    agentId: string,
    skillIdsOrBindings: string[] | SkillBinding[]
  ): Promise<{ agent_id: string; skill_ids: string[]; skill_bindings?: SkillBinding[]; count: number }> {
    const payload =
      Array.isArray(skillIdsOrBindings) && skillIdsOrBindings.length > 0 && typeof skillIdsOrBindings[0] === 'object'
        ? { skill_bindings: skillIdsOrBindings as SkillBinding[] }
        : { skill_ids: skillIdsOrBindings as string[] }
    return this.put(`/agents/registry/${encodeURIComponent(agentId)}/skills`, payload)
  }

  /**
   * Fetch the intranet policies attached to an agent. Titles are
   * best-effort: when the gravity-platform GraphQL gateway is
   * unreachable the backend falls back to ``title = policy_id`` so the
   * UI always has something to render.
   */
  async getAgentPolicies(agentId: string): Promise<{
    agent_id: string
    source: string
    /** False for agents whose ODM does not store per-agent policy refs
     *  (e.g. AutonomousAgentODM). The UI should hide the Policies section
     *  in that case and fall back to workspace-level default policies. */
    supported?: boolean
    policies: Array<{ policy_id: string; title: string }>
    excluded_policy_refs?: string[]
  }> {
    return this.get(`/agents/registry/${encodeURIComponent(agentId)}/policies`)
  }

  /**
   * Replace the agent's policy allow-list. Each ref must be an intranet
   * ContentEntry uuid (the backend rejects non-uuid input with 422).
   */
  async setAgentPolicies(
    agentId: string,
    policyRefs: string[],
    excludedPolicyRefs: string[] = []
  ): Promise<{ agent_id: string; policy_refs: string[]; excluded_policy_refs: string[]; count: number }> {
    return this.put(`/agents/registry/${encodeURIComponent(agentId)}/policies`, {
      policy_refs: policyRefs,
      excluded_policy_refs: excludedPolicyRefs
    })
  }

  /**
   * Fetch the WORKSPACE-LEVEL default policies — the always-on baseline
   * that applies to every deep agent run in the workspace. When
   * ``workspaceId`` is omitted the backend resolves the default
   * workspace. Titles and updatedAt are sourced from the stored
   * ``policy_meta`` field (written at the same time as ``policy_refs``)
   * so the response never requires a GraphQL round-trip.
   */
  async getWorkspacePolicies(workspaceId?: string): Promise<{
    workspace_id: string | null
    workspace_name: string | null
    policies: Array<{ policy_id: string; title: string; updated_at?: string }>
  }> {
    const params = workspaceId ? { workspaceId } : undefined
    return this.get('/agents/workspace-policies', { params })
  }

  /**
   * Replace the workspace-level default policies. Each policy entry must
   * carry its title (and optionally updatedAt) from the intranet picker so
   * the backend can store display metadata without a GraphQL call.
   * The backend rejects non-uuid ``policy_id`` values with 422.
   */
  async setWorkspacePolicies(
    policies: Array<{ policy_id: string; title: string; updated_at?: string }>,
    workspaceId?: string
  ): Promise<{
    workspace_id: string
    workspace_name: string
    policies: Array<{ policy_id: string; title: string; updated_at?: string }>
    count: number
  }> {
    const path = workspaceId
      ? `/agents/workspace-policies?workspaceId=${encodeURIComponent(workspaceId)}`
      : '/agents/workspace-policies'
    return this.put(path, { policies })
  }

  async archiveAgent(agentId: string): Promise<{ agent_id: string; source: string; status: string }> {
    return this.post(`/agents/registry/${encodeURIComponent(agentId)}/archive`, {})
  }

  async activateAgent(agentId: string): Promise<{ agent_id: string; source: string; status: string }> {
    return this.post(`/agents/registry/${encodeURIComponent(agentId)}/activate`, {})
  }

  async generateAgentAvatar(agentId: string): Promise<{
    agent_id: string
    source: string
    avatar: string
    model: string
    size: string
    quality: string
  }> {
    return this.post(`/agents/registry/${encodeURIComponent(agentId)}/avatar/generate`, {})
  }

  async updateAgentDetails(
    agentId: string,
    body: {
      name?: string
      description?: string
      tags?: string[]
      specialty?: string
      system_prompt?: string
      avatar?: string | null
    }
  ): Promise<{
    agent_id: string
    source: string
    name: string
    display_name: string
    description: string
    tags?: string[]
    specialty?: string | null
    avatar?: string | null
  }> {
    return this.patch(`/agents/registry/${encodeURIComponent(agentId)}`, body)
  }

  async clearAgentAvatar(agentId: string): Promise<{
    agent_id: string
    source: string
    name: string
    display_name: string
    description: string
    tags?: string[]
    specialty?: string | null
    avatar?: string | null
  }> {
    return this.updateAgentDetails(agentId, { avatar: null })
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

  // --- Scheduled Dispatches ---

  /**
   * List scheduled task dispatches for the authenticated user.
   * By default returns only pending/firing dispatches.
   * Set includeAll=true to fetch all statuses.
   */
  async getScheduledDispatches(params?: {
    status?: DispatchStatus | null
    includeAll?: boolean
    limit?: number
    offset?: number
  }): Promise<ScheduledDispatchPage> {
    return this.get<ScheduledDispatchPage>('/scheduled-dispatches', {
      params: params as Record<string, any>
    })
  }

  /**
   * Cancel a pending scheduled dispatch by its dispatch_id.
   * Returns void on success (204). Throws on 404 (not found) or 409 (not cancellable).
   */
  async cancelScheduledDispatch(dispatchId: string): Promise<void> {
    await this.delete<void>(`/scheduled-dispatches/${encodeURIComponent(dispatchId)}`)
  }

  /**
   * Permanently delete a scheduled dispatch regardless of status.
   * Used to remove finished (fired/cancelled/failed) tasks from the list.
   */
  async deleteScheduledDispatch(dispatchId: string): Promise<void> {
    await this.delete<void>(`/scheduled-dispatches/${encodeURIComponent(dispatchId)}`, {
      params: { hard: true }
    })
  }

  async updateScheduledDispatch(
    dispatchId: string,
    body: {
      scheduledAt?: string
      timezone?: string
      recurrence?: Record<string, unknown> | null
      enabled?: boolean
      title?: string
      task?: string
    }
  ): Promise<ScheduledDispatch> {
    return this.patch<ScheduledDispatch>(`/scheduled-dispatches/${encodeURIComponent(dispatchId)}`, body)
  }

  async retryScheduledDispatch(dispatchId: string): Promise<ScheduledDispatch> {
    return this.post<ScheduledDispatch>(`/scheduled-dispatches/${encodeURIComponent(dispatchId)}/retry`, {})
  }

  // --- Workforce Agents ---
  //
  // A Workforce Agent is an existing AutonomousAgentODM record marked with
  // surfaces=["workforce"] and a workforce_profile sub-doc. The same agent
  // identity, skills, and policies are reused from the Enterprise surface;
  // only Workforce-only concerns (autonomy, triggers, runs view) live here.

  async listWorkforceAgents(params?: {
    status?: Exclude<WorkforceAgentStatus, 'archived'>
    limit?: number
    offset?: number
  }): Promise<WorkforceAgentPage> {
    return this.get<WorkforceAgentPage>('/workforce/agents', {
      params: params as Record<string, string>
    })
  }

  async createWorkforceAgent(body: WorkforceAgentCreateInput): Promise<WorkforceAgent> {
    return this.post<WorkforceAgent>('/workforce/agents', body)
  }

  // Adds a Workforce deployment to an EXISTING agent (by PromptODM id). Keeps
  // the same record — and therefore the same id, triggers, runs, and ledger —
  // adding the workforce surface + profile. Created paused for review.
  async deployWorkforce(agentId: string, body: WorkforceDeployInput): Promise<WorkforceAgent> {
    return this.post<WorkforceAgent>(`/workforce/agents/${encodeURIComponent(agentId)}/deploy`, body)
  }

  async getWorkforceAgent(agentId: string): Promise<WorkforceAgent> {
    return this.get<WorkforceAgent>(`/workforce/agents/${encodeURIComponent(agentId)}`)
  }

  async updateWorkforceAgent(agentId: string, body: WorkforceAgentUpdateInput): Promise<WorkforceAgent> {
    return this.patch<WorkforceAgent>(`/workforce/agents/${encodeURIComponent(agentId)}`, body)
  }

  async activateWorkforceAgent(agentId: string): Promise<WorkforceAgent> {
    return this.post<WorkforceAgent>(`/workforce/agents/${encodeURIComponent(agentId)}/activate`, {})
  }

  async pauseWorkforceAgent(agentId: string): Promise<WorkforceAgent> {
    return this.post<WorkforceAgent>(`/workforce/agents/${encodeURIComponent(agentId)}/pause`, {})
  }

  // Soft-deletes the agent. Backend marks ``archived_at`` on the
  // workforce profile and pauses the agent, but keeps the underlying
  // AutonomousAgentODM record intact and recoverable via
  // ``restoreWorkforceAgent``. Chat / Agent Mesh usage is unaffected.
  async archiveWorkforceAgent(agentId: string): Promise<WorkforceAgent> {
    return this.post<WorkforceAgent>(`/workforce/agents/${encodeURIComponent(agentId)}/archive`, {})
  }

  // Reverses ``archiveWorkforceAgent``. The agent comes back paused so
  // the operator must explicitly re-activate it.
  async restoreWorkforceAgent(agentId: string): Promise<WorkforceAgent> {
    return this.post<WorkforceAgent>(`/workforce/agents/${encodeURIComponent(agentId)}/restore`, {})
  }

  async listWorkforceTriggers(agentId: string): Promise<WorkforceTrigger[]> {
    return this.get<WorkforceTrigger[]>(`/workforce/agents/${encodeURIComponent(agentId)}/triggers`)
  }

  async createWorkforceTrigger(agentId: string, body: WorkforceTriggerCreateInput): Promise<WorkforceTrigger> {
    return this.post<WorkforceTrigger>(`/workforce/agents/${encodeURIComponent(agentId)}/triggers`, body)
  }

  async updateWorkforceTrigger(triggerId: string, body: WorkforceTriggerUpdateInput): Promise<WorkforceTrigger> {
    return this.patch<WorkforceTrigger>(`/workforce/triggers/${encodeURIComponent(triggerId)}`, body)
  }

  async deleteWorkforceTrigger(triggerId: string): Promise<void> {
    await this.delete<void>(`/workforce/triggers/${encodeURIComponent(triggerId)}`)
  }

  // Runs are DeepAgentSession records filtered by workforce_agent_id;
  // the response uses session_id as the canonical run identifier.
  //
  // Phase A extends the optional params with source/since/until/q so the
  // Runs and Inbox tabs can scope and search server-side instead of
  // pulling everything to the browser.
  async listWorkforceRuns(agentId: string, params?: WorkforceRunListParams): Promise<WorkforceRunPage> {
    return this.get<WorkforceRunPage>(`/workforce/agents/${encodeURIComponent(agentId)}/runs`, {
      params: this.normalizeRunListParams(params)
    })
  }

  // Convert `undefined`s to dropped keys (Axios serialises `undefined` as
  // empty strings) and coerce numbers/dates so all callers get a stable
  // shape regardless of how they typed the inputs.
  private normalizeRunListParams(params?: WorkforceRunListParams): Record<string, string> | undefined {
    if (!params) return undefined
    const out: Record<string, string> = {}
    if (params.status) out.status = params.status
    if (params.source) out.source = params.source
    if (params.since) out.since = params.since
    if (params.until) out.until = params.until
    if (params.q) out.q = params.q
    if (typeof params.limit === 'number') out.limit = String(params.limit)
    if (typeof params.offset === 'number') out.offset = String(params.offset)
    return Object.keys(out).length > 0 ? out : undefined
  }

  async getWorkforceRun(sessionId: string): Promise<WorkforceRun> {
    return this.get<WorkforceRun>(`/workforce/runs/${encodeURIComponent(sessionId)}`)
  }

  // Snapshot of every live (non-terminal) workforce run, optionally scoped to
  // a workspace. Used for the "who is working now" overview strip and as the
  // initial state / fallback for the active-runs SSE.
  async listActiveWorkforceRuns(workspaceId = '', limit = 100): Promise<WorkforceActiveOverview> {
    const params: Record<string, string> = { limit: String(limit) }
    if (workspaceId) params.workspaceId = workspaceId
    return this.get<WorkforceActiveOverview>('/workforce/active', { params })
  }

  // Immutable audit trail (who / when / why) for a run, read from the generic
  // deep_agent_audit_log. Powers the run backtrace's audit timeline view.
  async getWorkforceRunAudit(sessionId: string, limit = 200): Promise<WorkforceAuditPage> {
    return this.get<WorkforceAuditPage>(`/workforce/runs/${encodeURIComponent(sessionId)}/audit`, {
      params: { limit: String(limit) }
    })
  }

  // Fires a manual run on behalf of the operator. The backend creates a
  // DeepAgentSession attributed to the agent and launches it in the
  // background; the response is the initial "running" run record.
  async startWorkforceRun(agentId: string, body: WorkforceRunCreateInput): Promise<WorkforceRun> {
    return this.post<WorkforceRun>(`/workforce/agents/${encodeURIComponent(agentId)}/runs`, body)
  }

  /** Debug/testing: fire an inbound_email trigger from a normalized email payload. */
  async dispatchWorkforceInboundEmail(body: WorkforceInboundEmailPayload): Promise<WorkforceInboundDispatchResponse> {
    return this.post<WorkforceInboundDispatchResponse>('/workforce/inbound-email', body)
  }

  /** Operator test dispatch for a webhook trigger (authenticated). */
  async dispatchWorkforceTestWebhook(
    triggerId: string,
    body: WorkforceWebhookTestPayload
  ): Promise<WorkforceInboundDispatchResponse> {
    return this.post<WorkforceInboundDispatchResponse>(
      `/workforce/triggers/${encodeURIComponent(triggerId)}/test-webhook`,
      body
    )
  }

  // --- Workforce Agents: credit metrics (Phase 6) ---
  //
  // Metrics aggregate immutable rows in the WorkforceCreditLedger collection,
  // which is written when a workforce-attributed DeepAgentSession reaches a
  // terminal state. The frontend uses these endpoints instead of N+1 per-agent
  // run fetches for KPIs.

  async getWorkforceAgentMetrics(
    agentId: string,
    window: WorkforceMetricsWindow = 'week'
  ): Promise<WorkforceAgentMetrics> {
    return this.get<WorkforceAgentMetrics>(`/workforce/agents/${encodeURIComponent(agentId)}/metrics`, {
      params: { window }
    })
  }

  // Phase A: bundled today / week / month + per-source breakdown for the
  // per-agent Overview tab. Saves three or four parallel metrics calls.
  async getWorkforceAgentMetricsSummary(agentId: string): Promise<WorkforceAgentMetricsSummary> {
    return this.get<WorkforceAgentMetricsSummary>(`/workforce/agents/${encodeURIComponent(agentId)}/metrics/summary`)
  }

  // ``slaTargetMs`` lets the client define the SLA target (a product/UX
  // decision); the backend measures attainment against it in the business
  // block. Omitted/0 means "no SLA target" and attainment stays 0.
  async getWorkforceWorkspaceMetrics(
    workspaceId: string,
    window: WorkforceMetricsWindow = 'week',
    slaTargetMs = 0
  ): Promise<WorkforceWorkspaceMetrics> {
    const params: Record<string, string> = { workspaceId, window }
    if (slaTargetMs > 0) params.slaTargetMs = String(slaTargetMs)
    return this.get<WorkforceWorkspaceMetrics>('/workforce/metrics', { params })
  }

  async listWorkforceLedger(
    agentId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<WorkforceLedgerPage> {
    return this.get<WorkforceLedgerPage>(`/workforce/agents/${encodeURIComponent(agentId)}/ledger`, {
      params: params as Record<string, string>
    })
  }

  /** Fire a scheduled dispatch immediately without waiting for its scheduled time.
   *  Recurring schedules keep their next occurrence unchanged. */
  async runScheduledDispatchNow(dispatchId: string): Promise<ScheduledDispatch> {
    return this.post<ScheduledDispatch>(`/scheduled-dispatches/${encodeURIComponent(dispatchId)}/run-now`, {})
  }

  // --- Scheduled Task Templates ---

  /** List built-in (system) templates plus the current user's own templates. */
  async getScheduledTaskTemplates(): Promise<ScheduledTaskTemplate[]> {
    return this.get<ScheduledTaskTemplate[]>('/scheduled-task-templates')
  }

  /** Create a personal template the current user can reuse later. */
  async createScheduledTaskTemplate(body: {
    title: string
    task: string
    description?: string
    icon?: string
    defaultFrequency?: ScheduledTaskFrequency
    defaultTime?: string
    defaultWeekday?: number | null
  }): Promise<ScheduledTaskTemplate> {
    return this.post<ScheduledTaskTemplate>('/scheduled-task-templates', body)
  }

  /** Delete a personal template. System templates cannot be deleted (403). */
  async deleteScheduledTaskTemplate(templateId: string): Promise<void> {
    await this.delete<void>(`/scheduled-task-templates/${encodeURIComponent(templateId)}`)
  }

  // --- Agent Marketplace ---

  async listMarketplacePackages(params?: {
    category?: string
    isActive?: boolean
    limit?: number
    offset?: number
  }): Promise<MarketplacePackagePage> {
    const query: Record<string, string | number | boolean> = {}
    if (params?.category) query.category = params.category
    if (params?.isActive !== undefined) query.isActive = params.isActive
    if (params?.limit !== undefined) query.limit = params.limit
    if (params?.offset !== undefined) query.offset = params.offset
    return this.get<MarketplacePackagePage>('/marketplace/packages', { params: query })
  }

  async getMarketplacePackage(packageId: string, version?: string): Promise<MarketplacePackageSummary> {
    const params = version ? { version } : undefined
    return this.get<MarketplacePackageSummary>(`/marketplace/packages/${encodeURIComponent(packageId)}`, { params })
  }

  async getMarketplacePackageBundle(packageId: string, version?: string): Promise<{ bundle: AgentPackageV1 }> {
    const params = version ? { version } : undefined
    return this.get<{ bundle: AgentPackageV1 }>(`/marketplace/packages/${encodeURIComponent(packageId)}/bundle`, {
      params
    })
  }

  async buildMarketplacePackage(body: {
    agentId: string
    packageId?: string
    publisher?: string
    category?: string
    publish?: boolean
  }): Promise<{ bundle: AgentPackageV1; published?: MarketplacePackageSummary | null }> {
    return this.post('/marketplace/packages/build', body)
  }

  async publishMarketplacePackage(
    packageId: string,
    body: { bundle: AgentPackageV1; version?: string }
  ): Promise<{ success: boolean; package: MarketplacePackageSummary }> {
    return this.post(`/marketplace/packages/${encodeURIComponent(packageId)}/publish`, body)
  }

  async marketplaceUnpublish(
    packageId: string,
    version?: string
  ): Promise<{ success: boolean; package: MarketplacePackageSummary }> {
    const params = version ? { version } : undefined
    return this.post(`/marketplace/packages/${encodeURIComponent(packageId)}/unpublish`, undefined, { params })
  }

  async marketplacePreflight(body: MarketplacePreflightRequest): Promise<MarketplacePreflightReport> {
    return this.post<MarketplacePreflightReport>('/marketplace/preflight', body)
  }

  async marketplaceInstall(body: MarketplaceInstallRequest): Promise<MarketplaceBatchInstallReport> {
    return this.post<MarketplaceBatchInstallReport>('/marketplace/install', body)
  }
}

export interface WorkforceInboundEmailPayload {
  to: string
  from: string
  subject: string
  body: string
  message_id?: string | null
}

export interface WorkforceWebhookTestPayload {
  subject?: string
  body: string
}

export interface WorkforceInboundDispatchResponse {
  session_id: string | null
  trigger_id: string
  accepted: boolean
  reason?: string | null
}

export const promptManagerClient = new PromptManagerClient()

/** Client pointed at an arbitrary tenant deployment (push-to-tenant). */
export function createTargetPromptManagerClient(baseUrl: string, accessToken: string): PromptManagerClient {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const apiBase = normalizedBase.includes('/api/v1') ? normalizedBase : `${normalizedBase}/api/v1`
  const client = new PromptManagerClient(apiBase)
  client.setAccessToken(accessToken)
  return client
}

export interface MarketplaceRequirementsSummary {
  flowbot_tools?: number
  builtin_tools?: number
  custom_functions?: number
  skills?: number
  needs_credentials?: boolean
  needs_connections?: boolean
}

export interface MarketplacePackageSummary {
  package_id: string
  version: string
  name: string
  description: string
  category: string
  icon?: string | null
  publisher: string
  skill_count: number
  tool_count: number
  requirements_summary?: MarketplaceRequirementsSummary
  install_count: number
  rating?: number | null
  is_active: boolean
  source_agent_id?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface MarketplacePackagePage {
  data: MarketplacePackageSummary[]
  paging: Paging
}

export interface AgentPackageV1 {
  manifest: {
    package_id: string
    version: string
    name: string
    description: string
    publisher: string
    category: string
    icon?: string | null
  }
  agent: Record<string, unknown>
  skills: Array<Record<string, unknown>>
  skill_bindings: SkillBinding[]
  functions: Array<Record<string, unknown>>
  policies: Array<Record<string, unknown>>
  requirements: {
    flowbot_tool_refs?: string[]
    builtin_tool_refs?: string[]
    custom_functions?: string[]
    required_credentials?: string[]
    required_connection_bindings?: string[]
  }
}

export interface MarketplacePreflightRequest {
  bundle?: AgentPackageV1
  packageId?: string
  catalogUrl?: string
  version?: string
  strict?: boolean
}

export interface MarketplacePreflightIssue {
  code: string
  severity: 'error' | 'warning' | 'info'
  message: string
  resource?: string | null
}

export interface MarketplacePreflightReport {
  package_id: string
  package_name: string
  ready: boolean
  issues: MarketplacePreflightIssue[]
  missing_tools: string[]
  missing_functions: string[]
  needs_configuration: string[]
}

export interface MarketplaceInstallRequest {
  bundles?: AgentPackageV1[]
  packageIds?: string[]
  catalogUrl?: string
  version?: string
  skipPreflightErrors?: boolean
}

export interface MarketplaceInstallAction {
  resource_type: string
  resource_id: string
  action: 'created' | 'updated' | 'skipped' | 'failed'
  detail?: string | null
}

export interface MarketplaceInstallReport {
  package_id: string
  package_name: string
  success: boolean
  agent_id?: string | null
  actions: MarketplaceInstallAction[]
  needs_configuration: string[]
  errors: string[]
}

export interface MarketplaceBatchInstallReport {
  total: number
  succeeded: number
  failed: number
  reports: MarketplaceInstallReport[]
}

// --- Scheduled Dispatches ---

export type DispatchStatus = 'pending' | 'firing' | 'fired' | 'cancelled' | 'failed'

export interface ScheduledDispatch {
  dispatchId: string
  title: string
  message: string
  assigneeUserIds: string[]
  blinkGroupId: string
  scheduledAt: string // ISO UTC datetime
  timezone: string // IANA timezone (display only)
  status: DispatchStatus
  createdAt: string
  firedAt?: string | null
  workflowIds: string[]
  retryCount: number
  error?: string | null
  kind?: 'task_notification' | 'agent_session'
  agentTask?: string | null
  workspaceId?: string | null
  createdSessionId?: string | null
  recurrence?: Record<string, unknown> | null
  runHistory?: { session_id?: string; triggered_at?: string; scheduled_at?: string; status?: string }[]
}

export interface ScheduledDispatchPage {
  data: ScheduledDispatch[]
  total: number
}

export type ScheduledTaskFrequency = 'daily' | 'weekly' | 'monthly'

export interface ScheduledTaskTemplate {
  templateId: string
  title: string
  description: string
  /** Icon key mapped to a Phosphor icon in the UI. */
  icon: string
  /** Agent task prompt run on each recurrence. */
  task: string
  defaultFrequency: ScheduledTaskFrequency
  /** HH:MM (24h), interpreted in the user's local timezone. */
  defaultTime: string
  /** 0=Mon .. 6=Sun, used for weekly defaults. */
  defaultWeekday?: number | null
  kind: 'agent_session' | 'task_notification'
  /** True for built-in templates (shown to everyone, not deletable). */
  isSystem: boolean
  sortOrder: number
}
