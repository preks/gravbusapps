import React, { useState, useCallback, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Spinner,
  Alert,
  Sheet,
  SheetContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@newwork/nw-design-system'
import { PiArrowUp, PiArrowDown } from 'react-icons/pi'

// Enable localized date formatting
dayjs.extend(localizedFormat)
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildDeduplicatedFilters } from '../../../utils/filterUtils'
import {
  separateRequestFiltersByType,
  applyStatusFilterDiff,
  applyRequestTypeFilterDiff,
  applyDateRangeFilterDiff,
  applyCurrencyFilterDiff
} from '../../../utils/requestsFilterHelpers'
import { ExpenseRequest, SortField } from '../../../hooks/useGetExpenseRequests'
import ExpenseRequestDetails from './ExpenseRequestDetails'
import { ExpenseRequestTableRow } from './ExpenseRequestTableRow'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { TablePagination } from '../../../../../components'

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  expenseRequests: ExpenseRequest[]
  loading: boolean
  error: string | null
  totalCount: number
  /** Paging state is owned by `ExpenseRequestsTab` (single source of truth). */
  currentPage: number
  pageSize: number
  fetchRequests: (
    searchTerm?: string,
    page?: number,
    pageSize?: number,
    sortBy?: string,
    status?: string[],
    requestDateStart?: string,
    currencyFilter?: string | null
  ) => Promise<void>

  searchTerm: string
  setSearchTerm: (term: string) => void
  selectedFilters: string[]
  filterGroups: any[]
  filterLabelMap: Record<string, string>
  addFilter: (filter: string) => void
  removeFilter: (filter: string) => void
  handleDataFilterChange: (filterId: string, selected: boolean) => void
  primaryCurrency: string | null
  // Date range filter props for active filter detection
  effectiveDateRange?: [Date | null, Date | null] | null
  requestDateRange?: [Date | null, Date | null] | null
  startDateRange?: [Date | null, Date | null] | null
  endDateRange?: [Date | null, Date | null] | null
}

