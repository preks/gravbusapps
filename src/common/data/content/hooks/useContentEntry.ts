/**
 * useContentEntry Hook
 * Fetch single content entry with full details including nested comments
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { QueryResult } from '@/common/data/common/types/queryTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentEntry } from '../types/contentEntryTypes'
import {
  buildContentEntryByIdQuery,
  contentEntryQueryKeys,
  type ContentEntryByPkResponse
} from '../queries/contentQueries'
import type { ContentEntryQueryOptions } from '../queries/contentEntryQueryBuilder'

export interface UseContentEntryResult extends QueryResult<ContentEntry | null> {
  entry: ContentEntry | null
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
  const queryOptions = options?.queryOptions
  const graphqlClient = useGraphQLClient(options?.accessToken)
  const queryKey = useMemo(() => contentEntryQueryKeys.detail(id, queryOptions), [id, queryOptions])
  const queryKeyString = useMemo(() => JSON.stringify(queryKey), [queryKey])

  const [data, setData] = useState<ContentEntry | null | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isFetched, setIsFetched] = useState(false)
  const [resolvedQueryKeyString, setResolvedQueryKeyString] = useState<string | null>(null)

  const requestSequenceRef = useRef(0)

  const fetchEntry = useCallback(async () => {
    if (!id) {
      requestSequenceRef.current += 1
      setData(undefined)
      setError(null)
      setIsFetching(false)
      setIsFetched(false)
      setResolvedQueryKeyString(null)
      return
    }

    const requestSequence = ++requestSequenceRef.current

    setError(null)
    setIsFetching(true)

    try {
      const query = buildContentEntryByIdQuery(queryOptions)
      const response = await graphqlClient.request<ContentEntryByPkResponse>(query, { id })
      const nextData = response.ContentEntryByPk ?? null

      if (requestSequence !== requestSequenceRef.current) {
        return
      }

      setData(nextData)
      setIsFetched(true)
      setResolvedQueryKeyString(queryKeyString)
    } catch (err) {
      if (requestSequence !== requestSequenceRef.current) {
        return
      }

      const errorObject = err instanceof Error ? err : new Error('Failed to fetch content entry')
      setError(errorObject)
      setIsFetched(true)
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsFetching(false)
      }
    }
  }, [graphqlClient, id, queryKeyString, queryOptions])

  useEffect(() => {
    fetchEntry()
  }, [fetchEntry, queryKeyString])

  const hasData = data !== undefined

  return {
    data,
    entry: data ?? null,
    error,
    isLoading: isFetching && !hasData,
    isFetching,
    isRefetching: isFetching && hasData,
    isFetched,
    isPlaceholderData: Boolean(isFetching && hasData && resolvedQueryKeyString !== queryKeyString),
    refetch: fetchEntry
  }
}
