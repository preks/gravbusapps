import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface AssetConditionOption {
  id: string
  value: string
  label: string
  code: string
}

export const useAssetConditionCatalog = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<AssetConditionOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchConditions = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'AssetCondition',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const conditionOptions = response.data.map(entry => ({
        id: entry.id,
        value: entry.id,
        label: entry.value,
        code: entry.code
      }))

      setOptions(conditionOptions)
    } catch (err) {
      console.error('Error fetching asset conditions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch asset conditions')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken])

  useEffect(() => {
    fetchConditions()
  }, [fetchConditions])

  return {
    options,
    isLoading,
    error,
    refetch: fetchConditions
  }
}
