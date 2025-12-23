import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan } from '../../../hooks/useGetExpensePlans'
import { getExpensePlanStatusDisplay } from '../../../utils'
import ExpensePlanDetails from './ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails'
import { startProcess } from '@/common/utils/start-process'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Card,
  CardContent,
  Spinner,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { PiArrowUp, PiArrowDown } from 'react-icons/pi'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { useExpensePlanFileService } from '../../../utils/expensePlanFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { TablePagination } from '../../../../../components'

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable'

export interface ExpensePlansTableProps extends BusinessAppContextProps {
  items: ExpensePlan[] | undefined
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  pageSize: number
  onTableChange: (pagination: any, filters: any, sorter: any) => void
  search: string
  onSearchChange: (search: string) => void
  selectedFilters: string[]
  setFilters: (filters: string[]) => void
  filterGroups: DataFilterGroup[]
  handleFilterChange: (filterId: string, selected: boolean) => void
  clearFilters: () => void
  filterLabelMap: Record<string, string>
  addFilter: (filterId: string, selected: boolean) => void
  removeFilter: (filterId: string) => void
  tableRefreshTrigger?: number
  // injected from tab: computed currency stats for building currency group and pills
  currencyStats?: Array<{ ref: string; code: string; count: number }>
  // Sorting state from parent
  sortField?: string
  sortOrder?: 'ascend' | 'descend' | null
}

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = React.memo(props => {
  const {
    items: plans,
    isLoading,
    totalCount,
    currentPage,
    pageSize,
    onTableChange,
    search,
    selectedFilters,
    sortField,
    sortOrder,
    ...contextProps
  } = props

  // Preserve page index across search clear (search is controlled by parent via props)
  const savedPageBeforeSearchRef = useRef<number | null>(null)
  const prevSearchRef = useRef<string>('')

  const hasActiveFilters = useMemo(() => {
    const trimmedSearch = (search || '').trim()
    const nonCurrencyFilters = (selectedFilters || []).filter(f => !f.startsWith('currency:'))
    return trimmedSearch !== '' || nonCurrencyFilters.length > 0
  }, [search, selectedFilters])

  // Server-side sorting state - managed by parent component
  // Remove local sorting state as it should be managed by parent

  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null)
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<any>(null)
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)

  // Use the file service hook
  const { printExpensePlan, isMounted } = useExpensePlanFileService(props)

  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setSelectedExpenseRequest(null)
  }, [])

  // Enhanced server-side sorting handler
  const handleSort = useCallback(
    (field: string) => {
      let newOrder: 'ascend' | 'descend' | undefined

      if (sortField === field) {
        // Cycle through: ascend -> descend -> clear
        if (sortOrder === 'ascend') {
          newOrder = 'descend'
        } else if (sortOrder === 'descend') {
          newOrder = undefined
        } else {
          newOrder = 'ascend'
        }
      } else {
        // New field - start with ascend
        newOrder = 'ascend'
      }

      // Call parent's onTableChange with proper sorting parameters
      if (onTableChange) {
        onTableChange({ current: 1, pageSize }, {}, { field, order: newOrder })
      }
    },
    [onTableChange, pageSize, sortField, sortOrder]
  )

  // Helper function to render sort icon
  const renderSortIcon = useCallback(
    (field: string) => {
      if (sortField !== field) return null
      if (sortOrder === 'ascend') return <PiArrowUp className="gba:ml-1 gba:h-3 gba:w-3" />
      if (sortOrder === 'descend') return <PiArrowDown className="gba:ml-1 gba:h-3 gba:w-3" />
      return null
    },
    [sortField, sortOrder]
  )

  const handlePrintPlan = useCallback(
    async (record: ExpensePlan) => {
      setPrintLoading(true)
      setPrintModalOpen(true)

      try {
        const result = await printExpensePlan(record)

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('Error printing plan:', result.error)
        }
      } catch (error) {
        console.error('Error fetching print PDF:', error)
      } finally {
        if (isMounted.current) {
          setPrintLoading(false)
        }
      }
    },
    [printExpensePlan, isMounted]
  )

  const handleAddExpensePlan = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      // TODO: Replace with nw-design-system toast when available
      console.warn('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpensePlan',
      payload: {
        employeeId: employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo])

  const handleViewExpenseRequestDetails = useCallback((record: ExpensePlan) => {
    const requestId = (record as any)?.expenseRequest?.[0]?.id
    if (!requestId) {
      console.warn('No related expense request found on expense plan record.')
      return
    }
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: requestId,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  const handleViewExpensePlanDetails = useCallback((record: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.id,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  // Enhanced table change handler for server-side sorting
  const handleEnhancedTableChange = useCallback(
    (pagination: any, _filters: any, sorter: any) => {
      if (onTableChange) {
        onTableChange(pagination, _filters, sorter)
      }
    },
    [onTableChange]
  )

  // Use the enhanced table change handler for pagination changes as well
  const handlePagination = useCallback(
    (page: number, newPageSize?: number) => {
      const pagination = { current: page, pageSize: newPageSize || pageSize }
      handleEnhancedTableChange(pagination, {}, {})
    },
    [pageSize, handleEnhancedTableChange]
  )

  // Adapter for TablePagination component
  const handleTablePaginationChange = useCallback(
    (pagination: { current: number; pageSize: number }) => {
      handlePagination(pagination.current, pagination.pageSize)
    },
    [handlePagination]
  )

  // Watch for table refresh trigger from parent
  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0 && onTableChange) {
      // Trigger a table refresh by calling onTableChange with current pagination & current sort
      const pagination = {
        current: currentPage,
        pageSize
      }
      const sorter = sortField ? { field: sortField, order: sortOrder } : {}
      onTableChange(pagination, {}, sorter)
    }
  }, [props.tableRefreshTrigger, currentPage, pageSize, sortField, sortOrder, onTableChange])

  // Watch search prop transitions to manage page restore when cleared
  useEffect(() => {
    const prev = (prevSearchRef.current || '').trim()
    const next = (props.search || '').trim()
    if (prev === '' && next !== '') {
      // starting a search → save current page and jump to 1
      const pagination = { current: 1, pageSize, total: totalCount }
      onTableChange(pagination, {}, {})
      savedPageBeforeSearchRef.current = currentPage
    } else if (prev !== '' && next === '') {
      // clearing search → restore saved page
      const pagination = { current: savedPageBeforeSearchRef.current || 1, pageSize, total: totalCount }
      onTableChange(pagination, {}, {})
      savedPageBeforeSearchRef.current = null
    }
    prevSearchRef.current = props.search || ''
  }, [props.search, onTableChange, currentPage, pageSize, totalCount])

  const renderDataBody = useMemo(() => {
    return (
      <div className="">
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
          <CardContent className="gba:p-0">
            <div className="gba:overflow-x-auto">
              <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`}>
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead
                      className="gba:w-[50px] gba:min-w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3"
                      data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                    />
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('code')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-code-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
                          'Plan Number'
                        )}
                        {renderSortIcon('code')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('title')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-title-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')}
                        {renderSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('planDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-plan-date-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:team_expenses_page.plan_details.plan_date',
                          'Plan Date'
                        )}
                        {renderSortIcon('planDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('startDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_plan_list.expense_plan_table.start_date',
                          'Start Date'
                        )}
                        {renderSortIcon('startDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('endDate')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_plan_list.expense_plan_table.end_date',
                          'End Date'
                        )}
                        {renderSortIcon('endDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_request_list.expense_plan_table.status',
                          'Status'
                        )}
                        {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('reimbursableAmount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-reimbursable-amount-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:approve_expense_request.reimbursable',
                          'Reimbursable Amount'
                        )}
                        {renderSortIcon('reimbursableAmount')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('advancePaymentPaidAmount')}
                      data-testid={`${DATA_TEST_ID_PREFIX}-paid-advance-header`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_plan_list.expense_plan_table.paid_advance',
                          'Paid Advance'
                        )}
                        {renderSortIcon('advancePaymentPaidAmount')}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && totalCount === 0 && (!plans || plans.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="gba:py-8 gba:text-center">
                        <div className="gba:text-gray-500">
                          {hasActiveFilters
                            ? getTranslationFromI18nKeyAndLabel(
                                'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                                'No data available'
                              )
                            : getTranslationFromI18nKeyAndLabel(
                                'lowcoder:personal_expenses.no_plan_data',
                                'No expense plans found. Create your first expense plan to get started.'
                              )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans?.map(record => (
                      <TableRow
                        key={record.id}
                        className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                        onClick={() => handleSelectItem(record)}
                        data-testid={`${DATA_TEST_ID_PREFIX}-row-${record.id}`}
                      >
                        <TableCell
                          className="gba:py-4 gba:px-3"
                          data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${record.id}`}
                        >
                          <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
                            <AppActionButton
                              data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-plan-button-${record.id}`}
                              size="icon"
                              staticFlowData={[
                                ...(record.status === 'CREATED' || record.status === 'REJECTED'
                                  ? [
                                      {
                                        category: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:employee_list.flows_button.actions',
                                          'Actions'
                                        ),
                                        key: 'update-plan',
                                        label: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:expense_plan_list.expense_plan_flows.update_plan',
                                          'Update Plan'
                                        ),
                                        onClick: () => {
                                          startProcess({
                                            domain: 'employee-expense',
                                            processName: 'changeExpensePlan',
                                            payload: {
                                              employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                              expensePlanId: record.id
                                            },
                                            builderType: 'NATIVE_SCREEN'
                                          })
                                        }
                                      }
                                    ]
                                  : []),
                                ...((record.status === 'APPROVED' || record.status === 'CLOSED') &&
                                record.employeeDocument &&
                                record.employeeDocument.file &&
                                record.employeeDocument.file.trim() !== ''
                                  ? [
                                      {
                                        category: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:employee_list.flows_button.actions',
                                          'Actions'
                                        ),
                                        key: 'print',
                                        label: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:expense_plan_list.expense_plan_flows.print',
                                          'Print'
                                        ),
                                        onClick: () => {
                                          handlePrintPlan(record)
                                        }
                                      }
                                    ]
                                  : []),
                                ...(record.status === 'APPROVED'
                                  ? [
                                      {
                                        category: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:employee_list.flows_button.actions',
                                          'Actions'
                                        ),
                                        key: 'request-advance',
                                        label: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:add_items_to_plan.add_trip_info_to_plan.skip_advance_payment_label',
                                          'Request Advance Payment'
                                        ),
                                        onClick: () => {
                                          startProcess({
                                            domain: 'employee-expense',
                                            processName: 'changeAdvancePayment',
                                            payload: {
                                              employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                              expensePlan: record.id
                                            },
                                            builderType: 'NATIVE_SCREEN'
                                          })
                                        }
                                      }
                                    ]
                                  : []),
                                ...(record.status === 'APPROVED'
                                  ? [
                                      {
                                        category: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:employee_list.flows_button.actions',
                                          'Actions'
                                        ),
                                        key: 'create-expense-request',
                                        label: getTranslationFromI18nKeyAndLabel(
                                          'lowcoder:employee_list.flows_button.create_expense_request',
                                          'Create Expense Request'
                                        ),
                                        onClick: () => {
                                          startProcess({
                                            domain: 'employee-expense',
                                            processName: 'changeExpenseRequest',
                                            payload: {
                                              employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
                                              expensePlanId: record.id
                                            },
                                            builderType: 'NATIVE_SCREEN'
                                          })
                                        }
                                      }
                                    ]
                                  : []),
                                {
                                  category: getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:employee_list.flows_button.navigations',
                                    'Navigations'
                                  ),
                                  key: 'view-plan-details',
                                  label: getTranslationFromI18nKeyAndLabel(
                                    'lowcoder:expense_plan_list.expense_plan_flows.view_plan_details_btn',
                                    'View Plan Details'
                                  ),
                                  onClick: (e?: React.MouseEvent) => {
                                    e?.stopPropagation()
                                    handleViewExpensePlanDetails(record)
                                  }
                                },
                                ...(record.expenseRequest &&
                                (record.expenseRequest as unknown as any[]).length > 0 &&
                                (record.expenseRequest as unknown as any[])[0].id !== null
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
                              prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-plan`}
                              accessToken={contextProps.accessToken}
                              emptyStateBehavior="enable"
                              deferMainContextRequestsUntilClick={true}
                            />
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-code-cell-${record.id}`}
                        >
                          <div className="gba:font-medium gba:text-sm" data-testid="expense-plan-code-cell">
                            {record.code}
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-title-cell-${record.id}`}
                        >
                          <div className="gba:font-medium gba:text-sm" data-testid="expense-plan-title-cell">
                            {record.title}
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-plan-date-cell-${record.id}`}
                        >
                          {record.planDate ? (
                            <div className="gba:text-sm" data-testid="expense-plan-plan-date-cell">
                              {(() => {
                                try {
                                  return formatDate(record.planDate, 'date.short') || 'N/A'
                                } catch {
                                  return 'N/A'
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="gba:text-sm gba:text-gray-500" data-testid="expense-plan-plan-date-cell">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-start-date-cell-${record.id}`}
                        >
                          {record.startDate ? (
                            <div className="gba:text-sm" data-testid="expense-plan-start-date-cell">
                              {(() => {
                                try {
                                  return formatDate(record.startDate, 'date.short') || 'N/A'
                                } catch {
                                  return 'N/A'
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="gba:text-sm gba:text-gray-500" data-testid="expense-plan-start-date-cell">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-end-date-cell-${record.id}`}
                        >
                          {record.endDate ? (
                            <div className="gba:text-sm" data-testid="expense-plan-end-date-cell">
                              {(() => {
                                try {
                                  return formatDate(record.endDate, 'date.short') || 'N/A'
                                } catch {
                                  return 'N/A'
                                }
                              })()}
                            </div>
                          ) : (
                            <span className="gba:text-sm gba:text-gray-500" data-testid="expense-plan-end-date-cell">
                              N/A
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6"
                          data-testid={`${DATA_TEST_ID_PREFIX}-status-cell-${record.id}`}
                        >
                          {(() => {
                            const statusConfig = getExpensePlanStatusDisplay(record.status)
                            return (
                              <Badge
                                variant={(statusConfig as any).badgeVariant || 'outline'}
                                data-testid="expense-plan-status-cell"
                              >
                                {statusConfig.label}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6 gba:text-right"
                          data-testid={`${DATA_TEST_ID_PREFIX}-reimbursable-amount-cell-${record.id}`}
                        >
                          <div
                            className="gba:text-sm gba:font-medium"
                            data-testid="expense-plan-reimbursable-amount-cell"
                          >
                            {record.reimbursableAmount
                              ? formatCurrencyDisplay(record.reimbursableAmount, record.currency?.code)
                              : formatCurrencyDisplay(0, record.currency?.code)}
                          </div>
                        </TableCell>
                        <TableCell
                          className="gba:py-4 gba:px-6 gba:text-right"
                          data-testid={`${DATA_TEST_ID_PREFIX}-paid-advance-cell-${record.id}`}
                        >
                          <div className="gba:text-sm gba:font-medium" data-testid="expense-plan-paid-advance-cell">
                            {record.advancePaymentPaidAmount && record.advancePaymentPaidAmount > 0
                              ? formatCurrencyDisplay(record.advancePaymentPaidAmount, record.currency?.code)
                              : '-'}
                          </div>
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
              entityNamePlural={getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
                'Expense Plans'
              )}
              dataTestIdPrefix={DATA_TEST_ID_PREFIX}
              showBorder={false}
            />
          </CardContent>
        </Card>
      </div>
    )
  }, [
    plans,
    isLoading,
    selectedItem,
    handleSelectItem,
    contextProps.accessToken,
    totalCount,
    pageSize,
    currentPage,
    handlePagination,
    sortField,
    sortOrder,
    handleSort,
    renderSortIcon
  ])

  return (
    <div>
      <DataContainer
        dataControllerProps={{
          search: props.search,
          setSearch: props.onSearchChange,
          filter: props.selectedFilters,
          setFilter: props.setFilters,
          filterLabelMap: useMemo(() => {
            const currencyLabelMap: Record<string, string> = {}
            ;(props.currencyStats || []).forEach(cs => {
              currencyLabelMap[`currency:${cs.ref}`] = cs.code
            })

            // Ensure selected currency filters always have a readable label (e.g. "EUR"),
            // even when currencyStats is empty or does not include the selected ref.
            ;(props.selectedFilters || [])
              .filter(token => token.startsWith('currency:'))
              .forEach(token => {
                if (!currencyLabelMap[token]) {
                  const ref = token.substring('currency:'.length)
                  const codeFromRef = (ref.split(':').pop() || '').toUpperCase()
                  currencyLabelMap[token] = codeFromRef || ref
                }
              })

            return { ...props.filterLabelMap, ...currencyLabelMap }
          }, [props.filterLabelMap, props.currencyStats, props.selectedFilters]),
          placeholder:
            getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
            '...',
          addButton: {
            onClick: handleAddExpensePlan,
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
              'Add'
            ),
            'data-testid': 'add-expense-plan-button'
          },
          listTitle: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.title', 'My Expense Plans'),
          listAmount: totalCount ? `${totalCount}` : undefined
        }}
        dataFilterProps={{
          filterGroups: useMemo(() => {
            const currencyFilters =
              props.currencyStats?.map(cs => ({
                id: `currency:${cs.ref}`,
                label: cs.code,
                selected: (props.selectedFilters || []).includes(`currency:${cs.ref}`)
              })) || []
            const currencyGroup =
              currencyFilters.length > 0
                ? [
                    {
                      id: 'currency',
                      title: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                        'Currency'
                      ),
                      filters: currencyFilters
                    }
                  ]
                : []
            return [...currencyGroup, ...props.filterGroups]
          }, [props.filterGroups, props.selectedFilters, (props as any).currencyStats]),
          onFilterChange: props.handleFilterChange
        }}
        hideFilter={false}
        dataBody={renderDataBody}
        addLeftPaddingWhenNoFilter={true}
      />

      {/* Expense Plan Details Sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedItem?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:approve_expense_plan.expense_subtitle_details',
            'Expense Plan Details'
          )
        }
        data-testid="expense-plan-details-sheet"
      >
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedItem?.title ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:approve_expense_plan.expense_subtitle_details',
                  'Expense Plan Details'
                )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedItem && (
              <ExpensePlanDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Expense Request Details Sheet */}
      <Sheet
        open={!!selectedExpenseRequest}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedExpenseRequest?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
            'Expense Request Details'
          )
        }
        data-testid="expense-request-details-sheet"
      >
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedExpenseRequest?.title ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
                  'Expense Request Details'
                )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedExpenseRequest && (
              <ExpenseRequestDetails
                selectedItem={selectedExpenseRequest}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Print Dialog using design system */}
      <Dialog
        open={printModalOpen}
        onOpenChange={open => {
          if (!open) {
            setPrintModalOpen(false)
            setPrintPdfUrl('')
          }
        }}
      >
        <DialogContent
          className="gba:!w-[90vw] gba:!max-w-[90vw] gba:!p-0 gba:!rounded-md"
          style={{ height: '90vh' }}
          data-testid="print-plan-modal"
        >
          <DialogHeader className="gba:p-4">
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.print_expense_plan', 'Print Expense Plan')}
            </DialogTitle>
          </DialogHeader>
          {printLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
              <Spinner />
            </div>
          ) : (
            <iframe
              src={printPdfUrl}
              className="gba:w-full gba:border-0"
              style={{ height: 'calc(90vh - 55px)' }}
              title="Print Preview"
              data-testid="print-plan-iframe"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
})

export default ExpensePlansTable
