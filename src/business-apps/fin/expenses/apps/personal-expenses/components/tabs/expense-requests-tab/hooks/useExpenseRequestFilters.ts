import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { getExpenseRequestStatusFilterLabel } from '../../../../utils'
import personalTranslations from '../../../../_i18n'
import type { ExpenseRequestWhereClause } from '../utils/expenseRequestWhereClause.types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildExpenseRequestWhereConditions } from '../utils/buildExpenseRequestWhereConditions'
import { EXPENSE_REQUEST_FILTER_STATUSES } from '../utils/expenseRequestFilterConstants'
import {
  formatExpenseAmountRangeChipLabel,
  type ExpenseAmountRangeValue
} from '@/business-apps/fin/expenses/common/utils/amountRangeFilterUtils'

export {
  EXPENSE_REQUEST_FILTER_STATUSES,
  LEGACY_EXPENSE_REQUEST_FILTER_IDS
} from '../utils/expenseRequestFilterConstants'

// Interface for request filter
export interface ExpenseRequestFilter {
  status?: string[]
  requestDateStart?: string
  requestDateEnd?: string
  startDateStart?: string
  startDateEnd?: string
  endDateStart?: string
  endDateEnd?: string
  requestType?: { value: string }
}

export type { ExpenseRequestWhereClause } from '../utils/expenseRequestWhereClause.types'

const EXPENSE_REQUEST_VIRTUAL_FILTER_IDS = new Set<string>([
  'requestDateRange',
  'startDateRange',
  'endDateRange',
  'effectiveDateRange',
  'reimbursableAmountRange',
  'advanceAmountRange'
])

// Interface for the return type of useExpenseRequestFilters
export interface UseExpenseRequestFiltersReturn {
  search: string
  setSearch: (search: string) => void
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  handleFilterChange: (filterId: string, selected: boolean) => void
  clearFilters: () => void
  getFilters: () => ExpenseRequestWhereClause
  requestDateRange: [Date | null, Date | null] | null
  setRequestDateRange: (dateRange: [Date | null, Date | null] | null) => void
  startDateRange: [Date | null, Date | null] | null
  setStartDateRange: (dateRange: [Date | null, Date | null] | null) => void
  endDateRange: [Date | null, Date | null] | null
  setEndDateRange: (dateRange: [Date | null, Date | null] | null) => void
  effectiveDateRange: [Date | null, Date | null] | null
  setEffectiveDateRange: (dateRange: [Date | null, Date | null] | null) => void
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string) => void
  removeFilter: (filterId: string) => void
  reimbursableAmountRange: ExpenseAmountRangeValue
  setReimbursableAmountRange: (range: ExpenseAmountRangeValue) => void
  advanceAmountRange: ExpenseAmountRangeValue
  setAdvanceAmountRange: (range: ExpenseAmountRangeValue) => void
}

/**
 * Hook to manage filter selection for expense requests
 */
