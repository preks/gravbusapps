/**
 * Unified Task Service
 *
 * Aggregates tasks from both custom-flow-engine and Kogito,
 * applies filtering, and returns unified results
 *
 * OPTIMIZATION: Uses progressive loading with background prefetch
 * - Fetches 50 from each source (100 total) for fast initial response
 * - Immediately prefetches next 50 from each (100 more) in background
 * - This gives 200 tasks merged for 100% sorting accuracy while respecting backend limits
 */

import { UnifiedTask, TaskStatistics, TaskSource } from '../types/UnifiedTask'
import { TaskFilters, ParsedTaskFilters, DEFAULT_FILTERS } from '../types/TaskFilters'
import { adaptCflowTasks, adaptKogitoTasks } from './TaskAdapterService'
import {
  fetchCflowUserTasks,
  fetchCflowCompletedTasks,
  fetchCflowTask,
  fetchCflowTaskStats
} from '../utils/CflowClient'
import { fetchKogitoUserTasks, fetchKogitoTask, fetchKogitoTaskStats } from '../utils/KogitoClient'
import { getApiConfig } from '../utils/config'

export interface FetchTasksResult {
  tasks: UnifiedTask[]
  totalCount: number // Total count of tasks before pagination
  errors: Array<{
    source: TaskSource
    message: string
    details?: any
  }>
  warnings: string[]
  hasMore: boolean // Indicates if more tasks might be available
  prefetchPromise?: Promise<UnifiedTask[]> // Background prefetch for next batch
}

export interface FetchTaskStatsResult {
  statistics: TaskStatistics
  errors: Array<{
    source: TaskSource
    message: string
    details?: any
  }>
  warnings: string[]
}

// Fetch limits optimized for backend constraints
const FETCH_LIMIT_PER_SOURCE = 50 // Backend max per request

/**
 * Parse and validate filter parameters
 */
export function parseFilters(filters?: Partial<TaskFilters>): ParsedTaskFilters {
  const parsed: ParsedTaskFilters = {
    ...DEFAULT_FILTERS,
    ...filters
  }

  // Validate and constrain limit
  if (parsed.limit < 1) {
    parsed.limit = 1
  }
  if (parsed.limit > 100) {
    parsed.limit = 100
  }

  // Validate offset
  if (parsed.offset < 0) {
    parsed.offset = 0
  }

  return parsed
}

/**
 * Filter tasks by date range (due date or created date)
 */
function filterByDateRange(
  tasks: UnifiedTask[],
  dateRange: { from?: string; to?: string } | undefined,
  getDate: (task: UnifiedTask) => Date | null
): UnifiedTask[] {
  if (!dateRange) return tasks

  let result = tasks
  if (dateRange.from) {
    const fromDate = new Date(dateRange.from)
    result = result.filter(task => {
      const taskDate = getDate(task)
      return taskDate !== null && taskDate >= fromDate
    })
  }
  if (dateRange.to) {
    const toDate = new Date(dateRange.to)
    result = result.filter(task => {
      const taskDate = getDate(task)
      return taskDate !== null && taskDate <= toDate
    })
  }
  return result
}

/**
 * Get sort value for a task based on sort field
 */
function getSortValue(task: UnifiedTask, sortBy: string): any {
  switch (sortBy) {
    case 'priority':
      return task.priority ?? 999
    case 'dueDate':
      return task.dueDate ? new Date(task.dueDate).getTime() : 0
    case 'status':
      return task.status
    case 'title':
      return (task.title || task.name || '').toLowerCase()
    case 'createdAt':
    default:
      if (task.status === 'COMPLETED' && task.completedAt) {
        return new Date(task.completedAt).getTime()
      }
      return task.createdAt || task.scheduledAt ? new Date(task.createdAt || task.scheduledAt!).getTime() : 0
  }
}

/**
 * Compare two values for sorting
 */
