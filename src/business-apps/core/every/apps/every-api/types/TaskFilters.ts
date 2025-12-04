/**
 * Task Filters
 *
 * Query parameters for filtering and pagination of unified tasks
 */

import { TaskSource, TaskStatus } from './UnifiedTask'

export interface TaskFilters {
  /**
   * Filter by task status
   */
  status?: TaskStatus

  /**
   * Search by task title, task ID, or flow ID
   */
  search?: string

  /**
   * Filter by source system
   * @default 'all'
   */
  source?: TaskSource | 'all'

  /**
   * Filter by priority level
   */
  priority?: number

  /**
   * Filter by task category
   */
  taskCategory?: string

  /**
   * Filter by assigned user ID
   */
  assignedTo?: string

  /**
   * Filter by due date range
   */
  dueDate?: {
    from?: string
    to?: string
  }

  /**
   * Filter by creation date range
   */
  createdAt?: {
    from?: string
    to?: string
  }

  /**
   * Maximum number of tasks to return
   * @default 20
   */
  limit?: number

  /**
   * Number of tasks to skip (for pagination)
   * @default 0
   */
  offset?: number

  /**
   * Sort field
   * @default 'createdAt'
   */
  sortBy?: 'createdAt' | 'dueDate' | 'priority' | 'status' | 'title'

  /**
   * Sort order
   * @default 'desc'
   */
  sortOrder?: 'asc' | 'desc'

  /**
   * Include only tasks that can be claimed by the user
   */
  claimableOnly?: boolean

  /**
   * Include only tasks assigned to the user
   */
  assignedOnly?: boolean
}

/**
 * Parsed and validated filters with defaults applied
 */
export interface ParsedTaskFilters
  extends Required<
    Omit<
      TaskFilters,
      | 'status'
      | 'search'
      | 'priority'
      | 'taskCategory'
      | 'assignedTo'
      | 'dueDate'
      | 'createdAt'
      | 'claimableOnly'
      | 'assignedOnly'
    >
  > {
  status?: TaskStatus
  search?: string
  priority?: number
  taskCategory?: string
  assignedTo?: string
  dueDate?: {
    from?: string
    to?: string
  }
  createdAt?: {
    from?: string
    to?: string
  }
  claimableOnly?: boolean
  assignedOnly?: boolean
}

/**
 * Default filter values
 */
export const DEFAULT_FILTERS: ParsedTaskFilters = {
  source: 'all',
  limit: 20,
  offset: 0,
  sortBy: 'createdAt',
  sortOrder: 'desc'
}
