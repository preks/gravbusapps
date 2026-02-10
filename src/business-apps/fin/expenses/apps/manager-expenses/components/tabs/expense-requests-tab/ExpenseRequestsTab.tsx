import React, { useMemo, useEffect, useCallback, useState, useRef } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters'
import ExpenseRequestStatistics from './ExpenseRequestStatistics'
import ExpenseRequestsTable from './ExpenseRequestsTable'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { standardizeCurrencyRef, extractCurrencyCode } from '../../../utils/currencyUtils'

export type ExpenseRequestsTabProps = BusinessAppContextProps

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = props => {
  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  const {
    search: searchTerm,
    setSearch: setSearchTerm,
    selectedFilters,
    primaryCurrency,
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    addFilter,
    removeFilter,
    setFilters,
    getAllSelectedFilters,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    requestTypeFilter
  } = useExpenseRequestFilters({
    accessToken: props.accessToken,
    managerId,
    userInfo: props.userInfo
  })

  // Stats will be computed from overview (declared below)

  // Local paging + sorting managed here; overview hook refetches on dependency change
  const [pageSize, setPageSize] = useState<number>(20)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sortBy, setSortBy] = useState<string>('requestDate:desc')

  // Step 5: Only sortBy drives order; dependency array intentionally [sortBy].
  const reqOrderBy = useMemo(() => {
    const [field, dirRaw] = String(sortBy || 'requestDate:desc').split(':')
    const dir = (dirRaw || 'desc').toUpperCase()
    switch (field) {
      case 'title':
        return [{ title: dir } as any]
      case 'startDate':
        return [{ startDate: dir } as any]
      case 'endDate':
        return [{ endDate: dir } as any]
      case 'employee.fullName':
        return [{ employee: { fullName: dir } } as any]
      case 'requestDate':
        return [{ requestDate: dir } as any]
      case 'amount':
        return [{ totalAmount: dir } as any]
      case 'status':
        return [{ status: dir } as any]
      default:
        return [{ requestDate: 'DESC' } as any]
    }
  }, [sortBy])

  const currencyRef = useMemo(
    () => (primaryCurrency ? standardizeCurrencyRef(primaryCurrency) : undefined),
    [primaryCurrency]
  )

  // Helper function to convert date range to GraphQL format
  const convertDateRangeToGraphQL = useCallback((dateRange: [Date | null, Date | null] | null) => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return null
    return {
      from: dateRange[0] ? dayjs(dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss') : null,
      to: dateRange[1] ? dayjs(dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss') : null
    }
  }, [])

  // Convert date ranges to GraphQL format
  const requestsEffectiveDateRange = useMemo(
    () => convertDateRangeToGraphQL(effectiveDateRange),
    [effectiveDateRange, convertDateRangeToGraphQL]
  )
  const requestsRequestDateRange = useMemo(
    () => convertDateRangeToGraphQL(requestDateRange),
    [requestDateRange, convertDateRangeToGraphQL]
  )
  const requestsStartDateRange = useMemo(
    () => convertDateRangeToGraphQL(startDateRange),
    [startDateRange, convertDateRangeToGraphQL]
  )
  const requestsEndDateRange = useMemo(
    () => convertDateRangeToGraphQL(endDateRange),
    [endDateRange, convertDateRangeToGraphQL]
  )

  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef,
      searchTerm,
      requests: {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        orderBy: reqOrderBy
      },
      requestsStatus: selectedFilters,
      requestsTypeFilter: requestTypeFilter,
      plans: { limit: 0, offset: 0 },
      payments: { limit: 0, offset: 0 },
      requestsEffectiveDateRange,
      requestsRequestDateRange,
      requestsStartDateRange,
      requestsEndDateRange
    }),
    [
      managerId,
      currencyRef,
      searchTerm,
      pageSize,
      currentPage,
      reqOrderBy,
      selectedFilters,
      requestTypeFilter,
      requestsEffectiveDateRange,
      requestsRequestDateRange,
      requestsStartDateRange,
      requestsEndDateRange
    ]
  )

  const overview = useManagerExpensesOverview(props, overviewParams)

  // Use ref to keep the last valid stats to prevent flickering/height changes
  const lastValidStatsRef = useRef<any>(null)

  // Compute stats from overview now that it's declared
  const requestStats = useMemo(() => {
    const newStats = overview.data
      ? {
          // Use currency-agnostic counts for card totals
          pendingCount: overview.data.pendingRequestsAll || 0,
          pendingAmount: overview.data.requestPendingAmount || 0,
          totalRequestsSubmitted: overview.data.requestSubmittedCount || 0,
          totalSubmittedAmount: overview.data.requestSubmittedAmount || 0
        }
      : null

    // Update ref with new stats if available
    if (newStats) {
      lastValidStatsRef.current = newStats
    }

    // Return new stats if available, otherwise return last valid stats to prevent flickering
    return newStats || lastValidStatsRef.current
  }, [overview.data])

  // Only show loading on initial load when there's no cached data
  const requestStatsLoading = overview.isLoading && !overview.data
  const requestStatsError = overview.error
  const fetchRequestStatistics = useCallback(async () => {
    await overview.refetch()
  }, [overview])

  const expenseRequests = useMemo(() => {
    const rows = overview.data?.expenseRequests || []
    return rows.map((r: any) => {
      // Extract currency code from currencyRef
      const currency = r?.currencyRef ? extractCurrencyCode(r.currencyRef) : undefined

      return {
        id: r.id,
        code: r.code,
        title: r.title,
        requestDate: r.requestDate,
        startDate: r.startDate,
        endDate: r.endDate,
        description: r.description,
        amount: Number(r.totalAmount ?? 0),
        totalAmount: Number(r.totalAmount ?? 0),
        currency: currency || primaryCurrency || 'EUR',
        currencyRef: r.currencyRef,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        requestType: r.requestType,
        employeeDocument: r.employeeDocument || null,
        expensePlan: r.expensePlan || null,
        employee: r.employee || null
      } as any
    })
  }, [overview.data?.expenseRequests, primaryCurrency])

  // Only show loading on initial load when there's no cached data
  const requestsLoading = overview.isLoading && !overview.data
  const requestsError = overview.error
  const totalCount = overview.data?.expenseRequestsTotal ?? 0

  const filterSignature = useMemo(
    () => ({
      searchTerm,
      selectedFilters,
      primaryCurrency,
      effectiveDateRange,
      requestDateRange,
      startDateRange,
      endDateRange,
      requestTypeFilter
    }),
    [
      searchTerm,
      selectedFilters,
      primaryCurrency,
      effectiveDateRange,
      requestDateRange,
      startDateRange,
      endDateRange,
      requestTypeFilter
    ]
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

  const fetchRequests = useCallback(
    (newSearchTerm?: string, page?: number, newPageSize?: number, newSortBy?: string) => {
      if (typeof newSearchTerm === 'string') setSearchTerm(newSearchTerm)
      if (typeof page === 'number') setCurrentPage(page)
      if (typeof newPageSize === 'number') setPageSize(newPageSize)
      if (typeof newSortBy === 'string' && newSortBy.length > 0) setSortBy(newSortBy)
      return Promise.resolve()
    },
    [setSearchTerm]
  )

  // Reset tab's page to 1 when filters change so the overview request uses offset 0 (avoids empty table when e.g. on page 3 then applying a filter that has fewer pages)
  const addFilterWithPageReset = useCallback(
    (filterId: string) => {
      setCurrentPage(1)
      addFilter(filterId)
    },
    [addFilter]
  )
  const removeFilterWithPageReset = useCallback(
    (filterId: string) => {
      setCurrentPage(1)
      removeFilter(filterId)
    },
    [removeFilter]
  )
  const setFiltersWithPageReset = useCallback(
    (filters: string[]) => {
      setCurrentPage(1)
      setFilters(filters)
    },
    [setFilters]
  )
  const handleDataFilterChangeWithPageReset = useCallback(
    (filterId: string, selected: boolean) => {
      setCurrentPage(1)
      handleDataFilterChange(filterId, selected)
    },
    [handleDataFilterChange]
  )
  const setSearchTermWithPageReset = useCallback(
    (term: string) => {
      setCurrentPage(1)
      setSearchTerm(term)
    },
    [setSearchTerm]
  )

  const clearCurrencyFilterWithPageReset = useCallback(() => {
    if (!primaryCurrency) return
    removeFilterWithPageReset(`currency:${primaryCurrency}`)
  }, [primaryCurrency, removeFilterWithPageReset])

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-requests-tab-container">
      <div className="gba:mb-6">
        <ExpenseRequestStatistics
          requestStats={requestStats}
          requestStatsLoading={requestStatsLoading}
          requestStatsError={requestStatsError}
          fetchRequestStatistics={fetchRequestStatistics}
          currencyFilter={primaryCurrency}
          clearCurrencyFilter={clearCurrencyFilterWithPageReset}
          setFilters={setFiltersWithPageReset}
          selectedFilters={selectedFilters}
        />
      </div>

      <div className="gba:flex-1">
        <div data-testid="expense-requests-table-container">
          <ExpenseRequestsTable
            accessToken={props.accessToken}
            userInfo={props.userInfo}
            expenseRequests={expenseRequests}
            loading={requestsLoading}
            error={requestsError}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            fetchRequests={fetchRequests}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTermWithPageReset}
            selectedFilters={getAllSelectedFilters}
            filterGroups={filterGroups}
            filterLabelMap={filterLabelMap}
            addFilter={addFilterWithPageReset}
            removeFilter={removeFilterWithPageReset}
            handleDataFilterChange={handleDataFilterChangeWithPageReset}
            primaryCurrency={primaryCurrency}
            effectiveDateRange={effectiveDateRange}
            requestDateRange={requestDateRange}
            startDateRange={startDateRange}
            endDateRange={endDateRange}
          />
        </div>
      </div>
    </div>
  )
}

export default ExpenseRequestsTab
