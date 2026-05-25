import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ExpenseStatus, getExpensePlanStatusFilterLabel } from '../utils'
import dayjs from 'dayjs'
import { useDebounce } from '@/common/hooks/useDebounce'
import personalTranslations from '../_i18n'
import { expensePlanAvailableStatuses } from '../components/tabs/expense-plans-tab/config/expensePlanAvailableStatuses'
import {
  addScalarNumericRangeConditions,
  formatExpenseAmountRangeChipLabel,
  type ExpenseAmountRangeValue
} from '@/business-apps/fin/expenses/common/utils/amountRangeFilterUtils'

const PLAN_VIRTUAL_RANGE_FILTER_IDS = [
  'planDateRange',
  'startDateRange',
  'endDateRange',
  'effectiveDateRange',
  'reimbursableAmountRange',
  'paidAdvanceAmountRange'
] as const

export const useExpensePlanFilters = () => {
  const { t } = useTranslation(personalTranslations)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 200) // Reduced from 300ms for faster search response
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [startDateRange, setStartDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [endDateRange, setEndDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [planDateRange, setPlanDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [reimbursableAmountRange, setReimbursableAmountRange] = useState<ExpenseAmountRangeValue>(null)
  const [paidAdvanceAmountRange, setPaidAdvanceAmountRange] = useState<ExpenseAmountRangeValue>(null)

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
    addScalarNumericRangeConditions(conditions, reimbursableAmountRange, 'reimbursableAmount')
    addScalarNumericRangeConditions(conditions, paidAdvanceAmountRange, 'advancePaymentPaidAmount')

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
    reimbursableAmountRange,
    paidAdvanceAmountRange,
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
    if (
      reimbursableAmountRange &&
      (reimbursableAmountRange.min !== undefined || reimbursableAmountRange.max !== undefined)
    ) {
      filters.push('reimbursableAmountRange')
    }
    if (
      paidAdvanceAmountRange &&
      (paidAdvanceAmountRange.min !== undefined || paidAdvanceAmountRange.max !== undefined)
    ) {
      filters.push('paidAdvanceAmountRange')
    }

    return filters
  }, [
    selectedFilters,
    planDateRange,
    startDateRange,
    endDateRange,
    effectiveDateRange,
    reimbursableAmountRange,
    paidAdvanceAmountRange
  ])

  // Create filter label map including all active date ranges
  const filterLabelMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {}

    expensePlanAvailableStatuses.forEach(status => {
      map[status] = getExpensePlanStatusFilterLabel(status, t)
    })
    map['planType:EXPENSES'] = t('personal-expenses-label-expense')
    map['planType:TRIP'] = t('personal-expenses-label-trip')

    // Add date range labels if active
    const planDateLabel = formatDateRangeLabel(planDateRange)
    if (planDateLabel) {
      map['planDateRange'] = `${t('expense-plans-chip-prefix-plan-date')}: ${planDateLabel}`
    }

    const startDateLabel = formatDateRangeLabel(startDateRange)
    if (startDateLabel) {
      map['startDateRange'] = `${t('expense-plans-chip-prefix-start-date')}: ${startDateLabel}`
    }

    const endDateLabel = formatDateRangeLabel(endDateRange)
    if (endDateLabel) {
      map['endDateRange'] = `${t('expense-plans-chip-prefix-end-date')}: ${endDateLabel}`
    }

    const effectiveDateLabel = formatDateRangeLabel(effectiveDateRange)
    if (effectiveDateLabel) {
      map['effectiveDateRange'] = `${t('expense-plans-chip-prefix-effective-date')}: ${effectiveDateLabel}`
    }

    const reimbursableChip = formatExpenseAmountRangeChipLabel(
      reimbursableAmountRange,
      `${t('expense-items-column-reimbursable')}: `
    )
    if (reimbursableChip) {
      map['reimbursableAmountRange'] = reimbursableChip
    }

    const paidAdvanceChip = formatExpenseAmountRangeChipLabel(
      paidAdvanceAmountRange,
      `${t('expense-plans-column-paid-advance')}: `
    )
    if (paidAdvanceChip) {
      map['paidAdvanceAmountRange'] = paidAdvanceChip
    }

    // Ensure currency pills show code (if present via DataContainer currency group)
    // Currency filters are injected at table level; here we just preserve any provided labels
    return map
  }, [
    t,
    formatDateRangeLabel,
    planDateRange,
    startDateRange,
    endDateRange,
    effectiveDateRange,
    reimbursableAmountRange,
    paidAdvanceAmountRange
  ])

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
    } else if (filterId === 'reimbursableAmountRange') {
      setReimbursableAmountRange(null)
    } else if (filterId === 'paidAdvanceAmountRange') {
      setPaidAdvanceAmountRange(null)
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
      setReimbursableAmountRange(null)
      setPaidAdvanceAmountRange(null)
      setSearch('')
      return
    }

    const virtualRangeIds = new Set<string>(PLAN_VIRTUAL_RANGE_FILTER_IDS)
    const regularFilters = filters.filter(f => !virtualRangeIds.has(f))
    const newVirtualRangeFilters = new Set(filters.filter(f => virtualRangeIds.has(f)))

    setSelectedFilters(regularFilters)

    if (!newVirtualRangeFilters.has('planDateRange')) {
      setPlanDateRange(null)
    }
    if (!newVirtualRangeFilters.has('startDateRange')) {
      setStartDateRange(null)
    }
    if (!newVirtualRangeFilters.has('endDateRange')) {
      setEndDateRange(null)
    }
    if (!newVirtualRangeFilters.has('effectiveDateRange')) {
      setEffectiveDateRange(null)
    }
    if (!newVirtualRangeFilters.has('reimbursableAmountRange')) {
      setReimbursableAmountRange(null)
    }
    if (!newVirtualRangeFilters.has('paidAdvanceAmountRange')) {
      setPaidAdvanceAmountRange(null)
    }
  }, [])

  // Clear all filters including all date ranges (search is managed separately)
  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setPlanDateRange(null)
    setStartDateRange(null)
    setEndDateRange(null)
    setEffectiveDateRange(null)
    setReimbursableAmountRange(null)
    setPaidAdvanceAmountRange(null)
  }, [])

  return {
    t,
    search,
    setSearch,
    debouncedSearch,
    selectedFilters: getAllSelectedFilters, // Return the enhanced list including date ranges
    setFilters, // Use the enhanced setFilters function
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
    removeFilter, // Use the enhanced removeFilter
    reimbursableAmountRange,
    setReimbursableAmountRange,
    paidAdvanceAmountRange,
    setPaidAdvanceAmountRange
  }
}
