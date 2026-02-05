/**
 * Component specification types for the AI Orchestrator.
 * Defines the structure for different types of components that can be built.
 */

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

// Component types that can be built by the orchestrator
export type ComponentType = 'screen' | 'agent' | 'function' | 'flow' | 'data_model'

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
  user_friendly_description?: string
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

  // Publish/deployment results
  resource_url?: string // URL path for the screen (e.g., /screens/user-profile)
  azure_url?: string // Azure CDN URL where assets are deployed
  published_file_count?: number // Number of files published
}
