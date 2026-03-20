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
  fetchCflowUserAssignedTasks,
  fetchCflowUserClaimableTasks,
  fetchCflowCompletedTasks,
  fetchCflowTask,
  fetchCflowTaskStats
} from '../utils/CflowClient'
import { fetchKogitoUserTasks, fetchKogitoTask, fetchKogitoTaskStats } from '../utils/KogitoClient'
import { getApiConfig } from '../utils/config'
import { getEveryboxServiceApiUrl } from '../utils/everyboxServiceUrl'

export interface FetchTasksResult {
  tasks: UnifiedTask[]
  totalCount: number // Total count of tasks before pagination
  cflowTotalCount: number // Total count from CFlow (for accurate badge)
  kogitoTotalCount: number // Total count from Kogito (for accurate badge)
  errors: Array<{
    source: TaskSource
    message: string
    details?: any
  }>
  warnings: string[]
  hasMore: boolean // Indicates if more tasks might be available
  prefetchPromise?: Promise<UnifiedTask[]> // Background prefetch for next batch
  /** Opaque cursor for fetching the next page. Null/undefined if no more pages. */
  nextCursor?: string | null
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

function toEveryboxQuery(filters?: Partial<TaskFilters>): Record<string, string | number | boolean | undefined> {
  if (!filters) return {}
  return {
    status: filters.status,
    search: filters.search,
    source: filters.source,
    priority: filters.priority,
    taskCategory: filters.taskCategory,
    assignedTo: filters.assignedTo,
    dueFilter: filters.dueFilter,
    limit: filters.limit,
    offset: filters.offset,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    claimableOnly: filters.claimableOnly,
    assignedOnly: filters.assignedOnly,
    cursor: filters.cursor
  }
}

async function everyboxGet<T>(
  path: string,
  accessToken: string | undefined,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const baseUrl = getEveryboxServiceApiUrl()
  const url = new URL(`${baseUrl}${path}`)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      url.searchParams.set(k, String(v))
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    }
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Everybox-service HTTP ${response.status}: ${text || response.statusText}`)
  }

  return (await response.json()) as T
}

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
    // Prefer strict "assigned to this user" filtering when assignedTo is provided (assignedOnly implies assignedTo)
    if (filters.assignedTo) {
      filtered = filtered.filter(
        task => task.assignment?.assignedTo === filters.assignedTo || task.assignment?.isUserOwner === true
      )
    } else {
      filtered = filtered.filter(task => task.assignment?.assignedTo !== undefined)
    }
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

export interface FetchFromBothSourcesResult {
  tasks: UnifiedTask[]
  errors: FetchTasksResult['errors']
  cflowTotalCount: number
  kogitoTotalCount: number
}

/**
 * Fetch tasks from both sources with specified offset
 * Returns totalCounts from each source for accurate "All" badge
 */
async function fetchFromBothSources(
  userId: string,
  accessToken: string | undefined,
  parsedFilters: ParsedTaskFilters,
  offset: number,
  limit: number
): Promise<FetchFromBothSourcesResult> {
  const config = getApiConfig()
  const errors: FetchTasksResult['errors'] = []
  const allTasks: UnifiedTask[] = []
  let cflowTotalCount = 0
  let kogitoTotalCount = 0

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
          // IMPORTANT: For the inbox we want accurate counts AND we currently do NOT fetch claimable tasks.
          // The generic /api/tasks/user/:userId endpoint may not return totalCount reliably,
          // so we use /assigned here.

          if (parsedFilters.assignedOnly) {
            const assigned = await fetchCflowUserAssignedTasks(userId, accessToken, cflowParams)
            allTasks.push(...adaptCflowTasks(assigned.tasks))
            cflowTotalCount = assigned.totalCount
            return
          }

          if (parsedFilters.claimableOnly) {
            const claimable = await fetchCflowUserClaimableTasks(userId, accessToken, cflowParams)
            allTasks.push(...adaptCflowTasks(claimable.tasks))
            cflowTotalCount = claimable.totalCount
            return
          }

          // Default: fetch assigned only (no claimable tasks for now)
          const assigned = await fetchCflowUserAssignedTasks(userId, accessToken, cflowParams)
          allTasks.push(...adaptCflowTasks(assigned.tasks))
          cflowTotalCount = assigned.totalCount
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
          console.log('[UnifiedTaskService] Fetching Kogito tasks for user:', userId)
          const kogitoResult = await fetchKogitoUserTasks(userId, accessToken, kogitoParams)
          console.log('[UnifiedTaskService] Kogito tasks received:', kogitoResult.tasks.length)
          const adapted = adaptKogitoTasks(kogitoResult.tasks, userId)
          allTasks.push(...adapted)
          kogitoTotalCount = kogitoResult.totalCount
        } catch (error: any) {
          console.error('[UnifiedTaskService] Kogito fetch failed:', error.message)
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

  return { tasks: allTasks, errors, cflowTotalCount, kogitoTotalCount }
}

/**
 * Fetch tasks from all sources (simplified - batching handled by hooks)
 */
export async function fetchAllUserTasks(
  userId: string,
  accessToken?: string,
  filters?: Partial<TaskFilters>
): Promise<FetchTasksResult> {
  // assignedOnly is defined as "assigned to the user" — ensure assignedTo is set so client-side filtering is correct
  const normalizedFilters: Partial<TaskFilters> = {
    ...(filters || {})
  }
  if (normalizedFilters.assignedOnly && !normalizedFilters.assignedTo) {
    normalizedFilters.assignedTo = userId
  }

  // Prefer everybox-service (backend) for fast server-side search/sort + user metadata
  try {
    return await everyboxGet<FetchTasksResult>(`/tasks/user/${userId}`, accessToken, toEveryboxQuery(normalizedFilters))
  } catch (error) {
    // Fallback to legacy in-browser aggregation (keeps UI functional if service is not yet routed)
    console.warn('[UnifiedTaskService] everybox-service unavailable, falling back to legacy aggregation:', error)
  }

  const parsedFilters = parseFilters(normalizedFilters)
  const warnings: string[] = []

  // Use the limit from filters (default is handled by parseFilters)
  const fetchLimit = Math.min(parsedFilters.limit, FETCH_LIMIT_PER_SOURCE)

  // Fetch batch from both sources
  const fetchResult = await fetchFromBothSources(userId, accessToken, parsedFilters, parsedFilters.offset, fetchLimit)

  const allTasks = fetchResult.tasks

  // Add warnings if partial results
  if (fetchResult.errors.length > 0 && allTasks.length > 0) {
    warnings.push('Partial results: Some task sources failed to respond')
  }

  // Apply filters (sorting handled by hook)
  const filtered = applyFilters(allTasks, parsedFilters)

  // Compute accurate totalCount from both sources
  const combinedTotalCount = fetchResult.cflowTotalCount + fetchResult.kogitoTotalCount

  return {
    tasks: filtered,
    totalCount: combinedTotalCount,
    cflowTotalCount: fetchResult.cflowTotalCount,
    kogitoTotalCount: fetchResult.kogitoTotalCount,
    errors: fetchResult.errors,
    warnings,
    hasMore: filtered.length >= fetchLimit
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
  // Prefer everybox-service for completed tasks (server-side filtering + consistent totals)
  try {
    return await everyboxGet<FetchTasksResult>(`/tasks/user/${userId}/completed`, accessToken, toEveryboxQuery(filters))
  } catch (error) {
    console.warn(
      '[UnifiedTaskService] everybox-service unavailable (completed), falling back to legacy aggregation:',
      error
    )
  }

  const parsedFilters = parseFilters(filters)
  const config = getApiConfig()

  const errors: FetchTasksResult['errors'] = []
  const warnings: string[] = []
  const allTasks: UnifiedTask[] = []
  let cflowTotalCount = 0
  let kogitoTotalCount = 0

  // Determine which sources to fetch from
  const fetchCflow = parsedFilters.source === 'all' || parsedFilters.source === 'cflow'
  const fetchKogito = parsedFilters.source === 'all' || parsedFilters.source === 'kogito'

  // Respect requested limit (default from parseFilters), but cap to backend max
  const fetchLimit = Math.min(parsedFilters.limit, FETCH_LIMIT_PER_SOURCE)

  // Fetch from both sources in parallel
  const fetchPromises: Promise<void>[] = []
  const timings: Record<string, number> = {}

  if (fetchCflow) {
    const cflowParams: Record<string, string> = {
      limit: fetchLimit.toString(),
      offset: parsedFilters.offset.toString(),
      sortBy: parsedFilters.sortBy || 'createdAt',
      sortOrder: parsedFilters.sortOrder || 'desc'
    }
    if (parsedFilters.search) cflowParams.search = parsedFilters.search

    fetchPromises.push(
      (async () => {
        const cflowStart = performance.now()
        try {
          const cflowResult = await fetchCflowCompletedTasks(userId, accessToken, cflowParams)
          const cflowEnd = performance.now()
          timings.cflow = cflowEnd - cflowStart

          const adapted = adaptCflowTasks(cflowResult.tasks)
          allTasks.push(...adapted)
          cflowTotalCount = cflowResult.totalCount
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
      pageSize: fetchLimit,
      page: Math.floor(parsedFilters.offset / fetchLimit),
      sortBy: kogitoSortField,
      sortOrder: parsedFilters.sortOrder === 'asc' ? ('ASC' as const) : ('DESC' as const),
      search: parsedFilters.search,
      status: ['COMPLETED'] // Kogito expects status as array
    }

    fetchPromises.push(
      (async () => {
        const kogitoStart = performance.now()
        try {
          const kogitoResult = await fetchKogitoUserTasks(userId, accessToken, kogitoParams)
          const kogitoEnd = performance.now()
          timings.kogito = kogitoEnd - kogitoStart
          const adapted = adaptKogitoTasks(kogitoResult.tasks, userId)
          allTasks.push(...adapted)
          kogitoTotalCount = kogitoResult.totalCount
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

  // Compute accurate totalCount from both sources
  const combinedTotalCount = cflowTotalCount + kogitoTotalCount

  return {
    tasks: paginated,
    totalCount: combinedTotalCount,
    cflowTotalCount,
    kogitoTotalCount,
    errors,
    warnings,
    hasMore: filtered.length > parsedFilters.limit || allTasks.length >= FETCH_LIMIT_PER_SOURCE
  }
}

/**
 * Fetch BLINK (quick-task) tasks for a user.
 *
 * Prefer everybox-service, fall back to Flow Engine direct calls.
 */
export async function fetchBlinkUserTasks(
  userId: string,
  accessToken?: string,
  filters?: Partial<TaskFilters>
): Promise<FetchTasksResult> {
  try {
    return await everyboxGet<FetchTasksResult>(`/tasks/user/${userId}/blinks`, accessToken, toEveryboxQuery(filters))
  } catch (error) {
    console.warn('[UnifiedTaskService] everybox-service unavailable (blinks), falling back:', error)
  }

  // Fallback: use Flow Engine tag filtering (legacy)
  const cflow = await fetchCflowUserAssignedTasks(userId, accessToken, {
    limit: String(filters?.limit ?? 20),
    offset: String(filters?.offset ?? 0),
    'tags.app': 'quick-task',
    ...(filters?.search ? { search: filters.search } : {})
  })

  const tasks = adaptCflowTasks(cflow.tasks)
  return {
    tasks,
    totalCount: cflow.totalCount,
    cflowTotalCount: cflow.totalCount,
    kogitoTotalCount: 0,
    errors: [],
    warnings: [],
    hasMore: Boolean(tasks.length && tasks.length >= (filters?.limit ?? 20))
  }
}

/**
 * Fetch a single task by ID from all sources
 */
export async function fetchTaskById(taskId: string, userId: string, accessToken?: string): Promise<UnifiedTask | null> {
  // Prefer everybox-service for single-task lookup (includes userState)
  try {
    const res = await everyboxGet<{ status: 'success' | 'error'; task?: UnifiedTask }>(
      `/tasks/${taskId}`,
      accessToken,
      { userId }
    )
    if (res.status === 'success' && res.task) return res.task
  } catch (error) {
    console.warn('[UnifiedTaskService] everybox-service unavailable (taskById), falling back:', error)
  }

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
  // Prefer everybox-service for stats
  try {
    return await everyboxGet<FetchTaskStatsResult>(`/tasks/user/${userId}/stats`, accessToken)
  } catch (error) {
    console.warn('[UnifiedTaskService] everybox-service unavailable (stats), falling back:', error)
  }

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
