import { useState, useCallback, useMemo } from 'react'
import type { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter'
import { useDebounce } from '@/common/hooks/useDebounce'
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../utils'
import CompactRangeFilter from '../components/tabs/advance-payments-tab/CompactRangeFilter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
  filterGroups: DataFilterGroup[]
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  filterLabelMap: Record<string, string>
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  removeFilter: (filterId: string) => void
  clearFilters: () => void
  filtersVersion: number
}

// Move these outside the component to make them truly stable
const AVAILABLE_FILTER_STATUSES: ExpenseStatus[] = [
  ExpenseStatus.PREPARED,
  ExpenseStatus.CREATED,
  ExpenseStatus.ASSIGNED,
  ExpenseStatus.PENDING,
  ExpenseStatus.APPROVED,
  ExpenseStatus.VERIFIED,
  ExpenseStatus.BOOKED,
  ExpenseStatus.TRANSFERRED,
  ExpenseStatus.PAID,
  ExpenseStatus.REJECTED,
  ExpenseStatus.CLOSED
]

// Map of status to display label - using exact same labels as the table
const STATUS_DISPLAY_MAP: Partial<Record<ExpenseStatus, string>> = {
  [ExpenseStatus.PREPARED]: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared'),
  [ExpenseStatus.CREATED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.draft', 'Draft')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.created', 'Created')})`,
  [ExpenseStatus.ASSIGNED]: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.assigned', 'Assigned'),
  [ExpenseStatus.PENDING]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.pending', 'Pending')})`,
  [ExpenseStatus.APPROVED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.approved', 'Approved')})`,
  [ExpenseStatus.VERIFIED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.verified', 'Verified')})`,
  [ExpenseStatus.BOOKED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booked', 'Booked')})`,
  [ExpenseStatus.TRANSFERRED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_transit', 'In Transit')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred')})`,
  [ExpenseStatus.PAID]: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid'),
  [ExpenseStatus.REJECTED]: `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.revision_required', 'Revision Required')} (${getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.rejected', 'Rejected')})`,
  [ExpenseStatus.CLOSED]: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.closed', 'Closed')
}

export const useAdvancePaymentFilters = (): UseAdvancePaymentFiltersReturn => {
  const [searchTerm, _setSearchTerm] = useState<string>('')
  // Active prefiltering: Start with PREPARED and PENDING statuses
  const [statusFilter, setStatusFilter] = useState<string[]>([ExpenseStatus.PREPARED, ExpenseStatus.PENDING])
  const [amountRange, _setAmountRange] = useState<{ min?: number; max?: number } | null>(null)
  const [advanceRange, _setAdvanceRange] = useState<{ min?: number; max?: number } | null>(null)
  // Track currency filter tokens separately to avoid polluting statusFilter
  const [currencyTokens, setCurrencyTokens] = useState<string[]>([])
  // Version to signal any change to consumers (for refresh triggers)
  const [filtersVersion, setFiltersVersion] = useState<number>(0)

  // Wrapped setters to bump version
  const setSearchTerm = useCallback((term: string) => {
    _setSearchTerm(term)
    setFiltersVersion(v => v + 1)
  }, [])

  const setAmountRange = useCallback((range: { min?: number; max?: number } | null) => {
    _setAmountRange(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const setAdvanceRange = useCallback((range: { min?: number; max?: number } | null) => {
    _setAdvanceRange(range)
    setFiltersVersion(v => v + 1)
  }, [])

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const handleDataFilterChange = useCallback((filterId: string, isSelected: boolean) => {
    // Determine which filter group this belongs to
    if (filterId.startsWith('status-')) {
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

    return filters
  }, [statusFilter, currencyTokens, amountRange, advanceRange])

  // Create a mapping of filter IDs to their display labels
  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}

    // Status filters - map both filter IDs and raw status values
    AVAILABLE_FILTER_STATUSES.forEach(status => {
      const displayLabel = STATUS_DISPLAY_MAP[status] || getAdvancePaymentStatusDisplay(status).label
      // Map filter IDs (for DataFilter component)
      map[`status-${status}`] = displayLabel
      // Map raw status values (for DataController pills)
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

    return map
  }, [amountRange, advanceRange, formatRangeLabel])

  // Enhanced setFilters function that properly handles clearing all filters
  const setFilters = useCallback((filters: string[]) => {
    // If the filters array is empty, clear everything including ranges
    if (filters.length === 0) {
      setStatusFilter([])
      _setAmountRange(null)
      _setAdvanceRange(null)
      _setSearchTerm('')
      setCurrencyTokens([])
      setFiltersVersion(v => v + 1)
      return
    }

    // Separate range filters, currency tokens and status filters
    const rangeFilters = ['amountRange', 'advanceRange']
    const currencyFilterTokens = filters.filter(f => f.startsWith('currency:'))
    const statusFilters = filters.filter(f => !rangeFilters.includes(f) && !f.startsWith('currency:'))
    const newRangeFilters = filters.filter(f => rangeFilters.includes(f))

    // Set status filters
    setStatusFilter(statusFilters)
    // Set currency tokens (enforce single selection upstream if desired)
    setCurrencyTokens(currencyFilterTokens)

    // Clear ranges that are not in the new filter list
    if (!newRangeFilters.includes('amountRange')) {
      _setAmountRange(null)
    }
    if (!newRangeFilters.includes('advanceRange')) {
      _setAdvanceRange(null)
    }
    setFiltersVersion(v => v + 1)
  }, [])

  // Remove filter function that handles all filter types
  const removeFilter = useCallback((filterId: string) => {
    if (filterId === 'amountRange') {
      _setAmountRange(null)
    } else if (filterId === 'advanceRange') {
      _setAdvanceRange(null)
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
    _setAmountRange(null)
    _setAdvanceRange(null)
    _setSearchTerm('')
    setCurrencyTokens([])
    setFiltersVersion(v => v + 1)
  }, [])

  // Create the custom components for range filters
  const amountRangeComponent = useMemo(
    () => (
      <CompactRangeFilter
        range={amountRange}
        onRangeChange={setAmountRange}
        label={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range')}
        dataTestIdPrefix="amount-range"
      />
    ),
    [amountRange]
  )

  const advanceRangeComponent = useMemo(
    () => (
      <CompactRangeFilter
        range={advanceRange}
        onRangeChange={setAdvanceRange}
        label={getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_range_filter', 'Advance Range')}
        dataTestIdPrefix="advance-range"
      />
    ),
    [advanceRange]
  )

  // Create filter groups for the DataFilter component
  const filterGroups = useMemo<DataFilterGroup[]>(() => {
    const statusItems: DataFilter[] = AVAILABLE_FILTER_STATUSES.map(status => ({
      id: `status-${status}`,
      label: filterLabelMap[`status-${status}`],
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