const DATA_TEST_ID_PREFIX = 'expense-requests'

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = props => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)
  // Deterministic scroll target for pagination (top of table)
  const tableTopRef = useRef<HTMLDivElement | null>(null)

  const [sorting, setSorting] = useState<{
    field: SortField | null
    order: 'ASC' | 'DESC' | null
    lastField: SortField | null
  }>({
    field: 'requestDate',
    order: 'DESC',
    lastField: 'requestDate'
  })

  const {
    expenseRequests: requests,
    loading: isLoading,
    error,
    totalCount,
    fetchRequests,
    searchTerm,
    setSearchTerm,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    handleDataFilterChange,
    primaryCurrency,
    currentPage,
    pageSize
  } = props

  // Helper to check if a date range is active
  const isDateRangeActive = useCallback((range: [Date | null, Date | null] | null | undefined) => {
    return !!(range && (range[0] || range[1]))
  }, [])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchTerm || '').trim() !== ''
    const hasFilters = (selectedFilters || []).length > 0
    const hasDateRangeFilters =
      isDateRangeActive(props.effectiveDateRange) ||
      isDateRangeActive(props.requestDateRange) ||
      isDateRangeActive(props.startDateRange) ||
      isDateRangeActive(props.endDateRange)
    return hasSearch || hasFilters || hasDateRangeFilters
  }, [
    searchTerm,
    selectedFilters,
    props.effectiveDateRange,
    props.requestDateRange,
    props.startDateRange,
    props.endDateRange,
    isDateRangeActive
  ])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value)
    },
    [setSearchTerm]
  )

  const listTitle = useMemo(
    () => (
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:employee_list.flows_button.expense_requests',
              'Expense Requests'
            )}
          </span>
          <span className="gba:text-muted-foreground">({totalCount})</span>
        </div>
      </div>
    ),
    [totalCount]
  )

  const controllerFilterLabelMap = useMemo(
    () => ({
      ...filterLabelMap,
      ...(primaryCurrency ? { [`currency:${primaryCurrency}`]: primaryCurrency } : {})
    }),
    [filterLabelMap, primaryCurrency]
  )

  // Step 8: Filter logic delegated to requestsFilterHelpers (classify + apply diff).
  const handleFilterChange = useCallback(
    (newFilters: string[]) => {
      const separated = separateRequestFiltersByType(newFilters)
      applyStatusFilterDiff(selectedFilters, separated.status, removeFilter, addFilter)
      applyDateRangeFilterDiff(selectedFilters, newFilters, removeFilter)
      applyRequestTypeFilterDiff(selectedFilters, separated.requestType, removeFilter, addFilter)
      applyCurrencyFilterDiff(separated.currency, primaryCurrency, addFilter, removeFilter)
    },
    [selectedFilters, primaryCurrency, addFilter, removeFilter]
  )

  // Adapter for TablePagination component
  const handleTablePaginationChange = useCallback(
    (pagination: { current: number; pageSize: number }) => {
      fetchRequests(
        searchTerm,
        pagination.current,
        pagination.pageSize,
        sorting.field ? `${sorting.field}:${sorting.order?.toLowerCase()}` : 'requestDate:desc',
        selectedFilters,
        undefined,
        primaryCurrency
      )
    },
    [searchTerm, sorting, selectedFilters, primaryCurrency, fetchRequests]
  )

  // Helper to calculate next sort state
  const calculateNextSortState = useCallback((field: SortField, currentSorting: typeof sorting) => {
    if (currentSorting.lastField !== field) {
      return { field, order: 'ASC' as const, lastField: field }
    }

    if (currentSorting.order === 'ASC') {
      return { field, order: 'DESC' as const, lastField: field }
    }

    if (currentSorting.order === 'DESC') {
      return { field: null, order: null, lastField: null }
    }

    return { field, order: 'ASC' as const, lastField: field }
  }, [])

  const handleSort = useCallback(
    (field: SortField) => {
      const newSorting = calculateNextSortState(field, sorting)
      setSorting(newSorting)

      const sortByParam =
        newSorting.field && newSorting.order ? `${newSorting.field}:${newSorting.order.toLowerCase()}` : 'none'
      fetchRequests(searchTerm, 1, pageSize, sortByParam, selectedFilters, undefined, primaryCurrency)
    },
    [calculateNextSortState, sorting, fetchRequests, searchTerm, pageSize, selectedFilters, primaryCurrency]
  )

  const { printExpenseRequest, isMounted } = useExpenseRequestFileService(contextProps)

  const handlePrintRequest = useCallback(
    async (request: ExpenseRequest) => {
      setPrintLoading(true)
      setPrintModalOpen(true)

      try {
        const result = await printExpenseRequest(request as any)

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

  const handleViewRequestDetails = useCallback((request: ExpenseRequest) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: request.id,
      referrer: '/platform/fin/expenses/manager-expenses?tab=expense-requests'
    })
    navigateTo(url)
  }, [])

  const renderSortIndicator = useCallback(
    (field: SortField) => {
      if (sorting.lastField !== field || sorting.order === null) {
        return null
      }
      return sorting.order === 'ASC' ? (
        <PiArrowUp className="gba:inline gba:ml-1" size={12} />
      ) : (
        <PiArrowDown className="gba:inline gba:ml-1" size={12} />
      )
    },
    [sorting]
  )

  const handleSelectRequest = useCallback((request: ExpenseRequest) => {
    setSelectedRequest(request)
  }, [])

  const handleApproveRequest = useCallback(async () => {
    setSelectedRequest(null)
  }, [])

  const handleRejectRequest = useCallback(async () => {
    setSelectedRequest(null)
  }, [])

  // Helpers to reduce render complexity
  const formatShortDateSafe = useCallback((dateValue?: string | null) => {
    if (!dateValue) return getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
    try {
      const userLocale = getCurrentActiveUserLocale()
      return dayjs(dateValue).locale(userLocale).format('L')
    } catch {
      return getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')
    }
  }, [])

  const renderError = useCallback(
    () => (
      <Alert variant="destructive">
        <div className="gba:font-medium">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.error_loading_data',
            'Error loading data'
          )}
        </div>
        <div className="gba:text-sm gba:py-3 gba:px-4">{error}</div>
      </Alert>
    ),
    [error]
  )

  const buildStaticFlowData = useCallback(
    (record: ExpenseRequest) => {
      const hasValidStatus =
        record.status === 'APPROVED' ||
        record.status === 'VERIFIED' ||
        record.status === 'BOOKED' ||
        record.status === 'TRANSFERRED' ||
        record.status === 'PAID'

      const hasDocument = !!record.employeeDocument?.file?.trim()

      const items: any[] = []
      if (hasValidStatus && hasDocument) {
        items.push({
          category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions', 'Actions'),
          key: 'print',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.print', 'Print'),
          onClick: () => {
            handlePrintRequest(record)
          }
        })
      }

      items.push({
        category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.navigations', 'Navigations'),
        key: 'view-request-details',
        label: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.expense_request_flows.view_request_details',
          'View Request Details'
        ),
        onClick: () => {
          handleViewRequestDetails(record)
        }
      })

      return items
    },
    [handlePrintRequest, handleViewRequestDetails]
  )

  const renderDataBody = useCallback(() => {
    if (isLoading && requests.length === 0) {
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
          <Spinner className="gba:h-8 gba:w-8" />
        </div>
      )
    }

    if (error) {
      return renderError()
    }

    return (
      <div ref={tableTopRef} data-testid={`${DATA_TEST_ID_PREFIX}-scroll-anchor`}>
        <div className="gba:overflow-x-auto gba:pr-4 gba:border gba:border-border gba:rounded-md gba:relative">
          {isLoading && requests.length > 0 && (
            <div
              className="gba:absolute gba:inset-0 gba:bg-background/50 gba:flex gba:items-center gba:justify-center gba:z-10"
              data-testid="expense-requests-loading-overlay"
            >
              <Spinner className="gba:h-8 gba:w-8" />
            </div>
          )}
          <Table data-testid="expense-requests-table" className="gba:w-full">
            <TableHeader className="gba:sticky gba:top-0 gba:bg-muted gba:z-10 gba:border-b gba:border-border">
              <TableRow>
                <TableHead className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border"></TableHead>
                <TableHead
                  className="gba:w-[13%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort('title')}
                  data-testid="expense-requests-title-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.title',
                        'Title'
                      )}
                    </span>
                    {renderSortIndicator('title')}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[10%]">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:expense_calculation_rule.expense_table.code',
                    'Plan Code'
                  )}
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort('startDate')}
                  data-testid="expense-requests-start-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date')}
                    </span>
                    {renderSortIndicator('startDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort('endDate')}
                  data-testid="expense-requests-end-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>{getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date')}</span>
                    {renderSortIndicator('endDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort('employee.fullName')}
                  data-testid="expense-requests-employee-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                    </span>
                    {renderSortIndicator('employee.fullName')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[8%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort('requestDate')}
                  data-testid="expense-requests-request-date-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:confirm_transfer_advance_payment.request_date_label',
                        'Request Date'
                      )}
                    </span>
                    {renderSortIndicator('requestDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[12%] gba:cursor-pointer gba:select-none"
                  onClick={() => handleSort('amount')}
                  data-testid="expense-requests-amount-header"
                >
                  <div className="gba:flex gba:items-center gba:justify-start">
                    <span>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.amount',
                        'Amount'
                      )}
                    </span>
                    {renderSortIndicator('amount')}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:w-[20%] gba:cursor-pointer gba:select-none gba:pr-6"
                  onClick={() => handleSort('status')}
                  data-testid="expense-requests-status-header"
                >
                  <div className="gba:flex gba:items-center">
                    <span>
                      {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.status', 'Status')}
                    </span>
                    {renderSortIndicator('status')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && totalCount === 0 && requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="gba:py-8 gba:text-center">
                    <div className="gba:text-muted-foreground">
                      {hasActiveFilters
                        ? getTranslationFromI18nKeyAndLabel(
                            'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                            'No data available'
                          )
                        : getTranslationFromI18nKeyAndLabel(
                            'lowcoder:manager_expense_landing_page.no_requests_created_by_team',
                            'No expense request created by your team yet.'
                          )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requests.map(record => (
                  <ExpenseRequestTableRow
                    key={record.id}
                    record={record}
                    onSelect={handleSelectRequest}
                    formatShortDateSafe={formatShortDateSafe}
                    buildStaticFlowData={buildStaticFlowData}
                    accessToken={props.accessToken}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

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
      </div>
    )
  }, [
    requests,
    isLoading,
    error,
    totalCount,
    pageSize,
    currentPage,
    hasActiveFilters,
    handleTablePaginationChange,
    handleSort,
    renderSortIndicator,
    formatShortDateSafe,
    buildStaticFlowData,
    handleSelectRequest
  ])

  return (
    <>
      <DataContainer
        key="expense-requests-data-container"
        addLeftPaddingWhenNoFilter={true}
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearchChange,
          // Always keep applied filters visible, even when the current result set is empty
          filter: buildDeduplicatedFilters(selectedFilters, primaryCurrency),
          setFilter: handleFilterChange,
          filterLabelMap: controllerFilterLabelMap,
          listTitle,
          debounceDelay: 300
        }}
        dataFilterProps={{
          // Keep filter sidebar available regardless of current result count
          filterGroups,
          onFilterChange: handleDataFilterChange
        }}
        dataBody={renderDataBody()}
        data-testid="expense-requests-container"
      />

      {/* Expense Request Details Sheet */}
      <Sheet
        open={!!selectedRequest}
        onOpenChange={open => !open && setSelectedRequest(null)}
        data-testid="expense-request-details-sheet"
      >
        <SheetContent side="right" className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedRequest?.title ||
              getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.title', 'Expense Request Details')
            }
            onClose={() => setSelectedRequest(null)}
            dataTestIdPrefix="expense-request-details"
          >
            {selectedRequest && (
              <ExpenseRequestDetails
                request={selectedRequest}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
                {...contextProps}
              />
            )}
          </ExpenseDetailsShell>
        </SheetContent>
      </Sheet>

      {/* Print Dialog (design system) */}
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
          data-testid="print-request-modal"
        >
          <DialogHeader className="gba:p-4">
            <DialogTitle>
              {getTranslationFromI18nKeyAndLabel('lowcoder:print.preview_title', 'Print Preview')}
            </DialogTitle>
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
              data-testid="print-request-iframe"
            />
          ) : (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
              <div className="gba:text-muted-foreground gba:mb-4">
                {getTranslationFromI18nKeyAndLabel('lowcoder:print.no_document', 'No document available for printing')}
              </div>
              <div className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:print.no_document_details',
                  'This expense request does not have an associated document to print.'
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ExpenseRequestsTable
