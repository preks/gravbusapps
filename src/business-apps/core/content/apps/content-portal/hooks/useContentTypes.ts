import { useState, useEffect, useCallback } from 'react'
import { useCatalogEntries } from '@/common/data/catalog'

const CATALOG_IDENTIFIER = 'ContentType'

export interface SelectOption {
  id: string
  name: string
  parentEntryId?: string
}

export interface UseContentTypesResult {
  typeValues: SelectOption[]
  isLoading: boolean
  error: any
  refetch: () => void
}

/**
 * Hook to load Content Types from catalog
 * Uses central useCatalogEntries hook - no hardcoded mappings
 */
export const useContentTypes = (accessToken?: string): UseContentTypesResult => {
  const [typeValues, setTypeValues] = useState<SelectOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })

  const fetchTypes = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
        limit: 100,
        offset: 0
      })

      // Sort by displayOrder for consistent ordering
      const sorted = result.entries.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

      const formattedTypes = sorted.map(entry => ({
        id: entry.id,
        name: entry.value,
        parentEntryId: entry.parentEntryId
      }))

      setTypeValues(formattedTypes)
    } catch (err) {
      setError(err)
      setTypeValues([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fetchCatalogEntriesByIdentifier])

  useEffect(() => {
    fetchTypes()
  }, [fetchTypes])

  return {
    typeValues,
    isLoading,
    error,
    refetch: fetchTypes
  }
}
