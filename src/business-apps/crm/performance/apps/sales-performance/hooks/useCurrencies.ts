import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface CurrencyOption {
  id: string // Full catalog ID like "Currency:v1:EUR"
  code: string // "EUR"
  label: string // "EUR" (display label)
}

interface UseCurrenciesResult {
  currencies: CurrencyOption[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook to fetch available currencies from opportunities
 * Uses distinctOn to efficiently get unique currencies
 */
export const useCurrencies = (accessToken: string): UseCurrenciesResult => {
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchCurrencies = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetOpportunityCurrencies {
          currencies: Opportunity(
            distinctOn: currencyRef
            orderBy: [{currencyRef: ASC}]
            where: {
              isDeleted: {_eq: false}
              currencyRef: {_isNull: false}
            }
          ) {
            currencyRef
            currency {
              id
              code
              value
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        currencies: Array<{
          currencyRef: string | null
          currency: { id: string; code: string; value: string } | null
        }>
      }>(query)

      const currencyList = (result.currencies || [])
        .filter(item => item.currency?.code)
        .map(item => ({
          id: item.currencyRef || item.currency!.id,
          code: item.currency!.code,
          label: item.currency!.code
        }))

      // Sort currencies: EUR, USD, GBP first, then alphabetically
      const priorityCurrencies = ['EUR', 'USD', 'GBP']
      const sortedCurrencies = currencyList.toSorted((a, b) => {
        const aIndex = priorityCurrencies.indexOf(a.code)
        const bIndex = priorityCurrencies.indexOf(b.code)

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1

        return a.code.localeCompare(b.code)
      })

      setCurrencies(sortedCurrencies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load currencies')
      setCurrencies([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchCurrencies()
  }, [fetchCurrencies])

  return {
    currencies,
    isLoading,
    error,
    refetch: () => void fetchCurrencies()
  }
}
