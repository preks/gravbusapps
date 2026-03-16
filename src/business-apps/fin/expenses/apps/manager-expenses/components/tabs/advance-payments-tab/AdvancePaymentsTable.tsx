import React, { useState, useCallback, useMemo, useRef } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Alert,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Sheet,
  SheetContent,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import advancePaymentDetailsTranslations from '@/business-apps/fin/expenses/common/_i18n'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'

import { ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getAdvancePaymentStatusDisplay } from '../../../utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ensureShortDateFormat } from '../../../utils/dateUtils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AdvancePayment as AdvancePaymentItem } from '../../../hooks/useMainViewAdvancePayments'
import AdvancePaymentDetails from './AdvancePaymentDetails'
import { TablePagination } from '../../../../../components'

interface AdvancePaymentsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  activeFilter?: string[] | null
  onFilterChange?: (filter: string[] | null) => void
  onClearFilters?: () => void
  currencyFilter?: string
  // Data from parent hook
  advancePayments?: AdvancePaymentItem[]
  loading?: boolean
  error?: Error | null
  totalCount?: number
  currentPage?: number
  setCurrentPage?: (page: number) => void
  sorting?: { field: string; direction: 'asc' | 'desc' } | null
  updateSorting?: (field: string) => void
  pageSize?: number
  setPageSize?: (size: number) => void
}

