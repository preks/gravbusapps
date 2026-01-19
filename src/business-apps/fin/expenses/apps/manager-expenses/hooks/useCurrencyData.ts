import { useState, useEffect, useMemo, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { extractCurrencyCode } from '../utils/currencyUtils'
import { useCurrencyStore } from '../store/useCurrencyStore'
import { GET_ALL_CURRENCIES } from '../queries/analytics'

// Re-export standardizeCurrencyRef for backward compatibility
export { standardizeCurrencyRef } from '../utils/currencyUtils'

// Module-scope in-flight registry keyed by managerId
const inFlightByManager = new Map<string, Promise<any>>()

// Helper: Process a collection of items and add their currencies to the map
const processCurrencyCollection = (
  items: Array<{ currencyRef?: string }> | undefined,
  currencyMap: Map<string, number>
) => {
  if (!items) return

  for (const item of items) {
    const code = extractCurrencyCode(item.currencyRef || '')
    if (code) {
      currencyMap.set(code, (currencyMap.get(code) || 0) + 1)
    }
  }
}

/**
 * Hook to fetch available currencies and most used currency
 */
export const useCurrencyData = (accessToken: string, managerId: string) => {
  // Global in-flight guard per manager to prevent duplicate StrictMode/dev fetches
  // and cross-component duplicate requests.

  // Function to process currency data from API response
  const processCurrencyData = (response: any) => {
    const currencyMap = new Map<string, number>()

    processCurrencyCollection(response?.expenseItems, currencyMap)
    processCurrencyCollection(response?.expenseRequests, currencyMap)
    processCurrencyCollection(response?.expensePlans, currencyMap)
    processCurrencyCollection(response?.advancePayments, currencyMap)

    return Array.from(currencyMap.entries()).map(([currencyCode, count]) => ({ currencyCode, count }))
  }
  const [localAvailableCurrencies, setLocalAvailableCurrencies] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [localMostUsedCurrency, setLocalMostUsedCurrency] = useState<string | null>(null)

  // Access the global currency store (value + setter pairs)
  const {
    availableCurrencies: storeCurrencies,
    setAvailableCurrencies: setStoreCurrencies,
    mostUsedCurrency: storeMostUsedCurrency,
    setMostUsedCurrency,
    primaryCurrency,
    setPrimaryCurrency,
    isInitialized,
    setInitialized,
    isUserSelected
  } = useCurrencyStore()

  // GraphQL client for data fetching
  const graphQLClient = useGraphQLClient(accessToken)

  // Centralized fetch with error + loading handling
  const fetchCurrencyData = useCallback(async () => {
    try {
      setError(null)
      setIsLoading(true)
      // Deduplicate concurrent/in-flight calls per managerId
      if (!inFlightByManager.has(managerId)) {
        inFlightByManager.set(managerId, graphQLClient.request(GET_ALL_CURRENCIES, { managerId }))
      }
      const response = await inFlightByManager.get(managerId)!
      // Process currency data from all entities
      const currencyCounts = processCurrencyData(response)
      // Sort currencies by frequency
      currencyCounts.sort((a, b) => b.count - a.count)
      // Extract unique currency codes
      const uniqueCurrencies = Array.from(new Set(currencyCounts.map(c => c.currencyCode))).sort((a, b) =>
        a.localeCompare(b)
      )
      // Determine most used currency
      const mostUsed = currencyCounts.length > 0 ? currencyCounts[0].currencyCode : null
      // Update local state
      setLocalAvailableCurrencies(uniqueCurrencies)
      setLocalMostUsedCurrency(mostUsed)
      // Update global store
      setStoreCurrencies(uniqueCurrencies)
      setMostUsedCurrency(mostUsed)
      // Update primary currency if user hasn't made a selection
      if (!isUserSelected && mostUsed) {
        setPrimaryCurrency(mostUsed)
      }
      // Mark as initialized in the store
      setInitialized(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch currency data')
      setLocalAvailableCurrencies([])
    } finally {
      inFlightByManager.delete(managerId)
      setIsLoading(false)
    }
  }, [
    graphQLClient,
    managerId,
    setStoreCurrencies,
    setMostUsedCurrency,
    isUserSelected,
    setPrimaryCurrency,
    setInitialized
  ])

  // Fetch currency data on component mount
  useEffect(() => {
    if (!accessToken || !managerId) {
      setIsLoading(false)
      return
    }
    if (!isInitialized) {
      fetchCurrencyData()
    } else {
      setLocalAvailableCurrencies(storeCurrencies)
      setLocalMostUsedCurrency(storeMostUsedCurrency)
      setIsLoading(false)
    }
  }, [accessToken, managerId, fetchCurrencyData, isInitialized])

  // Default to most used currency, fallback to primary currency from store
  const defaultCurrency = useMemo(() => {
    return localMostUsedCurrency || storeMostUsedCurrency || primaryCurrency || 'EUR'
  }, [localMostUsedCurrency, storeMostUsedCurrency, primaryCurrency])

  // Combine all data for the component
  return {
    availableCurrencies: localAvailableCurrencies.length > 0 ? localAvailableCurrencies : storeCurrencies,
    isLoading,
    error,
    mostUsedCurrency: localMostUsedCurrency || storeMostUsedCurrency,
    defaultCurrency,
    refetch: fetchCurrencyData
  }
}
