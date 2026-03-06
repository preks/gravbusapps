import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { DataTable } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Spinner,
  Sheet,
  SheetContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import { Badge } from '@newwork/nw-design-system'
import ExpenseRequestDetails from './ExpenseRequestDetails'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { startProcess } from '@/common/utils/start-process'
import { useExpenseRequestFileService } from '../../../utils/expenseRequestFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import translations from '../../../_i18n'

type ExpenseRequestRow = {
  id: string
  code?: string
  title?: string
  requestDate?: string
  startDate?: string
  endDate?: string
  status?: string
  reimbursableAmount?: number
  currency?: { code?: string }
  expensePlan?: { advancePaymentAggregate?: { aggregate?: { sum?: { amount?: number } } } }
  employeeDocument?: { file?: string }
}

export interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  items?: any[]
  isLoading?: boolean
  error?: string | null
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onTableChange?: (pagination: any, filters: any, sorter: any) => void
  search?: string
  onSearchChange?: (search: string) => void
  selectedFilters?: string[]
  setFilters?: (filters: string[]) => void
  filterGroups?: any[]
  handleFilterChange?: (filterId: string, selected: boolean) => void
  clearFilters?: () => void
  filterLabelMap?: Record<string, string>
  onAddExpenseRequest?: () => void
  tableRefreshTrigger?: number
  addFilter?: (filterId: string) => void
  removeFilter?: (filterId: string) => void
}

