import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_MY_TASKS, GET_UPCOMING_TASKS } from '../queries/customerPersonalWorkspaceQueries'
import type { MyTask } from '../types/customerPersonalWorkspaceTypes'

interface UseCustomerPersonalWorkspaceTasksParams {
  employeeId: string
  accessToken: string
  statusFilter?: string[]
  limit?: number
  offset?: number
}

interface UseCustomerPersonalWorkspaceTasksReturn {
  tasks: MyTask[]
  total: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching customer personal workspace tasks
 * Returns tasks assigned to the employee with filtering and pagination
 */
export const useCustomerPersonalWorkspaceTasks = ({
  employeeId,
  accessToken,
  statusFilter = ['PENDING', 'IN_PROGRESS'],
  limit = 50,
  offset = 0
}: UseCustomerPersonalWorkspaceTasksParams): UseCustomerPersonalWorkspaceTasksReturn => {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTasks = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        SalesTask: MyTask[]
        SalesTaskAggregate: {
          aggregate: {
            count: number
          }
        }
      }>(GET_MY_TASKS, {
        employeeId,
        statusFilter,
        limit,
        offset
      })

      setTasks(result.SalesTask || [])
      setTotal(result.SalesTaskAggregate?.aggregate?.count || 0)
    } catch (err) {
      console.error('Error fetching customer personal workspace tasks:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, JSON.stringify(statusFilter), limit, offset])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    total,
    loading,
    error,
    refetch: () => {
      void fetchTasks()
    }
  }
}

interface UseCustomerUpcomingTasksParams {
  employeeId: string
  accessToken: string
  limit?: number
}

interface UseCustomerUpcomingTasksReturn {
  tasks: MyTask[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching upcoming customer tasks
 * Returns a limited set of upcoming tasks for dashboard/overview displays
 */
export const useCustomerUpcomingTasks = ({
  employeeId,
  accessToken,
  limit = 5
}: UseCustomerUpcomingTasksParams): UseCustomerUpcomingTasksReturn => {
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchTasks = useCallback(async () => {
    if (!employeeId || !accessToken) return

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<{
        SalesTask: MyTask[]
      }>(GET_UPCOMING_TASKS, {
        employeeId,
        limit
      })

      setTasks(result.SalesTask || [])
    } catch (err) {
      console.error('Error fetching upcoming customer tasks:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch upcoming tasks'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, limit])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    refetch: () => {
      void fetchTasks()
    }
  }
}