function compareSortValues(aValue: any, bValue: any, sortOrder: string): number {
  if (sortOrder === 'asc') {
    if (aValue > bValue) return 1
    if (aValue < bValue) return -1
    return 0
  }
  if (aValue < bValue) return 1
  if (aValue > bValue) return -1
  return 0
}

/**
 * Apply filters to a list of tasks
 */
export function applyFilters(tasks: UnifiedTask[], filters: ParsedTaskFilters): UnifiedTask[] {
  let filtered = [...tasks]

  // Filter by source
  if (filters.source && filters.source !== 'all') {
    filtered = filtered.filter(task => task.source === filters.source)
  }

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter(task => task.status === filters.status)
  }

  // Filter by search term (title, taskId, flowId)
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(
      task =>
        task.title?.toLowerCase().includes(searchLower) ||
        task.name?.toLowerCase().includes(searchLower) ||
        task.id.toLowerCase().includes(searchLower) ||
        task.flowId?.toLowerCase().includes(searchLower)
    )
  }

  // Filter by priority
  if (filters.priority !== undefined) {
    filtered = filtered.filter(task => task.priority === filters.priority)
  }

  // Filter by task category
  if (filters.taskCategory) {
    filtered = filtered.filter(task => task.taskCategory === filters.taskCategory)
  }

  // Filter by assigned user
  if (filters.assignedTo) {
    filtered = filtered.filter(task => task.assignment?.assignedTo === filters.assignedTo)
  }

  // Filter by due date range
  filtered = filterByDateRange(filtered, filters.dueDate, task => (task.dueDate ? new Date(task.dueDate) : null))

  // Filter by creation date range
  filtered = filterByDateRange(filtered, filters.createdAt, task =>
    task.createdAt || task.scheduledAt ? new Date(task.createdAt || task.scheduledAt!) : null
  )

  // Filter claimable only
  if (filters.claimableOnly) {
    filtered = filtered.filter(task => task.availableActions?.canClaim === true)
  }

  // Filter assigned only
  if (filters.assignedOnly) {
    filtered = filtered.filter(task => task.assignment?.assignedTo !== undefined)
  }

  // Sort tasks
  filtered.sort((a, b) => {
    const aValue = getSortValue(a, filters.sortBy)
    const bValue = getSortValue(b, filters.sortBy)
    return compareSortValues(aValue, bValue, filters.sortOrder)
  })

  return filtered
}

/**
 * Apply pagination to filtered tasks
 */
export function applyPagination(tasks: UnifiedTask[], filters: ParsedTaskFilters): UnifiedTask[] {
  const start = filters.offset
  const end = start + filters.limit
  return tasks.slice(start, end)
}

/**
 * Fetch tasks from both sources with specified offset
 */