export const useExpenseRequestFilters = (): UseExpenseRequestFiltersReturn => {
  const { t } = useTranslation(personalTranslations)
  // State for search and selected filters
  const [search, setSearch] = useState<string>('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [reimbursableAmountRange, setReimbursableAmountRange] = useState<ExpenseAmountRangeValue>(null)
  const [advanceAmountRange, setAdvanceAmountRange] = useState<ExpenseAmountRangeValue>(null)

  // Define these as constants for stable references
  // const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];

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

  // Build the filter label map dynamically
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {
      // 'last30days': 'Last 30 days',
      // 'last90days': 'Last 90 days',
      // 'last180days': 'Last 180 days',
      'ExpenseRequestType:v1:EXPENSES': getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.expense',
        'Expense'
      ),
      'ExpenseRequestType:v1:TRIP': getTranslationFromI18nKeyAndLabel(
        'lowcoder:approve_expense_plan.tab_container.trip_header',
        'Trip'
      )
    }

    // Add all status options using the same display names as the filter dropdown
    EXPENSE_REQUEST_FILTER_STATUSES.forEach(status => {
      labelMap[status] = getExpenseRequestStatusFilterLabel(status, t)
    })

    // Add date range labels if active
    const requestDateLabel = formatDateRangeLabel(requestDateRange)
    if (requestDateLabel) {
      labelMap['requestDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.request_date', 'Request Date')}: ${requestDateLabel}`
    }
    const effectiveDateLabel = formatDateRangeLabel(effectiveDateRange)
    if (effectiveDateLabel) {
      labelMap['effectiveDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date')}: ${effectiveDateLabel}`
    }

    const startDateLabel = formatDateRangeLabel(startDateRange)
    if (startDateLabel) {
      labelMap['startDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date')}: ${startDateLabel}`
    }

    const endDateLabel = formatDateRangeLabel(endDateRange)
    if (endDateLabel) {
      labelMap['endDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date')}: ${endDateLabel}`
    }

    const reimbursableChip = formatExpenseAmountRangeChipLabel(
      reimbursableAmountRange,
      `${getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.reimbursable', 'Reimbursable Amount')}: `
    )
    if (reimbursableChip) {
      labelMap['reimbursableAmountRange'] = reimbursableChip
    }

    const advanceChip = formatExpenseAmountRangeChipLabel(
      advanceAmountRange,
      `${getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.advance', 'Advance')}: `
    )
    if (advanceChip) {
      labelMap['advanceAmountRange'] = advanceChip
    }

    return labelMap
  }, [
    t,
    formatDateRangeLabel,
    requestDateRange,
    startDateRange,
    endDateRange,
    effectiveDateRange,
    reimbursableAmountRange,
    advanceAmountRange
  ])

  // Get all selected filters including active date ranges
  const getAllSelectedFilters = useMemo(() => {
    const filters = [...selectedFilters] // Use the original state

    // Add date ranges as filters if they're active
    if (requestDateRange && (requestDateRange[0] || requestDateRange[1])) {
      filters.push('requestDateRange')
    }
    if (startDateRange && (startDateRange[0] || startDateRange[1])) {
      filters.push('startDateRange')
    }
    if (endDateRange && (endDateRange[0] || endDateRange[1])) {
      filters.push('endDateRange')
    }
    if (effectiveDateRange && (effectiveDateRange[0] || effectiveDateRange[1])) {
      filters.push('effectiveDateRange')
    }
    if (
      reimbursableAmountRange &&
      (reimbursableAmountRange.min !== undefined || reimbursableAmountRange.max !== undefined)
    ) {
      filters.push('reimbursableAmountRange')
    }
    if (advanceAmountRange && (advanceAmountRange.min !== undefined || advanceAmountRange.max !== undefined)) {
      filters.push('advanceAmountRange')
    }

    return filters
  }, [
    selectedFilters,
    requestDateRange,
    startDateRange,
    endDateRange,
    effectiveDateRange,
    reimbursableAmountRange,
    advanceAmountRange
  ])

  // Add filter with proper dependency handling - returns the new filters array for immediate use
  const addFilter = useCallback((filterId: string): string[] => {
    let newFilters: string[] = []

    setSelectedFilters(prev => {
      // Special handling for radio filter types (time period)
      // if (TIME_PERIOD_OPTIONS.includes(filterId)) {
      //   // Remove any existing time period filter
      //   const withoutTimePeriods = prev.filter(f => !TIME_PERIOD_OPTIONS.includes(f));
      //   newFilters = [...withoutTimePeriods, filterId];
      //   return newFilters;
      // }
      // For multi-select filters, just add if not already selected
      if (prev.includes(filterId)) {
        newFilters = [...prev]
        return prev
      } else {
        newFilters = [...prev, filterId]
        return newFilters
      }
    })

    return newFilters
  }, [])

  // Remove filter function that handles all date ranges
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'requestDateRange') {
      setRequestDateRange(null)
    } else if (filterId === 'startDateRange') {
      setStartDateRange(null)
    } else if (filterId === 'endDateRange') {
      setEndDateRange(null)
    } else if (filterId === 'effectiveDateRange') {
      setEffectiveDateRange(null)
    } else if (filterId === 'reimbursableAmountRange') {
      setReimbursableAmountRange(null)
    } else if (filterId === 'advanceAmountRange') {
      setAdvanceAmountRange(null)
    } else {
      setSelectedFilters(prev => prev.filter(id => id !== filterId))
    }
  }, [])

  // Enhanced setFilters function that properly handles clearing all filters
  const setFilters = useCallback((filters: string[]) => {
    // If the filters array is empty or contains only date range IDs, clear everything
    if (filters.length === 0) {
      setSelectedFilters([])
      setRequestDateRange(null)
      setStartDateRange(null)
      setEndDateRange(null)
      setEffectiveDateRange(null)
      setReimbursableAmountRange(null)
      setAdvanceAmountRange(null)
      setSearch('')
      return
    }

    const regularFilters = filters.filter(f => !EXPENSE_REQUEST_VIRTUAL_FILTER_IDS.has(f))
    const newVirtualFilterIds = new Set(filters.filter(f => EXPENSE_REQUEST_VIRTUAL_FILTER_IDS.has(f)))

    setSelectedFilters(regularFilters)

    if (!newVirtualFilterIds.has('requestDateRange')) {
      setRequestDateRange(null)
    }
    if (!newVirtualFilterIds.has('startDateRange')) {
      setStartDateRange(null)
    }
    if (!newVirtualFilterIds.has('endDateRange')) {
      setEndDateRange(null)
    }
    if (!newVirtualFilterIds.has('effectiveDateRange')) {
      setEffectiveDateRange(null)
    }
    if (!newVirtualFilterIds.has('reimbursableAmountRange')) {
      setReimbursableAmountRange(null)
    }
    if (!newVirtualFilterIds.has('advanceAmountRange')) {
      setAdvanceAmountRange(null)
    }
  }, [])

  // Clear all filters including all date ranges
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setRequestDateRange(null)
    setStartDateRange(null)
    setEndDateRange(null)
    setEffectiveDateRange(null)
    setReimbursableAmountRange(null)
    setAdvanceAmountRange(null)
    setSearch('')
  }, [])

  // Convert UI filters to API filter format
  const getFilters = useCallback((): ExpenseRequestWhereClause => {
    return buildExpenseRequestWhereConditions(
      search,
      selectedFilters,
      startDateRange,
      endDateRange,
      requestDateRange,
      effectiveDateRange,
      reimbursableAmountRange,
      advanceAmountRange
    )
  }, [
    search,
    selectedFilters,
    startDateRange,
    endDateRange,
    requestDateRange,
    effectiveDateRange,
    reimbursableAmountRange,
    advanceAmountRange
  ])

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev => {
      // Handle radio button behavior for request type filters
      if (filterId.startsWith('ExpenseRequestType:')) {
        if (selected) {
          // Remove any existing request type filters and add the new one
          const withoutRequestTypes = prev.filter(id => !id.startsWith('ExpenseRequestType:'))
          return [...withoutRequestTypes, filterId]
        } else {
          // Remove the specific request type filter
          return prev.filter(id => id !== filterId)
        }
      } else {
        // Handle regular multi-select filters
        return selected ? [...prev, filterId] : prev.filter(id => id !== filterId)
      }
    })
  }, [])

  return {
    search,
    setSearch,
    selectedFilters: getAllSelectedFilters,
    setFilters,
    handleFilterChange,
    clearFilters: clearAllFilters,
    getFilters,
    requestDateRange,
    setRequestDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    filterLabelMap,
    addFilter,
    removeFilter,
    reimbursableAmountRange,
    setReimbursableAmountRange,
    advanceAmountRange,
    setAdvanceAmountRange
  }
}
