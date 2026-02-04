/**
 * Unified Task Interface
 *
 * This interface provides a common structure for tasks from both
 * custom-flow-engine (cflow) and Kogito systems.
 *
 * Based on the Task interface from flow/apps/inbox/TaskInbox.tsx
 */

export type TaskSource = 'cflow' | 'kogito'

export type TaskStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface TaskAssignment {
  assignmentMode?: string
  currentStatus?: string
  assignedTo?: string
  assignedAt?: string
  isUserOwner?: boolean
  allowReassignment?: boolean
  targets?: any
  assignmentHistory?: Array<{
    action: string
    userId: string
    changedBy: string
    changedAt: string
  }>
  assignmentAction?: string
  assignmentIteration?: number
}

export interface TaskAvailableActions {
  canClaim?: boolean
  canComplete?: boolean
  canReassign?: boolean
  canReject?: boolean
  canUnclaim?: boolean
}

export interface TaskWorkflowMeta {
  rootWorkflowId: string
  [key: string]: any
}

/**
 * Unified Task structure that works for both cflow and Kogito tasks
 */
export interface UnifiedTask {
  // Core identification
  id: string
  flowId?: string
  referenceTaskName?: string
  type?: string
  name?: string
  title?: string

  // Status and priority
  status: TaskStatus
  priority?: number

  // Timing
  dueDate?: string
  scheduledAt?: string
  createdAt?: string
  completedAt?: string

  /**
   * Backend-computed due date metadata (everybox-service).
   * Keeps frontend rendering fast (no client-side date math).
   */
  dueMeta?: {
    status: 'dueSoon24h' | 'overdue'
    dueAt: string
    hoursRemaining?: number
    daysRemaining?: number
    hoursOverdue?: number
    daysOverdue?: number
  }

  // Content
  message?: string
  description?: string
  taskCategory?: string
  tags?: Record<string, any>

  // Form data and inputs
  form?: any[]
  inputs?: any[]
  links?: any[]

  // Assignment information
  assignment?: TaskAssignment

  // Available actions for the user
  availableActions?: TaskAvailableActions

  // Workflow metadata
  workflowMeta?: TaskWorkflowMeta
  stepIndex?: number

  // Source system identifier
  source: TaskSource

  // Additional metadata from source system
  sourceMetadata?: {
    [key: string]: any
  }

  /**
   * Per-user task state persisted by everybox-service
   */
  userState?: {
    isRead: boolean
    isPinned: boolean
    userPriority: number | null
    readAt: string | null
    pinnedAt: string | null
  }
}

/**
 * Task statistics aggregated from both sources
 */
export interface TaskStatistics {
  total: number
  byStatus: {
    scheduled: number
    inProgress: number
    completed: number
    failed: number
    cancelled: number
  }
  bySource: {
    cflow: number
    kogito: number
  }
  byPriority?: {
    [priority: number]: number
  }
  byCategory?: {
    [category: string]: number
  }
}

/**
 * Response wrapper for task API endpoints
 */
export interface TaskApiResponse<T = any> {
  status: 'success' | 'error' | 'partial'
  message?: string
  data?: T
  warnings?: string[]
  errors?: Array<{
    source: TaskSource
    message: string
    details?: any
  }>
}

/**
 * Response for user tasks endpoint
 */
export interface UserTasksResponse extends TaskApiResponse {
  count: number
  tasks: UnifiedTask[]
  pagination?: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

/**
 * Response for task statistics endpoint
 */
export interface TaskStatsResponse extends TaskApiResponse {
  statistics: TaskStatistics
}

/**
 * Response for single task endpoint
 */
export interface SingleTaskResponse extends TaskApiResponse {
  task: UnifiedTask
}
