import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { DataFilterGroup, DataFilter } from '@/components/data-filter'
import { ExpenseStatus, getExpensePlanStatusFilterLabel } from '../utils'

import { useDebounce } from '@/common/hooks/useDebounce'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpensePlanCurrencies } from './useExpensePlanCurrencies'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { createDateRangeFilterComponent } from './dateRangeFilterComponent'
import { planFilterStatuses } from './availableFilterStatuses'
import translations from '../_i18n'

// Extend dayjs with required plugins
dayjs.extend(weekday)
dayjs.extend(localeData)

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
  primaryCurrency: string | null
  setCurrencyFilter: (currency: string | null) => void
  mostUsedCurrency: string | null
  availableCurrencies: string[]
  currenciesLoading: boolean
  currenciesInitialized: boolean
  filterGroups: DataFilterGroup[]
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  filterLabelMap: Record<string, string>
  resetCurrencySelection: () => void
  getFilters: () => Record<string, any>
  startDateRange: [Date | null, Date | null] | null
  setStartDateRange: (range: [Date | null, Date | null] | null) => void
  endDateRange: [Date | null, Date | null] | null
  setEndDateRange: (range: [Date | null, Date | null] | null) => void
  planDateRange: [Date | null, Date | null] | null
  setPlanDateRange: (range: [Date | null, Date | null] | null) => void
  effectiveDateRange: [Date | null, Date | null] | null
  setEffectiveDateRange: (range: [Date | null, Date | null] | null) => void
  planTypeFilter: string[]
  setPlanTypeFilter: (types: string[]) => void
  getAllSelectedFilters: string[]
  removeFilter: (filterId: string) => void
}

