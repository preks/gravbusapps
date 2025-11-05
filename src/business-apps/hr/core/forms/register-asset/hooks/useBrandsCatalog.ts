/**
 * useBrandsCatalog Hook
 * Fetches asset brands from the catalog
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface BrandCatalogOption {
  id: string
  value: string
  label: string
  code: string
}

export interface UseBrandsCatalogReturn {
  options: BrandCatalogOption[]
  isLoading: boolean
  error: string | null
}

export const useBrandsCatalog = (context: BusinessAppContextProps): UseBrandsCatalogReturn => {
  const [options, setOptions] = useState<BrandCatalogOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchBrands = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AssetBrand', // PascalCase to match other catalogs
          version: 'v1'
        },
        {
          limit: 500, // Get all brands
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const brandOptions = (response.data || []).map(entry => ({
        id: entry.id,
        value: entry.id, // Use ID as value to match database FK
        label: entry.value || entry.code,
        code: entry.code || entry.value
      }))

      setOptions(brandOptions)
    } catch (err) {
      console.error('Error fetching asset brands:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch asset brands')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken]) // Removed catalogClient from dependencies

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands]) // Only depend on fetchBrands (which already depends on accessToken)

  return {
    options,
    isLoading,
    error
  }
}
