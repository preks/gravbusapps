import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_MY_INVESTMENT_TASKS } from '../queries/investmentPersonalWorkspaceQueries'
import type { MyInvestmentTask } from '../types/investmentPersonalWorkspaceTypes'

interface UseInvestmentPersonalWorkspaceTasksParams {
  employeeId: string
  accessToken: string
  statusFilter?: string[]
  limit?: number
  offset?: number
}

interface UseInvestmentPersonalWorkspaceTasksReturn {
  tasks: MyInvestmentTask[]
  total: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching investment personal workspace tasks
 * Returns tasks assigned to the employee with filtering and pagination
 */
export const useInvestmentPersonalWorkspaceTasks = ({
  employeeId,
  accessToken,
  statusFilter = ['PENDING', 'IN_PROGRESS'],
  limit = 50,
  offset = 0
}: UseInvestmentPersonalWorkspaceTasksParams): UseInvestmentPersonalWorkspaceTasksReturn => {
  const [tasks, setTasks] = useState<MyInvestmentTask[]>([])
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
        InvestmentTask: MyInvestmentTask[]
        InvestmentTaskAggregate: {
          aggregate: {
            count: number
          }
        }
      }>(GET_MY_INVESTMENT_TASKS, {
        employeeId,
        statusFilter,
        limit,
        offset
      })

      setTasks(result.InvestmentTask || [])
      setTotal(result.InvestmentTaskAggregate?.aggregate?.count || 0)
    } catch (err) {
      console.error('Error fetching investment personal workspace tasks:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch investment tasks'))
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, JSON.stringify(statusFilter), limit, offset, graphqlClient])

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
