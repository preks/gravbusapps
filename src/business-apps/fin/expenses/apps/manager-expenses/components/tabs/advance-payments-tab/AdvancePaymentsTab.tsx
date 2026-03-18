import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { DataDisplay } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { advancePaymentFilterStatuses } from '../../../hooks/availableFilterStatuses'
import { ExpenseStatus, getAdvancePaymentStatusFilterLabel } from '../../../utils'
import AdvancePaymentStatistics from './AdvancePaymentStatistics'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import AdvancePaymentDetails from './AdvancePaymentDetails'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { CurrencyDropdown } from '../../../common/components/CurrencyDropdown'
import { useAdvancePaymentCurrencies } from '../../../hooks/useAdvancePaymentCurrencies'
import { useAdvancePaymentsOverviewData } from '../../../hooks/useAdvancePaymentsOverviewData'
import { createAdvancePaymentFilterConfig } from './config/advancePaymentFilterConfig'
import { buildAdvancePaymentOrderBy } from './config/advancePaymentOrderBy'
import { advancePaymentSortableColumns } from './config/advancePaymentSortableColumns'
import { advancePaymentAvailableColumns } from './config/advancePaymentAvailableColumns'
import type { AdvancePayment } from '../../../hooks/useMainViewAdvancePayments'

const DEFAULT_VISIBLE_COLUMN_IDS = [
  'expensePlan.title',
  'expensePlan.startDate',
  'expensePlan.endDate',
  'expensePlan.employee.fullName',
  'createdAt',
  'amount',
  'status'
]

