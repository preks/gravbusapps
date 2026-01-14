import React, { useState, useCallback, useMemo } from 'react'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Avatar,
  AvatarImage,
  AvatarFallback,
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
import { ExpenseRequest, SortField } from '../../../hooks/useGetExpenseRequests'
import { getExpenseRequestStatusDisplay } from '../../../utils'
import { pillTypeClassMap } from '../../../components/StatusLegend'
import ExpenseRequestDetails from './ExpenseRequestDetails'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { useExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { TablePagination } from '../../../../../components'

// Use shared pill classes from StatusLegend to avoid duplication

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  expenseRequests: ExpenseRequest[]
  loading: boolean
  error: string | null
  totalCount: number
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
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = props => {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [selectedRequest, setSelectedRequest] = useState<ExpenseRequest | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)

  const [sorting, setSorting] = useState<{
    field: SortField | null
    order: 'ASC' | 'DESC' | null
    lastField: SortField | null
  }>({
    field: null,
    order: null,
    lastField: null
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
    primaryCurrency
  } = props

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchTerm || '').trim() !== ''
    const hasFilters = (selectedFilters || []).length > 0

    return hasSearch || hasFilters
  }, [searchTerm, selectedFilters])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value)
      setCurrentPage(1)
    },
    [setSearchTerm]
  )

  // Adapter for TablePagination component
  const handleTablePaginationChange = useCallback(
    (pagination: { current: number; pageSize: number }) => {
      setCurrentPage(pagination.current)
      setPageSize(pagination.pageSize)
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

  const handleSort = useCallback(
    (field: SortField) => {
      let newSorting: {
        field: SortField | null
        order: 'ASC' | 'DESC' | null
        lastField: SortField | null
      }

      if (sorting.lastField === field) {
        if (sorting.order === 'ASC') {
          newSorting = { field, order: 'DESC', lastField: field }
        } else if (sorting.order === 'DESC') {
          newSorting = { field: null, order: null, lastField: null }
        } else {
          newSorting = { field, order: 'ASC', lastField: field }
        }
      } else {
        newSorting = { field, order: 'ASC', lastField: field }
      }

      setSorting(newSorting)
      setCurrentPage(1)

      if (newSorting.field && newSorting.order) {
        const sortByParam = `${newSorting.field}:${newSorting.order.toLowerCase()}`
        fetchRequests(searchTerm, 1, pageSize, sortByParam, selectedFilters, undefined, primaryCurrency)
      } else {
        fetchRequests(searchTerm, 1, pageSize, 'none', selectedFilters, undefined, primaryCurrency)
      }
    },
    [setCurrentPage, sorting, fetchRequests, searchTerm, pageSize, selectedFilters, primaryCurrency]
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
      if (sorting.lastField === field && sorting.order !== null) {
        if (sorting.order === 'ASC') {
          return <PiArrowUp className="gba:inline gba:ml-1" size={12} />
        } else if (sorting.order === 'DESC') {
          return <PiArrowDown className="gba:inline gba:ml-1" size={12} />
        }
      }
      return null
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
      <div>
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
                        'lowcoder:manager_expense_request_list.expense_table.creation_date',
                        'Creation Date'
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
                requests.map(record => {
                  const { type, label } = getExpenseRequestStatusDisplay(record.status)
                  return (
                    <TableRow
                      key={record.id}
                      className="gba:cursor-pointer gba:hover:bg-accent"
                      onClick={() => handleSelectRequest(record)}
                      data-testid={`expense-requests-row-${record.id}`}
                    >
                      <TableCell
                        className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border gba:py-3 gba:px-4"
                        data-testid={`expense-requests-actions-cell-${record.id}`}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            onClick={e => e.stopPropagation()}
                            data-testid={`expense-requests-update-button-${record.id}`}
                            size="icon"
                            staticFlowData={buildStaticFlowData(record)}
                            prefixDataTestId="expense-requests-update"
                            accessToken={props.accessToken}
                            emptyStateBehavior="enable"
                            deferMainContextRequestsUntilClick
                          />
                        </div>
                      </TableCell>
                      <TableCell className="gba:text-left gba:py-3 gba:px-4 gba:w-[13%]">
                        <div className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate">
                          {record.title ??
                            getTranslationFromI18nKeyAndLabel('lowcoder:common.untitled_request', 'Untitled Request')}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
                          {record.code ?? getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                        </div>
                      </TableCell>
                      <TableCell className="gba:w-[10%] gba:py-4 gba:px-3 gba:text-sm">
                        {(record as any)?.expensePlan?.code ??
                          getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                      </TableCell>
                      <TableCell
                        className="gba:text-sm gba:py-3 gba:px-4"
                        data-testid={`expense-requests-start-date-cell-${record.id}`}
                      >
                        {formatShortDateSafe(record.startDate)}
                      </TableCell>
                      <TableCell
                        className="gba:text-sm gba:py-3 gba:px-4"
                        data-testid={`expense-requests-end-date-cell-${record.id}`}
                      >
                        {formatShortDateSafe(record.endDate)}
                      </TableCell>
                      <TableCell data-testid={`expense-requests-employee-cell-${record.id}`}>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Avatar className="gba:h-6 gba:w-6">
                            <AvatarImage
                              src={
                                record.employee?.pictureThumbnail
                                  ? `data:image/gif;base64,${record.employee.pictureThumbnail}`
                                  : undefined
                              }
                              alt={record.employee?.fullName}
                            />
                            <AvatarFallback>
                              {record.employee?.displayName?.charAt(0) || record.employee?.fullName?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="gba:font-medium gba:text-sm">
                              {record.employee?.displayName || record.employee?.fullName}
                            </div>
                            <div className="gba:text-xs gba:text-muted-foreground">
                              {record.employee?.department ||
                                getTranslationFromI18nKeyAndLabel('lowcoder:common.not_available', 'N/A')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell
                        className="gba:text-sm gba:py-3 gba:px-4"
                        data-testid={`expense-requests-request-date-cell-${record.id}`}
                      >
                        {formatShortDateSafe(record.requestDate)}
                      </TableCell>
                      <TableCell
                        className="gba:text-right gba:text-sm"
                        data-testid={`expense-request-amount-cell-${record.id}`}
                      >
                        {typeof record.amount === 'number'
                          ? formatCurrencyDisplay(record.amount, record.currency)
                          : formatCurrencyDisplay(0, record.currency || 'EUR')}
                      </TableCell>
                      <TableCell className="gba:pr-6 gba:w-[20%]">
                        <span
                          className={`gba:inline-block gba:rounded-full gba:px-3 gba:py-1 gba:text-xs gba:font-medium gba:whitespace-nowrap ${
                            pillTypeClassMap[String(type).toLowerCase() as keyof typeof pillTypeClassMap] ||
                            pillTypeClassMap.draft
                          }`}
                          data-testid={`status-pill-${record.status?.toLowerCase()}`}
                        >
                          {label}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={handleTablePaginationChange}
          entityNamePlural={getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.flows_button.expense_requests',
            'Expense Requests'
          )}
          dataTestIdPrefix="expense-requests"
        />
      </div>
    )
  }, [requests, isLoading, error, totalCount, pageSize, currentPage, hasActiveFilters])

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
          setFilter: (newFilters: string[]): void => {
            // Separate currency and status filters
            const currencyFilters = newFilters.filter(f => f.startsWith('currency:'))
            const statusFilters = newFilters.filter(f => !f.startsWith('currency:'))

            // Handle status filter changes
            const statusToRemove = selectedFilters.filter(f => !statusFilters.includes(f))
            const statusToAdd = statusFilters.filter(f => !selectedFilters.includes(f))

            for (const f of statusToRemove) {
              removeFilter(f)
            }
            for (const f of statusToAdd) {
              addFilter(f)
            }

            // Handle currency filter changes
            // Note: Currency filter should remain even when "Clear all filters" is clicked
            const hasCurrency = currencyFilters.length > 0

            // Only process currency change if user explicitly selected a different one
            if (hasCurrency && currencyFilters[0] !== `currency:${primaryCurrency}`) {
              // User selected a different currency
              const newCurrencyCode = currencyFilters[0].replace('currency:', '')
              addFilter(`currency:${newCurrencyCode}`)
            }
            // Don't clear currency when clearing all filters - currency always stays selected

            setCurrentPage(1)
          },
          filterLabelMap: {
            ...filterLabelMap,
            ...(primaryCurrency ? { [`currency:${primaryCurrency}`]: primaryCurrency } : {})
          },
          listTitle: (
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
        title={
          selectedRequest?.title ||
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.title', 'Expense Request Details')
        }
        data-testid="expense-request-details-sheet"
      >
        <SheetContent side="right" className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedRequest?.title ||
              getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_details.title', 'Expense Request Details')
            }
            onClose={() => setSelectedRequest(null)}
            showCloseButton={true}
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
