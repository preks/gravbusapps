import { GET_CATALOG_ENTRIES } from '@/common/data/catalog/queries/catalogQueries'
import { toCatalogEntry } from '@/common/data/catalog/mappers/catalogMappers'
import type {
  BaseCatalogEntry,
  CatalogEntry,
  CatalogEntryQueryVariables,
  CatalogEntryResponse
} from '@/common/data/catalog/types/catalogTypes'
import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'

export const JOB_FAMILY_CATALOG = 'JobFamily'
export const JOB_FAMILY_VERSION = 'v1'

export const JOB_FAMILY_ORDER_BY: Array<{ field: string; direction: 'ASC' }> = [
  { field: 'value', direction: 'ASC' },
  { field: 'code', direction: 'ASC' }
]

export interface FetchJobFamilyCatalogEntriesParams {
  limit?: number
  offset?: number
  search?: string
}

export async function fetchJobFamilyCatalogEntries(
  graphqlClient: GraphQLClient,
  params: FetchJobFamilyCatalogEntriesParams = {}
): Promise<{ entries: CatalogEntry[]; totalCount: number }> {
  const limit = Math.min(params.limit ?? 100, 1000)
  const offset = params.offset ?? 0
  const search = params.search?.trim()

  const variables: CatalogEntryQueryVariables & { includeChildCatalogEntries?: boolean } = {
    catalogIdentifier: JOB_FAMILY_CATALOG,
    version: JOB_FAMILY_VERSION,
    limit,
    offset,
    search: search || undefined,
    includeChildCatalogEntries: true,
    orderBy: JOB_FAMILY_ORDER_BY
  }

  const query = GET_CATALOG_ENTRIES(variables)
  const result = await graphqlClient.request<CatalogEntryResponse>(query)
  const baseEntries = (result.CatalogEntry || []) as BaseCatalogEntry[]
  const entries: CatalogEntry[] = baseEntries.map(e => toCatalogEntry(e, baseEntries, true))
  const totalCount = result.CatalogEntryAggregate?.aggregate?.count ?? entries.length
  return { entries, totalCount }
}
