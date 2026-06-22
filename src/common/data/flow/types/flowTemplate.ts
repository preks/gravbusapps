/**
 * Flow template types for defining workflow configurations
 */

// Flow template types for the frontend

export enum FlowStepType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  INFORMATION = 'INFORMATION',
  ACKNOWLEDGE = 'ACKNOWLEDGE',
  FUNCTION = 'FUNCTION',
  AI_AGENT = 'AI_AGENT',
  AI_TASK_EXPERT = 'AI_TASK_EXPERT',
  /** System step that writes to Custom Data (entity rows or the generic Flow Data store). */
  CUSTOM_DATA_MUTATION = 'CUSTOM_DATA_MUTATION'
}

/** Where a CUSTOM_DATA_MUTATION step writes: a typed custom entity, or the generic append-only Flow Data store. */
export type CustomDataTarget = 'ENTITY' | 'FLOW_DATA'

/** Operations supported by a CUSTOM_DATA_MUTATION step. */
export type CustomDataOperation = 'create' | 'update' | 'delete' | 'append'

/**
 * Configuration for a CUSTOM_DATA_MUTATION step. Values are expression strings
 * (e.g. {{$steps.step_0.output.formData.amount}}) resolved at execution time.
 */
export interface CustomDataStepConfig {
  /** ENTITY (typed custom-data entity) or FLOW_DATA (generic append-only store). Defaults to ENTITY. */
  target?: CustomDataTarget
  operation?: CustomDataOperation
  namespace?: string
  /** Public entity name (ENTITY target only). */
  entityName?: string
  /** Row id expression for update/delete (ENTITY target only). */
  rowId?: string
  /** field/key -> expression map written into the row or the Flow Data blob. */
  values?: Record<string, string>
  /** Optional logical grouping key for FLOW_DATA appends. */
  recordKey?: string
  /**
   * When true (ENTITY target only), the step is executed by a restricted AI agent
   * (flowbot) that only has the custom-data tools and decides create/update/delete
   * itself from the instructions. Operation/values/rowId are not used in this mode.
   */
  useAiAgent?: boolean
  /** Free-form instructions for the AI agent when useAiAgent is true. */
  instructions?: string
}

export enum InputType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  FILE = 'FILE',
  SIGNATURE = 'SIGNATURE'
}

export enum AssignmentMode {
  CLAIM = 'CLAIM',
  ASSIGN_SINGLE = 'ASSIGN_SINGLE',
  ASSIGN = 'ASSIGN',
  ASSIGN_DEFERRED = 'ASSIGN_DEFERRED'
}

export interface InputOption {
  value: string
  label: string
}

export interface DataSource {
  type: 'CATALOG' | 'CUSTOM_ENTITY' | 'API' | 'INTERNAL_ENTITY'
  catalog?: string
  entity?: string
  namespace?: string
  valueField?: string
  labelField?: string
}

export interface InputBlock {
  type: InputType
  name: string
  label: string
  required?: boolean
  options?: InputOption[]

  // Expression support
  value?: string // Expression-based default value (e.g., {{$steps.step_0.output.formData.field}})
  readOnly?: boolean // For reference fields
  dataSource?: DataSource // Catalog or entity data source
}

export enum SummaryFieldVisibility {
  PUBLIC = 'PUBLIC',
  WORKFLOW_PARTICIPANTS = 'WORKFLOW_PARTICIPANTS',
  STEP_PARTICIPANTS = 'STEP_PARTICIPANTS',
  INITIATOR_ONLY = 'INITIATOR_ONLY'
}

export interface SummaryField {
  id?: string // For React key management
  label: string
  value: string // Expression to resolve
  visibility: SummaryFieldVisibility
  type?: 'text' | 'date' | 'number' | 'currency' | 'boolean'
  format?: string
}

export interface Link {
  name: string
  url: string
  type?: string
}

export interface AssignmentTarget {
  users?: string[]
  organizationalUnits?: string[]
  matrixTeams?: string[]
  companies?: string[]
  siteLocations?: string[]
  costCenters?: string[]
  capabilities?: string[]
}

export type TaskAssignment = {
  targets: AssignmentTarget | null // Required in backend - null indicates runtime assignment
  assignmentMode: AssignmentMode // Required - CLAIM or ASSIGN mode
  allowReassignment?: boolean
}

export type StepKind = 'USER' | 'SYSTEM'

export interface FlowStep {
  id?: string
  title: string
  message?: string
  type: FlowStepType
  kind?: StepKind // USER for user tasks, SYSTEM for function/agent tasks
  dueInMinutes?: number
  form?: InputBlock[] // Backend uses 'form'
  inputs?: InputBlock[] // Legacy field for backward compatibility
  links?: Link[]
  assignment: TaskAssignment // Required to match backend API

