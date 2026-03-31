import React, { useState, useMemo, useCallback } from 'react'
import type { SortingState } from '@tanstack/react-table'
import {
  useFilterSignatureReset,
  useSortingState,
  useSearchHandler,
  useCurrencyChangeHandler,
  useVisibleColumns,
  useCurrencySecondaryAction,
  useEmptyMessage
} from '../../../hooks/useTabState'
import { DataDisplay, useTranslation } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../../_i18n'
import { ExpensePlan, SortField } from '../../../hooks/useMainViewExpensePlans'
import { useExpensePlanFilters } from '../../../hooks/useExpensePlanFilters'
import { useExpensePlansOverviewData } from '../../../hooks/useExpensePlansOverviewData'
import { planFilterStatuses } from '../../../hooks/availableFilterStatuses'
import ExpensePlanStatisticsDisplay from './ExpensePlanStatistics'
import ExpensePlansTable from './ExpensePlansTable'
import ExpensePlanDetails from './ExpensePlanDetails'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { createExpensePlanFilterConfig } from './config/expensePlanFilterConfig'
import { expensePlanSortableColumns } from './config/expensePlanSortableColumns'
import { expensePlanAvailableColumns } from './config/expensePlanAvailableColumns'
import { formatDateRangeForChip, applyDateRangeFromFilter } from '../../../../../common/utils/dateRangeFilterUtils'

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
  const { t } = useTranslation(translations)
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

  const effectiveStatsCurrency = primaryCurrency ?? mostUsedCurrency ?? null

  const { planStats, statsLoading, statsError, expensePlans, plansLoading, plansError, totalCount } =
    useExpensePlansOverviewData(props, {
      managerId,
      primaryCurrency,
      mostUsedCurrency,
      searchTerm,
      statusFilter,
      planTypeFilter,
      effectiveDateRange,
      planDateRange,
      startDateRange,
      endDateRange,
      pageSize,
      currentPage,
      planOrderBy
    })

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

  const resetPage = useCallback(() => setCurrentPage(1), [])
  useFilterSignatureReset(filterSignature, resetPage)

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        if (sorting.field === 'createdAt') {
          setSorting({ field: null, order: null, lastField: sorting.lastField })
        } else {
          setSorting({ ...DEFAULT_SORT })
        }
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
    [DEFAULT_SORT, sorting.field, sorting.lastField]
  )

  const [selectedPlan, setSelectedPlan] = useState<ExpensePlan | null>(null)
  const handleViewDetails = useCallback((plan: ExpensePlan) => setSelectedPlan(plan), [])
  const handleCloseDetails = useCallback(() => setSelectedPlan(null), [])

  const handleSearchChange = useSearchHandler(setSearchTerm, setCurrentPage)

  const displayCurrencyForCards = effectiveStatsCurrency ?? 'EUR'

  const handleStatsFilterChange = useCallback(
    (filter: any) => {
      setCurrentPage(1)
      setCurrencyFilter(effectiveStatsCurrency)
      setStatusFilter(filter || [])
    },
    [effectiveStatsCurrency, setCurrencyFilter, setStatusFilter]
  )

  const filterConfiguration = useMemo(
    () => createExpensePlanFilterConfig({ statusOptions: planFilterStatuses, filterLabelMap }),
    [filterLabelMap]
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

  const handleCurrencyChange = useCurrencyChangeHandler(setCurrencyFilter, setCurrentPage)

  const secondaryActions = useCurrencySecondaryAction(
    availableCurrencies,
    primaryCurrency,
    handleCurrencyChange,
    'expense-plans'
  )

  const sortingState = useSortingState(sorting)

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

  const emptyMessage = useEmptyMessage(
    hasActiveFilters,
    'lowcoder:manager_expense_landing_page.no_plans_created_by_team',
    'No expense plan created by your team yet.'
  )

  const columnsFilteredByVisibility = useVisibleColumns(visibleColumns, expensePlanAvailableColumns)

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
          displayCurrency={displayCurrencyForCards}
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
        filterSheetTitle={t('filter-expense-plans-title')}
        filterSheetDescription={t('filter-expense-plans-description')}
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
