import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { startProcess } from '@/common/utils/start-process'
import { useExpenseRequestFileService } from '../../../../utils/expenseRequestFileService'
import { EXPENSE_REQUEST_FILTER_STATUSES } from '../utils/expenseRequestFilterConstants'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import translations from '../../../../_i18n'
import {
  formatDateRangeForChip,
  applyDateRangeFromFilter,
  resolveSelectedCurrencyCode,
  applyCurrencyChange,
  buildDefaultEmptyMessage
} from '../../../../utils/tableUtils'
import {
  applyAmountRangeFromFilters,
  isAmountRangeFilterActive
} from '@/business-apps/fin/expenses/common/utils/amountRangeFilterUtils'
import { useTableSetup } from '@/business-apps/fin/expenses/common/hooks/useTableSetup'
import { useVisibleColumns } from '@/business-apps/fin/expenses/common/hooks/useSharedTabState'
import { CurrencyDropdown } from '../../../shared/TableSharedComponents'
import { createExpenseRequestFilterConfig } from '../config/expenseRequestFilterConfig'
import { expenseRequestDefaultSort, type ExpenseRequestTableSortOrder } from '../config/expenseRequestSortableColumns'
import {
  expenseRequestAvailableColumns,
  expenseRequestDefaultVisibleColumnIds
} from '../config/expenseRequestAvailableColumns'
import { createExpenseRequestColumns, type ExpenseRequestRow } from '../table/columns/expenseRequestColumns'
import { ExpenseRequestRowActions } from '../table/components/ExpenseRequestRowActions'
import type { ExpenseRequestsDataBodyProps } from '../table/components/ExpenseRequestsDataBody'
import type { ExpenseRequestsTableProps } from '../types/expenseRequestsTable.types'

const DEFAULT_PAGE_SIZE = 20

function expenseRequestSorterArg(
  field: string | null,
  order: ExpenseRequestTableSortOrder | null
): { field?: string; order?: ExpenseRequestTableSortOrder } {
  if (field != null && order != null) {
    return { field, order }
  }
  return {}
}

export interface UseExpenseRequestsTableModelResult {
  dataBodyProps: ExpenseRequestsDataBodyProps
  selectedItem: ExpenseRequestRow | null
  handleCloseDetails: () => void
  printModalOpen: boolean
  setPrintModalOpen: (open: boolean) => void
  setPrintPdfUrl: (url: string) => void
  printLoading: boolean
  printPdfUrl: string
  accessToken: string | undefined
  userInfo: ExpenseRequestsTableProps['userInfo']
}

