import { useState, useEffect, useCallback } from 'react'
import { useCatalogEntries, type CatalogEntry } from '@/common/data/catalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const CATALOG_IDENTIFIER = 'ContentCategory'

export interface UseKnowledgeCategoriesResult {
  categories: CatalogEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to load and manage Content Categories for Knowledge Base
 * Categories are used for organizing wiki articles in the left sidebar
 */
export const useKnowledgeCategories = (
  context: Pick<BusinessAppContextProps, 'accessToken'>
): UseKnowledgeCategoriesResult => {
  const [categories, setCategories] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchCatalogEntriesByIdentifier(CATALOG_IDENTIFIER, {
        limit: 100,
        offset: 0
      })

      // Sort by displayOrder for consistent sidebar ordering
      const sorted = [...result.entries].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))

      setCategories(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories')
      console.error('Error loading knowledge categories:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier])

  useEffect(() => {
    if (context.accessToken) {
      loadCategories()
    }
  }, [context.accessToken, loadCategories])

  return {
    categories,
    isLoading,
    error,
    refetch: loadCategories
  }
}
