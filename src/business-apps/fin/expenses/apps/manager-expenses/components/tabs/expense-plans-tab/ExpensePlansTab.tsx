import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { DataDisplay } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan, SortField } from '../../../hooks/useMainViewExpensePlans'
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters'
import { planFilterStatuses } from '../../../hooks/availableFilterStatuses'
import ExpensePlanStatisticsDisplay from './ExpensePlanStatistics'
import ExpensePlansTable from './ExpensePlansTable'
import ExpensePlanDetails from './ExpensePlanDetails'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { useManagerExpensesOverview } from '../../../hooks/useManagerExpensesOverview'
import { standardizeCurrencyRef, extractCurrencyCode } from '../../../utils/currencyUtils'
import { PLAN_TAB_HIDDEN_STATUSES } from '../../../constants/expenseStatus'
import dayjs from 'dayjs'
import { CurrencyDropdown } from '../../../common/components/CurrencyDropdown'
import { createExpensePlanFilterConfig } from './config/expensePlanFilterConfig'
import { expensePlanSortableColumns } from './config/expensePlanSortableColumns'
import { expensePlanAvailableColumns } from './config/expensePlanAvailableColumns'
import { formatDateRangeForChip, applyDateRangeFromFilter } from './config/dataDisplayFilterUtils'

interface ExpensePlansTabProps extends BusinessAppContextProps {
  employeeId?: string
}

const DEFAULT_VISIBLE_COLUMN_IDS = [
  'title',
  'requestCode',
  'startDate',
  'endDate',
  'employee',
  'createdAt',
  'totalAmount',
  'status'
]

