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
        label: entry.code,
        code: entry.code,
        name: entry.value
      }))

      // Sort currencies: EUR, RON, USD first (in that order), then alphabetically by code
      const priorityCurrencies = ['EUR', 'RON', 'USD']
      const sortedOptions = currencyOptions.sort((a, b) => {
        const aIndex = priorityCurrencies.indexOf(a.code)
        const bIndex = priorityCurrencies.indexOf(b.code)

        // If both are priority currencies, sort by their priority order
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }

        // If only a is priority, it comes first
        if (aIndex !== -1) {
          return -1
        }

        // If only b is priority, it comes first
        if (bIndex !== -1) {
          return 1
        }

        // Both are non-priority, sort alphabetically by code
        return a.code.localeCompare(b.code)
      })

      setOptions(sortedOptions)
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
