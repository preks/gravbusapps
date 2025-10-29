/**
 * useContentEntries Hook
 * Fetch multiple content entries with filtering and pagination
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildContentEntriesQuery } from '../queries/contentQueries'
import { mapBaseToContentEntry } from '../mappers/contentMappers'
import type { ContentEntry, ContentEntryQueryParams } from '../types/contentTypes'
import type { BaseContentEntry } from '../types/contentBaseTypes'

interface UseContentEntriesResult {
  entries: ContentEntry[]
  isLoading: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentEntriesResponse {
  ContentEntry: BaseContentEntry[]
  ContentEntryAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch content entries with filters
 * FIXED: Use real GraphQL client and singular relation names
 */
export const useContentEntries = (
  params: ContentEntryQueryParams = {},
  accessToken?: string
): UseContentEntriesResult => {
  const [entries, setEntries] = useState<ContentEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = buildContentEntriesQuery(params)
      const response = await graphqlClient.request<ContentEntriesResponse>(query)

      if (response.ContentEntry) {
        const mappedEntries = response.ContentEntry.map((entry: any) =>
          mapBaseToContentEntry(entry, {
            contentEntryCategory: entry.contentEntryCategory,
            contentEntryTag: entry.contentEntryTag,
            contentDocument: entry.contentDocument,
            contentEntryReaction: entry.contentEntryReaction,
            childContentEntryAggregate: entry.childContentEntryAggregate
          })
        )

        setEntries(mappedEntries)
        setTotalCount(response.ContentEntryAggregate?.aggregate?.count || mappedEntries.length)
      } else {
        setEntries([])
        setTotalCount(0)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch content entries')
      setError(errorObj)
      console.error('Error fetching content entries:', err)
    } finally {
      setIsLoading(false)
    }
  }, [params, accessToken, graphqlClient])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return {
    entries,
    isLoading,
    error,
    totalCount,
    refetch: fetchEntries
  }
}
