import React, { useState, useMemo, useCallback } from 'react'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { ExpenseStatus } from '../utils'
import { DateRangeFilter } from '../components/tabs/expense-plans-tab/filters/DateRangeFilter'
import { EndDateRangeFilter } from '../components/tabs/expense-plans-tab/filters/EndDateRangeFilter'
import PlanDateRangeFilter from '../components/tabs/expense-plans-tab/filters/PlanDateRangeFilter'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import EffectiveDateRangeFilter from '../components/tabs/expense-plans-tab/filters/EffectiveDateRangeFilter'
import { useDebounce } from '@/common/hooks/useDebounce'

export enum DataFilterType {
  CHECKBOX_GROUP = 'checkbox-group',
  DATE_RANGE = 'date-range',
  NUMBER_RANGE = 'number-range'
}

export const useExpensePlanFilters = () => {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200) // Reduced from 300ms for faster search response
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [planDateRange, setPlanDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)

  const filterGroups = useMemo<DataFilterGroup[]>(
    () => [
      {
        id: 'effectiveDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
        type: DataFilterType.DATE_RANGE,
        customComponent: React.createElement(EffectiveDateRangeFilter, {
          effectiveDateRange: effectiveDateRange,
          onDateRangeChange: setEffectiveDateRange,
          placeholder: [
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
            getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
          ]
        }),
        hideSearch: true
      },
      {
        id: 'planDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
        type: DataFilterType.DATE_RANGE,
        customComponent: React.createElement(PlanDateRangeFilter, {
          planDateRange: planDateRange,
          onDateRangeChange: setPlanDateRange,
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
        type: DataFilterType.DATE_RANGE,
        customComponent: React.createElement(DateRangeFilter, {
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
        type: DataFilterType.DATE_RANGE,
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
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        type: DataFilterType.CHECKBOX_GROUP,
        filters: [
          {
            id: ExpenseStatus.PREPARED,
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
            selected: selectedFilters.includes(ExpenseStatus.PREPARED)
          },
          {
            id: ExpenseStatus.CREATED,
            label: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.created', 'Created')})`,
            selected: selectedFilters.includes(ExpenseStatus.CREATED)
          },
          {
            id: ExpenseStatus.PENDING,
            label: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.pending', 'Pending')})`,
            selected: selectedFilters.includes(ExpenseStatus.PENDING)
          },
          {
            id: ExpenseStatus.ASSIGNED,
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
            selected: selectedFilters.includes(ExpenseStatus.ASSIGNED)
          },
          {
            id: ExpenseStatus.APPROVED,
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved'),
            selected: selectedFilters.includes(ExpenseStatus.APPROVED)
          },
          {
            id: ExpenseStatus.REJECTED,
            label: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected')})`,
            selected: selectedFilters.includes(ExpenseStatus.REJECTED)
          },
          {
            id: ExpenseStatus.VERIFIED,
            label: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.verified', 'Verified')})`,
            selected: selectedFilters.includes(ExpenseStatus.VERIFIED)
          },
          {
            id: ExpenseStatus.BOOKED,
            label: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booked', 'Booked')})`,
            selected: selectedFilters.includes(ExpenseStatus.BOOKED)
          },
          {
            id: ExpenseStatus.PAID,
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
            selected: selectedFilters.includes(ExpenseStatus.PAID)
          },
          {
            id: ExpenseStatus.CLOSED,
            label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed'),
            selected: selectedFilters.includes(ExpenseStatus.CLOSED)
          },
          {
            id: ExpenseStatus.TRANSFERRED,
            label: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred')})`,
            selected: selectedFilters.includes(ExpenseStatus.TRANSFERRED)
          }
        ]
      },
      {
        id: 'planType',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
        type: DataFilterType.CHECKBOX_GROUP,
        filters: [
          {
            id: 'planType:EXPENSES',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense'),
            selected: selectedFilters.includes('planType:EXPENSES')
          },
          {
            id: 'planType:TRIP',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip'),
            selected: selectedFilters.includes('planType:TRIP')
          }
        ]
      }
    ],
    [selectedFilters, startDateRange, endDateRange, planDateRange, effectiveDateRange]
  )

  // Helper function to format date for start of range (beginning of day)
  const formatStartDate = useCallback((date: Date): string => {
    return dayjs(date).startOf('day').format('YYYY-MM-DD HH:mm:ss')
  }, [])

  // Helper function to format date for end of range (end of day)
  const formatEndDate = useCallback((date: Date): string => {
    return dayjs(date).endOf('day').format('YYYY-MM-DD HH:mm:ss')
  }, [])

  // Helper function to add search filter conditions
  const addSearchConditions = useCallback((conditions: any[], searchTerm: string): void => {
    if (searchTerm) {
      conditions.push({
        _or: [{ code: { _ilike: `%${searchTerm}%` } }, { title: { _ilike: `%${searchTerm}%` } }]
      })
    }
  }, [])

  // Helper function to add status filter conditions
  const addStatusConditions = useCallback((conditions: any[], filters: string[]): void => {
    const statusFilters = filters.filter(f => (Object.values(ExpenseStatus) as string[]).includes(f))
    if (statusFilters.length > 0) {
      conditions.push({ status: { _in: statusFilters } })
    }
  }, [])

  // Helper function to add plan type filter conditions
  const addPlanTypeConditions = useCallback((conditions: any[], filters: string[]): void => {
    const planTypeTokens = filters.filter(f => f.startsWith('planType:'))
    if (planTypeTokens.length > 0) {
      const allowedTypes = planTypeTokens.map(t => t.split(':')[1]).filter(t => t === 'EXPENSES' || t === 'TRIP')

      if (allowedTypes.length > 0) {
        const typeOr = allowedTypes.map(t => ({ requestTypeRef: { _eq: `ExpenseRequestType:v1:${t}` } }))
        conditions.push({ _or: typeOr })
      }
    }
  }, [])

  // Helper function to add date range conditions
  const addDateRangeConditions = useCallback(
    (
      conditions: any[],
      dateRange: [Date | null, Date | null] | null,
      fieldName: 'planDate' | 'startDate' | 'endDate'
    ): void => {
      if (dateRange?.[0]) {
        conditions.push({ [fieldName]: { _gte: formatStartDate(dateRange[0]) } })
      }
      if (dateRange?.[1]) {
        conditions.push({ [fieldName]: { _lte: formatEndDate(dateRange[1]) } })
      }
    },
    [formatStartDate, formatEndDate]
  )

  // Helper function to add effective date range conditions
  const addEffectiveDateConditions = useCallback(
    (conditions: any[], effectiveDateRange: [Date | null, Date | null] | null): void => {
      if (!effectiveDateRange?.[0] && !effectiveDateRange?.[1]) {
        return
      }

      const start = effectiveDateRange?.[0] ? formatStartDate(effectiveDateRange[0]) : undefined
      const end = effectiveDateRange?.[1] ? formatEndDate(effectiveDateRange[1]) : undefined
      const tripAnd = [] as any[]
      const expenseAnd = [] as any[]

      if (start) {
        tripAnd.push({ startDate: { _gte: start } })
        expenseAnd.push({ expensePlanItem: { expenseDate: { _gte: start } } })
      }
      if (end) {
        tripAnd.push({ startDate: { _lte: end } })
        expenseAnd.push({ expensePlanItem: { expenseDate: { _lte: end } } })
      }

      if (tripAnd.length > 0 || expenseAnd.length > 0) {
        conditions.push({
          _or: [
            { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:TRIP' } }, ...tripAnd] },
            { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:EXPENSES' } }, ...expenseAnd] }
          ]
        })
      }
    },
    [formatStartDate, formatEndDate]
  )
  const getFilters = useCallback(() => {
    const conditions: any[] = []

    addSearchConditions(conditions, debouncedSearch)
    addStatusConditions(conditions, selectedFilters)
    addPlanTypeConditions(conditions, selectedFilters)

    if (selectedFilters.includes('top-destination')) {
      conditions.push({ status: { _neq: 'DISCARDED' } })
    }

    // Process all date ranges independently with proper formatting
    addDateRangeConditions(conditions, planDateRange, 'planDate')
    addDateRangeConditions(conditions, startDateRange, 'startDate')
    addDateRangeConditions(conditions, endDateRange, 'endDate')
    addEffectiveDateConditions(conditions, effectiveDateRange)

    // Always exclude DISCARDED plans at backend level for correct pagination
    conditions.push({ status: { _neq: ExpenseStatus.DISCARDED } })
    return { _and: conditions.length > 0 ? conditions : [{}] }
  }, [
    debouncedSearch,
    selectedFilters,
    planDateRange,
    startDateRange,
    endDateRange,
    effectiveDateRange,
    addSearchConditions,
    addStatusConditions,
    addPlanTypeConditions,
    addDateRangeConditions,
    addEffectiveDateConditions
  ])

  const handleFilterChange = useCallback((filterId: string, selected: boolean) => {
    setSelectedFilters(prev => (selected ? [...prev, filterId] : prev.filter(id => id !== filterId)))
  }, [])

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

  // Get all selected filters including active date ranges
  const getAllSelectedFilters = useMemo(() => {
    const filters = [...selectedFilters] // Use the original state

    // Add date ranges as filters if they're active
    if (planDateRange && (planDateRange[0] || planDateRange[1])) {
      filters.push('planDateRange')
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
  }, [selectedFilters, planDateRange, startDateRange, endDateRange, effectiveDateRange])

  // Create filter label map including all active date ranges
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

    // Add date range labels if active
    const planDateLabel = formatDateRangeLabel(planDateRange)
    if (planDateLabel) {
      map['planDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date')}: ${planDateLabel}`
    }

    const startDateLabel = formatDateRangeLabel(startDateRange)
    if (startDateLabel) {
      map['startDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date')}: ${startDateLabel}`
    }

    const endDateLabel = formatDateRangeLabel(endDateRange)
    if (endDateLabel) {
      map['endDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date')}: ${endDateLabel}`
    }

    const effectiveDateLabel = formatDateRangeLabel(effectiveDateRange)
    if (effectiveDateLabel) {
      map['effectiveDateRange'] =
        `${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date')}: ${effectiveDateLabel}`
    }

    // Ensure currency pills show code (if present via DataContainer currency group)
    // Currency filters are injected at table level; here we just preserve any provided labels
    return map
  }, [filterGroups, formatDateRangeLabel, planDateRange, startDateRange, endDateRange, effectiveDateRange])

  // Remove filter function that handles all date ranges
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'planDateRange') {
      setPlanDateRange(null)
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
      setPlanDateRange(null)
      setStartDateRange(null)
      setEndDateRange(null)
      setEffectiveDateRange(null)
      setSearch('')
      return
    }

    // Separate date range filters from regular filters
    const dateRangeFilters = ['planDateRange', 'startDateRange', 'endDateRange', 'effectiveDateRange']
    const regularFilters = filters.filter(f => !dateRangeFilters.includes(f))
    const newDateRangeFilters = filters.filter(f => dateRangeFilters.includes(f))

    // Set regular filters
    setSelectedFilters(regularFilters)

    // Clear date ranges that are not in the new filter list
    if (!newDateRangeFilters.includes('planDateRange')) {
      setPlanDateRange(null)
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

  // Clear all filters including all date ranges (search is managed separately)
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setPlanDateRange(null)
    setStartDateRange(null)
    setEndDateRange(null)
    setEffectiveDateRange(null)
  }, [])

  return {
    search,
    setSearch,
    debouncedSearch,
    selectedFilters: getAllSelectedFilters, // Return the enhanced list including date ranges
    setFilters, // Use the enhanced setFilters function
    filterGroups,
    filterLabelMap,
    handleFilterChange,
    clearFilters: clearAllFilters,
    getFilters,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    planDateRange,
    setPlanDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    addFilter: handleFilterChange, // Add this for compatibility
    removeFilter // Use the enhanced removeFilter
  }
}
