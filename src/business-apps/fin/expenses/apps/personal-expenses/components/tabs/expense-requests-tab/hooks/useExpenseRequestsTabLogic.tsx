import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { startProcess } from '@/common/utils/start-process'
import { useFilterSignatureReset, useSearchHandler } from '@/business-apps/fin/expenses/common/hooks/useSharedTabState'
import ExpenseRequestStatistics from '../statistics/ExpenseRequestStatistics'
import { useGetExpenseRequests } from '../../../../hooks/useGetExpenseRequests'
import { useExpenseRequestCurrencies } from '../../../../hooks/useExpenseRequestCurrencies'
import { useExpenseRequestFilters } from './useExpenseRequestFilters'
import { useExpenseRequestsProcessCompletionRefresh } from './useExpenseRequestsProcessCompletionRefresh'
import { getSelectedCurrencyRef, pickMostUsedCurrencyRef, type CurrencyStat } from '../../../../utils/currencyUtils'
import { message } from 'antd'
import { getRequestCardStrategies, preserveCurrencyAndReset } from '../utils/cardStrategies'
import { buildExpenseRequestFetchFilters } from '../utils/buildExpenseRequestFetchFilters'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { expenseRequestDefaultSort, type ExpenseRequestTableSortOrder } from '../config/expenseRequestSortableColumns'
import { useExpenseRequestsTabFetchEffect } from './useExpenseRequestsTabFetchEffect'
import type { ExpenseRequestsTabProps } from '../types/expenseRequestsTab.types'

