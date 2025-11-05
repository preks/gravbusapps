import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CurrencyOption {
  id: string
  value: string
  label: string
  code: string
  name: string
}

export const useCurrencyCatalog = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<CurrencyOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchCurrencies = useCallback(async () => {
    if (!context.accessToken) {
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
          limit: 200,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const currencyOptions = response.data.map(entry => ({
        id: entry.id,
        value: entry.id,
        label: `${entry.code} - ${entry.value}`,
        code: entry.code,
        name: entry.value
      }))

      setOptions(currencyOptions)
    } catch (err) {
      console.error('Error fetching currencies:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch currencies')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [catalogClient, context.accessToken])

  useEffect(() => {
    fetchCurrencies()
  }, [fetchCurrencies])

  return {
    options,
    isLoading,
    error,
    refetch: fetchCurrencies
  }
}
