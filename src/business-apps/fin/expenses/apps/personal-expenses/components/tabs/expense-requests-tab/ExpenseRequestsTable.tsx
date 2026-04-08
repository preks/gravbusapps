import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { DataTable, DataDisplay } from '@newwork/nw-design-system'
import type { ColumnDef, CellContext } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation, Button, Badge } from '@newwork/nw-design-system'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import ExpenseRequestDetails from './ExpenseRequestDetails'
import { formatDate, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AppAction } from '@/components/app-action'
import { startProcess } from '@/common/utils/start-process'
import { useExpenseRequestFileService } from '../../../utils/expenseRequestFileService'
import { ExpenseRequestStatus } from '../../../hooks/useExpenseRequestFilters'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { formatCurrencyDisplay } from '../../../utils'
import translations from '../../../_i18n'
import {
  formatDateRangeForChip,
  applyDateRangeFromFilter,
  resolveSelectedCurrencyCode,
  applyCurrencyChange,
  buildFilteredEmptyMessage,
  buildDefaultEmptyMessage
} from '../../../utils/tableUtils'
import {
  CurrencyDropdown,
  PrintPreviewDialog,
  DetailsSheet,
  RowActionsWrapper,
  RowActionsIcon
} from '../../shared/TableSharedComponents'
import { createExpenseRequestFilterConfig } from './config/expenseRequestFilterConfig'
import {
  expenseRequestSortableColumns,
  expenseRequestDefaultSort,
  type ExpenseRequestTableSortOrder
} from './config/expenseRequestSortableColumns'
import {
  expenseRequestAvailableColumns,
  expenseRequestDefaultVisibleColumnIds
} from './config/expenseRequestAvailableColumns'

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
  requestDateRange?: [Date | null, Date | null] | null
  setRequestDateRange?: (range: [Date | null, Date | null] | null) => void
  startDateRange?: [Date | null, Date | null] | null
  setStartDateRange?: (range: [Date | null, Date | null] | null) => void
  endDateRange?: [Date | null, Date | null] | null
  setEndDateRange?: (range: [Date | null, Date | null] | null) => void
  effectiveDateRange?: [Date | null, Date | null] | null
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  currencyStats?: Array<{ ref: string; code: string; count: number }>
}

const DEFAULT_PAGE_SIZE = 20
const DATA_TEST_ID_PREFIX = 'expense-requests'

function ExpenseRequestCodeCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  return <div className="gba:font-medium gba:text-sm gba:truncate">{record.code || 'N/A'}</div>
}
function ExpenseRequestTitleCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  return <div className="gba:font-medium gba:text-sm gba:truncate">{record.title}</div>
}
function ExpenseRequestDateCell({ dateValue }: Readonly<{ dateValue: string | undefined }>) {
  return <div className="gba:text-sm">{dateValue ? formatDate(dateValue, 'date.short') || '-' : '-'}</div>
}
function ExpenseRequestReimbursableCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">
      {record.reimbursableAmount && record.reimbursableAmount !== 0 ? (
        formatCurrencyDisplay(record.reimbursableAmount, record.currency?.code)
      ) : (
        <span className="gba:text-muted-foreground">-</span>
      )}
    </div>
  )
}
function ExpenseRequestAdvanceCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  const v = record.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount
  return (
    <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">
      {v && v !== 0 ? (
        formatCurrencyDisplay(v, record.currency?.code)
      ) : (
        <span className="gba:text-muted-foreground">-</span>
      )}
    </div>
  )
}

function renderReqCodeCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestCodeCell record={info.row.original} />
}
function renderReqTitleCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestTitleCell record={info.row.original} />
}
function renderReqRequestDateCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestDateCell dateValue={info.row.original.requestDate} />
}
function renderReqStartDateCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestDateCell dateValue={info.row.original.startDate} />
}
function renderReqEndDateCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestDateCell dateValue={info.row.original.endDate} />
}
function renderReqReimbursableCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestReimbursableCell record={info.row.original} />
}
function renderReqAdvanceCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestAdvanceCell record={info.row.original} />
}
function ExpenseRequestStatusCell({ record }: Readonly<{ record: ExpenseRequestRow }>) {
  const statusConfig = getExpenseRequestStatusDisplay(record.status || '')
  return <Badge variant={(statusConfig as any).badgeVariant || 'outline'}>{statusConfig.label}</Badge>
}
function renderReqStatusCell(info: CellContext<ExpenseRequestRow, unknown>) {
  return <ExpenseRequestStatusCell record={info.row.original} />
}

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
    filterLabelMap = {},
    onAddExpenseRequest,
    tableRefreshTrigger
  } = props

  // Local search state for immediate UI feedback
  const [searchInput, setSearchInput] = useState(search || '')

  // Debounced search term for API calls
  const debouncedSearchTerm = useDebounce(searchInput, 300)

  // Server-side sorting state
  const [sortField, setSortField] = useState<string>(expenseRequestDefaultSort.field)
  const [sortOrder, setSortOrder] = useState<ExpenseRequestTableSortOrder>(expenseRequestDefaultSort.order)
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

  const requestDateRange = props.requestDateRange ?? null
  const startDateRange = props.startDateRange ?? null
  const endDateRange = props.endDateRange ?? null
  const effectiveDateRange = props.effectiveDateRange ?? null
  const currencyStats = props.currencyStats ?? []

  const expenseRequestsFilterConfig = useMemo(
    () =>
      createExpenseRequestFilterConfig({
        statusOptions: Object.values(ExpenseRequestStatus),
        filterLabelMap
      }),
    [filterLabelMap]
  )

  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = (selectedFilters || []).filter(f => Object.values(ExpenseRequestStatus).includes(f as any))
    const requestTypeIds = (selectedFilters || []).filter(f =>
      ['ExpenseRequestType:v1:EXPENSES', 'ExpenseRequestType:v1:TRIP'].includes(f)
    )
    const obj: Record<string, unknown> = {}
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (requestTypeIds.length > 0) obj.requestTypeIds = requestTypeIds
    const requestDateStr = formatDateRangeForChip(requestDateRange)
    if (requestDateStr) obj.requestDateRange = requestDateStr
    const effectiveDateStr = formatDateRangeForChip(effectiveDateRange)
    if (effectiveDateStr) obj.effectiveDateRange = effectiveDateStr
    const startDateStr = formatDateRangeForChip(startDateRange)
    if (startDateStr) obj.startDateRange = startDateStr
    const endDateStr = formatDateRangeForChip(endDateRange)
    if (endDateStr) obj.endDateRange = endDateStr
    return obj
  }, [selectedFilters, requestDateRange, effectiveDateRange, startDateRange, endDateRange])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const requestTypeIds = (filters.requestTypeIds as string[] | undefined) || []
      const currencyTokens = (selectedFilters || []).filter(f => f.startsWith('currency:'))
      const dateRangeTokens: string[] = []
      if (applyDateRangeFromFilter(filters.requestDateRange, props.setRequestDateRange))
        dateRangeTokens.push('requestDateRange')
      if (applyDateRangeFromFilter(filters.effectiveDateRange, props.setEffectiveDateRange))
        dateRangeTokens.push('effectiveDateRange')
      if (applyDateRangeFromFilter(filters.startDateRange, props.setStartDateRange))
        dateRangeTokens.push('startDateRange')
      if (applyDateRangeFromFilter(filters.endDateRange, props.setEndDateRange)) dateRangeTokens.push('endDateRange')
      // _effectiveDateInfo is a display-only boolean used to show the effective date description; ignore it
      if (props.setFilters) {
        props.setFilters([...statusIds, ...requestTypeIds, ...currencyTokens, ...dateRangeTokens])
      }
      if (onTableChange) onTableChange({ current: 1, pageSize }, {}, { field: sortField, order: sortOrder })
    },
    [
      selectedFilters,
      props.setFilters,
      props.setRequestDateRange,
      props.setEffectiveDateRange,
      props.setStartDateRange,
      props.setEndDateRange,
      onTableChange,
      pageSize,
      sortField,
      sortOrder
    ]
  )

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...expenseRequestDefaultVisibleColumnIds])

  /** Keep all column defs mounted so sorting state ids (e.g. endDate) always match a column — required for sort indicators. */
  const dataTableColumnVisibility = useMemo(() => {
    const vis: Record<string, boolean> = {}
    for (const { id } of expenseRequestAvailableColumns) {
      vis[id] = visibleColumns.includes(id)
    }
    vis.actions = true
    return vis
  }, [visibleColumns])

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(selectedFilters || [], currencyStats),
    [selectedFilters, currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      if (props.setFilters) {
        applyCurrencyChange(code, selectedFilters || [], currencyStats, props.setFilters)
      }
      if (onTableChange) onTableChange({ current: 1, pageSize }, {}, { field: sortField, order: sortOrder })
    },
    [selectedFilters, currencyStats, props.setFilters, onTableChange, pageSize, sortField, sortOrder]
  )

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

    // Propagate search change to parent first so filters are up-to-date before any refetch
    if (onSearchChange && debouncedSearchTerm !== search) {
      onSearchChange(debouncedSearchTerm)
    }

    // Manage pagination transitions for search
    if (prev === '' && next !== '') {
      savedPageBeforeSearchRef.current = currentPage
      if (onTableChange && currentPage !== 1) {
        onTableChange({ current: 1, pageSize }, {}, { field: sortField, order: sortOrder })
      }
    } else if (prev !== '' && next === '') {
      savedPageBeforeSearchRef.current = null
    } else if (prev !== next && next !== '') {
      if (onTableChange && currentPage !== 1) {
        onTableChange({ current: 1, pageSize }, {}, { field: sortField, order: sortOrder })
      }
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

  const sorting = useMemo(
    () => (sortOrder ? [{ id: sortField || expenseRequestDefaultSort.field, desc: sortOrder === 'descend' }] : []),
    [sortField, sortOrder]
  )
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (!onTableChange) return
      const entry = newSorting[0]

      let nextField = expenseRequestDefaultSort.field
      let nextOrder: ExpenseRequestTableSortOrder = expenseRequestDefaultSort.order

      if (entry) {
        const incomingOrder: ExpenseRequestTableSortOrder = entry.desc ? 'descend' : 'ascend'
        nextField = entry.id
        nextOrder = incomingOrder
      } else {
        // When user clears sorting, fall back to default request date desc.
        nextField = expenseRequestDefaultSort.field
        nextOrder = expenseRequestDefaultSort.order
      }

      setSortField(nextField)
      setSortOrder(nextOrder)
      onTableChange({ current: 1, pageSize }, {}, { field: nextField, order: nextOrder })
    },
    [onTableChange, pageSize, sortField, sortOrder]
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
    ? buildFilteredEmptyMessage()
    : buildDefaultEmptyMessage(
        'lowcoder:personal_expenses.no_expense_request_data',
        'No expense requests found. Create your first expense request to get started.'
      )
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
        sortDescFirst: false,
        cell: renderReqCodeCell
      },
      {
        id: 'title',
        accessorKey: 'title',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.title', 'Title'),
        size: 200,
        sortDescFirst: false,
        cell: renderReqTitleCell
      },
      {
        id: 'requestDate',
        accessorKey: 'requestDate',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:confirm_transfer_advance_payment.request_date_label',
          'Request Date'
        ),
        size: 110,
        sortDescFirst: false,
        cell: renderReqRequestDateCell
      },
      {
        id: 'startDate',
        accessorKey: 'startDate',
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_plan_list.expense_plan_table.start_date',
          'Start Date'
        ),
        size: 110,
        sortDescFirst: false,
        cell: renderReqStartDateCell
      },
      {
        id: 'endDate',
        accessorFn: (row: ExpenseRequestRow) => row.endDate,
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.end_date', 'End Date'),
        size: 110,
        sortDescFirst: false,
        cell: renderReqEndDateCell
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        size: 100,
        sortDescFirst: false,
        cell: renderReqStatusCell
      },
      {
        id: 'reimbursableAmount',
        accessorFn: (row: ExpenseRequestRow) => row.reimbursableAmount,
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:approve_expense_request.reimbursable',
          'Reimbursable Amount'
        ),
        size: 140,
        sortDescFirst: false,
        meta: { align: 'right' as const },
        cell: renderReqReimbursableCell
      },
      {
        id: 'advance',
        accessorFn: (row: ExpenseRequestRow) => row.expensePlan?.advancePaymentAggregate?.aggregate?.sum?.amount,
        header: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.advance',
          'Advance'
        ),
        size: 120,
        enableSorting: false,
        meta: { align: 'right' as const },
        cell: renderReqAdvanceCell
      }
    ],
    []
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
        <RowActionsWrapper>
          <AppAction
            variant="table-row"
            customActions={[
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
            prefixDataTestId={`${DATA_TEST_ID_PREFIX}-update`}
            accessToken={contextProps.accessToken}
            data-testid={`expense-request-update-button-${record.id}`}
          >
            <RowActionsIcon />
          </AppAction>
        </RowActionsWrapper>
      )
    },
    [tPersonal, contextProps.accessToken, handleEditExpenseRequest, handlePrintRequest, handleViewExpenseRequestDetails]
  )

  const primaryAction = useMemo(
    () => (
      <Button
        onClick={onAddExpenseRequest || (() => {})}
        size="sm"
        variant="default"
        data-testid="add-expense-request-button"
        type="button"
      >
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
          'Add'
        )}
      </Button>
    ),
    [onAddExpenseRequest]
  )

  const secondaryActions = useMemo(
    () =>
      currencyStats.length > 0 ? (
        <CurrencyDropdown
          currencyStats={currencyStats}
          selectedCurrencyCode={selectedCurrencyCode}
          onCurrencyChange={handleCurrencyChange}
          testIdPrefix="expense-requests"
        />
      ) : undefined,
    [currencyStats, selectedCurrencyCode, handleCurrencyChange]
  )

  return (
    <>
      <DataDisplay
        titleSections={[
          {
            id: 'list',
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_list.flows_button.expense_requests',
              'Expense Requests'
            ),
            metadata: { count: totalCount, isLoading }
          }
        ]}
        currentSection="list"
        searchValue={searchInput}
        searchPlaceholder={
          getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') +
          '...'
        }
        onSearchChange={handleSearchChange}
        filters={filtersObject}
        filterConfiguration={expenseRequestsFilterConfig}
        onFilterChange={handleFilterChangeFromDisplay}
        sorting={sorting}
        sortableColumns={expenseRequestSortableColumns}
        onSortingChange={handleSortingChange}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        availableColumns={expenseRequestAvailableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={tPersonal('filter-expense-requests-title')}
        filterSheetDescription={tPersonal('filter-expense-requests-description')}
      >
        <DataTable<ExpenseRequestRow>
          data={items}
          columns={columns}
          columnVisibility={dataTableColumnVisibility}
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
      </DataDisplay>

      <DetailsSheet
        open={!!selectedItem}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedItem?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
            'Expense Request Details'
          )
        }
        testId="expense-request-details-sheet"
      >
        {selectedItem ? (
          <ExpenseRequestDetails
            selectedItem={selectedItem}
            onClose={handleCloseDetails}
            accessToken={props.accessToken}
            userInfo={props.userInfo}
          />
        ) : null}
      </DetailsSheet>

      <PrintPreviewDialog
        open={printModalOpen}
        onOpenChange={open => {
          setPrintModalOpen(open)
          if (!open) setPrintPdfUrl('')
        }}
        title={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.print_expense_request',
          'Print Expense Request'
        )}
        loading={printLoading}
        pdfUrl={printPdfUrl}
        testIdPrefix="expense-request"
      />
    </>
  )
})

export default ExpenseRequestsTable
