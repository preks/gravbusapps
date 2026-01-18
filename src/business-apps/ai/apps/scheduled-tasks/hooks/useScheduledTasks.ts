import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ScheduledTask, ScheduledTasksClient, TaskExecution } from '@/common/network/flowbot/ScheduledTasksClient'

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

  const client = new ScheduledTasksClient()
  client.setAccessToken(context.accessToken)

  const loadTasks = useCallback(
    async (params?: { includePaused?: boolean; limit?: number; offset?: number }) => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      try {
        const response = await client.listTasks({
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
    [context.accessToken]
  )

  const pauseTask = useCallback(
    async (taskId: string) => {
      try {
        await client.pauseTask(taskId)
        await loadTasks()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to pause task'
        throw new Error(message)
      }
    },
    [loadTasks]
  )

  const resumeTask = useCallback(
    async (taskId: string) => {
      try {
        await client.resumeTask(taskId)
        await loadTasks()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to resume task'
        throw new Error(message)
      }
    },
    [loadTasks]
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      try {
        await client.deleteTask(taskId)
        await loadTasks()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete task'
        throw new Error(message)
      }
    },
    [loadTasks]
  )

  const getTaskExecutions = useCallback(async (taskId: string): Promise<TaskExecution[]> => {
    try {
      return await client.getTaskExecutions(taskId, { limit: 20 })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load executions'
      throw new Error(message)
    }
  }, [])

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
