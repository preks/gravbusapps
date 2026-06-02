import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EntityListQueryResult } from '@/common/data/common/types/queryTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  buildEntitiesQuery,
  buildEntitiesVariables,
  entityQueryKeys,
  mapEntitiesResponse,
  type ExampleEntitiesResponse
} from '../queries/entityQueries'
import type {
  ExampleEntitiesData,
  ExampleEntity,
  ExampleEntityListParams,
  ExampleEntityQueryMeta
} from '../types/entityTypes'

export interface UseEntitiesResult extends EntityListQueryResult<ExampleEntity, ExampleEntityQueryMeta> {
  entities: ExampleEntity[]
  totalCount: number
}

export const useEntities = (params: ExampleEntityListParams = {}, accessToken?: string): UseEntitiesResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const queryKey = useMemo(() => entityQueryKeys.list(params), [params])
  const queryKeyString = useMemo(() => JSON.stringify(queryKey), [queryKey])

  const [data, setData] = useState<ExampleEntitiesData | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isFetched, setIsFetched] = useState(false)

  const requestSequenceRef = useRef(0)

  const refetch = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current

    setError(null)
    setIsFetching(true)

    try {
      const query = buildEntitiesQuery()
      const variables = buildEntitiesVariables(params)
      const response = await graphqlClient.request<ExampleEntitiesResponse>(query, variables)
      const nextData = mapEntitiesResponse(response, params)

      if (requestSequence !== requestSequenceRef.current) {
        return
      }

      setData(nextData)
      setIsFetched(true)
    } catch (err) {
      if (requestSequence !== requestSequenceRef.current) {
        return
      }

      setError(err instanceof Error ? err : new Error('Failed to fetch example entities'))
      setIsFetched(true)
    } finally {
      if (requestSequence === requestSequenceRef.current) {
        setIsFetching(false)
      }
    }
  }, [graphqlClient, params])

  useEffect(() => {
    refetch()
  }, [queryKeyString, refetch])

  const hasData = data !== undefined
  const isPlaceholderData = Boolean(isFetching && hasData && data?.queryMeta.queryKeyString !== queryKeyString)

  return {
    data,
    entities: data?.entities ?? [],
    totalCount: data?.totalCount ?? 0,
    error,
    isLoading: isFetching && !hasData,
    isFetching,
    isRefetching: isFetching && hasData,
    isFetched,
    isPlaceholderData,
    refetch
  }
}
