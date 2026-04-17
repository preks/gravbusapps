import React, { useMemo, useCallback, useState } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { DataDisplay, useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import translations from '../../../_i18n'
import { requestFilterStatuses } from '../../../hooks/availableFilterStatuses'
import { useExpenseRequestCurrencies } from '../../../hooks/useExpenseRequestCurrencies'
import { getExpenseRequestStatusFilterLabel } from '../../../utils'
import ExpenseRequestStatistics from './ExpenseRequestStatistics'
import ExpenseRequestsTable from './ExpenseRequestsTable'
import ExpenseRequestDetails from './ExpenseRequestDetails'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { useExpenseRequestsOverviewData } from '../../../hooks/useExpenseRequestsOverviewData'
import { createExpenseRequestFilterConfig } from './config/expenseRequestFilterConfig'
import { buildExpenseRequestOrderBy } from './config/expenseRequestOrderBy'
import { expenseRequestSortableColumns } from './config/expenseRequestSortableColumns'
import { expenseRequestAvailableColumns } from './config/expenseRequestAvailableColumns'
import { formatDateRangeForChip, applyDateRangeFromFilter } from '../../../../../common/utils/dateRangeFilterUtils'
import {
  applyAmountRangeFromFilters,
  isAmountRangeFilterActive,
  type ExpenseAmountRangeValue
} from '../../../../../common/utils/amountRangeFilterUtils'
import {
  useCurrencyInit,
  useFilterSignatureReset,
  useSortingState,
  useSearchHandler,
  useCurrencyChangeHandler,
  useVisibleColumns,
  useCurrencySecondaryAction,
  useEmptyMessage
} from '../../../hooks/useTabState'
import type { ExpenseRequest } from '../../../hooks/useGetExpenseRequests'

export type ExpenseRequestsTabProps = BusinessAppContextProps

type DateRange = [Date | null, Date | null] | null

const DEFAULT_VISIBLE_COLUMN_IDS = [
  'title',
  'planCode',
  'startDate',
  'endDate',
  'employee',
  'requestDate',
  'totalAmount',
  'status'
]

const ExpenseRequestsTab: React.FC<ExpenseRequestsTabProps> = props => {
  const { t } = useTranslation(translations)
  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null)
  const [requestTypeFilter, setRequestTypeFilter] = useState<string[]>([])
  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange>(null)
  const [requestDateRange, setRequestDateRange] = useState<DateRange>(null)
  const [startDateRange, setStartDateRange] = useState<DateRange>(null)
  const [endDateRange, setEndDateRange] = useState<DateRange>(null)
  const [totalAmountRange, setTotalAmountRange] = useState<ExpenseAmountRangeValue>(null)
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...DEFAULT_VISIBLE_COLUMN_IDS])
  const DEFAULT_SORT = useMemo(() => ({ field: 'requestDate' as const, order: 'DESC' as const }), [])
  const [sorting, setSorting] = useState<{ field: string | null; order: 'ASC' | 'DESC' | null }>(DEFAULT_SORT)
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)

  const { availableCurrencies, mostUsedCurrency } = useExpenseRequestCurrencies(
    { accessToken: props.accessToken, userInfo: props.userInfo },
    managerId
  )

  useCurrencyInit(mostUsedCurrency, setSelectedCurrency)

  const reqOrderBy = useMemo(
    () => buildExpenseRequestOrderBy(sorting.field, sorting.order),
    [sorting.field, sorting.order]
  )

  const {
    requestStats,
    statsLoading,
    statsError,
    expenseRequests,
    requestsLoading,
    requestsError,
    totalCount,
    refetch
  } = useExpenseRequestsOverviewData(props, {
    managerId,
    primaryCurrency: selectedCurrency,
    mostUsedCurrency,
    searchTerm,
    statusFilter,
    requestTypeFilter,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    pageSize,
    currentPage,
    reqOrderBy,
    totalAmountRange
  })

  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const status of requestFilterStatuses) {
      map[status] = getExpenseRequestStatusFilterLabel(status)
    }
    map['ExpenseRequestType:v1:EXPENSES'] = getTranslationFromI18nKeyAndLabel(
      'lowcoder:personal_expenses.expense',
      'Expense'
    )
    map['ExpenseRequestType:v1:TRIP'] = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
    return map
  }, [])

  const filterConfiguration = useMemo(
    () => createExpenseRequestFilterConfig({ statusOptions: requestFilterStatuses, filterLabelMap }),
    [filterLabelMap]
  )

  const filterSignature = useMemo(
    () => ({
      searchTerm,
      statusFilter,
      selectedCurrency,
      effectiveDateRange,
      requestDateRange,
      startDateRange,
      endDateRange,
      requestTypeFilter,
      totalAmountRange
    }),
    [
      searchTerm,
      statusFilter,
      selectedCurrency,
      effectiveDateRange,
      requestDateRange,
      startDateRange,
      endDateRange,
      requestTypeFilter,
      totalAmountRange
    ]
  )
  const resetPage = useCallback(() => setCurrentPage(1), [])
  useFilterSignatureReset(filterSignature, resetPage)

  const sortingState = useSortingState(sorting)

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        if (sorting.field === 'requestDate') {
          setSorting({ field: null, order: null })
        } else {
          setSorting({ ...DEFAULT_SORT })
        }
      } else {
        const first = newSorting[0]
        setSorting({ field: first.id, order: first.desc ? 'DESC' : 'ASC' })
      }
      setCurrentPage(1)
    },
    [DEFAULT_SORT, sorting.field]
  )

  const handleSearchChange = useSearchHandler(setSearchTerm, setCurrentPage)

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statusIds = (filters.statusIds as string[] | undefined) || []
    const requestTypeIds = (filters.requestTypeIds as string[] | undefined) || []
    setStatusFilter(statusIds)
    setRequestTypeFilter(requestTypeIds)
    applyDateRangeFromFilter(filters.effectiveDateRange, setEffectiveDateRange)
    applyDateRangeFromFilter(filters.requestDateRange, setRequestDateRange)
    applyDateRangeFromFilter(filters.startDateRange, setStartDateRange)
    applyDateRangeFromFilter(filters.endDateRange, setEndDateRange)
    applyAmountRangeFromFilters(filters.totalAmount as { min?: number; max?: number } | undefined, setTotalAmountRange)
    setCurrentPage(1)
  }, [])

  const handleStatsFilterChange = useCallback((statuses: string[], currency: string) => {
    setSelectedCurrency(currency)
    setStatusFilter(statuses)
    setCurrentPage(1)
  }, [])

  const handleCurrencyChange = useCurrencyChangeHandler(setSelectedCurrency, setCurrentPage)

  const displayCurrency = selectedCurrency ?? mostUsedCurrency ?? 'EUR'

  const filtersObject = useMemo((): Record<string, unknown> => {
    const obj: Record<string, unknown> = {}
    if (statusFilter.length > 0) obj.statusIds = statusFilter
    if (requestTypeFilter.length > 0) obj.requestTypeIds = requestTypeFilter
    const effectiveStr = formatDateRangeForChip(effectiveDateRange)
    if (effectiveStr) obj.effectiveDateRange = effectiveStr
    const requestStr = formatDateRangeForChip(requestDateRange)
    if (requestStr) obj.requestDateRange = requestStr
    const startStr = formatDateRangeForChip(startDateRange)
    if (startStr) obj.startDateRange = startStr
    const endStr = formatDateRangeForChip(endDateRange)
    if (endStr) obj.endDateRange = endStr
    if (isAmountRangeFilterActive(totalAmountRange)) {
      obj.totalAmount = { min: totalAmountRange?.min, max: totalAmountRange?.max }
    }
    return obj
  }, [
    statusFilter,
    requestTypeFilter,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    totalAmountRange
  ])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchTerm || '').trim() !== ''
    const hasStatus = statusFilter.length > 0
    const hasRequestType = requestTypeFilter.length > 0
    const hasDate =
      effectiveDateRange?.[0] ||
      effectiveDateRange?.[1] ||
      requestDateRange?.[0] ||
      requestDateRange?.[1] ||
      startDateRange?.[0] ||
      startDateRange?.[1] ||
      endDateRange?.[0] ||
      endDateRange?.[1]
    const hasAmount = isAmountRangeFilterActive(totalAmountRange)
    return hasSearch || hasStatus || hasRequestType || !!hasDate || hasAmount
  }, [
    searchTerm,
    statusFilter,
    requestTypeFilter,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    totalAmountRange
  ])

  const emptyMessage = useEmptyMessage(
    hasActiveFilters,
    'lowcoder:manager_expense_landing_page.no_requests_created_by_team',
    'No expense request created by your team yet.'
  )

  const columnsFilteredByVisibility = useVisibleColumns(visibleColumns, expenseRequestAvailableColumns)

  const secondaryActions = useCurrencySecondaryAction(
    availableCurrencies,
    selectedCurrency,
    handleCurrencyChange,
    'expense-requests'
  )

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-requests-tab-container">
      <div className="gba:mb-6">
        <ExpenseRequestStatistics
          requestStats={requestStats}
          requestStatsLoading={statsLoading}
          requestStatsError={statsError?.message ?? null}
          fetchRequestStatistics={refetch}
          displayCurrency={displayCurrency}
          activeFilter={statusFilter}
          onFilterChange={handleStatsFilterChange}
        />
      </div>

      <DataDisplay
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:manager_expense_landing_page.expense_requests_tab.title',
              'Expense Requests'
            ),
            metadata: { count: totalCount, isLoading: requestsLoading }
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
        sortableColumns={expenseRequestSortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={expenseRequestAvailableColumns}
        visibleColumns={columnsFilteredByVisibility}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={t('filter-expense-requests-title')}
        filterSheetDescription={t('filter-expense-requests-description')}
        secondaryActions={secondaryActions}
      >
        <ExpenseRequestsTable
          accessToken={props.accessToken}
          userInfo={props.userInfo}
          expenseRequests={expenseRequests}
          loading={requestsLoading}
          error={requestsError}
          totalCount={totalCount}
          currencyFilter={selectedCurrency}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          sorting={sortingState}
          onSortingChange={handleSortingChange}
          pageSize={pageSize}
          setPageSize={setPageSize}
          visibleColumnIds={columnsFilteredByVisibility}
          emptyMessage={emptyMessage}
          onViewDetails={setSelectedRequest}
        />
      </DataDisplay>

      <DetailsSheet
        open={!!selectedRequest}
        onOpenChange={open => !open && setSelectedRequest(null)}
        title={
          selectedRequest?.title ||
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.title', 'Expense Request Details')
        }
        testId="expense-request-details-sheet"
        onClose={() => setSelectedRequest(null)}
      >
        {selectedRequest && (
          <ExpenseRequestDetails
            request={selectedRequest}
            onApprove={async () => setSelectedRequest(null)}
            onReject={async () => setSelectedRequest(null)}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
          />
        )}
      </DetailsSheet>
    </div>
  )
}

export default ExpenseRequestsTab
