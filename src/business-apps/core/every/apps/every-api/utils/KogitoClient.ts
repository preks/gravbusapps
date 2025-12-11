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
    return []
  }

  try {
    const client = new FlowMetricsClient(accessToken)

    // Determine cockpitPage and filterState based on requested status
    // For completed tasks: cockpitPage='ALL' with filterState=['Closed']
    // For active tasks: cockpitPage='INBOX' (no filterState needed)
    const isCompletedRequest = params?.status?.[0]?.toUpperCase() === 'COMPLETED'

    const response: FlowExecutionTasksResponse = await client.getFlowExecutionTasks({
      cockpitPage: isCompletedRequest ? 'ALL' : 'INBOX',
      userId: userId,
      size: params?.pageSize || 100,
      page: params?.page || 0,
      field: params?.sortBy || 'CREATION_DATE',
      direction: params?.sortOrder || 'DESC',
      search: params?.search,
      filterTaskName: params?.taskName,
      filterProcessName: params?.processName,
      ...(isCompletedRequest && { filterState: ['Closed'] }) // Only for completed tasks
    })

    // Handle both response formats (processingStates or content)
    const tasks = response.processingStates || response.content || []

    return tasks
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    throw new Error(`Kogito/FlowMetrics error: ${errorMsg}`)
  }
}

/**
 * Fetch a single task by ID from Kogito
 */
export async function fetchKogitoTask(taskId: string, accessToken?: string): Promise<KogitoTask | null> {
  if (!accessToken) {
    return null
  }

  try {
    const client = new FlowMetricsClient(accessToken)
    const task = await client.getFlowExecutionTask(taskId)

    return task
  } catch {
    // Task not found or API error - return null to try other sources
    return null
  }
}

/**
 * Get task statistics from Kogito
 *
 * OPTIMIZED: Fetches 100 tasks instead of 1000 for statistics
 * This is sufficient for statistical accuracy while reducing backend load
 */
export async function fetchKogitoTaskStats(
  userId: string,
  accessToken?: string
): Promise<{ total: number; byStatus: Record<string, number> }> {
  try {
    const tasks = await fetchKogitoUserTasks(userId, accessToken, {
      pageSize: 100 // OPTIMIZED: 100 instead of 1000
    })

    const byStatus: Record<string, number> = {}

    tasks.forEach(task => {
      // FlowExecutionTask has both 'state' and 'status' fields
      // Use state first (Kogito native), fallback to status
      const taskState = task.state || task.status || 'Unknown'
      byStatus[taskState] = (byStatus[taskState] || 0) + 1
    })

    return {
      total: tasks.length,
      byStatus
    }
  } catch {
    // Return empty stats on error - stats are optional and non-critical
    return {
      total: 0,
      byStatus: {}
    }
  }
}
