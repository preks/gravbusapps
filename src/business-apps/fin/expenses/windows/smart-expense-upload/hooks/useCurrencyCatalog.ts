import { useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface CurrencyCatalogEntry {
  id: string
  code: string
  value: string
}

const GET_CURRENCIES = `
  query GetCurrencies {
    CatalogEntry(
      where: {
        catalog: {
          version: { _eq: "v1" }
          identifier: { _eq: "Currency" }
        }
      }
      orderBy: { code: ASC }
    ) {
      id
      code
      value
    }
  }
`

export const useCurrencyCatalog = (accessToken: string) => {
  const [currencies, setCurrencies] = useState<CurrencyCatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchCurrencies = async () => {
      if (!accessToken) {
        setCurrencies([])
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await graphqlClient.request<{ CatalogEntry?: CurrencyCatalogEntry[] }>(GET_CURRENCIES)
        setCurrencies(response?.CatalogEntry || [])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load currencies'
        console.error('❌ [useCurrencyCatalog] Error loading currencies', { message })
        setError(message)
        setCurrencies([])
      } finally {
        setIsLoading(false)
      }
    }

    void fetchCurrencies()
  }, [accessToken])

  const currencyByCode = useMemo(() => {
    const map = new Map<string, string>()
    currencies.forEach(currency => {
      const normalizedCode = currency.code?.trim().toUpperCase()
      if (normalizedCode) {
        map.set(normalizedCode, currency.id)
      }
    })
    return map
  }, [currencies])

  const getCurrencyIdByCode = (code: string): string | null => {
    const normalizedCode = code?.trim().toUpperCase()
    if (!normalizedCode) {
      return null
    }
    return currencyByCode.get(normalizedCode) || null
  }

  return {
    currencies,
    isLoading,
    error,
    getCurrencyIdByCode
  }
}