  // Function step configuration (used when type === FUNCTION)
  functionConfig?: {
    functionId: string // ID of the function in NEWWORK Functions service
    version?: number // Optional specific version; latest if omitted
    inputExpressionMap?: Record<string, string> // key -> expression string
    outputExpressionMap?: Record<string, string> // key -> expression destination
  }

  // AI Task Expert configuration (used when type === AI_TASK_EXPERT)
  agentConfig?: {
    promptId: string // ID of the prompt/agent in Prompt Manager
    version?: number // Optional specific version; latest if omitted
    systemParamsMap?: Record<string, string> // System prompt parameters (key -> expression)
    userParamsMap?: Record<string, string> // User prompt parameters (key -> expression)
    outputExpressionMap?: Record<string, string> // Output mapping (key -> expression destination)
    modelSettings?: Record<string, any> // Optional model settings override
  }

  // Custom Data step configuration (used when type === CUSTOM_DATA_MUTATION)
  customDataConfig?: CustomDataStepConfig

  // Event subscriptions for reactive automation on this step
  eventSubscriptions?: EventSubscription[]
}

// Simplified init step for self-service flows
export interface InitStep {
  title: string
  message?: string
  links?: Link[]
  form?: InputBlock[] // Backend uses 'form'
  inputs?: InputBlock[] // Legacy field for backward compatibility
}

export interface FlowTemplate {
  id?: string
  type: 'TEMPLATE' | 'SELF_SERVICE'
  name: string
  description?: string
  version: number // Required to match backend API
  steps: FlowStep[]

  // Summary fields shown in workflow summary view
  summaryFields?: SummaryField[]

  // Self-service specific: simplified to just the init step
  initStep?: InitStep

  // Flow-level event subscriptions (cross-cutting defaults)
  eventSubscriptions?: EventSubscription[]
}

export interface ExecutionConfiguration {
  templateId: string
  userId: string
  inputs?: Record<string, any>
}

export enum TimeUnit {
  HOURS = 'HOURS',
  DAYS = 'DAYS'
}

export enum TimingType {
  AFTER = 'AFTER',
  BEFORE = 'BEFORE'
}

/**
 * Event subscription types for reactive automation
 */
export enum TaskEventType {
  TASK_COMMENT_CREATED = 'task.comment.created',
  TASK_ACTION_CREATED = 'task.action.created',
  TASK_ACTION_CLAIMED = 'task.action.claimed',
  TASK_ACTION_UNCLAIMED = 'task.action.unclaimed',
  TASK_ACTION_REASSIGNED = 'task.action.reassigned',
  TASK_ACTION_COMPLETED = 'task.action.completed',
  TASK_ACTION_REJECTED = 'task.action.rejected',
  TASK_CREATED = 'task.created',
  TASK_ASSIGNED = 'task.assigned',
  TASK_DUE_SOON = 'task.due_soon',
  TASK_OVERDUE = 'task.overdue'
}

export enum ActorKind {
  USER = 'USER',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
  EXTERNAL = 'EXTERNAL'
}

export enum EventHandlerType {
  TASK_EXPERT = 'TASK_EXPERT',
  FUNCTION = 'FUNCTION',
  NOTIFY = 'NOTIFY'
}

export enum CommentVisibility {
  INTERNAL_TASK = 'INTERNAL_TASK',
  INTERNAL_FLOW = 'INTERNAL_FLOW',
  EXTERNAL = 'EXTERNAL'
}

export interface EventSubscriptionFilters {
  commentVisibility?: CommentVisibility | CommentVisibility[]
  action?: string | string[]
  actorKind?: ActorKind | ActorKind[]
  source?: string | string[]
  exclude?: {
    actorKind?: ActorKind | ActorKind[]
    source?: string | string[]
  }
}

export interface TaskExpertHandlerConfig {
  type: EventHandlerType.TASK_EXPERT
  promptId: string
  version?: number
  systemParamsMap?: Record<string, string>
  userParamsMap?: Record<string, string>
  outputExpressionMap?: Record<string, string>
  modelSettings?: Record<string, any>
}

export interface FunctionHandlerConfig {
  type: EventHandlerType.FUNCTION
  functionId: string
  version?: number
  inputExpressionMap?: Record<string, string>
  outputExpressionMap?: Record<string, string>
}

export interface NotifyHandlerConfig {
  type: EventHandlerType.NOTIFY
  channels?: string[]
  channel?: string
  templateId?: string
  recipientsExpression?: string
  subjectExpression?: string
  bodyExpression?: string
  params?: Record<string, string>
}

export type EventHandlerConfig = TaskExpertHandlerConfig | FunctionHandlerConfig | NotifyHandlerConfig

export interface EventSubscription {
  id: string
  eventType: TaskEventType | string
  filters?: EventSubscriptionFilters
  handler: EventHandlerConfig
  enabled?: boolean
  description?: string
}
