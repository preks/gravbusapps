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
    filterLabelMap
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
    field: null,
    order: null
  })

  const planOrderBy = useMemo(() => {
    if (!sorting.field || !sorting.order) return [{ planDate: 'DESC' } as any]
    const dir = sorting.order
    switch (sorting.field) {
      case 'title':
        return [{ title: dir } as any]
      case 'startDate':
        return [{ startDate: dir } as any]
      case 'endDate':
        return [{ endDate: dir } as any]
      case 'employee.fullName':
        return [{ employee: { fullName: dir } } as any]
      case 'createdAt':
        return [{ createdAt: dir } as any]
      case 'totalAmount':
        return [{ totalAmount: dir } as any]
      case 'status':
        return [{ status: dir } as any]
      default:
        return [{ planDate: 'DESC' } as any]
    }
  }, [sorting])

  const currencyRef = useMemo(
    () => (primaryCurrency ? standardizeCurrencyRef(primaryCurrency) : undefined),
    [primaryCurrency]
  )

  const overview = useManagerExpensesOverview(props, {
    managerId,
    currencyRef,
    searchTerm,
    plans: { limit: pageSize, offset: (currentPage - 1) * pageSize, orderBy: planOrderBy },
    plansStatus: statusFilter,
    requests: { limit: 0, offset: 0 },
    payments: { limit: 0, offset: 0 }
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
      primaryCurrency
    })
    const prev = prevFilterSignatureRef.current
    if (prev !== null && prev !== signature) {
      setCurrentPage(1)
    }
    prevFilterSignatureRef.current = signature
  }, [searchTerm, statusFilter, primaryCurrency])

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

  // Handle plan selection for details panel
  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    setSelectedPlan(plan)
  }, [])

  // Handle closing details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedPlan(null)
  }, [])

  // Handle search term changes
  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search)
    },
    [setSearchTerm]
  )

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
          filter: buildDeduplicatedFilters(statusFilter, primaryCurrency),
          setSearch: handleSearchChange,
          setFilter: newFilters => {
            // Separate currency and status filters
            const currencyFilters = newFilters.filter(f => f.startsWith('currency:'))
            const statusFiltersIncoming = newFilters.filter(f => !f.startsWith('currency:'))

            // Convert current status filters to string IDs for comparison
            const currentFilters = statusFilter.map(status => status as unknown as string)
            const incomingFilters = statusFiltersIncoming.map(status => status as unknown as string)

            // Find status filters to remove and add
            const filtersToRemove = currentFilters.filter(f => !incomingFilters.includes(f))
            const filtersToAdd = incomingFilters.filter(f => !currentFilters.includes(f))

            // Apply status filter changes
            for (const filter of filtersToRemove) {
              handleDataFilterChange(filter, false)
            }
            for (const filter of filtersToAdd) {
              handleDataFilterChange(filter, true)
            }

            // Handle currency filter changes
            // Note: Currency filter should remain even when "Clear all filters" is clicked
            const hasCurrency = currencyFilters.length > 0

            // Only process currency change if user explicitly selected a different one
            if (hasCurrency && currencyFilters[0] !== `currency:${primaryCurrency}`) {
              // User selected a different currency
              const newCurrencyCode = currencyFilters[0].replace('currency:', '')
              handleDataFilterChange(`currency:${newCurrencyCode}`, true)
            }
            // Don't clear currency when clearing all filters - currency always stays selected
          },

          filterLabelMap: {
            ...filterLabelMap,
            ...(primaryCurrency ? { [`currency:${primaryCurrency}`]: primaryCurrency } : {})
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
