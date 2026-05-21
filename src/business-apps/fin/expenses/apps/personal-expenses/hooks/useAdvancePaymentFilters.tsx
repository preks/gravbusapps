import { useState, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useTranslation } from '@newwork/nw-design-system'
import { ExpenseStatus, getAdvancePaymentStatusDisplayT, statusFilterMainWithOptionalParen } from '../utils'
import personalTranslations from '../_i18n'
import { getTranslatedMonthName } from '../utils/monthTranslationUtils'
import {
  ADVANCE_PAYMENT_SIDEBAR_FILTER_STATUSES,
  TOTAL_PAYMENTS_CARD_STATUSES
} from '../utils/totalPaymentsCardStatuses'

export interface UseAdvancePaymentFiltersReturn {
  searchTerm: string
  setSearchTerm: (term: string) => void
  debouncedSearchTerm: string
  statusFilter: string[]
  setStatusFilter: (status: string[]) => void
  amountRange: { min?: number; max?: number } | null
  setAmountRange: (range: { min?: number; max?: number } | null) => void
  advanceRange: { min?: number; max?: number } | null
  setAdvanceRange: (range: { min?: number; max?: number } | null) => void
  /** Current-month createdAt window from statistics cards (not in sidebar). */
  cardCreatedAtRange: { gte: string; lte: string } | null
  setCardCreatedAtRange: (range: { gte: string; lte: string } | null) => void
  applyStatisticsCardFilter: (widgetKey: string | null) => void
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  filterLabelMap: Record<string, string>
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  removeFilter: (filterId: string) => void
  clearFilters: () => void
  filtersVersion: number
}

function buildAdvancePaymentStatusDisplayMap(t: (key: string) => string): Partial<Record<ExpenseStatus, string>> {
  return {
    [ExpenseStatus.PREPARED]: t('expense-status-prepared'),
    [ExpenseStatus.CREATED]: statusFilterMainWithOptionalParen(t('expense-status-draft'), t('expense-status-created')),
    [ExpenseStatus.PENDING]: statusFilterMainWithOptionalParen(
      t('expense-status-in-approval'),
      t('expense-status-pending')
    ),
    [ExpenseStatus.APPROVED]: statusFilterMainWithOptionalParen(
      t('expense-status-in-transit'),
      t('expense-status-approved')
    ),
    [ExpenseStatus.RETURNED]: statusFilterMainWithOptionalParen(
      t('expense-status-in-transit'),
      t('expense-status-returned')
    ),
    [ExpenseStatus.REJECTED]: statusFilterMainWithOptionalParen(
      t('expense-status-revision-required'),
      t('expense-status-rejected')
    ),
    [ExpenseStatus.VERIFIED]: statusFilterMainWithOptionalParen(
      t('expense-status-in-transit'),
      t('expense-status-verified')
    ),
    [ExpenseStatus.BOOKED]: statusFilterMainWithOptionalParen(
      t('expense-status-in-transit'),
      t('expense-status-booked')
    ),
    [ExpenseStatus.PAID]: t('expense-status-paid'),
    [ExpenseStatus.TRANSFERRED]: statusFilterMainWithOptionalParen(
      t('expense-status-in-transit'),
      t('expense-status-transferred')
    )
  }
}

/** Matches GET_ADVANCE_PAYMENT_STATISTICS_CONSOLIDATED Current / Approved aggregates */
const STATISTICS_APPROVED_LIKE_STATUSES: string[] = ['APPROVED', 'PAID', 'BOOKED']
/** Matches PendingAdvancePayments aggregate */
const STATISTICS_PENDING_STATUSES: string[] = ['PENDING', 'PREPARED']

const ADVANCE_PAYMENT_RANGE_FILTER_IDS = new Set<string>(['amountRange', 'advanceRange', 'cardCreatedAtRange'])

