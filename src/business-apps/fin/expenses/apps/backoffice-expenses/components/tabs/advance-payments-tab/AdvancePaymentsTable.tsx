/**
 * Advance Payments Table Component
 * Displays a table of advance payments with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useFilterData } from '../../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../../utils/departmentOptions'
import dayjs from 'dayjs'

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Alert,
  Spinner,
  Card,
  CardContent,
  Sheet,
  SheetContent,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import translations from '../../../_i18n'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import useCloseDropdownOnOutsideClick from '../common/useCloseDropdownOnOutsideClick'
import withStoppedPropagation from '../common/withStoppedPropagation'

import { useBackofficeAsyncSearch } from '../../../hooks/useBackofficeAsyncSearch'
import { getErrorMessage } from '../../../utils/errorUtils'
import { getAdvancePaymentStatusDisplay } from '../../../utils/utils'
import { buildStatusDisplayName } from '../../../utils/sharedUtils'
import { getCurrencyLabel, getDepartmentLabel } from '../common/backofficeFilterLabels'
import MinMaxNumberFilter from '../common/MinMaxNumberFilter'
import DepartmentSelectFilter from '../common/DepartmentSelectFilter'
import CurrencySelectFilter from '../common/CurrencySelectFilter'
import AdvancePaymentDetailsBackoffice from './AdvancePaymentDetailsBackoffice'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { TablePagination } from '../../../../../components'
import type { AdvancePaymentItem } from '../../../types'
import type { FetchPaymentsOptions } from '../../../hooks/useAdvancePayment'

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  isActive?: boolean
  payments: AdvancePaymentItem[]
  totalCount: number
  isLoading: boolean
  error: unknown
  fetchPayments: (options?: FetchPaymentsOptions) => Promise<void>
  searchReporters: (searchTerm: string) => Promise<string[]>
  searchStatuses: () => Promise<string[]>
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = props => {
  const {
    search,
    onSearchChange,
    payments,
    totalCount,
    isLoading,
    error,
    fetchPayments,
    searchReporters,
    searchStatuses,
    ...context
  } = props
  const { t } = useTranslation(translations)
  // Pre-register common advance payment details bundle so the details sidebar shows translated labels on first render
  useTranslation(advancePaymentDetailsTranslations)

  const [searchText, setSearchText] = useState(search ?? '')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  // Deterministic scroll target for pagination (top of table)
  const tableTopRef = useRef<HTMLDivElement | null>(null)

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [amountMinFilter, setAmountMinFilter] = useState('')
  const [amountMaxFilter, setAmountMaxFilter] = useState('')
  const [advanceMinFilter, setAdvanceMinFilter] = useState('')
  const [advanceMaxFilter, setAdvanceMaxFilter] = useState('')
  const [reporterFilter, setReporterFilter] = useState('')

  // Reporter search states
  const [reporterSearchText, setReporterSearchText] = useState('')
  const [showReporterDropdown, setShowReporterDropdown] = useState(false)
  const [selectedReporters, setSelectedReporters] = useState<string[]>([])

  // Currency, department, and date filter states
  const [currencyRef, setCurrencyRef] = useState<string>('')
  const [departmentId, setDepartmentId] = useState<string>('')

  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')

  // Status filter states
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])

  // Selection states
  const [selectedItem, setSelectedItem] = useState<any>(null)

  // Filter data (currencies, departments)
  const { organizationalUnits = [], currencies = [] } = useFilterData({ accessToken: context.accessToken }) || {}
  const departmentOptions = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits),
    [organizationalUnits]
  )

  // Debounced values using useDebounce hook
  const debouncedSearchText = useDebounce(searchText, 300)
  const debouncedReporterSearchText = useDebounce(reporterSearchText, 300)
  const debouncedAmountMin = useDebounce(amountMinFilter, 500)
  const debouncedAmountMax = useDebounce(amountMaxFilter, 500)
  const debouncedAdvanceMin = useDebounce(advanceMinFilter, 500)
  const debouncedAdvanceMax = useDebounce(advanceMaxFilter, 500)

  const { results: reporterSearchResults, loading: reporterSearchLoading } = useBackofficeAsyncSearch<string>({
    query: debouncedReporterSearchText,
    searchFn: searchReporters,
    logContext: 'Error searching reporters:'
  })

  // Navigation handler for plan details
  const handleNavigateToPlanDetails = useCallback((record: any) => {
    if (record.expensePlan?.id) {
      const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
        expensePlanId: record.expensePlan.id,
        referrer: '/platform/fin/expenses/backoffice-expenses?tab=advance-payments'
      })
      navigateTo(url)
    }
  }, [])

  // Navigation handler for request details
  const handleNavigateToRequestDetails = useCallback((record: any) => {
    const expenseRequest = record.expenseRequest
    if (expenseRequest?.id) {
      const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
        expenseRequestId: expenseRequest.id,
        referrer: '/platform/fin/expenses/backoffice-expenses?tab=advance-payments'
      })
      navigateTo(url)
    }
  }, [])

  // Handle debounced fetch payments
  useEffect(() => {
    fetchPayments({
      searchTerm: debouncedSearchText,
      page: currentPage,
      pageSize,
      status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
      amountMin: debouncedAmountMin,
      amountMax: debouncedAmountMax,
      advanceMin: debouncedAdvanceMin,
      advanceMax: debouncedAdvanceMax,
      reporter: reporterFilter,
      currencyRef: currencyRef || undefined,
      departmentId: departmentId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined
    })
  }, [
    debouncedSearchText,
    currentPage,
    pageSize,
    statusFilter,
    debouncedAmountMin,
    debouncedAmountMax,
    debouncedAdvanceMin,
    debouncedAdvanceMax,
    reporterFilter,
    currencyRef,
    departmentId,
    dateFrom,
    dateTo,
    fetchPayments
  ])

  // Load available statuses from backend
  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses()
        setAvailableStatuses(statuses)
      } catch (error) {
        console.error('Error loading available statuses:', getErrorMessage(error))
      }
    }

    loadAvailableStatuses()
  }, [searchStatuses])

  // Sync with parent search prop if provided
  useEffect(() => {
    const normalizedSearch = search ?? ''
    if (normalizedSearch !== searchText) {
      setSearchText(normalizedSearch)
      setCurrentPage(1)
    }
  }, [search, searchText])

  // Handle search changes
  const handleSearchChange = useCallback(
    (value: string = '') => {
      setSearchText(value)
      setCurrentPage(1)
      onSearchChange?.(value)
    },
    [onSearchChange]
  )

  useCloseDropdownOnOutsideClick({
    containerClassName: 'reporter-search-container',
    onOutsideClick: () => setShowReporterDropdown(false)
  })

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
  }, [])

  // Helper function to handle reporter selection (reduces nesting depth)
  const handleReporterClick = useCallback(
    (reporter: string) => {
      const newSelected = selectedReporters.includes(reporter)
        ? selectedReporters.filter(r => r !== reporter)
        : [...selectedReporters, reporter]
      setSelectedReporters(newSelected)
      setReporterFilter(newSelected.join(','))
      setCurrentPage(1)
    },
    [selectedReporters]
  )

  // Helper function to render reporter dropdown content (reduces nested ternary complexity)
  const renderReporterDropdownContent = useCallback(() => {
    if (reporterSearchLoading) {
      return (
        <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">{t('advance-payment-loading-reporters')}</div>
      )
    }

    if (reporterSearchResults.length === 0) {
      return <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">{t('advance-payment-no-reporters')}</div>
    }

    return reporterSearchResults.map(reporter => (
      <button
        key={reporter}
        className={`gba:w-full gba:text-left gba:p-2 gba:text-sm gba:hover:bg-muted gba:transition-colors ${
          selectedReporters.includes(reporter) ? 'gba:bg-accent gba:text-accent-foreground' : 'gba:text-foreground'
        }`}
        onClick={() => handleReporterClick(reporter)}
        data-testid={`reporter-option-${reporter}`}
      >
        {reporter}
      </button>
    ))
  }, [reporterSearchLoading, reporterSearchResults, selectedReporters, handleReporterClick])

  // Enhanced table change handler for sorting
  const handleEnhancedTableChange = (pagination: any) => {
    setCurrentPage(pagination.current)
    setPageSize(pagination.pageSize)
  }

  // Adapter for TablePagination component
  const handleTablePaginationChange = useCallback((pagination: { current: number; pageSize: number }) => {
    handleEnhancedTableChange(pagination)
  }, [])

  // Helper: Check if record has expense request (reduces cognitive complexity)
  const checkHasExpenseRequest = useCallback((record: any): boolean => {
    return !!(
      record.expensePlan &&
      Array.isArray(record.expensePlan.expenseRequest) &&
      record.expensePlan.expenseRequest.length > 0 &&
      record.expensePlan.expenseRequest[0]?.id
    )
  }, [])

  // Helper: Get payment method label (reduces cognitive complexity)
  const getPaymentMethodLabel = useCallback(
    (paymentMethod: string | undefined): string => {
      if (paymentMethod === 'DIRECT_DEPOSIT') {
        return t('advance-payment-direct-deposit')
      }
      if (paymentMethod) {
        return t('advance-payment-cash')
      }
      return t('common-not-available')
    },
    [t]
  )

  // Helper: Handle row click (reduces cognitive complexity)
  const handleRowClick = useCallback((event: React.MouseEvent<HTMLTableRowElement>, record: any) => {
    const target = event.target as HTMLElement
    const isActionButton = target.closest('[data-testid*="actions"]')
    if (!isActionButton) {
      setSelectedItem(record)
    }
  }, [])

  // Helper: Build action button flow data (reduces cognitive complexity)
  const buildActionButtonFlowData = useCallback(
    (record: any) => {
      const hasExpenseRequest = checkHasExpenseRequest(record)
      const baseFlows = [
        {
          category: t('action-navigations'),
          key: 'view-advance-payment-details',
          label: t('advance-payment-view-details'),
          onClick: withStoppedPropagation(() => setSelectedItem(record))
        },
        {
          category: t('action-navigations'),
          key: 'view-plan-details',
          label: t('action-view-plan-details'),
          onClick: withStoppedPropagation(() => handleNavigateToPlanDetails(record))
        }
      ]

      if (hasExpenseRequest) {
        baseFlows.push({
          category: t('action-navigations'),
          key: 'view-request-details',
          label: t('action-view-request-details'),
          onClick: withStoppedPropagation(() => handleNavigateToRequestDetails(record))
        })
      }

      return baseFlows
    },
    [checkHasExpenseRequest, handleNavigateToPlanDetails, handleNavigateToRequestDetails]
  )

  // Calculate hasActiveFilters before renderDataBody (needed by helpers)
  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchText || '').trim() !== ''
    return (
      hasSearch ||
      statusFilter.length > 0 ||
      !!reporterFilter ||
      !!amountMinFilter ||
      !!amountMaxFilter ||
      !!advanceMinFilter ||
      !!advanceMaxFilter ||
      !!currencyRef ||
      !!departmentId ||
      !!dateFrom ||
      !!dateTo
    )
  }, [
    searchText,
    statusFilter,
    reporterFilter,
    amountMinFilter,
    amountMaxFilter,
    advanceMinFilter,
    advanceMaxFilter,
    currencyRef,
    departmentId,
    dateFrom,
    dateTo
  ])

  // Helper: Get empty state message (reduces cognitive complexity)
  const getEmptyStateMessage = useCallback((): string => {
    return hasActiveFilters ? t('empty-no-data') : t('advance-payment-no-payments-yet')
  }, [hasActiveFilters])

  // Helper: Check if showing empty state (reduces cognitive complexity)
  const isShowingEmptyState = useMemo(() => {
    return !isLoading && totalCount === 0 && (!payments || payments.length === 0)
  }, [isLoading, totalCount, payments])

  const renderDataBody = useCallback(() => {
    const renderSimpleValueCell = (value: string | undefined, testId: string) => (
      <TableCell>
        <div data-testid={testId}>{value || t('common-not-available')}</div>
      </TableCell>
    )

    if (isLoading && !payments?.length) {
      return (
        <div className="gba:flex gba:justify-center gba:p-8">
          <Spinner />
        </div>
      )
    }

    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return <Alert variant="destructive">{errorMessage}</Alert>
    }

    return (
      <div ref={tableTopRef} data-testid="advance-payments-scroll-anchor">
        <Card data-testid="advance-payments-container">
          <CardContent className="gba:p-0">
            {isLoading && (
              <div className="gba:flex gba:justify-center gba:p-4">
                <Spinner />
              </div>
            )}

            <div className="gba:overflow-x-auto gba:max-w-full gba:px-6">
              <Table data-testid="advance-payments-data-table" className="gba:min-w-[1400px] gba:w-full">
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-muted">
                    <TableHead className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border">
                      {t('header-actions')}
                    </TableHead>
                    <TableHead className="gba:w-[20%]">{t('header-title')}</TableHead>
                    <TableHead className="gba:w-[15%]">{t('header-employee')}</TableHead>
                    <TableHead className="gba:w-[15%]">{t('header-org-unit')}</TableHead>
                    <TableHead className="gba:w-[12%]">{t('header-cost-center')}</TableHead>
                    <TableHead className="gba:w-[10%]">{t('header-plan-id')}</TableHead>
                    <TableHead className="gba:w-[10%]">{t('header-status')}</TableHead>
                    <TableHead className="gba:w-[12%] gba:text-right">{t('header-amount')}</TableHead>
                    <TableHead className="gba:w-[12%] gba:text-right">{t('header-advance')}</TableHead>
                    <TableHead className="gba:w-[12%]">{t('header-payment-method')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isShowingEmptyState ? (
                    <TableRow>
                      <TableCell colSpan={10} className="gba:py-8 gba:text-center">
                        <div className="gba:text-muted-foreground">{getEmptyStateMessage()}</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((record: any) => {
                      const status = getAdvancePaymentStatusDisplay(record.status || t('common-not-available'), t)
                      const currencyCode = record.currency?.code || record.expensePlan?.currency?.code || ''

                      return (
                        <TableRow
                          key={record.id}
                          onClick={e => handleRowClick(e, record)}
                          className="gba:cursor-pointer gba:hover:bg-muted"
                        >
                          <TableCell className="gba:w-[60px]">
                            <div
                              className="gba:flex gba:justify-center gba:items-center"
                              onClick={e => e.stopPropagation()}
                            >
                              <AppActionButton
                                data-testid={`advance-payments-update-button-${record.id}`}
                                size="icon"
                                staticFlowData={buildActionButtonFlowData(record)}
                                prefixDataTestId="advance-payments-update"
                                accessToken={props.accessToken}
                                emptyStateBehavior="enable"
                                deferMainContextRequestsUntilClick
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div data-testid="advance-payment-title-cell">
                              {record.title || record.description || t('common-not-available')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div data-testid="advance-payment-reporter-cell">
                              {record.employeeFullName || t('common-not-available')}
                            </div>
                          </TableCell>
                          {renderSimpleValueCell(
                            record.expensePlan?.employee?.employeePosition?.organizationalUnit?.name,
                            'advance-payment-org-unit-cell'
                          )}
                          {renderSimpleValueCell(record.costCenter?.name, 'advance-payment-cost-center-cell')}
                          {renderSimpleValueCell(record.expensePlan?.code, 'advance-payment-plan-id-cell')}
                          <TableCell>
                            <div data-testid="advance-payment-status-cell">
                              <Badge variant={(status as any).badgeVariant || 'outline'}>{status.label}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="gba:text-right">
                            <span data-testid="advance-payment-amount-cell">
                              {formatNumberFunction(String(record.expensePlan?.totalAmount ?? '0'))} {currencyCode}
                            </span>
                          </TableCell>
                          <TableCell className="gba:text-right">
                            <span data-testid="advance-payment-advance-cell">
                              {formatNumberFunction(String(record.amount ?? '0'))} {currencyCode}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div data-testid="advance-payment-method-cell">
                              {getPaymentMethodLabel(record.paymentMethod)}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalCount}
              onPageChange={handleTablePaginationChange}
              scrollTargetRef={tableTopRef}
              entityNamePlural={t('tab-advance-payments')}
              dataTestIdPrefix="advance-payments"
              showBorder={false}
            />
          </CardContent>
        </Card>
      </div>
    )
  }, [
    payments,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    handleEnhancedTableChange,
    props.accessToken,
    isShowingEmptyState,
    getEmptyStateMessage,
    handleRowClick,
    buildActionButtonFlowData,
    getPaymentMethodLabel
  ])

  const getStatusDisplayName = useCallback(
    (status: string): string => buildStatusDisplayName(status, getAdvancePaymentStatusDisplay, t),
    [t]
  )

  const resetPage = useCallback(() => setCurrentPage(1), [])

  // Helper: Get date range label for filter chip
  const getDateRangeLabel = useCallback((): string => {
    const from = dateFrom ? dayjs(dateFrom).format('DD/MM/YYYY') : ''
    const to = dateTo ? dayjs(dateTo).format('DD/MM/YYYY') : ''
    if (from && to) return t('chip-date', { from, to })
    if (from) return t('chip-date-from', { from })
    if (to) return t('chip-date-to', { to })
    return t('chip-date-label')
  }, [dateFrom, dateTo])

  // Filter groups for DataContainer
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'status',
      title: t('filter-status'),
      type: 'checkbox',
      filters: availableStatuses.map(status => ({
        id: status,
        label: getStatusDisplayName(status),
        selected: statusFilter.includes(status)
      }))
    },
    {
      id: 'reporter',
      title: t('filter-employee'),
      type: 'custom',
      customComponent: (
        <div className="reporter-search-container gba:relative gba:p-2">
          <input
            type="text"
            value={reporterSearchText}
            onChange={e => {
              setReporterSearchText(e.target.value)
              setShowReporterDropdown(true)
            }}
            onFocus={() => setShowReporterDropdown(true)}
            className="gba:h-8 gba:w-full gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            placeholder={t('filter-search-employee')}
            data-testid="reporter-search-input"
          />
          {showReporterDropdown && reporterSearchText.trim() && (
            <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-background gba:border gba:border-input gba:rounded gba:max-h-40 gba:overflow-y-auto gba:z-10">
              {renderReporterDropdownContent()}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'currency',
      title: t('filter-currency'),
      type: 'custom',
      customComponent: (
        <CurrencySelectFilter
          currencyRef={currencyRef}
          onCurrencyChange={val => {
            setCurrencyRef(val)
            setCurrentPage(1)
          }}
          currencies={currencies}
          testIdPrefix="advance-payments"
          t={t}
        />
      )
    },
    {
      id: 'department',
      title: t('filter-department'),
      type: 'custom',
      customComponent: (
        <DepartmentSelectFilter
          departmentId={departmentId}
          onDepartmentChange={val => {
            setDepartmentId(val)
            setCurrentPage(1)
          }}
          departmentOptions={departmentOptions}
          testIdPrefix="advance-payments"
          t={t}
        />
      )
    },
    {
      id: 'dateRange',
      title: t('filter-date-range'),
      type: 'custom',
      customComponent: (
        <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-from')}</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value)
                setCurrentPage(1)
              }}
              className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="advance-payments-date-from-input"
            />
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-to')}</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value)
                setCurrentPage(1)
              }}
              className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
              data-testid="advance-payments-date-to-input"
            />
          </div>
        </div>
      )
    },
    {
      id: 'amount',
      title: t('filter-amount'),
      type: 'custom',
      customComponent: (
        <MinMaxNumberFilter
          minValue={amountMinFilter}
          maxValue={amountMaxFilter}
          onMinChange={setAmountMinFilter}
          onMaxChange={setAmountMaxFilter}
          testIdPrefix="amount"
          onPageReset={resetPage}
        />
      )
    },
    {
      id: 'advance',
      title: t('filter-advance'),
      type: 'custom',
      customComponent: (
        <MinMaxNumberFilter
          minValue={advanceMinFilter}
          maxValue={advanceMaxFilter}
          onMinChange={setAdvanceMinFilter}
          onMaxChange={setAdvanceMaxFilter}
          testIdPrefix="advance"
          onPageReset={resetPage}
        />
      )
    }
  ]

  const selectedFilters: string[] = [
    ...statusFilter,
    ...(reporterFilter ? ['reporter'] : []),
    ...(currencyRef ? ['currency'] : []),
    ...(departmentId ? ['department'] : []),
    ...(dateFrom || dateTo ? ['dateRange'] : []),
    ...(amountMinFilter || amountMaxFilter ? ['amount'] : []),
    ...(advanceMinFilter || advanceMaxFilter ? ['advance'] : [])
  ]

  const filterLabelMap: Record<string, string> = {
    ...statusFilter.reduce(
      (acc, status) => {
        acc[status] = getStatusDisplayName(status)
        return acc
      },
      {} as Record<string, string>
    ),
    reporter: `${t('advance-payment-reporter-label')} ${selectedReporters.join(', ')}`,
    currency: getCurrencyLabel(currencyRef, currencies),
    department: getDepartmentLabel(departmentId, departmentOptions),
    dateRange: getDateRangeLabel(),
    amount: `${t('advance-payment-amount-label')} ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
    advance: `${t('advance-payment-advance-label')} ${advanceMinFilter || '0'} - ${advanceMaxFilter || '∞'}`
  }

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      // Check if this is a status filter (any of the available statuses)
      if (availableStatuses.includes(filterId)) {
        const newStatusFilter = selected
          ? [...statusFilter, filterId]
          : statusFilter.filter(status => status !== filterId)
        setStatusFilter(newStatusFilter)
        setCurrentPage(1)
      }
    },
    [availableStatuses, statusFilter]
  )

  // Handle individual filter removal
  const handleSetFilter = useCallback(
    (newFilters: string[]): void => {
      const isStatusFilter = (f: string) => availableStatuses.includes(f)

      const statusFilters = newFilters.filter(isStatusFilter)
      const hasReporter = newFilters.includes('reporter')
      const hasCurrency = newFilters.includes('currency')
      const hasDepartment = newFilters.includes('department')
      const hasDateRange = newFilters.includes('dateRange')
      const hasAmount = newFilters.includes('amount')
      const hasAdvance = newFilters.includes('advance')

      const statusToRemove = selectedFilters.filter(f => isStatusFilter(f) && !statusFilters.includes(f))
      const statusToAdd = statusFilters.filter(f => !selectedFilters.includes(f))
      statusToRemove.forEach(f => handleFilterChange(f, false))
      statusToAdd.forEach(f => handleFilterChange(f, true))

      if (!hasReporter && reporterFilter) {
        setReporterFilter('')
        setSelectedReporters([])
      }
      if (!hasCurrency && currencyRef) {
        setCurrencyRef('')
      }
      if (!hasDepartment && departmentId) {
        setDepartmentId('')
      }
      if (!hasDateRange && (dateFrom || dateTo)) {
        setDateFrom('')
        setDateTo('')
      }
      if (!hasAmount && (amountMinFilter || amountMaxFilter)) {
        setAmountMinFilter('')
        setAmountMaxFilter('')
      }
      if (!hasAdvance && (advanceMinFilter || advanceMaxFilter)) {
        setAdvanceMinFilter('')
        setAdvanceMaxFilter('')
      }

      setCurrentPage(1)
    },
    [
      availableStatuses,
      selectedFilters,
      reporterFilter,
      currencyRef,
      departmentId,
      dateFrom,
      dateTo,
      amountMinFilter,
      amountMaxFilter,
      advanceMinFilter,
      advanceMaxFilter,
      handleFilterChange
    ]
  )

  return (
    <div className="gba:relative gba:w-full gba:h-full gba:-mx-6" data-testid="advance-payments-table-wrapper">
      <DataContainer
        contentBackground="white"
        dataControllerProps={{
          listTitle: t('tab-advance-payments'),
          listAmount: totalCount ? `${totalCount}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: t('advance-payment-search'),
          filter: totalCount === 0 && !isLoading ? [] : selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap: filterLabelMap,
          actions: []
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange as (filterId: string, selected: boolean) => void
        }}
        dataBody={renderDataBody()}
      />
      <Sheet open={!!selectedItem} onOpenChange={open => !open && handleCloseDetails()}>
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={selectedItem?.title || selectedItem?.description || t('advance-payment-details-title')}
          >
            {selectedItem ? (
              <AdvancePaymentDetailsBackoffice
                payment={selectedItem}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            ) : null}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default AdvancePaymentsTable
