import { useState, useMemo, useCallback, useEffect } from 'react'
import React from 'react'
import dayjs, { Dayjs } from 'dayjs'
import { DatePicker, Tooltip } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'

const { RangePicker } = DatePicker
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
  // Date range filters
  effectiveDateRange: [Date | null, Date | null] | null
  setEffectiveDateRange: (range: [Date | null, Date | null] | null) => void
  requestDateRange: [Date | null, Date | null] | null
  setRequestDateRange: (range: [Date | null, Date | null] | null) => void
  startDateRange: [Date | null, Date | null] | null
  setStartDateRange: (range: [Date | null, Date | null] | null) => void
  endDateRange: [Date | null, Date | null] | null
  setEndDateRange: (range: [Date | null, Date | null] | null) => void
  getAllSelectedFilters: string[]
  requestTypeFilter: string[]
  setRequestTypeFilter: (filter: string[]) => void
}

const availableFilterStatuses: ExpenseStatus[] = [
  ExpenseStatus.PREPARED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
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
  // Date range filters
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null)
  // Request type filter (EXPENSES, TRIP) - radio button behavior
  const [requestTypeFilter, setRequestTypeFilter] = useState<string[]>([])

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

  // Helper to handle currency filter change
  const handleCurrencyFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      const currency = filterId.replace(/^currency:/, '')
      if (selected) {
        setLocalPrimaryCurrency(currency)
        setUserHasManuallySelectedCurrency(true)
      } else {
        setLocalPrimaryCurrency(localMostUsedCurrency || 'EUR')
        setUserHasManuallySelectedCurrency(false)
      }
    },
    [localMostUsedCurrency]
  )

  // Helper to handle request type filter change (radio button behavior)
  const handleRequestTypeFilterChange = useCallback((filterId: string, selected: boolean) => {
    if (selected) {
      // Remove any existing request type filters and add the new one
      setRequestTypeFilter([filterId])
      setSelectedFilters(prev => prev.filter(id => !id.startsWith('ExpenseRequestType:')))
    } else {
      setRequestTypeFilter([])
    }
  }, [])

  // Helper to handle status filter change
  const handleStatusFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      if (selected) {
        if (prev.includes(filterId)) {
          return prev
        }
        return [...prev, filterId]
      } else {
        return prev.filter(f => f !== filterId)
      }
    })
  }, [])

  const handleDataFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (filterId.startsWith('currency:')) {
        handleCurrencyFilterChange(filterId, selected)
        return
      }
      if (filterId.startsWith('ExpenseRequestType:')) {
        handleRequestTypeFilterChange(filterId, selected)
        return
      }
      handleStatusFilterChange(filterId, selected)
    },
    [handleCurrencyFilterChange, handleRequestTypeFilterChange, handleStatusFilterChange]
  )

  // Helper function to format date range for display
  const formatDateRangeLabel = useCallback((dateRange: [Date | null, Date | null] | null): string => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return ''
    const startDate = dateRange[0]
    const endDate = dateRange[1]
    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })} - ${endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`
    } else if (startDate) {
      return `From ${startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`
    } else if (endDate) {
      return `To ${endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`
    }
    return ''
  }, [])

  // Helper function to create date range filter components - reduces duplication
  const createDateRangeFilterComponent = useCallback(
    (
      dateRange: [Date | null, Date | null] | null,
      setter: (range: [Date | null, Date | null] | null) => void,
      showTooltip = false
    ) => {
      const dayjsRange: [Dayjs | null, Dayjs | null] = [
        dateRange?.[0] ? dayjs(dateRange[0]) : null,
        dateRange?.[1] ? dayjs(dateRange[1]) : null
      ]

      const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
        if (!dates) {
          setter(null)
        } else {
          setter([dates[0]?.toDate() || null, dates[1]?.toDate() || null])
        }
      }

      const picker = React.createElement(RangePicker, {
        value: dayjsRange,
        onChange: handleDateRangeChange,
        placeholder: [
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
          getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
        ],
        format: 'YYYY-MM-DD',
        allowClear: true,
        allowEmpty: [true, true],
        className: 'gba:w-full'
      })

      if (showTooltip) {
        return React.createElement(
          'div',
          {},
          picker,
          React.createElement(
            'div',
            { className: 'gba:mt-2 gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1' },
            React.createElement(
              Tooltip,
              {
                title: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:personal_expenses.effective_date_info',
                  'For type TRIP, the start date is used. For type EXPENSE, the item expense date is used.'
                ),
                placement: 'right'
              },
              React.createElement(InfoCircleOutlined)
            )
          )
        )
      }

      return picker
    },
    []
  )

  // Date range filter components
  const EffectiveDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(effectiveDateRange, setEffectiveDateRange, true),
    [effectiveDateRange, createDateRangeFilterComponent]
  )

  const RequestDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(requestDateRange, setRequestDateRange),
    [requestDateRange, createDateRangeFilterComponent]
  )

  const StartDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(startDateRange, setStartDateRange),
    [startDateRange, createDateRangeFilterComponent]
  )

  const EndDateRangeFilterComponent = useMemo(
    () => createDateRangeFilterComponent(endDateRange, setEndDateRange),
    [endDateRange, createDateRangeFilterComponent]
  )

  // Helper to check if date range is active
  const isDateRangeActive = useCallback((range: [Date | null, Date | null] | null): boolean => {
    return !!(range && (range[0] || range[1]))
  }, [])

  // Get all selected filters including active date ranges and request type
  const getAllSelectedFilters = useMemo(() => {
    const filters = [...selectedFilters, ...requestTypeFilter]
    const dateRangeKeys = [
      { range: effectiveDateRange, key: 'effectiveDateRange' },
      { range: requestDateRange, key: 'requestDateRange' },
      { range: startDateRange, key: 'startDateRange' },
      { range: endDateRange, key: 'endDateRange' }
    ]
    dateRangeKeys.forEach(({ range, key }) => {
      if (isDateRangeActive(range)) {
        filters.push(key)
      }
    })
    return filters
  }, [
    selectedFilters,
    requestTypeFilter,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    isDateRangeActive
  ])

  // Helper function to add date range label to map
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

  // Helper function to format status display name with brackets (matching personal expenses pattern)
  const getStatusDisplayName = useCallback((status: string): string => {
    const statusConfig = getExpenseRequestStatusDisplay(status)
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

  // Build filter label map with date ranges and request type
  const filterLabelMapWithDates = useMemo(() => {
    const map: Record<string, string> = {}
    for (const status of availableFilterStatuses) {
      map[status] = getStatusDisplayName(status)
    }
    // Add request type labels
    map['ExpenseRequestType:v1:EXPENSES'] = getTranslationFromI18nKeyAndLabel(
      'lowcoder:personal_expenses.expense',
      'Expense'
    )
    map['ExpenseRequestType:v1:TRIP'] = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
    addDateRangeLabel(
      map,
      effectiveDateRange,
      'effectiveDateRange',
      'lowcoder:personal_expenses.effective_date',
      'Effective Date'
    )
    addDateRangeLabel(
      map,
      requestDateRange,
      'requestDateRange',
      'lowcoder:personal_expenses.request_date',
      'Request Date'
    )
    addDateRangeLabel(map, startDateRange, 'startDateRange', 'lowcoder:personal_expenses.start_date', 'Start Date')
    addDateRangeLabel(map, endDateRange, 'endDateRange', 'lowcoder:personal_expenses.end_date', 'End Date')
    return map
  }, [
    availableFilterStatuses,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    addDateRangeLabel,
    getStatusDisplayName
  ])

  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    // Status filters
    const statusItems: DataFilter[] = availableFilterStatuses.map(status => ({
      id: status,
      label: filterLabelMapWithDates[status],
      selected: selectedFilters.includes(status)
    }))

    const currencyItems: DataFilter[] = availableCurrencies.map(currency => ({
      id: `currency:${currency}`,
      label: currency,
      selected: currency === localPrimaryCurrency
    }))

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
        id: 'requestDateRange',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:confirm_transfer_advance_payment.request_date_label',
          'Request Date'
        ),
        type: 'custom',
        customComponent: RequestDateRangeFilterComponent,
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
        id: 'requestType',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
          'Request Type'
        ),
        type: 'radio' as any,
        filters: [
          {
            id: 'ExpenseRequestType:v1:EXPENSES',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense'),
            selected: requestTypeFilter.includes('ExpenseRequestType:v1:EXPENSES')
          },
          {
            id: 'ExpenseRequestType:v1:TRIP',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip'),
            selected: requestTypeFilter.includes('ExpenseRequestType:v1:TRIP')
          }
        ]
      }
    ]
  }, [
    availableFilterStatuses,
    filterLabelMapWithDates,
    selectedFilters,
    availableCurrencies,
    localPrimaryCurrency,
    EffectiveDateRangeFilterComponent,
    RequestDateRangeFilterComponent,
    StartDateRangeFilterComponent,
    EndDateRangeFilterComponent,
    requestTypeFilter
  ])

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

  // Helper to remove date range filter
  const removeDateRangeFilter = useCallback((filterId: string) => {
    const dateRangeSetters: Record<string, () => void> = {
      effectiveDateRange: () => setEffectiveDateRange(null),
      requestDateRange: () => setRequestDateRange(null),
      startDateRange: () => setStartDateRange(null),
      endDateRange: () => setEndDateRange(null)
    }
    const setter = dateRangeSetters[filterId]
    if (setter) {
      setter()
      return true
    }
    return false
  }, [])

  const removeFilter = useCallback(
    (filterId: string) => {
      if (removeDateRangeFilter(filterId)) return
      if (filterId.startsWith('ExpenseRequestType:')) {
        setRequestTypeFilter([])
        return
      }
      handleDataFilterChange(filterId, false)
    },
    [handleDataFilterChange, removeDateRangeFilter]
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
    selectedFilters, // Status-only filters for GraphQL query
    filterGroups,
    filterLabelMap: filterLabelMapWithDates,
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
    }, [selectedFilters, localPrimaryCurrency]),
    effectiveDateRange,
    setEffectiveDateRange,
    requestDateRange,
    setRequestDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    getAllSelectedFilters, // All filters including date ranges and request type for UI
    requestTypeFilter,
    setRequestTypeFilter
  }
}
