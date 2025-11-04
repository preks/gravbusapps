// Customer Task Statistics hook
import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerTasks } from './useCustomerTasks'

interface TaskStatisticItem {
  value: number
}

export interface CustomerTaskStatistics {
  myTasksStatistics: {
    totalTasks: TaskStatisticItem
    inProgress: TaskStatisticItem
    completed: TaskStatisticItem
    overdue: TaskStatisticItem
  }
  teamTasksStatistics: {
    totalTasks: TaskStatisticItem
    inProgress: TaskStatisticItem
    completed: TaskStatisticItem
    overdue: TaskStatisticItem
  }
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export const useCustomerTaskStatistics = (context: BusinessAppContextProps): CustomerTaskStatistics => {
  const { fetchCustomerTasks } = useCustomerTasks(context)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const [myStats, setMyStats] = useState({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  })

  const [teamStats, setTeamStats] = useState({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  })

  const loadStatistics = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id

      // Fetch my tasks
      const myTasksResult = employeeId
        ? await fetchCustomerTasks({ assignedEmployeeIds: [employeeId], limit: 1000 })
        : { tasks: [], total: 0 }

      // Fetch team tasks
      const teamTasksResult = await fetchCustomerTasks({ limit: 1000 })

      // Calculate my tasks statistics
      const myTasks = myTasksResult.tasks || []
      const myInProgress = myTasks.filter(t => (t as any).taskStatusLabel?.toLowerCase().includes('progress')).length
      const myCompleted = myTasks.filter(t => (t as any).taskStatusLabel?.toLowerCase().includes('complete')).length
      const myOverdue = myTasks.filter(t => (t as any).taskStatusLabel?.toLowerCase().includes('overdue')).length

      setMyStats({
        totalTasks: { value: myTasks.length },
        inProgress: { value: myInProgress },
        completed: { value: myCompleted },
        overdue: { value: myOverdue }
      })

      // Calculate team tasks statistics
      const teamTasks = teamTasksResult.tasks || []
      const teamInProgress = teamTasks.filter(t =>
        (t as any).taskStatusLabel?.toLowerCase().includes('progress')
      ).length
      const teamCompleted = teamTasks.filter(t => (t as any).taskStatusLabel?.toLowerCase().includes('complete')).length
      const teamOverdue = teamTasks.filter(t => (t as any).taskStatusLabel?.toLowerCase().includes('overdue')).length

      setTeamStats({
        totalTasks: { value: teamTasks.length },
        inProgress: { value: teamInProgress },
        completed: { value: teamCompleted },
        overdue: { value: teamOverdue }
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load statistics'))
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, context.userInfo, fetchCustomerTasks])

  useEffect(() => {
    loadStatistics()
  }, [loadStatistics])

  return {
    myTasksStatistics: myStats,
    teamTasksStatistics: teamStats,
    isLoading,
    error,
    refetch: loadStatistics
  }
}
