/**
 * useTaskDetails Hook
 * Fetches detailed task information from Kogito Processes API for a single task
 * This provides the full task parameters/inputs/results, not just metadata
 */

import { useState, useEffect, useCallback } from 'react'
import { FlowClient, FlowTask } from '@/common/network/flows/FlowClient'

interface UseTaskDetailsOptions {
  taskId: string | null
  domain: string | null
  processName: string | null
  processInstanceId: string | null
  accessToken: string
  userId: string | null
  source: 'kogito' | 'cflow'
  enabled?: boolean
}

interface UseTaskDetailsResult {
  taskDetails: FlowTask | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch detailed task information using Kogito Processes API
 * Endpoint: /processes/{domain}/{processName}/{processInstanceId}/tasks?user={userId}
 * Only works for Kogito tasks - CFlow tasks don't have this endpoint
 */
export const useTaskDetails = ({
  taskId,
  domain,
  processName,
  processInstanceId,
  accessToken,
  userId,
  source,
  enabled = true
}: UseTaskDetailsOptions): UseTaskDetailsResult => {
  const [taskDetails, setTaskDetails] = useState<FlowTask | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDetails = useCallback(async () => {
    // Only fetch for Kogito tasks with all required parameters
    if (
      !taskId ||
      !domain ||
      !processName ||
      !processInstanceId ||
      !accessToken ||
      !userId ||
      source !== 'kogito' ||
      !enabled
    ) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('[useTaskDetails] Fetching task details via Kogito Processes API:', {
        domain,
        processName,
        processInstanceId,
        userId,
        taskId
      })

      const client = new FlowClient()
      client.setAccessToken(accessToken)

      // Fetch all tasks for this process instance
      const response = await client.getOpenedTaskFlow(domain, processName, processInstanceId, userId)

      console.log('[useTaskDetails] Received tasks response:', {
        tasksCount: response.tasks?.length || 0,
        tasks: response.tasks
      })

      // Find the specific task by ID
      const taskDetail = response.tasks?.find(t => t.id === taskId)

      if (taskDetail) {
        console.log('[useTaskDetails] Found task details:', {
          taskId,
          hasParameters: !!(taskDetail as any).parameters,
          parametersKeys: (taskDetail as any).parameters ? Object.keys((taskDetail as any).parameters) : [],
          hasResults: !!(taskDetail as any).results,
          fullDetails: taskDetail
        })
        setTaskDetails(taskDetail)
      } else {
        console.warn('[useTaskDetails] Task not found in response:', taskId)
        setError('Task not found in process instance')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task details'
      setError(errorMessage)
      console.error('[useTaskDetails] Error fetching task details:', err)
    } finally {
      setIsLoading(false)
    }
  }, [taskId, domain, processName, processInstanceId, accessToken, userId, source, enabled])

  const refetch = useCallback(async () => {
    await fetchDetails()
  }, [fetchDetails])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  return {
    taskDetails,
    isLoading,
    error,
    refetch
  }
}
