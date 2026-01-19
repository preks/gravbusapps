import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { CatalogEntry } from '@/common/types/CatalogTypes'

/**
 * GraphQL query to fetch absence types from the CatalogEntry table with pagination.
 * This uses the same approach as other forms (e.g., Change Communication) to ensure
 * consistent permissions and data access.
 */
const GET_ABSENCE_TYPES = `
  query GetAbsenceTypes($activeUserLocale: String!, $limit: Int!, $offset: Int!) {
    CatalogEntry(
      where: { 
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "AbsenceType" } }
      }
      limit: $limit
      offset: $offset
      orderBy: { value: ASC }
    ) {
      id
      value
      code
      parentEntryId
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        localeCode
        value
      }
      catalog { 
        defaultLocale 
      }
    }
  }
`

const BATCH_SIZE = 100

interface GraphQLCatalogEntry {
  id: string
  value: string
  code?: string
  parentEntryId?: string
  translations?: Array<{
    localeCode: string
    value: string
  }>
  catalog?: {
    defaultLocale?: string
  }
}

export interface AbsenceTypeOption {
  id: string
  name: string
  parentEntryId: string
  catalogEntry: CatalogEntry
}

export interface UseAbsenceTypesByGroupReturn {
  absenceTypes: AbsenceTypeOption[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useAbsenceTypesByGroup = (
  context: BusinessAppContextProps,
  parentEntryId?: string
): UseAbsenceTypesByGroupReturn => {
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceTypeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadAbsenceTypes = useCallback(async (): Promise<AbsenceTypeOption[]> => {
    if (!context.accessToken) {
      return []
    }

    try {
      // Fetch all entries using pagination
      const allEntries: GraphQLCatalogEntry[] = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await graphqlClient.request<{ CatalogEntry: GraphQLCatalogEntry[] }>(GET_ABSENCE_TYPES, {
          activeUserLocale: userLocale,
          limit: BATCH_SIZE,
          offset
        })

        const entries = response?.CatalogEntry || []
        allEntries.push(...entries)

        // If we got fewer entries than the batch size, we've reached the end
        if (entries.length < BATCH_SIZE) {
          hasMore = false
        } else {
          offset += BATCH_SIZE
        }
      }

      if (allEntries.length === 0) {
        return []
      }

      // Filter by group: if parentEntryId provided, it can be either
      // - a parent entry id (e.g. 'AbsenceType:v1:A001') OR
      // - a child entry value (e.g. 'Vacation')
      // Find the parent id first, then return all entries with the same parentEntryId
      let filteredEntries = allEntries
      if (parentEntryId) {
        const normalize = (s?: string) => (s ?? '').toLowerCase().trim()

        // Try to find an entry matching by id OR by value
        const matchedEntry = allEntries.find((entry: GraphQLCatalogEntry) => {
          return entry.id === parentEntryId || normalize(entry.value) === normalize(parentEntryId)
        })

        // Determine the target parent id
        const targetParentId = matchedEntry ? matchedEntry.parentEntryId || matchedEntry.id : parentEntryId

        // Return all entries that share this parent id
        filteredEntries = allEntries.filter((entry: GraphQLCatalogEntry) => entry.parentEntryId === targetParentId)
      }

      const processedOptions = filteredEntries.map((entry: GraphQLCatalogEntry) => {
        // Use translated value if available, otherwise fall back to default value
        const translatedValue = entry.translations?.[0]?.value
        const displayName = translatedValue || entry.value || entry.code || entry.id

        return {
          id: entry.id,
          name: displayName,
          parentEntryId: entry.parentEntryId || '',
          catalogEntry: {
            id: entry.id,
            value: entry.value,
            code: entry.code,
            parentEntryId: entry.parentEntryId,
            translations: entry.translations
          } as CatalogEntry
        }
      })

      return processedOptions
    } catch (err) {
      console.error('Failed to load absence types:', err instanceof Error ? err.message : 'Unknown error')
      return []
    }
  }, [graphqlClient, context.accessToken, userLocale, parentEntryId])

  const loadCatalogs = useCallback(async () => {
    if (!context.accessToken) {
      setAbsenceTypes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const types = await loadAbsenceTypes()
      setAbsenceTypes(types)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load absence types'
      console.error('Error loading absence types catalog:', errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, loadAbsenceTypes])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  return {
    absenceTypes,
    isLoading,
    error,
    refetch: loadCatalogs
  }
}
