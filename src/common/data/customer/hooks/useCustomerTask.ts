// Customer Task hook - single task operations
import { useCallback, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CustomerTask } from '../types'
import { GET_CUSTOMER_TASK_BY_ID } from '../queries/customerTaskQueries'
import { toCustomerTask } from '../mappers'

export interface UseCustomerTaskReturn {
  task: CustomerTask | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export const useCustomerTask = (context: BusinessAppContextProps, taskId: string): UseCustomerTaskReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [task, setTask] = useState<CustomerTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadTask = useCallback(async () => {
    if (!taskId || !context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_CUSTOMER_TASK_BY_ID(taskId)
      const result = await graphqlClient.request<{ SalesTask: CustomerTask[] }>(query)
      const tasks = result.SalesTask.map(toCustomerTask)
      setTask(tasks.length > 0 ? tasks[0] : null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load task'))
    } finally {
      setIsLoading(false)
    }
  }, [taskId, context.accessToken, graphqlClient])

  useEffect(() => {
    loadTask()
  }, [loadTask])

  return {
    task,
    isLoading,
    error,
    refetch: loadTask
  }
}
