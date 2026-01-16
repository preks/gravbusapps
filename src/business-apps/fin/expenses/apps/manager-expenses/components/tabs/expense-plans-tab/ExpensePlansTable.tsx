import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Spinner,
  Sheet,
  SheetContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { PiArrowUp, PiArrowDown } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { ExpensePlan, SortField } from '../../../hooks/useMainViewExpensePlans'
import { getExpensePlanStatusDisplay, ExpenseStatus } from '../../../utils'

// Status → token classes (design-system)
const PLAN_STATUS_CLASSES: Record<string, string> = {
  success: 'gba:bg-success gba:text-success-foreground',
  warning: 'gba:bg-warning gba:text-warning-foreground',
  info: 'gba:bg-info gba:text-info-foreground',
  destructive: 'gba:bg-destructive gba:text-destructive-foreground',
  offline: 'gba:bg-offline gba:text-offline-foreground',
  draft: 'gba:bg-muted gba:text-muted-foreground',
  completed: 'gba:bg-success gba:text-success-foreground',
  waiting: 'gba:bg-info gba:text-info-foreground',
  task: 'gba:bg-warning gba:text-warning-foreground',
  error: 'gba:bg-destructive gba:text-destructive-foreground',
  preparing: 'gba:bg-muted gba:text-muted-foreground'
}
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { useExpensePlanFileService } from '../../../../../common/files/useExpensePlanFileService'
import ExpensePlanDetails from './ExpensePlanDetails'
import { ensureShortDateFormat } from '../../../utils/dateUtils'
import { TablePagination } from '../../../../../components'

interface ExpensePlansTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  employeeId?: string
  activeFilter?: ExpenseStatus[] | null
  onFilterChange?: (filter: ExpenseStatus[] | null) => void
  onClearFilters?: () => void
  onViewDetails?: (plan: ExpensePlan) => void
  currencyFilter?: string | null
  expensePlans: ExpensePlan[]
  loading: boolean
  error: Error | null
  totalCount: number
  currentPage: number
  setCurrentPage: (page: number) => void
  sorting: any
  updateSorting: (field: SortField) => void
  pageSize: number
  setPageSize: (size: number) => void
}

const DATA_TEST_ID_PREFIX = 'ExpensePlansTable'

