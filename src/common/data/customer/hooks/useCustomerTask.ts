// Customer Task hook - single task by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { CustomerTask } from '../types/customerTaskTypes'
import { buildCustomerTaskByIdQuery } from '../queries/customerTaskQueries'
import { toCustomerTask } from '../mappers/customerTaskMappers'
import { CustomerTaskFields } from '../types/customerTaskTypes'

export interface UseCustomerTaskReturn {
  task: CustomerTask | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single customer task by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param taskId - Task ID to fetch
 *
 * @example
 * // Basic usage
 * const { task, loading, error } = useCustomerTask(accessToken, taskId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{task?.subject}</div>
 *
 * @example
 * // With refetch
 * const { task, loading, refetch } = useCustomerTask(accessToken, taskId)
 *
 * return (
 *   <div>
 *     <div>{task?.subject}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useCustomerTask(accessToken: string, taskId: string | undefined): UseCustomerTaskReturn {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseCustomerTaskReturn, 'refetch'>>({
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
      const query = buildCustomerTaskByIdQuery(CustomerTaskFields, taskId)

      // Execute query
      const result = await graphqlClient.request<{ SalesTaskByPk: any }>(query)
      const taskData = result.SalesTaskByPk
      const task = taskData ? toCustomerTask(taskData) : null

      setState({ task, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer task'
      console.error('Error fetching customer task:', error)
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
