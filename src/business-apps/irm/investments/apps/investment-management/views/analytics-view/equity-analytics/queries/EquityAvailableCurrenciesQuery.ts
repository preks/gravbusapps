import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Lightweight query to fetch distinct currencies available in equity investments
 * This is used to populate the currency dropdown
 */
const GET_EQUITY_AVAILABLE_CURRENCIES = `
  query GetEquityAvailableCurrencies {
    Investment(
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
          { currency: { code: { _is_null: false } } }
        ]
      }
      limit: 100
    ) {
      currency {
        code
      }
    }
  }
`

export interface EquityAvailableCurrenciesResponse {
  Investment: Array<{
    currency: {
      code: string
    } | null
  }>
}

export const useGetEquityAvailableCurrencies = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAvailableCurrencies = useCallback(async (): Promise<string[]> => {
    try {
      const result = await graphqlClient.request<EquityAvailableCurrenciesResponse>(GET_EQUITY_AVAILABLE_CURRENCIES)

      // Extract unique currency codes
      const currencies = new Set<string>()
      result.Investment.forEach(inv => {
        if (inv.currency?.code) {
          // Extract currency code from "Currency:v1:EUR" format
          const parts = inv.currency.code.split(':')
          const currencyCode = parts[parts.length - 1]
          if (currencyCode) {
            currencies.add(currencyCode)
          }
        }
      })

      const currencyArray = Array.from(currencies).sort((a, b) => a.localeCompare(b))
      // Return currencies or default to EUR if none found
      return currencyArray.length > 0 ? currencyArray : ['EUR']
    } catch (error) {
      console.error('Error fetching available currencies:', error)
      // Return default currencies on error
      return ['EUR', 'USD', 'GBP']
    }
  }, [graphqlClient])

  return { fetchAvailableCurrencies }
}
