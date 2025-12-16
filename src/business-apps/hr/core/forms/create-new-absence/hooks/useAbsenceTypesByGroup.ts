import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { CatalogEntry } from '@/common/types/CatalogTypes'

/**
 * GraphQL query to fetch absence types from the CatalogEntry table.
 * This uses the same approach as other forms (e.g., Change Communication) to ensure
 * consistent permissions and data access.
 */
const GET_ABSENCE_TYPES = `
  query GetAbsenceTypes($activeUserLocale: String!) {
    CatalogEntry(
      where: { 
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "AbsenceType" } }
      }
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
      const response = await graphqlClient.request<{ CatalogEntry: GraphQLCatalogEntry[] }>(GET_ABSENCE_TYPES, {
        activeUserLocale: userLocale
      })

      const entries = response?.CatalogEntry || []

      if (entries.length === 0) {
        return []
      }

      // Filter by group: if parentEntryId provided, it can be either
      // - a parent entry id (e.g. 'AbsenceType:v1:A001') OR
      // - a child entry value (e.g. 'Vacation')
      // Find the parent id first, then return all entries with the same parentEntryId
      let filteredEntries = entries
      if (parentEntryId) {
        const normalize = (s?: string) => (s ?? '').toLowerCase().trim()

        // Try to find an entry matching by id OR by value
        const matchedEntry = entries.find((entry: GraphQLCatalogEntry) => {
          return entry.id === parentEntryId || normalize(entry.value) === normalize(parentEntryId)
        })

        // Determine the target parent id
        const targetParentId = matchedEntry ? matchedEntry.parentEntryId || matchedEntry.id : parentEntryId

        // Return all entries that share this parent id
        filteredEntries = entries.filter((entry: GraphQLCatalogEntry) => entry.parentEntryId === targetParentId)
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
    } catch {
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
