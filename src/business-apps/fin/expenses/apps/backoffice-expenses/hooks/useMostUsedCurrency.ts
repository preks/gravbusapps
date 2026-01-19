import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { extractCurrencyCode } from '../utils/currencyUtils'

/**
 * GraphQL query to fetch all currencies from expense-related entities
 */
const GET_ALL_CURRENCIES_BACKOFFICE = `
  query GetAllCurrenciesBackoffice($selectedDepartment: uuid) {
    # Get currencies from ExpenseItems
    expenseItems: ExpenseItem(
      where: {
        ${
          /* Only filter by department if provided */
          ''
        }
        isDeleted: {_eq: false},
        currencyRef: {_isNull: false}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from ExpenseRequests
    expenseRequests: ExpenseRequest(
      where: {
        isDeleted: {_eq: false},
        currencyRef: {_isNull: false}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from ExpensePlans
    expensePlans: ExpensePlan(
      where: {
        isDeleted: {_eq: false},
        currencyRef: {_isNull: false}
      }
    ) {
      currencyRef
    }
    
    # Get currencies from AdvancePayments
    advancePayments: AdvancePayment(
      where: {
        isDeleted: {_eq: false},
        currencyRef: {_isNull: false}
      }
    ) {
      currencyRef
    }
  }
`

/**
 * Hook to fetch the most used currency in the backoffice expenses system
 * @param accessToken - Authentication token
 * @param selectedDepartment - Optional department filter
 * @returns Object containing mostUsedCurrency, isLoading, and error state
 */
export const useMostUsedCurrency = (accessToken: string | null | undefined, selectedDepartment?: string) => {
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  // Helper: Process array of items and count currency occurrences (reduces cognitive complexity)
  const processCurrencyItems = useCallback(
    (items: Array<{ currencyRef: string }> | undefined, currencyMap: Map<string, number>): void => {
      if (!items) return

      for (const item of items) {
        const code = extractCurrencyCode(item.currencyRef)
        if (code) {
          currencyMap.set(code, (currencyMap.get(code) || 0) + 1)
        }
      }
    },
    []
  )

  // Helper: Get most used currency from map (reduces cognitive complexity)
  const getMostUsedCurrency = useCallback((currencyMap: Map<string, number>): string | null => {
    if (currencyMap.size === 0) return null

    const sortedCurrencies = Array.from(currencyMap.entries()).sort((a, b) => b[1] - a[1])

    return sortedCurrencies.length > 0 ? sortedCurrencies[0][0] : null
  }, [])

  // Helper: Format currency code to Currency:v1:CODE format (reduces cognitive complexity)
  const formatCurrency = useCallback((currencyCode: string | null): string => {
    if (currencyCode) {
      return `Currency:v1:${currencyCode}`
    }
    // Fallback to EUR if no data found
    return 'Currency:v1:EUR'
  }, [])

  const fetchMostUsedCurrency = useCallback(async () => {
    if (!graphQLClient || !accessToken) {
      setIsLoading(false)
      return
    }

    try {
      setError(null)
      setIsLoading(true)

      // Fetch all currencies from different entities
      const response = await graphQLClient.request(
        GET_ALL_CURRENCIES_BACKOFFICE,
        selectedDepartment ? { selectedDepartment } : {}
      )

      // Count currency occurrences using helper
      const currencyMap = new Map<string, number>()
      processCurrencyItems(response?.expenseItems, currencyMap)
      processCurrencyItems(response?.expenseRequests, currencyMap)
      processCurrencyItems(response?.expensePlans, currencyMap)
      processCurrencyItems(response?.advancePayments, currencyMap)

      // Get the most used currency and format it
      const mostUsed = getMostUsedCurrency(currencyMap)
      const formattedCurrency = formatCurrency(mostUsed)
      setMostUsedCurrency(formattedCurrency)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch most used currency')
      // Fallback to EUR on error
      setMostUsedCurrency('Currency:v1:EUR')
    } finally {
      setIsLoading(false)
    }
  }, [graphQLClient, accessToken, selectedDepartment, processCurrencyItems, getMostUsedCurrency, formatCurrency])

  useEffect(() => {
    fetchMostUsedCurrency()
  }, [fetchMostUsedCurrency])

  return {
    mostUsedCurrency,
    isLoading,
    error,
    refetch: fetchMostUsedCurrency
  }
}
