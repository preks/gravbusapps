import React, { useMemo, useEffect, useCallback, useState, useRef } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { DataDisplay } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useExpenseRequestFilters } from '../../../hooks/useExpenseRequestFilters'
import { requestFilterStatuses } from '../../../hooks/availableFilterStatuses'
import ExpenseRequestStatistics from './ExpenseRequestStatistics'
import ExpenseRequestsTable from './ExpenseRequestsTable'
import ExpenseRequestDetails from './ExpenseRequestDetails'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { CurrencyDropdown } from '../../../common/components/CurrencyDropdown'
import { useExpenseRequestsOverviewData } from '../../../hooks/useExpenseRequestsOverviewData'
import { createExpenseRequestFilterConfig } from './config/expenseRequestFilterConfig'
import { buildExpenseRequestOrderBy } from './config/expenseRequestOrderBy'
import { expenseRequestSortableColumns } from './config/expenseRequestSortableColumns'
import { expenseRequestAvailableColumns } from './config/expenseRequestAvailableColumns'
import { formatDateRangeForChip, applyDateRangeFromFilter } from '../expense-plans-tab/config/dataDisplayFilterUtils'
import type { ExpenseRequest } from '../../../hooks/useGetExpenseRequests'

export type ExpenseRequestsTabProps = BusinessAppContextProps

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
  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  const {
    search: searchTerm,
    setSearch: setSearchTerm,
    debouncedSearch,
    selectedFilters,
    setFilters,
    primaryCurrency,
    setCurrencyFilter,
    mostUsedCurrency,
    availableCurrencies,
    filterLabelMap,
    effectiveDateRange,
    setEffectiveDateRange,
    requestDateRange,
    setRequestDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    requestTypeFilter,
    setRequestTypeFilter
  } = useExpenseRequestFilters({
    accessToken: props.accessToken,
    managerId,
    userInfo: props.userInfo
  })

  const DEFAULT_SORT = useMemo(() => ({ field: 'requestDate' as const, order: 'DESC' as const }), [])

  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...DEFAULT_VISIBLE_COLUMN_IDS])
  const [sorting, setSorting] = useState<{ field: string | null; order: 'ASC' | 'DESC' | null }>(DEFAULT_SORT)
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)

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
    primaryCurrency,
    searchTerm: debouncedSearch,
    statusFilter: selectedFilters,
    requestTypeFilter,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange,
    pageSize,
    currentPage,
    reqOrderBy
  })

  const filterConfiguration = useMemo(
    () => createExpenseRequestFilterConfig({ statusOptions: requestFilterStatuses, filterLabelMap }),
    [filterLabelMap]
  )

  const filterSignature = useMemo(
    () => ({
      searchTerm: debouncedSearch,
      selectedFilters,
      primaryCurrency,
      effectiveDateRange,
      requestDateRange,
      startDateRange,
      endDateRange,
      requestTypeFilter
    }),
    [
      debouncedSearch,
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
    if (prevFilterSignatureRef.current !== null && prevFilterSignatureRef.current !== signature) {
      setCurrentPage(1)
    }
    prevFilterSignatureRef.current = signature
  }, [filterSignature])

  const sortingState: SortingState = useMemo(() => {
    if (!sorting.field || !sorting.order) return []
    return [{ id: sorting.field, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

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

  const handleSearchChange = useCallback(
    (search: string) => {
      setSearchTerm(search)
      setCurrentPage(1)
    },
    [setSearchTerm]
  )

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const requestTypeIds = (filters.requestTypeIds as string[] | undefined) || []
      setFilters(statusIds)
      setRequestTypeFilter(requestTypeIds)
      applyDateRangeFromFilter(filters.effectiveDateRange, setEffectiveDateRange)
      applyDateRangeFromFilter(filters.requestDateRange, setRequestDateRange)
      applyDateRangeFromFilter(filters.startDateRange, setStartDateRange)
      applyDateRangeFromFilter(filters.endDateRange, setEndDateRange)
      setCurrentPage(1)
    },
    [setFilters, setRequestTypeFilter, setEffectiveDateRange, setRequestDateRange, setStartDateRange, setEndDateRange]
  )

  const handleStatsFilterChange = useCallback(
    (statuses: string[]) => {
      setCurrencyFilter(null)
      setFilters(statuses)
      setCurrentPage(1)
    },
    [setCurrencyFilter, setFilters]
  )

  const clearCurrencyFilter = useCallback(() => {
    setCurrencyFilter(null)
  }, [setCurrencyFilter])

  const handleCurrencyChange = useCallback(
    (code: string | null) => {
      setCurrencyFilter(code)
      setCurrentPage(1)
    },
    [setCurrencyFilter]
  )

  const displayCurrency = primaryCurrency ?? mostUsedCurrency ?? 'EUR'

  const filtersObject = useMemo((): Record<string, unknown> => {
    const obj: Record<string, unknown> = {}
    if (selectedFilters.length > 0) obj.statusIds = selectedFilters
    if (requestTypeFilter.length > 0) obj.requestTypeIds = requestTypeFilter
    const effectiveStr = formatDateRangeForChip(effectiveDateRange)
    if (effectiveStr) obj.effectiveDateRange = effectiveStr
    const requestStr = formatDateRangeForChip(requestDateRange)
    if (requestStr) obj.requestDateRange = requestStr
    const startStr = formatDateRangeForChip(startDateRange)
    if (startStr) obj.startDateRange = startStr
    const endStr = formatDateRangeForChip(endDateRange)
    if (endStr) obj.endDateRange = endStr
    return obj
  }, [selectedFilters, requestTypeFilter, effectiveDateRange, requestDateRange, startDateRange, endDateRange])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchTerm || '').trim() !== ''
    const hasStatus = selectedFilters.length > 0
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
    return hasSearch || hasStatus || hasRequestType || !!hasDate
  }, [
    searchTerm,
    selectedFilters,
    requestTypeFilter,
    effectiveDateRange,
    requestDateRange,
    startDateRange,
    endDateRange
  ])

  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_landing_page.no_requests_created_by_team',
        'No expense request created by your team yet.'
      )

  const columnsFilteredByVisibility = useMemo(() => {
    const allIds = expenseRequestAvailableColumns.map(c => c.id)
    return visibleColumns.length > 0 ? visibleColumns : allIds
  }, [visibleColumns])

  const secondaryActions = useMemo(
    () => (
      <CurrencyDropdown
        availableCurrencies={availableCurrencies}
        selectedCurrency={primaryCurrency}
        onCurrencyChange={handleCurrencyChange}
        testIdPrefix="expense-requests"
      />
    ),
    [availableCurrencies, primaryCurrency, handleCurrencyChange]
  )

  const requestsErrorAsError = requestsError

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="expense-requests-tab-container">
      <div className="gba:mb-6">
        <ExpenseRequestStatistics
          requestStats={requestStats}
          requestStatsLoading={statsLoading}
          requestStatsError={statsError?.message ?? null}
          fetchRequestStatistics={refetch}
          currencyFilter={primaryCurrency}
          displayCurrency={displayCurrency}
          clearCurrencyFilter={clearCurrencyFilter}
          activeFilter={selectedFilters}
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
        filterSheetTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_plan_table.title',
          'Filter Expense Requests'
        )}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.filter_expense_plans_description',
          'Apply filters to narrow down the expense requests list.'
        )}
        secondaryActions={secondaryActions}
      >
        <ExpenseRequestsTable
          accessToken={props.accessToken}
          userInfo={props.userInfo}
          expenseRequests={expenseRequests}
          loading={requestsLoading}
          error={requestsErrorAsError}
          totalCount={totalCount}
          currencyFilter={primaryCurrency}
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
