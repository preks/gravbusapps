// Investment Task hook - single task operations
import { useCallback, useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentTask } from '../types'
import { GET_INVESTMENT_TASK_BY_ID } from '../queries/investmentTaskQueries'
import { toInvestmentTask } from '../mappers'

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
      const result = await graphqlClient.request<{ InvestmentTask: InvestmentTask[] }>(GET_INVESTMENT_TASK_BY_ID, {
        id: taskId
      })
      const first = (result.InvestmentTask || [])[0]
      setTask(first ? toInvestmentTask(first) : null)
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
