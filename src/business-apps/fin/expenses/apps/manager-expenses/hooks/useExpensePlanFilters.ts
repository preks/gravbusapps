import { useState, useMemo, useCallback, useEffect } from 'react'
import type { DataFilterGroup, DataFilter } from '@/components/data-filter'
import { ExpenseStatus, getExpensePlanStatusDisplay } from '../utils'

import { useDebounce } from '@/common/hooks/useDebounce'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpensePlanCurrencies } from './useExpensePlanCurrencies'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface UseExpensePlanFiltersProps {
  accessToken?: string
  managerId?: string
  userInfo?: any // Add userInfo for context
}

export interface UseExpensePlanFiltersReturn {
  searchTerm: string
  setSearchTerm: (term: string) => void
  debouncedSearchTerm: string
  statusFilter: ExpenseStatus[]
  setStatusFilter: (status: ExpenseStatus[]) => void
  primaryCurrency: string
  setCurrencyFilter: (currency: string) => void
  mostUsedCurrency: string | null
  availableCurrencies: string[]
  currenciesLoading: boolean
  currenciesInitialized: boolean
  filterGroups: DataFilterGroup[]
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  filterLabelMap: Record<string, string>
  resetCurrencySelection: () => void
  getFilters: () => Record<string, any>
}

// Move outside component to prevent re-creation on every render
// Include all statuses from the ExpenseStatus enum to match backend values
const availableFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.PREPARED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.RETURNED,
  ExpenseStatus.REJECTED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.PAID,
  ExpenseStatus.CLOSED,
  ExpenseStatus.DISCARDED,
  ExpenseStatus.TRANSFERRED
]

export const useExpensePlanFilters = ({
  accessToken,
  managerId,
  userInfo
}: UseExpensePlanFiltersProps = {}): UseExpensePlanFiltersReturn => {
  const [searchTerm, setSearchTerm] = useState<string>('')
  // No default status filter - show all expense plans by default
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([])

  // LOCAL currency state for expense plans tab - independent from dashboard
  const [localPrimaryCurrency, setLocalPrimaryCurrency] = useState<string>('EUR')
  const [localMostUsedCurrency, setLocalMostUsedCurrency] = useState<string | null>(null)
  const [userHasManuallySelectedCurrency, setUserHasManuallySelectedCurrency] = useState<boolean>(false)
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Create context object for the currency hook
  const contextProps: BusinessAppContextProps = {
    accessToken: accessToken || '',
    userInfo: userInfo || null
  }

  // Fetch dynamic currency data if accessToken and managerId are provided
  const {
    mostUsedCurrency: detectedCurrency,
    availableCurrencies: fetchedCurrencies,
    isLoading: currenciesLoading,
    error: currenciesError
  } = useExpensePlanCurrencies(contextProps, managerId || '')

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Update local currency when most used currency is detected
  useEffect(() => {
    if (detectedCurrency && !currenciesLoading) {
      setLocalMostUsedCurrency(detectedCurrency)

      // Only set as primary if user hasn't manually selected a currency yet
      if (!userHasManuallySelectedCurrency) {
        setLocalPrimaryCurrency(detectedCurrency)
      }
    }
  }, [detectedCurrency, currenciesLoading, localPrimaryCurrency, userHasManuallySelectedCurrency])

  // Mark filters as initialized once currency data is ready
  useEffect(() => {
    if (!filtersInitialized && !currenciesLoading) {
      setFiltersInitialized(true)
    }
  }, [filtersInitialized, currenciesLoading])

  // Available currencies from fetched data
  const availableCurrencies = useMemo(() => {
    return fetchedCurrencies && fetchedCurrencies.length > 0 ? fetchedCurrencies : []
  }, [fetchedCurrencies])

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Check if this is a currency filter (starts with 'currency:')
    if (filterId.startsWith('currency:')) {
      const currencyCode = filterId.replaceAll('currency:', '')
      if (isSelected) {
        setLocalPrimaryCurrency(currencyCode) // Use local state instead of global store
        setUserHasManuallySelectedCurrency(true) // Mark that user has made a manual selection
      }
      // We don't handle deselection for currency as it's a single-select
      return
    }

    // Handle status filters
    setStatusFilter(prevFilter => {
      if (isSelected) {
        // Add the status if it's not already in the array
        if (!prevFilter.includes(filterId as ExpenseStatus)) {
          return [...prevFilter, filterId as ExpenseStatus]
        }
        return prevFilter
      } else {
        // Remove the status from the array
        return prevFilter.filter(status => status !== filterId)
      }
    })
  }, [])

  // Memoize filterLabelMap with stable dependencies
  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    for (const status of availableFilterStatuses) {
      // Use the getExpensePlanStatusDisplay function for consistent translated labels
      const display = getExpensePlanStatusDisplay(status)
      map[status] = display.label
    }
    return map
  }, [])

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filters
    const statusItems: DataFilter[] = availableFilterStatuses.map(status => ({
      id: status,
      label: filterLabelMap[status],
      selected: statusFilter.includes(status),
      group: 'statusGroup'
    }))

    // Currency filters - use local currency state
    const currencyItems: DataFilter[] = availableCurrencies.map(currency => ({
      id: `currency:${currency}`,
      label: currency,
      selected: currency === localPrimaryCurrency, // Use local state
      group: 'currencyGroup'
    }))

    return [
      {
        id: 'statusGroup',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        filters: statusItems,
        selectionMode: 'multiple'
      },
      {
        id: 'currencyGroup',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_table.currency',
          'Currency'
        ),
        filters: currencyItems,
        selectionMode: 'single'
      }
    ]
  }, [availableFilterStatuses, filterLabelMap, statusFilter, availableCurrencies, localPrimaryCurrency])

  // Function to reset manual currency selection (useful for clearing filters)
  const resetCurrencySelection = useCallback(() => {
    setUserHasManuallySelectedCurrency(false)
    setLocalPrimaryCurrency('EUR') // Reset to default
  }, [])

  // Return the local currency state instead of global store values
  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    primaryCurrency: localPrimaryCurrency, // Return local currency
    mostUsedCurrency: localMostUsedCurrency, // Return local most used currency
    availableCurrencies: availableCurrencies,
    currenciesLoading,
    currenciesInitialized: !currenciesError, // Assuming error means not initialized
    filterGroups,
    handleDataFilterChange,
    // Add missing properties to fix linter errors
    setCurrencyFilter: setLocalPrimaryCurrency, // Alias for backward compatibility
    filterLabelMap,
    resetCurrencySelection, // Add the reset function
    getFilters: useCallback(() => {
      const filters: Record<string, any> = {}

      // Add status filters if any are selected
      if (statusFilter.length > 0) {
        filters.status = statusFilter
      }

      // Add currency filter if selected
      if (localPrimaryCurrency) {
        filters.currency = `Currency:v1:${localPrimaryCurrency}`
      }

      return filters
    }, [statusFilter, localPrimaryCurrency])
  }
}
