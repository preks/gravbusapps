import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_CATALOG_ENTRIES } from '../queries/catalogQueries'
import { BaseCatalogEntry, CatalogEntry, CatalogEntryQueryVariables, CatalogEntryResponse } from '../types/catalogTypes'
import { toCatalogEntry } from '../mappers/catalogMappers'

interface UseCatalogEntriesProps {
  accessToken: string
}

export const useCatalogEntries = ({ accessToken }: UseCatalogEntriesProps) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchCatalogEntries = useCallback(
    async (
      variables: CatalogEntryQueryVariables & { includeChildCatalogEntries?: boolean }
    ): Promise<{ entries: CatalogEntry[]; totalCount: number }> => {
      const query = GET_CATALOG_ENTRIES(variables)
      const result = await graphqlClient.request<CatalogEntryResponse>(query)
      const baseEntries = (result.CatalogEntry || []) as BaseCatalogEntry[]
      const mapChildEntries = !!variables.includeChildCatalogEntries
      const entries: CatalogEntry[] = baseEntries.map(e => toCatalogEntry(e, baseEntries, mapChildEntries))
      const totalCount = result.CatalogEntryAggregate?.aggregate?.count || entries.length || 0
      return { entries, totalCount }
    },
    [graphqlClient]
  )

  const fetchCatalogEntriesByIdentifier = useCallback(
    async (
      catalogIdentifier: string,
      variables: Omit<CatalogEntryQueryVariables, 'catalogIdentifier'> = {}
    ): Promise<{ entries: CatalogEntry[]; totalCount: number }> => {
      return fetchCatalogEntries({ ...variables, catalogIdentifier })
    },
    [fetchCatalogEntries]
  )

  return { fetchCatalogEntries, fetchCatalogEntriesByIdentifier }
}

export default useCatalogEntries
