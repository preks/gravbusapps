import { RestClient } from '../rest/RestClient'
import { FlowTags } from '@/business-apps/flow/types'
import { getFlowEngineApiBaseUrl } from './flowEngineUrl'

// Flow template types (matching backend)
export enum FlowStepType {
  TASK = 'TASK',
  APPROVAL = 'APPROVAL',
  INFORMATION = 'INFORMATION',
  ACKNOWLEDGE = 'ACKNOWLEDGE',
  DECISION = 'DECISION',
  FORK = 'FORK',
  JOIN = 'JOIN',
  FUNCTION = 'FUNCTION',
  AI_AGENT = 'AI_AGENT',
  AI_TASK_EXPERT = 'AI_TASK_EXPERT',
  CUSTOM_DATA_MUTATION = 'CUSTOM_DATA_MUTATION'
}

export enum InputType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  SELECT = 'SELECT',
  MULTISELECT = 'MULTISELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  NUMBER = 'NUMBER',
  FILE = 'FILE',
  SIGNATURE = 'SIGNATURE'
}

export enum AssignmentMode {
  CLAIM = 'CLAIM',
  ASSIGN_SINGLE = 'ASSIGN_SINGLE',
  ASSIGN = 'ASSIGN',
  ASSIGN_DEFERRED = 'ASSIGN_DEFERRED'
}

export enum FlowTriggerType {
  MANUAL_FORM = 'MANUAL_FORM',
  WEBHOOK = 'WEBHOOK',
  EVENT = 'EVENT',
  SCHEDULE = 'SCHEDULE',
  API_SCHEMA = 'API_SCHEMA'
}

export interface FlowTrigger {
  id: string
  type: FlowTriggerType
  name: string
  active?: boolean
  config: Record<string, any>
}

export interface FlowStartNodeConfiguration {
  form?: InputBlock[]
  triggers: FlowTrigger[]
}

export interface InputOption {
  value: string
  label: string
}

export interface InputBlock {
  type: InputType
  name: string
  label: string
  required?: boolean
  options?: InputOption[]
  // Expression support / dynamic defaults (used by visual builders)
  value?: string
  readOnly?: boolean
  dataSource?: {
    type: 'CATALOG' | 'ENTITY' | 'API' | 'CUSTOM_DATA'
    catalog?: string
    entity?: string
    namespace?: string
    key?: string
    valueField?: string
    labelField?: string
  }
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

export interface TaskAssignment {
  targets: AssignmentTarget | null // Required in backend - null indicates runtime assignment
  assignmentMode: AssignmentMode // Required - CLAIM, ASSIGN_SINGLE, ASSIGN, or ASSIGN_DEFERRED
  allowReassignment?: boolean
}

export type StepKind = 'USER' | 'SYSTEM'

export type DecisionMode = 'USER' | 'AI' | 'LOGIC'

export interface DecisionBranch {
  id: string
  label: string
  condition?: string
  targetStepReference?: string
  nextStep?: number
}

export interface FlowStep {
  id?: string
  type: FlowStepType | string
  /**
   * Optional stable reference used by visual editors (preferred over `id`).
   * In Flow Studio, this is typically the node id.
   */
  reference?: string
  kind?: StepKind
  title: string
  message?: string
  dueInMinutes?: number
  dueDate?: string // ISO date string for specific due date
  form?: InputBlock[] // Backend uses 'form'
  inputs?: InputBlock[] // Legacy field for backward compatibility
  links?: Link[]
  /**
   * Assignment configuration.
   * Required for USER task steps; omitted for control-flow steps (DECISION/FORK/JOIN) and some SYSTEM steps.
   */
  assignment?: TaskAssignment
  eventSubscriptions?: EventSubscription[] // Event subscriptions for reactive automation
  /**
   * Optional ordered list of custom states for this user task step.
   * Used for kanban-style boards and user-driven state transitions.
   */
  customStates?: string[]
  /**
   * Optional default priority to apply when tasks for this step are created.
   */
  defaultPriority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

  /**
   * Optional explicit next step index (control-flow aware).
   * - undefined: default to next step in array
   * - null: terminate workflow after this step
   */
  nextStep?: number | null