export const useExpensePlanFilters = ({
  accessToken,
  managerId,
  userInfo
}: UseExpensePlanFiltersProps = {}): UseExpensePlanFiltersReturn => {
  const { t } = useTranslation(translations)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([ExpenseStatus.PENDING])
  // Date range filters
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [planDateRange, setPlanDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null)
  // Plan type filter (EXPENSES, TRIP)
  const [planTypeFilter, setPlanTypeFilter] = useState<string[]>([])

  // LOCAL currency state for expense plans tab - independent from dashboard
  // `null` means "no currency filter" (show all currencies)
  const [localPrimaryCurrency, setLocalPrimaryCurrency] = useState<string | null>('EUR')
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

  // Helper functions to reduce cognitive complexity
  const handleCurrencyFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Allow clearing the currency selection (meaning: show all currencies)
    if (!isSelected) {
      setLocalPrimaryCurrency(null)
      setUserHasManuallySelectedCurrency(true)
      return
    }
    const currencyCode = filterId.split('currency:').join('')
    setLocalPrimaryCurrency(currencyCode)
    setUserHasManuallySelectedCurrency(true)
  }, [])

  const handlePlanTypeFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    setPlanTypeFilter(prevFilter => {
      if (isSelected) {
        return prevFilter.includes(filterId) ? prevFilter : [...prevFilter, filterId]
      }
      return prevFilter.filter(type => type !== filterId)
    })
  }, [])

  const handleStatusFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    setStatusFilter(prevFilter => {
      if (isSelected) {
        return prevFilter.includes(filterId as ExpenseStatus) ? prevFilter : [...prevFilter, filterId as ExpenseStatus]
      }
      return prevFilter.filter(status => status !== filterId)
    })
  }, [])

  const handleDataFilterChange = useCallback(
    (filterId: string, isSelected: boolean) => {
      if (filterId.startsWith('currency:')) {
        handleCurrencyFilterChange(filterId, isSelected)
        return
      }
      if (filterId.startsWith('planType:')) {
        handlePlanTypeFilterChange(filterId, isSelected)
        return
      }
      handleStatusFilterChange(filterId, isSelected)
    },
    [handleCurrencyFilterChange, handlePlanTypeFilterChange, handleStatusFilterChange]
  )

  // Helper function to format date range for display
  const formatDateRangeLabel = useCallback((dateRange: [Date | null, Date | null] | null): string => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return ''

    const startDate = dateRange[0]
    const endDate = dateRange[1]

    if (startDate && endDate) {
      return `${dayjs(startDate).format('YYYY-MM-DD')} - ${dayjs(endDate).format('YYYY-MM-DD')}`
    } else if (startDate) {
      return `From ${dayjs(startDate).format('YYYY-MM-DD')}`
    } else if (endDate) {
      return `To ${dayjs(endDate).format('YYYY-MM-DD')}`
    }

    return ''
  }, [])

  // Helper function to add date range label to map - reduces cognitive complexity
  const addDateRangeLabel = useCallback(
    (map: Record<string, string>, range: [Date | null, Date | null] | null, key: string, labelFluentKey: string) => {
      const dateLabel = formatDateRangeLabel(range)
      if (dateLabel) {
        map[key] = `${t(labelFluentKey)}: ${dateLabel}`
      }
    },
    [formatDateRangeLabel, t]
  )

  // Helper function to build date range label map - reduces cognitive complexity
  const buildDateRangeLabels = useCallback(
    (map: Record<string, string>) => {
      addDateRangeLabel(map, planDateRange, 'planDateRange', 'expense-plans-filter-plan-date')
      addDateRangeLabel(map, startDateRange, 'startDateRange', 'expense-plans-filter-start-date')
      addDateRangeLabel(map, endDateRange, 'endDateRange', 'expense-plans-filter-end-date')
      addDateRangeLabel(map, effectiveDateRange, 'effectiveDateRange', 'expense-plans-filter-effective-date')
    },
    [addDateRangeLabel, planDateRange, startDateRange, endDateRange, effectiveDateRange, t]
  )

  // Memoize filterLabelMap with stable dependencies
  const filterLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}

    // Add status filter labels
    for (const status of planFilterStatuses) {
      map[status] = getExpensePlanStatusFilterLabel(status, t)
    }

    // Add plan type filter labels
    map['planType:EXPENSES'] = t('expense-plans-filter-type-expense')
    map['planType:TRIP'] = t('expense-plans-filter-type-trip')

    // Add date range labels if active
    buildDateRangeLabels(map)

    return map
  }, [buildDateRangeLabels, t])

  // Helper to check if date range is active
  const isDateRangeActive = useCallback((range: [Date | null, Date | null] | null): boolean => {
    return !!(range && (range[0] || range[1]))
  }, [])

  // Get all selected filters including active date ranges and plan types
  const getAllSelectedFilters = useMemo(() => {
    const filters = [...statusFilter, ...planTypeFilter]

    // Add date ranges as filters if they're active
    const dateRangeKeys = [
      { range: planDateRange, key: 'planDateRange' },
      { range: startDateRange, key: 'startDateRange' },
      { range: endDateRange, key: 'endDateRange' },
      { range: effectiveDateRange, key: 'effectiveDateRange' }
    ]

    dateRangeKeys.forEach(({ range, key }) => {
      if (isDateRangeActive(range)) {
        filters.push(key)
      }
    })

    return filters
  }, [statusFilter, planTypeFilter, planDateRange, startDateRange, endDateRange, effectiveDateRange, isDateRangeActive])

  // Helper functions to reduce cognitive complexity
  const removeDateRangeFilter = useCallback((filterId: string) => {
    const dateRangeSetters: Record<string, () => void> = {
      planDateRange: () => setPlanDateRange(null),
      startDateRange: () => setStartDateRange(null),
      endDateRange: () => setEndDateRange(null),
      effectiveDateRange: () => setEffectiveDateRange(null)
    }
    const setter = dateRangeSetters[filterId]
    if (setter) {
      setter()
      return true
    }
    return false
  }, [])

  // Remove filter function that handles all filter types including date ranges
  const removeFilter = useCallback(
    (filterId: string) => {
      if (removeDateRangeFilter(filterId)) return

      if (filterId.startsWith('planType:')) {
        setPlanTypeFilter(prev => prev.filter(type => type !== filterId))
        return
      }

      setStatusFilter(prev => prev.filter(status => status !== filterId))
    },
    [removeDateRangeFilter]
  )

  // Date range filter components
  const dateRangePickerLabels = useMemo(
    () => ({
      start: t('expense-plans-filter-placeholder-start-date'),
      end: t('expense-plans-filter-placeholder-end-date')
    }),
    [t]
  )

  const EffectiveDateRangeFilterComponent = useMemo(
    () =>
      createDateRangeFilterComponent(effectiveDateRange, setEffectiveDateRange, {
        startPlaceholder: dateRangePickerLabels.start,
        endPlaceholder: dateRangePickerLabels.end
      }),
    [effectiveDateRange, dateRangePickerLabels]
  )

  const StartDateRangeFilterComponent = useMemo(
    () =>
      createDateRangeFilterComponent(startDateRange, setStartDateRange, {
        startPlaceholder: dateRangePickerLabels.start,
        endPlaceholder: dateRangePickerLabels.end
      }),
    [startDateRange, dateRangePickerLabels]
  )

  const EndDateRangeFilterComponent = useMemo(
    () =>
      createDateRangeFilterComponent(endDateRange, setEndDateRange, {
        startPlaceholder: dateRangePickerLabels.start,
        endPlaceholder: dateRangePickerLabels.end
      }),
    [endDateRange, dateRangePickerLabels]
  )

  const PlanDateRangeFilterComponent = useMemo(
    () =>
      createDateRangeFilterComponent(planDateRange, setPlanDateRange, {
        startPlaceholder: dateRangePickerLabels.start,
        endPlaceholder: dateRangePickerLabels.end
      }),
    [planDateRange, dateRangePickerLabels]
  )

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = planFilterStatuses.map(status => ({
      id: status,
      label: filterLabelMap[status],
      selected: statusFilter.includes(status)
    }))

    // Currency filters - use local currency state
    const currencyItems: DataFilter[] = availableCurrencies.map(currency => ({
      id: `currency:${currency}`,
      label: currency,
      selected: currency === localPrimaryCurrency // Use local state
    }))

    // Plan type filters
    const planTypeItems: DataFilter[] = [
      {
        id: 'planType:EXPENSES',
        label: t('expense-plans-filter-type-expense'),
        selected: planTypeFilter.includes('planType:EXPENSES')
      },
      {
        id: 'planType:TRIP',
        label: t('expense-plans-filter-type-trip'),
        selected: planTypeFilter.includes('planType:TRIP')
      }
    ]

    // Reorder filters: Currency first, then Effective Date, Plan Date, Start Date, End Date, Status, Plan Type
    return [
      {
        id: 'currencyGroup',
        title: t('expense-plans-filter-group-currency'),
        filters: currencyItems,
        selectionMode: 'single'
      },
      {
        id: 'effectiveDateRange',
        title: t('expense-plans-filter-effective-date'),
        type: 'custom',
        customComponent: EffectiveDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'planDateRange',
        title: t('expense-plans-filter-plan-date'),
        type: 'custom',
        customComponent: PlanDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'startDateRange',
        title: t('expense-plans-filter-start-date'),
        type: 'custom',
        customComponent: StartDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'endDateRange',
        title: t('expense-plans-filter-end-date'),
        type: 'custom',
        customComponent: EndDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'statusGroup',
        title: t('filter-status-group-title'),
        filters: statusItems,
        selectionMode: 'multiple'
      },
      {
        id: 'planType',
        title: t('expense-plans-filter-plan-type'),
        filters: planTypeItems,
        selectionMode: 'multiple'
      }
    ]
  }, [
    filterLabelMap,
    statusFilter,
    planTypeFilter,
    availableCurrencies,
    localPrimaryCurrency,
    EffectiveDateRangeFilterComponent,
    PlanDateRangeFilterComponent,
    StartDateRangeFilterComponent,
    EndDateRangeFilterComponent,
    t
  ])

  // Function to reset manual currency selection (useful for clearing filters)
  const resetCurrencySelection = useCallback(() => {
    setUserHasManuallySelectedCurrency(false)
    setLocalPrimaryCurrency(null) // Clear currency filter
  }, [])

  // Public setter: setting/clearing currency counts as a manual choice
  // so auto-detected currency doesn't immediately re-apply.
  const setCurrencyFilter = useCallback((currency: string | null) => {
    setLocalPrimaryCurrency(currency)
    setUserHasManuallySelectedCurrency(true)
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
    setCurrencyFilter,
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
    }, [statusFilter, localPrimaryCurrency]),
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    planDateRange,
    setPlanDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    planTypeFilter,
    setPlanTypeFilter,
    getAllSelectedFilters,
    removeFilter
  }
}
