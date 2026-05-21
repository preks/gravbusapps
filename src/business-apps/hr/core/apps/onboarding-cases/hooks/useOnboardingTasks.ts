import { useCallback, useEffect, useMemo, useState } from 'react'
import { OnboardingTask, OnboardingTasksClient } from '../services/OnboardingTasksClient'

interface UseOnboardingTasksParams {
  accessToken: string
  userId: string | undefined
  appTag: string
  workflowIds: string[]
  templateIds: string[]
  enabled: boolean
  loadErrorMessage: string
  claimErrorMessage: string
}

export const useOnboardingTasks = ({
  accessToken,
  userId,
  appTag,
  workflowIds,
  templateIds,
  enabled,
  loadErrorMessage,
  claimErrorMessage
}: UseOnboardingTasksParams) => {
  const [myTasks, setMyTasks] = useState<OnboardingTask[]>([])
  const [allTasks, setAllTasks] = useState<OnboardingTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const workflowIdSet = useMemo(() => new Set(workflowIds), [workflowIds])
  const uniqueTemplateIds = useMemo(() => [...new Set(templateIds.filter(Boolean))], [templateIds])

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
    if (!enabled || !accessToken) {
      setMyTasks([])
      setAllTasks([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const client = new OnboardingTasksClient(accessToken)
      const myTaskResponses = userId
        ? await Promise.all([
            client.getCurrentUserTasks(userId, appTag),
            client.getCurrentUserCompletedTasks(userId, appTag)
          ])
        : []
      const templateTaskResponses = await Promise.all(
        uniqueTemplateIds.flatMap(templateId => [
          client.getTemplateTasks(templateId, appTag),
          client.getTemplateCompletedTasks(templateId, appTag)
        ])
      )
      const myTasksById = new Map<string, OnboardingTask>()
      const allTasksById = new Map<string, OnboardingTask>()

      myTaskResponses.forEach(response => {
        response.tasks.forEach(task => myTasksById.set(task.id, task))
      })
      templateTaskResponses.forEach(response => {
        response.tasks.forEach(task => allTasksById.set(task.id, task))
      })

      setMyTasks(filterTasksForSelectedCase(Array.from(myTasksById.values())))
      setAllTasks(filterTasksForSelectedCase(Array.from(allTasksById.values())))
    } catch (err) {
      console.error('Failed to load onboarding tasks:', err)
      setError(loadErrorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, appTag, enabled, filterTasksForSelectedCase, loadErrorMessage, uniqueTemplateIds, userId])

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
        setError(claimErrorMessage)
      } finally {
        setClaimingTaskId(null)
      }
    },
    [accessToken, claimErrorMessage, loadTasks, userId]
  )

  return {
    tasks: myTasks,
    myTasks,
    allTasks,
    isLoading,
    claimingTaskId,
    error,
    claimTask,
    refetch: loadTasks
  }
}
