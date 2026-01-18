import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface BaseGraphQLDataFetchProps<TData> {
  accessToken: string
  enabled: boolean
  limit: number
  offset: number
  fetchFn: (params: {
    graphqlClient: ReturnType<typeof useGraphQLClient>
    limit: number
    offset: number
  }) => Promise<{ data: TData[]; totalCount: number }>
}

export interface BaseGraphQLDataFetchReturn<TData> {
  data: TData[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: (limit?: number, offset?: number) => void
}

/**
 * Base hook for GraphQL data fetching with pagination
 * Handles common patterns: loading states, error handling, pagination tracking
 */
export const useBaseGraphQLDataFetch = <TData>({
  accessToken,
  enabled,
  limit,
  offset,
  fetchFn
}: BaseGraphQLDataFetchProps<TData>): BaseGraphQLDataFetchReturn<TData> => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [data, setData] = useState<TData[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentParams = useRef({ limit, offset })

  const fetchData = useCallback(
    async (fetchLimit: number = limit, fetchOffset: number = offset) => {
      if (!enabled || !accessToken) {
        return
      }

      setIsLoading(true)
      setError(null)
      currentParams.current = { limit: fetchLimit, offset: fetchOffset }

      try {
        const result = await fetchFn({
          graphqlClient,
          limit: fetchLimit,
          offset: fetchOffset
        })

        setData(result.data)
        setTotalCount(result.totalCount)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
        setError(errorMessage)
        console.error(`❌ Error fetching data:`, err)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, enabled, graphqlClient, fetchFn]
  )

  useEffect(() => {
    if (enabled) {
      fetchData(limit, offset)
    }
  }, [enabled, limit, offset, fetchData])

  const refetch = useCallback(
    (newLimit?: number, newOffset?: number) => {
      const fetchLimit = newLimit ?? currentParams.current.limit
      const fetchOffset = newOffset ?? currentParams.current.offset
      fetchData(fetchLimit, fetchOffset)
    },
    [fetchData]
  )

  return {
    data,
    totalCount,
    isLoading,
    error,
    refetch
  }
}