const ExpensePlansTable: React.FC<ExpensePlansTableProps> = props => {
  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  // Use parent's filter state directly
  const currentStatusFilter = props.activeFilter || []

  // Use the currency filter passed from parent instead of global store
  const currentCurrencyFilter = props.currencyFilter || 'EUR'

  // Set up local state
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)
  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null)

  // Use the file service hook
  const { printExpensePlan, isMounted } = useExpensePlanFileService(contextProps)

  // Get expense plans data and functions from props
  const {
    expensePlans,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    sorting,
    updateSorting,
    pageSize,
    setPageSize
  } = props

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (props.search || '').trim() !== ''
    const hasStatusFilters = Array.isArray(props.activeFilter) && props.activeFilter.length > 0
    return hasSearch || hasStatusFilters
  }, [props.search, props.activeFilter])

  // Reset page to 1 when filter changes (fixes pagination issue when switching filters)
  const prevFilterRef = useRef<ExpenseStatus[] | null>(null)
  useEffect(() => {
    const currentFilterStr = JSON.stringify(currentStatusFilter)
    const prevFilterStr = JSON.stringify(prevFilterRef.current)

    // Only reset page if filter actually changed (not on initial render)
    if (prevFilterRef.current !== null && currentFilterStr !== prevFilterStr) {
      setCurrentPage(1)
    }

    // Update the ref with current filter
    prevFilterRef.current = currentStatusFilter
  }, [currentStatusFilter, setCurrentPage])

  // Handle selecting an item for details view
  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item)
  }, [])

  // Handle closing details
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
  }, [])

  // Handle viewing details for a plan
  const handleViewDetails = useCallback((plan: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: plan.id,
      referrer: '/platform/fin/expenses/manager-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  // Handle printing a plan
  const handlePrintPlan = useCallback(
    async (plan: ExpensePlan) => {
      setPrintLoading(true)
      setPrintModalOpen(true)

      try {
        const result = await printExpensePlan(plan as any)

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('[Print Error]', result.error)
        }
      } catch (error) {
        console.error('[Print Exception]', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        if (isMounted.current) {
          setPrintLoading(false)
        }
      }
    },
    [printExpensePlan, isMounted]
  )

  // Sorting handler
  const handleSort = useCallback(
    (field: SortField) => {
      updateSorting(field)
    },
    [updateSorting]
  )

  // Render sort indicator
  const renderSortIndicator = useCallback(
    (field: SortField) => {
      if (sorting.lastField === field && sorting.order !== null) {
        return sorting.order === 'ASC' ? (
          <PiArrowUp className="gba:inline gba:ml-1" size={12} />
        ) : (
          <PiArrowDown className="gba:inline gba:ml-1" size={12} />
        )
      }
      return null
    },
    [sorting]
  )

  // Adapter for TablePagination component
  const handleTablePaginationChange = useCallback(
    (pagination: { current: number; pageSize: number }) => {
      setCurrentPage(pagination.current)
      setPageSize(pagination.pageSize)
    },
    [setCurrentPage, setPageSize]
  )

  // Show error state
  if (error) {
    return (
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center"
        data-testid={`${DATA_TEST_ID_PREFIX}-error-state`}
      >
        <div className="gba:text-muted-foreground gba:mb-4">{error.message}</div>
        <Button
          variant="default"
          onClick={() => globalThis.location.reload()}
          data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}
        >
          Retry
        </Button>
      </div>
    )
  }

  // Show loading state
  if (loading && !expensePlans.length) {
    return (
      <div className="gba:flex gba:justify-center gba:p-8" data-testid="expense-plans-loading">
        <Spinner />
      </div>
    )
  }

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      {/* Table with border containing both table and pagination */}
      <div className="gba:border gba:border-border gba:rounded-md">
        {/* Table with horizontal scrolling and fixed height */}
        <div className="gba:overflow-x-auto gba:pr-4 gba:border-b gba:border-border">
          <Table data-testid={`${DATA_TEST_ID_PREFIX}-table`} className="gba:w-full">
            <TableHeader className="gba:sticky gba:top-0 gba:bg-background gba:z-10 gba:border-b gba:border-border">
              <TableRow>
                <TableHead
                  className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:bg-muted gba:font-semibold"
                  data-testid={`${DATA_TEST_ID_PREFIX}-actions-header`}
                ></TableHead>
                <TableHead
                  className="gba:w-[18%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => handleSort('title')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-title-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')}
                    {renderSortIndicator('title')}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[10%] gba:bg-muted gba:font-semibold">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_request_list.expense_request_filter.request_number_input',
                    'Request Code'
                  )}
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => handleSort('startDate')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-start-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date')}
                    {renderSortIndicator('startDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => handleSort('endDate')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-end-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date')}

                    {renderSortIndicator('endDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => handleSort('employee.fullName')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-employee-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                    {renderSortIndicator('employee.fullName')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => handleSort('createdAt')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-creation-date-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:manager_expense_request_list.expense_table.creation_date',
                      'Creation Date'
                    )}
                    {renderSortIndicator('createdAt')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold"
                  onClick={() => handleSort('totalAmount')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-amount-header`}
                >
                  <div className="gba:flex gba:items-center gba:justify-start">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:sales_hub.amount', 'Amount')}
                    {renderSortIndicator('totalAmount')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none gba:bg-muted gba:font-semibold gba:pr-6"
                  onClick={() => handleSort('status')}
                  data-testid={`${DATA_TEST_ID_PREFIX}-status-header`}
                >
                  <div className="gba:flex gba:items-center">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_request_list.expense_plan_table.status',
                      'Status'
                    )}
                    {renderSortIndicator('status')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loading && totalCount === 0 && (!expensePlans || expensePlans.length === 0) ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="gba:py-8 gba:text-center"
                    data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
                  >
                    <div className="gba:text-muted-foreground">
                      {hasActiveFilters
                        ? getTranslationFromI18nKeyAndLabel(
                            'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                            'No data available'
                          )
                        : getTranslationFromI18nKeyAndLabel(
                            'lowcoder:manager_expense_landing_page.no_plans_created_by_team',
                            'No expense plan created by your team yet.'
                          )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                expensePlans.map((plan: ExpensePlan) => {
                  const display = getExpensePlanStatusDisplay(plan.status as ExpenseStatus)
                  return (
                    <TableRow
                      key={plan.id}
                      data-testid={`${DATA_TEST_ID_PREFIX}-row-${plan.id}`}
                      className={`gba:cursor-pointer gba:hover:bg-accent gba:transition-colors ${
                        selectedItem?.id === plan.id ? 'gba:bg-accent/50' : ''
                      }`}
                      onClick={() => handleSelectItem(plan)}
                    >
                      <TableCell
                        className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:py-3 gba:px-4"
                        data-testid={`${DATA_TEST_ID_PREFIX}-actions-cell-${plan.id}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            onClick={e => e.stopPropagation()}
                            data-testid={`${DATA_TEST_ID_PREFIX}-update-expense-plan-button-${plan.id}`}
                            size="icon"
                            staticFlowData={[
                              // Print action - only available for finalized plans with documents
                              ...((plan.status === 'APPROVED' ||
                                plan.status === 'VERIFIED' ||
                                plan.status === 'BOOKED' ||
                                plan.status === 'TRANSFERRED' ||
                                plan.status === 'PAID') &&
                              plan.employeeDocument?.file?.trim()
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
                                      onClick: (e?: React.MouseEvent) => {
                                        e?.stopPropagation()
                                        handlePrintPlan(plan)
                                      }
                                    }
                                  ]
                                : []),
                              // View Plan Details - always available
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
                                  handleViewDetails(plan)
                                }
                              }
                            ]}
                            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update-expense-plan`}
                            accessToken={contextProps.accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick
                          />
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-left gba:py-3 gba:px-4 gba:w-[18%]">
                        <div className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate">
                          {plan.title}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
                          {plan.code || getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                        </div>
                      </TableCell>
                      <TableCell className="gba:w-[10%] gba:py-4 gba:px-3 gba:text-sm">
                        {Array.isArray(plan.expenseRequest) && plan.expenseRequest.length > 0
                          ? plan.expenseRequest[0]?.code ||
                            getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
                          : getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                        {plan.startDate
                          ? ensureShortDateFormat(plan.startDate)
                          : getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                      </TableCell>
                      <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                        {plan.endDate
                          ? ensureShortDateFormat(plan.endDate)
                          : getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Avatar className="gba:h-6 gba:w-6">
                            <AvatarImage
                              src={
                                plan.employee?.pictureThumbnail
                                  ? `data:image/gif;base64,${plan.employee.pictureThumbnail}`
                                  : undefined
                              }
                              alt={plan.employee?.fullName}
                            />
                            <AvatarFallback>{plan.employee?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                          </Avatar>
                          <span className="gba:font-medium gba:text-sm">{plan.employee?.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-sm gba:py-3 gba:px-4">
                        {plan.createdAt
                          ? ensureShortDateFormat(plan.createdAt)
                          : getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                      </TableCell>
                      <TableCell className="gba:text-right">
                        <span className="gba:font-medium gba:text-sm">
                          {typeof plan.totalAmount === 'number'
                            ? formatCurrencyDisplay(plan.totalAmount, currentCurrencyFilter || plan.currency || 'EUR')
                            : formatCurrencyDisplay(0, currentCurrencyFilter || plan.currency || 'EUR')}
                        </span>
                      </TableCell>
                      <TableCell className="gba:pr-6 gba:w-[20%]">
                        <span
                          className={`gba:inline-block gba:rounded-full gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:whitespace-nowrap ${
                            PLAN_STATUS_CLASSES[String(display.type).toLowerCase()] || PLAN_STATUS_CLASSES.draft
                          }`}
                          data-testid={`status-pill-${String(display.type).toLowerCase()}`}
                        >
                          {display.label}
                        </span>
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
          entityNamePlural={getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
            'Expense Plans'
          )}
          dataTestIdPrefix={DATA_TEST_ID_PREFIX}
          showBorder={false}
        />
      </div>

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
            <DialogTitle>{getTranslationFromI18nKeyAndLabel('lowcoder:print.title', 'Print Expense Plan')}</DialogTitle>
          </DialogHeader>
          {printLoading ? (
            <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
              <Spinner />
            </div>
          ) : printPdfUrl ? (
            <iframe
              src={printPdfUrl}
              className="gba:w-full gba:border-0"
              style={{ height: 'calc(90vh - 55px)' }}
              title={getTranslationFromI18nKeyAndLabel('lowcoder:print.preview_title', 'Print Preview')}
              data-testid="print-plan-iframe"
            />
          ) : (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
              <div className="gba:text-muted-foreground gba:mb-4">
                {getTranslationFromI18nKeyAndLabel('lowcoder:print.no_document', 'No document available for printing')}
              </div>
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:print.no_document_details',
                  'This expense plan does not have an associated document to print.'
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
        <SheetContent side="right" className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedItem?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:approve_expense_plan.expense_subtitle_details',
                'Expense Plan Details'
              )
            }
            onClose={handleCloseDetails}
            dataTestIdPrefix="expense-plan-details"
          >
            {selectedItem && (
              <ExpensePlanDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={contextProps.accessToken}
                userInfo={contextProps.userInfo}
              />
            )}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(ExpensePlansTable)
