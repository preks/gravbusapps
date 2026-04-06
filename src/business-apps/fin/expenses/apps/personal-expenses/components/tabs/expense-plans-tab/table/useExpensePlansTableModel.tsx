import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import personalTranslations from '../../../../_i18n'
import { useExpensePlanFileService } from '../../../../utils/expensePlanFileService'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import {
  formatDateRangeForChip,
  applyDateRangeFromFilter,
  resolveSelectedCurrencyCode,
  applyCurrencyChange,
  buildFilteredEmptyMessage,
  buildDefaultEmptyMessage
} from '../../../../utils/tableUtils'
import { CurrencyDropdown } from '../../../shared/TableSharedComponents'
import { useVisibleColumns } from '../../../../../../common/hooks/useSharedTabState'
import { createExpensePlanFilterConfig } from '../config/expensePlanFilterConfig'
import { expensePlanAvailableColumns } from '../config/expensePlanAvailableColumns'
import { expensePlanSortableColumns } from '../config/expensePlanSortableColumns'
import { createExpensePlanColumns } from '../columns/expensePlanColumns'
import { useExpensePlanRowActions } from '../components/ExpensePlanRowActions'
import type { ExpensePlansDataBodyProps } from '../components/ExpensePlansDataBody'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import type { ExpensePlansTableProps } from '../expensePlansTable.types'

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
    onFiltersChange,
    availableStatuses = [],
    ...contextProps
  } = props

  const { t: tPersonal } = useTranslation(personalTranslations)

  const baseVisibleColumnIds = useMemo(() => expensePlanAvailableColumns.map(c => c.id), [])
  const [rawVisibleColumns, setRawVisibleColumns] = useState<string[]>(() => [...baseVisibleColumnIds])
  const visibleColumnIds = useVisibleColumns(
    rawVisibleColumns,
    baseVisibleColumnIds.map(id => ({ id }))
  )

  const expensePlansFilterConfig = useMemo(
    () =>
      createExpensePlanFilterConfig({
        statusOptions: availableStatuses,
        filterLabelMap: props.filterLabelMap ?? {}
      }),
    [availableStatuses, props.filterLabelMap]
  )

  const filtersObject = useMemo((): Record<string, unknown> => {
    const statusIds = (selectedFilters || []).filter(f => availableStatuses.includes(f))
    const planTypeIds = (selectedFilters || []).filter(f => f.startsWith('planType:'))
    const obj: Record<string, unknown> = {}
    if (statusIds.length > 0) obj.statusIds = statusIds
    if (planTypeIds.length > 0) obj.planTypeIds = planTypeIds
    const planDateStr = formatDateRangeForChip(planDateRange)
    if (planDateStr) obj.planDateRange = planDateStr
    const effectiveDateStr = formatDateRangeForChip(effectiveDateRange)
    if (effectiveDateStr) obj.effectiveDateRange = effectiveDateStr
    const startDateStr = formatDateRangeForChip(startDateRange)
    if (startDateStr) obj.startDateRange = startDateStr
    const endDateStr = formatDateRangeForChip(endDateRange)
    if (endDateStr) obj.endDateRange = endDateStr
    return obj
  }, [selectedFilters, planDateRange, effectiveDateRange, startDateRange, endDateRange, availableStatuses])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      const statusIds = (filters.statusIds as string[] | undefined) || []
      const planTypeIds = (filters.planTypeIds as string[] | undefined) || []
      const dateRangeTokens: string[] = []
      if (applyDateRangeFromFilter(filters.planDateRange, setPlanDateRange)) dateRangeTokens.push('planDateRange')
      if (applyDateRangeFromFilter(filters.effectiveDateRange, setEffectiveDateRange)) {
        dateRangeTokens.push('effectiveDateRange')
      }
      if (applyDateRangeFromFilter(filters.startDateRange, setStartDateRange)) dateRangeTokens.push('startDateRange')
      if (applyDateRangeFromFilter(filters.endDateRange, setEndDateRange)) dateRangeTokens.push('endDateRange')
      const preserved = (props.selectedFilters || []).filter(
        f => f.startsWith('currency:') || f.startsWith('topDestination:')
      )
      props.setFilters([...preserved, ...statusIds, ...planTypeIds, ...dateRangeTokens])
      onFiltersChange?.()
    },
    [
      props.setFilters,
      props.selectedFilters,
      setPlanDateRange,
      setEffectiveDateRange,
      setStartDateRange,
      setEndDateRange,
      onFiltersChange
    ]
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
    const field = sortField || 'planDate'
    const order = sortOrder ?? 'descend'
    return [{ id: field, desc: order === 'descend' }]
  }, [sortField, sortOrder])

  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      if (!onTableChange) return
      const entry = newSorting[0]
      if (!entry) {
        onTableChange({ current: 1, pageSize }, {}, { field: sortField || 'planDate', order: undefined })
        return
      }
      const isSameColumn = entry.id === sortField
      const incomingOrder = entry.desc ? 'descend' : 'ascend'
      if (isSameColumn && sortOrder === 'descend' && incomingOrder === 'ascend') {
        onTableChange({ current: 1, pageSize }, {}, { field: entry.id, order: undefined })
      } else {
        onTableChange({ current: 1, pageSize }, {}, { field: entry.id, order: incomingOrder })
      }
    },
    [onTableChange, pageSize, sortField, sortOrder]
  )

  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize])
  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      if (!onTableChange) return
      onTableChange({ current: newPagination.pageIndex + 1, pageSize: newPagination.pageSize }, {}, {})
    },
    [onTableChange]
  )

  const emptyMessage = hasActiveFilters
    ? buildFilteredEmptyMessage()
    : buildDefaultEmptyMessage(
        'lowcoder:personal_expenses.no_plan_data',
        'No expense plans found. Create your first expense plan to get started.'
      )

  const selectedCurrencyCode = useMemo(
    () => resolveSelectedCurrencyCode(selectedFilters || [], props.currencyStats || []),
    [selectedFilters, props.currencyStats]
  )

  const handleCurrencyChange = useCallback(
    (code: string) => {
      applyCurrencyChange(code, selectedFilters || [], props.currencyStats || [], props.setFilters)
    },
    [selectedFilters, props.currencyStats, props.setFilters]
  )

  const secondaryActions = useMemo(
    () =>
      props.currencyStats?.length ? (
        <CurrencyDropdown
          currencyStats={props.currencyStats}
          selectedCurrencyCode={selectedCurrencyCode}
          onCurrencyChange={handleCurrencyChange}
          testIdPrefix="expense-plans"
        />
      ) : undefined,
    [props.currencyStats, selectedCurrencyCode, handleCurrencyChange]
  )

  const allColumns = useMemo(() => createExpensePlanColumns(), [])

  const rowActions = useExpensePlanRowActions({
    employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
    accessToken: contextProps.accessToken,
    onPrintPlan: handlePrintPlan,
    onViewExpensePlanDetails: handleViewExpensePlanDetails,
    onViewExpenseRequestDetails: handleViewExpenseRequestDetails
  })

  useEffect(() => {
    if (props.tableRefreshTrigger && props.tableRefreshTrigger > 0 && onTableChange) {
      const paginationPayload = {
        current: currentPage,
        pageSize
      }
      const sorter = sortField ? { field: sortField, order: sortOrder } : {}
      onTableChange(paginationPayload, {}, sorter)
    }
  }, [props.tableRefreshTrigger, currentPage, pageSize, sortField, sortOrder, onTableChange])

  useEffect(() => {
    const prev = (prevSearchRef.current || '').trim()
    const next = (props.search || '').trim()
    if (prev === '' && next !== '') {
      savedPageBeforeSearchRef.current = currentPage
      onTableChange({ current: 1, pageSize, total: totalCount }, {}, {})
    } else if (prev !== '' && next === '') {
      onTableChange({ current: 1, pageSize, total: totalCount }, {}, {})
      savedPageBeforeSearchRef.current = null
    }
    prevSearchRef.current = props.search || ''
  }, [props.search, onTableChange, currentPage, pageSize, totalCount])

  const primaryAction = useMemo(
    () => (
      <Button
        onClick={handleAddExpensePlan}
        data-testid="add-expense-plan-button"
        className="gba:inline-flex gba:items-center gba:gap-2"
      >
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_calculation_rule_details.calculation_allowance_period_list.calculation_allowance_period_modal.btn_add',
          'Add'
        )}
      </Button>
    ),
    [handleAddExpensePlan]
  )

  const dataBodyProps: ExpensePlansDataBodyProps = {
    totalCount,
    isLoading,
    search,
    onSearchChange: props.onSearchChange,
    filtersObject,
    filterConfiguration: expensePlansFilterConfig,
    onFilterChange: handleFilterChangeFromDisplay,
    sorting,
    onSortingChange: handleSortingChange,
    sortableColumns: expensePlanSortableColumns,
    availableColumns: expensePlanAvailableColumns,
    visibleColumnIds,
    onVisibleColumnIdsChange: setRawVisibleColumns,
    primaryAction,
    secondaryActions,
    filterSheetTitle: tPersonal('filter-expense-plans-title'),
    filterSheetDescription: tPersonal('filter-expense-plans-description'),
    plans: plans || [],
    allColumns,
    tableError: props.error || undefined,
    pagination,
    onPaginationChange: handlePaginationChange,
    emptyMessage,
    rowActions,
    onRowClick: handleSelectItem
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
