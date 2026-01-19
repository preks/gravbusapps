import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_DISTINCT_ADVANCE_PAYMENT_CURRENCIES } from '../queries/distinctCurrencies'
import { extractCurrencyCode } from '../utils/currencyUtils'
import { useCurrencyStore } from '../store/useCurrencyStore'

/**
 * Input parameters for `useAdvancePaymentCurrencies`.
 */
interface UseAdvancePaymentCurrenciesProps {
  accessToken: string
  managerId: string
}

/**
 * Return shape for `useAdvancePaymentCurrencies`.
 *
 * Notes about behavior:
 * - `availableCurrencies` is derived strictly from advance payment records (no hardcoded defaults).
 * - When the shared currency store is already initialized, this hook reuses that value to avoid refetching; the
 *   store is itself filled from real data by this hook, so it remains data-driven.
 * - `mostUsedCurrency` is computed by frequency; `null` when no data is present.
 * - On errors, the hook returns an empty currency list and exposes the error; no fallback currency is injected.
 */
interface UseAdvancePaymentCurrenciesReturn {
  availableCurrencies: string[]
  mostUsedCurrency: string | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isInitialized: boolean
}

/**
 * Fetches and caches distinct currency codes present in advance payments for the given manager.
 *
 * Behavior
 * - Derives currency codes only from persisted advance payment data (no design-time defaults or fallbacks).
 * - Populates and reuses a shared currency store to reduce network requests across the app.
 * - Computes the most-used currency by occurrence frequency.
 * - On error, exposes the error and returns an empty currency list.
 *
 * This design keeps currency options consistent with the actual dataset visible to the user and avoids
 * accidental mixing of unrelated or unused currencies.
 */
export const useAdvancePaymentCurrencies = ({
  accessToken,
  managerId
}: UseAdvancePaymentCurrenciesProps): UseAdvancePaymentCurrenciesReturn => {
  // Use the global currency store for centralized state management
  const {
    availableCurrencies: storeCurrencies,
    setAvailableCurrencies,
    isInitialized: storeInitialized,
    setInitialized,
    mostUsedCurrency
  } = useCurrencyStore()

  // Local state for component-specific data
  const [localCurrencies, setLocalCurrencies] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(!storeInitialized) // Start with loading only if store is not initialized
  const [error, setError] = useState<Error | null>(null)
  const [localInitialized, setLocalInitialized] = useState<boolean>(false)

  const graphQLClient = useGraphQLClient(accessToken)

  // Function to fetch currencies from the API
  const fetchCurrencies = useCallback(async () => {
    if (!accessToken || !managerId) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await graphQLClient.request(GET_DISTINCT_ADVANCE_PAYMENT_CURRENCIES, {
        managerId
      })

      // Extract currency codes from currency references and filter for distinct values
      const currencyCodes = (response?.AdvancePayment || [])
        .map((item: any) => extractCurrencyCode(item.currencyRef))
        .filter(Boolean) as string[]

      // Calculate most used currency based on frequency
      const currencyFrequency: { [key: string]: number } = {}
      for (const currency of currencyCodes) {
        currencyFrequency[currency] = (currencyFrequency[currency] || 0) + 1
      }

      // Find the most used currency
      let mostUsedCurrency = null
      let maxFrequency = 0
      for (const [currency, frequency] of Object.entries(currencyFrequency)) {
        if (frequency > maxFrequency) {
          maxFrequency = frequency
          mostUsedCurrency = currency
        }
      }

      // Create a unique set of currency codes (no hardcoded fallbacks)
      const uniqueCurrencies = Array.from(new Set(currencyCodes)).sort((a, b) => a.localeCompare(b))

      // Update both local state and global store
      setLocalCurrencies(uniqueCurrencies)
      setAvailableCurrencies(uniqueCurrencies)

      // Set the most used currency in the store
      if (mostUsedCurrency) {
        useCurrencyStore.getState().setMostUsedCurrency(mostUsedCurrency)
      }

      setLocalInitialized(true)
      setInitialized(true)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch advance payment currencies'))

      // On error, set empty currencies (no hardcoded fallback)
      setLocalCurrencies([])
      setAvailableCurrencies([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, managerId, graphQLClient, setAvailableCurrencies, setInitialized, storeInitialized])

  // Effect to fetch currencies on mount or when dependencies change
  useEffect(() => {
    // If the store is already initialized, use its data and skip fetching
    if (storeInitialized && storeCurrencies.length > 0) {
      setLocalCurrencies(storeCurrencies)
      setLocalInitialized(true)
      setIsLoading(false)
      return
    }

    // Only fetch if we have credentials and haven't initialized yet
    if (accessToken && managerId && !localInitialized) {
      fetchCurrencies()
    } else if (!accessToken || !managerId) {
      // Reset loading state if we don't have required props
      setIsLoading(false)
    }
  }, [accessToken, managerId, localInitialized, fetchCurrencies, storeInitialized, storeCurrencies])

  // Return currencies derived from actual advance payment data (may reuse store when already initialized)
  return {
    availableCurrencies: localCurrencies,
    mostUsedCurrency,
    isLoading: isLoading && !storeInitialized, // Only show loading if both local and store are not ready
    error,
    refetch: fetchCurrencies,
    isInitialized: localInitialized || storeInitialized
  }
}
