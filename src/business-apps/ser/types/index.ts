/**
 * Service Portal Types
 * Core domain types and UI-specific interfaces for Services+ platform
 * Based on Services+ Contract specifications
 */

// Flow template types for dynamic form generation
export * from './flowTemplate'

// Core domain types
export type StepReceiver =
  | 'HR'
  | 'IT'
  | 'Facilities'
  | 'Finance'
  | 'Procurement'
  | 'Legal'
  | 'Security'
  | 'AccessIdentity'
  | 'Workplace'
  | 'Fleet'
  | 'Data'
  | 'L&D'
  | 'Admin'

export type StepStatus =
  | 'SCHEDULED'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'FAILED'
  | 'PAUSED'
  | 'READY'
  | 'QUEUED'
  | 'RUNNING'
  | 'DONE'
  | 'ERROR'
  | 'CANCELLED'
  | 'SKIPPED'
  | 'TIMED_OUT'
  | 'CANCELED'
  | 'UNKNOWN'
export type TicketStatus = 'queued' | 'claimed' | 'in_progress' | 'waiting' | 'done' | 'canceled'

export type ServiceCategory = {
  id: string
  name: string
  icon?: string
  description?: string
  order: number
  catalogEntryId?: string // Original catalog entry ID for template filtering
}

export type StepDefinition = {
  id: string
  name: string
  receiver: StepReceiver
  parallelGroup?: string
  requires?: string[]
  slaHours?: number
  inputs?: Record<string, unknown>
}

export type ServiceRequestTemplate = {
  id: string
  categoryId: string
  key: string
  title: string
  description?: string
  formSchema: any
  uiSchema?: Record<string, unknown>
  steps: StepDefinition[]
  version: number
  enabled: boolean
}

export type Comment = {
  id: string
  stepId: string
  authorId: string
  authorName?: string
  createdAt: string
  body: string
  visibility: string // Comment visibility level (INTERNAL_TASK, INTERNAL_FLOW, EXTERNAL)
  action?: string // Action that triggered this comment (COMMENT, COMPLETE, REJECT, etc.)
}

export type FlowComment = {
  stepIndex: number
  stepTitle: string
  commentedBy: string
  commentedAt: string
  comment: string
  visibility: string
  action: string
}

export type StepInstance = {
  id: string
  defId: string
  name: string
  desk: StepReceiver
  status: StepStatus
  assignedToUserId?: string
  assignedToUserName?: string
  claimedByUserId?: string
  claimedByUserName?: string
  startedAt?: string
  updatedAt?: string
  finishedAt?: string
  comments: Comment[]
  requestId: string // backlink
  requesterId?: string // who originally requested the parent flow (for Service Desk display)
  requesterName?: string // name of the person who originally requested the parent flow

  // Flow-related fields from custom-flow-engine API response
  flowId?: string // Main workflow instance ID
  flowName?: string // Human-readable workflow name
  flowInitiatedBy?: string // UUID of the person who initiated the flow

  // Additional rich data fields for detailed display
  description?: string
  message?: string // Task message/description from custom-flow-engine
  expectedStartAt?: string
  expectedFinishAt?: string
  dueDate?: string
  inputs?: Array<{
    name: string
    type: string
    label: string
    required: boolean
    options?: Array<{ label: string; value: string }>
  }>
  links?: Array<{
    url: string
    name: string
    type: string
  }>
  assignmentMode?: string
  allowReassignment?: boolean

  // Available actions from custom-flow-engine
  availableActions?: {
    canClaim: boolean
    canUnclaim: boolean
    canComplete: boolean
    canReassign: boolean
    canReject: boolean
    canComment: boolean
  }

  // Form data submitted when completing the task
  formData?: Record<string, any>
}

