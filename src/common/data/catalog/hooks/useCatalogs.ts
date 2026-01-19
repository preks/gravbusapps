import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_CATALOGS } from '../queries/catalogQueries'
import { BaseCatalog, Catalog, CatalogList, CatalogQueryOptions, CatalogResponse } from '../types/catalogTypes'
import { toCatalog } from '../mappers/catalogMappers'

export const useCatalogs = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCatalogs = useCallback(
    async (variables: CatalogQueryOptions = {}): Promise<CatalogList> => {
      if (!context.accessToken) {
        throw new Error('Missing access token')
      }

      const query = GET_CATALOGS(variables)
      try {
        const result = await graphqlClient.request<CatalogResponse>(query)

        const items: Catalog[] = (result.Catalog as BaseCatalog[]).map(baseCatalog =>
          toCatalog(baseCatalog, {
            mapEntries: !!variables.includeCatalogEntries,
            mapChildEntries: !!variables.includeChildCatalogEntries,
            entriesLimit: variables.entriesLimit,
            entriesOffset: variables.entriesOffset,
            search: variables.search
          })
        )

        const total = result.CatalogAggregate?.aggregate?.count || items.length || 0
        const limit = variables.limit ?? 20
        const offset = variables.offset ?? 0
        const page = limit > 0 ? Math.floor(offset / limit) + 1 : 1

        return {
          items,
          total,
          limit,
          offset,
          page,
          search: variables.search,
          loading: false
        } as CatalogList
      } catch (error) {
        console.error('Error fetching catalogs:', error)
        throw error
      }
    },
    [context.accessToken, graphqlClient]
  )

  return { fetchCatalogs }
}

export default useCatalogs
