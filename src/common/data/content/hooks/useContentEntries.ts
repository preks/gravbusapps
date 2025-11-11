/**
 * useContentEntries Hook
 * Fetch multiple content entries with filtering and pagination
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildContentEntriesQuery, buildContentEntriesVariables } from '../queries/contentQueries'
import { mapBaseToContentEntry } from '../mappers/contentMappers'
import type { ContentEntry, ContentEntryQueryParams } from '../types/contentTypes'

interface UseContentEntriesResult {
  entries: ContentEntry[]
  isLoading: boolean
  isRefetching: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentEntriesResponse {
  ContentEntry: any[] // GraphQL response - will be transformed to ContentEntry
  ContentEntryAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch content entries with filters
 * FIXED: Use real GraphQL client and singular relation names
 * @param useChildCount - If true, counts only direct answers (for Questions). If false, counts all nested comments (for News/Knowledge/Documents)
 */
export const useContentEntries = (
  params: ContentEntryQueryParams = {},
  accessToken?: string,
  useChildCount = false
): UseContentEntriesResult => {
  const [entries, setEntries] = useState<ContentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const hasLoadedOnce = useRef(false)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEntries = useCallback(
    async (silent = false) => {
      // If we've loaded before and have data, this is a background refetch
      if (hasLoadedOnce.current && !silent) {
        setIsRefetching(true)
      } else if (!hasLoadedOnce.current) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const query = buildContentEntriesQuery(params, useChildCount)
        const variables = buildContentEntriesVariables(params)
        const response = await graphqlClient.request<ContentEntriesResponse>(query, variables)

        if (response.ContentEntry) {
          const mappedEntries = response.ContentEntry.map((entry: any) =>
            mapBaseToContentEntry(entry, {
              contentEntryCategory: entry.contentEntryCategory,
              contentEntryTag: entry.contentEntryTag,
              contentDocument: entry.contentDocument,
              contentEntryReaction: entry.contentEntryReaction,
              descendantContentEntryAggregate: entry.descendantContentEntryAggregate,
              childContentEntryAggregate: entry.childContentEntryAggregate
            })
          )

          setEntries(mappedEntries)
          setTotalCount(response.ContentEntryAggregate?.aggregate?.count || mappedEntries.length)
        } else {
          setEntries([])
          setTotalCount(0)
        }

        hasLoadedOnce.current = true
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Failed to fetch content entries')
        setError(errorObj)
        console.error('Error fetching content entries:', err)
      } finally {
        setIsLoading(false)
        setIsRefetching(false)
      }
    },
    [params, accessToken, graphqlClient, useChildCount]
  )

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return {
    entries,
    isLoading,
    isRefetching,
    error,
    totalCount,
    refetch: () => fetchEntries(true)
  }
}
