import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { PiFileText } from 'react-icons/pi'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DataContainer } from '@/components/layout/dataContainer'
import { buildDeduplicatedFilters } from '../../../utils/filterUtils'
import { ExpensePlan } from '../../../hooks/useMainViewExpensePlans'
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters'
import ExpensePlanStatisticsDisplay from './ExpensePlanStatistics'
import ExpensePlansTable from './ExpensePlansTable'
import ExpensePlanDetails from './ExpensePlanDetails'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { standardizeCurrencyRef, extractCurrencyCode } from '../../../utils/currencyUtils'
import dayjs from 'dayjs'

interface ExpensePlansTabProps extends BusinessAppContextProps {
  employeeId?: string
}

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = props => {
  // Get managerId from userInfo for currency filtering
  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  // Use the expense plan filters hook with accessToken and managerId for dynamic currency data
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    primaryCurrency, // Use primaryCurrency instead of currencyFilter
    filterGroups,
    handleDataFilterChange,
    filterLabelMap,
    effectiveDateRange,
    planDateRange,
    startDateRange,
    endDateRange,
    planTypeFilter,
    getAllSelectedFilters,
    removeFilter
  } = useExpensePlanFilters({
    accessToken: props.accessToken,
    managerId
  })

  // State for page size
  const [pageSize, setPageSize] = useState<number>(20)

  // Stats from overview aggregates (declared after overview)
  let planStats: any = null
  let statsLoading = false
  let statsError: any = null

  // Use the main data hook to fetch expense plans data
  // Local paging + sorting state for overview-driven list
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sorting, setSorting] = useState<{ field: any; order: 'ASC' | 'DESC' | null; lastField?: any }>({
    field: 'createdAt',
    order: 'DESC',
    lastField: 'createdAt'
  })

  // Helper to build order by clause - reduces cognitive complexity
  const buildOrderByClause = useCallback((field: string, order: 'ASC' | 'DESC') => {
    if (field === 'employee.fullName') {
      return [{ employee: { fullName: order } } as any]
    }
    return [{ [field]: order } as any]
  }, [])

  const planOrderBy = useMemo(() => {
    if (!sorting.field || !sorting.order) return [{ planDate: 'DESC' } as any]
    return buildOrderByClause(sorting.field, sorting.order)
  }, [sorting, buildOrderByClause])

  const currencyRef = useMemo(
    () => (primaryCurrency ? standardizeCurrencyRef(primaryCurrency) : undefined),
    [primaryCurrency]
  )

  // Helper function to convert date range to GraphQL format - reduces duplication
  const convertDateRangeToGraphQL = useCallback((dateRange: [Date | null, Date | null] | null) => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return null
    return {
      from: dateRange[0] ? dayjs(dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss') : null,
      to: dateRange[1] ? dayjs(dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss') : null
    }
  }, [])

  // Convert date ranges to ISO string format for GraphQL
  const plansEffectiveDateRange = useMemo(
    () => convertDateRangeToGraphQL(effectiveDateRange),
    [effectiveDateRange, convertDateRangeToGraphQL]
  )
  const plansStartDateRange = useMemo(
    () => convertDateRangeToGraphQL(startDateRange),
    [startDateRange, convertDateRangeToGraphQL]
  )
  const plansEndDateRange = useMemo(
    () => convertDateRangeToGraphQL(endDateRange),
    [endDateRange, convertDateRangeToGraphQL]
  )
  const plansPlanDateRange = useMemo(
    () => convertDateRangeToGraphQL(planDateRange),
    [planDateRange, convertDateRangeToGraphQL]
  )

  const overview = useManagerExpensesOverview(props, {
    managerId,
    currencyRef,
    searchTerm,
    plans: { limit: pageSize, offset: (currentPage - 1) * pageSize, orderBy: planOrderBy },
    plansStatus: statusFilter,
    requests: { limit: 0, offset: 0 },
    payments: { limit: 0, offset: 0 },
    plansEffectiveDateRange,
    plansStartDateRange,
    plansEndDateRange,
    plansPlanDateRange,
    plansTypeFilter: planTypeFilter
  })

  // Use ref to keep the last valid stats to prevent flickering/height changes
  const lastValidStatsRef = useRef<any>(null)

  // Compute stats from overview now that it's declared
  planStats = useMemo(() => {
    const newStats = overview.data
      ? {
          // Use currency-agnostic counts for card totals
          totalCount: overview.data.totalPlansAll || 0,
          sumTotalAmount: overview.data.planTotalAmount || 0,
          pendingCount: overview.data.pendingPlansAll || 0,
          pendingAmount: overview.data.planPendingAmount || 0
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
  statsLoading = overview.isLoading && !overview.data
  statsError = overview.error ? new Error(overview.error) : null

  const expensePlans: ExpensePlan[] = useMemo(() => {
    const rows = overview.data?.expensePlans || []
    return rows.map((p: any) => {
      // Extract currency code from currencyRef
      const currency = p?.currencyRef ? extractCurrencyCode(p.currencyRef) : undefined

      return {
        id: p.id,
        code: p.code,
        title: p.title,
        description: p.description ?? null,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        planDate: p.planDate,
        totalAmount: Number(p.totalAmount ?? 0),
        currency: currency || primaryCurrency || 'EUR',
        currencyRef: p.currencyRef,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        requestType: p.requestType,
        expenseRequest: Array.isArray(p.expenseRequest) ? p.expenseRequest : [],
        employeeDocument: p.employeeDocument || null,
        employee: p.employee
      } as ExpensePlan
    })
  }, [overview.data?.expensePlans, primaryCurrency])

  // Only show loading on initial load when there's no cached data
  const plansLoading = overview.isLoading && !overview.data
  const plansError = overview.error ? new Error(overview.error) : null
  const totalCount = overview.data?.expensePlansTotal ?? 0

  // Reset pagination when filters or search change so filtered results are visible from page 1.
  const prevFilterSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify({
      searchTerm,
      statusFilter,
      primaryCurrency,
      effectiveDateRange,
      planDateRange,
      startDateRange,
      endDateRange,
      planTypeFilter
    })
    const prev = prevFilterSignatureRef.current
    if (prev !== null && prev !== signature) {
      setCurrentPage(1)
    }
    prevFilterSignatureRef.current = signature
  }, [
    searchTerm,
    statusFilter,
    primaryCurrency,
    effectiveDateRange,
    planDateRange,
    startDateRange,
    endDateRange,
    planTypeFilter
  ])

  const updateSorting = useCallback((field: any) => {
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

  // State for selected plan details
  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null)

  // Handle plan selection and details panel
  const handleViewDetails = useCallback((plan: ExpensePlan) => setSelectedPlan(plan), [])
  const handleCloseDetails = useCallback(() => setSelectedPlan(null), [])
  const handleSearchChange = useCallback((search: string) => setSearchTerm(search), [setSearchTerm])

  // No need for separate status filter handler as we use handleDataFilterChange

  // Use the handleDataFilterChange function directly from the hook
  // This handles both status and currency filters

  // Handle clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter([])
  }, [setSearchTerm, setStatusFilter])

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-plans-tab-container">
      {/* Statistics Section */}
      <div className="gba:mb-6">
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          activeFilter={statusFilter}
          onFilterChange={filter => setStatusFilter(filter || [])}
          currencyFilter={primaryCurrency}
          fetchPlanStatistics={() => {}}
        />
      </div>

      {/* Data Container with floating details */}
      <DataContainer
        key="expense-plans-data-container"
        addLeftPaddingWhenNoFilter={true}
        dataControllerProps={{
          search: searchTerm,
          // Always keep filter chips in sync with the active filters,
          // even when there are no results (so users can see/clear them).
          filter: buildDeduplicatedFilters(getAllSelectedFilters, primaryCurrency),
          setSearch: handleSearchChange,
          setFilter: newFilters => {
            // Handle removing filters via pills - extracted to reduce complexity
            const allCurrentFilters = buildDeduplicatedFilters(getAllSelectedFilters, primaryCurrency)
            const removedFilters = allCurrentFilters.filter(f => !newFilters.includes(f))
            removedFilters.forEach(filterId => removeFilter(filterId))

            // Separate filters by type
            const currencyFilters = newFilters.filter(f => f.startsWith('currency:'))
            const statusFiltersIncoming = newFilters.filter(f => !f.startsWith('currency:'))

            // Apply status filter changes
            const currentStatusFilters = statusFilter.map(status => status as unknown as string)
            const incomingFilters = statusFiltersIncoming.map(status => status as unknown as string)
            const filtersToRemove = currentStatusFilters.filter(f => !incomingFilters.includes(f))
            const filtersToAdd = incomingFilters.filter(f => !currentStatusFilters.includes(f))

            filtersToRemove.forEach(filter => handleDataFilterChange(filter, false))
            filtersToAdd.forEach(filter => handleDataFilterChange(filter, true))

            // Handle currency filter changes (only if explicitly changed)
            if (currencyFilters.length > 0 && currencyFilters[0] !== `currency:${primaryCurrency}`) {
              const newCurrencyCode = currencyFilters[0].replace('currency:', '')
              handleDataFilterChange(`currency:${newCurrencyCode}`, true)
            }
          },

          filterLabelMap: {
            ...filterLabelMap,
            ...(primaryCurrency
              ? { [`currency:${primaryCurrency}`]: primaryCurrency.split(':').pop()?.toUpperCase() || primaryCurrency }
              : {})
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.plan_info_pl', 'Plans')}
                </span>
                <span className="gba:text-muted-foreground">({totalCount})</span>
              </div>
            </div>
          ),
          debounceDelay: 300
        }}
        dataFilterProps={{
          // Always keep filter sidebar visible, even when there are no plans yet
          filterGroups,
          onFilterChange: handleDataFilterChange
        }}
        dataBody={
          <div data-testid="expense-plans-table-container">
            <ExpensePlansTable
              accessToken={props.accessToken}
              userInfo={props.userInfo}
              search={searchTerm}
              onSearchChange={handleSearchChange}
              activeFilter={statusFilter}
              onFilterChange={filter => setStatusFilter(filter || [])}
              onClearFilters={clearAllFilters}
              employeeId={props.employeeId}
              onViewDetails={handleViewDetails}
              currencyFilter={primaryCurrency}
              // Pass date range and plan type filters for active filter detection
              effectiveDateRange={effectiveDateRange}
              planDateRange={planDateRange}
              startDateRange={startDateRange}
              endDateRange={endDateRange}
              planTypeFilter={planTypeFilter}
              // Pass data from the main hook
              expensePlans={expensePlans}
              loading={plansLoading}
              error={plansError}
              totalCount={totalCount}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              sorting={sorting}
              updateSorting={updateSorting}
              pageSize={pageSize}
              setPageSize={setPageSize}
            />
          </div>
        }
        dataDetails={
          selectedPlan
            ? {
                title: selectedPlan.title || 'Expense Plan Details',
                icon: <PiFileText />,
                content: (
                  <ExpensePlanDetails
                    accessToken={props.accessToken}
                    userInfo={props.userInfo}
                    selectedItem={selectedPlan}
                    onClose={handleCloseDetails}
                  />
                ),
                onClose: handleCloseDetails,
                footer: null
              }
            : undefined
        }
      />
    </div>
  )
}

export default ExpensePlansTab
