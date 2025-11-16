// Customer Task hook - single task operations
import { useCallback, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { CustomerTask } from '../types/customerTaskTypes'
import { buildCustomerTaskByIdQuery } from '../queries/customerTaskQueries'
import { toCustomerTask } from '../mappers/customerTaskMappers'
import { CustomerTaskFields } from '../types/customerTaskTypes'

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
      const query = buildCustomerTaskByIdQuery(CustomerTaskFields, taskId)
      const result = await graphqlClient.request<{ SalesTaskByPk: any }>(query)
      const task = result.SalesTaskByPk
      setTask(task ? toCustomerTask(task) : null)
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
