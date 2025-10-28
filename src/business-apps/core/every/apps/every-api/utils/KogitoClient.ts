/**
 * Kogito API Client
 *
 * Utility for fetching tasks from Kogito/jBPM process engine via FlowMetricsClient
 *
 * Uses the FlowMetricsClient which provides access to flow-executions/tasks endpoint
 */

import {
  FlowMetricsClient,
  FlowExecutionTask,
  FlowExecutionTasksResponse
} from '@/common/network/flow-metrics/FlowMetricsClient'

export interface KogitoTaskQueryParams {
  search?: string
  status?: string[]
  processName?: string
  taskName?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// Re-export FlowExecutionTask as KogitoTask for consistency
export type KogitoTask = FlowExecutionTask

export interface KogitoTasksResponse {
  tasks?: KogitoTask[]
  totalCount?: number
}

/**
 * Fetch tasks for a user from Kogito via FlowMetricsClient
 *
 * Uses the /flow-executions/tasks endpoint with cockpitPage=INBOX
 */
export async function fetchKogitoUserTasks(
  userId: string,
  accessToken?: string,
  params?: KogitoTaskQueryParams
): Promise<KogitoTask[]> {
  if (!accessToken) {
    console.warn('No access token provided for Kogito tasks')
    return []
  }

  console.log('Fetching Kogito tasks for user:', userId, 'via FlowMetricsClient')

  try {
    const client = new FlowMetricsClient(accessToken)

    const response: FlowExecutionTasksResponse = await client.getFlowExecutionTasks({
      cockpitPage: 'INBOX',
      userId: userId,
      size: params?.pageSize || 100,
      page: params?.page || 0,
      field: params?.sortBy || 'CREATION_DATE',
      direction: params?.sortOrder || 'DESC',
      search: params?.search,
      filterTaskName: params?.taskName,
      filterProcessName: params?.processName,
      state: params?.status?.[0] // Take first status if multiple provided
    })

    console.log('Kogito response:', {
      totalCount: response.totalCount,
      tasksCount: response.processingStates?.length || response.content?.length || 0
    })

    // Handle both response formats (processingStates or content)
    const tasks = response.processingStates || response.content || []
    console.log(`Found ${tasks.length} Kogito tasks`)

    return tasks
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Failed to fetch Kogito tasks:', errorMsg)
    throw new Error(`Kogito/FlowMetrics error: ${errorMsg}`)
  }
}

/**
 * Fetch a single task by ID from Kogito
 */
export async function fetchKogitoTask(taskId: string, accessToken?: string): Promise<KogitoTask | null> {
  if (!accessToken) {
    console.warn('No access token provided for Kogito task')
    return null
  }

  try {
    const client = new FlowMetricsClient(accessToken)
    const task = await client.getFlowExecutionTask(taskId)

    console.log('Fetched Kogito task:', taskId)
    return task
  } catch (error) {
    console.error('Failed to fetch Kogito task:', taskId, error)
    return null
  }
}

/**
 * Get task statistics from Kogito
 *
 * Fetches all tasks and aggregates locally since there's no dedicated stats endpoint
 */
export async function fetchKogitoTaskStats(
  userId: string,
  accessToken?: string
): Promise<{ total: number; byStatus: Record<string, number> }> {
  try {
    const tasks = await fetchKogitoUserTasks(userId, accessToken, {
      pageSize: 1000 // Fetch more for accurate stats
    })

    const byStatus: Record<string, number> = {}

    tasks.forEach(task => {
      // FlowExecutionTask has both 'state' and 'status' fields
      // Use state first (Kogito native), fallback to status
      const taskState = task.state || task.status || 'Unknown'
      byStatus[taskState] = (byStatus[taskState] || 0) + 1
    })

    console.log('Kogito task stats (raw states):', {
      total: tasks.length,
      byStatus,
      sampleTask: tasks[0] ? { id: tasks[0].id, state: tasks[0].state, status: tasks[0].status } : null
    })

    return {
      total: tasks.length,
      byStatus
    }
  } catch (error) {
    console.error('Failed to fetch Kogito task stats:', error)
    return {
      total: 0,
      byStatus: {}
    }
  }
}
