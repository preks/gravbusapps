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
  const completed = taskAssignees.filter(ta => ta.taskStatus === 'COMPLETED_TASK_STATUS').length
  const inProgress = taskAssignees.filter(ta => ta.taskStatus === 'IN_PROGRESS_TASK_STATUS').length
  const pending = taskAssignees.filter(ta => !ta.taskStatus || ta.taskStatus === 'SCHEDULED_TASK_STATUS').length

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
    case 'IN_PROGRESS_TASK_STATUS':
    case 'IN_PROGRESS':
      return 'warning'
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
