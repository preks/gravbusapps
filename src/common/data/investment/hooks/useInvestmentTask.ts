// Investment Task hook - single task by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import { buildInvestmentTaskByIdQuery } from '../queries/investmentTaskQueries'
import { toInvestmentTask } from '../mappers/investmentTaskMappers'

export interface UseInvestmentTaskReturn {
  task: InvestmentTask | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment task by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param taskId - Task ID to fetch
 *
 * @example
 * // Basic usage
 * const { task, loading, error } = useInvestmentTask(accessToken, taskId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{task?.subject}</div>
 *
 * @example
 * // With refetch
 * const { task, loading, refetch } = useInvestmentTask(accessToken, taskId)
 *
 * return (
 *   <div>
 *     <div>{task?.subject}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentTask(accessToken: string, taskId: string | undefined): UseInvestmentTaskReturn {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentTaskReturn, 'refetch'>>({
    task: null,
    loading: true,
    error: null
  })

  const fetchTask = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!taskId || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildInvestmentTaskByIdQuery(undefined, taskId)

      // Execute query
      const result = await graphqlClient.request<{ InvestmentTaskByPk: InvestmentTask }>(query)
      const taskData = result.InvestmentTaskByPk
      const task = taskData ? toInvestmentTask(taskData) : null

      setState({ task, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment task'
      console.error('Error fetching investment task:', error)
      setState({ task: null, loading: false, error: errorMessage })
    }
  }, [taskId, accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchTask()
  }, [fetchTask])

  return {
    ...state,
    refetch: fetchTask
  }
}
