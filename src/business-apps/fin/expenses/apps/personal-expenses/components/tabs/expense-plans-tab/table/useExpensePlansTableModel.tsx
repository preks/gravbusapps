import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'
import personalTranslations from '../../../../_i18n'
import { useExpensePlanFileService } from '../../../../utils/expensePlanFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useTableSetup } from '@/business-apps/fin/expenses/common/hooks/useTableSetup'
import { useVisibleColumns } from '@/business-apps/fin/expenses/common/hooks/useSharedTabState'
import { createExpensePlanAvailableColumns, EXPENSE_PLAN_TABLE_COLUMN_IDS } from '../config/expensePlanAvailableColumns'
import { createExpensePlanSortableColumns } from '../config/expensePlanSortableColumns'
import { createExpensePlanColumns } from './expensePlanColumns'
import { useExpensePlanRowActions } from './useExpensePlanRowActions'
import type { ExpensePlansTableDisplayProps } from './ExpensePlansTableDisplay'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import type { ExpensePlansTableProps } from './expensePlansTable.types'
import { useExpensePlansTableFilters } from './useExpensePlansTableFilters'
import { ExpensePlansPrimaryAction, ExpensePlansSecondaryActions } from './ExpensePlansTableActions'

const PLAN_DATE_FIELD = 'planDate'

type PlanTableSortOrder = 'ascend' | 'descend' | null

function expensePlanSorterArg(
  field: string | null,
  order: PlanTableSortOrder
): { field?: string; order?: PlanTableSortOrder } {
  if (field != null && order != null) {
    return { field, order }
  }
  return {}
}

