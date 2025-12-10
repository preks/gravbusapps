import { useState, useEffect, useCallback } from 'react'
import { useCatalogEntries, type CatalogEntry } from '@/common/data/catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const CATALOG_IDENTIFIER = 'ContentType'

export interface UseContentTypesResult {
  types: CatalogEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to load ContentTypes for a specific ContentGroup
 * ContentTypes are catalog entries with a parentEntryId pointing to a ContentGroup entry
 */
export const useContentTypes = (
  context: Pick<BusinessAppContextProps, 'accessToken'>,
  contentGroupId: string | null
): UseContentTypesResult => {
  const [types, setTypes] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })

  const loadTypes = useCallback(async () => {
    if (!contentGroupId) {
      setTypes([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
        parentEntryId: contentGroupId,
        limit: 100,
        offset: 0
      })

      // Sort by displayOrder for consistent ordering
      const sorted = [...result.entries].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

      setTypes(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content types')
      console.error('Error loading content types:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier, contentGroupId])

  useEffect(() => {
    if (context.accessToken) {
      loadTypes()
    }
  }, [context.accessToken, loadTypes])

  return {
    types,
    isLoading,
    error,
    refetch: loadTypes
  }
}
