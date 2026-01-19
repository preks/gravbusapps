import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_CATALOG } from '../queries/catalogQueries'
import { toCatalog } from '../mappers/catalogMappers'
import { BaseCatalog, Catalog, CatalogIncludeOptions, CatalogQueryOptions } from '../types/catalogTypes'

interface FetchCatalogParams extends Partial<CatalogQueryOptions> {
  identifier: string
  version?: string
}

export const useCatalog = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCatalog = useCallback(
    async (params: FetchCatalogParams, includeOptions: CatalogIncludeOptions = {}): Promise<Catalog | null> => {
      if (!context.accessToken) {
        throw new Error('Missing access token')
      }

      const identifier = params.identifier
      const version = params.version || 'v1'

      // Always use GET_CATALOG. If entries not requested, set limit 0 to avoid fetching them.
      const includeEntries =
        !!includeOptions.includeCatalogEntries ||
        !!params.entriesLimit ||
        !!params.entriesOffset ||
        !!params.search ||
        !!params.orderBy
      const query = GET_CATALOG({
        identifier,
        version,
        limit: includeEntries ? (params.entriesLimit ?? params.limit) : 0,
        offset: includeEntries ? (params.entriesOffset ?? 0) : 0,
        search: includeEntries ? params.search : undefined,
        orderBy: includeEntries ? params.orderBy : undefined,
        includeParentCatalogEntry: includeOptions.includeParentCatalogEntry,
        includeChildCatalogEntries: includeOptions.includeChildCatalogEntries
      })
      const result = await graphqlClient.request<{ Catalog: BaseCatalog[] }>(query)
      const base = (result.Catalog as BaseCatalog[])[0]
      if (!base) return null
      return toCatalog(base, {
        mapEntries: includeEntries,
        mapChildEntries: !!includeOptions.includeChildCatalogEntries,
        entriesLimit: includeEntries ? (params.entriesLimit ?? params.limit) : 0,
        entriesOffset: includeEntries ? (params.entriesOffset ?? 0) : 0,
        search: includeEntries ? params.search : undefined
      })
    },
    [context.accessToken, graphqlClient]
  )

  return { fetchCatalog }
}

export default useCatalog