export function useExpenseRequestsTableModel(props: ExpenseRequestsTableProps): UseExpenseRequestsTableModelResult {
  const { t: tPersonal } = useTranslation(translations)

  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

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

  const [searchInput, setSearchInput] = useState(search || '')
  const debouncedSearchTerm = useDebounce(searchInput, 300)
  const [sortField, setSortField] = useState<string | null>(expenseRequestDefaultSort.field)
  const [sortOrder, setSortOrder] = useState<ExpenseRequestTableSortOrder | null>(expenseRequestDefaultSort.order)
  const prevDebouncedSearchRef = useRef<string>('')
  const [selectedItem, setSelectedItem] = useState<(typeof items)[0] | null>(null)
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)

  const { printExpenseRequest, isMounted } = useExpenseRequestFileService(props)

  const hasActiveFilters = useMemo(() => {
    const trimmedSearch = (search || '').trim()
    return trimmedSearch !== '' || selectedFilters.length > 0
  }, [search, selectedFilters])

  const requestDateRange = props.requestDateRange ?? null
  const startDateRange = props.startDateRange ?? null
  const endDateRange = props.endDateRange ?? null
  const effectiveDateRange = props.effectiveDateRange ?? null
  const reimbursableAmountRange = props.reimbursableAmountRange ?? null
  const advanceAmountRange = props.advanceAmountRange ?? null
  const currencyStats = props.currencyStats ?? []

  const expenseRequestsFilterConfig = useMemo(
    () =>
      createExpenseRequestFilterConfig({
        statusOptions: [...EXPENSE_REQUEST_FILTER_STATUSES],
        filterLabelMap
      }),
    [filterLabelMap]
  )

  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = (selectedFilters || []).filter(f => EXPENSE_REQUEST_FILTER_STATUSES.includes(f))
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
    if (
      reimbursableAmountRange &&
      (reimbursableAmountRange.min !== undefined || reimbursableAmountRange.max !== undefined)
    ) {
      obj.reimbursableAmount = { ...reimbursableAmountRange }
    }
    if (advanceAmountRange && (advanceAmountRange.min !== undefined || advanceAmountRange.max !== undefined)) {
      obj.advanceTotal = { ...advanceAmountRange }
    }
    return obj
  }, [
    selectedFilters,
    requestDateRange,
    effectiveDateRange,
    startDateRange,
    endDateRange,
    reimbursableAmountRange,
    advanceAmountRange
  ])

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
      const amountTokens: string[] = []
      if (props.setReimbursableAmountRange) {
        applyAmountRangeFromFilters(
          filters.reimbursableAmount as { min?: number; max?: number } | undefined,
          props.setReimbursableAmountRange
        )
        if (isAmountRangeFilterActive(filters.reimbursableAmount)) {
          amountTokens.push('reimbursableAmountRange')
        }
      }
      if (props.setAdvanceAmountRange) {
        applyAmountRangeFromFilters(
          filters.advanceTotal as { min?: number; max?: number } | undefined,
          props.setAdvanceAmountRange
        )
        if (isAmountRangeFilterActive(filters.advanceTotal)) {
          amountTokens.push('advanceAmountRange')
        }
      }
      if (props.setFilters) {
        props.setFilters([...statusIds, ...requestTypeIds, ...currencyTokens, ...dateRangeTokens, ...amountTokens])
      }
      if (onTableChange) onTableChange({ current: 1, pageSize }, {}, expenseRequestSorterArg(sortField, sortOrder))
    },
    [
      selectedFilters,
      props.setFilters,
      props.setRequestDateRange,
      props.setEffectiveDateRange,
      props.setStartDateRange,
      props.setEndDateRange,
      props.setReimbursableAmountRange,
      props.setAdvanceAmountRange,
      onTableChange,
      pageSize,
      sortField,
      sortOrder
    ]
  )

  const [rawVisibleColumns, setRawVisibleColumns] = useState<string[]>(() => [...expenseRequestDefaultVisibleColumnIds])
  const visibleColumnIds = useVisibleColumns(rawVisibleColumns, expenseRequestAvailableColumns)

  const ignorePageStateUpdate = useCallback(() => {
    void 0
  }, [])
  const ignorePageSizeStateUpdate = useCallback(() => {
    void 0
  }, [])

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(selectedFilters || [], currencyStats),
    [selectedFilters, currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      if (props.setFilters) {
        applyCurrencyChange(code, selectedFilters || [], currencyStats, props.setFilters)
      }
      if (onTableChange) onTableChange({ current: 1, pageSize }, {}, expenseRequestSorterArg(sortField, sortOrder))
    },
    [selectedFilters, currencyStats, props.setFilters, onTableChange, pageSize, sortField, sortOrder]
  )

  useEffect(() => {
    if (!isLoading && totalCount > 0 && currentPage > 1 && onTableChange) {
      const lastPage = Math.max(1, Math.ceil(totalCount / pageSize))
      if (currentPage > lastPage) {
        onTableChange({ current: lastPage, pageSize }, {}, expenseRequestSorterArg(sortField, sortOrder))
      }
    }
  }, [isLoading, totalCount, currentPage, pageSize, onTableChange, sortField, sortOrder])

  useEffect(() => {
    setSearchInput(search || '')
  }, [search])

  useEffect(() => {
    const prev = (prevDebouncedSearchRef.current || '').trim()
    const next = (debouncedSearchTerm || '').trim()

    if (onSearchChange && debouncedSearchTerm !== search) {
      onSearchChange(debouncedSearchTerm)
    }

    const shouldResetPage =
      onTableChange && currentPage !== 1 && ((prev === '' && next !== '') || (prev !== next && next !== ''))

    if (shouldResetPage) {
      onTableChange({ current: 1, pageSize }, {}, expenseRequestSorterArg(sortField, sortOrder))
    }

    prevDebouncedSearchRef.current = debouncedSearchTerm
  }, [debouncedSearchTerm, onSearchChange, search, onTableChange, currentPage, pageSize, sortField, sortOrder])

  useEffect(() => {
    if (tableRefreshTrigger && tableRefreshTrigger > 0) {
      if (onTableChange) {
        onTableChange({ current: currentPage, pageSize }, {}, expenseRequestSorterArg(sortField, sortOrder))
      }
    }
  }, [tableRefreshTrigger, onTableChange, currentPage, pageSize, sortField, sortOrder])

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
  }, [])

  const sorting = useMemo(
    () => (sortField != null && sortOrder != null ? [{ id: sortField, desc: sortOrder === 'descend' }] : []),
    [sortField, sortOrder]
  )

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (!onTableChange) return
      const entry = newSorting[0]

      let nextField: string | null
      let nextOrder: ExpenseRequestTableSortOrder | null
      if (entry) {
        nextField = entry.id
        nextOrder = entry.desc ? 'descend' : 'ascend'
      } else if (sortField != null && sortField !== expenseRequestDefaultSort.field) {
        nextField = expenseRequestDefaultSort.field
        nextOrder = expenseRequestDefaultSort.order
      } else {
        nextField = null
        nextOrder = null
      }

      setSortField(nextField)
      setSortOrder(nextOrder)
      onTableChange({ current: 1, pageSize }, {}, expenseRequestSorterArg(nextField, nextOrder))
    },
    [onTableChange, pageSize, sortField]
  )

  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])

  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      if (!onTableChange) return
      onTableChange(
        { current: newPagination.pageIndex + 1, pageSize: newPagination.pageSize },
        {},
        expenseRequestSorterArg(sortField, sortOrder)
      )
    },
    [onTableChange, sortField, sortOrder]
  )

  const emptyMessage = hasActiveFilters
    ? tPersonal('table-empty-filtered')
    : buildDefaultEmptyMessage(
        'lowcoder:personal_expenses.no_expense_request_data',
        'No expense requests found. Create your first expense request to get started.'
      )

  const columns = useMemo(() => createExpenseRequestColumns(tPersonal), [tPersonal])

  const { columns: visibleTableColumns } = useTableSetup<ExpenseRequestRow>(
    contextProps,
    columns,
    visibleColumnIds,
    currentPage,
    pageSize,
    ignorePageStateUpdate,
    ignorePageSizeStateUpdate
  )

  const handleSelectItem = useCallback((item: ExpenseRequestRow) => {
    setSelectedItem(item)
  }, [])

  const handleViewExpenseRequestDetails = useCallback((item: ExpenseRequestRow) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: item.id,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-requests'
    })
    navigateTo(url)
  }, [])

  const handleEditExpenseRequest = useCallback(
    (item: ExpenseRequestRow) => {
      startProcess({
        domain: 'employee-expense',
        processName: 'changeExpenseRequest',
        payload: {
          employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
          expenseRequestId: item.id
        },
        builderType: 'NATIVE_SCREEN'
      })
    },
    [contextProps.userInfo?.employeeDetails?.employeeId]
  )

  const handlePrintRequest = useCallback(
    async (record: ExpenseRequestRow) => {
      setPrintLoading(true)
      setPrintModalOpen(true)

      try {
        const result = await printExpenseRequest(record)

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('Error printing request:', result.error)
        }
      } catch (err) {
        console.error('Error fetching print PDF:', err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (isMounted.current) {
          setPrintLoading(false)
        }
      }
    },
    [printExpenseRequest, isMounted]
  )

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
  }, [])

  const updateRequestActionLabel = tPersonal('personal-expenses-update-request-action')

  const rowActions = useCallback(
    (row: { original: ExpenseRequestRow }) => (
      <ExpenseRequestRowActions
        record={row.original}
        accessToken={contextProps.accessToken}
        t={tPersonal}
        updateRequestActionLabel={updateRequestActionLabel}
        onEdit={handleEditExpenseRequest}
        onPrint={handlePrintRequest}
        onView={handleViewExpenseRequestDetails}
      />
    ),
    [
      contextProps.accessToken,
      tPersonal,
      updateRequestActionLabel,
      handleEditExpenseRequest,
      handlePrintRequest,
      handleViewExpenseRequestDetails
    ]
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

  const searchPlaceholderSuffix =
    getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.employee_report_filter.job_search', 'Search') + '...'

  const tableItems = items as ExpenseRequestRow[]

  const dataBodyProps = useMemo(
    (): ExpenseRequestsDataBodyProps => ({
      totalCount,
      isLoading,
      searchInput,
      searchPlaceholderSuffix,
      onSearchChange: handleSearchChange,
      filtersObject,
      expenseRequestsFilterConfig,
      onFilterChange: handleFilterChangeFromDisplay,
      sorting,
      onSortingChange: handleSortingChange,
      primaryAction,
      secondaryActions,
      visibleColumns: visibleColumnIds,
      onVisibleColumnsChange: setRawVisibleColumns,
      filterSheetTitle: tPersonal('filter-expense-requests-title'),
      filterSheetDescription: tPersonal('filter-expense-requests-description'),
      items: tableItems,
      columns: visibleTableColumns,
      error: error || undefined,
      pagination,
      onPaginationChange: handlePaginationChange,
      emptyMessage,
      rowActions,
      onRowClick: handleSelectItem
    }),
    [
      totalCount,
      isLoading,
      searchInput,
      searchPlaceholderSuffix,
      handleSearchChange,
      filtersObject,
      expenseRequestsFilterConfig,
      handleFilterChangeFromDisplay,
      sorting,
      handleSortingChange,
      primaryAction,
      secondaryActions,
      visibleColumnIds,
      tPersonal,
      tableItems,
      visibleTableColumns,
      error,
      pagination,
      handlePaginationChange,
      emptyMessage,
      rowActions,
      handleSelectItem
    ]
  )

  return {
    dataBodyProps,
    selectedItem,
    handleCloseDetails,
    printModalOpen,
    setPrintModalOpen,
    setPrintPdfUrl,
    printLoading,
    printPdfUrl,
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }
}
