import { create } from 'zustand';

interface CurrencyState {
  primaryCurrency: string;
  setPrimaryCurrency: (currency: string) => void;
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
}

/**
 * Store for managing currency-related state across the manager-expenses app
 */
export const useCurrencyStore = create<CurrencyState>((set) => ({
  primaryCurrency: 'EUR', // Default currency
  setPrimaryCurrency: (currency: string) => set({ primaryCurrency: currency }),
  isLoaded: false,
  setIsLoaded: (loaded: boolean) => set({ isLoaded: loaded }),
}));
