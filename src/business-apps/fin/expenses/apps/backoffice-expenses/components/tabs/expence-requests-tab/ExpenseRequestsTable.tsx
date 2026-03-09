/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequests } from '../../../hooks/useExpenseRequests'
import { useDebounce } from '@/common/hooks/useDebounce'
import { ExpenseData } from '../../../types'
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
  Separator,
  Badge,
  Card,
  CardContent,
  Sheet,
  SheetContent
} from '@newwork/nw-design-system'
import { ArrowUpIcon, ArrowDownIcon, DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrency } from '../../../utils/currencyUtils'
import { DatePicker, Tooltip } from 'antd'
import { InfoIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { useFilterData, type OrganizationalUnit, type Currency } from '../../../hooks/useFilterData'
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../../utils/utils'
import { buildStatusDisplayName } from '../../../utils/sharedUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import CurrencySelectFilter from '../common/CurrencySelectFilter'
import DepartmentSelectFilter from '../common/DepartmentSelectFilter'
import { useExpenseRequestExport } from './expenseRequestExport'
import { useExpenseRequestQueryBuilder } from './expenseRequestQueryBuilder'
import {
  getStartDateLabel,
  getEndDateLabel,
  getCurrencyLabel,
  getDepartmentLabel,
  getEffectiveDateLabel,
  getRequestDateLabel
} from './expenseRequestFilterLabels'
import TravelOrderAttachmentPreview from '../../../../../common/components/TravelOrderAttachmentPreview'
import { useExpenseRequestFileService as useCommonExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import { ExpenseDetailsPanelContent } from '../../../../../common/components/details-panel/ExpenseDetailsPanelContent'
import ExpenseDetailsShell from '../../../../../common/components/details-panel/ExpenseDetailsShell'
import { getActiveStructureDepartmentOptions } from '../../../utils/departmentOptions'

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

const DATA_TEST_ID_PREFIX = 'expense-requests'
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

  const sanitizeUrlParam = (value: string | null, maxLength: number): string => {
    if (!value) return ''
    return value.replace(/[<>]/g, '').slice(0, maxLength)
  }

  const sanitizeIntParam = (value: string | null, fallback: number, minValue: number): number => {
    const parsed = value ? Number.parseInt(value, 10) : fallback
    if (Number.isNaN(parsed)) return fallback
    return Math.max(parsed, minValue)
  }

  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken
    }),
    [props.accessToken]
  )

  // Deterministic scroll target for pagination (top of table)
  const tableTopRef = useRef<HTMLDivElement | null>(null)

  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(globalThis.location.search)
    return {
      search: sanitizeUrlParam(urlParams.get('search'), 200),
      page: sanitizeIntParam(urlParams.get('page'), 1, 1),
      pageSize: sanitizeIntParam(urlParams.get('pageSize'), 20, 1),
      status: sanitizeUrlParam(urlParams.get('status'), 50),
      department: sanitizeUrlParam(urlParams.get('department'), 100)
    }
  })

  const [searchText, setSearchText] = useState<string>(search ?? initialParams.search)
  const debouncedSearchText = useDebounce(searchText, 300)
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
    amountMaxFilter,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
    setRequestTypeFilter
  } = useExpenseRequests(contextProps, isActive)

  const { isPdfModalVisible, pdfUrl, pdfLoading, pdfError, handlePrintExpenseRequest, handleClosePdfModal } =
    useExpenseRequestPdf(props)

  const { handleDownloadAccountingNote, handleTriggerCSV } = useExpenseRequestActions(props)

  const { handleTransferPayment, handleBulkTransferPayment, isTransferInProgress, isBulkTransferInProgress } =
    useExpenseRequestTransfer(
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
  // Date range filters - matching manager/personal expenses pattern
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [startFrom, setStartFrom] = useState<string | undefined>()
  const [startTo, setStartTo] = useState<string | undefined>()
  const [endFrom, setEndFrom] = useState<string | undefined>()
  const [endTo, setEndTo] = useState<string | undefined>()
  // Request type filter (EXPENSES, TRIP) - radio button behavior
  const [requestTypeFilterLocal, setRequestTypeFilterLocal] = useState<string[]>([])
  const RangePicker = DatePicker.RangePicker

  // ⚡ PERFORMANCE: Always fetch locally as fallback, but prefer propsFilterData if it has valid data
  const localFilterData = useFilterData({ accessToken })
  // Use propsFilterData if it has valid organizationalUnits, otherwise fall back to localFilterData
  const filterData = (propsFilterData?.organizationalUnits?.length ?? 0) > 0 ? propsFilterData : localFilterData
  const { organizationalUnits = [], currencies = [] } = filterData || {}

  const departmentOptions = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits || []),
    [organizationalUnits]
  )

  const selectedFilters: string[] = useMemo(() => {
    return [
      ...(statusFilter.length > 0 ? statusFilter : []),
      ...(employeeFilter ? ['employee'] : []),
      ...(amountMinFilter || amountMaxFilter ? ['amount'] : []),
      ...(departmentId ? ['department'] : []),
      ...(currencyRef ? ['currency'] : []),
      ...(effectiveDateRange && (effectiveDateRange[0] || effectiveDateRange[1]) ? ['effectiveDateRange'] : []),
      ...(requestDateRange && (requestDateRange[0] || requestDateRange[1]) ? ['requestDateRange'] : []),
      ...(startFrom || startTo ? ['startDate'] : []),
      ...(endFrom || endTo ? ['endDate'] : []),
      ...requestTypeFilterLocal
    ]
  }, [
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentId,
    currencyRef,
    effectiveDateRange,
    requestDateRange,
    startFrom,
    startTo,
    endFrom,
    endTo,
    requestTypeFilterLocal
  ])

  const hasActiveFilters = useMemo(() => {
    const hasSearch = (searchText || '').trim() !== ''

    return hasSearch || selectedFilters.length > 0
  }, [searchText, selectedFilters])
  const wasActiveRef = useRef<boolean>(isActive)
  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current
    if (becameActive) {
      const hasAnySelectedFilters = selectedFilters.length > 0 || (searchText || '').trim() !== ''
      if (!hasAnySelectedFilters) {
        setStatusFilter(['BOOKED'])
        handleStatusFilter('BOOKED')
      }
    }
    wasActiveRef.current = isActive
  }, [isActive, selectedFilters.length, searchText, setStatusFilter, handleStatusFilter])

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

  useEffect(() => {
    handleSearch(debouncedSearchText)
  }, [debouncedSearchText, handleSearch])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value)
      onSearchChange?.(value)
    },
    [onSearchChange]
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
    return selectedRecords.filter(r => r.status === 'BOOKED').length
  }, [selectedRecords])

  // Helper function to format status display name with brackets (matching personal expenses pattern)
  const getStatusDisplayName = useCallback(
    (status: string): string => buildStatusDisplayName(status, getExpenseRequestStatusDisplay),
    []
  )

  // Helper: Build unique status filters (reduces cognitive complexity)
  const buildStatusFilters = useCallback(() => {
    const byLabel = new Map<string, { id: string; label: string; selected: boolean }>()
    for (const status of availableStatuses) {
      const label = getStatusDisplayName(status).trim()
      const key = label.toLowerCase()
      if (!byLabel.has(key)) {
        byLabel.set(key, { id: status, label, selected: statusFilter.includes(status) })
      }
    }
    return Array.from(byLabel.values())
  }, [availableStatuses, statusFilter, getStatusDisplayName])

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

  // Helper: Handle effective date range change
  const handleEffectiveDateChange = useCallback(
    (dates: any) => {
      if (!dates?.[0] || !dates?.[1]) {
        setEffectiveDateRange(null)
        setEffectiveDateRangeFilter(null)
        return
      }
      const fromDate = dates[0]?.toDate() || null
      const toDate = dates[1]?.toDate() || null
      setEffectiveDateRange([fromDate, toDate])
      // Convert to ISO strings for GraphQL query
      setEffectiveDateRangeFilter({
        from: fromDate ? dayjs(fromDate).startOf('day').toISOString() : undefined,
        to: toDate ? dayjs(toDate).endOf('day').toISOString() : undefined
      })
    },
    [setEffectiveDateRangeFilter]
  )

  // Helper: Handle request date range change
  const handleRequestDateChange = useCallback(
    (dates: any) => {
      if (!dates?.[0] || !dates?.[1]) {
        setRequestDateRange(null)
        setRequestDateRangeFilter(null)
        return
      }
      const fromDate = dates[0]?.toDate() || null
      const toDate = dates[1]?.toDate() || null
      setRequestDateRange([fromDate, toDate])
      // Convert to ISO strings for GraphQL query
      setRequestDateRangeFilter({
        from: fromDate ? dayjs(fromDate).startOf('day').toISOString() : undefined,
        to: toDate ? dayjs(toDate).endOf('day').toISOString() : undefined
      })
    },
    [setRequestDateRangeFilter]
  )

  // Helper: Handle request type filter change
  const handleRequestTypeFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (selected) {
        // Radio button behavior: only one can be selected
        const newFilter = [filterId]
        setRequestTypeFilterLocal(newFilter)
        setRequestTypeFilter(newFilter)
      } else {
        setRequestTypeFilterLocal([])
        setRequestTypeFilter([])
      }
    },
    [setRequestTypeFilter]
  )

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    return [
      // Currency first (matching manager/personal pattern)
      {
        id: 'currency',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.currency', 'Currency'),
        type: 'custom',
        customComponent: (
          <CurrencySelectFilter
            currencyRef={currencyRef}
            onCurrencyChange={val => {
              setCurrencyRef(val)
              handleCurrencyFilter(val)
            }}
            currencies={currencies}
            testIdPrefix="expense-requests"
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
          <DepartmentSelectFilter
            departmentId={departmentId}
            onDepartmentChange={val => {
              setDepartmentId(val)
              handleDepartmentFilter(val)
            }}
            departmentOptions={departmentOptions}
            testIdPrefix="expense-requests"
          />
        )
      },
      // Effective Date Range
      {
        id: 'effectiveDateRange',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
        type: 'custom',
        customComponent: (
          <div className="gba:w-full">
            <RangePicker
              value={
                effectiveDateRange?.[0] && effectiveDateRange?.[1]
                  ? [dayjs(effectiveDateRange[0]), dayjs(effectiveDateRange[1])]
                  : null
              }
              onChange={handleEffectiveDateChange}
              placeholder={[
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
              ]}
              format="YYYY-MM-DD"
              allowClear
              allowEmpty={[true, true]}
              className="gba:w-full"
              data-testid="expense-requests-effective-date-range"
            />
            <div
              className="gba:mt-2 gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1"
              data-testid="effective-date-hint"
            >
              <Tooltip
                title={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:personal_expenses.effective_date_info',
                  'For type TRIP, the start date is used. For type EXPENSE, the item expense date is used.'
                )}
                placement="right"
              >
                <InfoIcon size={16} data-testid="effective-date-info" />
              </Tooltip>
            </div>
          </div>
        )
      },
      // Creation Date Range
      {
        id: 'requestDateRange',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:manager_expense_request_list.expense_table.creation_date',
          'Creation Date'
        ),
        type: 'custom',
        customComponent: (
          <div className="gba:w-full">
            <RangePicker
              value={
                requestDateRange?.[0] && requestDateRange?.[1]
                  ? [dayjs(requestDateRange[0]), dayjs(requestDateRange[1])]
                  : null
              }
              onChange={handleRequestDateChange}
              placeholder={[
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
              ]}
              format="YYYY-MM-DD"
              allowClear
              allowEmpty={[true, true]}
              className="gba:w-full"
              data-testid="expense-requests-request-date-range"
            />
          </div>
        )
      },
      // Start Date Range
      {
        id: 'startDate',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
        type: 'custom',
        customComponent: (
          <div className="gba:w-full">
            <RangePicker
              value={startFrom && startTo ? [dayjs(startFrom), dayjs(startTo)] : null}
              onChange={handleStartDateChange}
              placeholder={[
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
              ]}
              format="YYYY-MM-DD"
              allowClear
              allowEmpty={[true, true]}
              className="gba:w-full"
              data-testid="expense-requests-start-range"
            />
          </div>
        )
      },
      // End Date Range
      {
        id: 'endDate',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
        type: 'custom',
        customComponent: (
          <div className="gba:w-full">
            <RangePicker
              value={endFrom && endTo ? [dayjs(endFrom), dayjs(endTo)] : null}
              onChange={handleEndDateChange}
              placeholder={[
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
                getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date')
              ]}
              format="YYYY-MM-DD"
              allowClear
              allowEmpty={[true, true]}
              className="gba:w-full"
              data-testid="expense-requests-end-range"
            />
          </div>
        )
      },
      // Status
      {
        id: 'status',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
        type: 'checkbox',
        filters: buildStatusFilters()
      },
      // Request Type
      {
        id: 'requestType',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
          'Request Type'
        ),
        type: 'radio' as any,
        filters: [
          {
            id: 'ExpenseRequestType:v1:EXPENSES',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense'),
            selected: requestTypeFilterLocal.includes('ExpenseRequestType:v1:EXPENSES')
          },
          {
            id: 'ExpenseRequestType:v1:TRIP',
            label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip'),
            selected: requestTypeFilterLocal.includes('ExpenseRequestType:v1:TRIP')
          }
        ]
      },
      // Employee
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
      // Amount
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
    effectiveDateRange,
    requestDateRange,
    startFrom,
    startTo,
    endFrom,
    endTo,
    requestTypeFilterLocal,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleEffectiveDateChange,
    handleRequestDateChange,
    handleStartDateChange,
    handleEndDateChange,
    organizationalUnits,
    currencies
  ])

  // removed unused getFilters helper

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
    if (columnKey === 'totalAmount') {
      return 'reimbursableAmount'
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
          | 'reimbursableAmount'
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
        return isAsc ? <ArrowUpIcon size={12} className="gba:ml-1" /> : <ArrowDownIcon size={12} className="gba:ml-1" />
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
      <div ref={tableTopRef} data-testid={`${DATA_TEST_ID_PREFIX}-scroll-anchor`}>
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
                    <TableHead className="gba:w-[50px] gba:min-w-[50px] gba:max-w-[50px] gba:box-border">
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
                    <TableHead className="gba:w-[60px] gba:min-w-[60px] gba:max-w-[60px] gba:box-border">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:employee_profile.employee_tabs.flows_button.actions',
                        'Actions'
                      )}
                    </TableHead>
                    <TableHead
                      className="gba:w-[22%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('employee')}
                      data-testid="header-sort-employee"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:hr_absences.create_absence.employee',
                            'Employee'
                          )}
                        </span>
                        {renderSortIcon('employee')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[16%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('employeeCode')}
                      data-testid="header-sort-employeeCode"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_request_table.employee_code',
                            'Employee Code'
                          )}
                        </span>
                        {renderSortIcon('employeeCode')}
                      </div>
                    </TableHead>
                    <TableHead className="gba:w-[16%]">
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:expense_config_calculation_rule_list.expense_table.sap_number',
                        'SAP Number'
                      )}
                    </TableHead>
                    <TableHead
                      className="gba:w-[18%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('requestNumber')}
                      data-testid="header-sort-requestNumber"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
                            'Request Number'
                          )}
                        </span>
                        {renderSortIcon('requestNumber')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[20%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('title')}
                      data-testid="header-sort-title"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:manager_expense_request_list.expense_table.title',
                            'Title'
                          )}
                        </span>
                        {renderSortIcon('title')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[14%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('startDate')}
                      data-testid="header-sort-startDate"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_plan_list.expense_plan_table.start_date',
                            'Start Date'
                          )}
                        </span>
                        {renderSortIcon('startDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[14%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('endDate')}
                      data-testid="header-sort-endDate"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_plan_list.expense_plan_table.end_date',
                            'End Date'
                          )}
                        </span>
                        {renderSortIcon('endDate')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[14%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('createdAt')}
                      data-testid="header-sort-createdAt"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:manager_expense_request_list.expense_table.creation_date',
                            'Creation Date'
                          )}
                        </span>
                        {renderSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[22%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('status')}
                      data-testid="header-sort-status"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_request_list.expense_plan_table.status',
                            'Status'
                          )}
                        </span>
                        {renderSortIcon('status')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[18%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('totalRemainingAmount')}
                      data-testid="header-sort-remainingAmount"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:approve_expense_plan.remaining',
                            'Remaining Amount'
                          )}
                        </span>
                        {renderSortIcon('totalRemainingAmount')}
                      </div>
                    </TableHead>
                    <TableHead
                      className="gba:w-[20%] gba:cursor-pointer gba:select-none"
                      onClick={() => onSort('totalAmount')}
                      data-testid="header-sort-total"
                    >
                      <div className="gba:flex gba:items-center">
                        <span>
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:expense_request_list.expense_plan_table.total_amount',
                            'Total Amount'
                          )}
                        </span>
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
                        transferInProgress={isTransferInProgress(record.id)}
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
              scrollTargetRef={tableTopRef}
            />
          </CardContent>
        </Card>
      </div>
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
    isTransferInProgress,
    selectedRowKeys,
    handleSelectRecord,
    currentPage,
    pageSize,
    totalItems,
    handleEnhancedTableChange
  ])

  const { buildQueryConditions } = useExpenseRequestQueryBuilder({
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentId,
    currencyRef,
    startFrom,
    startTo,
    endFrom,
    endTo,
    effectiveDateRange,
    requestDateRange,
    requestTypeFilterLocal,
    searchText: debouncedSearchText
  })

  const { isExporting, handleExportCsv, handleExportExcel, getExportCsvTitle, getExportExcelTitle } =
    useExpenseRequestExport({ accessToken, totalItems, buildQueryConditions })

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
            disabled={isBulkTransferInProgress}
          >
            {isBulkTransferInProgress
              ? getTranslationFromI18nKeyAndLabel('lowcoder:transfer_payment_in_progress', 'Transfer in Progress')
              : getTranslationFromI18nKeyAndLabel('lowcoder:transfer_payment', 'Transfer Payment')}{' '}
            ({selectedBookableCount}{' '}
            {getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.selected', 'selected')})
          </Button>
        ]
      : []
  }, [hasBookableSelected, selectedBookableCount, handleBulkTransfer, isBulkTransferInProgress])

  // Helper to handle clearing all filters (avoids boolean parameter pattern)
  const handleClearAllFilters = useCallback(() => {
    setEmployeeFilter('')
    setSelectedEmployees([])
    setEmployeeSearchText('')
    setShowEmployeeDropdown(false)
    setStatusFilter([])
    setRequestTypeFilterLocal([])
    setLocalAmountMin('')
    setLocalAmountMax('')
    setDepartmentId('')
    setCurrencyRef('')
    setEffectiveDateRange(null)
    setRequestDateRange(null)
    setStartFrom(undefined)
    setStartTo(undefined)
    setEndFrom(undefined)
    setEndTo(undefined)

    handleEmployeeFilter('')
    handleStatusFilter('')
    setRequestTypeFilter([])
    handleAmountFilter('', '')
    handleDepartmentFilter('')
    handleCurrencyFilter('')
    setEffectiveDateRangeFilter(null)
    setRequestDateRangeFilter(null)
    handleStartDateRangeFilter('', '')
    handleEndDateRangeFilter('', '')
  }, [
    employeeFilter,
    selectedEmployees.length,
    statusFilter.length,
    requestTypeFilterLocal.length,
    effectiveDateRange,
    requestDateRange,
    startFrom,
    startTo,
    endFrom,
    endTo,
    handleEmployeeFilter,
    handleStatusFilter,
    setRequestTypeFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
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
            <DownloadIcon className="gba:mr-2" />
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
            <FileXlsIcon className="gba:mr-2" />
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
          setFilter: (newFilters: string[]): void => {
            if (newFilters.length === 0) {
              setStatusFilter([])
              setRequestTypeFilterLocal([])
              setCurrencyRef('')
              setDepartmentId('')
              setSelectedEmployees([])
              setEmployeeFilter('')
              setEmployeeSearchText('')
              setShowEmployeeDropdown(false)
              setLocalAmountMin('')
              setLocalAmountMax('')
              setEffectiveDateRange(null)
              setRequestDateRange(null)
              setStartFrom(undefined)
              setStartTo(undefined)
              setEndFrom(undefined)
              setEndTo(undefined)
              handleStatusFilter('')
              setRequestTypeFilter([])
              handleCurrencyFilter('')
              handleDepartmentFilter('')
              handleEmployeeFilter('')
              handleAmountFilter('', '')
              setEffectiveDateRangeFilter(null)
              setRequestDateRangeFilter(null)
              handleStartDateRangeFilter('', '')
              handleEndDateRangeFilter('', '')
              return
            }
            // Constants for filter type identification
            const DATE_RANGE_FILTERS = new Set(['effectiveDateRange', 'requestDateRange', 'startDate', 'endDate'])
            const isCurrencyFilter = (f: string) => f.startsWith('currency:')
            const isRequestTypeFilter = (f: string) => f.startsWith('ExpenseRequestType:')
            const isDateRangeFilter = (f: string) => DATE_RANGE_FILTERS.has(f)
            const isStatusFilter = (f: string) =>
              !isCurrencyFilter(f) &&
              !isRequestTypeFilter(f) &&
              !isDateRangeFilter(f) &&
              f !== 'employee' &&
              f !== 'amount' &&
              f !== 'department'

            // Separate filters by type
            const requestTypeFilters = newFilters.filter(isRequestTypeFilter)
            const statusFilters = newFilters.filter(isStatusFilter)

            // Handle status filter changes
            const statusToRemove = selectedFilters.filter(f => isStatusFilter(f) && !statusFilters.includes(f))
            const statusToAdd = statusFilters.filter(f => !selectedFilters.includes(f))
            statusToRemove.forEach(f => handleStatusFilterChange(f, false))
            statusToAdd.forEach(f => handleStatusFilterChange(f, true))

            // Handle date range filter removal
            const dateRangesToRemove = selectedFilters.filter(f => isDateRangeFilter(f) && !newFilters.includes(f))
            dateRangesToRemove.forEach(f => {
              if (f === 'effectiveDateRange') {
                setEffectiveDateRange(null)
                setEffectiveDateRangeFilter(null)
              } else if (f === 'requestDateRange') {
                setRequestDateRange(null)
                setRequestDateRangeFilter(null)
              } else if (f === 'startDate') {
                setStartFrom(undefined)
                setStartTo(undefined)
                handleStartDateRangeFilter('', '')
              } else if (f === 'endDate') {
                setEndFrom(undefined)
                setEndTo(undefined)
                handleEndDateRangeFilter('', '')
              }
            })

            // Handle request type filter changes
            const requestTypesToRemove = selectedFilters.filter(
              f => isRequestTypeFilter(f) && !requestTypeFilters.includes(f)
            )
            const requestTypesToAdd = requestTypeFilters.filter(f => !selectedFilters.includes(f))
            requestTypesToRemove.forEach(f => handleRequestTypeFilterChange(f, false))
            requestTypesToAdd.forEach(f => handleRequestTypeFilterChange(f, true))

            // Handle currency filter removal
            if (!newFilters.includes('currency') && currencyRef) {
              setCurrencyRef('')
              handleCurrencyFilter('')
            }

            // Handle employee filter removal
            if (!newFilters.includes('employee') && employeeFilter) {
              handleRemoveEmployeeFilter()
            }

            // Handle amount filter removal
            if (!newFilters.includes('amount') && (amountMinFilter || amountMaxFilter)) {
              setLocalAmountMin('')
              setLocalAmountMax('')
              handleAmountFilter('', '')
            }

            // Handle department filter removal
            if (!newFilters.includes('department') && departmentId) {
              setDepartmentId('')
              handleDepartmentFilter('')
            }
          },
          filterLabelMap: {
            ...statusFilter.reduce(
              (acc, status) => {
                const statusConfig = getExpenseRequestStatusDisplay(status)
                // Only show backend status in parentheses if the label is different from the status
                if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
                  acc[status] = statusConfig.label
                } else {
                  // Format backend status with only first letter uppercase and translate it
                  const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
                  const translatedStatus = getTranslationFromI18nKeyAndLabel(
                    `lowcoder:expense_statuses.${status.toLowerCase()}`,
                    formattedStatus
                  )
                  acc[status] = `${statusConfig.label} (${translatedStatus})`
                }
                return acc
              },
              {} as Record<string, string>
            ),
            employee: employeeFilter ? `Employee: ${selectedEmployees.map(e => e.name).join(', ')}` : 'Employee: All',
            amount: `Amount: ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
            department: getDepartmentLabel(departmentId, departmentOptions),
            currency: getCurrencyLabel(currencyRef, currencies),
            effectiveDateRange: getEffectiveDateLabel(effectiveDateRange),
            requestDateRange: getRequestDateLabel(requestDateRange),
            startDate: getStartDateLabel(startFrom, startTo),
            endDate: getEndDateLabel(endFrom, endTo),
            'ExpenseRequestType:v1:EXPENSES': getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.expense',
              'Expense'
            ),
            'ExpenseRequestType:v1:TRIP': getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
          },
          actions: dataControllerActions
        }}
        dataFilterProps={{
          // Keep filter sidebar available regardless of current result count
          filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            // Handle request type filter changes
            if (filterId.startsWith('ExpenseRequestType:')) {
              handleRequestTypeFilterChange(filterId, selected)
              return
            }
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
                expenseRequestId={selectedExpense?.id}
                accessToken={accessToken}
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
