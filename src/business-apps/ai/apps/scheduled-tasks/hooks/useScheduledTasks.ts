import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { type ScheduledTask, type TaskExecution } from '@/common/network/flowbot/FlowbotClient'
import { useFlowbotClient } from '@/common/network/flowbot/useFlowbotClient'

export type { ScheduledTask, TaskExecution }

export interface UseScheduledTasksState {
  tasks: ScheduledTask[]
  total: number
  isLoading: boolean
  error: string | null
}

export const useScheduledTasks = (context: BusinessAppContextProps) => {
  const [state, setState] = useState<UseScheduledTasksState>({
    tasks: [],
    total: 0,
    isLoading: false,
    error: null
  })

  const client = useFlowbotClient(context.accessToken)

  const loadTasks = useCallback(
    async (params?: { includePaused?: boolean; limit?: number; offset?: number }) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      try {
        const response = await client.listScheduledTasks({
          include_paused: params?.includePaused ?? true,
          limit: params?.limit ?? 50,
          offset: params?.offset ?? 0
        })
        setState({
          tasks: response.tasks,
          total: response.total,
          isLoading: false,
          error: null
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load scheduled tasks'
        setState(prev => ({ ...prev, error: message, isLoading: false }))
      }
    },
    [client]
  )

  const pauseTask = useCallback(
    async (taskId: string) => {
      try {
        await client.pauseScheduledTask(taskId)
        await loadTasks()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to pause task'
        throw new Error(message)
      }
    },
    [client, loadTasks]
  )

  const resumeTask = useCallback(
    async (taskId: string) => {
      try {
        await client.resumeScheduledTask(taskId)
        await loadTasks()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to resume task'
        throw new Error(message)
      }
    },
    [client, loadTasks]
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await client.deleteScheduledTask(taskId)
        await loadTasks()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete task'
        throw new Error(message)
      }
    },
    [client, loadTasks]
  )

  const getTaskExecutions = useCallback(
    async (taskId: string): Promise<TaskExecution[]> => {
      try {
        return await client.getTaskExecutions(taskId, { limit: 20 })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load executions'
        throw new Error(message)
      }
    },
    [client]
  )

  useEffect(() => {
    loadTasks()
  }, [])

  return {
    ...state,
    reload: loadTasks,
    pauseTask,
    resumeTask,
    deleteTask,
    getTaskExecutions
  }
}