const AdvancePaymentsTable: React.FC<AdvancePaymentsTableProps> = props => {
  // Extract context props for passing to child components
  const contextProps = React.useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  // Pre-register common advance payment details bundle so the details sidebar shows translated labels on first render
  useTranslation(advancePaymentDetailsTranslations)

  // Deterministic scroll target for pagination (top of table)
  const tableTopRef = useRef<HTMLDivElement | null>(null)

  // Use data from props if provided (from parent Tab), otherwise fall back to local hook
  const payments = props.advancePayments
  const isLoading = props.loading ?? false
  const error = props.error ?? null
  const totalCount = props.totalCount ?? 0
  const currentPage = props.currentPage ?? 1
  const setCurrentPage = props.setCurrentPage ?? (() => {})
  const sorting = props.sorting ?? null
  const updateSorting = props.updateSorting ?? (() => {})
  const pageSize = props.pageSize ?? 20
  const setPageSize = props.setPageSize ?? (() => {})
  const currencyFilter = props.currencyFilter ?? ''

  // Local state management
  const [selectedPayment, setSelectedPayment] = useState<AdvancePaymentItem | null>(null)

  // Filter payments based on data from props
  const filteredPayments = useMemo(() => payments || [], [payments])

  // Track if any filters are active to control empty-state messaging
  const hasActiveFilters = useMemo(() => {
    const hasSearch = (props.search || '').trim() !== ''
    const hasStatusFilters = Array.isArray(props.activeFilter) && props.activeFilter.length > 0
    const hasCurrencyFilter = !!currencyFilter

    return hasSearch || hasStatusFilters || hasCurrencyFilter
  }, [props.search, props.activeFilter, currencyFilter])

  const handleViewExpensePlanDetails = useCallback((record: AdvancePaymentItem) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.expensePlan?.id ?? '',
      referrer: '/platform/fin/expenses/manager-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  const handleViewExpenseRequestDetails = useCallback((record: AdvancePaymentItem) => {
    const expenseRequests = record.expensePlan?.expenseRequest
    const firstExpenseRequest = Array.isArray(expenseRequests) && expenseRequests.length > 0 ? expenseRequests[0] : null

    if (!firstExpenseRequest?.id) {
      return
    }

    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: firstExpenseRequest.id,
      referrer: '/platform/fin/expenses/manager-expenses?tab=advance-payments'
    })
    navigateTo(url)
  }, [])

  // Handle page size changes
  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize)
      setCurrentPage(1)
    },
    [setPageSize, setCurrentPage]
  )

  // Adapter for TablePagination component
  const handleTablePaginationChange = useCallback(
    (pagination: { current: number; pageSize: number }) => {
      setCurrentPage(pagination.current)
      setPageSize(pagination.pageSize)
    },
    [setCurrentPage, setPageSize]
  )

  // Small helpers to reduce cognitive complexity of render function
  const renderErrorAlert = useCallback(() => {
    return (
      <Alert variant="destructive" data-testid="advance-payments-error-alert">
        <div className="gba:font-medium">
          {getTranslationFromI18nKeyAndLabel('lowcoder:advance_payments.error_title', 'Error loading advance payments')}
        </div>
        <div className="gba:text-sm gba:py-3 gba:px-4">
          {error?.message ||
            getTranslationFromI18nKeyAndLabel(
              'lowcoder:advance_payments.error_description',
              'An error occurred while loading advance payments.'
            )}
        </div>
      </Alert>
    )
  }, [error])

  const renderTableContent = useCallback(() => {
    return (
      <div
        className="gba:border gba:border-border gba:rounded-md"
        ref={tableTopRef}
        data-testid="advance-payments-scroll-anchor"
      >
        {/* Table with horizontal scrolling */}
        <div className="gba:overflow-x-auto gba:pr-4 gba:border-b gba:border-border">
          <Table data-testid="advance-payments-table" className="gba:w-full">
            <TableHeader className="gba:sticky gba:top-0 gba:bg-background gba:z-10 gba:border-b gba:border-border">
              <TableRow>
                <TableHead
                  className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:bg-muted gba:font-semibold"
                  data-testid="advance-payments-actions-header"
                ></TableHead>
                <TableHead
                  className="gba:w-[18%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => updateSorting('expensePlan.title')}
                  data-testid="advance-payments-title-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_request.initial_expense_plan_select_label',
                        'Expense Plan'
                      )}
                    </span>
                    {sorting?.field === 'expensePlan.title' &&
                      sorting?.direction &&
                      (sorting.direction === 'asc' ? (
                        <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => updateSorting('expensePlan.startDate')}
                  data-testid="advance-payments-start-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date')}
                    </span>
                    {sorting?.field === 'expensePlan.startDate' &&
                      sorting?.direction &&
                      (sorting.direction === 'asc' ? (
                        <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => updateSorting('expensePlan.endDate')}
                  data-testid="advance-payments-end-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date')}</span>
                    {sorting?.field === 'expensePlan.endDate' &&
                      sorting?.direction &&
                      (sorting.direction === 'asc' ? (
                        <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => updateSorting('expensePlan.employee.fullName')}
                  data-testid="advance-payments-employee-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_config_calculation_rule_list.expense_table.employee',
                        'Employee'
                      )}
                    </span>
                    {sorting?.field === 'expensePlan.employee.fullName' &&
                      sorting?.direction &&
                      (sorting.direction === 'asc' ? (
                        <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => updateSorting('createdAt')}
                  data-testid="advance-payments-creation-date-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.creation_date',
                        'Creation Date'
                      )}
                    </span>
                    {sorting?.field === 'createdAt' &&
                      sorting?.direction &&
                      (sorting.direction === 'asc' ? (
                        <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => updateSorting('amount')}
                  data-testid="advance-payments-amount-header"
                >
                  <div className="gba:flex gba:items-center gba:justify-start gba:gap-1">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')}</span>
                    {sorting?.field === 'amount' &&
                      sorting?.direction &&
                      (sorting.direction === 'asc' ? (
                        <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold gba:pr-6"
                  onClick={() => updateSorting('status')}
                  data-testid="advance-payments-status-header"
                >
                  <div className="gba:flex gba:items-center gba:gap-1">
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.status', 'Status')}
                    </span>
                    {sorting?.field === 'status' &&
                      sorting?.direction &&
                      (sorting.direction === 'asc' ? (
                        <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
                      ) : (
                        <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
                      ))}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && totalCount === 0 && filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="gba:py-8 gba:text-center"
                    data-testid="advance-payments-empty-state"
                  >
                    <div className="gba:text-muted-foreground">
                      {hasActiveFilters
                        ? getTranslationFromI18nKeyAndLabel(
                            'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                            'No data available'
                          )
                        : getTranslationFromI18nKeyAndLabel(
                            'lowcoder:manager_expense_landing_page.no_advance_payments_created_by_team',
                            'No advance payment created by your team yet.'
                          )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map(record => (
                  <TableRow
                    key={record.id}
                    className="gba:cursor-pointer gba:hover:bg-accent"
                    onClick={() => setSelectedPayment(record)}
                  >
                    <TableCell
                      className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:py-3 gba:px-4"
                      data-testid={`advance-payments-actions-cell-${record.id}`}
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          onClick={e => e.stopPropagation()}
                          data-testid={`advance-payments-update-button-${record.id}`}
                          size="icon"
                          staticFlowData={[
                            ...(record.expensePlan?.id
                              ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:employee_list.flows_button.navigations',
                                      'Navigations'
                                    ),
                                    key: 'view-plan-details',
                                    label: getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details',
                                      'View Plan Details'
                                    ),
                                    onClick: (e?: React.MouseEvent) => {
                                      e?.stopPropagation()
                                      handleViewExpensePlanDetails(record)
                                    }
                                  }
                                ]
                              : []),
                            ...(record.expensePlan?.expenseRequest &&
                            Array.isArray(record.expensePlan.expenseRequest) &&
                            record.expensePlan.expenseRequest.length > 0 &&
                            record.expensePlan.expenseRequest[0].id
                              ? [
                                  {
                                    category: getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:employee_list.flows_button.navigations',
                                      'Navigations'
                                    ),
                                    key: 'view-request-details',
                                    label: getTranslationFromI18nKeyAndLabel(
                                      'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                                      'View Request Details'
                                    ),
                                    onClick: (e?: React.MouseEvent) => {
                                      e?.stopPropagation()
                                      handleViewExpenseRequestDetails(record)
                                    }
                                  }
                                ]
                              : [])
                          ]}
                          prefixDataTestId="advance-payments-update"
                          accessToken={props.accessToken}
                          emptyStateBehavior="enable"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-left gba:py-3 gba:px-4 gba:w-[18%]">
                      <div className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate">
                        {record.expensePlan?.title ??
                          getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                      </div>
                      <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
                        {record.expensePlan?.code ??
                          getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                      {ensureShortDateFormat(record.expensePlan?.startDate)}
                    </TableCell>
                    <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                      {ensureShortDateFormat(record.expensePlan?.endDate)}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Avatar className="gba:h-6 gba:w-6">
                          <AvatarImage
                            src={
                              record.expensePlan?.employee?.pictureThumbnail
                                ? `data:image/gif;base64,${record.expensePlan.employee.pictureThumbnail}`
                                : undefined
                            }
                            alt={record.expensePlan?.employee?.fullName || record.expensePlan?.employee?.displayName}
                          />
                          <AvatarFallback>
                            {record.expensePlan?.employee?.displayName?.charAt(0) ||
                              record.expensePlan?.employee?.fullName?.charAt(0) ||
                              'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="gba:font-medium gba:text-sm">
                          {(() => {
                            const emp = record.expensePlan?.employee as any
                            const full = (emp?.fullName || '').trim()
                            const fallback = `${emp?.firstName || ''} ${emp?.lastName || ''}`.trim()
                            const name = full || fallback || (emp?.displayName || '').trim()
                            if (name) return name
                            // When employee is missing or has no name, show plan identifier instead of generic N/A
                            const planLabel = record.expensePlan?.title?.trim() || record.expensePlan?.code?.trim()
                            return (
                              planLabel || getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
                            )
                          })()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                      {ensureShortDateFormat(record.createdAt)}
                    </TableCell>
                    <TableCell className="gba:text-right" data-testid={`advance-payments-amount-cell-${record.id}`}>
                      <span className="gba:font-medium gba:text-sm">
                        {(() => {
                          const rawCurrencyRef = record.currencyRef || currencyFilter || ''
                          const normalizedCurrencyRef = rawCurrencyRef
                            ? rawCurrencyRef.split('Currency:v1:').pop() || rawCurrencyRef
                            : 'EUR'

                          return typeof record.amount === 'number'
                            ? formatCurrencyDisplay(record.amount, normalizedCurrencyRef)
                            : formatCurrencyDisplay(0, 'EUR')
                        })()}
                      </span>
                    </TableCell>
                    <TableCell className="gba:pr-6 gba:w-[20%]">
                      {(() => {
                        const statusConfig = getAdvancePaymentStatusDisplay(record.status)
                        return (
                          <Badge
                            variant={statusConfig.badgeVariant}
                            data-testid={`status-pill-${record.status.toLowerCase()}`}
                          >
                            {statusConfig.label}
                          </Badge>
                        )
                      })()}
                    </TableCell>
                  </TableRow>
                ))
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
      </div>
    )
  }, [
    filteredPayments,
    totalCount,
    pageSize,
    currentPage,
    currencyFilter,
    setCurrentPage,
    updateSorting,
    handlePageSizeChange,
    sorting
  ])

  // Render the table (low-complexity orchestrator)
  const renderDataBody = useCallback(() => {
    if (error) return renderErrorAlert()
    return renderTableContent()
  }, [error, renderErrorAlert, renderTableContent])

  return (
    <>
      {renderDataBody()}

      {/* Advance Payment Details Sheet */}
      <Sheet
        open={!!selectedPayment}
        onOpenChange={open => !open && setSelectedPayment(null)}
        data-testid="advance-payments-details-sheet"
        title={
          selectedPayment?.expensePlan?.title ||
          getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.title', 'Advance Payment Details')
        }
      >
        <SheetContent side="right" className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedPayment?.expensePlan?.title ||
              getTranslationFromI18nKeyAndLabel('lowcoder:advance_payment_details.title', 'Advance Payment Details')
            }
            onClose={() => setSelectedPayment(null)}
            dataTestIdPrefix="advance-payment-details"
          >
            {selectedPayment && <AdvancePaymentDetails payment={selectedPayment} {...contextProps} />}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default AdvancePaymentsTable