async function fetchFromBothSources(
  userId: string,
  accessToken: string | undefined,
  parsedFilters: ParsedTaskFilters,
  offset: number,
  limit: number
): Promise<{ tasks: UnifiedTask[]; errors: FetchTasksResult['errors'] }> {
  const config = getApiConfig()
  const errors: FetchTasksResult['errors'] = []
  const allTasks: UnifiedTask[] = []

  // Determine which sources to fetch from
  const fetchCflow = parsedFilters.source === 'all' || parsedFilters.source === 'cflow'
  const fetchKogito = parsedFilters.source === 'all' || parsedFilters.source === 'kogito'

  // Fetch from both sources in parallel
  const fetchPromises: Promise<void>[] = []

  if (fetchCflow) {
    const cflowOffset = offset
    const cflowParams: Record<string, string> = {
      limit: limit.toString(),
      offset: cflowOffset.toString(),
      sortBy: parsedFilters.sortBy || 'createdAt',
      sortOrder: parsedFilters.sortOrder || 'desc'
    }
    if (parsedFilters.status) cflowParams.status = parsedFilters.status
    if (parsedFilters.search) cflowParams.search = parsedFilters.search

    fetchPromises.push(
      (async () => {
        try {
          const cflowTasks = await fetchCflowUserTasks(userId, accessToken, cflowParams)
          const adapted = adaptCflowTasks(cflowTasks)
          allTasks.push(...adapted)
        } catch (error: any) {
          errors.push({
            source: 'cflow',
            message: 'Failed to fetch custom-flow-engine tasks',
            details: error.message
          })
          if (!config.enablePartialResults) {
            throw error
          }
        }
      })()
    )
  }

  if (fetchKogito) {
    // Map sortBy to Kogito field names
    let kogitoSortField = 'CREATION_DATE'
    if (parsedFilters.sortBy === 'priority') {
      kogitoSortField = 'PRIORITY'
    } else if (parsedFilters.sortBy === 'dueDate') {
      kogitoSortField = 'DUE_DATE'
    } else if (parsedFilters.sortBy === 'title') {
      kogitoSortField = 'NAME'
    }

    const kogitoPage = Math.floor(offset / limit)
    const kogitoParams = {
      pageSize: limit,
      page: kogitoPage,
      sortBy: kogitoSortField,
      sortOrder: parsedFilters.sortOrder === 'asc' ? ('ASC' as const) : ('DESC' as const),
      search: parsedFilters.search,
      ...(parsedFilters.status && { status: [parsedFilters.status] })
    }

    fetchPromises.push(
      (async () => {
        try {
          const kogitoTasks = await fetchKogitoUserTasks(userId, accessToken, kogitoParams)
          const adapted = adaptKogitoTasks(kogitoTasks, userId)
          allTasks.push(...adapted)
        } catch (error: any) {
          errors.push({
            source: 'kogito',
            message: 'Failed to fetch Kogito tasks',
            details: error.message
          })
          if (!config.enablePartialResults) {
            throw error
          }
        }
      })()
    )
  }

  await Promise.all(fetchPromises)

  return { tasks: allTasks, errors }
}

/**
 * Fetch tasks from all sources (simplified - batching handled by hooks)
 */
export async function fetchAllUserTasks(
  userId: string,
  accessToken?: string,
  filters?: Partial<TaskFilters>
): Promise<FetchTasksResult> {
  const parsedFilters = parseFilters(filters)
  const warnings: string[] = []

  // Fetch batch from both sources
  const fetchResult = await fetchFromBothSources(
    userId,
    accessToken,
    parsedFilters,
    parsedFilters.offset,
    FETCH_LIMIT_PER_SOURCE
  )

  const allTasks = fetchResult.tasks

  // Add warnings if partial results
  if (fetchResult.errors.length > 0 && allTasks.length > 0) {
    warnings.push('Partial results: Some task sources failed to respond')
  }

  // Apply filters (sorting handled by hook)
  const filtered = applyFilters(allTasks, parsedFilters)

  return {
    tasks: filtered,
    totalCount: filtered.length,
    errors: fetchResult.errors,
    warnings,
    hasMore: filtered.length >= FETCH_LIMIT_PER_SOURCE
  }
}

/**
 * Fetch COMPLETED tasks from all sources using dedicated endpoint
 * This uses the /completed endpoint which filters by task_business_status (not task_conductor_status)
 */
