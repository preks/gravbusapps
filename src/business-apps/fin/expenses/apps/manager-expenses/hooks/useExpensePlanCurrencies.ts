import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface CurrencyCount {
  currency: string
  count: number
}

interface CurrencyDetectionResponse {
  managerPlans: {
    id: string
    currencyRef: string
  }[]
}

const GET_CURRENCY_DISTRIBUTION = `
  query GetCurrencyDistribution($managerId: uuid!) {
    # Get all plans for the manager to analyze currency distribution
    managerPlans: ExpensePlan(
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
  }
`

export const useExpensePlanCurrencies = (context: BusinessAppContextProps, managerId: string) => {
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

      if (result?.managerPlans) {
        // Helper function to count currencies from plans
        const countCurrencies = (plans: { currencyRef: string }[]): CurrencyCount[] => {
          const currencyMap = new Map<string, number>()

          for (const plan of plans) {
            if (plan.currencyRef) {
              const currency = plan.currencyRef.replaceAll('Currency:v1:', '')
              currencyMap.set(currency, (currencyMap.get(currency) || 0) + 1)
            }
          }

          return Array.from(currencyMap.entries()).map(([currency, count]) => ({
            currency,
            count
          }))
        }

        const managerPlansCurrencyCounts = countCurrencies(result.managerPlans)

        // Sort by count (descending)
        if (managerPlansCurrencyCounts.length > 0) {
          managerPlansCurrencyCounts.sort((a, b) => b.count - a.count)

          // Get all unique currencies sorted alphabetically
          const allCurrencies = managerPlansCurrencyCounts.map(c => c.currency).sort((a, b) => a.localeCompare(b))

          setAvailableCurrencies(allCurrencies)
          setMostUsedCurrency(managerPlansCurrencyCounts[0].currency)
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
