/**
 * Expense Requests Table Component
 * Displays a table of expense requests with filtering and view capabilities
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useExpenseRequests } from '../../../hooks/useExpenseRequests'
import { ExpenseData } from '../../../types'
import { Button, useTranslation } from '@newwork/nw-design-system'
import type { SortingState } from '@tanstack/react-table'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import translations from '../../../_i18n'
import dayjs from 'dayjs'
import { useFilterData, type OrganizationalUnit, type Currency } from '../../../hooks/useFilterData'
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../../utils/utils'
import { buildStatusDisplayName } from '../../../utils/sharedUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useExpenseRequestExport } from './expenseRequestExport'
import { useExpenseRequestQueryBuilder } from './expenseRequestQueryBuilder'
import { useExpenseRequestFileService as useCommonExpenseRequestFileService } from '../../../../../common/files/useExpenseRequestFileService'
import { getActiveStructureDepartmentOptions } from '../../../utils/departmentOptions'
import { ExpenseRequestPdfModal, ExpenseRequestsDataTable } from './components'
import ExpenseRequestsTableExportOverlay from './components/ExpenseRequestsTableExportOverlay'
import BackofficeExpenseRequestDetailsSheet from './components/BackofficeExpenseRequestDetailsSheet'
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
import { buildExpenseRequestsFilterGroups } from './buildExpenseRequestsFilterGroups'
import { buildExpenseRequestsFilterLabelMap } from './expenseRequestsTableFilterLabelMap'
import { createExpenseRequestsChipFilterSetter } from './expenseRequestsTableChipFilterSetter'
import { useExpenseRequestsTableUrlSearch } from './hooks/useExpenseRequestsTableUrlSearch'
import {
  useExpenseRequestFilters,
  useExpenseRequestPdf,
  useExpenseRequestActions,
  useExpenseRequestTransfer,
  useExpenseRequestSelection
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
  isActive?: boolean
  filterData?: FilterData
}

const ExpenseRequestsTable: React.FC<ExpenseRequestsTableProps> = props => {
  const { search, onSearchChange, accessToken, isActive = true, filterData: propsFilterData } = props
  const { t } = useTranslation(translations)

  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken
    }),
    [props.accessToken]
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

  const { searchText, debouncedSearchText, handleSearchChange } = useExpenseRequestsTableUrlSearch({
    searchFromParent: search,
    onSearchChange,
    handleSearch
  })

  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null)
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])

  const {
    selectedRowKeys,
    selectedRecords,
    clearSelection,
    handleSelectRecord,
    handleSelectAllRecords,
    hasBookableSelected,
    allBookableSelected,
    bookableRecordsCount,
    selectedBookableCount
  } = useExpenseRequestSelection(expenses)

  const { isPdfModalVisible, pdfUrl, pdfLoading, pdfError, handlePrintExpenseRequest, handleClosePdfModal } =
    useExpenseRequestPdf(props)

  const { handleDownloadAccountingNote, handleTriggerCSV } = useExpenseRequestActions(props)

  const { handleTransferPayment, handleBulkTransferPayment, isTransferInProgress, isBulkTransferInProgress } =
    useExpenseRequestTransfer(props, () => fetchData(true), clearSelection)

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

  const [departmentId, setDepartmentId] = useState<string>('')
  const [currencyRef, setCurrencyRef] = useState<string>('')
  const [effectiveDateRange, setEffectiveDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null] | null>(null)
  const [requestTypeFilterLocal, setRequestTypeFilterLocal] = useState<string[]>([])

  const localFilterData = useFilterData({ accessToken })
  const filterDataResolved = (propsFilterData?.organizationalUnits?.length ?? 0) > 0 ? propsFilterData : localFilterData
  const { organizationalUnits = [], currencies = [] } = filterDataResolved || {}

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
    setAvailableStatuses([
      ExpenseStatus.CREATED,
      ExpenseStatus.PENDING,
      ExpenseStatus.APPROVED,
      ExpenseStatus.REJECTED,
      ExpenseStatus.VERIFIED,
      ExpenseStatus.BOOKED,
      ExpenseStatus.TRANSFERRED,
      ExpenseStatus.PAID,
      ExpenseStatus.DISCARDED
    ])
  }, [])

  const handleRowClick = useCallback((record: ExpenseData) => {
    setSelectedExpense(record)
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
  }, [])

  const handleBulkTransfer = useCallback(() => {
    if (selectedRecords.length > 0) {
      const bookableRecords = selectedRecords.filter(record => record.status === 'BOOKED')
      if (bookableRecords.length > 0) {
        handleBulkTransferPayment(bookableRecords)
      }
    }
  }, [selectedRecords, handleBulkTransferPayment])

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
    if (!sorting.field || !sorting.order) {
      return []
    }
    const colId = expenseRequestSortFieldToColumnId(sorting.field)
    return [{ id: colId, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

  const handleRequestSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        if (sorting.field === 'createdAt') {
          applySorting(null, null)
          setCurrentPage(1)
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
      const field = expenseRequestColumnIdToSortField(first.id)
      const order: 'ASC' | 'DESC' = first.desc ? 'DESC' : 'ASC'
      if (field === sorting.field && order === sorting.order) {
        return
      }
      applySorting(field, order)
      setCurrentPage(1)
    },
    [applySorting, sorting.field, sorting.order, setCurrentPage]
  )

  const listEmptyMessage = useMemo(
    () => (hasActiveFilters ? t('empty-no-data') : t('empty-no-requests-yet')),
    [hasActiveFilters, t]
  )

  const getStatusDisplayName = useCallback(
    (status: string): string => buildStatusDisplayName(status, getExpenseRequestStatusDisplay, t),
    [t]
  )

  const statusCheckboxFilters = useMemo(() => {
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

  const handleEffectiveDateChange = useCallback(
    (dates: [Date | null, Date | null] | null) => {
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

  const handleRequestDateChange = useCallback(
    (dates: [Date | null, Date | null] | null) => {
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

  const handleRequestTypeFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (selected) {
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

  const filterGroups = useMemo(
    () =>
      buildExpenseRequestsFilterGroups({
        t,
        currencies,
        currencyRef,
        setCurrencyRef,
        handleCurrencyFilter,
        departmentId,
        setDepartmentId,
        handleDepartmentFilter,
        departmentOptions,
        effectiveDateRange,
        requestDateRange,
        handleEffectiveDateChange,
        handleRequestDateChange,
        statusCheckboxFilters,
        requestTypeFilterLocal,
        handleRequestTypeFilterChange,
        employeeSearchText,
        setEmployeeSearchText,
        showEmployeeDropdown,
        setShowEmployeeDropdown,
        employeeSearchResults,
        employeeSearchLoading,
        selectedEmployees,
        setSelectedEmployees,
        setEmployeeFilter,
        handleEmployeeFilter,
        debouncedSearchEmployees,
        localAmountMin,
        setLocalAmountMin,
        localAmountMax,
        setLocalAmountMax,
        debouncedAmountFilter
      }),
    [
      t,
      currencies,
      currencyRef,
      handleCurrencyFilter,
      departmentId,
      handleDepartmentFilter,
      departmentOptions,
      effectiveDateRange,
      requestDateRange,
      handleEffectiveDateChange,
      handleRequestDateChange,
      statusCheckboxFilters,
      requestTypeFilterLocal,
      handleRequestTypeFilterChange,
      employeeSearchText,
      showEmployeeDropdown,
      employeeSearchResults,
      employeeSearchLoading,
      selectedEmployees,
      setEmployeeFilter,
      handleEmployeeFilter,
      debouncedSearchEmployees,
      localAmountMin,
      setLocalAmountMin,
      localAmountMax,
      setLocalAmountMax,
      debouncedAmountFilter
    ]
  )

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
  }, [hasBookableSelected, selectedBookableCount, handleBulkTransfer, isBulkTransferInProgress, t])

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
    handleEmployeeFilter,
    handleStatusFilter,
    setRequestTypeFilter,
    handleAmountFilter,
    handleDepartmentFilter,
    handleCurrencyFilter,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
    setEmployeeFilter,
    setSelectedEmployees,
    setEmployeeSearchText,
    setShowEmployeeDropdown,
    setStatusFilter,
    setRequestTypeFilterLocal,
    setLocalAmountMin,
    setLocalAmountMax
  ])

  const handleRemoveEmployeeFilter = useCallback(() => {
    setEmployeeFilter('')
    setSelectedEmployees([])
    setEmployeeSearchText('')
    handleEmployeeFilter('')
  }, [handleEmployeeFilter, setEmployeeFilter, setSelectedEmployees, setEmployeeSearchText])

  const chipFilterSetter = useMemo(
    () =>
      createExpenseRequestsChipFilterSetter({
        selectedFilters,
        setStatusFilter,
        setRequestTypeFilterLocal,
        setCurrencyRef,
        setDepartmentId,
        setSelectedEmployees,
        setEmployeeFilter,
        setEmployeeSearchText,
        setShowEmployeeDropdown,
        setLocalAmountMin,
        setLocalAmountMax,
        setEffectiveDateRange,
        setRequestDateRange,
        handleStatusFilter,
        setRequestTypeFilter,
        handleCurrencyFilter,
        handleDepartmentFilter,
        handleEmployeeFilter,
        handleAmountFilter,
        setEffectiveDateRangeFilter,
        setRequestDateRangeFilter,
        handleStatusFilterChange,
        handleRequestTypeFilterChange,
        handleRemoveEmployeeFilter,
        currencyRef,
        employeeFilter,
        amountMinFilter,
        amountMaxFilter,
        departmentId
      }),
    [
      selectedFilters,
      currencyRef,
      employeeFilter,
      amountMinFilter,
      amountMaxFilter,
      departmentId,
      setStatusFilter,
      setRequestTypeFilterLocal,
      setSelectedEmployees,
      setEmployeeFilter,
      setEmployeeSearchText,
      setShowEmployeeDropdown,
      setLocalAmountMin,
      setLocalAmountMax,
      handleStatusFilter,
      setRequestTypeFilter,
      handleCurrencyFilter,
      handleDepartmentFilter,
      handleEmployeeFilter,
      handleAmountFilter,
      setEffectiveDateRangeFilter,
      setRequestDateRangeFilter,
      handleStatusFilterChange,
      handleRequestTypeFilterChange,
      handleRemoveEmployeeFilter
    ]
  )

  const filterLabelMap = useMemo(
    () =>
      buildExpenseRequestsFilterLabelMap({
        statusFilter,
        t,
        employeeFilter,
        selectedEmployees,
        amountMinFilter,
        amountMaxFilter,
        departmentId,
        departmentOptions,
        currencyRef,
        currencies,
        effectiveDateRange,
        requestDateRange
      }),
    [
      statusFilter,
      t,
      employeeFilter,
      selectedEmployees,
      amountMinFilter,
      amountMaxFilter,
      departmentId,
      departmentOptions,
      currencyRef,
      currencies,
      effectiveDateRange,
      requestDateRange
    ]
  )

  return (
    <div className="gba:relative gba:w-full gba:h-full gba:-mx-6" data-testid="expense-requests-table-wrapper">
      <ExpenseRequestsTableExportOverlay
        visible={selectedRecords.length === 0}
        isExporting={isExporting}
        totalItems={totalItems}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
        getCsvTitle={getExportCsvTitle}
        getExcelTitle={getExportExcelTitle}
        labelExporting={t('export-exporting')}
        labelCsv={t('export-csv-label')}
        labelExcel={t('export-excel-label')}
      />

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
          setFilter: chipFilterSetter,
          filterLabelMap,
          actions: dataControllerActions
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            if (filterId.startsWith('ExpenseRequestType:')) {
              handleRequestTypeFilterChange(filterId, selected)
              return
            }
            if (filterId === '' && selected) {
              handleClearAllFilters()
              return
            }
            if (filterId === 'employee' && !selected) {
              handleRemoveEmployeeFilter()
              return
            }
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

      <BackofficeExpenseRequestDetailsSheet
        open={!!selectedExpense}
        onOpenChange={(open: boolean) => {
          if (!open) {
            handleCloseDetails()
          }
        }}
        selectedExpense={selectedExpense}
        t={t}
        accessToken={accessToken}
        printExpenseRequest={printExpenseRequest}
      />

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
