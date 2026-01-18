import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface TaskStatisticItem {
  value: number
  changePercent: number
  isPositive: boolean
}

export interface TaskStatistics {
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
  refetch: () => Promise<void>
}

interface TaskStatisticsQueryResult {
  // My Tasks - Current
  myTotal: { aggregate: { count: number } }
  myInProgress: { aggregate: { count: number } }
  myCompleted: { aggregate: { count: number } }
  myOverdue: { aggregate: { count: number } }
  // My Tasks - Previous
  myTotalPrevious: { aggregate: { count: number } }
  myInProgressPrevious: { aggregate: { count: number } }
  myCompletedPrevious: { aggregate: { count: number } }
  myOverduePrevious: { aggregate: { count: number } }
  // Team Tasks - Current
  teamTotal: { aggregate: { count: number } }
  teamInProgress: { aggregate: { count: number } }
  teamCompleted: { aggregate: { count: number } }
  teamOverdue: { aggregate: { count: number } }
  // Team Tasks - Previous
  teamTotalPrevious: { aggregate: { count: number } }
  teamInProgressPrevious: { aggregate: { count: number } }
  teamCompletedPrevious: { aggregate: { count: number } }
  teamOverduePrevious: { aggregate: { count: number } }
}

// Helper function to calculate trend (same pattern as lead statistics)
const calculateTrend = (current: number, previous: number): { changePercent: number; isPositive: boolean } => {
  let changePercent: number
  if (previous > 0) {
    changePercent = ((current - previous) / previous) * 100
  } else if (current > 0) {
    changePercent = 100
  } else {
    changePercent = 0
  }
  return {
    changePercent,
    isPositive: current >= previous
  }
}

/**
 * Shared hook for fetching task statistics (my tasks and team tasks)
 * @param context - Business app context with access token and user info
 * @param query - GraphQL query string for fetching statistics
 */
export const useTaskStatistics = (context: BusinessAppContextProps, query: string): TaskStatistics => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const isFirstLoadRef = useRef(true)

  // Combine ALL state into a single object to ensure single render on updates
  const [state, setState] = useState({
    isLoading: true,
    error: null as Error | null,
    myTasksStatistics: {
      totalTasks: { value: 0, changePercent: 0, isPositive: true },
      inProgress: { value: 0, changePercent: 0, isPositive: true },
      completed: { value: 0, changePercent: 0, isPositive: true },
      overdue: { value: 0, changePercent: 0, isPositive: false }
    },
    teamTasksStatistics: {
      totalTasks: { value: 0, changePercent: 0, isPositive: true },
      inProgress: { value: 0, changePercent: 0, isPositive: true },
      completed: { value: 0, changePercent: 0, isPositive: true },
      overdue: { value: 0, changePercent: 0, isPositive: false }
    }
  })

  const loadStatistics = useCallback(async () => {
    if (!context.accessToken) return

    // Only show loading state on first load, not on refetch to prevent flicker
    if (isFirstLoadRef.current) {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
    }

    try {
      const employeeId = context.userInfo?.employeeDetails?.employeeId || context.userInfo?.id

      // Calculate time periods for trend comparison (7 days ago)
      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const result = await graphqlClient.request<TaskStatisticsQueryResult>(query, {
        employeeId: employeeId || null,
        sevenDaysAgo: sevenDaysAgo.toISOString()
      })

      // Calculate trends for My Tasks
      const myTotalTrend = calculateTrend(result.myTotal.aggregate.count, result.myTotalPrevious.aggregate.count)
      const myInProgressTrend = calculateTrend(
        result.myInProgress.aggregate.count,
        result.myInProgressPrevious.aggregate.count
      )
      const myCompletedTrend = calculateTrend(
        result.myCompleted.aggregate.count,
        result.myCompletedPrevious.aggregate.count
      )
      const myOverdueTrend = calculateTrend(result.myOverdue.aggregate.count, result.myOverduePrevious.aggregate.count)

      // Calculate trends for Team Tasks
      const teamTotalTrend = calculateTrend(result.teamTotal.aggregate.count, result.teamTotalPrevious.aggregate.count)
      const teamInProgressTrend = calculateTrend(
        result.teamInProgress.aggregate.count,
        result.teamInProgressPrevious.aggregate.count
      )
      const teamCompletedTrend = calculateTrend(
        result.teamCompleted.aggregate.count,
        result.teamCompletedPrevious.aggregate.count
      )
      const teamOverdueTrend = calculateTrend(
        result.teamOverdue.aggregate.count,
        result.teamOverduePrevious.aggregate.count
      )

      // Single setState with all data to prevent double renders
      setState({
        isLoading: false,
        error: null,
        myTasksStatistics: {
          totalTasks: { value: result.myTotal.aggregate.count, ...myTotalTrend },
          inProgress: { value: result.myInProgress.aggregate.count, ...myInProgressTrend },
          completed: { value: result.myCompleted.aggregate.count, ...myCompletedTrend },
          overdue: { value: result.myOverdue.aggregate.count, ...myOverdueTrend }
        },
        teamTasksStatistics: {
          totalTasks: { value: result.teamTotal.aggregate.count, ...teamTotalTrend },
          inProgress: { value: result.teamInProgress.aggregate.count, ...teamInProgressTrend },
          completed: { value: result.teamCompleted.aggregate.count, ...teamCompletedTrend },
          overdue: { value: result.teamOverdue.aggregate.count, ...teamOverdueTrend }
        }
      })
      isFirstLoadRef.current = false
    } catch (err) {
      // Single setState with error
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Failed to load statistics')
      }))
      isFirstLoadRef.current = false
    }
  }, [context.accessToken, context.userInfo?.employeeDetails?.employeeId, context.userInfo?.id, graphqlClient, query])

  useEffect(() => {
    if (context.accessToken) {
      loadStatistics()
    }
  }, [context.accessToken, loadStatistics])

  return {
    myTasksStatistics: state.myTasksStatistics,
    teamTasksStatistics: state.teamTasksStatistics,
    isLoading: state.isLoading,
    error: state.error,
    refetch: loadStatistics
  }
}
