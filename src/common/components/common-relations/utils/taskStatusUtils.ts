import type { TaskAssignee } from '@/common/data/relations/types/taskTypes'

/**
 * Computed task status result
 */
export interface ComputedTaskStatus {
  overallStatus: string
  statusColor: string
  progress: {
    completed: number
    total: number
    inProgress: number
    pending: number
  }
}

/**
 * Compute overall task status from individual assignee statuses
 *
 * Logic:
 * - If all assignees completed → COMPLETED
 * - If any assignee in progress or some completed → IN_PROGRESS
 * - If all assignees pending → PENDING
 * - If no assignees → PENDING
 *
 * @param taskAssignees Array of task assignee objects with taskStatus field
 * @returns Computed overall status with progress tracking
 */
export function computeTaskStatus(taskAssignees: TaskAssignee[] | undefined | null): ComputedTaskStatus {
  if (!taskAssignees || taskAssignees.length === 0) {
    return {
      overallStatus: 'SCHEDULED',
      statusColor: 'info',
      progress: {
        completed: 0,
        total: 0,
        inProgress: 0,
        pending: 0
      }
    }
  }

  const total = taskAssignees.length
  // Count assignees with completedAt as completed (covers COMPLETED, REJECTED, APPROVED)
  const completed = taskAssignees.filter(ta => !!ta.completedAt).length
  const inProgress = taskAssignees.filter(ta => !ta.completedAt && ta.taskStatus === 'IN_PROGRESS_TASK_STATUS').length
  const pending = taskAssignees.filter(
    ta => !ta.completedAt && (!ta.taskStatus || ta.taskStatus === 'SCHEDULED_TASK_STATUS')
  ).length

  let overallStatus = 'SCHEDULED'
  let statusColor = 'info'

  if (completed === total) {
    overallStatus = 'COMPLETED'
    statusColor = 'success'
  } else if (inProgress > 0 || completed > 0) {
    overallStatus = 'IN_PROGRESS'
    statusColor = 'warning'
  }

  return {
    overallStatus,
    statusColor,
    progress: {
      completed,
      total,
      inProgress,
      pending
    }
  }
}

/**
 * Format progress as human-readable string
 *
 * @param progress Progress object from computeTaskStatus
 * @returns Formatted string like "2/3 completed"
 */
export function formatTaskProgress(progress: ComputedTaskStatus['progress']): string {
  if (progress.total === 0) {
    return 'No assignees'
  }
  return `${progress.completed}/${progress.total} completed`
}

/**
 * Get status badge variant based on task status
 *
 * @param status Task status string
 * @returns Badge variant for design system
 */
export function getTaskStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' {
  switch (status) {
    case 'COMPLETED_TASK_STATUS':
    case 'COMPLETED':
      return 'success'
    case 'APPROVED_TASK_STATUS':
    case 'APPROVED':
      return 'success'
    case 'IN_PROGRESS_TASK_STATUS':
    case 'IN_PROGRESS':
      return 'info'
    case 'SCHEDULED_TASK_STATUS':
    case 'SCHEDULED':
      return 'info'
    case 'REJECTED_TASK_STATUS':
    case 'REJECTED':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * Get friendly status label
 *
 * @param status Task status string (with or without _TASK_STATUS suffix)
 * @returns Human-readable label
 */
export function getTaskStatusLabel(status: string | undefined | null): string {
  if (!status) return 'Scheduled'

  // Remove _TASK_STATUS suffix if present
  const baseStatus = status.replace(/_TASK_STATUS$/, '')

  // Convert to title case with spaces
  return baseStatus
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Configuration options for assignee display
 */
export interface TaskAssigneeDisplayOptions {
  /** Fallback text when no assignees */
  fallback?: string
  /** Text to show for multiple assignees (default: "Multiple") */
  multipleText?: string | ((count: number) => string)
  /** Whether to show count for multiple assignees (default: false) */
  showCount?: boolean
}

/**
 * Get display name for a single employee
 *
 * @param employee - Employee object with name fields
 * @returns Display name or 'Unknown User'
 */
export function getEmployeeDisplayName(employee: any): string {
  if (!employee) return 'Unknown User'

  // Priority: fullName > firstName + lastName > displayName
  if (employee.fullName) return employee.fullName

  const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
  if (fullName) return fullName

  return employee.displayName || 'Unknown User'
}

/**
 * Get display name for task assignees (handles single, multiple, or none)
 *
 * @param assigneeEmployee - Single employee object or array of employees
 * @param options - Configuration options
 * @returns Display string for assignees
 */
export function getTaskAssigneeDisplayName(assigneeEmployee: any, options: TaskAssigneeDisplayOptions = {}): string {
  const { fallback = 'Unassigned', multipleText = 'Multiple', showCount = false } = options

  // Handle null/undefined
  if (!assigneeEmployee) return fallback

  // Handle array of employees
  if (Array.isArray(assigneeEmployee)) {
    if (assigneeEmployee.length === 0) return fallback

    if (assigneeEmployee.length === 1) {
      return getEmployeeDisplayName(assigneeEmployee[0])
    }

    // Multiple assignees
    if (showCount) {
      return `${assigneeEmployee.length} assignees`
    }
    return typeof multipleText === 'function' ? multipleText(assigneeEmployee.length) : multipleText
  }

  // Handle single employee
  return getEmployeeDisplayName(assigneeEmployee)
}

/**
 * Get task assignee display from full task object
 * Handles both taskAssignees array and assigneeEmployee field
 *
 * @param task - Task object
 * @param options - Display options
 * @returns Display string
 */
export function getTaskAssigneeDisplay(task: any, options: TaskAssigneeDisplayOptions = {}): string {
  // Check taskAssignees array first (multi-assignee support)
  if (task.taskAssignees && task.taskAssignees.length > 0) {
    const assignees = task.taskAssignees.map((ta: any) => ta.assignedEmployee).filter(Boolean)

    return getTaskAssigneeDisplayName(assignees, options)
  }

  // Fallback to assigneeEmployee field (legacy single assignee)
  if (task.assigneeEmployee) {
    return getTaskAssigneeDisplayName(task.assigneeEmployee, options)
  }

  // Fallback to creator as last resort
  if (task.creatorEmployee) {
    return getEmployeeDisplayName(task.creatorEmployee)
  }

  return options.fallback || 'Unassigned'
}
