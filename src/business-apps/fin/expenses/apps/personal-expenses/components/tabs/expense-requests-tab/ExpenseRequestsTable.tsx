import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Alert } from 'antd'
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
import { ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { TablePagination } from '../../../../../components'
import translations from '../../../_i18n'

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
  // Deterministic scroll target for pagination (top of table)
  const tableTopRef = useRef<HTMLDivElement | null>(null)

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
  const handleSort = useCallback(
    (field: string) => {
      if (sortField === field) {
        // Cycle through: ascend -> descend -> clear
        if (sortOrder === 'ascend') {
          setSortOrder('descend')
        } else if (sortOrder === 'descend') {
          setSortField('')
          setSortOrder(undefined)
        } else {
          setSortOrder('ascend')
        }
      } else {
        setSortField(field)
        setSortOrder('ascend')
      }
      // Reset to first page when sorting changes
      if (onTableChange) {
        onTableChange({ current: 1, pageSize }, {}, { field, order: sortOrder === 'ascend' ? 'descend' : 'ascend' })
      }
    },
    [sortField, sortOrder, onTableChange, pageSize]
  )

  // Helper function to render sort icon
  const renderSortIcon = useCallback(
    (field: string) => {
      if (sortField !== field) return null
      if (sortOrder === 'ascend') return <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
      if (sortOrder === 'descend') return <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
      return null
    },
    [sortField, sortOrder]
  )

  // Enhanced table change handler for pagination
  const handleEnhancedTableChange = useCallback(
    (pagination: any, _filters: any, sorter: any) => {
      if (onTableChange) {
        // Update sorting state if sorter is provided
        if (sorter && sorter.field) {
          setSortField(sorter.field)
          setSortOrder(sorter.order)
        }
        onTableChange(pagination, _filters, sorter)
      }
    },
    [onTableChange]
  )

  // Adapter for TablePagination component
  const handleTablePaginationChange = useCallback(
    (pagination: { current: number; pageSize: number }) => {
      handleEnhancedTableChange(pagination, {}, {})
    },
    [handleEnhancedTableChange]
  )

  // Memoize pagination configuration
  // Pagination config is constructed inline in JSX via handlers

  const getStatusDisplay = useCallback(
    (status: string) => {
      const statusConfig = getExpenseRequestStatusDisplay(status)
      return { label: statusConfig.label, badgeVariant: (statusConfig as any).badgeVariant }
    },
    [filterLabelMap]
  )

  // Row selection handling not used in this table

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

  // Render the data body with memoization
  const renderDataBody = useCallback(() => {
    // Show error message if there's an error
    if (error) {
      const errorMessage =
        typeof error === 'string' ? error : (error as Error)?.message || 'Failed to load expense requests.'
      return <Alert message="Error" description={errorMessage} type="error" showIcon />
    }

    return (
      <div className="expense-requests-table" ref={tableTopRef} data-testid={`${DATA_TEST_ID_PREFIX}-scroll-anchor`}>
        <Card data-testid="expense-requests-table-container">
          <CardContent className="gba:p-0">
            <div className="gba:overflow-x-auto">
              <Table data-testid="expense-requests-data-table">
                <TableHeader>
                  <TableRow className="gba:border-b gba:bg-gray-50">
                    <TableHead className="gba:w-[50px] gba:min-w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3" />
                    <TableHead
                      className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('code')}
                      data-testid="expense-requests-code-header"
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_request_list.expense_request_filter.request_number_input',
                          'Request Number'
                        )}
                        {renderSortIcon('code')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[25%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('title')}
                      data-testid="expense-requests-title-header"
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title')}
                        {renderSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('requestDate')}
                      data-testid="expense-requests-request-date-header"
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:confirm_transfer_advance_payment.request_date_label',
                          'Request Date'
                        )}
                        {renderSortIcon('requestDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100"
                      onClick={() => handleSort('startDate')}
                      data-testid="expense-requests-start-date-header"
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
                      data-testid="expense-requests-end-date-header"
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
                      data-testid="expense-requests-status-header"
                    >
                      <div className="gba:flex gba:items-center">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:expense_plan_list.expense_plan_table.status',
                          'Status'
                        )}
                        {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none gba:hover:bg-gray-100 gba:text-right"
                      onClick={() => handleSort('reimbursableAmount')}
                      data-testid="expense-requests-reimbursable-amount-header"
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
                      className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right"
                      data-testid="expense-requests-advance-header"
                    >
                      <div className="gba:flex gba:items-center gba:justify-end">
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:manager_expense_request_list.expense_table.advance',
                          'Advance'
                        )}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!isLoading && totalCount === 0 && (!items || items.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="gba:py-8 gba:text-center">
                        <div className="gba:text-gray-500">
                          {hasActiveFilters
                            ? getTranslationFromI18nKeyAndLabel(
                                'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                                'No data available'
                              )
                            : getTranslationFromI18nKeyAndLabel(
                                'lowcoder:personal_expenses.no_expense_request_data',
                                'No expense requests found. Create your first expense request to get started.'
                              )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items?.map((record: any) => (
                      <TableRow
                        key={record.id}
                        className={`gba:border-b gba:hover:bg-gray-50 gba:transition-colors gba:cursor-pointer ${selectedItem?.id === record.id ? 'gba:bg-blue-50' : ''}`}
                        onClick={() => handleSelectItem(record)}
                        data-testid={`expense-request-row-${record.id}`}
                      >
                        <TableCell className="gba:py-4 gba:px-3">
                          <div className="gba:flex gba:justify-start gba:gap-2" onClick={e => e.stopPropagation()}>
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
                                record.employeeDocument &&
                                record.employeeDocument?.file &&
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
                              deferMainContextRequestsUntilClick={true}
                              onClick={e => e.stopPropagation()}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">{record.code || 'N/A'}</TableCell>
                        <TableCell className="gba:py-4 gba:px-6">{record.title}</TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.requestDate ? formatDate(record.requestDate, 'date.short') || '-' : '-'}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.startDate ? formatDate(record.startDate, 'date.short') || '-' : '-'}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {record.endDate ? formatDate(record.endDate, 'date.short') || '-' : '-'}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6">
                          {(() => {
                            const { label, badgeVariant } = getStatusDisplay(record.status)
                            return <Badge variant={badgeVariant || 'outline'}>{label}</Badge>
                          })()}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6 gba:text-right">
                          {(() => {
                            const formattedAmount =
                              record.reimbursableAmount && record.reimbursableAmount !== 0
                                ? formatCurrencyDisplay(record.reimbursableAmount, record.currency?.code)
                                : '-'

                            return <div data-testid={`reimbursable-amount-${record.id}`}>{formattedAmount}</div>
                          })()}
                        </TableCell>
                        <TableCell className="gba:py-4 gba:px-6 gba:text-right">
                          {(() => {
                            const advanceAmountValue =
                              record.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount
                            // Use expense plan currency if available, otherwise fall back to main currency
                            const formattedAmount =
                              advanceAmountValue && advanceAmountValue !== 0
                                ? formatCurrencyDisplay(advanceAmountValue, record.currency?.code)
                                : '-'
                            return <div data-testid={`total-amount-${record.id}`}>{formattedAmount}</div>
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
                'lowcoder:employee_list.flows_button.expense_requests',
                'Expense Requests'
              )}
              dataTestIdPrefix={DATA_TEST_ID_PREFIX}
            />
          </CardContent>
        </Card>
      </div>
    )
  }, [
    items,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    handleEnhancedTableChange,
    handleSort,
    renderSortIcon,
    handleSelectItem,
    handleEditExpenseRequest,
    handlePrintRequest,
    getStatusDisplay,
    contextProps.accessToken
  ])

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
        dataBody={renderDataBody()}
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
