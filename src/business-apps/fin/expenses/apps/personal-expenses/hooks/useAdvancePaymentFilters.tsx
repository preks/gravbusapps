import { useState, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter'
import { useDebounce } from '@/common/hooks/useDebounce'
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../utils'
import { ExpenseAmountRangeFilter } from '@/business-apps/fin/expenses/common/components/filters/ExpenseAmountRangeFilter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
  filterGroups: DataFilterGroup[]
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  filterLabelMap: Record<string, string>
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  removeFilter: (filterId: string) => void
  clearFilters: () => void
  filtersVersion: number
}

// Map of status to display label - using exact same labels as the table
const STATUS_DISPLAY_MAP: Partial<Record<ExpenseStatus, string>> = {
  [ExpenseStatus.PREPARED]: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
  [ExpenseStatus.CREATED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.created', 'Created')})`,
  [ExpenseStatus.PENDING]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.pending', 'Pending')})`,
  [ExpenseStatus.APPROVED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved')})`,
  [ExpenseStatus.RETURNED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.returned', 'Returned')})`,
  [ExpenseStatus.REJECTED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected')})`,
  [ExpenseStatus.VERIFIED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.verified', 'Verified')})`,
  [ExpenseStatus.BOOKED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booked', 'Booked')})`,
  [ExpenseStatus.PAID]: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
  [ExpenseStatus.TRANSFERRED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred')})`
}

/** Matches GET_ADVANCE_PAYMENT_STATISTICS_CONSOLIDATED Current / Approved aggregates */
const STATISTICS_APPROVED_LIKE_STATUSES: string[] = ['APPROVED', 'PAID', 'BOOKED']
/** Matches PendingAdvancePayments aggregate */
const STATISTICS_PENDING_STATUSES: string[] = ['PENDING', 'PREPARED']

const ADVANCE_PAYMENT_RANGE_FILTER_IDS = new Set<string>(['amountRange', 'advanceRange', 'cardCreatedAtRange'])

export const useAdvancePaymentFilters = (): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, setSearchTermState] = useState<string>('')
  // Active prefiltering: Start with PREPARED and PENDING statuses
  const [statusFilter, setStatusFilter] = useState<string[]>([ExpenseStatus.PREPARED, ExpenseStatus.PENDING])
  const [amountRange, setAmountRangeState] = useState<{ min?: number; max?: number } | null>(null)
  const [advanceRange, setAdvanceRangeState] = useState<{ min?: number; max?: number } | null>(null)
  const [cardCreatedAtRange, setCardCreatedAtRangeState] = useState<{ gte: string; lte: string } | null>(null)
  // Track currency filter tokens separately to avoid polluting statusFilter
  const [currencyTokens, setCurrencyTokens] = useState<string[]>([])
  // Version to signal any change to consumers (for refresh triggers)
  const [filtersVersion, setFiltersVersion] = useState<number>(0)

  // Wrapped setters to bump version
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term)
    setFiltersVersion(v => v + 1)
  }, [])

  const setAmountRange = useCallback((range: { min?: number; max?: number } | null) => {
    setAmountRangeState(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const setAdvanceRange = useCallback((range: { min?: number; max?: number } | null) => {
    setAdvanceRangeState(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const setCardCreatedAtRange = useCallback((range: { gte: string; lte: string } | null) => {
    setCardCreatedAtRangeState(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const applyStatisticsCardFilter = useCallback((widgetKey: string | null) => {
    if (widgetKey === null || widgetKey === '') {
      // Second card click: clear all filters except currency (currency is applied separately via setFilters in the tab)
      setStatusFilter([])
      setCardCreatedAtRangeState(null)
      setSearchTermState('')
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'total-payments') {
      const gte = dayjs().startOf('month').toISOString()
      const lte = dayjs().endOf('month').toISOString()
      setStatusFilter([...TOTAL_PAYMENTS_CARD_STATUSES])
      setCardCreatedAtRangeState({ gte, lte })
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'total-amount') {
      const gte = dayjs().startOf('month').toISOString()
      const lte = dayjs().endOf('month').toISOString()
      setStatusFilter([...STATISTICS_APPROVED_LIKE_STATUSES])
      setCardCreatedAtRangeState({ gte, lte })
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'pending-payments') {
      setStatusFilter([...STATISTICS_PENDING_STATUSES])
      setCardCreatedAtRangeState(null)
      setFiltersVersion(v => v + 1)
      return
    }
    if (widgetKey === 'approved-payments') {
      setStatusFilter([...STATISTICS_APPROVED_LIKE_STATUSES])
      setCardCreatedAtRangeState(null)
      setFiltersVersion(v => v + 1)
    }
  }, [])

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Determine which filter group this belongs to
    if (filterId.startsWith('status-')) {
      setCardCreatedAtRangeState(null)
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
      const displayLabel = STATUS_DISPLAY_MAP[status] || getAdvancePaymentStatusDisplay(status).label
      map[status] = displayLabel
    })

    // Add range labels if active
    const amountLabel = formatRangeLabel(amountRange, 'Amount')
    if (amountLabel) {
      map['amountRange'] = amountLabel
    }

    const advanceLabel = formatRangeLabel(advanceRange, 'Advance')
    if (advanceLabel) {
      map['advanceRange'] = advanceLabel
    }

    if (cardCreatedAtRange?.gte) {
      const d = new Date(cardCreatedAtRange.gte)
      const month = getTranslatedMonthName(d)
      const year = d.getFullYear()
      // Value only (toolbar chip pairs this with filter label "Created in" from filter config)
      map['cardCreatedAtRange'] = `${month} ${year}`
    }

    return map
  }, [amountRange, advanceRange, cardCreatedAtRange, formatRangeLabel])

  // Enhanced setFilters function that properly handles clearing all filters
  const setFilters = useCallback((filters: string[]) => {
    // If the filters array is empty, clear everything including ranges
    if (filters.length === 0) {
      setStatusFilter([])
      setAmountRangeState(null)
      setAdvanceRangeState(null)
      setCardCreatedAtRangeState(null)
      setSearchTermState('')
      setCurrencyTokens([])
      setFiltersVersion(v => v + 1)
      return
    }

    // Separate range filters, currency tokens and status filters
    const currencyFilterTokens = filters.filter(f => f.startsWith('currency:'))
    const statusFilters = filters.filter(f => !ADVANCE_PAYMENT_RANGE_FILTER_IDS.has(f) && !f.startsWith('currency:'))
    const newRangeFilters = filters.filter(f => ADVANCE_PAYMENT_RANGE_FILTER_IDS.has(f))

    // Set status filters
    setStatusFilter(statusFilters)
    // Set currency tokens (enforce single selection upstream if desired)
    setCurrencyTokens(currencyFilterTokens)

    // Clear ranges that are not in the new filter list
    if (!newRangeFilters.includes('amountRange')) {
      setAmountRangeState(null)
    }
    if (!newRangeFilters.includes('advanceRange')) {
      setAdvanceRangeState(null)
    }
    if (!newRangeFilters.includes('cardCreatedAtRange')) {
      setCardCreatedAtRangeState(null)
    }
    setFiltersVersion(v => v + 1)
  }, [])

  // Remove filter function that handles all filter types
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'amountRange') {
      setAmountRangeState(null)
    } else if (filterId === 'advanceRange') {
      setAdvanceRangeState(null)
    } else if (filterId === 'cardCreatedAtRange') {
      setCardCreatedAtRangeState(null)
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
    setAmountRangeState(null)
    setAdvanceRangeState(null)
    setCardCreatedAtRangeState(null)
    setSearchTermState('')
    setCurrencyTokens([])
    setFiltersVersion(v => v + 1)
  }, [])

  // Create the custom components for range filters
  const amountRangeComponent = useMemo(
    () => (
      <ExpenseAmountRangeFilter
        amountRange={amountRange}
        onAmountRangeChange={setAmountRange}
        dataTestIdPrefix="amount-range"
      />
    ),
    [amountRange]
  )

  const advanceRangeComponent = useMemo(
    () => (
      <ExpenseAmountRangeFilter
        amountRange={advanceRange}
        onAmountRangeChange={setAdvanceRange}
        dataTestIdPrefix="advance-range"
      />
    ),
    [advanceRange]
  )

  // Filter groups (legacy DataFilter sidebar; status id kept as status-* so handleDataFilterChange still works)
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = ADVANCE_PAYMENT_SIDEBAR_FILTER_STATUSES.map(status => ({
      id: `status-${status}`,
      label: filterLabelMap[status],
      selected: statusFilter.includes(status)
    }))

    return [
      {
        id: 'statusGroup',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.status',
          'Status'
        ),
        filters: statusItems,
        selectionMode: 'multiple'
      },
      {
        id: 'amountGroup',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range'),
        customComponent: amountRangeComponent,
        hideSearch: true // Hide search since we have custom component
      },
      {
        id: 'advanceGroup',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_range_filter', 'Advance Range'),
        customComponent: advanceRangeComponent,
        hideSearch: true // Hide search since we have custom component
      }
    ]
  }, [filterLabelMap, statusFilter, amountRangeComponent, advanceRangeComponent])

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    statusFilter,
    setStatusFilter,
    amountRange,
    setAmountRange,
    advanceRange,
    setAdvanceRange,
    cardCreatedAtRange,
    setCardCreatedAtRange,
    applyStatisticsCardFilter,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    selectedFilters: getAllSelectedFilters,
    setFilters,
    removeFilter,
    clearFilters,
    filtersVersion
  }
}
