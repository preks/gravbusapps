/**
 * Unified Task Service
 *
 * Aggregates tasks from both custom-flow-engine and Kogito,
 * applies filtering, and returns unified results
 */

import { UnifiedTask, TaskStatistics, TaskSource } from '../types/UnifiedTask'
import { TaskFilters, ParsedTaskFilters, DEFAULT_FILTERS } from '../types/TaskFilters'
import { adaptCflowTasks, adaptKogitoTasks } from './TaskAdapterService'
import { fetchCflowUserTasks, fetchCflowTask, fetchCflowTaskStats } from '../utils/CflowClient'
import { fetchKogitoUserTasks, fetchKogitoTask, fetchKogitoTaskStats } from '../utils/KogitoClient'
import { getApiConfig } from '../utils/config'

export interface FetchTasksResult {
  tasks: UnifiedTask[]
  errors: Array<{
    source: TaskSource
    message: string
    details?: any
  }>
  warnings: string[]
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
 * Apply filters to a list of tasks
 */
export function applyFilters(tasks: UnifiedTask[], filters: ParsedTaskFilters): UnifiedTask[] {
  let filtered = [...tasks]

  console.log('applyFilters called with:', {
    taskCount: tasks.length,
    sourceFilter: filters.source
  })

  // Filter by source
  if (filters.source && filters.source !== 'all') {
    console.log('Filtering by source:', filters.source)
    const beforeCount = filtered.length
    filtered = filtered.filter(task => task.source === filters.source)
    console.log(`After source filter: ${filtered.length} tasks (filtered out ${beforeCount - filtered.length})`)
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
  if (filters.dueDate) {
    if (filters.dueDate.from) {
      const fromDate = new Date(filters.dueDate.from)
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false
        return new Date(task.dueDate) >= fromDate
      })
    }
    if (filters.dueDate.to) {
      const toDate = new Date(filters.dueDate.to)
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false
        return new Date(task.dueDate) <= toDate
      })
    }
  }

  // Filter by creation date range
  if (filters.createdAt) {
    if (filters.createdAt.from) {
      const fromDate = new Date(filters.createdAt.from)
      filtered = filtered.filter(task => {
        if (!task.createdAt && !task.scheduledAt) return false
        const taskDate = new Date(task.createdAt || task.scheduledAt!)
        return taskDate >= fromDate
      })
    }
    if (filters.createdAt.to) {
      const toDate = new Date(filters.createdAt.to)
      filtered = filtered.filter(task => {
        if (!task.createdAt && !task.scheduledAt) return false
        const taskDate = new Date(task.createdAt || task.scheduledAt!)
        return taskDate <= toDate
      })
    }
  }

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
    let aValue: any
    let bValue: any

    switch (filters.sortBy) {
      case 'priority':
        aValue = a.priority ?? 999
        bValue = b.priority ?? 999
        break
      case 'dueDate':
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'title':
        aValue = (a.title || a.name || '').toLowerCase()
        bValue = (b.title || b.name || '').toLowerCase()
        break
      case 'createdAt':
      default:
        aValue = a.createdAt || a.scheduledAt ? new Date(a.createdAt || a.scheduledAt!).getTime() : 0
        bValue = b.createdAt || b.scheduledAt ? new Date(b.createdAt || b.scheduledAt!).getTime() : 0
        break
    }

    if (filters.sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
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
 * Fetch tasks from all sources
 */
export async function fetchAllUserTasks(
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

  // Fetch from both sources in parallel
  const fetchPromises: Promise<void>[] = []

  if (fetchCflow) {
    const cflowParams: Record<string, string> = {
      limit: '100' // Fetch more, filter client-side
    }
    if (parsedFilters.status) cflowParams.status = parsedFilters.status
    if (parsedFilters.search) cflowParams.search = parsedFilters.search

    fetchPromises.push(
      fetchCflowUserTasks(userId, accessToken, cflowParams)
        .then(cflowTasks => {
          const adapted = adaptCflowTasks(cflowTasks)
          allTasks.push(...adapted)
        })
        .catch(error => {
          errors.push({
            source: 'cflow',
            message: 'Failed to fetch custom-flow-engine tasks',
            details: error.message
          })
          if (!config.enablePartialResults) {
            throw error
          }
        })
    )
  }

  if (fetchKogito) {
    fetchPromises.push(
      fetchKogitoUserTasks(userId, accessToken)
        .then(kogitoTasks => {
          const adapted = adaptKogitoTasks(kogitoTasks, userId)
          allTasks.push(...adapted)
        })
        .catch(error => {
          errors.push({
            source: 'kogito',
            message: 'Failed to fetch Kogito tasks',
            details: error.message
          })
          if (!config.enablePartialResults) {
            throw error
          }
        })
    )
  }

  // Wait for all fetches to complete
  await Promise.all(fetchPromises)

  console.log('Before filtering:', {
    totalTasks: allTasks.length,
    sourceFilter: parsedFilters.source,
    cflowCount: allTasks.filter(t => t.source === 'cflow').length,
    kogitoCount: allTasks.filter(t => t.source === 'kogito').length
  })

  // Add warnings if partial results
  if (errors.length > 0 && allTasks.length > 0) {
    warnings.push('Partial results: Some task sources failed to respond')
  }

  // Apply filters and pagination
  const filtered = applyFilters(allTasks, parsedFilters)
  console.log('After filtering:', {
    filteredCount: filtered.length,
    sourceFilter: parsedFilters.source
  })

  const paginated = applyPagination(filtered, parsedFilters)

  return {
    tasks: paginated,
    errors,
    warnings
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
  } catch (error) {
    console.warn('Failed to fetch task from cflow:', error)
  }

  // Try Kogito
  try {
    const kogitoTask = await fetchKogitoTask(taskId, accessToken)
    if (kogitoTask) {
      const adapted = adaptKogitoTasks([kogitoTask], userId)
      return adapted[0]
    }
  } catch (error) {
    console.warn('Failed to fetch task from Kogito:', error)
  }

  return null
}

/**
 * Fetch task statistics from all sources
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

  // Fetch cflow stats
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
        const byPriority = statistics.byPriority as Record<string, number>
        byPriority[priority] = (byPriority[priority] || 0) + (count as number)
      })
    }
  } catch (error) {
    errors.push({
      source: 'cflow',
      message: 'Failed to fetch cflow statistics',
      details: error instanceof Error ? error.message : String(error)
    })
  }

  // Fetch Kogito stats
  try {
    const kogitoStats = await fetchKogitoTaskStats(userId, accessToken)
    statistics.bySource.kogito = kogitoStats.total || 0
    statistics.total += kogitoStats.total || 0

    console.log('Kogito stats by status:', kogitoStats.byStatus)

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
          console.warn(`Unknown Kogito state in statistics: ${state}, treating as scheduled`)
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

  console.log('Final statistics:', {
    total: statistics.total,
    byStatus: statistics.byStatus,
    bySource: statistics.bySource
  })

  return {
    statistics,
    errors,
    warnings
  }
}
