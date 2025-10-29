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
      'Custom Flow Engine endpoint not configured. Set NEXT_PUBLIC_CFLOW_ENDPOINT or NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_ENDPOINT environment variable.'
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

  console.log('Fetching cflow tasks for user:', userId, 'from:', url)

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

    console.log('Cflow response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`)
    }

    const data: CflowTasksResponse = await response.json()
    console.log(`Found ${data.tasks?.length || 0} cflow tasks`)
    return data.tasks || []
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Failed to fetch cflow tasks:', errorMsg)
    throw new Error(`Custom Flow Engine error: ${errorMsg}`)
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
    console.error('Failed to fetch cflow task:', error)
    throw error
  }
}

/**
 * Fetch task statistics from custom-flow-engine
 *
 * Note: The stats API endpoint returns incorrect data (counts flow status instead of task status),
 * so we fetch actual tasks and calculate statistics from them.
 */
export async function fetchCflowTaskStats(
  userId: string,
  accessToken?: string
): Promise<CflowTaskStatsResponse['statistics']> {
  try {
    // Fetch all tasks to calculate accurate statistics
    const tasks = await fetchCflowUserTasks(userId, accessToken, {
      limit: '1000' // Fetch all tasks for accurate stats
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

    console.log('Cflow task stats (calculated from tasks):', statistics)
    return statistics
  } catch (error) {
    console.error('Failed to fetch cflow task stats:', error)
    throw error
  }
}
