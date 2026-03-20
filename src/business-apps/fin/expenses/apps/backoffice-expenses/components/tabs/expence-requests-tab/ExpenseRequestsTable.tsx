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
  Button,
  Separator,
  Badge,
  Sheet,
  SheetContent,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import type { SortingState } from '@tanstack/react-table'
import { DownloadIcon, FileXlsIcon, InfoIcon } from '@phosphor-icons/react'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import translations from '../../../_i18n'
import { formatCurrency } from '../../../utils/currencyUtils'
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

import { ExpenseRequestPdfModal, EmployeeSearchFilter, AmountFilter, ExpenseRequestsDataTable } from './components'
import { useTableSetup } from '../../../common/hooks/useTableSetup'
import {
  createBackofficeExpenseRequestColumns,
  type BackofficeExpenseRequestTableChrome
} from './backofficeExpenseRequestColumns'
import { BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS } from './config/backofficeExpenseRequestSortableColumns'
import {
  expenseRequestColumnIdToSortField,
  expenseRequestSortFieldToColumnId
} from './backofficeExpenseRequestSortUtils'

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
  const { t } = useTranslation(translations)

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
    setCurrentPage,
    setPageSize,
    fetchData,
    searchEmployees,
    sorting,
    applySorting,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleSearch,
    amountMinFilter,
    amountMaxFilter,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
    setRequestTypeFilter
  } = useExpenseRequests(contextProps, t, isActive)

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
  // Request type filter (EXPENSES, TRIP) - radio button behavior
  const [requestTypeFilterLocal, setRequestTypeFilterLocal] = useState<string[]>([])
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
    const expenseRequestStatuses = [
      ExpenseStatus.CREATED,
      ExpenseStatus.PENDING,
      ExpenseStatus.APPROVED,
      ExpenseStatus.REJECTED,
      ExpenseStatus.VERIFIED,
      ExpenseStatus.BOOKED,
      ExpenseStatus.TRANSFERRED,
      ExpenseStatus.PAID,
      ExpenseStatus.DISCARDED
    ]
    setAvailableStatuses(expenseRequestStatuses)
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

  const tableChrome = useMemo((): BackofficeExpenseRequestTableChrome => {
    return {
      accessToken,
      bookableRecordsCount,
      allBookableSelected,
      onSelectAllRecords: handleSelectAllRecords,
      selectedRowKeys,
      onSelectRecord: handleSelectRecord,
      isTransferInProgress,
      onNavigateToExpenseRequest: handleNavigateToExpenseRequest,
      onDownloadAccountingNote: handleDownloadAccountingNote,
      onTriggerCSV: handleTriggerCSV,
      onPrintExpenseRequest: handlePrintExpenseRequest,
      onTransferPayment: handleTransferPayment
    }
  }, [
    accessToken,
    bookableRecordsCount,
    allBookableSelected,
    handleSelectAllRecords,
    selectedRowKeys,
    handleSelectRecord,
    isTransferInProgress,
    handleNavigateToExpenseRequest,
    handleDownloadAccountingNote,
    handleTriggerCSV,
    handlePrintExpenseRequest,
    handleTransferPayment
  ])

  const allRequestColumns = useMemo(() => createBackofficeExpenseRequestColumns(t, tableChrome), [t, tableChrome])

  const visibleRequestColumnIds = useMemo(
    () => ['select', 'actions', ...BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS],
    []
  )

  const {
    columns: requestTableColumns,
    pagination: requestPagination,
    handlePaginationChange: handleRequestPaginationChange
  } = useTableSetup(
    props,
    allRequestColumns,
    visibleRequestColumnIds,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize
  )

  const sortingState = useMemo((): SortingState => {
    const colId = expenseRequestSortFieldToColumnId(sorting.field)
    return [{ id: colId, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

  const handleRequestSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        if (sorting.field === 'createdAt' && sorting.order === 'DESC') {
          return
        }
        applySorting('createdAt', 'DESC')
        setCurrentPage(1)
        return
      }
      const first = newSorting[0]
      if (first.id === 'select' || first.id === 'actions') {
        return
      }
      const currentColumnId = expenseRequestSortFieldToColumnId(sorting.field)
      const nextDesc = first.desc === true
      if (first.id === currentColumnId && nextDesc === (sorting.order === 'DESC')) {
        return
      }
      const field = expenseRequestColumnIdToSortField(first.id)
      applySorting(field, nextDesc ? 'DESC' : 'ASC')
      setCurrentPage(1)
    },
    [applySorting, sorting.field, sorting.order, setCurrentPage]
  )

  const listEmptyMessage = useMemo(
    () => (hasActiveFilters ? t('empty-no-data') : t('empty-no-requests-yet')),
    [hasActiveFilters, t]
  )

  // Helper function to format status display name with brackets (matching personal expenses pattern)
  const getStatusDisplayName = useCallback(
    (status: string): string => buildStatusDisplayName(status, getExpenseRequestStatusDisplay, t),
    [t]
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

  // Helper: Handle effective date range change
  const handleEffectiveDateChange = useCallback(
    (dates: any) => {
      if (!dates?.[0] || !dates?.[1]) {
        setEffectiveDateRange(null)
        setEffectiveDateRangeFilter(null)
        return
      }
      const fromDate = dates[0] instanceof Date ? dates[0] : new Date(dates[0])
      const toDate = dates[1] instanceof Date ? dates[1] : new Date(dates[1])
      setEffectiveDateRange([fromDate, toDate])
      setEffectiveDateRangeFilter({
        from: dayjs(fromDate).startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        to: dayjs(toDate).endOf('day').format('YYYY-MM-DDTHH:mm:ss')
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
      const fromDate = dates[0] instanceof Date ? dates[0] : new Date(dates[0])
      const toDate = dates[1] instanceof Date ? dates[1] : new Date(dates[1])
      setRequestDateRange([fromDate, toDate])
      setRequestDateRangeFilter({
        from: dayjs(fromDate).startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        to: dayjs(toDate).endOf('day').format('YYYY-MM-DDTHH:mm:ss')
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
        title: t('header-currency'),
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
            t={t}
          />
        )
      },
      {
        id: 'department',
        title: t('header-department'),
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
            t={t}
          />
        )
      },
      // Effective Date Range
      {
        id: 'effectiveDateRange',
        title: t('filter-effective-date'),
        type: 'custom',
        customComponent: (
          <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-from')}</span>
              <input
                type="date"
                value={effectiveDateRange?.[0] ? dayjs(effectiveDateRange[0]).format('YYYY-MM-DD') : ''}
                onChange={e => {
                  const from = e.target.value ? new Date(e.target.value) : null
                  handleEffectiveDateChange(from ? [from, effectiveDateRange?.[1] ?? null] : null)
                }}
                className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="expense-requests-effective-date-from"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-to')}</span>
              <input
                type="date"
                value={effectiveDateRange?.[1] ? dayjs(effectiveDateRange[1]).format('YYYY-MM-DD') : ''}
                onChange={e => {
                  const to = e.target.value ? new Date(e.target.value) : null
                  handleEffectiveDateChange(to ? [effectiveDateRange?.[0] ?? null, to] : null)
                }}
                className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="expense-requests-effective-date-to"
              />
            </div>
            <div
              className="gba:mt-1 gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1"
              data-testid="effective-date-hint"
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon size={16} data-testid="effective-date-info" className="gba:cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('filter-effective-date-info')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        )
      },
      // Creation Date Range
      {
        id: 'requestDateRange',
        title: t('filter-creation-date'),
        type: 'custom',
        customComponent: (
          <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-from')}</span>
              <input
                type="date"
                value={requestDateRange?.[0] ? dayjs(requestDateRange[0]).format('YYYY-MM-DD') : ''}
                onChange={e => {
                  const from = e.target.value ? new Date(e.target.value) : null
                  handleRequestDateChange(from ? [from, requestDateRange?.[1] ?? null] : null)
                }}
                className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="expense-requests-request-date-from"
              />
            </div>
            <div className="gba:flex gba:items-center gba:gap-2">
              <span className="gba:text-sm gba:text-muted-foreground gba:w-10">{t('filter-to')}</span>
              <input
                type="date"
                value={requestDateRange?.[1] ? dayjs(requestDateRange[1]).format('YYYY-MM-DD') : ''}
                onChange={e => {
                  const to = e.target.value ? new Date(e.target.value) : null
                  handleRequestDateChange(to ? [requestDateRange?.[0] ?? null, to] : null)
                }}
                className="gba:h-8 gba:w-[140px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                data-testid="expense-requests-request-date-to"
              />
            </div>
          </div>
        )
      },
      // Status
      {
        id: 'status',
        title: t('filter-status'),
        type: 'checkbox',
        filters: buildStatusFilters()
      },
      // Request Type
      {
        id: 'requestType',
        title: t('filter-request-type'),
        type: 'radio' as any,
        filters: [
          {
            id: 'ExpenseRequestType:v1:EXPENSES',
            label: t('filter-request-type-expense'),
            selected: requestTypeFilterLocal.includes('ExpenseRequestType:v1:EXPENSES')
          },
          {
            id: 'ExpenseRequestType:v1:TRIP',
            label: t('filter-request-type-trip'),
            selected: requestTypeFilterLocal.includes('ExpenseRequestType:v1:TRIP')
          }
        ]
      },
      // Employee
      {
        id: 'employee',
        title: t('filter-employee'),
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
        title: t('filter-amount'),
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
    requestTypeFilterLocal,
    handleDepartmentFilter,
    handleCurrencyFilter,
    handleEffectiveDateChange,
    handleRequestDateChange,
    organizationalUnits,
    currencies
  ])

  // removed unused getFilters helper

  const { buildQueryConditions } = useExpenseRequestQueryBuilder({
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentId,
    currencyRef,
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
            {isBulkTransferInProgress ? t('transfer-in-progress') : t('transfer-payment-label')} (
            {selectedBookableCount} {t('transfer-selected')})
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

    handleEmployeeFilter('')
    handleStatusFilter('')
    setRequestTypeFilter([])
    handleAmountFilter('', '')
    handleDepartmentFilter('')
    handleCurrencyFilter('')
    setEffectiveDateRangeFilter(null)
    setRequestDateRangeFilter(null)
  }, [
    employeeFilter,
    selectedEmployees.length,
    statusFilter.length,
    requestTypeFilterLocal.length,
    effectiveDateRange,
    requestDateRange,
    handleEmployeeFilter,
    handleStatusFilter,
    setRequestTypeFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter
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
            {isExporting ? t('export-exporting') : t('export-csv-label')}
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
            {isExporting ? t('export-exporting') : t('export-excel-label')}
          </Button>
        </div>
      )}

      <DataContainer
        contentBackground="white"
        dataBodyClassName="gba:overflow-y-auto gba:overflow-x-hidden"
        dataControllerProps={{
          listTitle: t('tab-expense-requests'),
          listAmount: totalItems ? `${totalItems}` : undefined,
          search: searchText,
          setSearch: handleSearchChange,
          placeholder: t('common-search-expense-requests'),
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
              handleStatusFilter('')
              setRequestTypeFilter([])
              handleCurrencyFilter('')
              handleDepartmentFilter('')
              handleEmployeeFilter('')
              handleAmountFilter('', '')
              setEffectiveDateRangeFilter(null)
              setRequestDateRangeFilter(null)
              return
            }
            // Constants for filter type identification
            const DATE_RANGE_FILTERS = new Set(['effectiveDateRange', 'requestDateRange'])
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
                const statusConfig = getExpenseRequestStatusDisplay(status, t)
                if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
                  acc[status] = statusConfig.label
                } else {
                  // Format backend status with only first letter uppercase and translate it
                  const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
                  const statusKey = `status-${status.toLowerCase().split('_').join('-')}` as const
                  const translatedStatus = t(statusKey as any) || formattedStatus
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
            'ExpenseRequestType:v1:EXPENSES': t('filter-request-type-expense'),
            'ExpenseRequestType:v1:TRIP': t('filter-request-type-trip')
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
        dataBody={
          <ExpenseRequestsDataTable
            error={error}
            loading={loading}
            expenses={expenses ?? []}
            totalItems={totalItems}
            columns={requestTableColumns}
            sorting={sortingState}
            onSortingChange={handleRequestSortingChange}
            pagination={requestPagination}
            onPaginationChange={handleRequestPaginationChange}
            onRowClick={handleRowClick}
            emptyMessage={listEmptyMessage}
            dataTestIdPrefix={DATA_TEST_ID_PREFIX}
          />
        }
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
          <ExpenseDetailsShell title={selectedExpense?.title || t('detail-expense-request-details')}>
            {selectedExpense ? (
              <ExpenseDetailsPanelContent
                dataTestIdPrefix="backoffice-expense-request-details"
                record={selectedExpense as any}
                formatAmount={(amount, currencyCode) => formatCurrency(amount, currencyCode)}
                showHeader={false}
                t={t}
                headerRight={
                  <Badge
                    variant={getExpenseRequestStatusDisplay(selectedExpense.status, t).badgeVariant || 'outline'}
                    data-testid="expense-request-status-badge"
                  >
                    {getExpenseRequestStatusDisplay(selectedExpense.status, t).label}
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
                        {t('detail-view-full-details')}
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

export default React.memo(ExpenseRequestsTable)
