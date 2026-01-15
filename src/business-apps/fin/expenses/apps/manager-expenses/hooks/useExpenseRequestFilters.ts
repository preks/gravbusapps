import { useState, useMemo, useCallback, useEffect } from 'react'
import type { DataFilterGroup, DataFilter } from '@/components/data-filter'
import { ExpenseStatus, getExpenseRequestStatusDisplay } from '../utils'
import { useDebounce } from '@/common/hooks/useDebounce'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequestCurrencies } from './useExpenseRequestCurrencies'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface UseExpenseRequestFiltersProps {
  accessToken?: string
  managerId?: string
  userInfo?: any
  onCurrencyChange?: (currency: string) => void
}

export interface UseExpenseRequestFiltersReturn {
  search: string
  setSearch: (term: string) => void
  debouncedSearch: string
  selectedFilters: string[]
  filterGroups: DataFilterGroup[]
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  setFilters: (filters: string[]) => void
  getFilters: () => Record<string, any>
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  primaryCurrency: string | null
  setCurrencyFilter: (currency: string) => void
  mostUsedCurrency: string | null
  availableCurrencies: string[]
  currenciesLoading: boolean
  currenciesInitialized: boolean
  filtersInitialized: boolean
  resetCurrencySelection: () => void
}

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

export const useExpenseRequestFilters = ({
  accessToken,
  managerId,
  userInfo,
  onCurrencyChange
}: UseExpenseRequestFiltersProps = {}): UseExpenseRequestFiltersReturn => {
  const [search, setSearch] = useState<string>('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const [localPrimaryCurrency, setLocalPrimaryCurrency] = useState<string | null>(null)
  const [localMostUsedCurrency, setLocalMostUsedCurrency] = useState<string | null>(null)
  const [userHasManuallySelectedCurrency, setUserHasManuallySelectedCurrency] = useState<boolean>(false)
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  const contextProps: BusinessAppContextProps = {
    accessToken: accessToken || '',
    userInfo: userInfo || null
  }

  const {
    mostUsedCurrency: detectedCurrency,
    availableCurrencies: fetchedCurrencies,
    isLoading: currenciesLoading
  } = useExpenseRequestCurrencies(contextProps, managerId || '')

  const debouncedSearch = useDebounce(search, 300)

  useEffect(() => {
    if (detectedCurrency && !currenciesLoading) {
      setLocalMostUsedCurrency(detectedCurrency)

      if (!userHasManuallySelectedCurrency && localPrimaryCurrency === null) {
        setLocalPrimaryCurrency(detectedCurrency)
      }
    }
  }, [detectedCurrency, currenciesLoading, userHasManuallySelectedCurrency, localPrimaryCurrency])

  // Mark filters as initialized once currency data is ready
  useEffect(() => {
    if (!filtersInitialized && !currenciesLoading) {
      setFiltersInitialized(true)
    }
  }, [filtersInitialized, currenciesLoading])

  useEffect(() => {
    if (!onCurrencyChange) {
      return
    }

    onCurrencyChange(localPrimaryCurrency || 'EUR')
  }, [localPrimaryCurrency, onCurrencyChange])

  const availableCurrencies = useMemo(() => {
    // Use currencies fetched from expense requests data
    return fetchedCurrencies || []
  }, [fetchedCurrencies])

  const handleDataFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (filterId.startsWith('currency:')) {
        const currency = filterId.replace(/^currency:/, '')

        if (selected) {
          setLocalPrimaryCurrency(currency)
          setUserHasManuallySelectedCurrency(true)
        } else {
          setLocalPrimaryCurrency(localMostUsedCurrency || 'EUR')
          setUserHasManuallySelectedCurrency(false)
        }
      } else {
        setSelectedFilters(prev => {
          if (selected) {
            // Check for duplicates before adding
            if (prev.includes(filterId)) {
              return prev
            }
            return [...prev, filterId]
          } else {
            return prev.filter(f => f !== filterId)
          }
        })
      }
    },
    [localMostUsedCurrency]
  )

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    for (const status of availableFilterStatuses) {
      // Use the getExpenseRequestStatusDisplay function for consistent translated labels
      const display = getExpenseRequestStatusDisplay(status)
      map[status] = display.label
    }
    return map
  }, [])

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filters
    const statusItems: DataFilter[] = availableFilterStatuses.map(status => ({
      id: status,
      label: filterLabelMap[status],
      selected: selectedFilters.includes(status),
      group: 'statusGroup'
    }))

    const currencyItems: DataFilter[] = availableCurrencies.map(currency => ({
      id: `currency:${currency}`,
      label: currency,
      selected: currency === localPrimaryCurrency,
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
  }, [availableFilterStatuses, filterLabelMap, selectedFilters, availableCurrencies, localPrimaryCurrency])

  const resetCurrencySelection = useCallback(() => {
    setUserHasManuallySelectedCurrency(false)
    setLocalPrimaryCurrency(localMostUsedCurrency || 'EUR')
  }, [localMostUsedCurrency])

  const addFilter = useCallback(
    (filterId: string) => {
      handleDataFilterChange(filterId, true)
    },
    [handleDataFilterChange]
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      handleDataFilterChange(filterId, false)
    },
    [handleDataFilterChange]
  )

  const setFilters = useCallback((filters: string[]) => {
    // Remove duplicates and set filters in a single update
    const uniqueFilters = Array.from(new Set(filters))
    setSelectedFilters(uniqueFilters)
  }, [])

  const returnPrimaryCurrency = useMemo(() => {
    const currency = localPrimaryCurrency || 'EUR'

    return currency
  }, [localPrimaryCurrency])

  return {
    search,
    setSearch,
    debouncedSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    setFilters,
    primaryCurrency: returnPrimaryCurrency,
    mostUsedCurrency: localMostUsedCurrency,
    availableCurrencies: availableCurrencies,
    currenciesLoading,
    currenciesInitialized: filtersInitialized,
    filtersInitialized,
    handleDataFilterChange,
    setCurrencyFilter: setLocalPrimaryCurrency,
    resetCurrencySelection,
    getFilters: useCallback(() => {
      const filters: Record<string, any> = {}

      if (selectedFilters.length > 0) {
        filters.status = selectedFilters
      }

      if (localPrimaryCurrency) {
        filters.currency = `Currency:v1:${localPrimaryCurrency}`
      }

      return filters
    }, [selectedFilters, localPrimaryCurrency])
  }
}
