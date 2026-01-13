/**
 * EveryBox Type Definitions
 * Imports unified task types and defines Flow-specific types
 */

// Re-export unified task types from the Every API
export type {
  UnifiedTask,
  TaskSource,
  TaskStatus,
  TaskFilters,
  TaskStatistics,
  TaskAssignment,
  TaskAvailableActions,
  TaskWorkflowMeta
} from '@/business-apps/core/every/apps/every-api/types'

/**
 * Flow status
 */
export type FlowStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TERMINATED'

/**
 * Flow step status
 */
export type FlowStepStatus = 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED' | 'FAILED' | 'CANCELED'

/**
 * Flow Step
 */
export interface FlowStep {
  stepIndex: number
  title: string
  type: string
  status: FlowStepStatus
  assignedTo?: string
  completedBy?: string
  completedAt?: string
}

/**
 * Flow Model
 * Represents initiated workflows
 */
export interface Flow {
  id: string
  templateName: string
  templateId: string
  status: FlowStatus
  initiatedBy: string
  initiatorUserId?: string // User ID of initiator (for avatar/name lookup)
  startedAt: string
  completedAt?: string
  currentStep: number
  totalSteps: number
  progressPercentage?: number
  steps: FlowStep[]
  metadata: Record<string, any>
  tags?: Record<string, any> // Flow tags (for categorization and filtering)
  // Blink grouping support
  blinkGroupId?: string // Group ID for multi-assignee blinks
  assignedUserId?: string // User ID of the assignee (for identifying who the workflow is for)
  isGrouped?: boolean // Whether this flow is part of a group
  groupedFlows?: Flow[] // All flows in the group (for grouped display)
  assigneeCount?: number // Total number of assignees in the group
  completedAssignees?: number // Number of completed assignees
}

/**
 * Flow filter options
 */
export interface FlowFilters {
  status?: FlowStatus[]
  templateName?: string[]
  dateRange?: {
    from?: Date
    to?: Date
  }
  search?: string
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  error?: string
  count?: number
  totalCount?: number
}
