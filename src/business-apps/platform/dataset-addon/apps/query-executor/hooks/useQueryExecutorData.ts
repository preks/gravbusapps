import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useQueryExecutionClient,
  QueryDefinition,
  DatasetDTO,
  QueryExecutionParams,
  QueryType,
  Services
} from '@/common/network/dataset'

export interface QueryExecutorData {
  queries: QueryDefinition[]
  isLoading: boolean
  error: string | null
  executionResults: DatasetDTO | null
  isExecuting: boolean
  executionError: string | null
}

export const useQueryExecutorData = (context: BusinessAppContextProps, service: Services) => {
  const [queries, setQueries] = useState<QueryDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [executionResults, setExecutionResults] = useState<DatasetDTO | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionError, setExecutionError] = useState<string | null>(null)

  const queryClient = useQueryExecutionClient(context.accessToken, service)

  const loadQueries = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const allQueries = await queryClient.getAllQueries()
      setQueries(allQueries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queries')
    } finally {
      setIsLoading(false)
    }
  }, [queryClient, context.accessToken])

  const executeQuery = useCallback(
    async (queryName: string, queryType: QueryType, parameters: QueryExecutionParams = {}) => {
      setIsExecuting(true)
      setExecutionError(null)
      setExecutionResults(null)

      try {
        const result = await queryClient.executeQuery(queryName, queryType, parameters)
        setExecutionResults(result)
      } catch (err) {
        setExecutionError(err instanceof Error ? err.message : 'Failed to execute query')
      } finally {
        setIsExecuting(false)
      }
    },
    [queryClient]
  )

  const clearResults = useCallback(() => {
    setExecutionResults(null)
    setExecutionError(null)
  }, [])

  useEffect(() => {
    if (context.accessToken) {
      loadQueries()
    }
  }, [context.accessToken, loadQueries])

  return {
    queries,
    isLoading,
    error,
    executionResults,
    isExecuting,
    executionError,
    executeQuery,
    clearResults,
    refetch: loadQueries
  }
}
