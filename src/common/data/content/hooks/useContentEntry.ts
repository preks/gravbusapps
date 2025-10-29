/**
 * useContentEntry Hook
 * Fetch single content entry with full details including nested comments
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildContentEntryQuery } from '../queries/contentQueries'
import { mapBaseToContentEntry, buildCommentHierarchy } from '../mappers/contentMappers'
import type { ContentEntry } from '../types/contentTypes'
import type { BaseContentEntry } from '../types/contentBaseTypes'

interface UseContentEntryResult {
  entry: ContentEntry | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface ContentEntryResponse {
  ContentEntry: BaseContentEntry[]
}

/**
 * Hook to fetch single content entry with all relations
 */
export const useContentEntry = (
  id: string,
  options?: {
    includeChildren?: boolean
    accessToken?: string
  }
): UseContentEntryResult => {
  const [entry, setEntry] = useState<ContentEntry | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(options?.accessToken)

  const fetchEntry = useCallback(async () => {
    if (!id) {
      setEntry(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = buildContentEntryQuery(id)
      const response = await graphqlClient.request<ContentEntryResponse>(query)

      if (response.ContentEntry && response.ContentEntry.length > 0) {
        const baseEntry = response.ContentEntry[0]

        // Build nested comment hierarchy if children are included
        let childContentEntry = baseEntry.childContentEntry
        if (options?.includeChildren && baseEntry.childContentEntry) {
          childContentEntry = buildCommentHierarchy(baseEntry.childContentEntry)
        }

        const mappedEntry = mapBaseToContentEntry(baseEntry, {
          contentEntryCategory: baseEntry.contentEntryCategory,
          contentEntryTag: baseEntry.contentEntryTag,
          contentDocument: baseEntry.contentDocument,
          contentEntryReaction: baseEntry.contentEntryReaction,
          childContentEntries: childContentEntry,
          descendantContentEntryAggregate: (baseEntry as any).descendantContentEntryAggregate
        })

        setEntry(mappedEntry)
      } else {
        setEntry(null)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch content entry')
      setError(errorObj)
      console.error('Error fetching content entry:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id, options?.includeChildren, options?.accessToken])

  useEffect(() => {
    fetchEntry()
  }, [fetchEntry])

  return {
    entry,
    isLoading,
    error,
    refetch: fetchEntry
  }
}
