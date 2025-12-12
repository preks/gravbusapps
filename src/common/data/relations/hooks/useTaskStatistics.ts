import { useState, useCallback, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface TaskStatisticItem {
  value: number
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
  myTotal: { aggregate: { count: number } }
  myInProgress: { aggregate: { count: number } }
  myCompleted: { aggregate: { count: number } }
  myOverdue: { aggregate: { count: number } }
  teamTotal: { aggregate: { count: number } }
  teamInProgress: { aggregate: { count: number } }
  teamCompleted: { aggregate: { count: number } }
  teamOverdue: { aggregate: { count: number } }
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
      totalTasks: { value: 0 },
      inProgress: { value: 0 },
      completed: { value: 0 },
      overdue: { value: 0 }
    },
    teamTasksStatistics: {
      totalTasks: { value: 0 },
      inProgress: { value: 0 },
      completed: { value: 0 },
      overdue: { value: 0 }
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

      const result = await graphqlClient.request<TaskStatisticsQueryResult>(query, {
        employeeId: employeeId || null
      })

      // Single setState with all data to prevent double renders
      setState({
        isLoading: false,
        error: null,
        myTasksStatistics: {
          totalTasks: { value: result.myTotal.aggregate.count },
          inProgress: { value: result.myInProgress.aggregate.count },
          completed: { value: result.myCompleted.aggregate.count },
          overdue: { value: result.myOverdue.aggregate.count }
        },
        teamTasksStatistics: {
          totalTasks: { value: result.teamTotal.aggregate.count },
          inProgress: { value: result.teamInProgress.aggregate.count },
          completed: { value: result.teamCompleted.aggregate.count },
          overdue: { value: result.teamOverdue.aggregate.count }
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
