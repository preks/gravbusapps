// Investment Task hook - single task operations
import { useCallback, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentTask } from '../types/investmentTaskTypes'
import { buildInvestmentTaskByIdQuery } from '../queries/investmentTaskQueries'
import { toInvestmentTask } from '../mappers/investmentTaskMappers'

export interface UseInvestmentTaskReturn {
  task: InvestmentTask | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export const useInvestmentTask = (context: BusinessAppContextProps, taskId: string): UseInvestmentTaskReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [task, setTask] = useState<InvestmentTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadTask = useCallback(async () => {
    if (!taskId || !context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      // Use new query builder with fields mapping
      const query = buildInvestmentTaskByIdQuery(undefined, taskId)
      const result = await graphqlClient.request<{ InvestmentTaskByPk: InvestmentTask }>(query)
      const taskData = result.InvestmentTaskByPk
      setTask(taskData ? toInvestmentTask(taskData) : null)
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
