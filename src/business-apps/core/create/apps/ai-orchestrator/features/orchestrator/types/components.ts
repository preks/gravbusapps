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
  screenType: 'form' | 'list' | 'dashboard' | 'detail'
  name: string
  title: string
  description?: string
  entityType?: string
  fields?: Array<Record<string, unknown>>
  filters?: Array<Record<string, unknown>>
  charts?: Array<Record<string, unknown>>
  actions?: Array<Record<string, unknown>>
}

// Specification for building an AI agent/task expert
export interface AgentSpec {
  name: string
  description: string
  systemPrompt: string
  userPromptTemplate: string
  tools: string[]
  agentType: 'flow' | 'everyai' | 'general'
  modelId?: string
  specialty?: string
  responseStyle: 'formal' | 'conversational' | 'technical'
  citationMode: 'always' | 'when_needed' | 'never'
  responseSchema?: Record<string, unknown>
  knowledgeSources?: Array<Record<string, unknown>>
  tags: string[]
}

// Specification for building a serverless function/tool
export interface FunctionSpec {
  name: string
  description: string
  sourceCode: string
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  agentEnabled: boolean
  workflowEnabled: boolean
  config: Record<string, string>
}

// Specification for a single step in a flow
export interface FlowStepSpec {
  type: 'TASK' | 'APPROVAL' | 'INFORMATION' | 'ACKNOWLEDGE' | 'FUNCTION' | 'AI_TASK_EXPERT' | 'AI_AGENT'
  title: string
  message?: string
  form?: Array<Record<string, unknown>>
  assignmentMode: 'ASSIGN' | 'CLAIM'
  functionConfig?: Record<string, unknown>
  agentConfig?: Record<string, unknown>
  dueInMinutes?: number
}

// Specification for building a workflow/flow
export interface FlowSpec {
  name: string
  description: string
  flowType: 'TEMPLATE' | 'SELF_SERVICE'
  steps: FlowStepSpec[]
  triggerType?: 'manual' | 'webhook' | 'schedule' | 'event'
  triggerConfig?: Record<string, unknown>
  tags: Record<string, string>
}

// Specification for a field in a data model
export interface DataModelFieldSpec {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'reference' | 'select'
  label: string
  required: boolean
  options?: Array<string | { code: string; value: string }>
  referenceEntity?: string
}

// Specification for building a data model/entity
export interface DataModelSpec {
  name: string
  description: string
  modelType: 'entity' | 'catalog'
  identifier: string
  namespace: string // Namespace for custom data entities
  fields: DataModelFieldSpec[]
  initialEntries?: Array<Record<string, unknown>>
  relationships?: Array<Record<string, unknown>> // Entity relationships
}

// Generic component specification
export interface ComponentSpec {
  id: string
  type: ComponentType
  name: string
  description: string
  userFriendlyDescription?: string
  status: BuildStatus
  dependencies: string[]

  // Type-specific specs (only one will be populated based on type)
  screenSpec?: ScreenSpec
  agentSpec?: AgentSpec
  functionSpec?: FunctionSpec
  flowSpec?: FlowSpec
  dataModelSpec?: DataModelSpec

  // Discovery fields - for reusing existing resources
  existingId?: string // If found, use this instead of creating new
  reuseExisting?: boolean // Flag to skip creation and reuse existing
  discoveryMatch?: string // How it was matched (exact_name, similar_name, etc.)

  // Build results
  createdId?: string
  errorMessage?: string
  buildStartedAt?: string
  buildCompletedAt?: string

  // Publish/deployment results
  resourceUrl?: string // URL path for the screen (e.g., /screens/user-profile)
  azureUrl?: string // Azure CDN URL where assets are deployed
  publishedFileCount?: number // Number of files published

  // Runtime metadata from backend
  metadata?: {
    sessionId?: string // AI Builder session ID for accessing generated files
    repoId?: string // Repository ID for the build
    resourceUrl?: string // Resource URL (may differ from top-level field)
    [key: string]: unknown // Additional dynamic metadata
  }
}