const DEFAULT_PAGE_SIZE = 20
const DATA_TEST_ID_PREFIX = 'expense-requests'

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = React.memo(props => {
  const { t: tPersonal } = useTranslation(translations)

  // Extract only the necessary props to prevent unnecessary re-renders
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  // Use props passed from parent instead of hook directly
  const {
    items = [],
    isLoading = false,
    error = null,
    totalCount = 0,
    currentPage = 1,
    pageSize = DEFAULT_PAGE_SIZE,
    onTableChange,
    search = '',
    onSearchChange,
    selectedFilters = [],
    setFilters,
    filterGroups = [],
    // handleFilterChange not used locally; provided to DataContainer via wrapper
    // clearFilters not used locally
    filterLabelMap = {},
    onAddExpenseRequest,
    tableRefreshTrigger
  } = props

  // Local search state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(search || '')

  // Debounced search term for API calls
  const debouncedSearchTerm = useDebounce(searchInput, 300)

  // Server-side sorting state
  const [sortField, setSortField] = useState<string>('requestDate')
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | undefined>('descend')
  // Preserve page index across search clear
  const savedPageBeforeSearchRef = useRef<number | null>(null)
  const prevDebouncedSearchRef = useRef<string>('')
  // Selected item for details panel
  const [selectedItem, setSelectedItem] = useState<(typeof items)[0] | null>(null)

  // Selected row keys for table (not used currently) – removed to satisfy linter

  // Print functionality state
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)

  // Use the file service hook
  const { printExpenseRequest, isMounted } = useExpenseRequestFileService(props)

  // Track if any filters are active to show conditional messages
  const hasActiveFilters = useMemo(() => {
    const trimmedSearch = (search || '').trim()
    return trimmedSearch !== '' || selectedFilters.length > 0
  }, [search, selectedFilters])

  useEffect(() => {
    if (!isLoading && totalCount > 0 && currentPage > 1 && onTableChange) {
      const lastPage = Math.max(1, Math.ceil(totalCount / pageSize))
      if (currentPage > lastPage) {
        onTableChange({ current: lastPage, pageSize }, {}, { field: sortField, order: sortOrder })
      }
    }
  }, [isLoading, totalCount, currentPage, pageSize, onTableChange, sortField, sortOrder])

  // Sync local search input with prop changes
  useEffect(() => {
    setSearchInput(search || '')
  }, [search])

  // Call parent callback when debounced search changes and manage pagination restore
  useEffect(() => {
    const prev = (prevDebouncedSearchRef.current || '').trim()
    const next = (debouncedSearchTerm || '').trim()

    // Manage pagination transitions for search
    if (prev === '' && next !== '') {
      // Starting a new search → save current page and jump to page 1
      if (onTableChange && currentPage !== 1) {
        onTableChange({ current: 1, pageSize }, {}, { field: sortField, order: sortOrder })
      }
      savedPageBeforeSearchRef.current = currentPage
    } else if (prev !== '' && next === '') {
      // Clearing search → restore saved page if available
      if (onTableChange) {
        onTableChange(
          { current: savedPageBeforeSearchRef.current || 1, pageSize },
          {},
          { field: sortField, order: sortOrder }
        )
      }
      savedPageBeforeSearchRef.current = null
    } else if (prev !== next && next !== '') {
      // Search term changed while already in search mode → reset to first page
      if (onTableChange && currentPage !== 1) {
        onTableChange({ current: 1, pageSize }, {}, { field: sortField, order: sortOrder })
      }
    }

    if (onSearchChange && debouncedSearchTerm !== search) {
      onSearchChange(debouncedSearchTerm)
    }
    prevDebouncedSearchRef.current = debouncedSearchTerm
  }, [debouncedSearchTerm, onSearchChange, search, onTableChange, currentPage, pageSize, sortField, sortOrder])

  // Refresh data when tableRefreshTrigger changes (triggered from parent tab)
  useEffect(() => {
    if (tableRefreshTrigger && tableRefreshTrigger > 0) {
      // Trigger a refresh by calling onTableChange with current parameters
      if (onTableChange) {
        onTableChange({ current: currentPage, pageSize }, {}, { field: sortField, order: sortOrder })
      }
    }
  }, [tableRefreshTrigger, onTableChange, currentPage, pageSize, sortField, sortOrder])

  // Handle search input changes (immediate UI update)
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  // Handle filter changes
  const handleFilterChangeCallback = useCallback(
    (filterId: string, selected: boolean) => {
      // Delegate to parent handler (align with ExpensePlansTable pattern)
      if (props.handleFilterChange) {
        props.handleFilterChange(filterId, selected)
        return
      }
      // Fallback: simple add/remove
      if (selected) {
        props.addFilter?.(filterId)
      } else {
        props.removeFilter?.(filterId)
      }
    },
    [props.handleFilterChange, props.addFilter, props.removeFilter]
  )

  // Enhanced server-side sorting handler
  const sorting = useMemo(
    () => (sortOrder ? [{ id: sortField || 'requestDate', desc: sortOrder === 'descend' }] : []),
    [sortField, sortOrder]
  )
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      const entry = newSorting[0]
      const field = entry?.id || 'requestDate'
      const order = entry ? (entry.desc ? 'descend' : 'ascend') : undefined
      if (entry) {
        setSortField(field)
        setSortOrder(order)
      } else {
        setSortField('requestDate')
        setSortOrder('descend')
      }
      if (onTableChange) onTableChange({ current: 1, pageSize }, {}, { field, order })
    },
    [onTableChange, pageSize]
  )
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])
  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      if (!onTableChange) return
      onTableChange(
        { current: newPagination.pageIndex + 1, pageSize: newPagination.pageSize },
        {},
        { field: sortField, order: sortOrder }
      )
    },
    [onTableChange, sortField, sortOrder]
  )
  const emptyMessage = hasActiveFilters
    ? getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.no_data_found', 'No data available')
    : getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_expense_request_data',
        'No expense requests found. Create your first expense request to get started.'
      )
  const getStatusDisplay = useCallback((status: string) => {
    const statusConfig = getExpenseRequestStatusDisplay(status)
    return { label: statusConfig.label, badgeVariant: (statusConfig as any).badgeVariant }
  }, [])

  const columns = useMemo<ColumnDef<ExpenseRequestRow>[]>(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_filter.request_number_input',
          'Request Number'
        ),
        size: 120,
        cell: ({ row }) => <div className="gba:font-medium gba:text-sm gba:truncate">{row.original.code || 'N/A'}</div>
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title'),
        size: 200,
        cell: ({ row }) => <div className="gba:font-medium gba:text-sm gba:truncate">{row.original.title}</div>
      },
      {
        id: 'requestDate',
        accessorKey: 'requestDate',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:confirm_transfer_advance_payment.request_date_label',
          'Request Date'
        ),
        size: 110,
        cell: ({ row }) => (
          <div className="gba:text-sm">
            {row.original.requestDate ? formatDate(row.original.requestDate, 'date.short') || '-' : '-'}
          </div>
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
        cell: ({ row }) => (
          <div className="gba:text-sm">
            {row.original.startDate ? formatDate(row.original.startDate, 'date.short') || '-' : '-'}
          </div>
        )
      },
      {
        id: 'endDate',
        accessorKey: 'endDate',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date'),
        size: 110,
        cell: ({ row }) => (
          <div className="gba:text-sm">
            {row.original.endDate ? formatDate(row.original.endDate, 'date.short') || '-' : '-'}
          </div>
        )
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        size: 100,
        cell: ({ row }) => {
          const { label, badgeVariant } = getStatusDisplay(row.original.status || '')
          return <Badge variant={badgeVariant || 'outline'}>{label}</Badge>
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
          <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">
            {row.original.reimbursableAmount && row.original.reimbursableAmount !== 0 ? (
              formatCurrencyDisplay(row.original.reimbursableAmount, row.original.currency?.code)
            ) : (
              <span className="gba:text-muted-foreground">-</span>
            )}
          </div>
        )
      },
      {
        id: 'advance',
        accessorFn: (row: ExpenseRequestRow) => row.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount,
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.advance',
          'Advance'
        ),
        size: 120,
        meta: { align: 'right' as const },
        cell: ({ row }) => {
          const v = row.original.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount
          return (
            <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">
              {v && v !== 0 ? (
                formatCurrencyDisplay(v, row.original.currency?.code)
              ) : (
                <span className="gba:text-muted-foreground">-</span>
              )}
            </div>
          )
        }
      }
    ],
    [getStatusDisplay]
  )

  // Handle item selection
  const handleSelectItem = useCallback((item: (typeof items)[0]) => {
    setSelectedItem(item)
  }, [])

  const handleViewExpenseRequestDetails = useCallback((item: (typeof items)[0]) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: item.id,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-requests'
    })
    navigateTo(url)
  }, [])

  // Handle editing an expense request
  const handleEditExpenseRequest = useCallback((item: (typeof items)[0]) => {
    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: {
        employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
        expenseRequestId: item.id
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [])

  // Handle printing an expense request
  const handlePrintRequest = useCallback(
    async (record: (typeof items)[0]) => {
      setPrintLoading(true)
      setPrintModalOpen(true)

      try {
        const result = await printExpenseRequest(record)

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('Error printing request:', result.error)
        }
      } catch (error) {
        console.error('Error fetching print PDF:', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        if (isMounted.current) {
          setPrintLoading(false)
        }
      }
    },
    [printExpenseRequest, isMounted]
  )

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const rowActions = useCallback(
    (row: { original: ExpenseRequestRow }) => {
      const record = row.original
      return (
        <div className="gba:flex gba:justify-end gba:gap-2" onClick={e => e.stopPropagation()}>
          <AppActionButton
            data-testid={`expense-request-update-button-${record.id}`}
            size="icon"
            staticFlowData={[
              ...(record.status === 'CREATED' || record.status === 'REJECTED'
                ? [
                    {
                      category: getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_list.flows_button.actions',
                        'Actions'
                      ),
                      key: 'edit-expense-request',
                      label: tPersonal('personal-expenses-update-request-action'),
                      onClick: (e?: React.MouseEvent) => {
                        e?.stopPropagation()
                        handleEditExpenseRequest(record)
                      }
                    }
                  ]
                : []),
              ...((record.status === 'APPROVED' ||
                record.status === 'VERIFIED' ||
                record.status === 'BOOKED' ||
                record.status === 'TRANSFERRED' ||
                record.status === 'PAID') &&
              record.employeeDocument?.file?.trim()
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
                        handlePrintRequest(record)
                      }
                    }
                  ]
                : []),
              {
                category: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_list.flows_button.navigations',
                  'Navigations'
                ),
                key: 'view-expense-request',
                label: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.modal_list_or_flow_button.view_request_details',
                  'View Request Details'
                ),
                onClick: (e?: React.MouseEvent) => {
                  e?.stopPropagation()
                  handleViewExpenseRequestDetails(record)
                }
              }
            ]}
            accessToken={contextProps.accessToken}
            emptyStateBehavior="enable"
            deferMainContextRequestsUntilClick
          />
        </div>
      )
    },
    [tPersonal, contextProps.accessToken, handleEditExpenseRequest, handlePrintRequest, handleViewExpenseRequestDetails]
  )

  return (
    <>
      <DataContainer
        dataControllerProps={{
          listTitle: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.flows_button.expense_requests',
            'Expense Requests'
          ),
          listAmount: totalCount ? `${totalCount}` : undefined,
          search: searchInput,
          setSearch: handleSearchChange,
          placeholder:
            getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
            '...',
          filter: selectedFilters,
          setFilter: setFilters || (() => {}),
          filterLabelMap: useMemo(() => {
            const currencyLabelMap: Record<string, string> = {}
            ;((props as any).currencyStats || []).forEach((cs: any) => {
              currencyLabelMap[`currency:${cs.ref}`] = cs.code
            })
            return { ...filterLabelMap, ...currencyLabelMap }
          }, [filterLabelMap, (props as any).currencyStats]),
          addButton: {
            onClick: onAddExpenseRequest || (() => {}),
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
              'Add'
            ),
            'data-testid': 'add-expense-plan-button'
          }
        }}
        dataFilterProps={{
          filterGroups: useMemo(() => {
            const currencyFilters =
              (props as any).currencyStats?.map((cs: any) => ({
                id: `currency:${cs.ref}`,
                label: cs.code,
                selected: (selectedFilters || []).includes(`currency:${cs.ref}`)
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
            return [...currencyGroup, ...filterGroups]
          }, [filterGroups, selectedFilters, (props as any).currencyStats]),
          onFilterChange: handleFilterChangeCallback
        }}
        dataBody={
          <DataTable<ExpenseRequestRow>
            data={items}
            columns={columns}
            loading={isLoading}
            error={error || undefined}
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

      {/* Expense Request Details Sheet */}
      <Sheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        data-testid="expense-request-details-sheet"
      >
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedItem?.title ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
                'Expense Request Details'
              )
            }
          >
            {selectedItem ? (
              <ExpenseRequestDetails
                selectedItem={selectedItem}
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
          setPrintModalOpen(open)
          if (!open) {
            setPrintPdfUrl('')
          }
        }}
      >
        <DialogContent
          className="gba:!w-[90vw] gba:!max-w-[90vw] gba:!p-0 gba:!rounded-md"
          style={{ height: '90vh' }}
          data-testid="expense-request-print-modal"
        >
          <DialogHeader className="gba:p-4">
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.print_expense_request',
                'Print Expense Request'
              )}
            </DialogTitle>
          </DialogHeader>
          {printLoading ? (
            <div className="gba:flex gba:justify-center gba:p-8">
              <Spinner />
            </div>
          ) : printPdfUrl ? (
            <iframe
              src={printPdfUrl}
              className="gba:w-full gba:border-0"
              style={{ height: 'calc(90vh - 55px)' }}
              title="Expense Request PDF"
              data-testid="expense-request-pdf-iframe"
            />
          ) : (
            <div className="gba:text-center gba:p-8 gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.failed_to_load_pdf', 'Failed to load PDF')}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
})

export default ExpenseRequestsTable
