import { useState, useCallback, useMemo } from 'react'
import { ExpenseFilter } from './useGetExpenseItems'
import { ExpenseStatus } from '../utils'
import { formatExpenseAmountRangeChipLabel } from '@/business-apps/fin/expenses/common/utils/amountRangeFilterUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { CurrencyStat } from './useExpenseCurrencies'

// Define these as constants for stable references outside the hook
const OTHER_OPTIONS: string[] = []

// Interface for the return type of useExpenseItemsFilters
export interface UseExpenseItemsFiltersReturn {
  search: string
  setSearch: (search: string) => void
  selectedFilters: string[]
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
  amountRange: { min?: number; max?: number } | null
  setAmountRange: (range: { min?: number; max?: number } | null) => void
  onStatusFilterChange: (status: string, selected: boolean) => void
  currencyStats: CurrencyStat[]
  setCurrencyStats: (stats: CurrencyStat[]) => void
}

/**
 * Hook to manage filter selection for expense items with all available statuses
 */
export const useExpenseItemsFilters = (
  availableStatuses: string[] = [],
  initialSelectedFilters: string[] = []
): UseExpenseItemsFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>(initialSelectedFilters)
  const [expenseDateRange, setExpenseDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [currencyStats, setCurrencyStats] = useState<CurrencyStat[]>([])

  // Helper function to format status display names using platform translations
  const formatStatusName = (status: string): string => {
    // Map status to proper display name using platform translations
    const statusMapping: Record<string, string> = {
      CREATED: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.created', 'Created')})`,
      ASSIGNED: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
      PENDING: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.pending', 'Pending')})`,
      APPROVED: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved')})`,
      VERIFIED: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.verified', 'Verified')})`,
      BOOKED: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booked', 'Booked')})`,
      TRANSFERRED: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred')})`,
      PAID: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
      REJECTED: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected')})`
    }

    return statusMapping[status] || `${status.charAt(0) + status.slice(1).toLowerCase()} (${status})`
  }

  // Helper function to format date range for display
  const formatDateRangeLabel = (dateRange: [Date | null, Date | null] | null): string => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return ''

    const startDate = dateRange[0]
    const endDate = dateRange[1]

    if (startDate && endDate) {
      return `${startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })} - ${endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`
    } else if (startDate) {
      return (
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_date', 'From') +
        ' ' +
        startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
      )
    } else if (endDate) {
      return (
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.to_date', 'To') +
        ' ' +
        endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
      )
    }

    return ''
  }

  // Get all available statuses or use default ones
  const allStatuses = useMemo(() => {
    if (availableStatuses.length > 0) {
      return availableStatuses
    }
    // Default statuses if none provided
    return ['CREATED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED', 'PAID', 'TRANSFERRED']
  }, [availableStatuses])

  // Create filter label map including date range and amount range
  const filterLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}

    allStatuses.forEach(status => {
      const statusKey = status.toLowerCase()
      map[statusKey] = formatStatusName(status)
    })

    currencyStats.forEach(cs => {
      map[`currency:${cs.ref}`] = cs.code
    })

    const dateRangeLabel = formatDateRangeLabel(expenseDateRange)
    if (dateRangeLabel) {
      map['expenseDateRange'] =
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date_label', 'Expense Date:') +
        ' ' +
        dateRangeLabel
    }

    const amountChip = formatExpenseAmountRangeChipLabel(
      amountRange,
      getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range_label', 'Amount Range: ')
    )
    if (amountChip) {
      map['amountRange'] = amountChip
    }

    return map
  }, [expenseDateRange, amountRange, allStatuses, formatStatusName, currencyStats])

  // Get all selected filters including amount range when active (exclude date range to prevent duplicate pills)
  const getAllSelectedFilters = useMemo(() => {
    const filters = [...selectedFilters]

    // Add expense date range as a filter if it's active
    if (expenseDateRange && (expenseDateRange[0] || expenseDateRange[1])) {
      filters.push('expenseDateRange')
    }

    // Add amount range as a filter if it's active
    if (amountRange && (amountRange.min !== undefined || amountRange.max !== undefined)) {
      filters.push('amountRange')
    }

    return filters
  }, [selectedFilters, expenseDateRange, amountRange])

  // Clear all filters including date range and amount range
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setExpenseDateRange(null)
    setAmountRange(null)
    setSearch('') // Also clear the search state
  }, [setSearch])

  // Remove filter function that handles amount range
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'amountRange') {
      setAmountRange(null)
    } else if (filterId === 'expenseDateRange') {
      setExpenseDateRange(null)
    } else {
      setSelectedFilters(prev => prev.filter(id => id !== filterId))
    }
  }, [])

  // Add filter with proper dependency handling
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => {
      // For multi-select filters, just add if not already selected
      if (prev.includes(filterId)) {
        return prev
      } else {
        return [...prev, filterId]
      }
    })
  }, [])

  // Enhanced setFilters function that properly handles clearing all filters
  const setFilters = useCallback(
    (filters: string[]) => {
      // If the filters array is empty, clear everything including ranges
      if (filters.length === 0) {
        setSelectedFilters([])
        setExpenseDateRange(null)
        setAmountRange(null)
        setSearch('') // Also clear the search state
        return
      }

      // Separate range filters from regular filters
      const rangeFilters = ['amountRange', 'expenseDateRange']
      const regularFilters = filters.filter(f => !rangeFilters.includes(f))
      const newRangeFilters = filters.filter(f => rangeFilters.includes(f))

      // Set regular filters
      setSelectedFilters(regularFilters)

      // Clear ranges that are not in the new filter list
      if (!newRangeFilters.includes('amountRange')) {
        setAmountRange(null)
      }
      if (!newRangeFilters.includes('expenseDateRange')) {
        setExpenseDateRange(null)
      }
    },
    [setSearch]
  )

  // Status filter change handler for card interactions
  const onStatusFilterChange = useCallback(
    (status: string, selected: boolean) => {
      if (selected) {
        addFilter(status.toLowerCase())
      } else {
        removeFilter(status.toLowerCase())
      }
    },
    [addFilter, removeFilter]
  )

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

      // Extract filters by types

      // Get status filters and convert back to uppercase (as they're stored in ExpenseStatus enum)
      const statusFilters = filtersToApply.filter(f =>
        Object.values(ExpenseStatus)
          .map(s => s.toLowerCase())
          .includes(f)
      )

      // Map the lowercase status filters back to their uppercase enum values
      const statuses = statusFilters.map(f => f.toUpperCase())

      // Process status filters
      if (statuses.length > 0) {
        // Convert all selected statuses from lowercase UI values to uppercase API values
        filter.status = statuses.map(status => status.toUpperCase())
      }

      // Process expense date range filters (priority over time period filters); allow partial range (from only or to only)
      const dateRangeToUse = expenseDateRangeParam || expenseDateRange
      if (dateRangeToUse) {
        if (dateRangeToUse[0]) {
          filter.expenseDateStart = dateRangeToUse[0].toISOString().split('T')[0]
        }
        if (dateRangeToUse[1]) {
          filter.expenseDateEnd = dateRangeToUse[1].toISOString().split('T')[0]
        }
      }
      // Process date range filters (priority over time period filters)
      else if (startDateRange && startDateRange[0] && endDateRange && endDateRange[1]) {
        filter.expenseDateStart = startDateRange[0].toISOString().split('T')[0]
        filter.expenseDateEnd = endDateRange[1].toISOString().split('T')[0]
      }

      // Expense type filter removed

      // Process amount range filters
      if (amountRange) {
        if (amountRange.min !== undefined) {
          filter.totalAmountMin = amountRange.min
        }
        if (amountRange.max !== undefined) {
          filter.totalAmountMax = amountRange.max
        }
      }

      return filter
    },
    [selectedFilters, OTHER_OPTIONS, expenseDateRange, amountRange, getAllSelectedFilters]
  )

  return {
    search,
    setSearch,
    selectedFilters: getAllSelectedFilters,
    filterLabelMap,
    addFilter,
    removeFilter: removeFilter,
    clearFilters: clearAllFilters,
    getFilters,
    setFilters,
    expenseDateRange,
    setExpenseDateRange,
    amountRange,
    setAmountRange,
    onStatusFilterChange,
    currencyStats,
    setCurrencyStats
  }
}
