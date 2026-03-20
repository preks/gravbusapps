import React, { useState, useCallback, useMemo } from 'react'
import { ExpenseStatus, getExpenseRequestStatusDisplay } from '../utils'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { StartDateRangeFilter } from '../components/tabs/expense-requests-tab/StartDateRangeFilter'
import { EndDateRangeFilter } from '../components/tabs/expense-requests-tab/EndDateRangeFilter'
import RequestDateRangeFilter from '../components/tabs/expense-requests-tab/RequestDateRangeFilter'
import dayjs from 'dayjs'

// Define expense request status types based on srn_expenseRequest mappings
export enum ExpenseRequestStatus {
  PREPARED = 'PREPARED',
  CREATED = 'CREATED',
  ASSIGNED = 'ASSIGNED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  VERIFIED = 'VERIFIED',
  BOOKED = 'BOOKED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
  TRANSFERRED = 'TRANSFERRED'
}

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

// Interface for GraphQL where clause structure
export interface ExpenseRequestWhereClause {
  _and?: Array<{
    _or?: Array<{
      code?: { _ilike: string }
      title?: { _ilike: string }
    }>
    status?: {
      _in?: string[]
      _neq?: string
    }
    currencyRef?: {
      _eq?: string
    }
    currency?: {
      code?: {
        _eq?: string
      }
    }
    startDate?: {
      _gte?: string
      _lte?: string
    }
    endDate?: {
      _gte?: string
      _lte?: string
    }
    requestDate?: {
      _gte?: string
      _lte?: string
    }
    requestTypeRef?: {
      _eq?: string
    }
  }>
}

// Interface for the return type of useExpenseRequestFilters
export interface UseExpenseRequestFiltersReturn {
  search: string
  setSearch: (search: string) => void
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  filterGroups: DataFilterGroup[]
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
}

/**
 * Hook to manage filter selection for expense requests
 */
