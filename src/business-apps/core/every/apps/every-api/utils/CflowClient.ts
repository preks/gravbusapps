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
  totalCount?: number // Total count of all matching tasks (for pagination)
  tasks: CflowTask[]
  hasMore?: boolean
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

export interface CflowCountResponse {
  status: string
  data?: {
    totalCount?: number
  }
}

export interface CflowTasksWithCount {
  tasks: CflowTask[]
  totalCount: number
}

/**
 * Fetch tasks for a user from custom-flow-engine
 * Returns tasks array and totalCount for accurate pagination
 */
export async function fetchCflowUserTasks(
  userId: string,
  accessToken?: string,
  queryParams?: Record<string, string>
): Promise<CflowTasksWithCount> {
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
    return {
      tasks: data.tasks || [],
      totalCount: data.totalCount || data.count || 0
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine error: ${errorMsg}`)
  }
}

/**
 * Fetch tasks ASSIGNED to the user from custom-flow-engine using dedicated endpoint
 * This uses the /assigned alias which sets includeAssigned=true and includeClaimable=false.
 */
export async function fetchCflowUserAssignedTasks(
  userId: string,
  accessToken?: string,
  queryParams?: Record<string, string>
): Promise<CflowTasksWithCount> {
  const endpoint = getCflowEndpoint()

  if (!endpoint) {
    throw new Error(
      'Custom Flow Engine endpoint not configured. Set NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL environment variable.'
    )
  }

  const cleanParams: Record<string, string> = {}
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null') {
        cleanParams[key] = value
      }
    })
  }

  const params = new URLSearchParams(cleanParams)
  const url = `${endpoint}/api/tasks/user/${userId}/assigned${params.toString() ? '?' + params.toString() : ''}`

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
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`)
    }

    const data: CflowTasksResponse = await response.json()
    return {
      tasks: data.tasks || [],
      totalCount: data.totalCount || data.count || 0
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine assigned tasks error: ${errorMsg}`)
  }
}

/**
 * Fetch tasks CLAIMABLE by the user from custom-flow-engine using dedicated endpoint
 * This uses the /claimable alias which sets includeAssigned=false and includeClaimable=true.
 */
export async function fetchCflowUserClaimableTasks(
  userId: string,
  accessToken?: string,
  queryParams?: Record<string, string>
): Promise<CflowTasksWithCount> {
  const endpoint = getCflowEndpoint()

  if (!endpoint) {
    throw new Error(
      'Custom Flow Engine endpoint not configured. Set NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL environment variable.'
    )
  }

  const cleanParams: Record<string, string> = {}
  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null') {
        cleanParams[key] = value
      }
    })
  }

  const params = new URLSearchParams(cleanParams)
  const url = `${endpoint}/api/tasks/user/${userId}/claimable${params.toString() ? '?' + params.toString() : ''}`

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
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`)
    }

    const data: CflowTasksResponse = await response.json()
    return {
      tasks: data.tasks || [],
      totalCount: data.totalCount || data.count || 0
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine claimable tasks error: ${errorMsg}`)
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
): Promise<CflowTasksWithCount> {
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
    return {
      tasks: data.tasks || [],
      totalCount: data.totalCount || data.count || 0
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine completed tasks error: ${errorMsg}`)
  }
}

/**
 * Response type for blink tasks endpoint (includes totalCount)
 */
export interface CflowBlinkTasksResponse extends CflowTasksResponse {
  totalCount: number
  hasMore: boolean
  pagination?: {
    offset: number
    limit: number
  }
}

/**
 * Fetch BLINK (quick-task) tasks for a user from custom-flow-engine
 * Uses tag filtering to get only blink tasks with accurate totalCount
 * Note: We fetch from the /assigned endpoint so we only get assigned (open) tasks for the user.
 */
export async function fetchCflowBlinkTasks(
  userId: string,
  accessToken?: string,
  queryParams?: Record<string, string>
): Promise<{ tasks: CflowTask[]; totalCount: number; hasMore: boolean }> {
  const endpoint = getCflowEndpoint()

  if (!endpoint) {
    throw new Error(
      'Custom Flow Engine endpoint not configured. Set NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL environment variable.'
    )
  }

  // Add tag filter for blink/quick-task
  const cleanParams: Record<string, string> = {
    'tags.app': 'quick-task' // Filter for blink tasks
  }

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== 'undefined' && value !== 'null') {
        cleanParams[key] = value
      }
    })
  }

  const params = new URLSearchParams(cleanParams)
  const url = `${endpoint}/api/tasks/user/${userId}/assigned${params.toString() ? '?' + params.toString() : ''}`

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
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`)
    }

    const data: CflowBlinkTasksResponse = await response.json()
    return {
      tasks: data.tasks || [],
      totalCount: data.totalCount || data.count || (data.tasks?.length ?? 0),
      hasMore: data.hasMore ?? false
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine blink tasks error: ${errorMsg}`)
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
    const result = await fetchCflowUserTasks(userId, accessToken, {
      limit: '100' // OPTIMIZED: 100 instead of 1000
    })

    // Calculate statistics from actual task data
    const statistics: CflowTaskStatsResponse['statistics'] = {
      total: result.totalCount, // Use accurate totalCount from API
      assigned: 0,
      claimable: 0,
      completed: 0,
      byStatus: {},
      byPriority: {}
    }

    result.tasks.forEach(task => {
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

export async function fetchCflowUserInitiatedFlowsCount(userId: string, accessToken?: string): Promise<number> {
  const endpoint = getCflowEndpoint()

  if (!endpoint) {
    throw new Error(
      'Custom Flow Engine endpoint not configured. Set NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL environment variable.'
    )
  }

  const url = `${endpoint}/api/flows/user/${userId}/initiated/count`
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
      signal: AbortSignal.timeout(30000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}. ${errorText}`)
    }

    const data: CflowCountResponse = await response.json()
    return data.data?.totalCount || 0
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Custom Flow Engine initiated flows count error: ${errorMsg}`)
  }
}
