/**
 * TypeScript types for the AI Orchestrator feature.
 *
 * These types mirror the Python Pydantic models in prompt-manager
 * for type-safe communication between frontend and backend.
 */

// Component types that can be built by the orchestrator
export type ComponentType = 'screen' | 'agent' | 'function' | 'flow' | 'data_model'

// Status of a component or overall build
export type BuildStatus =
  | 'pending'
  | 'analyzing'
  | 'discovering' // Resource discovery phase
  | 'building'
  | 'wiring' // Component wiring phase
  | 'completed'
  | 'error'
  | 'skipped'
  | 'reused' // Existing resource found and reused
  | 'cancelled'

// Current phase of the build process
export type BuildPhase = 'discovery' | 'building' | 'wiring' | 'complete'

// A question to clarify user intent before building
export interface ClarifyingQuestion {
  id: string
  question: string
  options?: string[] // If multiple choice
  required: boolean
  context?: string // Why this question is being asked
}

// Specification for building a screen/UI component
export interface ScreenSpec {
  screen_type: 'form' | 'list' | 'dashboard' | 'detail'
  name: string
  title: string
  description?: string
  entity_type?: string
  fields?: Array<Record<string, unknown>>
  filters?: Array<Record<string, unknown>>
  charts?: Array<Record<string, unknown>>
  actions?: Array<Record<string, unknown>>
}

// Specification for building an AI agent/task expert
export interface AgentSpec {
  name: string
  description: string
  system_prompt: string
  user_prompt_template: string
  tools: string[]
  agent_type: 'flow' | 'everyai' | 'general'
  specialty?: string
  response_style: 'formal' | 'conversational' | 'technical'
  citation_mode: 'always' | 'when_needed' | 'never'
  response_schema?: Record<string, unknown>
  knowledge_sources?: Array<Record<string, unknown>>
  tags: string[]
}

// Specification for building a serverless function/tool
export interface FunctionSpec {
  name: string
  description: string
  source_code: string
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
  agent_enabled: boolean
  workflow_enabled: boolean
  config: Record<string, string>
}

// Specification for a single step in a flow
export interface FlowStepSpec {
  type: 'TASK' | 'APPROVAL' | 'INFORMATION' | 'ACKNOWLEDGE' | 'FUNCTION' | 'AI_TASK_EXPERT' | 'AI_AGENT'
  title: string
  message?: string
  form?: Array<Record<string, unknown>>
  assignment_mode: 'ASSIGN' | 'CLAIM'
  function_config?: Record<string, unknown>
  agent_config?: Record<string, unknown>
  due_in_minutes?: number
}

// Specification for building a workflow/flow
export interface FlowSpec {
  name: string
  description: string
  flow_type: 'TEMPLATE' | 'SELF_SERVICE'
  steps: FlowStepSpec[]
  trigger_type?: 'manual' | 'webhook' | 'schedule' | 'event'
  trigger_config?: Record<string, unknown>
  tags: Record<string, string>
}

// Specification for a field in a data model
export interface DataModelFieldSpec {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'reference' | 'select'
  label: string
  required: boolean
  options?: Array<{ value: string; label: string }>
  reference_entity?: string
}

// Specification for building a data model/entity
export interface DataModelSpec {
  name: string
  description: string
  model_type: 'entity' | 'catalog'
  identifier: string
  namespace: string // Namespace for custom data entities
  fields: DataModelFieldSpec[]
  initial_entries?: Array<Record<string, unknown>>
  relationships?: Array<Record<string, unknown>> // Entity relationships
}

// Generic component specification
export interface ComponentSpec {
  id: string
  type: ComponentType
  name: string
  description: string
  status: BuildStatus
  dependencies: string[]

  // Type-specific specs (only one will be populated based on type)
  screen_spec?: ScreenSpec
  agent_spec?: AgentSpec
  function_spec?: FunctionSpec
  flow_spec?: FlowSpec
  data_model_spec?: DataModelSpec

  // Discovery fields - for reusing existing resources
  existing_id?: string // If found, use this instead of creating new
  reuse_existing?: boolean // Flag to skip creation and reuse existing
  discovery_match?: string // How it was matched (exact_name, similar_name, etc.)

  // Build results
  created_id?: string
  error_message?: string
  build_started_at?: string
  build_completed_at?: string
}

// Analysis of what needs to be built
export interface BuildAnalysis {
  summary: string
  intent: string
  complexity: 'simple' | 'moderate' | 'complex'
  requires_data_model: boolean
  requires_functions: boolean
  requires_agents: boolean
  requires_flows: boolean
  requires_screens: boolean
  notes?: string[]
}

