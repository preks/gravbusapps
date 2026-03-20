import React, { useState, useCallback, useMemo } from 'react'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { ExpenseFilter } from './useGetExpenseItems'
import { ExpenseStatus } from '../utils'
import { ExpenseDateRangeFilter } from '../components/tabs/expense-items-tab/ExpenseDateRangeFilter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Define these as constants for stable references outside the hook
const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days']
const EXPENSE_TYPE_OPTIONS = ['expense', 'trip']
const OTHER_OPTIONS: string[] = []

// Interface for the return type of useExpenseFilters
export interface UseExpenseFiltersReturn {
  search: string
  setSearch: (search: string) => void
  selectedFilters: string[]
  filterGroups: DataFilterGroup[]
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  clearFilters: () => void
  getFilters: (
    filtersToApply?: string[],
    startDateRange?: [Date | null, Date | null] | null,
    endDateRange?: [Date | null, Date | null] | null,
    expenseDateRange?: [Date | null, Date | null] | null
  ) => ExpenseFilter
  setFilters: (filters: string[]) => void
  setExpenseDateRange: (expenseDateRange: [Date | null, Date | null] | null) => void
  expenseDateRange: [Date | null, Date | null] | null
}

export enum DataFilterType {
  CHECKBOX_GROUP = 'checkbox-group',
  DATE_RANGE = 'date-range',
  NUMBER_RANGE = 'number-range'
}

/**
 * Hook to manage filter selection for expense items
 */
