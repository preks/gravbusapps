'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { TaskFilters } from './useTaskFilters'
import { useSalesTaskQueries } from './useSalesTaskQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface UseTaskStatisticsProps extends TaskFilters {
  accessToken: string
  userInfo?: BusinessAppContextProps['userInfo']
}

interface TaskStatisticsData {
  totalTasks: { value: number }
  inProgress: { value: number }
  completed: { value: number }
  overdue: { value: number }
}

interface UseTaskStatisticsReturn {
  myTasksStatistics: TaskStatisticsData
  teamTasksStatistics: TaskStatisticsData
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Helper: Check if a task is overdue
 */
const isTaskOverdue = (task: any): boolean => {
  return task.dueDate && new Date(task.dueDate) < new Date()
}

/**
 * Helper: Categorize task status
 */
const categorizeTaskStatus = (task: any): 'completed' | 'overdue' | 'in_progress' => {
  if (task.statusRef) {
    const statusValue = task.statusRef.split(':').pop()?.toLowerCase()

    if (statusValue === 'completed' || statusValue === 'done') {
      return 'completed'
    }
    if (statusValue === 'in_progress' || statusValue === 'active') {
      return 'in_progress'
    }
    if (statusValue === 'overdue') {
      return 'overdue'
    }
  }

  // Default: check due date
  return isTaskOverdue(task) ? 'overdue' : 'in_progress'
}

/**
 * Calculate simple statistics from sales tasks (no growth)
 */
const calculateSimpleStatistics = (tasks: any[]): TaskStatisticsData => {
  let total = 0
  let inProgress = 0
  let completed = 0
  let overdue = 0

  for (const task of tasks) {
    total++

    const category = categorizeTaskStatus(task)
    if (category === 'completed') {
      completed++
    } else if (category === 'overdue') {
      overdue++
    } else {
      inProgress++
    }
  }

  return {
    totalTasks: { value: total },
    inProgress: { value: inProgress },
    completed: { value: completed },
    overdue: { value: overdue }
  }
}

export const useTaskStatistics = (props: UseTaskStatisticsProps): UseTaskStatisticsReturn => {
  const { accessToken, userInfo } = props

  // State
  const [myTasksStatistics, setMyTasksStatistics] = useState<TaskStatisticsData>({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  })
  const [teamTasksStatistics, setTeamTasksStatistics] = useState<TaskStatisticsData>({
    totalTasks: { value: 0 },
    inProgress: { value: 0 },
    completed: { value: 0 },
    overdue: { value: 0 }
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // GraphQL queries
  const { fetchHistoricalStatistics } = useSalesTaskQueries({ accessToken })

  // Get current user's employee ID
  const employeeId = useMemo(() => {
    if (userInfo?.employeeDetails?.employeeId) {
      return userInfo.employeeDetails.employeeId
    }
    if ((userInfo as any)?.employeeId) {
      return (userInfo as any).employeeId
    }
    if (userInfo?.id) {
      return userInfo.id
    }
    return null
  }, [userInfo])

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token provided to useTaskStatistics')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch My Tasks statistics (assigned to current user)
      const myTasksFilters = employeeId ? { assignedEmployeeIds: [employeeId] } : {}
      const myTasksResult = await fetchHistoricalStatistics(myTasksFilters)
      const myStats = calculateSimpleStatistics(myTasksResult.allTasks)
      setMyTasksStatistics(myStats)

      // Fetch Team Tasks statistics (all tasks - no assignedEmployeeIds filter)
      const teamTasksResult = await fetchHistoricalStatistics({})
      const teamStats = calculateSimpleStatistics(teamTasksResult.allTasks)
      setTeamTasksStatistics(teamStats)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load task statistics')
      setError(error)
      console.error('Error loading task statistics:', error)
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, fetchHistoricalStatistics])

  // Refetch function
  const refetch = useCallback(() => {
    fetchStatistics()
  }, [fetchStatistics])

  // Auto-reload when accessToken changes
  useEffect(() => {
    if (accessToken) {
      fetchStatistics()
    }
  }, [accessToken, fetchStatistics])

  return {
    statistics: myTasksStatistics, // Return as 'statistics' for backward compatibility
    myTasksStatistics,
    teamTasksStatistics,
    loading,
    error,
    refetch
  }
}
