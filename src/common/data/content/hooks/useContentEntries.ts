/**
 * useContentEntries Hook
 * Fetch multiple content entries with filtering and pagination
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentEntry } from '../types/contentEntryTypes'
import { buildContentEntriesVariables, type ContentEntryQueryParams } from '../queries/contentQueries'
import { buildContentEntryFields, type ContentEntryQueryOptions } from '../queries/contentEntryQueryBuilder'

interface UseContentEntriesResult {
  entries: ContentEntry[]
  isLoading: boolean
  isRefetching: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentEntriesResponse {
  ContentEntry: ContentEntry[]
  ContentEntryAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch content entries with filters
 */
export const useContentEntries = (
  params: ContentEntryQueryParams = {},
  accessToken?: string,
  options?: ContentEntryQueryOptions
): UseContentEntriesResult => {
  const [entries, setEntries] = useState<ContentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const hasLoadedOnce = useRef(false)

  const graphqlClient = useGraphQLClient(accessToken)

  const paramsKey = useMemo(() => JSON.stringify(params), [params])

  const fetchEntries = useCallback(
    async (silent = false) => {
      if (hasLoadedOnce.current && !silent) {
        setIsRefetching(true)
      } else if (!hasLoadedOnce.current) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const fields = buildContentEntryFields(options || { config: 'list' })

        const query = `
          query getContentEntries(
            $where: ContentEntryBoolExp
            $orderBy: [ContentEntryOrderBy!]
            $limit: Int
            $offset: Int
          ) {
            ContentEntry(
              where: $where
              orderBy: $orderBy
              limit: $limit
              offset: $offset
            ) {
              ${fields}
            }
            ContentEntryAggregate(where: $where) {
              aggregate {
                count
              }
            }
          }
        `

        const variables = buildContentEntriesVariables(params)
        const response = await graphqlClient.request<ContentEntriesResponse>(query, variables)

        if (response.ContentEntry) {
          setEntries(response.ContentEntry)
          setTotalCount(response.ContentEntryAggregate?.aggregate?.count || response.ContentEntry.length)
        } else {
          setEntries([])
          setTotalCount(0)
        }

        hasLoadedOnce.current = true
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to fetch content entries')
        setError(errorObj)
      } finally {
        setIsLoading(false)
        setIsRefetching(false)
      }
    },
    [paramsKey, accessToken, graphqlClient, options]
  )

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries, paramsKey])

  return {
    entries,
    isLoading,
    isRefetching,
    error,
    totalCount,
    refetch: () => fetchEntries(true)
  }
}