export function useExpenseRequestsTabLogic(props: ExpenseRequestsTabProps) {
  const contextProps = useMemo(
    () => ({
      accessToken: props.accessToken,
      userInfo: props.userInfo
    }),
    [props.accessToken, props.userInfo]
  )

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [activeWidget, setActiveWidget] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string | null>(expenseRequestDefaultSort.field)
  const [sortOrder, setSortOrder] = useState<ExpenseRequestTableSortOrder | null>(expenseRequestDefaultSort.order)
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState<number>(0)

  const {
    filterGroups,
    selectedFilters,
    setFilters,
    handleFilterChange,
    clearFilters,
    search,
    setSearch,
    getFilters,
    requestDateRange,
    setRequestDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    filterLabelMap,
    addFilter,
    removeFilter
  } = useExpenseRequestFilters()

  const { items, isLoading, error, totalCount, fetchItems } = useGetExpenseRequests(contextProps)
  const { currencyStats, initialized: currenciesInitialized } = useExpenseRequestCurrencies(
    contextProps,
    selectedFilters,
    setFilters
  )
  const mostUsedCurrencyRef = useMemo(() => pickMostUsedCurrencyRef(currencyStats as CurrencyStat[]), [currencyStats])
  const selectedCurrencyRef = useMemo(
    () => getSelectedCurrencyRef(selectedFilters, mostUsedCurrencyRef),
    [selectedFilters, mostUsedCurrencyRef]
  )
  const currencyCodeForCards = useMemo(() => {
    if (!selectedCurrencyRef) return 'EUR'
    const code = currencyStats.find((s: { ref: string; code: string }) => s.ref === selectedCurrencyRef)?.code
    return code ?? selectedCurrencyRef.split(':').pop() ?? 'EUR'
  }, [selectedCurrencyRef, currencyStats])
  const explicitSelectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find(f => f.startsWith('currency:'))
    return token ? token.substring('currency:'.length) : undefined
  }, [selectedFilters])

  const resetPageToFirst = useCallback(() => setCurrentPage(1), [])
  useFilterSignatureReset(selectedFilters, resetPageToFirst)
  const onSearchChange = useSearchHandler(setSearch, setCurrentPage)

  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      const strategies = getRequestCardStrategies({
        setRequestDateRange,
        setStartDateRange,
        setEndDateRange,
        setEffectiveDateRange,
        handleFilterChange
      })

      const isDeactivating = activeWidget === widgetKey
      if (isDeactivating) {
        strategies[widgetKey]?.remove()
        setActiveWidget(null)
        return
      }

      preserveCurrencyAndReset(selectedFilters, clearFilters, addFilter, mostUsedCurrencyRef)
      strategies[widgetKey]?.apply()
      setActiveWidget(widgetKey)
    },
    [
      activeWidget,
      clearFilters,
      handleFilterChange,
      setRequestDateRange,
      setStartDateRange,
      setEndDateRange,
      setEffectiveDateRange,
      selectedFilters,
      addFilter,
      mostUsedCurrencyRef
    ]
  )

  const memoizedFilters = useMemo(
    () => buildExpenseRequestFetchFilters(getFilters, explicitSelectedCurrencyRef),
    [getFilters, explicitSelectedCurrencyRef]
  )
  const debouncedFilters = useDebounce(memoizedFilters, 200)

  const employeeId = contextProps.userInfo?.employeeDetails?.employeeId

  useExpenseRequestsTabFetchEffect({
    currenciesInitialized,
    accessToken: contextProps.accessToken,
    employeeId,
    fetchItems,
    debouncedFilters,
    currentPage,
    pageSize,
    sortField,
    sortOrder
  })

  useExpenseRequestsProcessCompletionRefresh({
    fetchItems,
    getFilters,
    explicitSelectedCurrencyRef,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    accessToken: contextProps.accessToken,
    employeeId,
    currenciesInitialized,
    setTableRefreshTrigger
  })

  const contentHeader = useMemo(
    () => (
      <ExpenseRequestStatistics
        {...contextProps}
        currencyCode={currencyCodeForCards}
        {...({ selectedCurrencyRef } as any)}
        {...({ currencyInitialized: currenciesInitialized } as any)}
        onWidgetClick={handleWidgetClick}
        activeWidgetKey={activeWidget || undefined}
      />
    ),
    [contextProps, handleWidgetClick, activeWidget, currencyCodeForCards, selectedCurrencyRef, currenciesInitialized]
  )

  const onContentHeaderChange = props.onContentHeaderChange
  useEffect(() => {
    if (!onContentHeaderChange) return
    const timerId = setTimeout(() => {
      onContentHeaderChange(contentHeader)
    }, 0)
    return () => clearTimeout(timerId)
  }, [onContentHeaderChange, contentHeader])

  const handleAddExpenseRequest = useCallback(() => {
    const employeeIdForProcess = contextProps.userInfo?.employeeDetails?.employeeId
    if (!employeeIdForProcess) {
      console.warn('Cannot start process: Employee ID not available. User info may not be fully loaded.')
      message.warning(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.user_information_not_loaded',
          'User information not loaded yet. Please wait a moment and try again.'
        )
      )
      return
    }

    startProcess({
      domain: 'employee-expense',
      processName: 'changeExpenseRequest',
      payload: { employeeId: employeeIdForProcess },
      builderType: 'NATIVE_SCREEN'
    })
  }, [contextProps.userInfo?.employeeDetails?.employeeId])

  const handleTableChange = useCallback(
    (
      pagination: { current: number; pageSize: number },
      _filters: unknown,
      sorter: { field?: string; order?: string }
    ) => {
      setCurrentPage(pagination.current)
      setPageSize(pagination.pageSize)

      const field = sorter?.field
      const order = sorter?.order
      const hasExplicitSort =
        typeof field === 'string' && field.length > 0 && (order === 'ascend' || order === 'descend')

      if (hasExplicitSort) {
        setSortField(field)
        setSortOrder(order as ExpenseRequestTableSortOrder)
        if (contextProps.accessToken && employeeId && currenciesInitialized) {
          const filters = buildExpenseRequestFetchFilters(getFilters, explicitSelectedCurrencyRef)
          fetchItems(
            filters,
            pagination.current,
            pagination.pageSize ?? pageSize,
            field,
            order as ExpenseRequestTableSortOrder
          )
        }
      } else {
        setSortField(null)
        setSortOrder(null)
        if (contextProps.accessToken && employeeId && currenciesInitialized) {
          const filters = buildExpenseRequestFetchFilters(getFilters, explicitSelectedCurrencyRef)
          fetchItems(filters, pagination.current, pagination.pageSize ?? pageSize, null, null)
        }
      }
    },
    [
      getFilters,
      explicitSelectedCurrencyRef,
      fetchItems,
      pageSize,
      contextProps.accessToken,
      employeeId,
      currenciesInitialized
    ]
  )

  const setFiltersForTable = useCallback(
    (filters: string[]) => {
      setFilters(filters)
      if (filters.length === 0) setActiveWidget(null)
      setCurrentPage(1)
    },
    [setFilters]
  )

  const handleFilterChangeCallback = useCallback(
    (filterId: string, selected: boolean) => {
      if (selected) {
        addFilter(filterId)
      } else {
        removeFilter(filterId)
      }
    },
    [addFilter, removeFilter]
  )

  const handleTableFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      if (filterId.startsWith('currency:')) {
        const nonCurrency = selectedFilters.filter((f: string) => !f.startsWith('currency:'))
        setFilters(selected ? [...nonCurrency, filterId] : nonCurrency)
      } else {
        handleFilterChangeCallback(filterId, selected)
      }
    },
    [selectedFilters, setFilters, handleFilterChangeCallback]
  )

  const tableProps = {
    items,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    onTableChange: handleTableChange,
    search,
    onSearchChange,
    selectedFilters,
    setFilters: setFiltersForTable,
    filterGroups,
    handleFilterChange: handleTableFilterChange,
    clearFilters,
    filterLabelMap: { ...filterLabelMap },
    onAddExpenseRequest: handleAddExpenseRequest,
    tableRefreshTrigger,
    addFilter,
    removeFilter,
    requestDateRange,
    setRequestDateRange,
    startDateRange,
    setStartDateRange,
    endDateRange,
    setEndDateRange,
    effectiveDateRange,
    setEffectiveDateRange,
    currencyStats
  }

  return { tableProps }
}
