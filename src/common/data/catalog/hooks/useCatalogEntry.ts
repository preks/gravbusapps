import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_CATALOG_ENTRIES } from '../queries/catalogQueries'
import {
  BaseCatalogEntry,
  CatalogEntry,
  CatalogEntryQueryVariables,
  CatalogEntryResponse,
  CatalogIncludeOptions
} from '../types/catalogTypes'
import { toCatalogEntry } from '../mappers/catalogMappers'

export const useCatalogEntry = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchCatalogEntry = useCallback(
    async (variables: CatalogEntryQueryVariables & CatalogIncludeOptions = {}): Promise<CatalogEntry | null> => {
      if (!accessToken) {
        throw new Error('Missing access token')
      }

      const query = GET_CATALOG_ENTRIES({
        limit: 1,
        offset: 0,
        ...variables
      })

      const result = await graphqlClient.request<CatalogEntryResponse>(query)
      const base = (result.CatalogEntry || [])[0] as BaseCatalogEntry | undefined
      if (!base) return null
      return toCatalogEntry(base, result.CatalogEntry as BaseCatalogEntry[])
    },
    [accessToken, graphqlClient]
  )

  const fetchCatalogEntryById = useCallback(
    async (entryId: string, includeOptions: CatalogIncludeOptions = {}): Promise<CatalogEntry | null> => {
      return fetchCatalogEntry({ entryId, ...includeOptions })
    },
    [fetchCatalogEntry]
  )

  return { fetchCatalogEntry, fetchCatalogEntryById }
}

export default useCatalogEntry
