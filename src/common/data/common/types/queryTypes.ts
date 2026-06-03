export interface QueryResult<TData> {
  data: TData | undefined
  error: Error | null
  isLoading: boolean
  isFetching: boolean
  isRefetching: boolean
  isFetched: boolean
  isPlaceholderData: boolean
  refetch: () => Promise<void>
}

export interface EntityListData<TEntity, TQueryMeta = unknown> {
  entities: TEntity[]
  totalCount: number
  queryMeta: TQueryMeta
}

export type EntityListQueryResult<TEntity, TQueryMeta = unknown> = QueryResult<EntityListData<TEntity, TQueryMeta>>