const ExpensePlansTab: React.FC<ExpensePlansTabProps> = props => {
  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    primaryCurrency,
    setCurrencyFilter,
    mostUsedCurrency,
    availableCurrencies,
    filterLabelMap,
    effectiveDateRange,
    planDateRange,
    startDateRange,
    endDateRange,
    planTypeFilter,
    setPlanTypeFilter,
    setEffectiveDateRange,
    setPlanDateRange,
    setStartDateRange,
    setEndDateRange
  } = useExpensePlanFilters({
    accessToken: props.accessToken,
    managerId
  })

  const [pageSize, setPageSize] = useState<number>(20)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...DEFAULT_VISIBLE_COLUMN_IDS])

  let planStats: any = null
  let statsLoading = false
  let statsError: any = null

  const DEFAULT_SORT: { field: SortField | null; order: 'ASC' | 'DESC' | null; lastField: SortField | null } = useMemo(
    () => ({ field: 'createdAt', order: 'DESC', lastField: 'createdAt' }),
    []
  )

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [sorting, setSorting] = useState<{
    field: SortField | null
    order: 'ASC' | 'DESC' | null
    lastField: SortField | null
  }>(DEFAULT_SORT)

  const buildOrderByClause = useCallback((field: string, order: 'ASC' | 'DESC') => {
    if (field === 'employee' || field === 'employee.fullName') {
      return [{ employee: { fullName: order } } as any]
    }
    const orderByField = field === 'requestCode' ? 'code' : field
    return [{ [orderByField]: order } as any]
  }, [])

  const planOrderBy = useMemo(() => {
    if (!sorting.field || !sorting.order) return [{ createdAt: 'DESC' } as any]
    return buildOrderByClause(sorting.field, sorting.order)
  }, [sorting.field, sorting.order, buildOrderByClause])

  const currencyRef = useMemo(() => {
    const currencyForQuery = primaryCurrency ?? mostUsedCurrency
    return currencyForQuery ? standardizeCurrencyRef(currencyForQuery) : undefined
  }, [primaryCurrency, mostUsedCurrency])

  const convertDateRangeToGraphQL = useCallback((dateRange: [Date | null, Date | null] | null) => {
    if (!dateRange || (!dateRange[0] && !dateRange[1])) return null
    return {
      from: dateRange[0] ? dayjs(dateRange[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss') : null,
      to: dateRange[1] ? dayjs(dateRange[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss') : null
    }
  }, [])

  const plansEffectiveDateRange = useMemo(() => convertDateRangeToGraphQL(effectiveDateRange), [effectiveDateRange])
  const plansStartDateRange = useMemo(() => convertDateRangeToGraphQL(startDateRange), [startDateRange])
  const plansEndDateRange = useMemo(() => convertDateRangeToGraphQL(endDateRange), [endDateRange])
  const plansPlanDateRange = useMemo(() => convertDateRangeToGraphQL(planDateRange), [planDateRange])

  const requestsParams = useMemo(() => ({ limit: 0, offset: 0 }), [])
  const paymentsParams = useMemo(() => ({ limit: 0, offset: 0 }), [])

  const plansParams = useMemo(
    () => ({
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      orderBy: planOrderBy
    }),
    [pageSize, currentPage, planOrderBy]
  )

  const overviewParams = useMemo(
    () => ({
      managerId,
      currencyRef,
      searchTerm,
      plans: plansParams,
      plansStatus: statusFilter,
      plansStatusExclude: PLAN_TAB_HIDDEN_STATUSES,
      requests: requestsParams,
      payments: paymentsParams,
      plansEffectiveDateRange,
      plansStartDateRange,
      plansEndDateRange,
      plansPlanDateRange,
      plansTypeFilter: planTypeFilter
    }),
    [
      managerId,
      currencyRef,
      searchTerm,
      plansParams,
      statusFilter,
      requestsParams,
      paymentsParams,
      plansEffectiveDateRange,
      plansStartDateRange,
      plansEndDateRange,
      plansPlanDateRange,
      planTypeFilter
    ]
  )

  const overview = useManagerExpensesOverview(props, overviewParams)
  const lastValidStatsRef = useRef<any>(null)

  planStats = useMemo(() => {
    if (!overview.data) return lastValidStatsRef.current
    const newStats = {
      totalCount: overview.data.planTotalCount || 0,
      sumTotalAmount: overview.data.planTotalAmount || 0,
      pendingCount: overview.data.planPendingCount || 0,
      pendingAmount: overview.data.planPendingAmount || 0
    }
    lastValidStatsRef.current = newStats
    return newStats
  }, [
    overview.data?.planTotalCount,
    overview.data?.planTotalAmount,
    overview.data?.planPendingCount,
    overview.data?.planPendingAmount
  ])

  statsLoading = overview.isLoading && !overview.data
  statsError = overview.error ? new Error(overview.error) : null

  const expensePlans: ExpensePlan[] = useMemo(() => {
    const rows = overview.data?.expensePlans || []
    return rows.map((p: any) => {
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

  const plansLoading = overview.isLoading && !overview.data
  const plansError = overview.error ? new Error(overview.error) : null
  const totalCount = overview.data?.expensePlansTotal ?? 0

  const filterSignature = useMemo(
    () => ({
      searchTerm,
      statusFilter,
      primaryCurrency,
      effectiveDateRange,
      planDateRange,
      startDateRange,
      endDateRange,
      planTypeFilter
    }),
    [
      searchTerm,
      statusFilter,
      primaryCurrency,
      effectiveDateRange,
      planDateRange,
      startDateRange,
      endDateRange,
      planTypeFilter
    ]
  )

  const prevFilterSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify(filterSignature)
    const prev = prevFilterSignatureRef.current
    if (prev !== null && prev !== signature) setCurrentPage(1)
    prevFilterSignatureRef.current = signature
  }, [filterSignature])

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        setSorting({ ...DEFAULT_SORT })
      } else {
        const first = newSorting[0]
        setSorting({
          field: first.id as SortField,
          order: first.desc ? 'DESC' : 'ASC',
          lastField: first.id as SortField
        })
      }
      setCurrentPage(1)
    },
    [DEFAULT_SORT]
  )

  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null)
  const handleViewDetails = useCallback((plan: ExpensePlan) => setSelectedPlan(plan), [])
  const handleCloseDetails = useCallback(() => setSelectedPlan(null), [])

  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search)
      setCurrentPage(1)
    },
    [setSearchTerm]
  )

  const handleStatsFilterChange = useCallback(
    (filter: any) => {
      setCurrentPage(1)
      setStatusFilter(filter || [])
    },
    [setStatusFilter]
  )

  const availableStatuses = useMemo(() => planFilterStatuses.filter(s => !PLAN_TAB_HIDDEN_STATUSES.includes(s)), [])

  const filterConfiguration = useMemo(
    () => createExpensePlanFilterConfig({ statusOptions: availableStatuses, filterLabelMap }),
    [availableStatuses, filterLabelMap]
  )

  const filtersObject = useMemo((): Record<string, unknown> => {
    const obj: Record<string, unknown> = {}
    const statusIds = statusFilter as string[]
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (planTypeFilter.length > 0) obj.planTypeIds = planTypeFilter
    const planDateStr = formatDateRangeForChip(planDateRange)
    if (planDateStr) obj.planDateRange = planDateStr
    const effectiveStr = formatDateRangeForChip(effectiveDateRange)
    if (effectiveStr) obj.effectiveDateRange = effectiveStr
    const startStr = formatDateRangeForChip(startDateRange)
    if (startStr) obj.startDateRange = startStr
    const endStr = formatDateRangeForChip(endDateRange)
    if (endStr) obj.endDateRange = endStr
    return obj
  }, [statusFilter, planTypeFilter, planDateRange, effectiveDateRange, startDateRange, endDateRange])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const planTypeIds = (filters.planTypeIds as string[] | undefined) || []
      setStatusFilter(statusIds as any)
      setPlanTypeFilter(planTypeIds)
      applyDateRangeFromFilter(filters.planDateRange, setPlanDateRange)
      applyDateRangeFromFilter(filters.effectiveDateRange, setEffectiveDateRange)
      applyDateRangeFromFilter(filters.startDateRange, setStartDateRange)
      applyDateRangeFromFilter(filters.endDateRange, setEndDateRange)
      setCurrentPage(1)
    },
    [setPlanDateRange, setEffectiveDateRange, setStartDateRange, setEndDateRange]
  )

  const handleCurrencyChange = useCallback(
    (code: string | null) => {
      setCurrencyFilter(code)
      setCurrentPage(1)
    },
    [setCurrencyFilter]
  )

  const secondaryActions = useMemo(
    () => (
      <CurrencyDropdown
        availableCurrencies={availableCurrencies}
        selectedCurrency={primaryCurrency}
        onCurrencyChange={handleCurrencyChange}
        testIdPrefix="expense-plans"
      />
    ),
    [availableCurrencies, primaryCurrency, handleCurrencyChange]
  )

  const sortingState: SortingState = useMemo(() => {
    if (!sorting.field || !sorting.order) return []
    return [{ id: sorting.field, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchTerm || '').trim() !== ''
    const hasStatus = statusFilter.length > 0
    const hasPlanType = planTypeFilter.length > 0
    const hasCurrency = !!primaryCurrency
    const hasDate =
      (effectiveDateRange && (effectiveDateRange[0] || effectiveDateRange[1])) ||
      (planDateRange && (planDateRange[0] || planDateRange[1])) ||
      (startDateRange && (startDateRange[0] || startDateRange[1])) ||
      (endDateRange && (endDateRange[0] || endDateRange[1]))
    return hasSearch || hasStatus || hasPlanType || hasCurrency || !!hasDate
  }, [
    searchTerm,
    statusFilter,
    planTypeFilter,
    primaryCurrency,
    effectiveDateRange,
    planDateRange,
    startDateRange,
    endDateRange
  ])

  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_landing_page.no_plans_created_by_team',
        'No expense plan created by your team yet.'
      )

  const columnsFilteredByVisibility = useMemo(() => {
    const allIds = expensePlanAvailableColumns.map(c => c.id)
    return visibleColumns.length > 0 ? visibleColumns : allIds
  }, [visibleColumns])

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-plans-tab-container">
      <div className="gba:mb-6">
        <ExpensePlanStatisticsDisplay
          planStats={planStats}
          statsLoading={statsLoading}
          statsError={statsError}
          activeFilter={statusFilter}
          onFilterChange={handleStatsFilterChange}
          currencyFilter={primaryCurrency}
          displayCurrency={primaryCurrency ?? mostUsedCurrency ?? 'EUR'}
          fetchPlanStatistics={() => {}}
        />
      </div>

      <DataDisplay
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:backoffice_expense_landing_page.plan_info_pl', 'Plans'),
            metadata: { count: totalCount, isLoading: plansLoading }
          }
        ]}
        currentSection="list"
        searchValue={searchTerm}
        searchPlaceholder={
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
          '...'
        }
        onSearchChange={handleSearchChange}
        filters={filtersObject}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChangeFromDisplay}
        sorting={sortingState}
        sortableColumns={expensePlanSortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={expensePlanAvailableColumns}
        visibleColumns={columnsFilteredByVisibility}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.title', 'Filter Expense Plans')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.filter_expense_plans_description',
          'Apply filters to narrow down the expense plans list.'
        )}
        secondaryActions={secondaryActions}
      >
        <ExpensePlansTable
          accessToken={props.accessToken}
          userInfo={props.userInfo}
          onViewDetails={handleViewDetails}
          currencyFilter={primaryCurrency}
          expensePlans={expensePlans}
          loading={plansLoading}
          error={plansError}
          totalCount={totalCount}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pageSize={pageSize}
          setPageSize={setPageSize}
          visibleColumnIds={columnsFilteredByVisibility}
          emptyMessage={emptyMessage}
        />
      </DataDisplay>

      <DetailsSheet
        open={!!selectedPlan}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedPlan?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.expense_subtitle_details',
            'Expense Plan Details'
          )
        }
        testId="expense-plan-details-sheet"
        onClose={handleCloseDetails}
      >
        {selectedPlan && (
          <ExpensePlanDetails
            accessToken={props.accessToken}
            userInfo={props.userInfo}
            selectedItem={selectedPlan}
            onClose={handleCloseDetails}
          />
        )}
      </DetailsSheet>
    </div>
  )
}

export default ExpensePlansTab
