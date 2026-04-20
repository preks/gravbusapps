/**
 * Task Filters
 *
 * Query parameters for filtering and pagination of unified tasks
 */

import { EVERYBOX_FIRST_PAGE_LIMIT } from '../constants/everyboxPagination'
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
   * Backend-computed due date filter (for everybox-service).
   * - dueSoon24h: due within the next 24 hours
   * - overdue: due date is in the past
   */
  dueFilter?: 'any' | 'dueSoon24h' | 'overdue' | 'hasDueDate' | 'noDueDate'

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

  /**
   * Opaque cursor for cursor-based pagination.
   * When provided, the backend resumes from a stored session instead of
   * re-computing from scratch. Takes precedence over offset if both are present.
   */
  cursor?: string
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
      | 'cursor'
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
  cursor?: string
}

/**
 * Default filter values
 */
export const DEFAULT_FILTERS: ParsedTaskFilters = {
  source: 'all',
  limit: EVERYBOX_FIRST_PAGE_LIMIT,
  offset: 0,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  dueFilter: 'any'
}
