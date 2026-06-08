import { useState, useCallback, useEffect } from 'react'
import { FlowMetricsClient, FlowExecutionTask } from '@/common/network/flow-metrics/FlowMetricsClient'
import { toast } from '@newwork/nw-design-system'
interface UseTaskCompletionOptions {
  businessKey?: string
  accessToken?: string
  userId?: string
  enabled?: boolean
}

interface TaskCompletionState {
  flowExecutionTask: FlowExecutionTask | null
  isLoading: boolean
  isCompleting: boolean
  isCompleted: boolean
}

export const useTaskCompletion = ({ businessKey, accessToken, userId, enabled = true }: UseTaskCompletionOptions) => {
  const [state, setState] = useState<TaskCompletionState>({
    flowExecutionTask: null,
    isLoading: false,
    isCompleting: false,
    isCompleted: false
  })

  // Fetch flow execution task by business key
  const fetchTask = useCallback(async () => {
    if (!businessKey || !accessToken || !enabled) {
      return
    }

    setState(prev => ({ ...prev, isLoading: true }))

    try {
      const client = new FlowMetricsClient(accessToken)

      // Fetch tasks by businessKey (only required parameters)
      const response = await client.getFlowExecutionTasksByBusinessKey(businessKey, {
        size: 1, // Only need first task to get endpoint
        page: 0
      })

      const tasks = response.processingStates || response.content || []

      setState({
        flowExecutionTask: tasks.length > 0 ? tasks[0] : null,
        isLoading: false,
        isCompleting: false,
        isCompleted: false
      })
    } catch (error) {
      console.error('[useTaskCompletion] Failed to fetch task:', error)
      setState({
        flowExecutionTask: null,
        isLoading: false,
        isCompleting: false,
        isCompleted: false
      })
    }
  }, [businessKey, accessToken, enabled])

  // Complete the task
  const completeTask = useCallback(
    async (variables?: Record<string, any>) => {
      if (!state.flowExecutionTask || !accessToken || !userId || state.isCompleted) {
        return false
      }

      const endpoint = state.flowExecutionTask.endpoint
      if (!endpoint) {
        console.error('[useTaskCompletion] No endpoint available in flow execution task')
        toast.error('Cannot complete task: missing endpoint')
        return false
      }

      setState(prev => ({ ...prev, isCompleting: true }))

      try {
        // Build the complete URL with query parameters
        const url = `${endpoint}?phase=complete&user=${userId}`

        // Prepare the payload
        const payload = {
          approval: 'completed',
          ...variables
        }

        // Make direct POST request to the Kogito process endpoint
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to complete task: ${response.status} - ${errorText}`)
        }

        toast.success('Task completed successfully')

        setState(prev => ({
          ...prev,
          isCompleting: false,
          isCompleted: true
        }))

        return true
      } catch (error) {
        console.error('[useTaskCompletion] Failed to complete task:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to complete task')
        setState(prev => ({ ...prev, isCompleting: false }))
        return false
      }
    },
    [state.flowExecutionTask, state.isCompleted, accessToken, userId]
  )

  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  return {
    ...state,
    completeTask,
    refetch: fetchTask,
    hasTask: !!state.flowExecutionTask
  }
}
