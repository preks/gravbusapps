import { useCallback, useEffect, useMemo, useState } from 'react'
import { OnboardingTask, OnboardingTasksClient } from '../services/OnboardingTasksClient'

interface UseOnboardingTasksParams {
  accessToken: string
  userId: string | undefined
  appTag: string
  workflowIds: string[]
  enabled: boolean
}

export const useOnboardingTasks = ({ accessToken, userId, appTag, workflowIds, enabled }: UseOnboardingTasksParams) => {
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const workflowIdSet = useMemo(() => new Set(workflowIds), [workflowIds])

  const getTaskWorkflowId = (task: OnboardingTask) => task.flowId || task.workflowId || task.requestId

  const filterTasksForSelectedCase = useCallback(
    (nextTasks: OnboardingTask[]) =>
      workflowIdSet.size > 0
        ? nextTasks.filter(task => {
            const taskWorkflowId = getTaskWorkflowId(task)
            return Boolean(taskWorkflowId && workflowIdSet.has(taskWorkflowId))
          })
        : [],
    [workflowIdSet]
  )

  const loadTasks = useCallback(async () => {
    if (!enabled || !accessToken || !userId) {
      setTasks([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const client = new OnboardingTasksClient(accessToken)
      const [activeResponse, completedResponse] = await Promise.all([
        client.getCurrentUserTasks(userId, appTag),
        client.getCurrentUserCompletedTasks(userId, appTag)
      ])
      const tasksById = new Map<string, OnboardingTask>()

      activeResponse.tasks.forEach(task => tasksById.set(task.id, task))
      completedResponse.tasks.forEach(task => tasksById.set(task.id, task))

      const caseTasks = filterTasksForSelectedCase(Array.from(tasksById.values()))

      setTasks(caseTasks)
    } catch (err) {
      console.error('Failed to load onboarding tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load onboarding tasks')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, appTag, enabled, filterTasksForSelectedCase, userId])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const claimTask = useCallback(
    async (taskId: string) => {
      if (!accessToken || !userId) return

      setClaimingTaskId(taskId)
      setError(null)

      try {
        const client = new OnboardingTasksClient(accessToken)
        await client.claimTask(taskId, userId)
        await loadTasks()
      } catch (err) {
        console.error('Failed to claim onboarding task:', err)
        setError(err instanceof Error ? err.message : 'Failed to claim onboarding task')
      } finally {
        setClaimingTaskId(null)
      }
    },
    [accessToken, loadTasks, userId]
  )

  return {
    tasks,
    isLoading,
    claimingTaskId,
    error,
    claimTask,
    refetch: loadTasks
  }
}