  // System task configuration
  functionConfig?: {
    functionId: string
    version?: number
    inputExpressionMap?: Record<string, string>
    outputExpressionMap?: Record<string, string>
  }
  agentConfig?: {
    promptId: string
    version?: number
    systemParamsMap?: Record<string, string>
    userParamsMap?: Record<string, string>
    outputExpressionMap?: Record<string, string>
    modelSettings?: Record<string, any>
  }
  aiAgentConfig?: {
    resultSchema?: Record<string, any>
  }

  // Decision step configuration
  decisionMode?: DecisionMode
  branches?: DecisionBranch[]
  defaultBranch?: string
  userConfig?: {
    userDecisionType?: 'APPROVAL' | 'CUSTOM'
    /** Optional title shown on the user task created by this decision */
    title?: string
    /** Optional message shown on the user task created by this decision */
    message?: string
    assignment: TaskAssignment
    options: Array<{ id: string; label: string }>
    timeoutMinutes?: number
    escalation?: {
      mode: 'USER'
      assignment: TaskAssignment
      timeoutMinutes?: number
      instructions?: string
    }
    /**
     * Approval rework: when enabled, the "Reject" outcome sends the flow back to a previous step.
     * Stored on the decision so editors can preserve the reject behavior across save/load.
     */
    rejectRework?: {
      targetNodeId?: string
      requireReason: boolean
      preserveData: boolean
      maxIterations?: number
    }
  }
  aiConfig?: {
    executor: 'EVERYAI' | 'TASK_EXPERT'
    promptId?: string
    policyDocumentId?: string
    policyDocumentTitle?: string
    policyDocumentVersion?: string
    instructions?: string
    humanInstructions: string
    mapping?: { conditions: Array<{ expression: string; branchId: string }> }
    reasoningPath?: string
    escalation: {
      mode: 'USER'
      assignment: TaskAssignment
      timeoutMinutes?: number
      instructions?: string
    }
  }
  logicConfig?: {
    conditions: Array<{ expression: string; branchId: string }>
  }

  // Parallel execution configuration
  parallelBranches?: Array<{ id: string; label: string; steps: string[] }>
  joinCondition?: 'ALL' | 'ANY'
  forkReference?: string

  // Rework / loop configuration
  reworkConfig?: {
    enabled: boolean
    targets: Array<{
      triggerAction: string
      targetStepReference: string
      requireReason: boolean
      preserveData: boolean
    }>
    maxIterations?: number
  }

  // Permission context (future runtime authorization)
  permissionContext?: {
    contextType: 'USER' | 'ORGANIZATIONAL_UNIT'
    organizationalUnitId?: string
    permissions: Array<'read' | 'write' | 'execute'>
  }

  // Simplified system task config in business mode
  simpleAIConfig?: {
    instruction: string
  }
}

// Event subscription types for reactive automation
export enum EventHandlerType {
  TASK_EXPERT = 'TASK_EXPERT',
  FUNCTION = 'FUNCTION',
  NOTIFY = 'NOTIFY'
}

export interface EventSubscription {
  id: string
  eventType: string
  filters?: Record<string, unknown>
  handler: {
    type: EventHandlerType
    promptId?: string
    functionId?: string
    channel?: string
    [key: string]: unknown
  }
  enabled?: boolean
  description?: string
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

  // Start node configuration (workflow triggers)
  start?: FlowStartNodeConfiguration

  // Optional flow-level summary fields (shown in results view)
  summaryFields?: any[]

  // Self-service specific: simplified to just the init step
  initStep?: InitStep

  // Tagging system for metadata-based querying
  tags?: FlowTags

  // Flow-level event subscriptions (cross-cutting defaults)
  eventSubscriptions?: EventSubscription[]
}

/**
 * Backend API response format
 */
interface ApiResponse<T> {
  status: 'success' | 'error'
  data: T
  count?: number
  totalCount?: number
  message?: string
}

/**
 * Client for Flow Template API operations
 */
export class FlowTemplateClient extends RestClient {
  constructor(accessToken: string) {
    const apiBaseUrl = getFlowEngineApiBaseUrl()
    super(`${apiBaseUrl}/templates`, {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    })
  }

  /**
   * Get all flow templates
   */
  async getTemplates(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/?limit=50')
    return response.data
  }

