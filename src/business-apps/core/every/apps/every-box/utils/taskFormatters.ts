/**
 * Task Formatting Utilities
 * Status and priority formatters for tasks and flows
 */

import dayjs from 'dayjs'
import { TaskStatus, FlowStatus } from '../types'

/** Translation function type for formatters */
export type TranslationFn = (key: string, params?: Record<string, unknown>) => string

/**
 * Check if date is overdue
 */
export const isOverdue = (dueDate?: string): boolean => {
  if (!dueDate) return false
  return dayjs(dueDate).isBefore(dayjs())
}

/**
 * Check if date is due soon (within 24 hours)
 */
export const isDueSoon = (dueDate?: string): boolean => {
  if (!dueDate) return false
  const now = dayjs()
  const due = dayjs(dueDate)
  return due.isAfter(now) && due.diff(now, 'hour') <= 24
}

/**
 * Get priority badge variant
 * Priority in Kogito: 0 = highest priority, higher numbers = lower priority
 */
export const getPriorityBadgeVariant = (priority?: number): 'destructive' | 'warning' | 'default' => {
  if (priority === undefined || priority === null) return 'default'

  // Kogito uses 0-based priority where 0 is highest
  if (priority <= 1) return 'destructive' // High priority
  if (priority <= 5) return 'warning' // Medium priority
  return 'default' // Low priority
}

/**
 * Get status badge variant
 */
export const getTaskStatusBadgeVariant = (status: TaskStatus): 'success' | 'info' | 'warning' | 'destructive' => {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'IN_PROGRESS':
      return 'info'
    case 'SCHEDULED':
      return 'warning'
    case 'FAILED':
      return 'destructive'
    default:
      return 'info'
  }
}

/**
 * Get flow status badge variant
 */
export const getFlowStatusBadgeVariant = (status: FlowStatus): 'success' | 'info' | 'destructive' | 'default' => {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'RUNNING':
      return 'info'
    case 'FAILED':
      return 'destructive'
    case 'TERMINATED':
      return 'default'
    default:
      return 'default'
  }
}

/**
 * Get human-readable status text
 * @param status - Task status
 * @param t - Optional translation function. If not provided, returns English fallback.
 */
export const formatTaskStatus = (status: TaskStatus, t?: TranslationFn): string => {
  switch (status) {
    case 'SCHEDULED':
      return t ? t('formatter-status-scheduled') : 'Scheduled'
    case 'IN_PROGRESS':
      return t ? t('formatter-status-in-progress') : 'In Progress'
    case 'COMPLETED':
      return t ? t('formatter-status-completed') : 'Completed'
    case 'FAILED':
      return t ? t('formatter-status-failed') : 'Failed'
    default:
      return status
  }
}

/**
 * Get human-readable flow status text
 * @param status - Flow status
 * @param t - Optional translation function. If not provided, returns English fallback.
 */
export const formatFlowStatus = (status: FlowStatus, t?: TranslationFn): string => {
  switch (status) {
    case 'RUNNING':
      return t ? t('formatter-flow-running') : 'Running'
    case 'COMPLETED':
      return t ? t('formatter-flow-completed') : 'Completed'
    case 'FAILED':
      return t ? t('formatter-flow-failed') : 'Failed'
    case 'TERMINATED':
      return t ? t('formatter-flow-terminated') : 'Terminated'
    default:
      return status
  }
}

/**
 * Get priority display text
 * Priority in Kogito: 0 = highest priority, higher numbers = lower priority
 * @param priority - Priority number (0 = highest)
 * @param t - Optional translation function. If not provided, returns English fallback.
 */
export const formatPriority = (priority?: number, t?: TranslationFn): string => {
  if (priority === undefined || priority === null) {
    return t ? t('formatter-priority-normal') : 'Normal'
  }

  // Kogito uses 0-based priority where 0 is highest
  if (priority <= 1) return t ? t('formatter-priority-high') : 'High'
  if (priority <= 5) return t ? t('formatter-priority-medium') : 'Medium'
  return t ? t('formatter-priority-low') : 'Low'
}