export const useAdvancePaymentFilters = (): UseAdvancePaymentFiltersReturn => {
  const { t } = useTranslation(personalTranslations)
  const statusDisplayMap = useMemo(() => buildAdvancePaymentStatusDisplayMap(t), [t])
  const [searchTerm, setSearchTerm] = useState<string>('')
  // Active prefiltering: Start with PREPARED and PENDING statuses
  const [statusFilter, setStatusFilter] = useState<string[]>([ExpenseStatus.PREPARED, ExpenseStatus.PENDING])
  const [amountRange, setAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [advanceRange, setAdvanceRange] = useState<{ min?: number; max?: number } | null>(null)
  const [cardCreatedAtRange, setCardCreatedAtRange] = useState<{ gte: string; lte: string } | null>(null)
  // Track currency filter tokens separately to avoid polluting statusFilter
  const [currencyTokens, setCurrencyTokens] = useState<string[]>([])
  // Version to signal any change to consumers (for refresh triggers)
  const [filtersVersion, setFiltersVersion] = useState<number>(0)

  // Wrapped setters to bump version
  const commitSearchTerm = useCallback((term: string) => {
    setSearchTerm(term)
    setFiltersVersion(v => v + 1)
  }, [])

  const commitAmountRange = useCallback((range: { min?: number; max?: number } | null) => {
    setAmountRange(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const commitAdvanceRange = useCallback((range: { min?: number; max?: number } | null) => {
    setAdvanceRange(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const commitCardCreatedAtRange = useCallback((range: { gte: string; lte: string } | null) => {
    setCardCreatedAtRange(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const applyStatisticsCardFilter = useCallback((widgetKey: string | null) => {
    if (widgetKey === null || widgetKey === '') {
      // Second card click: clear all filters except currency (currency is applied separately via setFilters in the tab)
      setStatusFilter([])
      setCardCreatedAtRange(null)
      setSearchTerm('')
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'total-payments') {
      const gte = dayjs().startOf('month').toISOString()
      const lte = dayjs().endOf('month').toISOString()
      setStatusFilter([...TOTAL_PAYMENTS_CARD_STATUSES])
      setCardCreatedAtRange({ gte, lte })
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'total-amount') {
      const gte = dayjs().startOf('month').toISOString()
      const lte = dayjs().endOf('month').toISOString()
      setStatusFilter([...STATISTICS_APPROVED_LIKE_STATUSES])
      setCardCreatedAtRange({ gte, lte })
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'pending-payments') {
      setStatusFilter([...STATISTICS_PENDING_STATUSES])
      setCardCreatedAtRange(null)
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'approved-payments') {
      setStatusFilter([...STATISTICS_APPROVED_LIKE_STATUSES])
      setCardCreatedAtRange(null)
      setFiltersVersion(v => v + 1)
    }
  }, [])

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Determine which filter group this belongs to
    if (filterId.startsWith('status-')) {
      setCardCreatedAtRange(null)
      const status = filterId.replace('status-', '')
      setStatusFilter(prevFilter => {
        if (isSelected) {
          if (!prevFilter.includes(status)) {
            return [...prevFilter, status]
          }
          return prevFilter
        } else {
          return prevFilter.filter(s => s !== status)
        }
      })
      setFiltersVersion(v => v + 1)
    }
    // Note: Amount and advance ranges are now handled by custom components
  }, [])

  // Helper function to format range for display
  const formatRangeLabel = useCallback((range: { min?: number; max?: number } | null, prefix: string): string => {
    if (!range || (range.min === undefined && range.max === undefined)) return ''

    if (range.min !== undefined && range.max !== undefined) {
      return `${prefix}: ${range.min} - ${range.max}`
    } else if (range.min !== undefined) {
      return `${prefix}: ≥${range.min}`
    } else if (range.max !== undefined) {
      return `${prefix}: ≤${range.max}`
    }

    return ''
  }, [])

  // Get all selected filters including active ranges
  const getAllSelectedFilters = useMemo(() => {
    // Combine status filters, currency tokens and active range markers
    const filters = [...statusFilter, ...currencyTokens]

    // Add range filters if they're active
    if (amountRange && (amountRange.min !== undefined || amountRange.max !== undefined)) {
      filters.push('amountRange')
    }
    if (advanceRange && (advanceRange.min !== undefined || advanceRange.max !== undefined)) {
      filters.push('advanceRange')
    }
    if (cardCreatedAtRange?.gte && cardCreatedAtRange?.lte) {
      filters.push('cardCreatedAtRange')
    }

    return filters
  }, [statusFilter, currencyTokens, amountRange, advanceRange, cardCreatedAtRange])

  // Single source of truth: one label per status (raw value as key). Used by DataDisplay filter options and by pills.
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}

    ADVANCE_PAYMENT_SIDEBAR_FILTER_STATUSES.forEach(status => {
      const displayLabel = statusDisplayMap[status] || getAdvancePaymentStatusDisplayT(t, status).label
      map[status] = displayLabel
    })

    // Add range labels if active
    const amountLabel = formatRangeLabel(amountRange, t('personal-expenses-column-amount'))
    if (amountLabel) {
      map['amountRange'] = amountLabel
    }

    const advanceLabel = formatRangeLabel(advanceRange, t('personal-expenses-column-advance-payment'))
    if (advanceLabel) {
      map['advanceRange'] = advanceLabel
    }

    if (cardCreatedAtRange?.gte) {
      const d = new Date(cardCreatedAtRange.gte)
      const month = getTranslatedMonthName(d, t)
      const year = d.getFullYear()
      // Value only (toolbar chip pairs this with filter label "Created in" from filter config)
      map['cardCreatedAtRange'] = `${month} ${year}`
    }

    return map
  }, [amountRange, advanceRange, cardCreatedAtRange, formatRangeLabel, statusDisplayMap, t])

  // Enhanced setFilters function that properly handles clearing all filters
  const setFilters = useCallback((filters: string[]) => {
    // If the filters array is empty, clear everything including ranges
    if (filters.length === 0) {
      setStatusFilter([])
      setAmountRange(null)
      setAdvanceRange(null)
      setCardCreatedAtRange(null)
      setSearchTerm('')
      setCurrencyTokens([])
      setFiltersVersion(v => v + 1)
      return
    }

    // Separate range filters, currency tokens and status filters
    const currencyFilterTokens = filters.filter(f => f.startsWith('currency:'))
    const statusFilters = filters.filter(f => !ADVANCE_PAYMENT_RANGE_FILTER_IDS.has(f) && !f.startsWith('currency:'))
    const newRangeFilterIds = new Set(filters.filter(f => ADVANCE_PAYMENT_RANGE_FILTER_IDS.has(f)))

    // Set status filters
    setStatusFilter(statusFilters)
    // Set currency tokens (enforce single selection upstream if desired)
    setCurrencyTokens(currencyFilterTokens)

    // Clear ranges that are not in the new filter list
    if (!newRangeFilterIds.has('amountRange')) {
      setAmountRange(null)
    }
    if (!newRangeFilterIds.has('advanceRange')) {
      setAdvanceRange(null)
    }
    if (!newRangeFilterIds.has('cardCreatedAtRange')) {
      setCardCreatedAtRange(null)
    }
    setFiltersVersion(v => v + 1)
  }, [])

  // Remove filter function that handles all filter types
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'amountRange') {
      setAmountRange(null)
    } else if (filterId === 'advanceRange') {
      setAdvanceRange(null)
    } else if (filterId === 'cardCreatedAtRange') {
      setCardCreatedAtRange(null)
    } else if (filterId.startsWith('currency:')) {
      setCurrencyTokens(prev => prev.filter(id => id !== filterId))
    } else {
      setStatusFilter(prev => prev.filter(id => id !== filterId))
    }
    setFiltersVersion(v => v + 1)
  }, [])

  // Clear all filters including ranges and search
  const clearFilters = useCallback(() => {
    setStatusFilter([])
    setAmountRange(null)
    setAdvanceRange(null)
    setCardCreatedAtRange(null)
    commitSearchTerm('')
    setCurrencyTokens([])
    setFiltersVersion(v => v + 1)
  }, [commitSearchTerm])

  return {
    searchTerm,
    setSearchTerm: commitSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    amountRange,
    setAmountRange: commitAmountRange,
    advanceRange,
    setAdvanceRange: commitAdvanceRange,
    cardCreatedAtRange,
    setCardCreatedAtRange: commitCardCreatedAtRange,
    applyStatisticsCardFilter,
    handleDataFilterChange,
    filterLabelMap,
    selectedFilters: getAllSelectedFilters,
    setFilters,
    removeFilter,
    clearFilters,
    filtersVersion
  }
}
