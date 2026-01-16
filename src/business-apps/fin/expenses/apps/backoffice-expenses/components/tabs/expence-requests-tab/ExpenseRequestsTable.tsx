/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequests } from '../../../hooks/useExpenseRequests'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EXPENSE_REQUESTS } from '../../../queries'
import { ExpenseRequestQueryData, ExpenseData } from '../../../types'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Badge,
  Card,
  CardContent,
  toast,
  Sheet,
  SheetContent
} from '@newwork/nw-design-system'
import { PiArrowUp, PiArrowDown, PiDownload, PiFileXls } from 'react-icons/pi'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { getTranslationFromI18nKeyAndLabel, formatNumberFunction } from '@/common/utils/windowUtils'
import { formatDateLocalized } from '../../../utils/dateUtils'
import { formatCurrency } from '../../../utils/currencyUtils'
import { DatePicker } from 'antd'
import dayjs from 'dayjs'
import { useFilterData, type OrganizationalUnit, type Currency } from '../../../hooks/useFilterData'
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../../utils/utils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { downloadCsv, downloadExcel, buildFilename } from '../../../utils/exportUtils'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { useExpenseRequestFileService as useCommonExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'

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

interface FilterData {
  organizationalUnits: OrganizationalUnit[]
  currencies: Currency[]
  mostUsedCurrency: string | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface ExpenseRequestsTableProps extends BusinessAppContextProps {
  search?: string
  onSearchChange?: (search: string) => void
  isActive?: boolean // ⚡ PERFORMANCE: Only fetch data when tab is active
  filterData?: FilterData // ⚡ PERFORMANCE: Accept shared filter data from parent
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = props => {
  const { search, onSearchChange, accessToken, isActive = true, filterData: propsFilterData } = props

  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken
    }),
    [props.accessToken]
  )

  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
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

  // Helper to set or delete URL parameter (reduces cognitive complexity)
  const setOrDeleteParam = useCallback(
    (searchParams: URLSearchParams, key: string, value: any, shouldKeep: boolean) => {
      if (value !== undefined) {
        if (shouldKeep) {
          searchParams.set(key, String(value))
        } else {
          searchParams.delete(key)
        }
      }
    },
    []
  )

  const updateURLParams = useCallback(
    (params: { search?: string; page?: number; pageSize?: number; status?: string; department?: string }) => {
      const newSearchParams = new URLSearchParams(globalThis.location.search)

      setOrDeleteParam(newSearchParams, 'search', params.search, !!params.search)
      setOrDeleteParam(newSearchParams, 'page', params.page, params.page !== undefined && params.page > 1)
      setOrDeleteParam(
        newSearchParams,
        'pageSize',
        params.pageSize,
        params.pageSize !== undefined && params.pageSize !== 20
      )
      setOrDeleteParam(newSearchParams, 'status', params.status, !!params.status)
      setOrDeleteParam(newSearchParams, 'department', params.department, !!params.department)

      const queryString = newSearchParams.toString()
      const separator = queryString ? '?' : ''
      const newURL = `${globalThis.location.pathname}${separator}${queryString}`
      globalThis.history.replaceState({}, '', newURL)
    },
    [setOrDeleteParam]
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
    sorting,
    updateSorting,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleStartDateRangeFilter,
    handleEndDateRangeFilter,
    handleTableChange,
    handleSearch,
    amountMinFilter,
    amountMaxFilter
  } = useExpenseRequests(contextProps, isActive)

  const { isPdfModalVisible, pdfUrl, pdfLoading, pdfError, handlePrintExpenseRequest, handleClosePdfModal } =
    useExpenseRequestPdf(props)

  const { handleDownloadAccountingNote, handleTriggerCSV } = useExpenseRequestActions(props)

  const { handleTransferPayment, handleBulkTransferPayment } = useExpenseRequestTransfer(
    props,
    () => fetchData(true), // Force refresh after transfer
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
    amountMaxFilter
  })

  const { printExpenseRequest } = useCommonExpenseRequestFileService(props)

  // Selected filter chips to display above the table (DataContainer)
  const [departmentId, setDepartmentId] = useState<string>('')
  const [currencyRef, setCurrencyRef] = useState<string>('')
  const [startFrom, setStartFrom] = useState<string | undefined>()
  const [startTo, setStartTo] = useState<string | undefined>()
  const [endFrom, setEndFrom] = useState<string | undefined>()
  const [endTo, setEndTo] = useState<string | undefined>()
  const RangePicker = DatePicker.RangePicker

  // ⚡ PERFORMANCE: Use filter data from parent if provided, otherwise fetch locally
  const localFilterData = useFilterData({ accessToken: propsFilterData ? undefined : accessToken })
  const filterData = propsFilterData || localFilterData
  const { organizationalUnits, currencies } = filterData

  const selectedDepartmentName = useMemo(() => {
    const found = (organizationalUnits || []).find(ou => ou.id === departmentId)
    return found?.name || ''
  }, [organizationalUnits, departmentId])

  const selectedFilters: string[] = useMemo(() => {
    const hasNonDefaultStatusFilter =
      statusFilter.length > 0 && !(statusFilter.length === 1 && statusFilter[0] === ExpenseStatus.BOOKED)

    return [
      ...(hasNonDefaultStatusFilter ? ['status'] : []),
      ...(employeeFilter ? ['employee'] : []),
      ...(amountMinFilter || amountMaxFilter ? ['amount'] : []),
      ...(departmentId ? ['department'] : []),
      ...(currencyRef ? ['currency'] : []),
      ...(startFrom || startTo ? ['startDate'] : []),
      ...(endFrom || endTo ? ['endDate'] : [])
    ]
  }, [
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentId,
    currencyRef,
    startFrom,
    startTo,
    endFrom,
    endTo
  ])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchText || '').trim() !== ''

    return hasSearch || selectedFilters.length > 0
  }, [searchText, selectedFilters])

  useEffect(() => {
    // Mirror personal expenses: use a fixed enum list for statuses
    // Exclude CREATED (draft) status from filter options
    const allStatuses = Object.values(ExpenseStatus)
    const filteredStatuses = allStatuses.filter(status => status !== ExpenseStatus.CREATED)
    setAvailableStatuses(filteredStatuses)
  }, [])

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
      expenseRequestId: record.id,
      referrer: '/platform/fin/expenses/backoffice-expenses?tab=expense-requests'
    })
    navigateTo(url)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedExpense(null)
    // Don't clear selectedRowKeys - checkbox selections should remain when closing details panel
  }, [])

  // Bulk selection handlers
  const handleSelectRecord = useCallback((record: ExpenseData, checked: boolean) => {
    // Only allow selecting BOOKED records for bulk transfer
    if (record.status !== 'BOOKED') {
      return
    }

    if (checked) {
      setSelectedRecords(prev => [...prev, record])
      setSelectedRowKeys(prev => [...prev, record.id])
    } else {
      setSelectedRecords(prev => prev.filter(r => r.id !== record.id))
      setSelectedRowKeys(prev => prev.filter(key => key !== record.id))
    }
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

  // Count of selected bookable records
  const selectedBookableCount = useMemo(() => {
    const count = selectedRecords.filter(r => r.status === 'BOOKED').length
    console.log('[ExpenseRequestsTable] Selected records count:', {
      totalSelected: selectedRecords.length,
      bookableCount: count,
      statuses: selectedRecords.map(r => ({ id: r.id, status: r.status }))
    })
    return count
  }, [selectedRecords])

  // Helper: Build unique status filters (reduces cognitive complexity)
  const buildStatusFilters = useCallback(() => {
    const byLabel = new Map<string, { id: string; label: string; selected: boolean }>()
    for (const status of availableStatuses) {
      const label = getExpenseRequestStatusDisplay(status).label.trim()
      const key = label.toLowerCase()
      if (!byLabel.has(key)) {
        byLabel.set(key, { id: status, label, selected: statusFilter.includes(status) })
      }
    }
    return Array.from(byLabel.values())
  }, [availableStatuses, statusFilter])

  // Helper: Handle start date range change (reduces cognitive complexity)
  const handleStartDateChange = useCallback(
    (dates: any) => {
      if (!dates?.[0] || !dates?.[1]) {
        setStartFrom(undefined)
        setStartTo(undefined)
        handleStartDateRangeFilter('', '')
        return
      }
      const from = dates[0].startOf('day').format('YYYY-MM-DDT00:00:00')
      const to = dates[1].endOf('day').format('YYYY-MM-DDT23:59:59')
      setStartFrom(from)
      setStartTo(to)
      handleStartDateRangeFilter(from, to)
    },
    [handleStartDateRangeFilter]
  )

  // Helper: Handle end date range change (reduces cognitive complexity)
  const handleEndDateChange = useCallback(
    (dates: any) => {
      if (!dates?.[0] || !dates?.[1]) {
        setEndFrom(undefined)
        setEndTo(undefined)
        handleEndDateRangeFilter('', '')
        return
      }
      const from = dates[0].startOf('day').format('YYYY-MM-DDT00:00:00')
      const to = dates[1].endOf('day').format('YYYY-MM-DDT23:59:59')
      setEndFrom(from)
      setEndTo(to)
      handleEndDateRangeFilter(from, to)
    },
    [handleEndDateRangeFilter]
  )

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        type: 'checkbox',
        filters: buildStatusFilters()
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
      },
      {
        id: 'department',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_list.employee_report_filter.department_title',
          'Department'
        ),
        type: 'custom',
        customComponent: (
          <div className="gba:w-64">
            <Select
              onValueChange={val => {
                setDepartmentId(val)
                handleDepartmentFilter(val)
              }}
              value={departmentId}
            >
              <SelectTrigger data-testid="expense-requests-department-select">
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:backoffice_expense_landing_page.department_placeholder',
                    'Select department'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {(organizationalUnits || []).map(ou => (
                  <SelectItem key={ou.id} value={ou.id} data-testid={`expense-requests-department-option-${ou.id}`}>
                    {ou.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      },
      {
        id: 'currency',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.currency', 'Currency'),
        type: 'custom',
        customComponent: (
          <div className="gba:w-56">
            <Select
              onValueChange={val => {
                setCurrencyRef(val || '')
                handleCurrencyFilter(val || '')
              }}
              value={currencyRef || ''}
            >
              <SelectTrigger data-testid="expense-requests-currency-select" className="gba:border-border">
                <SelectValue
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:manager_expense_landing_page.all_currencies',
                    'All Currencies'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {(currencies || []).map(c => (
                  <SelectItem
                    key={c.currencyRef}
                    value={c.currencyRef}
                    data-testid={`expense-requests-currency-option-${c.code}`}
                  >
                    {c.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      },
      {
        id: 'startDate',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
        type: 'custom',
        customComponent: (
          <div className="gba:w-72">
            <RangePicker
              value={startFrom && startTo ? [dayjs(startFrom), dayjs(startTo)] : null}
              onChange={handleStartDateChange}
              placeholder={[
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
              ]}
              className="gba:w-full"
              data-testid="expense-requests-start-range"
            />
          </div>
        )
      },
      {
        id: 'endDate',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
        type: 'custom',
        customComponent: (
          <div className="gba:w-72">
            <RangePicker
              value={endFrom && endTo ? [dayjs(endFrom), dayjs(endTo)] : null}
              onChange={handleEndDateChange}
              placeholder={[
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
              ]}
              className="gba:w-full"
              data-testid="expense-requests-end-range"
            />
          </div>
        )
      }
    ]
  }, [
    buildStatusFilters,
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
    debouncedAmountFilter,
    departmentId,
    currencyRef,
    startFrom,
    startTo,
    endFrom,
    endTo,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleStartDateChange,
    handleEndDateChange,
    organizationalUnits,
    currencies
  ])

  // removed unused getFilters helper

  const setFilters = useCallback(() => {
    setEmployeeFilter('')
    setSelectedEmployees([])
    setEmployeeSearchText('')
    setStatusFilter([])
    setLocalAmountMin('')
    setLocalAmountMax('')

    handleEmployeeFilter('')
    handleStatusFilter('')
    handleAmountFilter('', '')
    // Also reset department, currency and date ranges
    setDepartmentId('')
    setCurrencyRef('')
    setStartFrom(undefined)
    setStartTo(undefined)
    setEndFrom(undefined)
    setEndTo(undefined)
    handleDepartmentFilter('')
    handleCurrencyFilter('')
    handleStartDateRangeFilter('', '')
    handleEndDateRangeFilter('', '')
  }, [
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleStartDateRangeFilter,
    handleEndDateRangeFilter
  ])

  const handleEnhancedTableChange = useCallback(
    (pagination: any) => {
      handleTableChange(pagination, {}, undefined as any)
    },
    [handleTableChange]
  )

  // Helper to map column key to field name (eliminates nested ternary)
  const getFieldFromColumnKey = useCallback((columnKey: string): string => {
    if (columnKey === 'employee') {
      return 'employee.fullName'
    }
    if (columnKey === 'employeeCode') {
      return 'employee.code'
    }
    if (columnKey === 'requestNumber') {
      return 'code'
    }
    return columnKey
  }, [])

  const onSort = useCallback(
    (columnKey: string) => {
      const field = getFieldFromColumnKey(columnKey)
      // Type assertion is safe: field is always a valid SortField from the mapping
      updateSorting(
        field as
          | 'title'
          | 'startDate'
          | 'endDate'
          | 'createdAt'
          | 'status'
          | 'totalAmount'
          | 'totalRemainingAmount'
          | 'employee.fullName'
          | 'employee.code'
          | 'code'
      )
      handleTableChange({ current: 1, pageSize } as any, {} as any, undefined as any)
    },
    [getFieldFromColumnKey, handleTableChange, pageSize, updateSorting]
  )

  const isActiveSort = useCallback(
    (columnKey: string) => {
      const field = getFieldFromColumnKey(columnKey)
      return sorting.lastField === field
    },
    [getFieldFromColumnKey, sorting.lastField]
  )

  const isAsc = sorting.order === 'ASC'

  // Helper to render sort icon (reduces nested ternary complexity)
  const renderSortIcon = useCallback(
    (field: string) => {
      if (isActiveSort(field)) {
        return isAsc ? <PiArrowUp size={12} className="gba:ml-1" /> : <PiArrowDown size={12} className="gba:ml-1" />
      }
      return <span className="gba:ml-1 gba:inline-block gba:w-[12px] gba:h-[12px]" />
    },
    [isActiveSort, isAsc]
  )

  // Helper to render loading/error/empty states (reduces cognitive complexity)
  const renderEmptyState = useCallback(() => {
    if (loading && !expenses?.length) {
      return (
        <div className="gba:flex gba:justify-center gba:p-8">
          <Spinner />
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive" className="gba:m-4">
          {error}
        </Alert>
      )
    }

    return null
  }, [loading, expenses, error])

  // Render data body pattern (matches Advance Payments)
  const renderDataBody = useCallback(() => {
    const emptyState = renderEmptyState()
    if (emptyState) return emptyState

    return (
      <Card data-testid="expense-requests-container">
        <CardContent className="gba:p-0">
          {loading && !expenses?.length && (
            <div className="gba:flex gba:justify-center gba:p-4">
              <Spinner />
            </div>
          )}

          <div className="gba:overflow-x-auto gba:max-w-full gba:px-6">
            <Table
              data-testid="expense-requests-data-table"
              className="gba:min-w-[1782px] gba:w-full gba:table-fixed gba:[&>thead>tr>th]:!text-left"
            >
              <TableHeader>
                <TableRow className="gba:border-b gba:bg-muted">
                  <TableHead className="gba:w-[50px] gba:font-semibold gba:text-foreground gba:py-4 gba:px-3 gba:text-left">
                    {bookableRecordsCount > 0 && (
                      <div className="gba:flex gba:items-center gba:justify-center">
                        <Checkbox
                          checked={allBookableSelected}
                          onCheckedChange={handleSelectAllRecords}
                          data-testid="select-all-records-checkbox"
                          className="gba:cursor-pointer"
                        />
                      </div>
                    )}
                  </TableHead>
                  <TableHead className="gba:w-[60px] gba:font-semibold gba:text-foreground gba:py-4 gba:px-3 gba:text-left">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:employee_profile.employee_tabs.flows_button.actions',
                      'Actions'
                    )}
                  </TableHead>
                  <TableHead
                    className="gba:w-[22%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('employee')}
                    data-testid="header-sort-employee"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')}
                      {renderSortIcon('employee')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[16%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('employeeCode')}
                    data-testid="header-sort-employeeCode"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_table.employee_code',
                        'Employee Code'
                      )}
                      {renderSortIcon('employeeCode')}
                    </div>
                  </TableHead>
                  <TableHead className="gba:w-[16%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:expense_config_calculation_rule_list.expense_table.sap_number',
                      'SAP Number'
                    )}
                  </TableHead>
                  <TableHead
                    className="gba:w-[18%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('requestNumber')}
                    data-testid="header-sort-requestNumber"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_request_filter.request_number_input',
                        'Request Number'
                      )}
                      {renderSortIcon('requestNumber')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[20%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('title')}
                    data-testid="header-sort-title"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.title',
                        'Title'
                      )}
                      {renderSortIcon('title')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[14%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('startDate')}
                    data-testid="header-sort-startDate"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_plan_list.expense_plan_table.start_date',
                        'Start Date'
                      )}
                      {renderSortIcon('startDate')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[14%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('endDate')}
                    data-testid="header-sort-endDate"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_plan_list.expense_plan_table.end_date',
                        'End Date'
                      )}
                      {renderSortIcon('endDate')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[14%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('createdAt')}
                    data-testid="header-sort-createdAt"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:manager_expense_request_list.expense_table.creation_date',
                        'Creation Date'
                      )}
                      {renderSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[22%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('status')}
                    data-testid="header-sort-status"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.status',
                        'Status'
                      )}
                      {renderSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[18%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('totalRemainingAmount')}
                    data-testid="header-sort-remainingAmount"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.remaining', 'Remaining Amount')}
                      {renderSortIcon('totalRemainingAmount')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:w-[20%] gba:font-semibold gba:text-foreground gba:py-4 gba:px-6 gba:text-left gba:cursor-pointer"
                    onClick={() => onSort('totalAmount')}
                    data-testid="header-sort-total"
                  >
                    <div className="gba:flex gba:items-center gba:gap-1">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_request_list.expense_plan_table.total_amount',
                        'Total Amount'
                      )}
                      {renderSortIcon('totalAmount')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && totalItems === 0 && (!expenses || expenses.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={12} className="gba:py-8 gba:text-center">
                      <div className="gba:text-muted-foreground">
                        {hasActiveFilters
                          ? getTranslationFromI18nKeyAndLabel(
                              'lowcoder:team_expenses_page.dashboard_tab.no_data_found',
                              'No data available'
                            )
                          : getTranslationFromI18nKeyAndLabel(
                              'lowcoder:backoffice_expense_landing_page.no_requests_created_yet',
                              'No expense requests created yet.'
                            )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses?.map((record: ExpenseData) => (
                    <ExpenseRequestTableRow
                      key={record.id}
                      record={record}
                      accessToken={accessToken}
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
    )
  }, [
    loading,
    expenses,
    error,
    renderEmptyState,
    bookableRecordsCount,
    allBookableSelected,
    isActiveSort,
    isAsc,
    onSort,
    handleSelectAllRecords,
    accessToken,
    handleRowClick,
    handleNavigateToExpenseRequest,
    handleDownloadAccountingNote,
    handleTriggerCSV,
    handlePrintExpenseRequest,
    handleTransferPayment,
    selectedRowKeys,
    handleSelectRecord,
    currentPage,
    pageSize,
    totalItems,
    handleEnhancedTableChange
  ])

  // Export functionality
  const [isExporting, setIsExporting] = useState(false)

  // Initialize GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)

  // Helper function to transform expense request data (aligned with useExpenseRequests hook)
  const transformExpenseRequest = useCallback((item: any): ExpenseData => {
    return {
      id: item.id,
      expenseId: String(item.id ?? '-'),
      code: item.code ?? '-',
      sapNumber: item.employee?.additionalProperties?.SAPNumber ?? '-',
      employee: `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() || '-',
      employeeCode: item.employee?.code ?? '-',
      title: item.title ?? '-',
      department: item.employee?.employeePosition?.costCenter?.name ?? '-',
      startDate: formatDateLocalized(item.startDate),
      endDate: formatDateLocalized(item.endDate),
      requestDate: formatDateLocalized(item.requestDate),
      reporter: `${item.employee?.firstName ?? ''} ${item.employee?.lastName ?? ''}`.trim() || '-',
      type: item.requestType?.value ?? '-',
      amount: String(item.totalAmount ?? 0),
      advance: item.advancePaymentPaidAmount ?? 0,
      payableAmount: String(item.payableAmount ?? 0),
      paymentMethod: item.paymentMethod ?? '-',
      employeeId: item.employee?.id ?? '-',
      version: String(item.version ?? ''),
      currencyRef: item.currencyRef ?? '',
      typeRef: item.typeRef ?? '',
      requestTypeRef: item.requestTypeRef ?? '',
      totalRemainingAmount: item.totalRemainingAmount ?? 0,
      userId: item.userId ?? '-',
      expenseRuleId: item.expenseRuleId ?? '-',
      totalAmount: item.totalAmount ?? 0,
      currency: { code: item.currency?.code ?? '' },
      status: item.status ?? 'UNKNOWN',
      creationDate: formatDateLocalized(item.createdAt),
      employeeDocumentId: item.employeeDocumentId ?? '-',
      documentData: item.documentData
    }
  }, [])

  // Helper to build query conditions (reduces cognitive complexity)
  // Helper to format start date range label (avoids nested ternary)
  const getStartDateLabel = useCallback((): string => {
    if (!startFrom && !startTo) {
      return 'Start: All'
    }
    const fromLabel = startFrom ? formatDateLocalized(startFrom) : '-'
    const toLabel = startTo ? formatDateLocalized(startTo) : '-'
    return `Start: ${fromLabel} → ${toLabel}`
  }, [startFrom, startTo])

  // Helper to format end date range label (avoids nested ternary)
  const getEndDateLabel = useCallback((): string => {
    if (!endFrom && !endTo) {
      return 'End: All'
    }
    const fromLabel = endFrom ? formatDateLocalized(endFrom) : '-'
    const toLabel = endTo ? formatDateLocalized(endTo) : '-'
    return `End: ${fromLabel} → ${toLabel}`
  }, [endFrom, endTo])

  // Helper to format currency label (avoids nested ternary with optional chaining)
  const getCurrencyLabel = useCallback((): string => {
    if (!currencyRef) {
      return 'Currency: All'
    }
    const currency = currencies?.find(c => c.currencyRef === currencyRef)
    const currencyCode = currency?.code || currencyRef.split(':').pop() || currencyRef
    return `Currency: ${currencyCode}`
  }, [currencyRef, currencies])

  // Helper to get CSV export button title (reduces nested ternary complexity)
  const getExportCsvTitle = useCallback((): string => {
    if (isExporting) {
      return 'Exporting all pages...'
    }
    if (totalItems === 0) {
      return 'No expenses to export'
    }
    return `Export all ${totalItems} expense requests to CSV`
  }, [isExporting, totalItems])

  // Helper to get Excel export button title (avoids nested ternary)
  const getExportExcelTitle = useCallback((): string => {
    if (isExporting) {
      return 'Exporting all pages...'
    }
    if (totalItems === 0) {
      return 'No expenses to export'
    }
    return `Export all ${totalItems} expense requests to Excel`
  }, [isExporting, totalItems])

  // Memoize actions array to ensure it updates when selectedBookableCount changes
  const dataControllerActions = useMemo(() => {
    return hasBookableSelected
      ? [
          <Button
            key={`bulk-transfer-${selectedBookableCount}`}
            onClick={handleBulkTransfer}
            data-testid="bulk-transfer-payment-button"
            variant="outline"
            size="sm"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:transfer_payment', 'Transfer Payment')} (
            {selectedBookableCount}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.selected', 'selected')})
          </Button>
        ]
      : []
  }, [hasBookableSelected, selectedBookableCount])

  // Helper to build search condition (reduces cognitive complexity of buildQueryConditions)
  const buildSearchCondition = useCallback((searchValue: string): any => {
    return {
      _or: [
        { employee: { firstName: { _ilike: searchValue } } },
        { employee: { lastName: { _ilike: searchValue } } },
        { employee: { displayName: { _ilike: searchValue } } },
        { employee: { code: { _ilike: searchValue } } },
        { title: { _ilike: searchValue } },
        { code: { _ilike: searchValue } },
        {
          employee: {
            employeePosition: {
              costCenter: { name: { _ilike: searchValue } }
            }
          }
        },
        {
          employee: {
            employeePosition: {
              organizationalUnit: { name: { _ilike: searchValue } }
            }
          }
        },
        { requestType: { value: { _ilike: searchValue } } },
        {
          requestType: { translations: { value: { _ilike: searchValue } } }
        },
        { currency: { code: { _ilike: searchValue } } }
      ]
    }
  }, [])

  // Helper to build date range condition (reduces cognitive complexity)
  // Note: Returns 'any' type for GraphQL query conditions (null when no range specified)
  const buildDateRangeCondition = useCallback((from: string | undefined, to: string | undefined): any => {
    if (!from && !to) {
      return null
    }
    const rangeCond: any = {}
    if (from) rangeCond._gte = from
    if (to) rangeCond._lte = to
    return rangeCond
  }, [])

  // Helper to handle clearing all filters (avoids boolean parameter pattern)
  const handleClearAllFilters = useCallback(() => {
    setEmployeeFilter('')
    setSelectedEmployees([])
    setEmployeeSearchText('')
    setStatusFilter([])
    setLocalAmountMin('')
    setLocalAmountMax('')
    setDepartmentId('')
    setCurrencyRef('')
    setStartFrom(undefined)
    setStartTo(undefined)
    setEndFrom(undefined)
    setEndTo(undefined)

    handleEmployeeFilter('')
    handleStatusFilter('')
    handleAmountFilter('', '')
    handleDepartmentFilter('')
    handleCurrencyFilter('')
    handleStartDateRangeFilter('', '')
    handleEndDateRangeFilter('', '')
  }, [
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleStartDateRangeFilter,
    handleEndDateRangeFilter
  ])

  // Helper to handle employee filter removal (avoids boolean parameter pattern)
  const handleRemoveEmployeeFilter = useCallback(() => {
    setEmployeeFilter('')
    setSelectedEmployees([])
    setEmployeeSearchText('')
    handleEmployeeFilter('')
  }, [handleEmployeeFilter])

  // Helper: Build amount filter condition (reduces cognitive complexity)
  // Note: Returns 'any' type for GraphQL query conditions (null when no amount filter)
  const buildAmountCondition = useCallback((): any => {
    if (!amountMinFilter && !amountMaxFilter) {
      return null
    }
    const amountConditions: any = {}
    if (amountMinFilter) {
      amountConditions._gte = Number.parseFloat(amountMinFilter)
    }
    if (amountMaxFilter) {
      amountConditions._lte = Number.parseFloat(amountMaxFilter)
    }
    return Object.keys(amountConditions).length > 0 ? { totalAmount: amountConditions } : null
  }, [amountMinFilter, amountMaxFilter])

  // Helper: Build all filter conditions (reduces cognitive complexity)
  const buildAllFilterConditions = useCallback((): any[] => {
    const conditions: any[] = []

    if (statusFilter?.length > 0) {
      conditions.push({ status: { _in: statusFilter } })
    }

    if (employeeFilter) {
      conditions.push({ employee: { id: { _eq: employeeFilter } } })
    }

    const amountCond = buildAmountCondition()
    if (amountCond) {
      conditions.push(amountCond)
    }

    if (departmentId) {
      conditions.push({
        employee: { employeePosition: { organizationalUnitId: { _eq: departmentId } } }
      })
    }

    if (currencyRef) {
      conditions.push({ currencyRef: { _eq: currencyRef } })
    }

    const startDateRange = buildDateRangeCondition(startFrom, startTo)
    if (startDateRange) {
      conditions.push({ startDate: startDateRange })
    }

    const endDateRange = buildDateRangeCondition(endFrom, endTo)
    if (endDateRange) {
      conditions.push({ endDate: endDateRange })
    }

    if (searchText?.trim()) {
      conditions.push(buildSearchCondition(`%${searchText.trim()}%`))
    }

    return conditions
  }, [
    statusFilter,
    employeeFilter,
    buildAmountCondition,
    departmentId,
    currencyRef,
    startFrom,
    startTo,
    endFrom,
    endTo,
    searchText,
    buildDateRangeCondition,
    buildSearchCondition
  ])

  const buildQueryConditions = useCallback(() => {
    const conditions: any[] = [{ isDeleted: { _eq: false } }, ...buildAllFilterConditions()]
    return conditions.length === 1 ? conditions[0] : { _and: conditions }
  }, [buildAllFilterConditions])

  // Fetch all expense requests for export (bypassing pagination)
  const fetchAllExpenseRequestsForExport = useCallback(async (): Promise<ExpenseData[]> => {
    const batchLimit = 1000
    const allExpenses: ExpenseData[] = []
    let offset = 0

    try {
      while (true) {
        const baseWhere = buildQueryConditions()

        const variables = {
          where: baseWhere,
          limit: batchLimit,
          offset,
          orderBy: [{ createdAt: 'DESC' }]
        }

        const response = await graphqlClient.request(GET_EXPENSE_REQUESTS, variables)
        const responseData = response as ExpenseRequestQueryData

        if (!responseData?.ExpenseRequest || responseData.ExpenseRequest.length === 0) {
          break
        }

        const transformedData = responseData.ExpenseRequest.map(transformExpenseRequest)
        allExpenses.push(...transformedData)

        // If we got fewer results than the batch limit, we've reached the end
        if (responseData.ExpenseRequest.length < batchLimit) {
          break
        }

        offset += batchLimit
      }

      return allExpenses
    } catch {
      console.error('[EXPORT] Error fetching all expense requests:', error)
      throw error
    }
  }, [graphqlClient, totalItems, buildQueryConditions, transformExpenseRequest])

  // Export columns ordered to match UI table
  const getExportColumns = () => [
    { key: 'employee', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.employee', 'Employee') },
    {
      key: 'employeeCode',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.employee_code', 'Employee Code')
    },
    {
      key: 'sapNumber',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_config_calculation_rule_list.expense_table.sap_number',
        'SAP Number'
      )
    },
    {
      key: 'code',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.request_number', 'Request Number')
    },
    { key: 'title', title: 'Title' },
    {
      key: 'startDate',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.start_date', 'Start Date')
    },
    { key: 'endDate', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.end_date', 'End Date') },
    {
      key: 'creationDate',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.creation_date', 'Creation Date')
    },
    { key: 'status', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.status', 'Status') },
    {
      key: 'totalRemainingAmount',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.remaining', 'Remaining Amount')
    },
    {
      key: 'totalAmount',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.total_amount', 'Total Amount')
    },
    { key: 'currency', title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.currency', 'Currency') },
    {
      key: 'department',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.department', 'Department')
    },
    {
      key: 'requestDate',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.request_date', 'Request Date')
    }
  ]

  const formatExpenseForExport = (expense: ExpenseData) => ({
    code: expense.code || '-',
    employee: expense.employee || '-',
    employeeCode: expense.employeeCode || '-',
    sapNumber: expense.sapNumber || '-',
    title: expense.title || '-',
    department: expense.department || '-',
    startDate: expense.startDate,
    endDate: expense.endDate,
    requestDate: expense.requestDate,
    totalRemainingAmount: expense.totalRemainingAmount
      ? formatNumberFunction(String(expense.totalRemainingAmount))
      : '0',
    totalAmount: expense.totalAmount ? formatNumberFunction(String(expense.totalAmount)) : '0',
    currency: expense.currency?.code || '-',
    status: getExpenseRequestStatusDisplay(expense.status as ExpenseStatus).label,
    creationDate: expense.creationDate
  })

  const handleExportCsv = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()

      if (isExporting) {
        return
      }

      if (totalItems === 0) {
        toast.error('No Data Available', {
          description: 'No expense data available to export'
        })
        return
      }

      setIsExporting(true)

      try {
        // Fetch ALL expense requests (all pages)
        const allExpenses = await fetchAllExpenseRequestsForExport()

        if (!allExpenses || allExpenses.length === 0) {
          toast.error('No Data Available', {
            description: 'No expense data available to export'
          })
          return
        }

        const formattedData = allExpenses.map(formatExpenseForExport)
        const columns = getExportColumns()
        const filename = buildFilename('expense-requests', 'csv')
        downloadCsv(formattedData, columns, filename)

        toast.success('Export Successful', {
          description: `Exported ${formattedData.length} expense requests to CSV`
        })
      } catch (err) {
        console.error('[EXPORT CSV] Error during export:', err)
        toast.error('Export Failed', {
          description:
            'Failed to export CSV: ' +
            (err instanceof Error ? err.message : typeof err === 'string' ? err : String(err))
        })
      } finally {
        setIsExporting(false)
      }
    },
    [isExporting, totalItems, fetchAllExpenseRequestsForExport, formatExpenseForExport, getExportColumns]
  )

  const handleExportExcel = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()

      if (isExporting) {
        return
      }

      if (totalItems === 0) {
        toast.error('No Data Available', {
          description: 'No expense data available to export'
        })
        return
      }

      setIsExporting(true)

      try {
        // Fetch ALL expense requests (all pages)
        const allExpenses = await fetchAllExpenseRequestsForExport()

        if (!allExpenses || allExpenses.length === 0) {
          toast.error('No Data Available', {
            description: 'No expense data available to export'
          })
          return
        }

        const formattedData = allExpenses.map(formatExpenseForExport)
        const columns = getExportColumns()
        const filename = buildFilename('expense-requests', 'xlsx')
        downloadExcel(formattedData, columns, filename)

        toast.success('Export Successful', {
          description: `Exported ${formattedData.length} expense requests to Excel`
        })
      } catch (err) {
        console.error('[EXPORT EXCEL] Error during export:', err)
        toast.error('Export Failed', {
          description:
            'Failed to export Excel: ' +
            (err instanceof Error ? err.message : typeof err === 'string' ? err : String(err))
        })
      } finally {
        setIsExporting(false)
      }
    },
    [isExporting, totalItems, fetchAllExpenseRequestsForExport, formatExpenseForExport, getExportColumns]
  )

  // Keep DataContainer mounted at all times to avoid closing the filter sidebar during loading/errors

  return (
    <div className="gba:relative gba:w-full gba:h-full gba:-mx-6" data-testid="expense-requests-table-wrapper">
      {/* Export buttons overlay - positioned absolutely over the DataContainer header */}
      {/* Hide export buttons when records are selected to avoid overlap with bulk action buttons */}
      {selectedRecords.length === 0 && (
        <div
          className="gba:absolute gba:top-[16px] gba:right-[16px] gba:z-[10] gba:flex gba:gap-2"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 10,
            pointerEvents: 'auto'
          }}
          data-testid="export-buttons-overlay"
        >
          <Button
            onClick={handleExportCsv}
            variant="outline"
            size="sm"
            disabled={isExporting || totalItems === 0}
            data-testid="expense-requests-export-csv-button"
            title={getExportCsvTitle()}
          >
            <PiDownload className="gba:mr-2" />
            {isExporting ? 'Exporting...' : getTranslationFromI18nKeyAndLabel('lowcoder:export_csv', 'CSV')}
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            disabled={isExporting || totalItems === 0}
            data-testid="expense-requests-export-excel-button"
            title={getExportExcelTitle()}
          >
            <PiFileXls className="gba:mr-2" />
            {isExporting ? 'Exporting...' : getTranslationFromI18nKeyAndLabel('lowcoder:export_excel', 'Excel')}
          </Button>
        </div>
      )}

      <DataContainer
        contentBackground="white"
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
          filter: selectedFilters,
          setFilter: setFilters,
          filterLabelMap: {
            status:
              statusFilter.length > 0
                ? `Status: ${statusFilter.map(s => getExpenseRequestStatusDisplay(s).label).join(', ')}`
                : 'Status: All',
            employee: employeeFilter ? `Employee: ${selectedEmployees.map(e => e.name).join(', ')}` : 'Employee: All',
            amount: `Amount: ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
            department: departmentId ? `Department: ${selectedDepartmentName || departmentId}` : 'Department: All',
            currency: getCurrencyLabel(),
            startDate: getStartDateLabel(),
            endDate: getEndDateLabel()
          },
          actions: dataControllerActions
        }}
        dataFilterProps={{
          // Keep filter sidebar available regardless of current result count
          filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            // Clear all filters
            if (filterId === '' && selected) {
              handleClearAllFilters()
              return
            }

            // Remove employee filter
            if (filterId === 'employee' && !selected) {
              handleRemoveEmployeeFilter()
              return
            }

            // Handle status filter changes
            if (availableStatuses.includes(filterId)) {
              handleStatusFilterChange(filterId, selected)
            }
          }
        }}
        dataBody={renderDataBody()}
      />

      <Sheet
        open={!!selectedExpense}
        onOpenChange={open => {
          if (!open) {
            handleCloseDetails()
          }
        }}
        title={
          selectedExpense?.title ||
          getTranslationFromI18nKeyAndLabel('expense.request.details.title', 'Expense Request Details')
        }
        data-testid="backoffice-expense-request-details-sheet"
      >
        <SheetContent className="gba:w-[600px] gba:sm:w-[600px] gba:max-w-none">
          <ExpenseDetailsShell
            title={
              selectedExpense?.title ||
              getTranslationFromI18nKeyAndLabel('expense.request.details.title', 'Expense Request Details')
            }
          >
            {selectedExpense ? (
              <ExpenseDetailsPanelContent
                dataTestIdPrefix="backoffice-expense-request-details"
                record={selectedExpense as any}
                formatAmount={(amount, currencyCode) => formatCurrency(amount, currencyCode)}
                showHeader={false}
                headerRight={
                  <Badge
                    variant={getExpenseRequestStatusDisplay(selectedExpense.status).badgeVariant || 'outline'}
                    data-testid="expense-request-status-badge"
                  >
                    {getExpenseRequestStatusDisplay(selectedExpense.status).label}
                  </Badge>
                }
                extraContent={
                  <TravelOrderAttachmentPreview
                    record={selectedExpense as any}
                    fetchPdf={printExpenseRequest as any}
                    dataTestIdPrefix="backoffice-expense-request-details"
                  />
                }
                footer={
                  <>
                    <Separator />
                    <div className="gba:flex gba:justify-end gba:mt-4">
                      <Button
                        variant="default"
                        onClick={() => {
                          const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
                            expenseRequestId: selectedExpense.id ? String(selectedExpense.id) : '',
                            referrer: '/platform/fin/expenses/backoffice-expenses?tab=expense-requests'
                          })
                          navigateTo(url)
                        }}
                        data-testid="view-expense-request-details-button"
                      >
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:team_expenses_page.plan_details.view_full_details',
                          'View Full Details'
                        )}
                      </Button>
                    </div>
                  </>
                }
              />
            ) : null}
          </ExpenseDetailsShell>
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
    </div>
  )
}

export default ExpenseRequestsTable
