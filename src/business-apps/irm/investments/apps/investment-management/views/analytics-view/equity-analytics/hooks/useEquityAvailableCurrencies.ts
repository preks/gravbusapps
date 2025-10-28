import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CurrencyOption {
  id: string
  code: string
  value: string
}

interface UseEquityAvailableCurrenciesResult {
  currencies: CurrencyOption[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch distinct available currencies from equity investments
 * Uses GraphQL distinctOn to efficiently get unique currencies
 */
export const useEquityAvailableCurrencies = (context: BusinessAppContextProps): UseEquityAvailableCurrenciesResult => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAvailableCurrencies = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetEquityCurrencies {
          Investment(
            distinctOn: currencyRef
            orderBy: [{ currencyRef: ASC }]
            where: {
              _and: [
                { isDeleted: { _eq: false } }
                { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
                { currencyRef: { _isNull: false } }
              ]
            }
          ) {
            currencyRef
            currency {
              code
              value
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        Investment: Array<{
          currencyRef: string | null
          currency: { id: string; code: string; value: string } | null
        }>
      }>(query)

      // Store full currency objects with ID, code, and value
      const fetchedCurrencies = result.Investment.filter(inv => inv.currency?.code && inv.currencyRef)
        .map(inv => ({
          id: inv.currencyRef!, // "Currency:v1:EUR"
          code: inv.currency!.code, // "EUR"
          value: inv.currency!.value // "European euro"
        }))
        .sort((a, b) => a.code.localeCompare(b.code))

      setCurrencies(
        fetchedCurrencies.length > 0
          ? fetchedCurrencies
          : [{ id: 'Currency:v1:EUR', code: 'EUR', value: 'European euro' }]
      )
    } catch (err) {
      console.error('Error fetching available currencies:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch currencies')

      // Keep default currencies on error
      setCurrencies([
        { id: 'Currency:v1:EUR', code: 'EUR', value: 'European euro' },
        { id: 'Currency:v1:USD', code: 'USD', value: 'US Dollar' },
        { id: 'Currency:v1:GBP', code: 'GBP', value: 'British Pound' }
      ])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    if (context.accessToken) {
      void loadAvailableCurrencies()
    }
  }, [context.accessToken, loadAvailableCurrencies])

  return {
    currencies,
    isLoading,
    error,
    refetch: loadAvailableCurrencies
  }
}
