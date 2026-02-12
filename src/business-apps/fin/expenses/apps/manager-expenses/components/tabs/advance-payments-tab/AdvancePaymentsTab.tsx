import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataContainer } from '@/components/layout/dataContainer'
import { useAdvancePaymentFilters } from '../../../hooks/useAdvancePaymentFilters'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildDeduplicatedFilters } from '../../../utils/filterUtils'
import { separateFiltersByType } from '../../../utils/plansFilterHelpers'
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
    setCurrencyFilter,
    filterGroups: statusFilterGroup,
    handleDataFilterChange: baseHandleDataFilterChange,
    filterLabelMap: baseLabelMap
  } = useAdvancePaymentFilters({
    accessToken: undefined, // Don't fetch currencies from the old hook
    managerId: undefined
  })

  // State for page size
  const [pageSize, setPageSize] = useState<number>(20)

  // Stats from overview aggregates (declared after overview)
  let advancePaymentStats: any = null
  let statsLoading = false
  let statsError: any = null
  let fetchAdvancePaymentStatistics: () => Promise<void> = async () => {}

  // Use the main data hook to fetch advance payments data for the table
  // Local overview-driven paging + sorting
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sorting, setSorting] = useState<{
    field: string | null
    order: 'ASC' | 'DESC' | null
    lastField?: string | null
  }>({
    field: 'createdAt',
    order: 'DESC',
    lastField: 'createdAt'
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
  }, [sorting.field, sorting.order])

  const currencyRef = useMemo(
    () => (currencyFilter ? standardizeCurrencyRef(currencyFilter) : undefined),
    [currencyFilter]
  )

  const requestsParams = useMemo(() => ({ limit: 0, offset: 0 }), [])
  const plansParams = useMemo(() => ({ limit: 0, offset: 0 }), [])

  const paymentsParams = useMemo(
    () => ({
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      orderBy: payOrderBy
    }),
    [pageSize, currentPage, payOrderBy]
  )

  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef,
      searchTerm,
      payments: paymentsParams,
      paymentsStatus: statusFilter || undefined,
      requests: requestsParams,
      plans: plansParams
    }),
    [managerId, currencyRef, searchTerm, paymentsParams, statusFilter, requestsParams, plansParams]
  )

  const overview = useManagerExpensesOverview(props, overviewParams)

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
      paymentMethod: p.paymentMethod,
      decisionDate: p.decisionDate,
      transactionDate: p.transactionDate,
      costCenter: p.costCenter,
      project: p.project,
      expensePlan: p.expensePlan
    }))
  }, [overview.data?.advancePayments])

  // Only show loading if we have no data AND we're loading (initial load)
  // Don't show loading when we have cached data (prevents bouncing on filter changes)
  const paymentsLoading = overview.isLoading && !overview.data
  const paymentsError = overview.error ? new Error(overview.error) : null
  const totalCount = overview.data?.advancePaymentsTotal ?? 0

  // Only show currencies that have advance payments (avoids e.g. USD from requests/plans with 0 payments)
  const availableCurrencies = useMemo(() => {
    return overview.data?.distinctCurrenciesFromPayments ?? overview.data?.distinctCurrencies ?? []
  }, [overview.data?.distinctCurrenciesFromPayments, overview.data?.distinctCurrencies])

  // Initialize currencyFilter with first available currency if empty
  const hasInitializedCurrency = useRef(false)

  useEffect(() => {
    if (hasInitializedCurrency.current) {
      return
    }

    if (!currencyFilter && availableCurrencies.length > 0) {
      hasInitializedCurrency.current = true
      const rawCurrency = availableCurrencies[0]
      const code = String(rawCurrency).includes(':') ? String(rawCurrency).split(':').pop() || rawCurrency : rawCurrency
      baseHandleDataFilterChange(`currency:${code}`, true)
    }
  }, [currencyFilter, availableCurrencies, baseHandleDataFilterChange])

  // Build filter groups with currencies from overview
  const filterGroups = useMemo(() => {
    const currencyItems = availableCurrencies.map(curr => {
      const code = String(curr).includes(':') ? String(curr).split(':').pop() || curr : curr
      return {
        id: `currency:${code}`,
        label: code,
        selected: code === currencyFilter,
        group: 'currencyGroup'
      }
    })

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

  const filterLabelMap = useMemo(() => {
    const map = { ...baseLabelMap }
    for (const curr of availableCurrencies) {
      map[curr] = curr
    }
    return map
  }, [baseLabelMap, availableCurrencies])

  const handleDataFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
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

  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search)
      setCurrentPage(1)
    },
    [setSearchTerm]
  )

  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter([])
    setCurrencyFilter('')
    setCurrentPage(1)
  }, [setSearchTerm, setStatusFilter, setCurrencyFilter])

  const onFilterChangeWithPageReset = useCallback(
    (filterId: string, selected: boolean) => {
      setCurrentPage(1)
      handleDataFilterChange(filterId, selected)
    },
    [handleDataFilterChange]
  )

  const handleTableStatusFilterChange = useCallback(
    (filter: string[] | null) => {
      setStatusFilter(filter || [])
      setCurrentPage(1)
    },
    [setStatusFilter]
  )

  const handleFilterChange = useCallback(
    (newFilters: string[]) => {
      setCurrentPage(1)
      const { currency: currencyIncoming, status: statusIncoming } = separateFiltersByType(newFilters)
      setStatusFilter(statusIncoming.length > 0 ? statusIncoming : [])

      const hasCurrency = currencyIncoming.length > 0
      const newCurrencyCode = hasCurrency ? currencyIncoming[0].replace('currency:', '') : null
      if (hasCurrency && newCurrencyCode && `currency:${newCurrencyCode}` !== `currency:${currencyFilter}`) {
        handleDataFilterChange(`currency:${newCurrencyCode}`, true)
      }
      if (!hasCurrency && currencyFilter) {
        setCurrencyFilter('')
      }
    },
    [currencyFilter, handleDataFilterChange, setStatusFilter, setCurrencyFilter]
  )

  const filterSignature = useMemo(
    () => ({ searchTerm, statusFilter, currencyFilter }),
    [searchTerm, statusFilter, currencyFilter]
  )

  const prevFilterSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify(filterSignature)
    const prev = prevFilterSignatureRef.current
    if (prev !== null && prev !== signature) {
      setCurrentPage(1)
    }
    prevFilterSignatureRef.current = signature
  }, [filterSignature])

  const listTitle = useMemo(
    () => (
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
    [totalCount]
  )

  const controllerFilterLabelMap = useMemo(
    () => ({
      ...filterLabelMap,
      ...(currencyFilter ? { [`currency:${currencyFilter}`]: currencyFilter } : {})
    }),
    [filterLabelMap, currencyFilter]
  )

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
        contentBackground="gray"
        addLeftPaddingWhenNoFilter={true}
        dataControllerProps={{
          search: searchTerm,
          // Always keep applied filters visible, even when there are no advance payments yet
          filter: buildDeduplicatedFilters(statusFilter ?? undefined, currencyFilter),
          setSearch: handleSearchChange,
          setFilter: handleFilterChange,
          filterLabelMap: controllerFilterLabelMap,
          listTitle,
          debounceDelay: 300
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: onFilterChangeWithPageReset
        }}
        dataBody={
          <div data-testid="advance-payments-table-container">
            <AdvancePaymentsTable
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              search={searchTerm}
              onSearchChange={handleSearchChange}
              activeFilter={statusFilter}
              onFilterChange={handleTableStatusFilterChange}
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
