import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CatalogOption {
  id: string
  value: string
  label: string
  code: string
}

export interface UseCatalogReturn {
  options: CatalogOption[]
  isLoading: boolean
  error: string | null
}

export const useCurrencyCatalog = (context: BusinessAppContextProps): UseCatalogReturn => {
  const [options, setOptions] = useState<CatalogOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchCurrencies = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'Currency',
          version: 'v1'
        },
        {
          limit: 200, // Get all currencies
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const currencyOptions = (response.data || []).map(entry => ({
        id: entry.id,
        value: entry.id,
        label: `${entry.code} - ${entry.value}`,
        code: entry.code || entry.value
      }))

      setOptions(currencyOptions)
    } catch (err) {
      console.error('Error fetching currencies:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch currencies')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken]) // Removed catalogClient from dependencies

  useEffect(() => {
    fetchCurrencies()
  }, [fetchCurrencies]) // Only depend on fetchCurrencies (which already depends on accessToken)

  return {
    options,
    isLoading,
    error
  }
}
