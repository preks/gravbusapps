import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { QueryResult } from '@/common/data/common/types/queryTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildEntityQuery,
  entityQueryKeys,
  mapEntityResponse,
  type ExampleEntityResponse
} from '../queries/entityQueries'
import type { ExampleEntity } from '../types/entityTypes'

export interface UseEntityResult extends QueryResult<ExampleEntity | null> {
  entity: ExampleEntity | null
}

export const useEntity = (id: string, accessToken?: string): UseEntityResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const queryKey = useMemo(() => entityQueryKeys.detail(id), [id])
  const queryKeyString = useMemo(() => JSON.stringify(queryKey), [queryKey])

  const [data, setData] = useState<ExampleEntity | null | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isFetched, setIsFetched] = useState(false)
  const [resolvedQueryKeyString, setResolvedQueryKeyString] = useState<string | null>(null)

  const requestSequenceRef = useRef(0)

  const refetch = useCallback(async () => {
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
      const query = buildEntityQuery()
      const response = await graphqlClient.request<ExampleEntityResponse>(query, { id })
      const nextData = mapEntityResponse(response)

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

      setError(err instanceof Error ? err : new Error('Failed to fetch example entity'))
      setIsFetched(true)
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsFetching(false)
      }
    }
  }, [graphqlClient, id, queryKeyString])

  useEffect(() => {
    refetch()
  }, [queryKeyString, refetch])

  const hasData = data !== undefined

  return {
    data,
    entity: data ?? null,
    error,
    isLoading: isFetching && !hasData,
    isFetching,
    isRefetching: isFetching && hasData,
    isFetched,
    isPlaceholderData: Boolean(isFetching && hasData && resolvedQueryKeyString !== queryKeyString),
    refetch
  }
}
