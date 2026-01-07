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
  AI_TASK_EXPERT = 'AI_TASK_EXPERT'
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
  ASSIGN = 'ASSIGN'
}

export interface InputOption {
  value: string
  label: string
}

export interface DataSource {
  type: 'CATALOG' | 'ENTITY' | 'API'
  catalog?: string
  entity?: string
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
