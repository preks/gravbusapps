import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface AssetCatalogOption {
  id: string
  value: string
  label: string
  code: string
}

export interface UseAssetsCatalogReturn {
  options: AssetCatalogOption[]
  isLoading: boolean
  error: string | null
}

export const useAssetsCatalog = (context: BusinessAppContextProps): UseAssetsCatalogReturn => {
  const [options, setOptions] = useState<AssetCatalogOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchAssets = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'Assets',
          version: 'v1'
        },
        {
          limit: 200, // Get all asset categories
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const assetOptions = (response.data || []).map(entry => ({
        id: entry.id,
        value: entry.id, // Use ID as value to match database FK
        label: entry.value || entry.code,
        code: entry.code || entry.value
      }))

      setOptions(assetOptions)
    } catch (err) {
      console.error('Error fetching asset categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch asset categories')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken]) // Removed catalogClient from dependencies

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets]) // Only depend on fetchAssets (which already depends on accessToken)

  return {
    options,
    isLoading,
    error
  }
}
