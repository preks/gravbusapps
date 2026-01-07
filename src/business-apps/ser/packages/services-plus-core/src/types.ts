/**
 * Core domain types for Services+ platform
 * Based on Services+ Contract specifications
 */

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

// Enhanced comment interface for flow-level comments
export type FlowComment = {
  stepIndex: number
  stepTitle: string
  comment: string
  commentedBy: string
  commentedByName?: string
  commentedAt: string
  action: string // COMPLETE, REJECT, COMMENT, etc.
}

// Task action types aligned with custom-flow-engine
export type TaskAction = 'CLAIM' | 'UNCLAIM' | 'ASSIGN' | 'REASSIGN' | 'COMPLETE' | 'REJECT' | 'COMMENT'

// Available actions for a task
export type AvailableActions = {
  canClaim: boolean
  canUnclaim: boolean
  canComplete: boolean
  canReassign: boolean
  canReject: boolean
  canComment: boolean
}

// Task statistics
export type TaskStatistics = {
  assigned: number
  claimable: number
  completed: number
  rejected: number
  totalActive: number
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
  updatedAt?: string // ✅ ADD UPDATED TIMESTAMP FIELD
  finishedAt?: string
  comments: Comment[]
  requestId: string // backlink
  requesterId?: string // who originally requested the parent flow (for Service Desk display)
  requesterName?: string // name of the person who originally requested the parent flow
  availableActions?: AvailableActions
  dueDate?: string
  escalatedAt?: string
  message?: string // Task message/description from API
}

export type SubmittedRequest = {
  id: string
  templateId: string
  templateVersion: number
  requesterId: string
  requesterName?: string
  createdAt: string
  updatedAt?: string
  status: 'open' | 'in_progress' | 'completed' | 'canceled'
  titleSnapshot: string
  categoryIdSnapshot: string
  formData: any
  steps: StepInstance[]
  timeline: Array<{ at: string; message: string; userId?: string; userName?: string; action?: string }>
  progress?: {
    totalSteps: number
    completedSteps: number
    percentage: number
  }
  participants?: string[]
  totalComments?: number
}

// Enhanced request with comprehensive history
export type RequestWithHistory = SubmittedRequest & {
  comprehensiveHistory: Array<{
    type: 'step' | 'assignment' | 'comment' | 'flow' | 'status'
    timestamp: string
    stepIndex: number
    stepTitle: string
    status: string
    userId?: string
    userName?: string
    comment?: string
    metadata?: any
  }>
}

/**
 * Enhanced Workflow Engine Interface
 * Aligned with custom-flow-engine v2 capabilities
 * Supports comments, enhanced task operations, and comprehensive history
 */
export interface WorkflowEngine {
  // Core workflow operations
  startRequest(templateKey: string, formData: any): Promise<string>
  getRequest(requestId: string): Promise<SubmittedRequest>
  getRequestWithHistory(requestId: string): Promise<RequestWithHistory>
  getMyRequests(userId?: string): Promise<SubmittedRequest[]>

  // Desk/ticket operations
  getDeskTickets(desk: StepReceiver, userId?: string): Promise<StepInstance[]>
  getUserTasks(
    userId: string,
    filters?: {
      includeAssigned?: boolean
      includeClaimable?: boolean
      status?: string
      limit?: number
    }
  ): Promise<StepInstance[]>
  getTaskStatistics(userId: string): Promise<TaskStatistics>
  getCompletedTickets(options?: {
    limit?: number
    offset?: number
  }): Promise<{ tickets: StepInstance[]; totalCount: number; hasMore: boolean }>

  // Task actions
  claim(stepId: string, userId: string): Promise<void>
  unclaim(stepId: string, userId: string, comment?: string): Promise<void>
  assign(stepId: string, userId: string, assignToUserId: string, comment?: string): Promise<void>
  unassign(stepId: string, userId: string, comment?: string): Promise<void>
  reassign(stepId: string, currentUserId: string, newUserId: string, comment?: string): Promise<void>
  advance(stepId: string, userId: string, payload?: any, comment?: string): Promise<void>
  reject(stepId: string, userId: string, reason: string): Promise<void>

  // Comment operations
  comment(stepId: string, userId: string, body: string): Promise<Comment>
  getTaskComments(stepId: string): Promise<Comment[]>
  getFlowComments(flowId: string): Promise<FlowComment[]>

  // Enhanced query operations
  getTask(stepId: string, userId?: string): Promise<StepInstance>
  getTicketDetail(ticketId: string): Promise<StepInstance | null> // Added for ticket detail view
  getAvailableActions(stepId: string, userId: string): Promise<AvailableActions>
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

  // Sync and maintenance
  syncTasks?(): Promise<{ tasksSynced: number; message: string }>

  // Template operations (development/debugging)
  getTemplates?(options?: {
    limit?: number
    offset?: number
    onlyLatest?: boolean
    includeDrafts?: boolean
    search?: string
  }): Promise<{
    status: string
    count: number
    totalCount: number
    hasMore: boolean
    data: any[]
  }>

  // Universal assignment analysis
  getStepsRequiringAssignment?(templateId: string): Promise<
    Array<{
      stepId: string
      stepIndex: number
      title: string
      assignmentMode: string
      requiresUsers: boolean
    }>
  >
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
