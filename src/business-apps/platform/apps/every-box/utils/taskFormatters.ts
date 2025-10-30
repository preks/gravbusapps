/**
 * Task Formatting Utilities
 * Date, status, and priority formatters
 */

import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { TaskStatus, FlowStatus } from '../types'

dayjs.extend(relativeTime)

/**
 * Format date to relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow()
}

/**
 * Format date to readable format
 */
export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('MMM D, YYYY')
}

/**
 * Format date with time
 * Shows "Today" or "Yesterday" for recent dates, full date for older ones
 */
export const formatDateTime = (date: string | Date): string => {
  const dateObj = dayjs(date)
  const now = dayjs()
  const today = now.startOf('day')
  const yesterday = today.subtract(1, 'day')

  // Check if date is today
  if (dateObj.isSame(today, 'day')) {
    return `Today ${dateObj.format('h:mm A')}`
  }

  // Check if date is yesterday
  if (dateObj.isSame(yesterday, 'day')) {
    return `Yesterday ${dateObj.format('h:mm A')}`
  }

  // For older dates, show full date
  return dateObj.format('MMM D, YYYY h:mm A')
}

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
 */
export const formatTaskStatus = (status: TaskStatus): string => {
  switch (status) {
    case 'SCHEDULED':
      return 'Scheduled'
    case 'IN_PROGRESS':
      return 'In Progress'
    case 'COMPLETED':
      return 'Completed'
    case 'FAILED':
      return 'Failed'
    default:
      return status
  }
}

/**
 * Get human-readable flow status text
 */
export const formatFlowStatus = (status: FlowStatus): string => {
  switch (status) {
    case 'RUNNING':
      return 'Running'
    case 'COMPLETED':
      return 'Completed'
    case 'FAILED':
      return 'Failed'
    case 'TERMINATED':
      return 'Terminated'
    default:
      return status
  }
}

/**
 * Get priority display text
 * Priority in Kogito: 0 = highest priority, higher numbers = lower priority
 */
export const formatPriority = (priority?: number): string => {
  if (priority === undefined || priority === null) return 'Normal'

  // Kogito uses 0-based priority where 0 is highest
  if (priority <= 1) return 'High'
  if (priority <= 5) return 'Medium'
  return 'Low'
}
