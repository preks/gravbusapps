import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CampaignListPagination {
  pageIndex: number
  pageSize: number
}

export interface CampaignListAggregate {
  count?: number | null
  sum?: Record<string, number | null> | null
}

export interface UseCampaignEntityByIdResult<TEntity> {
  entity: TEntity | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic single-entity (by primary key) fetch hook shared by the campaign record sub-entity hooks
 * (content, event, ...). `responseKey` is the GraphQL `*ByPk` field name on the response.
 */
export function useCampaignEntityById<TEntity>(
  accessToken: string,
  id: string | undefined,
  query: string,
  responseKey: string,
  errorMessage: string
): UseCampaignEntityByIdResult<TEntity> {
  const graphqlClient = useGraphQLClient(accessToken)
  const [entity, setEntity] = useState<TEntity | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  const fetchEntity = useCallback(async () => {
    if (!id || !accessToken) {
      setEntity(null)
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<Record<string, TEntity | null>>(query, { id })
      setEntity(result?.[responseKey] ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : errorMessage)
      setEntity(null)
    } finally {
      setLoading(false)
    }
  }, [id, accessToken, graphqlClient, query, responseKey, errorMessage])

  useEffect(() => {
    fetchEntity()
  }, [fetchEntity])

  return { entity, loading, error, refetch: fetchEntity }
}

export interface UseCampaignEntityListConfig {
  context: BusinessAppContextProps
  campaignId: string | undefined
  query: string
  /** GraphQL field name of the list result (e.g. `CustomerCampaignContent`). */
  itemsKey: string
  /** GraphQL field name of the aggregate result (e.g. `CustomerCampaignContentAggregate`). */
  aggregateKey: string
  errorMessage: string
  pagination?: CampaignListPagination
  /** Current sort clauses; only used when `defaultOrderBy` is provided. */
  orderBy?: unknown[]
  /** When provided, an `orderBy` variable is always sent (falling back to this default). */
  defaultOrderBy?: unknown[]
  /**
   * Optional case-insensitive search term. When non-empty it is sent as a `$search` variable wrapped
   * for an `_ilike` "contains" match; the query must declare `$search: String` and use it in its
   * `where`. Empty/undefined sends no search variable (Hasura ignores `_ilike: null`).
   */
  search?: string
}

export interface UseCampaignEntityListResult<TItem> {
  items: TItem[]
  totalCount: number
  aggregate: CampaignListAggregate | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Generic paginated list fetch hook shared by the campaign record list hooks (accounts, content,
 * events). Reads the list/aggregate by their GraphQL field names and optionally sends a server-side
 * `orderBy` variable. Domain hooks wrap this and re-map `items`/`aggregate` to their own field names.
 */
export function useCampaignEntityList<TItem>({
  context,
  campaignId,
  query,
  itemsKey,
  aggregateKey,
  errorMessage,
  pagination,
  orderBy,
  defaultOrderBy,
  search
}: UseCampaignEntityListConfig): UseCampaignEntityListResult<TItem> {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const pageIndex = pagination?.pageIndex ?? 0
  const pageSize = pagination?.pageSize ?? 10
  // Stable key so the effect re-runs when the sort changes without needing referential stability from callers.
  const orderByKey = defaultOrderBy === undefined ? '' : JSON.stringify(orderBy ?? defaultOrderBy)
  const trimmedSearch = search?.trim() ?? ''
  const [state, setState] = useState<{
    items: TItem[]
    totalCount: number
    aggregate: CampaignListAggregate | null
    loading: boolean
    error: string | null
  }>({
    items: [],
    totalCount: 0,
    aggregate: null,
    loading: true,
    error: null
  })

  const fetchList = useCallback(async () => {
    if (!context.accessToken || !campaignId) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }
    setState(prev => ({ ...prev, loading: true, error: null }))
    try {
      const variables: Record<string, unknown> = {
        campaignId,
        limit: pageSize,
        offset: pageIndex * pageSize
      }
      if (orderByKey) {
        variables.orderBy = JSON.parse(orderByKey)
      }
      if (trimmedSearch) {
        variables.search = `%${trimmedSearch}%`
      }
      const result = await graphqlClient.request<Record<string, unknown>>(query, variables)
      const items = (result?.[itemsKey] as TItem[] | undefined) ?? []
      const aggregate = (result?.[aggregateKey] as { aggregate?: CampaignListAggregate } | undefined)?.aggregate ?? null
      setState({
        items,
        totalCount: aggregate?.count ?? 0,
        aggregate,
        loading: false,
        error: null
      })
    } catch (err) {
      setState({
        items: [],
        totalCount: 0,
        aggregate: null,
        loading: false,
        error: err instanceof Error ? err.message : errorMessage
      })
    }
  }, [
    context.accessToken,
    graphqlClient,
    campaignId,
    pageIndex,
    pageSize,
    orderByKey,
    trimmedSearch,
    query,
    itemsKey,
    aggregateKey,
    errorMessage
  ])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  return { ...state, refetch: fetchList }
}
