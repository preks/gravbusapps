import { useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { useCurrencyStore } from '../store/useCurrencyStore'
import { extractCurrencyCode } from '../utils/currencyUtils'

const GET_MOST_USED_CURRENCY = `
  query GetMostUsedCurrency($managerId: uuid!) {
    # Get most used currency from advance payments
    advancePaymentCurrencies: AdvancePayment(
      where: {
        expensePlan: {
          employee: {
            employeePosition: {
              supervisorEmployeeId: {_eq: $managerId}
            }
          },
          isDeleted: {_eq: false}
        }
      }
    ) {
      currencyRef
    }
    
    # Get most used currency from expense requests
    expenseRequestCurrencies: ExpenseRequest(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      currencyRef
    }
    
    # Get most used currency from expense plans
    expensePlanCurrencies: ExpensePlan(
      where: {
        employee: {
          employeePosition: {
            supervisorEmployeeId: {_eq: $managerId}
          }
        },
        isDeleted: {_eq: false}
      }
    ) {
      currencyRef
    }
  }
`

interface CurrencyCount {
  currencyRef: string
  count: number
}

interface CurrencyResponse {
  advancePaymentCurrencies?: {
    currencyRef: string
  }[]
  expenseRequestCurrencies?: {
    currencyRef: string
  }[]
  expensePlanCurrencies?: {
    currencyRef: string
  }[]
}

// Helper: Extract currency refs from a single collection
const extractRefsFromCollection = (collection: Array<{ currencyRef?: string }> | undefined, refs: string[]) => {
  if (!collection) return

  for (const item of collection) {
    if (item.currencyRef) {
      refs.push(item.currencyRef)
    }
  }
}

// Helper: Extract currency references from response data
const extractCurrencyRefsFromData = (data: CurrencyResponse): string[] => {
  const allCurrencyRefs: string[] = []

  extractRefsFromCollection(data.advancePaymentCurrencies, allCurrencyRefs)
  extractRefsFromCollection(data.expenseRequestCurrencies, allCurrencyRefs)
  extractRefsFromCollection(data.expensePlanCurrencies, allCurrencyRefs)

  return allCurrencyRefs
}

// Helper: Count currency occurrences and return sorted by frequency
const countAndSortCurrencies = (currencyRefs: string[]): CurrencyCount[] => {
  const currencyMap = new Map<string, number>()

  for (const ref of currencyRefs) {
    const extractedCode = extractCurrencyCode(ref)
    if (extractedCode) {
      currencyMap.set(extractedCode, (currencyMap.get(extractedCode) || 0) + 1)
    }
  }

  const currencyCounts: CurrencyCount[] = Array.from(currencyMap.entries()).map(([currencyRef, count]) => ({
    currencyRef,
    count
  }))

  currencyCounts.sort((a, b) => b.count - a.count)
  return currencyCounts
}

// Helper: Update store with most used currency
const updateCurrencyStore = (
  mostUsedCurrency: string,
  isUserSelected: boolean,
  setMostUsedCurrency: (currency: string) => void,
  setPrimaryCurrency: (currency: string) => void
) => {
  setMostUsedCurrency(mostUsedCurrency)

  if (!isUserSelected) {
    setPrimaryCurrency(mostUsedCurrency)
  }
}

/**
 * Hook to fetch and manage the most used currency across the manager-expenses app
 */
export const useAppCurrency = ({ accessToken, userInfo }: BusinessAppContextProps) => {
  const {
    primaryCurrency,
    setPrimaryCurrency,
    isLoading,
    setLoading,
    isUserSelected,
    setMostUsedCurrency,
    isInitialized
  } = useCurrencyStore()

  // Get managerId from userInfo or use a fallback for development
  const managerId = userInfo?.employeeDetails?.employeeId || '00000000-0000-0000-0000-000000000000'

  const fetchMostUsedCurrency = useCallback(async () => {
    // Don't fetch if user has already selected a currency or if already initialized
    if (!accessToken || !managerId || (isInitialized && isUserSelected)) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK')!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          query: GET_MOST_USED_CURRENCY,
          variables: { managerId }
        })
      })

      const result = await response.json()

      if (result.errors) {
        return
      }

      const data = result.data as CurrencyResponse
      const allCurrencyRefs = extractCurrencyRefsFromData(data)
      const currencyCounts = countAndSortCurrencies(allCurrencyRefs)
      const mostUsedCurrency = currencyCounts.length > 0 ? currencyCounts[0].currencyRef : 'EUR'

      updateCurrencyStore(mostUsedCurrency, isUserSelected, setMostUsedCurrency, setPrimaryCurrency)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [accessToken, managerId, isInitialized, isUserSelected, setPrimaryCurrency, setMostUsedCurrency, setLoading])

  useEffect(() => {
    fetchMostUsedCurrency()
  }, [fetchMostUsedCurrency])

  return {
    primaryCurrency,
    isLoading
  }
}
