import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface AssetOption {
  id: string
  value: string
  label: string
  code: string
}

export const useAssetsCatalog = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<AssetOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchAssets = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AssetCategory',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const assetOptions = response.data.map(entry => ({
        id: entry.id,
        value: entry.id,
        label: entry.value,
        code: entry.code
      }))

      setOptions(assetOptions)
    } catch (err) {
      console.error('Error fetching asset categories:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch asset categories')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  return {
    options,
    isLoading,
    error,
    refetch: fetchAssets
  }
}
