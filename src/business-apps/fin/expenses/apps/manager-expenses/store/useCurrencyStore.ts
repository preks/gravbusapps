import { create } from 'zustand'

interface CurrencyState {
  primaryCurrency: string
  availableCurrencies: string[]
  mostUsedCurrency: string | null
  isLoading: boolean
  isUserSelected: boolean
  isInitialized: boolean
  setPrimaryCurrency: (currency: string) => void
  setAvailableCurrencies: (currencies: string[]) => void
  setMostUsedCurrency: (currency: string | null) => void
  setLoading: (isLoading: boolean) => void
  setUserSelected: (isUserSelected: boolean) => void
  setInitialized: (isInitialized: boolean) => void
  reset: () => void
}

/**
 * Store for managing currency-related state across the manager-expenses app
 */
export const useCurrencyStore = create<CurrencyState>(set => ({
  primaryCurrency: '',
  availableCurrencies: [],
  mostUsedCurrency: null,
  isLoading: false,
  isUserSelected: false,
  isInitialized: false,
  setPrimaryCurrency: currency =>
    set(state => {
      // Only update if different from current or if user hasn't made a selection yet
      if (currency !== state.primaryCurrency || !state.isUserSelected) {
        return { primaryCurrency: currency }
      }
      return {}
    }),
  setAvailableCurrencies: currencies =>
    set(state => {
      // Only update if we have new currencies or haven't initialized yet
      if (!state.isInitialized || currencies.length > 0) {
        return {
          availableCurrencies: currencies,
          isInitialized: true
        }
      }
      return {}
    }),
  setMostUsedCurrency: currency =>
    set(state => {
      // Only update if different from current
      if (currency !== state.mostUsedCurrency) {
        // If user hasn't explicitly selected a currency, also update primaryCurrency
        if (!state.isUserSelected) {
          return {
            mostUsedCurrency: currency,
            primaryCurrency: currency || state.primaryCurrency
          }
        }

        return { mostUsedCurrency: currency }
      }

      return {}
    }),
  setLoading: isLoading => set({ isLoading }),
  setUserSelected: isUserSelected => set({ isUserSelected }),
  setInitialized: isInitialized => set({ isInitialized }),
  reset: () =>
    set({
      primaryCurrency: '',
      availableCurrencies: [],
      mostUsedCurrency: null,
      isLoading: false,
      isUserSelected: false,
      isInitialized: false
    })
}))
