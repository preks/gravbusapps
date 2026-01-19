import { useState, useMemo, useCallback, useEffect } from 'react'
import type { DataFilterGroup, DataFilter } from '@/components/data-filter'
import { ExpenseStatus, getExpensePlanStatusDisplay } from '../utils'

import { useDebounce } from '@/common/hooks/useDebounce'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpensePlanCurrencies } from './useExpensePlanCurrencies'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'
import { createDateRangeFilterComponent } from './dateRangeFilterComponent'
import { availableFilterStatuses } from './availableFilterStatuses'

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
  const [searchTerm, setSearchTerm] = useState<string>('')
  // No default status filter - show all expense plans by default
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus[]>([])
  // Date range filters
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [planDateRange, setPlanDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null)
  // Plan type filter (EXPENSES, TRIP)
  const [planTypeFilter, setPlanTypeFilter] = useState<string[]>([])

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

  // Helper functions to reduce cognitive complexity
  const handleCurrencyFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    if (!isSelected) return // Currency is single-select, no deselection
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
    (
      map: Record<string, string>,
      range: [Date | null, Date | null] | null,
      key: string,
      labelKey: string,
      defaultLabel: string
    ) => {
      const dateLabel = formatDateRangeLabel(range)
      if (dateLabel) {
        map[key] = `${getTranslationFromI18nKeyAndLabel(labelKey, defaultLabel)}: ${dateLabel}`
      }
    },
    [formatDateRangeLabel]
  )

  // Helper function to build date range label map - reduces cognitive complexity
  const buildDateRangeLabels = useCallback(
    (map: Record<string, string>) => {
      addDateRangeLabel(
        map,
        planDateRange,
        'planDateRange',
        'lowcoder:team_expenses_page.plan_details.plan_date',
        'Plan Date'
      )
      addDateRangeLabel(map, startDateRange, 'startDateRange', 'lowcoder:personal_expenses.start_date', 'Start Date')
      addDateRangeLabel(map, endDateRange, 'endDateRange', 'lowcoder:personal_expenses.end_date', 'End Date')
      addDateRangeLabel(
        map,
        effectiveDateRange,
        'effectiveDateRange',
        'lowcoder:personal_expenses.effective_date',
        'Effective Date'
      )
    },
    [addDateRangeLabel, planDateRange, startDateRange, endDateRange, effectiveDateRange]
  )

  // Helper function to format status display name with brackets (matching personal expenses pattern)
  const getStatusDisplayName = useCallback((status: string): string => {
    const statusConfig = getExpensePlanStatusDisplay(status)
    // Only show backend status in parentheses if the label is different from the status
    if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
      return statusConfig.label
    } else {
      // Format backend status with only first letter uppercase and translate it
      const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
      const translatedStatus = getTranslationFromI18nKeyAndLabel(
        `lowcoder:expense_statuses.${status.toLowerCase()}`,
        formattedStatus
      )
      return `${statusConfig.label} (${translatedStatus})`
    }
  }, [])

  // Memoize filterLabelMap with stable dependencies
  const filterLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}

    // Add status filter labels with brackets
    for (const status of availableFilterStatuses) {
      map[status] = getStatusDisplayName(status)
    }

    // Add plan type filter labels
    map['planType:EXPENSES'] = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
    map['planType:TRIP'] = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')

    // Add date range labels if active
    buildDateRangeLabels(map)

    return map
  }, [buildDateRangeLabels, getStatusDisplayName])

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
  const EffectiveDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(effectiveDateRange, setEffectiveDateRange, { showTooltip: true }),
    [effectiveDateRange]
  )

  const StartDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(startDateRange, setStartDateRange),
    [startDateRange]
  )

  const EndDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(endDateRange, setEndDateRange),
    [endDateRange]
  )

  const PlanDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(planDateRange, setPlanDateRange),
    [planDateRange]
  )

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filters
    const statusItems: DataFilter[] = availableFilterStatuses.map(status => ({
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
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense'),
        selected: planTypeFilter.includes('planType:EXPENSES')
      },
      {
        id: 'planType:TRIP',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip'),
        selected: planTypeFilter.includes('planType:TRIP')
      }
    ]

    // Reorder filters: Currency first, then Effective Date, Plan Date, Start Date, End Date, Status, Plan Type
    return [
      {
        id: 'currencyGroup',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_table.currency',
          'Currency'
        ),
        filters: currencyItems,
        selectionMode: 'single'
      },
      {
        id: 'effectiveDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
        type: 'custom',
        customComponent: EffectiveDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'planDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
        type: 'custom',
        customComponent: PlanDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'startDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
        type: 'custom',
        customComponent: StartDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'endDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
        type: 'custom',
        customComponent: EndDateRangeFilterComponent,
        hideSearch: true
      },
      {
        id: 'statusGroup',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        filters: statusItems,
        selectionMode: 'multiple'
      },
      {
        id: 'planType',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
        filters: planTypeItems,
        selectionMode: 'multiple'
      }
    ]
  }, [
    availableFilterStatuses,
    filterLabelMap,
    statusFilter,
    planTypeFilter,
    availableCurrencies,
    localPrimaryCurrency,
    EffectiveDateRangeFilterComponent,
    PlanDateRangeFilterComponent,
    StartDateRangeFilterComponent,
    EndDateRangeFilterComponent
  ])

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