export type SubmittedRequest = {
  id: string
  templateId: string
  templateVersion: number
  requesterId: string
  createdAt: string
  status: 'open' | 'in_progress' | 'completed' | 'canceled'
  titleSnapshot: string
  categoryIdSnapshot: string
  formData: any
  steps: StepInstance[]
  timeline: Array<{ at: string; message: string }>

  // Additional progress fields for rich display
  progress?: {
    currentStep: number
    totalSteps: number
    completedSteps: number
    percentage: number
  }

  // Original flow steps for workflow visualization (preserves titles and raw data)
  originalSteps?: any[]
  currentStep?: number
  totalSteps?: number
  completedSteps?: number
  progressPercentage?: number
}

/**
 * Workflow Engine Interface
 * Provides abstraction for workflow operations
 * Initial implementation: MockWorkflowEngineAdapter
 * Future implementation: ConductorWorkflowEngineAdapter
 */
export interface WorkflowEngine {
  startRequest(templateKey: string, formData: any): Promise<string>
  getRequest(requestId: string): Promise<SubmittedRequest>
  getMyRequests(): Promise<SubmittedRequest[]>
  getMyRequestsCount(): Promise<number>
  getDeskTickets(desk: StepReceiver): Promise<StepInstance[]>
  claim(stepId: string): Promise<void>
  assign(stepId: string, userId: string): Promise<void>
  advance(stepId: string, payload?: any): Promise<void>
  comment(stepId: string, userId: string, body: string, visibility?: string): Promise<Comment>
  getTaskStepComments(taskId: string): Promise<{ comments: any[]; totalComments: number }> // ✅ NEW: Get comments for task step

  // ✅ NEW: Flow-level comment methods
  getFlowComments(flowId: string): Promise<FlowComment[]>
  postFlowComment?(
    flowId: string,
    userId: string,
    comment: string,
    visibility?: string,
    stepIndex?: number
  ): Promise<Comment>

  // ✅ NEW: Two-step template execution (execute template + complete first task with form data)
  executeTemplate?(templateId: string, formData: any): Promise<string>

  // ✅ NEW: Get step data for a specific flow step
  getFlowStepData?(
    flowId: string,
    stepReference: string
  ): Promise<{
    data: Array<{
      flowId: string
      taskId: string
      userId: string
      userName: string
      timestamp: string
      stepTitle: string
      formData: any
    }>
    totalCount: number
    hasMore: boolean
    stepReference: string
    flowId: string
  }>

  // ✅ NEW: Get workflow summary with visibility filtering
  getFlowSummary?(
    flowId: string,
    userId: string
  ): Promise<{
    workflowId: string
    workflowName: string
    status: string
    initiator: string
    createdAt: string
    completedAt?: string
    progress?: number | { currentStep?: number; totalSteps?: number; completedSteps?: number; percentage?: number }
    summaryData: Array<{
      label: string
      value: any
      type?: string
      format?: string
      visibility?: string
    }>
  }>
}

// Analytics event types
export type ServicesAnalyticsEvent =
  | 'services.request_submitted'
  | 'services.step_claimed'
  | 'services.step_completed'
  | 'services.comment_added'

export type AnalyticsPayload = {
  event: ServicesAnalyticsEvent
  data: Record<string, unknown>
  timestamp: string
}

// UI-specific extensions
export interface ServiceCatalogItem extends ServiceRequestTemplate {
  category: ServiceCategory
  isPopular?: boolean
  estimatedDuration?: string
  complexity?: 'low' | 'medium' | 'high'
}

export interface RequestListItem extends SubmittedRequest {
  categoryName: string
  currentStepInstance?: StepInstance
  estimatedCompletion?: string
}

export interface ServicePortalContextProps {
  accessToken: string
  workflowEngine: WorkflowEngine
  userId: string
  userRoles: string[]
  isServicesEnabled: boolean
}

// Form-related types
export interface DynamicFormProps {
  schema: any
  uiSchema?: Record<string, unknown>
  formData?: any
  onChange: (data: any) => void
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

// Navigation types
export type ServiceRoute = '/services' | '/services/my-requests' | '/services/requests'

// Table preferences types
export * from './tablePreferences'

// Manager analytics types
export * from './managerAnalytics'
