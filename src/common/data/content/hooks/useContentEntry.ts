/**
 * useContentEntry Hook
 * Fetch single content entry with full details including nested comments
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentEntry } from '../types/contentEntryTypes'
import { buildContentEntryFields, type ContentEntryQueryOptions } from '../queries/contentEntryQueryBuilder'

interface UseContentEntryResult {
  entry: ContentEntry | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface ContentEntryByPkResponse {
  ContentEntryByPk: ContentEntry | null
}

/**
 * Hook to fetch single content entry with all relations
 */
export const useContentEntry = (
  id: string,
  options?: {
    accessToken?: string
    queryOptions?: ContentEntryQueryOptions
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
      // Get fields from builder
      const fields = buildContentEntryFields(options?.queryOptions || { config: 'detail' })

      // Build query with ContentEntryByPk using variables
      const query = `
        query getContentEntry($id: uuid!) {
          ContentEntryByPk(id: $id) {
            ${fields}
          }
        }
      `

      const response = await graphqlClient.request<ContentEntryByPkResponse>(query, { id })

      if (response.ContentEntryByPk) {
        setEntry(response.ContentEntryByPk)
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
  }, [id, options?.accessToken, options?.queryOptions, graphqlClient])

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
