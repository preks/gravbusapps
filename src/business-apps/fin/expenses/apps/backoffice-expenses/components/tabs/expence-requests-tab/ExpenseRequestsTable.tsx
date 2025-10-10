/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequests } from '../../../hooks/useExpenseRequests'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Alert,
  Spinner,
  Button,
  Checkbox,
  Card,
  CardContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle
} from '@newwork/nw-design-system'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpenseData } from '../../../types'
import { getExpenseRequestStatusDisplay } from '../../../utils/utils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import ExpenseRequestDetailsBackoffice from './ExpenseRequestDetailsBackoffice'

import {
  ExpenseRequestPdfModal,
  EmployeeSearchFilter,
  AmountFilter,
  ExpenseRequestTableRow,
  ExpenseRequestPagination
} from './components'

import {
  useExpenseRequestFilters,
  useExpenseRequestPdf,
  useExpenseRequestActions,
  useExpenseRequestTransfer
} from './hooks'

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = props => {
  const { search, onSearchChange, accessToken } = props

  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken
    }),
    [props.accessToken]
  )

  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return {
      search: urlParams.get('search') || '',
      page: parseInt(urlParams.get('page') || '1', 10),
      pageSize: parseInt(urlParams.get('pageSize') || '20', 10),
      status: urlParams.get('status') || '',
      department: urlParams.get('department') || ''
    }
  })

  const [searchText, setSearchText] = useState<string>(search ?? initialParams.search)
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [selectedRecords, setSelectedRecords] = useState<ExpenseData[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])

  const clearSelection = useCallback(() => {
    setSelectedRecords([])
    setSelectedRowKeys([])
  }, [])

  const updateURLParams = useCallback(
    (params: { search?: string; page?: number; pageSize?: number; status?: string; department?: string }) => {
      const newSearchParams = new URLSearchParams(window.location.search)

      if (params.search !== undefined) {
        if (params.search) {
          newSearchParams.set('search', params.search)
        } else {
          newSearchParams.delete('search')
        }
      }

      if (params.page !== undefined) {
        if (params.page > 1) {
          newSearchParams.set('page', params.page.toString())
        } else {
          newSearchParams.delete('page')
        }
      }

      if (params.pageSize !== undefined) {
        if (params.pageSize !== 20) {
          newSearchParams.set('pageSize', params.pageSize.toString())
        } else {
          newSearchParams.delete('pageSize')
        }
      }

      if (params.status !== undefined) {
        if (params.status) {
          newSearchParams.set('status', params.status)
        } else {
          newSearchParams.delete('status')
        }
      }

      if (params.department !== undefined) {
        if (params.department) {
          newSearchParams.set('department', params.department)
        } else {
          newSearchParams.delete('department')
        }
      }

      const newURL = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`
      window.history.replaceState({}, '', newURL)
    },
    []
  )

  const {
    expenses,
    totalItems,
    loading,
    error,
    currentPage,
    pageSize,
    fetchData,
    searchEmployees,
    searchStatuses,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleTableChange,
    handleSearch,
    amountMinFilter,
    amountMaxFilter
  } = useExpenseRequests(contextProps)

  const { isPdfModalVisible, pdfUrl, pdfLoading, pdfError, handlePrintExpenseRequest, handleClosePdfModal } =
    useExpenseRequestPdf(props)

  const { handleDownloadAccountingNote, handleTriggerCSV } = useExpenseRequestActions(props)

  const { handleTransferPayment, handleBulkTransferPayment } = useExpenseRequestTransfer(
    props,
    fetchData,
    clearSelection
  )

  const {
    employeeFilter,
    setEmployeeFilter,
    employeeSearchText,
    setEmployeeSearchText,
    showEmployeeDropdown,
    setShowEmployeeDropdown,
    employeeSearchResults,
    employeeSearchLoading,
    selectedEmployees,
    setSelectedEmployees,
    debouncedSearchEmployees,
    statusFilter,
    setStatusFilter,
    handleStatusFilterChange,
    localAmountMin,
    setLocalAmountMin,
    localAmountMax,
    setLocalAmountMax,
    debouncedAmountFilter
  } = useExpenseRequestFilters({
    searchEmployees,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    amountMinFilter,
    amountMaxFilter,
    availableStatuses
  })

  useEffect(() => {
    const loadAvailableStatuses = async () => {
      try {
        const statuses = await searchStatuses()

        if (statuses.length === 0) {
          const defaultStatuses = ['CREATED', 'PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'CLOSED', 'PAID', 'REJECTED']
          setAvailableStatuses(defaultStatuses)
        } else {
          setAvailableStatuses(statuses)
        }
      } catch (error) {
        console.error('Error loading available statuses:', error)
        const defaultStatuses = ['CREATED', 'PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'CLOSED', 'PAID', 'REJECTED']
        setAvailableStatuses(defaultStatuses)
      }
    }

    loadAvailableStatuses()
  }, [searchStatuses])

  useEffect(() => {
    if (contextProps.accessToken) {
      fetchData()
    }
  }, [contextProps.accessToken])

  useEffect(() => {
    if (searchText !== initialParams.search) {
      updateURLParams({ search: searchText })
    }
  }, [searchText, initialParams.search, updateURLParams])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)
      handleSearch(value)
      onSearchChange?.(value)
    },
    [handleSearch, onSearchChange]
  )

  const handleRowClick = useCallback((record: any) => {
    setSelectedExpense(record as ExpenseData)
  }, [])

  const handleNavigateToExpenseRequest = useCallback((record: ExpenseData) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: record.id
    })
    navigateTo(url)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedExpense(null)
    setSelectedRowKeys([])
  }, [])

  // Bulk selection handlers
  const handleSelectRecord = useCallback((record: ExpenseData, checked: boolean) => {
    setSelectedRecords(prev => {
      const exists = prev.some(r => r.id === record.id)
      if (checked) {
        return exists ? prev : [...prev, record]
      }
      return prev.filter(r => r.id !== record.id)
    })
    setSelectedRowKeys(prev => {
      const exists = prev.includes(record.id)
      if (checked) {
        return exists ? prev : [...prev, record.id]
      }
      return prev.filter(key => key !== record.id)
    })
  }, [])

  const handleSelectAllRecords = useCallback(
    (checked: boolean) => {
      if (checked) {
        const bookableRecords = expenses?.filter(expense => expense.status === 'BOOKED') || []
        setSelectedRecords(bookableRecords)
        setSelectedRowKeys(bookableRecords.map(record => record.id))
      } else {
        setSelectedRecords([])
        setSelectedRowKeys([])
      }
    },
    [expenses]
  )

  const handleBulkTransfer = useCallback(() => {
    if (selectedRecords.length > 0) {
      const bookableRecords = selectedRecords.filter(record => record.status === 'BOOKED')
      if (bookableRecords.length > 0) {
        handleBulkTransferPayment(bookableRecords)
      }
    }
  }, [selectedRecords, handleBulkTransferPayment])

  // Check if any selected records are bookable
  const hasBookableSelected = useMemo(() => {
    return selectedRecords.some(record => record.status === 'BOOKED')
  }, [selectedRecords])

  // Count selected records that are bookable
  const bookedSelectedCount = useMemo(() => {
    return selectedRecords.filter(r => r.status === 'BOOKED').length
  }, [selectedRecords])

  // Check if all visible records are bookable
  const allBookableSelected = useMemo(() => {
    const bookableRecords = expenses?.filter(expense => expense.status === 'BOOKED') || []
    return (
      selectedRecords.length > 0 &&
      selectedRecords.length === bookableRecords.length &&
      selectedRecords.every(record => record.status === 'BOOKED')
    )
  }, [selectedRecords, expenses])

  // Count of bookable records
  const bookableRecordsCount = useMemo(() => {
    return expenses?.filter(expense => expense.status === 'BOOKED').length || 0
  }, [expenses])

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        type: 'checkbox',
        filters: availableStatuses.map(status => ({
          id: status,
          label: getExpenseRequestStatusDisplay(status).label,
          selected: statusFilter.includes(status)
        }))
      },
      {
        id: 'employee',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
        type: 'custom',
        customComponent: (
          <EmployeeSearchFilter
            employeeSearchText={employeeSearchText}
            setEmployeeSearchText={setEmployeeSearchText}
            showEmployeeDropdown={showEmployeeDropdown}
            setShowEmployeeDropdown={setShowEmployeeDropdown}
            employeeSearchResults={employeeSearchResults}
            employeeSearchLoading={employeeSearchLoading}
            selectedEmployees={selectedEmployees}
            setSelectedEmployees={setSelectedEmployees}
            setEmployeeFilter={setEmployeeFilter}
            handleEmployeeFilter={handleEmployeeFilter}
            debouncedSearchEmployees={debouncedSearchEmployees}
          />
        )
      },
      {
        id: 'amount',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
        type: 'custom',
        customComponent: (
          <AmountFilter
            localAmountMin={localAmountMin}
            setLocalAmountMin={setLocalAmountMin}
            localAmountMax={localAmountMax}
            setLocalAmountMax={setLocalAmountMax}
            debouncedAmountFilter={debouncedAmountFilter}
          />
        )
      }
    ]
  }, [
    availableStatuses,
    statusFilter,
    employeeSearchText,
    showEmployeeDropdown,
    employeeSearchResults,
    employeeSearchLoading,
    selectedEmployees,
    handleEmployeeFilter,
    debouncedSearchEmployees,
    localAmountMin,
    setLocalAmountMin,
    localAmountMax,
    setLocalAmountMax,
    debouncedAmountFilter
  ])

  const getFilters = useCallback(
    (_filtersToApply?: string[]) => {
      const filters: Record<string, any> = {}
      if (employeeFilter) filters.employee = employeeFilter
      return filters
    },
    [employeeFilter]
  )

  const setFilters = useCallback(
    (_filters: string[]) => {
      setEmployeeFilter('')
      setSelectedEmployees([])
      setEmployeeSearchText('')
      setStatusFilter([])
      setLocalAmountMin('')
      setLocalAmountMax('')

      handleEmployeeFilter('')
      handleStatusFilter('')
      handleAmountFilter('', '')
    },
    [handleEmployeeFilter, handleStatusFilter, handleAmountFilter]
  )

  const handleEnhancedTableChange = useCallback(
    (pagination: any) => {
      handleTableChange(pagination, {}, {})
    },
    [handleTableChange]
  )

  if (loading && expenses.length === 0) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4">
        <Alert variant="destructive" data-testid="expense-requests-error">
          <div className="gba:font-medium">
            {getTranslationFromI18nKeyAndLabel('expense.request.error.title', 'Error Loading Data')}
          </div>
          <div className="gba:text-sm">{error}</div>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <DataContainer
        dataControllerProps={{
          listTitle: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.flows_button.expense_requests',
            'Expense Requests'
          ),
          listAmount: totalItems ? `${totalItems}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.search_module',
            'Search in Expense Requests'
          ),
          filter: Object.keys(getFilters()),
          setFilter: setFilters,
          filterLabelMap: {
            status:
              statusFilter.length > 0
                ? `Status: ${statusFilter.map(s => getExpenseRequestStatusDisplay(s).label).join(', ')}`
                : 'Status: All',
            employee: employeeFilter ? `Employee: ${selectedEmployees.map(e => e.name).join(', ')}` : 'Employee: All',
            amount: `Amount: ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`
          },
          // Always provide a truthy actions prop to keep hook order stable in DataController
          // Include the dynamic count in key/testid so memoized DataControllerActions detects changes
          actions: hasBookableSelected
            ? [
                <Button
                  key={`bulk-transfer-${bookedSelectedCount}`}
                  onClick={handleBulkTransfer}
                  data-testid={`bulk-transfer-payment-button-${bookedSelectedCount}`}
                  variant="outline"
                  size="sm"
                >
                  {getTranslationFromI18nKeyAndLabel('lowcoder:transfer_payment', 'Transfer Payment')} (
                  {bookedSelectedCount}{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.selected', 'selected')})
                </Button>
              ]
            : []
        }}
        dataFilterProps={{
          filterGroups: filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            if (filterId === '') {
              if (selected) {
                setEmployeeFilter('')
                setSelectedEmployees([])
                setEmployeeSearchText('')
                setStatusFilter([])
                setLocalAmountMin('')
                setLocalAmountMax('')

                handleEmployeeFilter('')
                handleStatusFilter('')
                handleAmountFilter('', '')
              }
            } else {
              if (filterId === 'employee') {
                if (selected) {
                } else {
                  setEmployeeFilter('')
                  setSelectedEmployees([])
                  setEmployeeSearchText('')
                  handleEmployeeFilter('')
                }
              } else if (availableStatuses.includes(filterId)) {
                handleStatusFilterChange(filterId, selected)
              }
            }
          }
        }}
        dataBody={
          loading && !expenses?.length ? (
            <div className="gba:flex gba:justify-center gba:p-8">
              <Spinner />
            </div>
          ) : error ? (
            <Alert variant="destructive" className="gba:m-4">
              {error}
            </Alert>
          ) : !expenses || expenses.length === 0 ? (
            <div className="gba:p-8 gba:text-center gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_request_list.no_expense_requests_found',
                'No expense requests found matching the current filters.'
              )}
            </div>
          ) : (
            <div className="gba:pr-6 gba:overflow-hidden">
              <Card data-testid="expense-requests-container">
                <CardContent className="gba:p-0">
                  {loading && (
                    <div className="gba:flex gba:justify-center gba:p-4">
                      <Spinner />
                    </div>
                  )}

                  <div className="gba:overflow-x-auto gba:mt-4 gba:max-w-full">
                    <Table data-testid="expense-requests-data-table" className="gba:min-w-[1600px] gba:w-full">
                      <TableHeader>
                        <TableRow className="gba:border-b gba:bg-gray-50">
                          <TableHead className="gba:w-[50px] gba:min-w-[50px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3">
                            {bookableRecordsCount > 0 && (
                              <Checkbox
                                checked={allBookableSelected}
                                onCheckedChange={checked => handleSelectAllRecords(checked === true)}
                                data-testid="select-all-records-checkbox"
                              />
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[60px] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-3">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:employee_profile.employee_tabs.flows_button.actions',
                              'Actions'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[12%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:hr_absences.create_absence.employee',
                              'Employee'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:expense_request_table.employee_code',
                              'Employee Code'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:expense_config_calculation_rule_list.expense_table.sap_number',
                              'SAP Number'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:expense_request_list.expense_request_filter.request_number_input',
                              'Request Number'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[15%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:manager_expense_request_list.expense_table.title',
                              'Title'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:expense_plan_list.expense_plan_table.start_date',
                              'Start Date'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:expense_plan_list.expense_plan_table.end_date',
                              'End Date'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:manager_expense_request_list.expense_table.creation_date',
                              'Creation Date'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[8%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:expense_request_list.expense_plan_table.status',
                              'Status'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:approve_expense_plan.remaining',
                              'Remaining Amount'
                            )}
                          </TableHead>
                          <TableHead className="gba:w-[10%] gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:text-right">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:expense_request_list.expense_plan_table.total_amount',
                              'Total Amount'
                            )}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!loading && (!expenses || expenses.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={12} className="gba:py-8 gba:text-center">
                              <div className="gba:text-gray-500">
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:expense_request_list.no_expense_requests_found',
                                  'No expense requests found matching the current filters.'
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          expenses?.map((record: ExpenseData) => (
                            <ExpenseRequestTableRow
                              key={record.id}
                              record={record}
                              accessToken={props.accessToken}
                              onRowClick={handleRowClick}
                              onNavigateToExpenseRequest={handleNavigateToExpenseRequest}
                              onDownloadAccountingNote={handleDownloadAccountingNote}
                              onTriggerCSV={handleTriggerCSV}
                              onPrintExpenseRequest={handlePrintExpenseRequest}
                              onTransferPayment={handleTransferPayment}
                              isSelected={selectedRowKeys.includes(record.id)}
                              onSelectRecord={handleSelectRecord}
                            />
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <ExpenseRequestPagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={handleEnhancedTableChange}
                  />
                </CardContent>
              </Card>
            </div>
          )
        }
        dataDetails={undefined}
        floatingDetails={false}
      />

      {/* Expense Request Details Sheet to match personal usage */}
      <Sheet
        open={!!selectedExpense}
        onOpenChange={open => !open && handleCloseDetails()}
        title={
          selectedExpense?.title ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
            'Expense Request Details'
          )
        }
        data-testid="expense-request-details-sheet"
      >
        <SheetContent className="gba:w-[600px] gba:sm:gba:w-[600px] gba:max-w-none">
          <SheetHeader>
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {selectedExpense?.title ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_list.modal_list_or_flow_button.expense_request_details',
                  'Expense Request Details'
                )}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:mt-6 gba:overflow-y-auto gba:max-h-[calc(100vh-120px)]">
            {selectedExpense && (
              <ExpenseRequestDetailsBackoffice
                selectedItem={selectedExpense}
                onClose={handleCloseDetails}
                accessToken={accessToken}
                userInfo={props.userInfo}
                requestTypeLabel={
                  selectedExpense.requestTypeRef
                    ? String(selectedExpense.requestTypeRef).split(':').pop()
                    : selectedExpense.type
                      ? String(selectedExpense.type)
                      : undefined
                }
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* PDF Modal */}
      <ExpenseRequestPdfModal
        isVisible={isPdfModalVisible}
        pdfUrl={pdfUrl}
        pdfLoading={pdfLoading}
        pdfError={pdfError}
        onClose={handleClosePdfModal}
      />
    </>
  )
}

export default ExpenseRequestsTable
