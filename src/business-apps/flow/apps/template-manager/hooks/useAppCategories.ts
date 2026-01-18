/**
 * Hook to load AppCatalog entries for filtering by tags.app
 */

import { useState, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface AppCategory {
  id: string
  code: string
  name: string
  catalogRef: string // Full reference like "AppCatalog:1:SVC"
}

export const useAppCategories = (accessToken: string) => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const [categories, setCategories] = useState<AppCategory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      setCategories([])
      return
    }

    const loadCategories = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AppCatalog', version: '1' },
          {
            limit: 100,
            includeChildCatalogEntries: true,
            returnTotalRecords: true
          }
        )

        const mappedCategories: AppCategory[] = (response.data || []).map(entry => ({
          id: entry.id || entry.code,
          code: entry.code,
          name: entry.value || entry.code,
          catalogRef: `AppCatalog:1:${entry.code}`
        }))

        setCategories(mappedCategories)
      } catch (err) {
        console.error('Error loading AppCatalog catalog:', err)
        setError('Failed to load app categories')
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [accessToken, catalogClient])

  return { categories, isLoading, error }
}