export const useExpenseRequestFilters = (): UseExpenseRequestFiltersReturn => {
  // State for search and selected filters
  const [search, setSearch] = useState<string>('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)

  // Define these as constants for stable references
  // const TIME_PERIOD_OPTIONS = ['last30days', 'last90days', 'last180days'];

  // Helper function to get status display name with backend status in parentheses only when different
  const getStatusDisplayName = (status: string): string => {
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
  }

  // Define filter groups - memoized so they don't cause re-renders
  const filterGroups = useMemo<DataFilterGroup[]>(
    () => [
      {
        id: 'effectiveDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
        type: 'date-range' as any,
        customComponent: React.createElement(RequestDateRangeFilter, {
          requestDateRange: effectiveDateRange as any,
          onDateRangeChange: setEffectiveDateRange,
          placeholder: [
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
          ],
          isEffectiveDateRange: true
        }),
        hideSearch: true
      },
      {
        id: 'requestDateRange',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:confirm_transfer_advance_payment.request_date_label',
          'Request Date'
        ),
        type: 'date-range' as any,
        customComponent: React.createElement(RequestDateRangeFilter, {
          requestDateRange: requestDateRange,
          onDateRangeChange: setRequestDateRange,
          placeholder: [
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
          ]
        }),
        hideSearch: true
      },
      {
        id: 'startDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
        type: 'date-range' as any,
        customComponent: React.createElement(StartDateRangeFilter, {
          startDateRange: startDateRange,
          onDateRangeChange: setStartDateRange,
          placeholder: [
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
          ]
        }),
        hideSearch: true
      },
      {
        id: 'endDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
        type: 'date-range' as any,
        customComponent: React.createElement(EndDateRangeFilter, {
          endDateRange: endDateRange,
          onDateRangeChange: setEndDateRange,
          placeholder: [
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
          ]
        }),
        hideSearch: true
      },
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.status',
          'Status'
        ),
        filters: Object.values(ExpenseRequestStatus).map(status => {
          const id = status
          return {
            id,
            label: getStatusDisplayName(status),
            selected: selectedFilters.includes(id)
          }
        })
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
            selected: selectedFilters.includes('ExpenseRequestType:v1:EXPENSES')
          },
          {
            id: 'ExpenseRequestType:v1:TRIP',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip'),
            selected: selectedFilters.includes('ExpenseRequestType:v1:TRIP')
          }
        ]
      }
    ],
    [selectedFilters, startDateRange, endDateRange, requestDateRange, effectiveDateRange]
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
    Object.values(ExpenseRequestStatus).forEach(status => {
      labelMap[status] = getStatusDisplayName(status)
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

    return labelMap
  }, [getStatusDisplayName, formatDateRangeLabel, requestDateRange, startDateRange, endDateRange, effectiveDateRange])

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

    return filters
  }, [selectedFilters, requestDateRange, startDateRange, endDateRange, effectiveDateRange])

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
      setSearch('')
      return
    }

    // Separate date range filters from regular filters
    const dateRangeFilters = ['requestDateRange', 'startDateRange', 'endDateRange', 'effectiveDateRange']
    const regularFilters = filters.filter(f => !dateRangeFilters.includes(f))
    const newDateRangeFilters = filters.filter(f => dateRangeFilters.includes(f))

    // Set regular filters
    setSelectedFilters(regularFilters)

    // Clear date ranges that are not in the new filter list
    if (!newDateRangeFilters.includes('requestDateRange')) {
      setRequestDateRange(null)
    }
    if (!newDateRangeFilters.includes('startDateRange')) {
      setStartDateRange(null)
    }
    if (!newDateRangeFilters.includes('endDateRange')) {
      setEndDateRange(null)
    }
    if (!newDateRangeFilters.includes('effectiveDateRange')) {
      setEffectiveDateRange(null)
    }
  }, [])

  // Clear all filters including all date ranges
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setRequestDateRange(null)
    setStartDateRange(null)
    setEndDateRange(null)
    setEffectiveDateRange(null)
    setSearch('')
  }, [])

  // Convert UI filters to API filter format
  const getFilters = useCallback((): ExpenseRequestWhereClause => {
    const conditions: any[] = []

    // Helper function to format date for start of range (beginning of day)
    const formatStartDate = (date: Date): string => {
      return dayjs(date).startOf('day').format('YYYY-MM-DD HH:mm:ss')
    }

    // Helper function to format date for end of range (end of day)
    const formatEndDate = (date: Date): string => {
      return dayjs(date).endOf('day').format('YYYY-MM-DD HH:mm:ss')
    }

    if (search && typeof search === 'string' && search.trim()) {
      conditions.push({
        _or: [{ code: { _ilike: `%${search.trim()}%` } }, { title: { _ilike: `%${search.trim()}%` } }]
      })
    }
    // Separate status filters from request type filters
    const statusFilters = selectedFilters.filter(filter =>
      Object.values(ExpenseRequestStatus).includes(filter as ExpenseRequestStatus)
    )
    const requestTypeFilters = selectedFilters.filter(filter => filter.startsWith('ExpenseRequestType:'))

    if (statusFilters.length > 0) {
      conditions.push({ status: { _in: statusFilters } })
    }

    if (requestTypeFilters.length > 0) {
      // For request type, we need to use the correct GraphQL structure
      // The requestType field is a catalog entry, so we filter by the catalog entry ID
      // Use requestTypeRef which is the correct field name in the GraphQL schema
      conditions.push({ requestTypeRef: { _eq: requestTypeFilters[0] } })
    }
    if (startDateRange?.[0]) {
      conditions.push({ startDate: { _gte: formatStartDate(startDateRange[0]) } })
    }
    if (startDateRange?.[1]) {
      conditions.push({ startDate: { _lte: formatEndDate(startDateRange[1]) } })
    }
    if (endDateRange?.[0]) {
      conditions.push({ endDate: { _gte: formatStartDate(endDateRange[0]) } })
    }
    if (endDateRange?.[1]) {
      conditions.push({ endDate: { _lte: formatEndDate(endDateRange[1]) } })
    }
    if (requestDateRange?.[0]) {
      conditions.push({ requestDate: { _gte: formatStartDate(requestDateRange[0]) } })
    }
    if (requestDateRange?.[1]) {
      conditions.push({ requestDate: { _lte: formatEndDate(requestDateRange[1]) } })
    }

    // Effective Date: EXPENSES -> expenseItem.expenseDate, TRIP -> startDate
    if (effectiveDateRange?.[0] || effectiveDateRange?.[1]) {
      const start = effectiveDateRange?.[0] ? formatStartDate(effectiveDateRange[0]) : undefined
      const end = effectiveDateRange?.[1] ? formatEndDate(effectiveDateRange[1]) : undefined
      const tripAnd: any[] = []
      const expenseAnd: any[] = []
      if (start) {
        tripAnd.push({ startDate: { _gte: start } })
        expenseAnd.push({ expenseItem: { expenseDate: { _gte: start } } })
      }
      if (end) {
        tripAnd.push({ startDate: { _lte: end } })
        expenseAnd.push({ expenseItem: { expenseDate: { _lte: end } } })
      }
      conditions.push({
        _or: [
          { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:TRIP' } }, ...tripAnd] },
          { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:EXPENSES' } }, ...expenseAnd] }
        ]
      })
    }

    // Always exclude DISCARDED requests at backend level for correct pagination
    conditions.push({ status: { _neq: ExpenseStatus.DISCARDED } })

    const result = { _and: conditions.length > 0 ? conditions : [{}] }
    return result
  }, [search, selectedFilters, startDateRange, endDateRange, requestDateRange, effectiveDateRange])

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
    filterGroups,
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
    removeFilter
  }
}