const AdvancePaymentsTab: React.FC<BusinessAppContextProps> = props => {
  const managerId = props.userInfo?.employeeDetails?.employeeId || ''

  const [searchTerm, setSearchTerm] = useState('')
  /** Default filter "In Approval (Pending)" is linked to the second (Pending) card; chip and card stay in sync. */
  const [statusFilter, setStatusFilter] = useState<string[]>([ExpenseStatus.PENDING])
  const [primaryCurrency, setPrimaryCurrency] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState(20)

  const { availableCurrencies: currencyCodes, mostUsedCurrency } = useAdvancePaymentCurrencies({
    accessToken: props.accessToken ?? '',
    managerId
  })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...DEFAULT_VISIBLE_COLUMN_IDS])
  const [currentPage, setCurrentPage] = useState(1)
  const [sorting, setSorting] = useState<{
    field: string | null
    order: 'ASC' | 'DESC' | null
  }>({ field: 'createdAt', order: 'DESC' })
  const [selectedPayment, setSelectedPayment] = useState<AdvancePayment | null>(null)

  const payOrderBy = useMemo(
    () => buildAdvancePaymentOrderBy(sorting.field, sorting.order),
    [sorting.field, sorting.order]
  )

  const { payStats, statsLoading, statsError, advancePayments, paymentsLoading, paymentsError, totalCount, refetch } =
    useAdvancePaymentsOverviewData(props, {
      managerId,
      primaryCurrency,
      mostUsedCurrency,
      searchTerm,
      statusFilter,
      pageSize,
      currentPage,
      payOrderBy
    })

  const filterLabelMap = useMemo(
    () => Object.fromEntries(advancePaymentFilterStatuses.map(s => [s, getAdvancePaymentStatusFilterLabel(s)])),
    []
  )

  const filterConfiguration = useMemo(
    () =>
      createAdvancePaymentFilterConfig({
        statusOptions: advancePaymentFilterStatuses,
        filterLabelMap
      }),
    [filterLabelMap]
  )

  // Initialize selector/filter with the most used currency once it becomes available.
  // Keep one-time behavior so users can still select "All" afterwards.
  const hasInitializedCurrency = useRef(false)
  useEffect(() => {
    if (hasInitializedCurrency.current) return
    if (!primaryCurrency && mostUsedCurrency) {
      setPrimaryCurrency(mostUsedCurrency)
      hasInitializedCurrency.current = true
    }
  }, [primaryCurrency, mostUsedCurrency])

  const filterSignature = useMemo(
    () => ({ searchTerm, statusFilter, primaryCurrency }),
    [searchTerm, statusFilter, primaryCurrency]
  )
  const prevFilterSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify(filterSignature)
    if (prevFilterSignatureRef.current !== null && prevFilterSignatureRef.current !== signature) {
      setCurrentPage(1)
    }
    prevFilterSignatureRef.current = signature
  }, [filterSignature])

  const handleSortingChange = useCallback((newState: SortingState) => {
    if (newState.length === 0) {
      setSorting({ field: 'createdAt', order: 'DESC' })
    } else {
      const first = newState[0]
      setSorting({ field: first.id, order: first.desc ? 'DESC' : 'ASC' })
    }
    setCurrentPage(1)
  }, [])

  const handleSearchChange = useCallback((search: string) => {
    setSearchTerm(search)
    setCurrentPage(1)
  }, [])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statusIds = (filters.statusIds as string[] | undefined) || []
    setStatusFilter(statusIds)
    setCurrentPage(1)
  }, [])

  const handleStatsFilterChange = useCallback(
    (statuses: string[]) => {
      setStatusFilter(statuses)
      if (!primaryCurrency && mostUsedCurrency) {
        setPrimaryCurrency(mostUsedCurrency)
      }
      setCurrentPage(1)
    },
    [primaryCurrency, mostUsedCurrency]
  )

  const handleCurrencyChange = useCallback((code: string | null) => {
    setPrimaryCurrency(code)
    setCurrentPage(1)
  }, [])

  const displayCurrencyCode = primaryCurrency ?? mostUsedCurrency ?? 'EUR'

  const filtersObject = useMemo((): Record<string, unknown> => {
    const obj: Record<string, unknown> = {}
    if (statusFilter.length > 0) obj.statusIds = statusFilter
    return obj
  }, [statusFilter])

  const sortingState: SortingState = useMemo(() => {
    if (!sorting.field || !sorting.order) return []
    return [{ id: sorting.field, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchTerm || '').trim() !== ''
    const hasStatus = statusFilter.length > 0
    return hasSearch || hasStatus || !!primaryCurrency
  }, [searchTerm, statusFilter, primaryCurrency])

  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_landing_page.no_advance_payments_created_by_team',
        'No advance payment created by your team yet.'
      )

  const columnsFilteredByVisibility = useMemo(() => {
    const allIds = advancePaymentAvailableColumns.map(c => c.id)
    return visibleColumns.length > 0 ? visibleColumns : allIds
  }, [visibleColumns])

  const secondaryActions = useMemo(
    () => (
      <CurrencyDropdown
        availableCurrencies={currencyCodes}
        selectedCurrency={primaryCurrency}
        onCurrencyChange={handleCurrencyChange}
        testIdPrefix="advance-payments"
      />
    ),
    [currencyCodes, primaryCurrency, handleCurrencyChange]
  )

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="advance-payments-tab-container">
      <div className="gba:mb-6 gba:min-h-[120px]">
        <AdvancePaymentStatistics
          advancePaymentStats={payStats}
          statsLoading={statsLoading}
          statsError={statsError}
          fetchAdvancePaymentStatistics={refetch}
          currencyFilter={primaryCurrency}
          displayCurrency={displayCurrencyCode}
          activeFilter={statusFilter}
          onFilterChange={handleStatsFilterChange}
        />
      </div>

      <DataDisplay
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:backoffice_expense_landing_page.advance_title',
              'Advance Payments'
            ),
            metadata: { count: totalCount, isLoading: paymentsLoading }
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
        sortableColumns={advancePaymentSortableColumns}
        onSortingChange={handleSortingChange}
        availableColumns={advancePaymentAvailableColumns}
        visibleColumns={columnsFilteredByVisibility}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expense_landing_page.advance_title',
          'Filter Advance Payments'
        )}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'lowcoder:advance_payments.filter_description',
          'Apply filters to narrow down the advance payments list.'
        )}
        secondaryActions={secondaryActions}
      >
        <AdvancePaymentsTable
          accessToken={props.accessToken}
          userInfo={props.userInfo}
          advancePayments={advancePayments}
          loading={paymentsLoading}
          error={paymentsError}
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
          onViewDetails={setSelectedPayment}
        />
      </DataDisplay>

      <DetailsSheet
        open={!!selectedPayment}
        onOpenChange={open => !open && setSelectedPayment(null)}
        title={
          selectedPayment?.expensePlan?.title ||
          getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.title', 'Advance Payment Details')
        }
        testId="advance-payments-details-sheet"
        onClose={() => setSelectedPayment(null)}
      >
        {selectedPayment && (
          <AdvancePaymentDetails payment={selectedPayment} accessToken={props.accessToken} userInfo={props.userInfo} />
        )}
      </DetailsSheet>
    </div>
  )
}

export default AdvancePaymentsTab