export const useExpenseFilters = (): UseExpenseFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [expenseDateRange, setExpenseDateRange] = useState<[Date | null, Date | null] | null>(null)

  // Helper function to format status display names
  const formatStatusName = (status: string): string => {
    return status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')
  }

  // Helper function to format date range for display
  const formatDateRangeLabel = (dateRange: [Date | null, Date | null] | null): string => {
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
  }

  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(
    () => [
      {
        id: 'expenseDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date_label', 'Expense Date'),
        type: DataFilterType.DATE_RANGE,
        customComponent: React.createElement(ExpenseDateRangeFilter, {
          expenseDateRange: expenseDateRange,
          onDateRangeChange: setExpenseDateRange,
          placeholder: [
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
          ]
        }),
        hideSearch: true
      },
      {
        id: 'timePeriod',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.time_period_label', 'Time Period'),
        filters: [
          { id: 'last30days', label: 'Last 30 days', selected: selectedFilters.includes('last30days') },
          { id: 'last90days', label: 'Last 90 days', selected: selectedFilters.includes('last90days') },
          { id: 'last180days', label: 'Last 180 days', selected: selectedFilters.includes('last180days') }
        ]
      },
      {
        id: 'expenseType',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_item.change_expense_item_container.current_expense_type_label',
          'Expense Type'
        ),
        filters: [
          { id: 'expense', label: 'Expense', selected: selectedFilters.includes('expense') },
          { id: 'trip', label: 'Trip', selected: selectedFilters.includes('trip') }
        ]
      },
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.status',
          'Status'
        ),
        filters: [
          { id: 'created', label: formatStatusName('CREATED'), selected: selectedFilters.includes('created') },
          { id: 'approved', label: formatStatusName('APPROVED'), selected: selectedFilters.includes('approved') },
          { id: 'rejected', label: formatStatusName('REJECTED'), selected: selectedFilters.includes('rejected') },
          { id: 'pending', label: formatStatusName('PENDING'), selected: selectedFilters.includes('pending') }
        ]
      }
    ],
    [selectedFilters, expenseDateRange]
  )

  // Create filter label map including date range
  const filterLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}

    // Add standard filter labels
    filterGroups.forEach(group => {
      if (group.filters) {
        group.filters.forEach(filter => {
          map[filter.id] = filter.label
        })
      }
    })

    // Add date range label if active
    const dateRangeLabel = formatDateRangeLabel(expenseDateRange)
    if (dateRangeLabel) {
      map['expenseDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date_label', 'Expense Date')}: ${dateRangeLabel}`
    }

    return map
  }, [filterGroups, expenseDateRange])

  // Get all selected filters including date range when active
  const getAllSelectedFilters = useMemo(() => {
    const filters = [...selectedFilters]

    // Add date range as a filter if it's active
    if (expenseDateRange && (expenseDateRange[0] || expenseDateRange[1])) {
      filters.push('expenseDateRange')
    }

    return filters
  }, [selectedFilters, expenseDateRange])

  // Clear all filters including date range
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setExpenseDateRange(null)
  }, [])

  // Remove filter function that handles date range
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'expenseDateRange') {
      setExpenseDateRange(null)
    } else {
      setSelectedFilters(prev => prev.filter(id => id !== filterId))
    }
  }, [])

  // Add filter with proper dependency handling
  const addFilter = useCallback(
    (filterId: string) => {
      setSelectedFilters(prev => {
        // Special handling for radio filter types (time period)
        if (TIME_PERIOD_OPTIONS.includes(filterId)) {
          // Remove any existing time period filter
          const withoutTimePeriods = prev.filter(f => !TIME_PERIOD_OPTIONS.includes(f))
          return [...withoutTimePeriods, filterId]
        }
        // For multi-select filters, just add if not already selected
        if (prev.includes(filterId)) {
          return prev
        } else {
          return [...prev, filterId]
        }
      })
    },
    [TIME_PERIOD_OPTIONS]
  )

  // Atomic setter for filters
  const setFilters = useCallback((filters: string[]) => {
    setSelectedFilters(filters)
  }, [])

  // Convert UI filters to API filter format
  const getFilters = useCallback(
    (
      filtersToApply: string[] = getAllSelectedFilters,
      startDateRange?: [Date | null, Date | null] | null,
      endDateRange?: [Date | null, Date | null] | null,
      expenseDateRangeParam?: [Date | null, Date | null] | null
    ): ExpenseFilter => {
      // Map UI filter format to the expected API filter format
      const filter: ExpenseFilter = {}

      // Extract filters by types (exclude date range from processing as regular filter)
      const timePeriod =
        filtersToApply.filter(f => f !== 'expenseDateRange').find(f => TIME_PERIOD_OPTIONS.includes(f)) || null

      // Get status filters and convert back to uppercase (as they're stored in ExpenseStatus enum)
      const statusFilters = filtersToApply.filter(
        f =>
          f !== 'expenseDateRange' &&
          Object.values(ExpenseStatus)
            .map(s => s.toLowerCase())
            .includes(f)
      )

      // Map the lowercase status filters back to their uppercase enum values
      const statuses = statusFilters.map(f => f.toUpperCase())

      const expenseTypes = filtersToApply.filter(f => f !== 'expenseDateRange' && EXPENSE_TYPE_OPTIONS.includes(f))
      // Process status filters
      if (statuses.length > 0) {
        // Convert all selected statuses from lowercase UI values to uppercase API values
        filter.status = statuses.map(status => status.toUpperCase())
      }

      // Process expense date range filters (priority over time period filters)
      const dateRangeToUse = expenseDateRangeParam || expenseDateRange
      if (dateRangeToUse && dateRangeToUse[0] && dateRangeToUse[1]) {
        filter.expenseDateStart = dateRangeToUse[0].toISOString().split('T')[0]
        filter.expenseDateEnd = dateRangeToUse[1].toISOString().split('T')[0]
      }
      // Process date range filters (priority over time period filters)
      else if (startDateRange && startDateRange[0] && endDateRange && endDateRange[1]) {
        filter.expenseDateStart = startDateRange[0].toISOString().split('T')[0]
        filter.expenseDateEnd = endDateRange[1].toISOString().split('T')[0]
      }
      // Process time period filters (only if no date range is specified)
      else if (timePeriod) {
        const today = new Date()
        const endDate = new Date(today).toISOString().split('T')[0]

        // Calculate start date based on selected time period
        const startDate = new Date(today)
        if (timePeriod === 'last30days') {
          startDate.setDate(today.getDate() - 30)
        } else if (timePeriod === 'last90days') {
          startDate.setDate(today.getDate() - 90)
        } else if (timePeriod === 'last180days') {
          startDate.setDate(today.getDate() - 180)
        }

        filter.expenseDateStart = startDate.toISOString().split('T')[0]
        filter.expenseDateEnd = endDate
      }

      // Process expense type filters
      if (expenseTypes.length > 0) {
        // For now, use only the first selected expense type since expenseClass doesn't support multiple values
        const selectedType = expenseTypes[0]

        // Map UI expense types to the expected API values with proper capitalization
        if (selectedType === 'expense') {
          filter.expenseClass = { value: 'Expense' }
        } else if (selectedType === 'trip') {
          filter.expenseClass = { value: 'Trip' }
        }
      }

      return filter
    },
    [selectedFilters, TIME_PERIOD_OPTIONS, EXPENSE_TYPE_OPTIONS, OTHER_OPTIONS, expenseDateRange, getAllSelectedFilters]
  )

  return {
    search,
    setSearch,
    selectedFilters: getAllSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter: removeFilter,
    clearFilters: clearAllFilters,
    getFilters,
    setFilters,
    expenseDateRange,
    setExpenseDateRange
  }
}
