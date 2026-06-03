/**
 * useContentEntries Hook
 * Fetch multiple content entries with filtering and pagination
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import type { EntityListQueryResult } from '@/common/data/common/types/queryTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { ContentEntry } from '../types/contentEntryTypes'
import {
  buildContentEntriesRequestQuery,
  buildContentEntriesVariables,
  contentEntryQueryKeys,
  createContentEntriesQueryMeta,
  mapContentEntriesResponse,
  type ContentEntriesData,
  type ContentEntriesResponse,
  type ContentEntriesQueryMeta,
  type ContentEntryQueryParams
} from '../queries/contentQueries'
import type { ContentEntryQueryOptions } from '../queries/contentEntryQueryBuilder'

export interface UseContentEntriesResult extends EntityListQueryResult<ContentEntry, ContentEntriesQueryMeta> {
  entries: ContentEntry[]
  totalCount: number
}

/**
 * Hook to fetch content entries with filters
 */
export const useContentEntries = (
  params: ContentEntryQueryParams = {},
  accessToken?: string,
  options?: ContentEntryQueryOptions,
  customQueryMeta?: Record<string, unknown>
): UseContentEntriesResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const queryKey = useMemo(() => contentEntryQueryKeys.list(params, options), [params, options])
  const queryKeyString = useMemo(() => JSON.stringify(queryKey), [queryKey])
  const customQueryMetaKey = useMemo(() => JSON.stringify(customQueryMeta ?? null), [customQueryMeta])

  const [data, setData] = useState<ContentEntriesData | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isFetched, setIsFetched] = useState(false)

  const requestSequenceRef = useRef(0)
  const dataRef = useRef<ContentEntriesData | undefined>(undefined)
  const customQueryMetaRef = useRef<Record<string, unknown> | undefined>(customQueryMeta)
  dataRef.current = data
  customQueryMetaRef.current = customQueryMeta

  const fetchEntries = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current

    setError(null)
    setIsFetching(true)

    try {
      const query = buildContentEntriesRequestQuery(options)
      const variables = buildContentEntriesVariables(params)
      const response = await graphqlClient.request<ContentEntriesResponse>(query, variables)
      const nextData = mapContentEntriesResponse(response, params, options, customQueryMetaRef.current)

      if (requestSequence !== requestSequenceRef.current) {
        return
      }

      setData(nextData)
      setIsFetched(true)
    } catch (err) {
      if (requestSequence !== requestSequenceRef.current) {
        return
      }

      const errorObject = err instanceof Error ? err : new Error('Failed to fetch content entries')
      setError(errorObject)
      setIsFetched(true)
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsFetching(false)
      }
    }
  }, [graphqlClient, params, options])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries, queryKeyString])

  useEffect(() => {
    if (!dataRef.current || dataRef.current.queryMeta.queryKeyString !== queryKeyString || isFetching) {
      return
    }

    setData(previousData => {
      if (!previousData || previousData.queryMeta.queryKeyString !== queryKeyString) {
        return previousData
      }

      const previousCustomMetaKey = JSON.stringify(previousData.queryMeta.custom ?? null)
      if (previousCustomMetaKey === customQueryMetaKey) {
        return previousData
      }

      return {
        ...previousData,
        queryMeta: {
          ...createContentEntriesQueryMeta(params, options, customQueryMeta),
          queryKey: previousData.queryMeta.queryKey,
          queryKeyString: previousData.queryMeta.queryKeyString
        }
      }
    })
  }, [customQueryMeta, customQueryMetaKey, isFetching, options, params, queryKeyString])

  const hasData = data !== undefined
  const isPlaceholderData = Boolean(isFetching && hasData && data?.queryMeta.queryKeyString !== queryKeyString)

  return {
    data,
    entries: data?.entities ?? [],
    totalCount: data?.totalCount ?? 0,
    error,
    isLoading: isFetching && !hasData,
    isFetching,
    isRefetching: isFetching && hasData,
    isFetched,
    isPlaceholderData,
    refetch: fetchEntries
  }
}
