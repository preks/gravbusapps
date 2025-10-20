import { useMemo } from 'react'
import { useSearchableCatalog } from '../../lead-form/hooks/useSearchableCatalog'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface CurrencyOption {
  id: string
  value: string
  label: string
  name: string
}

export interface UseCurrencyCatalogReturn {
  currencyOptions: CurrencyOption[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  needsMoreData: boolean
  displayCount: number
  totalFetched: number
  loadMore: () => void
  showMore: () => void
  search: (searchTerm: string) => void
  initialize: () => void
}

// Currency catalog constants
export const CURRENCY_CATALOG = 'Currency'
export const CURRENCY_VERSION = 'v1'

export const useCurrencyCatalog = (context: BusinessAppContextProps): UseCurrencyCatalogReturn => {
  // Currency catalog configuration
  const currencyConfig = useMemo(
    () => ({
      accessToken: context.accessToken,
      catalogIdentifier: CURRENCY_CATALOG,
      version: CURRENCY_VERSION,
      pageSize: 100 // Load 100 items per query for better performance
    }),
    [context.accessToken]
  )

  // Initialize catalog hook
  const currencyHook = useSearchableCatalog(currencyConfig)

  return {
    currencyOptions: currencyHook.options.map(option => ({
      id: String(option.id),
      value: String(option.id), // Store catalog ID as value
      label: option.label,
      name: option.name
    })),
    isLoading: currencyHook.loading,
    error: currencyHook.error,
    hasMore: currencyHook.hasMore,
    needsMoreData: currencyHook.needsMoreData,
    displayCount: currencyHook.displayCount,
    totalFetched: currencyHook.totalFetched,
    loadMore: currencyHook.loadMore,
    showMore: currencyHook.showMore,
    search: currencyHook.search,
    initialize: currencyHook.initialize
  }
}
