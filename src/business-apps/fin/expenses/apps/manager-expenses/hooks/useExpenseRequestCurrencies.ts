import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface CurrencyCount {
  currency: string
  count: number
}

interface CurrencyDetectionResponse {
  managerRequests: {
    id: string
    currencyRef: string
  }[]
  allRequests: {
    id: string
    currencyRef: string
  }[]
}

const GET_CURRENCY_DISTRIBUTION = `
  query GetCurrencyDistribution($managerId: uuid!) {
    # Get all requests for the manager to analyze currency distribution
    managerRequests: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      id
      currencyRef
    }
    # Debug: Get all requests without manager filtering
    allRequests: ExpenseRequest(
      where: {
        isDeleted: {_eq: false}
      }
    ) {
      id
      currencyRef
    }
  }
`

export const useExpenseRequestCurrencies = (context: BusinessAppContextProps, managerId: string) => {
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string>('')
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const detectMostUsedCurrency = useCallback(async () => {
    if (!managerId || !context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<CurrencyDetectionResponse>(GET_CURRENCY_DISTRIBUTION, { managerId })

      if (result?.managerRequests && result?.allRequests) {
        // Helper function to count currencies from requests
        const countCurrencies = (requests: { currencyRef: string }[]): CurrencyCount[] => {
          const currencyMap = new Map<string, number>()

          for (const request of requests) {
            if (request.currencyRef) {
              const currency = request.currencyRef.replaceAll('Currency:v1:', '')
              currencyMap.set(currency, (currencyMap.get(currency) || 0) + 1)
            }
          }

          return Array.from(currencyMap.entries()).map(([currency, count]) => ({
            currency,
            count
          }))
        }

        const managerRequestsCurrencyCounts = countCurrencies(result.managerRequests)

        // Sort by count (descending)
        if (managerRequestsCurrencyCounts.length > 0) {
          managerRequestsCurrencyCounts.sort((a, b) => b.count - a.count)

          // Get all unique currencies sorted alphabetically
          const allCurrencies = managerRequestsCurrencyCounts.map(c => c.currency).sort((a, b) => a.localeCompare(b))

          setAvailableCurrencies(allCurrencies)
          setMostUsedCurrency(managerRequestsCurrencyCounts[0].currency)
        } else {
          setAvailableCurrencies([])
          setMostUsedCurrency('')
        }
      } else {
        setAvailableCurrencies([])
        setMostUsedCurrency('')
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to detect currency'))
      setAvailableCurrencies([])
      setMostUsedCurrency('')
    } finally {
      setIsLoading(false)
    }
  }, [managerId, context.accessToken, graphqlClient])

  useEffect(() => {
    detectMostUsedCurrency()
  }, [detectMostUsedCurrency])

  return {
    mostUsedCurrency,
    availableCurrencies,
    isLoading,
    error,
    refetch: detectMostUsedCurrency
  }
}
