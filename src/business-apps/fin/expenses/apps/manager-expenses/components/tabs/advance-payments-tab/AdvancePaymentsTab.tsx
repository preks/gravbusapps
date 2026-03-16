import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { DataDisplay } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { advancePaymentFilterStatuses } from '../../../hooks/availableFilterStatuses'
import { ExpenseStatus, getAdvancePaymentStatusDisplay } from '../../../utils'
import AdvancePaymentStatistics from './AdvancePaymentStatistics'
import AdvancePaymentsTable from './AdvancePaymentsTable'
import AdvancePaymentDetails from './AdvancePaymentDetails'
import { DetailsSheet } from '../../../common/components/DetailsSheet'
import { CurrencyDropdown } from '../../../common/components/CurrencyDropdown'
import { useAdvancePaymentCurrencies } from '../../../hooks/useAdvancePaymentCurrencies'
import { useAdvancePaymentsOverviewData } from '../../../hooks/useAdvancePaymentsOverviewData'
import { createAdvancePaymentFilterConfig } from './config/advancePaymentFilterConfig'
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
  const [statusFilter, setStatusFilter] = useState<string[]>([ExpenseStatus.PENDING])
  const [primaryCurrency, setCurrencyFilter] = useState<string | null>(null)
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

  const payOrderBy = useMemo(() => {
    if (!sorting.field || !sorting.order) return [{ createdAt: 'DESC' } as const]
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

  const hasInitializedCurrency = useRef(false)
  useEffect(() => {
    if (hasInitializedCurrency.current) return
    if (!primaryCurrency && mostUsedCurrency) {
      hasInitializedCurrency.current = true
      setCurrencyFilter(mostUsedCurrency)
    }
  }, [primaryCurrency, mostUsedCurrency])

  const filterLabelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const status of advancePaymentFilterStatuses) {
      const statusConfig = getAdvancePaymentStatusDisplay(status)
      if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
        map[status] = statusConfig.label
      } else {
        const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
        const translatedStatus = getTranslationFromI18nKeyAndLabel(
          `lowcoder:expense_statuses.${status.toLowerCase()}`,
          formattedStatus
        )
        map[status] = `${statusConfig.label} (${translatedStatus})`
      }
    }
    return map
  }, [])

  const filterConfiguration = useMemo(
    () =>
      createAdvancePaymentFilterConfig({
        statusOptions: advancePaymentFilterStatuses,
        filterLabelMap
      }),
    [filterLabelMap]
  )

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

  const handleCurrencyChange = useCallback((code: string | null) => {
    setCurrencyFilter(code)
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
