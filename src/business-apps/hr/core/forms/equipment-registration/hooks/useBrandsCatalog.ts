import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface BrandOption {
  id: string
  value: string
  label: string
  code: string
}

export const useBrandsCatalog = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<BrandOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchBrands = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AssetBrand',
          version: 'v1'
        },
        {
          limit: 200,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const brandOptions = response.data.map(entry => ({
        id: entry.id,
        value: entry.id,
        label: entry.value,
        code: entry.code
      }))

      setOptions(brandOptions)
    } catch (err) {
      console.error('Error fetching brands:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch brands')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  return {
    options,
    isLoading,
    error,
    refetch: fetchBrands
  }
}