export function useExpensePlansTableModel(props: ExpensePlansTableProps) {
  const {
    items: plans,
    isLoading,
    totalCount,
    currentPage,
    pageSize,
    onTableChange,
    search,
    selectedFilters,
    sortField,
    sortOrder,
    planDateRange,
    setPlanDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    reimbursableAmountRange,
    setReimbursableAmountRange,
    paidAdvanceAmountRange,
    setPaidAdvanceAmountRange,
    onFiltersChange,
    availableStatuses = [],
    ...contextProps
  } = props

  const { t: tPersonal } = useTranslation(personalTranslations)

  const {
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    selectedCurrencyCode,
    handleCurrencyChange
  } = useExpensePlansTableFilters({
    selectedFilters: selectedFilters || [],
    filterLabelMap: props.filterLabelMap ?? {},
    availableStatuses,
    t: tPersonal,
    planDateRange,
    setPlanDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    reimbursableAmountRange,
    setReimbursableAmountRange,
    paidAdvanceAmountRange,
    setPaidAdvanceAmountRange,
    setFilters: props.setFilters,
    onFiltersChange,
    currencyStats: props.currencyStats || [],
    widgetTopDestinationFilterTokens: props.widgetTopDestinationFilterTokens ?? []
  })

  const availableColumns = useMemo(() => createExpensePlanAvailableColumns(tPersonal), [tPersonal])
  const sortableColumns = useMemo(() => createExpensePlanSortableColumns(tPersonal), [tPersonal])
  const baseVisibleColumnIds = useMemo(() => availableColumns.map(c => c.id), [availableColumns])
  const [rawVisibleColumns, setRawVisibleColumns] = useState<string[]>(() => [...EXPENSE_PLAN_TABLE_COLUMN_IDS])
  const visibleColumnIds = useVisibleColumns(
    rawVisibleColumns,
    baseVisibleColumnIds.map(id => ({ id }))
  )

  const ignorePageStateUpdate = useCallback(() => {
    void 0
  }, [])
  const ignorePageSizeStateUpdate = useCallback(() => {
    void 0
  }, [])

  const tableContextProps = useMemo(
    () => ({ accessToken: contextProps.accessToken, userInfo: contextProps.userInfo }),
    [contextProps.accessToken, contextProps.userInfo]
  )

  const savedPageBeforeSearchRef = useRef<number | null>(null)
  const prevSearchRef = useRef<string>('')
  const hasActiveFilters = useMemo(() => {
    const trimmedSearch = (search || '').trim()
    const nonCurrencyFilters = (selectedFilters || []).filter(f => !f.startsWith('currency:'))
    return trimmedSearch !== '' || nonCurrencyFilters.length > 0
  }, [search, selectedFilters])

  const [selectedItem, setSelectedItem] = useState<ExpensePlan | null>(null)
  const [selectedExpenseRequest, setSelectedExpenseRequest] = useState<unknown>(null)
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false)
  const [printPdfUrl, setPrintPdfUrl] = useState<string>('')
  const [printLoading, setPrintLoading] = useState<boolean>(false)

  const { printExpensePlan, isMounted } = useExpensePlanFileService(props)

  const handleSelectItem = useCallback((item: ExpensePlan) => {
    setSelectedItem(item)
  }, [])

  const handleCloseDetails = useCallback(() => {
    setSelectedItem(null)
    setSelectedExpenseRequest(null)
  }, [])

  const handlePrintPlan = useCallback(
    async (record: ExpensePlan) => {
      setPrintLoading(true)
      setPrintModalOpen(true)

      try {
        const result = await printExpensePlan(record)

        if (result.success && result.pdfUrl && isMounted.current) {
          setPrintPdfUrl(result.pdfUrl)
        } else if (!result.success) {
          console.error('Error printing plan:', result.error)
        }
      } catch (error) {
        console.error('Error fetching print PDF:', error)
      } finally {
        if (isMounted.current) {
          setPrintLoading(false)
        }
      }
    },
    [printExpensePlan, isMounted]
  )

  const handleAddExpensePlan = useCallback(() => {
    const employeeId = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeId) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      console.warn('User information not loaded yet. Please wait a moment and try again.')
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpensePlan',
      payload: {
        employeeId
      },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo])

  const handleViewExpenseRequestDetails = useCallback((record: ExpensePlan) => {
    const requestId = (record as { expenseRequest?: Array<{ id?: string }> })?.expenseRequest?.[0]?.id
    if (!requestId) {
      console.warn('No related expense request found on expense plan record.')
      return
    }
    const url = buildPlatformUrl('/platform/fin/expenses/expense-request-record', {
      expenseRequestId: requestId,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  const handleViewExpensePlanDetails = useCallback((record: ExpensePlan) => {
    const url = buildPlatformUrl('/platform/fin/expenses/expense-plan-record', {
      expensePlanId: record.id,
      referrer: '/platform/fin/expenses/personal-expenses?tab=expense-plans'
    })
    navigateTo(url)
  }, [])

  const sorting = useMemo(() => {
    const field = sortField ?? null
    const order = sortOrder ?? null
    if (field != null && order != null) {
      return [{ id: field, desc: order === 'descend' }]
    }
    return []
  }, [sortField, sortOrder])

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (!onTableChange) return
      const entry = newSorting[0]
      const currentField = sortField ?? null

      let nextField: string | null
      let nextOrder: PlanTableSortOrder
      if (entry) {
        nextField = entry.id
        nextOrder = entry.desc ? 'descend' : 'ascend'
      } else if (currentField != null && currentField !== PLAN_DATE_FIELD) {
        nextField = PLAN_DATE_FIELD
        nextOrder = 'descend'
      } else {
        nextField = null
        nextOrder = null
      }

      onTableChange({ current: 1, pageSize }, {}, expensePlanSorterArg(nextField, nextOrder))
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
        expensePlanSorterArg(sortField ?? null, sortOrder ?? null)
      )
    },
    [onTableChange, sortField, sortOrder]
  )

  const emptyMessage = hasActiveFilters ? tPersonal('table-empty-filtered') : tPersonal('expense-plans-no-rows')

  const primaryAction = useMemo(
    () => <ExpensePlansPrimaryAction onAddExpensePlan={handleAddExpensePlan} t={tPersonal} />,
    [handleAddExpensePlan, tPersonal]
  )

  const secondaryActions = useMemo(
    () => (
      <ExpensePlansSecondaryActions
        currencyStats={props.currencyStats || []}
        selectedCurrencyCode={selectedCurrencyCode}
        onCurrencyChange={handleCurrencyChange}
      />
    ),
    [props.currencyStats, selectedCurrencyCode, handleCurrencyChange]
  )

  const allColumns = useMemo(() => createExpensePlanColumns(tPersonal), [tPersonal])

  const { columns: visibleTableColumns } = useTableSetup<ExpensePlan>(
    tableContextProps,
    allColumns,
    visibleColumnIds,
    currentPage,
    pageSize,
    ignorePageStateUpdate,
    ignorePageSizeStateUpdate
  )

  const rowActions = useExpensePlanRowActions({
    employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
    accessToken: contextProps.accessToken,
    onPrintPlan: handlePrintPlan,
    onViewExpensePlanDetails: handleViewExpensePlanDetails,
    onViewExpenseRequestDetails: handleViewExpenseRequestDetails,
    t: tPersonal
  })

  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0 && onTableChange) {
      const paginationPayload = {
        current: currentPage,
        pageSize
      }
      onTableChange(paginationPayload, {}, expensePlanSorterArg(sortField ?? null, sortOrder ?? null))
    }
  }, [props.tableRefreshTrigger, currentPage, pageSize, sortField, sortOrder, onTableChange])

  useEffect(() => {
    const prev = (prevSearchRef.current || '').trim()
    const next = (props.search || '').trim()
    const sorterPayload = expensePlanSorterArg(sortField ?? null, sortOrder ?? null)
    if (prev === '' && next !== '') {
      savedPageBeforeSearchRef.current = currentPage
      onTableChange({ current: 1, pageSize, total: totalCount }, {}, sorterPayload)
    } else if (prev !== '' && next === '') {
      onTableChange({ current: 1, pageSize, total: totalCount }, {}, sorterPayload)
      savedPageBeforeSearchRef.current = null
    }
    prevSearchRef.current = props.search || ''
  }, [props.search, onTableChange, currentPage, pageSize, totalCount, sortField, sortOrder])

  const dataBodyProps: ExpensePlansTableDisplayProps = {
    totalCount,
    isLoading,
    search,
    onSearchChange: props.onSearchChange,
    filtersObject,
    filterConfiguration,
    onFilterChange: handleFilterChangeFromDisplay,
    sorting,
    onSortingChange: handleSortingChange,
    sortableColumns,
    availableColumns,
    visibleColumnIds,
    onVisibleColumnIdsChange: setRawVisibleColumns,
    primaryAction,
    secondaryActions,
    filterSheetTitle: tPersonal('filter-expense-plans-title'),
    filterSheetDescription: tPersonal('filter-expense-plans-description'),
    plans: plans || [],
    columns: visibleTableColumns,
    tableError: props.error || undefined,
    pagination,
    onPaginationChange: handlePaginationChange,
    emptyMessage,
    rowActions,
    onRowClick: handleSelectItem,
    listSectionLabel: tPersonal('expense-plans-list-section-title'),
    searchPlaceholder: tPersonal('expense-items-search-placeholder')
  }

  return {
    dataBodyProps,
    selectedItem,
    selectedExpenseRequest,
    handleCloseDetails,
    printModalOpen,
    setPrintModalOpen,
    printPdfUrl,
    setPrintPdfUrl,
    printLoading,
    accessToken: props.accessToken,
    userInfo: props.userInfo
  }
}
