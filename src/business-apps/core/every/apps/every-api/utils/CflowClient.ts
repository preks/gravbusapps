/**
 * Custom Flow Engine API Client
 *
 * Utility for fetching tasks from custom-flow-engine
 */

import { getCflowEndpoint } from './config'

export interface CflowTask {
  id: string
  flowId?: string
  referenceTaskName?: string
  type?: string
  name?: string
  status: string
  priority?: number
  title?: string
  message?: string
  stepIndex?: number
  form?: any[]
  inputs?: any[]
  links?: any[]
  taskCategory?: string
  dueDate?: string
  scheduledAt?: string
  availableActions?: {
    canClaim?: boolean
    canComplete?: boolean
    canReassign?: boolean
    canReject?: boolean
    canUnclaim?: boolean
  }
  assignment?: any
  workflowMeta?: any
  [key: string]: any
}

export interface CflowTasksResponse {
  status: string
  count: number
  tasks: CflowTask[]
}

export interface CflowTaskStatsResponse {
  status: string
  statistics: {
    total: number
    assigned: number
    claimable: number
    completed: number
    byStatus: Record<string, number>
    byPriority: Record<string, number>
  }
}

/**
 * Fetch tasks for a user from custom-flow-engine
 */
export async function fetchCflowUserTasks(
  userId: string,
  accessToken?: string,
  queryParams?: Record<string, string>
): Promise<CflowTask[]> {
  const endpoint = getCflowEndpoint()

  if (!endpoint) {
    throw new Error(
      'Custom Flow Engine endpoint not configured. Set NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL environment variable.'
    )
  }

  // Filter out undefined/null values from query params
  const cleanParams: Record<string, string> = {}
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null') {
        cleanParams[key] = value
      }
    })
  }

  const params = new URLSearchParams(cleanParams)
  const url = `${endpoint}/api/tasks/user/${userId}${params.toString() ? '?' + params.toString() : ''}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`)
    }

    const data: CflowTasksResponse = await response.json()
    return data.tasks || []
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine error: ${errorMsg}`)
  }
}

/**
 * Fetch COMPLETED tasks for a user from custom-flow-engine using dedicated endpoint
 * This uses the /completed endpoint which filters by task_business_status (not task_conductor_status)
 */
export async function fetchCflowCompletedTasks(
  userId: string,
  accessToken?: string,
  queryParams?: Record<string, string>
): Promise<CflowTask[]> {
  const endpoint = getCflowEndpoint()

  if (!endpoint) {
    throw new Error(
      'Custom Flow Engine endpoint not configured. Set NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL environment variable.'
    )
  }

  // Filter out undefined/null values from query params
  const cleanParams: Record<string, string> = {}
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null') {
        cleanParams[key] = value
      }
    })
  }

  const params = new URLSearchParams(cleanParams)
  const url = `${endpoint}/api/tasks/user/${userId}/completed${params.toString() ? '?' + params.toString() : ''}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`)
    }

    const data: CflowTasksResponse = await response.json()
    return data.tasks || []
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine completed tasks error: ${errorMsg}`)
  }
}

/**
 * Fetch a single task by ID from custom-flow-engine
 */
export async function fetchCflowTask(taskId: string, userId: string, accessToken?: string): Promise<CflowTask | null> {
  const endpoint = getCflowEndpoint()

  if (!endpoint) {
    throw new Error('Custom Flow Engine endpoint not configured')
  }

  const url = `${endpoint}/api/tasks/${taskId}?userId=${userId}`

  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.task || data
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine task fetch error: ${errorMsg}`)
  }
}

/**
 * Fetch task statistics from custom-flow-engine
 *
 * OPTIMIZED: Fetches smaller sample (100 tasks) for stats instead of 1000
 * This is sufficient for statistical accuracy while reducing backend load
 */
export async function fetchCflowTaskStats(
  userId: string,
  accessToken?: string
): Promise<CflowTaskStatsResponse['statistics']> {
  try {
    // Fetch sample of tasks to calculate accurate statistics
    // 100 tasks is statistically significant for counting
    const tasks = await fetchCflowUserTasks(userId, accessToken, {
      limit: '100' // OPTIMIZED: 100 instead of 1000
    })

    // Calculate statistics from actual task data
    const statistics: CflowTaskStatsResponse['statistics'] = {
      total: tasks.length,
      assigned: 0,
      claimable: 0,
      completed: 0,
      byStatus: {},
      byPriority: {}
    }

    tasks.forEach(task => {
      // Count by status
      const status = task.status || 'Unknown'
      statistics.byStatus[status] = (statistics.byStatus[status] || 0) + 1

      // Count by priority
      if (task.priority !== undefined) {
        const priority = task.priority.toString()
        statistics.byPriority[priority] = (statistics.byPriority[priority] || 0) + 1
      }

      // Count assigned vs claimable
      if (task.assignment?.assignedTo) {
        statistics.assigned++
      } else if (task.availableActions?.canClaim) {
        statistics.claimable++
      }

      // Count completed
      if (status.toUpperCase() === 'COMPLETED') {
        statistics.completed++
      }
    })

    return statistics
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine stats fetch error: ${errorMsg}`)
  }
}