  /**
   * Get templates with pagination and search support
   * Maps to templateController.getAllTemplatesController in flow engine
   */
  async getTemplatesList(params?: {
    limit?: number
    offset?: number
    onlyLatest?: boolean
    includeDrafts?: boolean
    templateType?: 'TEMPLATE' | 'SELF_SERVICE'
    search?: string
    /**
     * Tag filters using Flow Engine query format: `tag.<key>=<value>`.
     * Example: `{ spaceId: '123', solution: 'compliance' }` -> `?tag.spaceId=123&tag.solution=compliance`
     */
    tags?: Record<string, string>
    /**
     * Backward compatibility (deprecated): older callers used `tagFilters`.
     * It is mapped to `tags` internally.
     */
    tagFilters?: Record<string, string>
  }): Promise<{
    templates: FlowTemplate[]
    totalCount: number
    limit: number
    offset: number
  }> {
    const searchParams = new URLSearchParams()

    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString())
    if (params?.offset !== undefined) searchParams.append('offset', params.offset.toString())
    if (params?.onlyLatest !== undefined) searchParams.append('onlyLatest', params.onlyLatest.toString())
    if (params?.includeDrafts !== undefined) searchParams.append('includeDrafts', params.includeDrafts.toString())
    if (params?.templateType) searchParams.append('templateType', params.templateType)
    if (params?.search?.trim()) searchParams.append('search', params.search.trim())
    const tags = params?.tags || params?.tagFilters
    if (tags) {
      Object.entries(tags).forEach(([key, value]) => {
        if (!key) return
        if (value === undefined || value === null) return
        const normalizedKey = key.startsWith('tag.') ? key.slice(4) : key
        searchParams.append(`tag.${normalizedKey}`, String(value))
      })
    }

    const url = searchParams.toString() ? `/?${searchParams.toString()}` : '/'
    const response = await this.get<ApiResponse<FlowTemplate[]>>(url)

    return {
      templates: response.data,
      totalCount: response.totalCount || response.data.length,
      limit: params?.limit || 20,
      offset: params?.offset || 0
    }
  }

  /**
   * Get a specific flow template by ID
   */
  async getTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.get<ApiResponse<FlowTemplate>>(`/${id}`)
    return response.data
  }

  /**
   * Create a new flow template
   */
  async createTemplate(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/', template)
    return response.data
  }

  /**
   * Update an existing flow template
   */
  async updateTemplate(id: string, template: Partial<FlowTemplate>): Promise<FlowTemplate> {
    const response = await this.put<ApiResponse<FlowTemplate>>(`/${id}`, template)
    return response.data
  }

  /**
   * Delete a flow template
   */
  async deleteTemplate(id: string): Promise<void> {
    await this.delete(`/${id}`)
  }

  /**
   * Publish a flow template
   */
  async publishTemplate(id: string): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>(`/${id}/publish`)
    return response.data
  }

  /**
   * Save template as draft
   */
  async saveDraft(template: Omit<FlowTemplate, 'id'>): Promise<FlowTemplate> {
    const response = await this.post<ApiResponse<FlowTemplate>>('/drafts', template)
    return response.data
  }

  /**
   * Get all draft templates
   */
  async getDrafts(): Promise<FlowTemplate[]> {
    const response = await this.get<ApiResponse<FlowTemplate[]>>('/drafts')
    return response.data
  }

  /**
   * Get template with metadata
   */
  async getTemplateWithMetadata(id: string): Promise<{
    template: FlowTemplate
    metadata: {
      createdAt: string
      updatedAt?: string
      isDraft: boolean
      originalTemplate?: FlowTemplate
      workflowDefinition?: any
    }
  }> {
    const response = await this.get<ApiResponse<any>>(`/${id}/metadata`)
    return response.data
  }

  /**
   * Execute/Launch a workflow from a template
   */
  async executeWorkflow(
    id: string,
    params: {
      initiator: string
      context?: any
      runtimeAssignments?: any
      inputValues?: any
      runtimeParameters?: any
    }
  ): Promise<{
    workflowId: string
    templateId: string
    workflowName: string
    input: any
  }> {
    const response = await this.post<ApiResponse<any>>(`/${id}/execute`, params)
    return response.data
  }

  /**
   * Execute a workflow from an inline template definition (no template creation).
   * Maps to POST /api/templates/execute-dynamic in Flow Engine.
   */
  async executeDynamicTemplate(params: {
    templateDefinition: Omit<FlowTemplate, 'id'>
    initiatorId: string
    stepAssignments?: any
  }): Promise<{
    workflowId: string
    workflowName: string
    version: number
    tags?: any
    isDynamic: true
    executionInput: any
  }> {
    const response = await this.post<ApiResponse<any>>(`/execute-dynamic`, params)
    return response.data
  }
}
