/**
 * Advance Payments Table Component
 * Displays a table of advance payments with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAdvancePayments } from '../../../hooks/useAdvancePayment'
import { useDebounce } from '@/common/hooks/useDebounce'

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
  Badge
} from '@newwork/nw-design-system'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'

import { getAdvancePaymentStatusDisplay } from '../../../utils/utils'
import AdvancePaymentDetailsBackoffice from './AdvancePaymentDetailsBackoffice'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { TablePagination } from '../../../../../components'

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = props => {
  const { search, onSearchChange, ...context } = props

  const [searchText, setSearchText] = useState(search || '')
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
  const [reporterSearchResults, setReporterSearchResults] = useState<string[]>([])
  const [reporterSearchLoading, setReporterSearchLoading] = useState(false)
  const [selectedReporters, setSelectedReporters] = useState<string[]>([])

  // Status filter states
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])

  // Selection states
  const [selectedItem, setSelectedItem] = useState<any>(null)

  const { payments, totalCount, isLoading, error, fetchPayments, searchReporters, searchStatuses } =
    useAdvancePayments(context)

  // Debounced values using useDebounce hook
  const debouncedSearchText = useDebounce(searchText, 300)
  const debouncedReporterSearchText = useDebounce(reporterSearchText, 300)

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

  // Handle debounced search for reporters
  useEffect(() => {
    const searchReportersDebounced = async () => {
      if (!debouncedReporterSearchText.trim()) {
        setReporterSearchResults([])
        return
      }

      setReporterSearchLoading(true)
      try {
        const results = await searchReporters(debouncedReporterSearchText)
        setReporterSearchResults(results)
      } catch (error) {
        console.error(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.error_searching_reporters',
            'Error searching reporters:'
          ),
          error
        )
        setReporterSearchResults([])
      } finally {
        setReporterSearchLoading(false)
      }
    }

    searchReportersDebounced()
  }, [debouncedReporterSearchText, searchReporters])

  // Handle debounced fetch payments
  useEffect(() => {
    fetchPayments({
      searchTerm: debouncedSearchText,
      page: currentPage,
      pageSize,
      status: statusFilter.length > 0 ? statusFilter.join(',') : undefined,
      amountMin: amountMinFilter,
      amountMax: amountMaxFilter,
      advanceMin: advanceMinFilter,
      advanceMax: advanceMaxFilter,
      reporter: reporterFilter
    })
  }, [
    debouncedSearchText,
    currentPage,
    pageSize,
    statusFilter,
    amountMinFilter,
    amountMaxFilter,
    advanceMinFilter,
    advanceMaxFilter,
    reporterFilter,
    fetchPayments
  ])

  // Load available statuses from backend
  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses()
        setAvailableStatuses(statuses)
      } catch (error) {
        console.error('Error loading available statuses:', error)
      }
    }

    loadAvailableStatuses()
  }, [searchStatuses])

  // Sync with parent search prop if provided
  useEffect(() => {
    if (search !== undefined && search !== searchText) {
      setSearchText(search)
      setCurrentPage(1)
    }
  }, [search, searchText])

  // Handle search changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)
      setCurrentPage(1)

      // Notify parent if callback exists
      if (onSearchChange) {
        onSearchChange(value)
      }
    },
    [onSearchChange]
  )

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.reporter-search-container')) {
        setShowReporterDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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
        <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.loading_reporters',
            'Loading reporters...'
          )}
        </div>
      )
    }

    if (reporterSearchResults.length === 0) {
      return (
        <div className="gba:p-2 gba:text-sm gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.no_reporters_found', 'No reporters found')}
        </div>
      )
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
  const getPaymentMethodLabel = useCallback((paymentMethod: string | undefined): string => {
    if (paymentMethod === 'DIRECT_DEPOSIT') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
        'Direct Deposit'
      )
    }
    if (paymentMethod) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
        'Cash Payment'
      )
    }
    return 'N/A'
  }, [])

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
          category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
          key: 'view-advance-payment-details',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.view_advance_payment_details',
            'View Advance Payment Details'
          ),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            setSelectedItem(record)
          }
        },
        {
          category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
          key: 'view-plan-details',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
            'View Plan Details'
          ),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            handleNavigateToPlanDetails(record)
          }
        }
      ]

      if (hasExpenseRequest) {
        baseFlows.push({
          category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
          key: 'view-request-details',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
            'View Request Details'
          ),
          onClick: (e?: React.MouseEvent) => {
            e?.stopPropagation()
            handleNavigateToRequestDetails(record)
          }
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
      !!advanceMaxFilter
    )
  }, [searchText, statusFilter, reporterFilter, amountMinFilter, amountMaxFilter, advanceMinFilter, advanceMaxFilter])

  // Helper: Get empty state message (reduces cognitive complexity)
  const getEmptyStateMessage = useCallback((): string => {
    return hasActiveFilters
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
          'No data available'
        )
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expense_landing_page.no_advance_payments_created_yet',
          'No advance payments created yet.'
        )
  }, [hasActiveFilters])

  // Helper: Check if showing empty state (reduces cognitive complexity)
  const isShowingEmptyState = useMemo(() => {
    return !isLoading && totalCount === 0 && (!payments || payments.length === 0)
  }, [isLoading, totalCount, payments])

  const renderDataBody = useCallback(() => {
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
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.employee_tabs.flows_button.actions',
                        'Actions'
                      )}
                    </TableHead>
                    <TableHead className="gba:w-[20%]">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.title',
                        'Title'
                      )}
                    </TableHead>
                    <TableHead className="gba:w-[15%]">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                    </TableHead>
                    <TableHead className="gba:w-[15%]">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_config_calculation_rule_list.expense_config_expense_assignement_modal.org_unit_label',
                        'Org Unit'
                      )}
                    </TableHead>
                    <TableHead className="gba:w-[12%]">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_overview.side_bar.request_cost_center',
                        'Cost Center'
                      )}
                    </TableHead>
                    <TableHead className="gba:w-[10%]">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_list_backoffice.plan_id', 'Plan Id')}
                    </TableHead>
                    <TableHead className="gba:w-[10%]">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.status',
                        'Status'
                      )}
                    </TableHead>
                    <TableHead className="gba:w-[12%] gba:text-right">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.amount',
                        'Amount'
                      )}
                    </TableHead>
                    <TableHead className="gba:w-[12%] gba:text-right">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.advance',
                        'Advance'
                      )}
                    </TableHead>
                    <TableHead className="gba:w-[12%]">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                        'Payment Method'
                      )}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isShowingEmptyState ? (
                    <TableRow>
                      <TableCell colSpan={10} className="gba:py-8 gba:text-center">
                        <div className="gba:text-gray-500">{getEmptyStateMessage()}</div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((record: any) => {
                      const status = getAdvancePaymentStatusDisplay(record.status || 'N/A')
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
                              {record.title || record.description || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div data-testid="advance-payment-reporter-cell">{record.employeeFullName || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div data-testid="advance-payment-org-unit-cell">
                              {record.expensePlan?.employee?.employeePosition?.organizationalUnit?.name || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div data-testid="advance-payment-cost-center-cell">{record.costCenter?.name || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <div data-testid="advance-payment-plan-id-cell">{record.expensePlan?.code || 'N/A'}</div>
                          </TableCell>
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
              entityNamePlural={getTranslationFromI18nKeyAndLabel(
                'lowcoder:backoffice_expense_landing_page.advance_title',
                'Advance Payments'
              )}
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

  // Helper function to format status display name with brackets (matching personal expenses pattern)
  const getStatusDisplayName = useCallback((status: string): string => {
    const statusConfig = getAdvancePaymentStatusDisplay(status)
    // Only show backend status in parentheses if the label is different from the status
    if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
      return statusConfig.label
    } else {
      // Format backend status with only first letter uppercase and translate it
      const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
      const translatedStatus = getTranslationFromI18nKeyAndLabel(
        `lowcoder:expense_statuses.${status.toLowerCase()}`,
        formattedStatus
      )
      return `${statusConfig.label} (${translatedStatus})`
    }
  }, [])

  const renderMinMaxNumberFilter = useCallback(
    (
      minValue: string,
      maxValue: string,
      setMinValue: (value: string) => void,
      setMaxValue: (value: string) => void,
      testIdPrefix: string
    ) => (
      <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground gba:w-8">Min</span>
          <input
            type="number"
            value={minValue}
            onChange={event => {
              setMinValue(event.target.value)
              setCurrentPage(1)
            }}
            className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            placeholder="Min"
            data-testid={`${testIdPrefix}-min-filter-input`}
          />
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:text-muted-foreground gba:w-8">Max</span>
          <input
            type="number"
            value={maxValue}
            onChange={event => {
              setMaxValue(event.target.value)
              setCurrentPage(1)
            }}
            className="gba:h-8 gba:w-[100px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
            placeholder="Max"
            data-testid={`${testIdPrefix}-max-filter-input`}
          />
        </div>
      </div>
    ),
    []
  )

  // Filter groups for DataContainer
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'status',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      type: 'checkbox',
      filters: availableStatuses.map(status => ({
        id: status,
        label: getStatusDisplayName(status),
        selected: statusFilter.includes(status)
      }))
    },
    {
      id: 'reporter',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
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
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:advance_payment_table.search_reporter_placeholder',
              'Search employee...'
            )}
            data-testid="reporter-search-input"
          />

          {/* Dropdown with search results */}
          {showReporterDropdown && reporterSearchText.trim() && (
            <div className="gba:absolute gba:top-full gba:left-0 gba:right-0 gba:bg-background gba:border gba:border-gray-200 gba:rounded gba:shadow-lg gba:max-h-40 gba:overflow-y-auto gba:z-10">
              {renderReporterDropdownContent()}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'amount',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
      type: 'custom',
      customComponent: renderMinMaxNumberFilter(
        amountMinFilter,
        amountMaxFilter,
        setAmountMinFilter,
        setAmountMaxFilter,
        'amount'
      )
    },
    {
      id: 'advance',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_request_list.expense_table.advance',
        'Advance'
      ),
      type: 'custom',
      customComponent: renderMinMaxNumberFilter(
        advanceMinFilter,
        advanceMaxFilter,
        setAdvanceMinFilter,
        setAdvanceMaxFilter,
        'advance'
      )
    }
  ]

  const selectedFilters: string[] = [
    ...statusFilter,
    ...(reporterFilter ? ['reporter'] : []),
    ...(amountMinFilter || amountMaxFilter ? ['amount'] : []),
    ...(advanceMinFilter || advanceMaxFilter ? ['advance'] : [])
  ]

  const filterLabelMap: Record<string, string> = {
    ...statusFilter.reduce(
      (acc, status) => {
        const statusConfig = getAdvancePaymentStatusDisplay(status)
        // Only show backend status in parentheses if the label is different from the status
        if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
          acc[status] = statusConfig.label
        } else {
          // Format backend status with only first letter uppercase and translate it
          const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
          const translatedStatus = getTranslationFromI18nKeyAndLabel(
            `lowcoder:expense_statuses.${status.toLowerCase()}`,
            formattedStatus
          )
          acc[status] = `${statusConfig.label} (${translatedStatus})`
        }
        return acc
      },
      {} as Record<string, string>
    ),
    reporter: `${getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.reporter_label', 'Reporter:')} ${selectedReporters.join(', ')}`,
    amount: `${getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.amount_label', 'Amount:')} ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
    advance: `${getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_table.advance_label', 'Advance:')} ${advanceMinFilter || '0'} - ${advanceMaxFilter || '∞'}`
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
      // Constants for filter type identification
      const isStatusFilter = (f: string) => availableStatuses.includes(f)

      // Separate filters by type
      const statusFilters = newFilters.filter(isStatusFilter)
      const hasReporter = newFilters.includes('reporter')
      const hasAmount = newFilters.includes('amount')
      const hasAdvance = newFilters.includes('advance')

      // Handle status filter changes
      const statusToRemove = selectedFilters.filter(f => isStatusFilter(f) && !statusFilters.includes(f))
      const statusToAdd = statusFilters.filter(f => !selectedFilters.includes(f))
      statusToRemove.forEach(f => handleFilterChange(f, false))
      statusToAdd.forEach(f => handleFilterChange(f, true))

      // Handle reporter filter removal
      if (!hasReporter && reporterFilter) {
        setReporterFilter('')
        setSelectedReporters([])
      }

      // Handle amount filter removal
      if (!hasAmount && (amountMinFilter || amountMaxFilter)) {
        setAmountMinFilter('')
        setAmountMaxFilter('')
      }

      // Handle advance filter removal
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
          listTitle: getTranslationFromI18nKeyAndLabel(
            'lowcoder:backoffice_expense_landing_page.advance_title',
            'Advance Payments'
          ),
          listAmount: totalCount ? `${totalCount}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.search_placeholder',
            'Search in Advance Payments'
          ),
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
      <Sheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedItem?.title ||
          selectedItem?.description ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:advance_payment_table.advance_payment_details',
            'Advance Payment Details'
          )
        }
      >
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedItem?.title ||
              selectedItem?.description ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:advance_payment_table.advance_payment_details',
                'Advance Payment Details'
              )
            }
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