export async function fetchCompletedUserTasks(
  userId: string,
  accessToken?: string,
  filters?: Partial<TaskFilters>
): Promise<FetchTasksResult> {
  const parsedFilters = parseFilters(filters)
  const config = getApiConfig()

  const errors: FetchTasksResult['errors'] = []
  const warnings: string[] = []
  const allTasks: UnifiedTask[] = []

  // Determine which sources to fetch from
  const fetchCflow = parsedFilters.source === 'all' || parsedFilters.source === 'cflow'
  const fetchKogito = parsedFilters.source === 'all' || parsedFilters.source === 'kogito'

  // Fetch from both sources in parallel (using optimized 50 limit)
  const fetchPromises: Promise<void>[] = []
  const timings: Record<string, number> = {}

  if (fetchCflow) {
    const cflowParams: Record<string, string> = {
      limit: FETCH_LIMIT_PER_SOURCE.toString(), // Optimized: 50 instead of 1000
      offset: parsedFilters.offset.toString(),
      sortBy: parsedFilters.sortBy || 'createdAt',
      sortOrder: parsedFilters.sortOrder || 'desc'
    }
    if (parsedFilters.search) cflowParams.search = parsedFilters.search

    fetchPromises.push(
      (async () => {
        const cflowStart = performance.now()
        try {
          const cflowTasks = await fetchCflowCompletedTasks(userId, accessToken, cflowParams)
          const cflowEnd = performance.now()
          timings.cflow = cflowEnd - cflowStart

          const adapted = adaptCflowTasks(cflowTasks)
          allTasks.push(...adapted)
        } catch (error: any) {
          const cflowEnd = performance.now()
          timings.cflow = cflowEnd - cflowStart
          errors.push({
            source: 'cflow',
            message: 'Failed to fetch custom-flow-engine completed tasks',
            details: error.message
          })
          if (!config.enablePartialResults) {
            throw error
          }
        }
      })()
    )
  }

  if (fetchKogito) {
    // Map sortBy to Kogito field names
    let kogitoSortField = 'CREATION_DATE'
    if (parsedFilters.sortBy === 'priority') {
      kogitoSortField = 'PRIORITY'
    } else if (parsedFilters.sortBy === 'dueDate') {
      kogitoSortField = 'DUE_DATE'
    } else if (parsedFilters.sortBy === 'title') {
      kogitoSortField = 'NAME'
    }

    const kogitoParams = {
      pageSize: FETCH_LIMIT_PER_SOURCE, // Optimized: 50 instead of 1000
      page: Math.floor(parsedFilters.offset / FETCH_LIMIT_PER_SOURCE),
      sortBy: kogitoSortField,
      sortOrder: parsedFilters.sortOrder === 'asc' ? ('ASC' as const) : ('DESC' as const),
      search: parsedFilters.search,
      status: ['COMPLETED'] // Kogito expects status as array
    }

    fetchPromises.push(
      (async () => {
        const kogitoStart = performance.now()
        try {
          const kogitoTasks = await fetchKogitoUserTasks(userId, accessToken, kogitoParams)
          const kogitoEnd = performance.now()
          timings.kogito = kogitoEnd - kogitoStart
          const adapted = adaptKogitoTasks(kogitoTasks, userId)
          allTasks.push(...adapted)
        } catch (error: any) {
          const kogitoEnd = performance.now()
          timings.kogito = kogitoEnd - kogitoStart
          errors.push({
            source: 'kogito',
            message: 'Failed to fetch Kogito completed tasks',
            details: error.message
          })
          if (!config.enablePartialResults) {
            throw error
          }
        }
      })()
    )
  }

  // Wait for all fetches to complete
  await Promise.all(fetchPromises)

  // Add warnings if partial results
  if (errors.length > 0 && allTasks.length > 0) {
    warnings.push('Partial results: Some task sources failed to respond')
  }

  // Apply filters and pagination
  const filtered = applyFilters(allTasks, parsedFilters)

  const paginated = applyPagination(filtered, parsedFilters)

  return {
    tasks: paginated,
    totalCount: filtered.length,
    errors,
    warnings,
    hasMore: filtered.length > parsedFilters.limit || allTasks.length >= FETCH_LIMIT_PER_SOURCE
  }
}

/**
 * Fetch a single task by ID from all sources
 */
