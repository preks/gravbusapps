import React, { useMemo, useEffect, useCallback, useState, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters'
import ExpenseRequestStatistics from './ExpenseRequestStatistics'
import ExpenseRequestsTable from './ExpenseRequestsTable'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { standardizeCurrencyRef } from '../../../utils/currencyUtils'

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
    setFilters
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

  const overview = useManagerExpensesOverview(props, {
    managerId,
    currencyRef,
    searchTerm,
    requests: { limit: pageSize, offset: (currentPage - 1) * pageSize, orderBy: reqOrderBy },
    requestsStatus: selectedFilters,
    plans: { limit: 0, offset: 0 },
    payments: { limit: 0, offset: 0 }
  })

  // Use ref to keep the last valid stats to prevent flickering/height changes
  const lastValidStatsRef = useRef<any>(null)

  // Compute stats from overview now that it's declared
  const requestStats = useMemo(() => {
    const newStats = overview.data
      ? {
          // Use currency-agnostic counts for card totals
          pendingCount: overview.data.pendingRequestsAll || 0,
          pendingAmount: overview.data.requestPendingAmount || 0,
          totalRequestsSubmitted: overview.data.totalRequestsAll || 0,
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
      // Extract currency code from currencyRef (format: "Currency:v1:EUR" -> "EUR")
      let currency: string | undefined
      if (typeof r?.currencyRef === 'string') {
        currency = r.currencyRef.includes(':') ? r.currencyRef.split(':').pop() : r.currencyRef
      }

      return {
        id: r.id,
        code: r.code,
        title: r.title,
        requestDate: r.requestDate,
        startDate: r.startDate,
        endDate: r.endDate,
        description: r.description,
        amount: Number(r.totalAmount ?? 0),
        currency: currency || primaryCurrency || 'EUR',
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
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

  // Reset pagination when filters or search change so filtered results are visible from page 1.
  const prevFilterSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify({
      searchTerm,
      selectedFilters,
      primaryCurrency
    })
    const prev = prevFilterSignatureRef.current
    if (prev !== null && prev !== signature) {
      setCurrentPage(1)
    }
    prevFilterSignatureRef.current = signature
  }, [searchTerm, selectedFilters, primaryCurrency])

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

  useEffect(() => {
    if (props.accessToken) {
      // Ensure initial load via overview hook defaults
    }
  }, [props.accessToken])

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-requests-tab-container">
      <div className="gba:mb-6">
        <ExpenseRequestStatistics
          requestStats={requestStats}
          requestStatsLoading={requestStatsLoading}
          requestStatsError={requestStatsError}
          fetchRequestStatistics={fetchRequestStatistics}
          currencyFilter={primaryCurrency}
          setFilters={setFilters}
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
            fetchRequests={fetchRequests}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedFilters={selectedFilters}
            filterGroups={filterGroups}
            filterLabelMap={filterLabelMap}
            addFilter={addFilter}
            removeFilter={removeFilter}
            handleDataFilterChange={handleDataFilterChange}
            primaryCurrency={primaryCurrency}
          />
        </div>
      </div>
    </div>
  )
}

export default ExpenseRequestsTab
