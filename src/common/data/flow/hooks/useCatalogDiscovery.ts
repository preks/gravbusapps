import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_CATALOGS, GET_CATALOG_ENTRIES } from '@/common/data/catalog/queries/catalogQueries'
import type {
  BaseCatalog,
  BaseCatalogEntry,
  CatalogEntryResponse,
  CatalogResponse
} from '@/common/data/catalog/types/catalogTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { CatalogEntriesResponse, CatalogEntry, CatalogField, CatalogMetadata } from '../types/catalogTypes'

/**
 * Hook to discover and fetch catalog metadata from GraphQL
 */
export const useCatalogDiscovery = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  /**
   * Discover field schema by introspecting a catalog entry
   */
  const discoverFieldsFromEntry = (entry: BaseCatalogEntry): CatalogField[] => {
    const fields: CatalogField[] = []

    if (entry.id) {
      fields.push({
        name: 'id',
        label: 'Entry ID',
        type: 'string',
        description: 'Unique entry identifier',
        required: true
      })
    }

    if (entry.code !== undefined) {
      fields.push({
        name: 'code',
        label: 'Code',
        type: 'string',
        description: 'Entry code'
      })
    }

    if (entry.value !== undefined) {
      fields.push({
        name: 'value',
        label: 'Value',
        type: 'string',
        description: 'Display value',
        required: true
      })
    }

    if (entry.alternativeCode !== undefined) {
      fields.push({
        name: 'alternativeCode',
        label: 'Alternative Code',
        type: 'string',
        description: 'Alternative code'
      })
    }

    if (entry.description !== undefined) {
      fields.push({
        name: 'description',
        label: 'Description',
        type: 'string',
        description: 'Entry description'
      })
    }

    if (entry.type !== undefined) {
      fields.push({
        name: 'type',
        label: 'Type',
        type: 'string',
        description: 'Entry type'
      })
    }

    if (entry.additionalValue1 !== undefined) {
      fields.push({
        name: 'additionalValue1',
        label: 'Additional Value 1',
        type: 'string',
        description: 'First additional value'
      })
    }

    if (entry.additionalValue2 !== undefined) {
      fields.push({
        name: 'additionalValue2',
        label: 'Additional Value 2',
        type: 'string',
        description: 'Second additional value'
      })
    }

    if (entry.additionalValue3 !== undefined) {
      fields.push({
        name: 'additionalValue3',
        label: 'Additional Value 3',
        type: 'string',
        description: 'Third additional value'
      })
    }

    if (entry.displayOrder !== undefined) {
      fields.push({
        name: 'displayOrder',
        label: 'Display Order',
        type: 'number',
        description: 'Sort order'
      })
    }

    if (entry.objectValue !== undefined) {
      fields.push({
        name: 'objectValue',
        label: 'Object Value',
        type: 'object',
        description: 'JSON object value'
      })
    }

    return fields
  }

  /**
   * Get default fields when no entries are available
   */
  const getDefaultFields = (): CatalogField[] => {
    return [
      {
        name: 'id',
        label: 'Entry ID',
        type: 'string',
        description: 'Unique entry identifier',
        required: true
      },
      {
        name: 'code',
        label: 'Code',
        type: 'string',
        description: 'Entry code'
      },
      {
        name: 'value',
        label: 'Value',
        type: 'string',
        description: 'Display value',
        required: true
      },
      {
        name: 'description',
        label: 'Description',
        type: 'string',
        description: 'Entry description'
      },
      {
        name: 'type',
        label: 'Type',
        type: 'string',
        description: 'Entry type'
      }
    ]
  }

  /**
   * Fetch all available catalogs with their field schemas
   * Memoized to prevent infinite loops when used in useEffect dependencies
   */
  const fetchCatalogs = useCallback(async (): Promise<CatalogMetadata[]> => {
    try {
      const query = GET_CATALOGS({
        limit: 100,
        includeCatalogEntries: true,
        entriesLimit: 5
      })

      const result = await graphqlClient.request<CatalogResponse>(query)
      const baseCatalogs = result.Catalog || []

      return baseCatalogs.map((catalog: BaseCatalog) => {
        const totalCount = catalog.catalogEntriesAggregate?.aggregate?.count || 0
        const sampleEntries = (catalog.catalogEntries || []).slice(0, 3).map((entry: BaseCatalogEntry) => ({
          id: entry.id,
          displayName: entry.value || entry.code || entry.id,
          preview: entry.description || entry.type || ''
        }))

        const firstEntry = catalog.catalogEntries?.[0]
        const fields = firstEntry ? discoverFieldsFromEntry(firstEntry) : getDefaultFields()

        return {
          catalogIdentifier: catalog.identifier,
          displayName: catalog.name,
          version: catalog.version || 'v1',
          description: catalog.description,
          totalCount,
          sampleEntries,
          fields
        }
      })
    } catch (error) {
      console.error('Error fetching catalogs from GraphQL:', error)
      return []
    }
  }, [graphqlClient])

  /**
   * Fetch catalog entries with pagination and search
   * Used for lazy loading entries when browsing
   */
  const fetchCatalogEntries = useCallback(
    async (
      catalogIdentifier: string,
      params?: {
        version?: string
        limit?: number
        offset?: number
        search?: string
      }
    ): Promise<CatalogEntriesResponse> => {
      try {
        const query = GET_CATALOG_ENTRIES({
          catalogIdentifier,
          version: params?.version || 'v1',
          limit: params?.limit || 50,
          offset: params?.offset || 0,
          search: params?.search,
          includeChildCatalogEntries: false,
          includeParentCatalogEntry: false
        })

        const result = await graphqlClient.request<CatalogEntryResponse>(query)
        const baseEntries = result.CatalogEntry || []
        const totalCount = result.CatalogEntryAggregate?.aggregate?.count || 0

        const entries: CatalogEntry[] = baseEntries.map((entry: BaseCatalogEntry) => ({
          id: entry.id,
          displayName: entry.value || entry.code || entry.id,
          data: {
            id: entry.id,
            code: entry.code,
            value: entry.value,
            alternativeCode: entry.alternativeCode,
            description: entry.description,
            type: entry.type,
            additionalValue1: entry.additionalValue1,
            additionalValue2: entry.additionalValue2,
            additionalValue3: entry.additionalValue3,
            displayOrder: entry.displayOrder,
            objectValue: entry.objectValue,
            parentEntryId: entry.parentEntryId
          }
        }))

        const hasMore = (params?.offset || 0) + entries.length < totalCount

        return {
          entries,
          totalCount,
          hasMore
        }
      } catch (error) {
        console.error(`Error fetching entries for catalog ${catalogIdentifier}:`, error)
        return {
          entries: [],
          totalCount: 0,
          hasMore: false
        }
      }
    },
    [graphqlClient]
  )

  return { fetchCatalogs, fetchCatalogEntries }
}