export async function fetchTaskById(taskId: string, userId: string, accessToken?: string): Promise<UnifiedTask | null> {
  // Try cflow first
  try {
    const cflowTask = await fetchCflowTask(taskId, userId, accessToken)
    if (cflowTask) {
      const adapted = adaptCflowTasks([cflowTask])
      return adapted[0]
    }
  } catch {
    // Cflow lookup failed, try Kogito
  }

  // Try Kogito
  try {
    const kogitoTask = await fetchKogitoTask(taskId, accessToken)
    if (kogitoTask) {
      const adapted = adaptKogitoTasks([kogitoTask], userId)
      return adapted[0]
    }
  } catch {
    // Kogito lookup failed
  }

  return null
}

/**
 * Fetch task statistics from all sources
 * Optimized: Uses smaller sample size (100 tasks) for statistics
 */
export async function fetchTaskStatistics(userId: string, accessToken?: string): Promise<FetchTaskStatsResult> {
  const errors: FetchTaskStatsResult['errors'] = []
  const warnings: string[] = []

  const statistics: TaskStatistics = {
    total: 0,
    byStatus: {
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    },
    bySource: {
      cflow: 0,
      kogito: 0
    },
    byPriority: {},
    byCategory: {}
  }

  // Fetch cflow stats (using smaller sample for performance)
  try {
    const cflowStats = await fetchCflowTaskStats(userId, accessToken)
    statistics.bySource.cflow = cflowStats.total || 0
    statistics.total += cflowStats.total || 0

    // Aggregate status counts
    if (cflowStats.byStatus) {
      Object.entries(cflowStats.byStatus).forEach(([status, count]) => {
        const statusLower = status.toLowerCase()
        if (statusLower.includes('scheduled')) {
          statistics.byStatus.scheduled += count
        } else if (statusLower.includes('progress')) {
          statistics.byStatus.inProgress += count
        } else if (statusLower.includes('completed')) {
          statistics.byStatus.completed += count
        } else if (statusLower.includes('failed')) {
          statistics.byStatus.failed += count
        } else if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
          statistics.byStatus.cancelled += count
        }
      })
    }

    // Aggregate priority counts
    if (cflowStats.byPriority && statistics.byPriority) {
      Object.entries(cflowStats.byPriority).forEach(([priority, count]) => {
        const byPriority = statistics.byPriority
        if (byPriority) {
          byPriority[priority] = (byPriority[priority] || 0) + (count as number)
        }
      })
    }
  } catch (error) {
    errors.push({
      source: 'cflow',
      message: 'Failed to fetch cflow statistics',
      details: error instanceof Error ? error.message : String(error)
    })
  }

  // Fetch Kogito stats (using smaller sample for performance)
  try {
    const kogitoStats = await fetchKogitoTaskStats(userId, accessToken)
    statistics.bySource.kogito = kogitoStats.total || 0
    statistics.total += kogitoStats.total || 0

    // Aggregate status counts from Kogito
    if (kogitoStats.byStatus) {
      Object.entries(kogitoStats.byStatus).forEach(([state, count]) => {
        const stateLower = state.toLowerCase()
        if (stateLower === 'ready' || stateLower === 'reserved' || stateLower === 'open') {
          statistics.byStatus.scheduled += count
        } else if (stateLower === 'inprogress' || stateLower === 'in_progress') {
          statistics.byStatus.inProgress += count
        } else if (stateLower === 'completed') {
          statistics.byStatus.completed += count
        } else if (stateLower === 'failed' || stateLower === 'error' || stateLower === 'aborted') {
          statistics.byStatus.failed += count
        } else if (stateLower === 'exited' || stateLower === 'obsolete' || stateLower === 'suspended') {
          statistics.byStatus.cancelled += count
        } else {
          // Log unknown states for debugging
          statistics.byStatus.scheduled += count
        }
      })
    }
  } catch (error) {
    errors.push({
      source: 'kogito',
      message: 'Failed to fetch Kogito statistics',
      details: error instanceof Error ? error.message : String(error)
    })
  }

  if (errors.length > 0 && statistics.total > 0) {
    warnings.push('Partial statistics: Some sources failed to respond')
  }

  return {
    statistics,
    errors,
    warnings
  }
}