// Complete build plan
export interface BuildPlan {
  job_id: string
  original_prompt: string
  analysis: BuildAnalysis
  components: ComponentSpec[]
  questions?: ClarifyingQuestion[]
  estimated_duration_seconds: number
  created_at: string
  status: BuildStatus
}

// Request to analyze a prompt
export interface AnalyzeRequest {
  prompt: string
  context?: Record<string, unknown>
  answers?: Record<string, string>
}

// Response from analyze endpoint
export interface AnalyzeResponse {
  success: boolean
  plan?: BuildPlan
  error?: string
}

// Request to execute a build plan
export interface ExecuteRequest {
  job_id: string
  plan?: BuildPlan
  skip_components?: string[]
}

// Event types for SSE progress events
export type ProgressEventType =
  // Discovery phase events
  | 'discovery_started'
  | 'discovery_complete'
  | 'component_reused'
  // Building phase events
  | 'build_started'
  | 'component_started'
  | 'component_progress'
  | 'component_completed'
  | 'component_error'
  // Wiring phase events
  | 'wiring_started'
  | 'wiring_progress'
  | 'wiring_completed'
  // Final event
  | 'build_complete'

// Progress event from SSE
export interface BuildProgressEvent {
  event_type: ProgressEventType
  job_id: string
  timestamp: string
  component_type?: ComponentType
  component_id?: string
  component_name?: string
  status: BuildStatus
  message: string
  progress_percent?: number
  created_id?: string
  error_details?: string

  // Summary for build_complete event
  total_components?: number
  completed_components?: number
  failed_components?: number
  skipped_components?: number
}

// Build job status
export interface BuildJobStatus {
  job_id: string
  status: BuildStatus
  original_prompt: string
  started_at?: string
  completed_at?: string
  components: ComponentSpec[]
  total_components: number
  completed_components: number
  failed_components: number
  skipped_components: number
  reused_components?: number // Components reused from existing resources
  current_component?: string
  current_phase?: BuildPhase // Current phase: discovery, building, wiring
  error?: string
}

// Component display information for tiles
export interface ComponentTileInfo {
  type: ComponentType
  icon: string
  title: string
  description: string
  status: BuildStatus
  items: Array<{
    id: string
    name: string
    status: BuildStatus
    createdId?: string
    error?: string
    reused?: boolean // Whether this item was reused from existing resource
    discoveryMatch?: string // How it was discovered (exact_name, similar_name, etc.)
  }>
  currentOperation?: string
  progressPercent?: number
  reusedCount?: number // Number of items reused from existing resources
}

// Tile state for the progress grid
export interface TileState {
  screen: ComponentTileInfo
  agent: ComponentTileInfo
  function: ComponentTileInfo
  flow: ComponentTileInfo
  data_model: ComponentTileInfo
}

// Orchestrator view state
export type OrchestratorViewState =
  | 'idle' // Waiting for user input
  | 'analyzing' // Analyzing prompt
  | 'review' // Showing build plan for review
  | 'discovering' // Discovering existing resources
  | 'building' // Building components
  | 'wiring' // Wiring components together
  | 'complete' // Build finished
  | 'error' // Error occurred

// Discovery result for a component
export interface DiscoveryResult {
  component_id: string
  component_type: ComponentType
  component_name: string
  found: boolean
  existing_id?: string
  match_type?: 'exact_name' | 'similar_name' | 'schema_match' | 'graphql_schema'
  match_confidence?: number // 0.0 to 1.0
  existing_resource_info?: Record<string, unknown>
}

// Summary of the discovery phase
export interface DiscoveryResults {
  job_id: string
  total_checked: number
  found_existing: number
  will_create: number
  results: DiscoveryResult[]
}

// Wiring update types
export interface AgentToolUpdate {
  agent_id: string
  agent_name: string
  add_tools: string[]
}

export interface FlowStepUpdate {
  step_index: number
  step_title: string
  function_id?: string
  agent_id?: string
  config_updates?: Record<string, unknown>
}

export interface FlowUpdate {
  flow_id: string
  flow_name: string
  step_updates: FlowStepUpdate[]
}

export interface ScreenUpdate {
  screen_id: string
  screen_name: string
  entity_binding?: string
  graphql_query?: string
  data_model_ids?: string[]
}

export interface WiringPlan {
  job_id: string
  agent_updates: AgentToolUpdate[]
  flow_updates: FlowUpdate[]
  screen_updates: ScreenUpdate[]
  summary: string
}
