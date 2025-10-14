import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataContainer } from '@/components/layout/dataContainer'
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import AdvancePaymentStatistics from './AdvancePaymentStatistics'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { standardizeCurrencyRef } from '../../../utils/currencyUtils'

const AdvancePaymentsTab: React.FC<BusinessAppContextProps> = props => {
  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  // Use the advance payment filters hook without fetching currencies (we'll use overview's currencies)
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    currencyFilter,
    filterGroups: statusFilterGroup, // Only contains status filters - currency is added below
    handleDataFilterChange: baseHandleDataFilterChange,
    filterLabelMap: baseLabelMap
  } = useAdvancePaymentFilters({
    accessToken: undefined, // Don't fetch currencies from the old hook
    managerId: undefined
  })

  // State for page size
  const [pageSize, setPageSize] = useState<number>(10)

  // Stats from overview aggregates (declared after overview)
  let advancePaymentStats: any = null
  let statsLoading = false
  let statsError: any = null
  let fetchAdvancePaymentStatistics: () => Promise<void> = async () => {}

  // Use the main data hook to fetch advance payments data for the table
  // Local overview-driven paging + sorting
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sorting, setSorting] = useState<{ field: string | null; order: 'ASC' | 'DESC' | null }>({
    field: null,
    order: null
  })

  const payOrderBy = useMemo(() => {
    if (!sorting.field || !sorting.order) return [{ createdAt: 'DESC' } as any]
    const dir = sorting.order
    switch (sorting.field) {
      case 'expensePlan.title':
        return [{ expensePlan: { title: dir } } as any]
      case 'expensePlan.startDate':
        return [{ expensePlan: { startDate: dir } } as any]
      case 'expensePlan.endDate':
        return [{ expensePlan: { endDate: dir } } as any]
      case 'expensePlan.employee.fullName':
        return [{ expensePlan: { employee: { fullName: dir } } } as any]
      case 'createdAt':
        return [{ createdAt: dir } as any]
      case 'amount':
        return [{ amount: dir } as any]
      case 'status':
        return [{ status: dir } as any]
      default:
        return [{ createdAt: 'DESC' } as any]
    }
  }, [sorting])

  const currencyRef = useMemo(
    () => (currencyFilter ? standardizeCurrencyRef(currencyFilter) : undefined),
    [currencyFilter]
  )

  const overview = useManagerExpensesOverview(props, {
    managerId,
    currencyRef,
    searchTerm,
    payments: { limit: pageSize, offset: (currentPage - 1) * pageSize, orderBy: payOrderBy },
    paymentsStatus: statusFilter || undefined,
    requests: { limit: 0, offset: 0 },
    plans: { limit: 0, offset: 0 }
  })

  // Use ref to keep the last valid stats to prevent flickering/height changes
  const lastValidStatsRef = useRef<any>(null)

  // Compute stats from overview now that it's declared
  advancePaymentStats = useMemo(() => {
    const newStats = overview.data
      ? {
          // Use currency-agnostic counts for card totals
          totalCount: overview.data.totalPaymentsAll || 0,
          sumAmount: overview.data.paymentTotalAmount || 0,
          pendingCount: overview.data.pendingPaymentsAll || 0,
          pendingAmount: overview.data.paymentPendingAmount || 0
        }
      : null

    // Update ref with new stats if available
    if (newStats) {
      lastValidStatsRef.current = newStats
    }

    // Return new stats if available, otherwise return last valid stats to prevent flickering
    return newStats || lastValidStatsRef.current
  }, [overview.data])

  // Don't show loading on stats cards - they should remain stable while table updates
  statsLoading = false
  statsError = null
  fetchAdvancePaymentStatistics = useCallback(async () => {
    await overview.refetch()
  }, [overview])

  const advancePayments = useMemo(() => {
    const rows = overview.data?.advancePayments || []
    return rows.map((p: any) => ({
      id: p.id,
      code: p.code,
      description: p.description ?? null,
      status: p.status,
      amount: Number(p.amount ?? 0),
      currencyRef: p.currencyRef,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      expensePlan: p.expensePlan
    }))
  }, [overview.data?.advancePayments])

  // Only show loading if we have no data AND we're loading (initial load)
  // Don't show loading when we have cached data (prevents bouncing on filter changes)
  const paymentsLoading = overview.isLoading && !overview.data
  const paymentsError = overview.error ? new Error(overview.error) : null
  const totalCount = overview.data?.advancePaymentsTotal ?? 0

  // Get currencies from overview
  const availableCurrencies = useMemo(() => {
    return overview.data?.distinctCurrencies || []
  }, [overview.data?.distinctCurrencies])

  // Initialize currencyFilter with first available currency if empty
  // Use ref to track if we've ever attempted initialization to prevent duplicates on refresh
  const hasInitializedCurrency = useRef(false)

  useEffect(() => {
    // Only initialize once per component lifetime - strict guard
    if (hasInitializedCurrency.current) {
      return
    }

    // Check if we need to initialize (no currency set and currencies are available)
    if (!currencyFilter && availableCurrencies.length > 0) {
      // Mark as initialized IMMEDIATELY before any async operations
      hasInitializedCurrency.current = true

      // Extract ISO code if in "Currency:v1:EUR" format and tokenize
      const rawCurrency = availableCurrencies[0]
      const code = String(rawCurrency).includes(':') ? String(rawCurrency).split(':').pop() || rawCurrency : rawCurrency

      // Initialize currency synchronously
      baseHandleDataFilterChange(`currency:${code}`, true)
    }
  }, [currencyFilter, availableCurrencies, baseHandleDataFilterChange])

  // Build filter groups with currencies from overview
  const filterGroups = useMemo(() => {
    const currencyItems = availableCurrencies.map(curr => {
      // Extract ISO code if in "Currency:v1:EUR" format
      const code = String(curr).includes(':') ? String(curr).split(':').pop() || curr : curr
      return {
        id: `currency:${code}`,
        label: code,
        selected: code === currencyFilter,
        group: 'currencyGroup'
      }
    })

    // Add currency group to the status filter group
    return [
      ...statusFilterGroup,
      {
        id: 'currencyGroup',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_table.currency',
          'Currency'
        ),
        filters: currencyItems,
        selectionMode: 'single' as const
      }
    ]
  }, [statusFilterGroup, availableCurrencies, currencyFilter])

  // Build filter label map with currencies
  const filterLabelMap = useMemo(() => {
    const map = { ...baseLabelMap }
    for (const curr of availableCurrencies) {
      map[curr] = curr
    }
    return map
  }, [baseLabelMap, availableCurrencies])

  // Enhanced data filter change handler that includes currencies
  const handleDataFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      // Handle all filters via the base handler (currencies and status)
      baseHandleDataFilterChange(filterId, selected)
    },
    [baseHandleDataFilterChange]
  )

  const updateSorting = useCallback((field: string) => {
    setSorting(prev => {
      if (prev.field === field) {
        if (prev.order === 'ASC') return { field, order: 'DESC' }
        if (prev.order === 'DESC') return { field: null, order: null }
        return { field, order: 'ASC' }
      }
      return { field, order: 'ASC' }
    })
    setCurrentPage(1)
  }, [])

  // Handle search term changes
  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search)
    },
    [setSearchTerm]
  )

  // Handle clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter([])
  }, [setSearchTerm, setStatusFilter])

  // Transform sorting to match expected format
  // removed: transformedSorting now unused after overview migration

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="advance-payments-tab-container">
      {/* Statistics Section - fixed height to prevent layout shift */}
      <div className="gba:mb-6 gba:min-h-[120px]">
        <AdvancePaymentStatistics
          advancePaymentStats={advancePaymentStats}
          statsLoading={statsLoading}
          statsError={statsError}
          fetchAdvancePaymentStatistics={fetchAdvancePaymentStatistics}
          currencyFilter={currencyFilter}
        />
      </div>

      {/* Data Container with Table */}
      <DataContainer
        key="advance-payments-data-container"
        contentBackground="white"
        addLeftPaddingWhenNoFilter={true}
        dataControllerProps={{
          search: searchTerm,
          filter: (() => {
            // Build filter array with deduplication to prevent duplicate currency filters on refresh
            const statusFilters = (statusFilter || []).filter(f => !f.startsWith('currency:'))
            return currencyFilter ? [...statusFilters, `currency:${currencyFilter}`] : statusFilters
          })(),
          setSearch: handleSearchChange,
          setFilter: (newFilters: string[]) => {
            // Separate currency and status filters
            const currencyFilters = newFilters.filter(f => f.startsWith('currency:'))
            const statusFiltersIncoming = newFilters.filter(f => !f.startsWith('currency:'))

            // Update status filters - always update to match incoming filters
            setStatusFilter(statusFiltersIncoming.length > 0 ? statusFiltersIncoming : [])

            // Handle currency filter changes
            // Note: Currency filter should remain even when "Clear all filters" is clicked
            // Only change currency if user explicitly selects a different one from the filter panel
            const hasCurrency = currencyFilters.length > 0

            // Only process currency change if there's an actual currency in newFilters
            // If newFilters has no currency but we had one, it means "Clear all" was clicked
            // In that case, keep the current currency (don't clear it)
            if (hasCurrency && currencyFilters[0] !== `currency:${currencyFilter}`) {
              // User selected a different currency - extract and apply it
              const newCurrencyCode = currencyFilters[0].replace('currency:', '')
              handleDataFilterChange(`currency:${newCurrencyCode}`, true)
            }
            // Don't clear currency when clearing all filters - currency always stays selected
          },
          filterLabelMap: {
            ...filterLabelMap,
            ...(currencyFilter ? { [`currency:${currencyFilter}`]: currencyFilter } : {})
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:backoffice_expense_landing_page.advance_title',
                    'Advance Payments'
                  )}
                </span>
                <span className="gba:text-muted-foreground">({totalCount})</span>
              </div>
            </div>
          ),
          debounceDelay: 300
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleDataFilterChange
        }}
        dataBody={
          <div data-testid="advance-payments-table-container">
            <AdvancePaymentsTable
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              search={searchTerm}
              onSearchChange={handleSearchChange}
              activeFilter={statusFilter}
              onFilterChange={filter => setStatusFilter(filter || [])}
              onClearFilters={clearAllFilters}
              currencyFilter={currencyFilter}
              // Pass data from the main hook
              advancePayments={advancePayments}
              loading={paymentsLoading}
              error={paymentsError}
              totalCount={totalCount}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              sorting={
                sorting
                  ? { field: sorting.field || '', direction: (sorting.order || 'ASC').toLowerCase() as any }
                  : null
              }
              updateSorting={updateSorting}
              pageSize={pageSize}
              setPageSize={setPageSize}
            />
          </div>
        }
      />
    </div>
  )
}

export default AdvancePaymentsTab
