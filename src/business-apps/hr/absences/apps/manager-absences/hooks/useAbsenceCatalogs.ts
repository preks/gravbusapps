import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { CatalogEntry } from '@/common/types/CatalogTypes'

export interface AbsenceTypeOption {
  id: string
  name: string
  // Preserve full catalog entry for color extraction
  catalogEntry: CatalogEntry
}

export interface AbsenceGroupOption {
  id: string
  name: string
  // Preserve full catalog entry for color extraction
  catalogEntry: CatalogEntry
}

export interface UseAbsenceCatalogsReturn {
  absenceTypes: AbsenceTypeOption[]
  absenceGroups: AbsenceGroupOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useAbsenceCatalogs = (context: BusinessAppContextProps): UseAbsenceCatalogsReturn => {
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceTypeOption[]>([])
  const [absenceGroups, setAbsenceGroups] = useState<AbsenceGroupOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US'

  const loadAbsenceTypes = useCallback(async () => {
    if (!context.accessToken) {
      return []
    }

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AbsenceType',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          includeChildCatalogEntries: true
        }
      )

      if (response?.data) {
        const processedOptions = response.data.map((entry: CatalogEntry) => {
          return {
            id: entry.id,
            name: entry.value || entry.code || entry.id,
            catalogEntry: entry
          }
        })

        return processedOptions
      } else {
        return []
      }
    } catch (err) {
      console.error('Error loading absence types:', err)
      return []
    }
  }, [catalogClient, context.accessToken, userLocale])

  const loadAbsenceGroups = useCallback(async () => {
    if (!context.accessToken) {
      return []
    }

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AbsenceGroup',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          includeChildCatalogEntries: true
        }
      )

      if (response?.data) {
        const processedOptions = response.data.map((entry: CatalogEntry) => {
          return {
            id: entry.id,
            name: entry.value || entry.code || entry.id,
            catalogEntry: entry
          }
        })

        return processedOptions
      } else {
        return []
      }
    } catch (err) {
      console.error('Error loading absence groups:', err)
      return []
    }
  }, [catalogClient, context.accessToken, userLocale])

  const loadCatalogs = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const [types, groups] = await Promise.all([loadAbsenceTypes(), loadAbsenceGroups()])

      setAbsenceTypes(types)
      setAbsenceGroups(groups)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load absence catalogs'
      setError(errorMessage)
      console.error('Error loading absence catalogs:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, loadAbsenceTypes, loadAbsenceGroups])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  return {
    absenceTypes,
    absenceGroups,
    isLoading,
    error,
    refetch: loadCatalogs
  }
}
