import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan } from '../../../hooks/useGetExpensePlans'
import { getExpensePlanStatusDisplay } from '../../../utils'
import ExpensePlanDetails from './ExpensePlanDetails'
import ExpenseRequestDetails from '../expense-requests-tab/ExpenseRequestDetails'
import { startProcess } from '@/common/utils/start-process'
import { Spinner, Badge, Sheet, SheetContent } from '@newwork/nw-design-system'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@newwork/nw-design-system'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { useExpensePlanFileService } from '../../../utils/expensePlanFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'

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

  const dataControllerFilterLabelMap = useMemo(() => {
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
  }, [props.filterLabelMap, props.currencyStats, props.selectedFilters])

  const dataFilterGroups = useMemo(() => {
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
  }, [props.filterGroups, props.selectedFilters, props.currencyStats])

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

  const sorting = useMemo(
    () => (sortOrder ? [{ id: sortField || 'createdAt', desc: sortOrder === 'descend' }] : []),
    [sortField, sortOrder]
  )
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (!onTableChange) return
      const entry = newSorting[0]
      const field = entry?.id || 'createdAt'
      const order = entry ? (entry.desc ? 'descend' : 'ascend') : undefined
      onTableChange({ current: 1, pageSize }, {}, { field, order })
    },
    [onTableChange, pageSize]
  )
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])
  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      if (!onTableChange) return
      onTableChange({ current: newPagination.pageIndex + 1, pageSize: newPagination.pageSize }, {}, {})
    },
    [onTableChange]
  )
  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_plan_data',
        'No expense plans found. Create your first expense plan to get started.'
      )

  const columns = useMemo<ColumnDef<ExpensePlan>[]>(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
          'Plan Number'
        ),
        size: 120,
        cell: ({ row }) => (
          <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-plan-code-cell">
            {row.original.code}
          </div>
        )
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title'),
        size: 200,
        cell: ({ row }) => (
          <div className="gba:font-medium gba:text-sm gba:truncate" data-testid="expense-plan-title-cell">
            {row.original.title}
          </div>
        )
      },
      {
        id: 'planDate',
        accessorKey: 'planDate',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
        size: 110,
        cell: ({ row }) =>
          row.original.planDate ? (
            <div className="gba:text-sm gba:truncate" data-testid="expense-plan-plan-date-cell">
              {(() => {
                try {
                  return formatDate(row.original.planDate, 'date.short') || 'N/A'
                } catch {
                  return 'N/A'
                }
              })()}
            </div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
          )
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.start_date',
          'Start Date'
        ),
        size: 110,
        cell: ({ row }) =>
          row.original.startDate ? (
            <div className="gba:text-sm gba:truncate" data-testid="expense-plan-start-date-cell">
              {(() => {
                try {
                  return formatDate(row.original.startDate, 'date.short') || 'N/A'
                } catch {
                  return 'N/A'
                }
              })()}
            </div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
          )
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date'),
        size: 110,
        cell: ({ row }) =>
          row.original.endDate ? (
            <div className="gba:text-sm gba:truncate" data-testid="expense-plan-end-date-cell">
              {(() => {
                try {
                  return formatDate(row.original.endDate, 'date.short') || 'N/A'
                } catch {
                  return 'N/A'
                }
              })()}
            </div>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">N/A</span>
          )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        size: 100,
        cell: ({ row }) => {
          const statusConfig = getExpensePlanStatusDisplay(row.original.status)
          return (
            <Badge variant={(statusConfig as any).badgeVariant || 'outline'} data-testid="expense-plan-status-cell">
              {statusConfig.label}
            </Badge>
          )
        }
      },
      {
        id: 'reimbursableAmount',
        accessorKey: 'reimbursableAmount',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:approve_expense_request.reimbursable',
          'Reimbursable Amount'
        ),
        size: 140,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <div
            className="gba:text-right gba:text-sm gba:font-mono gba:truncate"
            data-testid="expense-plan-reimbursable-amount-cell"
          >
            {row.original.reimbursableAmount
              ? formatCurrencyDisplay(row.original.reimbursableAmount, row.original.currency?.code)
              : formatCurrencyDisplay(0, row.original.currency?.code)}
          </div>
        )
      },
      {
        id: 'advancePaymentPaidAmount',
        accessorKey: 'advancePaymentPaidAmount',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.paid_advance',
          'Paid Advance'
        ),
        size: 120,
        meta: { align: 'right' as const },
        cell: ({ row }) => (
          <div
            className="gba:text-right gba:text-sm gba:font-mono gba:truncate"
            data-testid="expense-plan-paid-advance-cell"
          >
            {row.original.advancePaymentPaidAmount && row.original.advancePaymentPaidAmount > 0 ? (
              formatCurrencyDisplay(row.original.advancePaymentPaidAmount, row.original.currency?.code)
            ) : (
              <span className="gba:text-muted-foreground">-</span>
            )}
          </div>
        )
      }
    ],
    []
  )

  const rowActions = useCallback(
    (row: { original: ExpensePlan }) => {
      const record = row.original
      return (
        <div className="gba:flex gba:justify-end gba:gap-2" onClick={e => e.stopPropagation()}>
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
              ...((record.status === 'APPROVED' || record.status === 'CLOSED') && record.employeeDocument?.file?.trim()
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
                      onClick: () => handlePrintPlan(record)
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
              (record.expenseRequest as unknown as any[])[0].id != null
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
            deferMainContextRequestsUntilClick
          />
        </div>
      )
    },
    [
      contextProps.userInfo?.employeeDetails?.employeeId,
      contextProps.accessToken,
      handlePrintPlan,
      handleViewExpensePlanDetails,
      handleViewExpenseRequestDetails
    ]
  )

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
      // clearing search → restore saved page, but validate it's not beyond available pages
      const savedPage = savedPageBeforeSearchRef.current || 1
      const maxPages = Math.max(1, Math.ceil(totalCount / pageSize))
      const validPage = savedPage > maxPages ? 1 : savedPage
      const pagination = { current: validPage, pageSize, total: totalCount }
      onTableChange(pagination, {}, {})
      savedPageBeforeSearchRef.current = null
    }
    prevSearchRef.current = props.search || ''
  }, [props.search, onTableChange, currentPage, pageSize, totalCount])

  return (
    <div>
      <DataContainer
        dataControllerProps={{
          search: props.search,
          setSearch: props.onSearchChange,
          filter: props.selectedFilters,
          setFilter: props.setFilters,
          filterLabelMap: dataControllerFilterLabelMap,
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
          filterGroups: dataFilterGroups,
          onFilterChange: props.handleFilterChange
        }}
        hideFilter={false}
        dataBody={
          <DataTable<ExpensePlan>
            data={plans || []}
            columns={columns}
            loading={isLoading}
            error={props.error || undefined}
            totalCount={totalCount}
            sorting={sorting}
            onSortingChange={handleSortingChange}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            enablePagination
            enableSorting
            enableSelection={false}
            enableColumnPinning
            enableResizing={false}
            tableLayout="fixed"
            rowsPerPageOptions={[10, 20, 50, 100]}
            showPageNumbers
            maxVisiblePages={7}
            emptyMessage={emptyMessage}
            actions={rowActions}
            onRowClick={handleSelectItem}
            data-testid={DATA_TEST_ID_PREFIX}
          />
        }
        addLeftPaddingWhenNoFilter={true}
      />

      {/* Expense Plan Details Sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        data-testid="expense-plan-details-sheet"
      >
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedItem?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:approve_expense_plan.expense_subtitle_details',
                'Expense Plan Details'
              )
            }
          >
            {selectedItem ? (
              <ExpensePlanDetails
                selectedItem={selectedItem}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            ) : null}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>

      {/* Expense Request Details Sheet */}
      <Sheet
        open={!!selectedExpenseRequest}
        onOpenChange={open => !open && handleCloseDetails()}
        data-testid="expense-request-details-sheet"
      >
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedExpenseRequest?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
                'Expense Request Details'
              )
            }
          >
            {selectedExpenseRequest ? (
              <ExpenseRequestDetails
                selectedItem={selectedExpenseRequest}
                onClose={handleCloseDetails}
                accessToken={props.accessToken}
                userInfo={props.userInfo}
              />
            ) : null}
          </ExpenseDetailsShell>
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
