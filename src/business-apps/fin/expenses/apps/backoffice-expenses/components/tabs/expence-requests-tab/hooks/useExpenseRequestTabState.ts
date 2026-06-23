import { useState, useEffect, useCallback, useMemo } from 'react'
import { useCurrencyInit } from '../../../../common/hooks/useSharedTabState'
import { useExpenseRequests } from '../../../../hooks/useExpenseRequests'
import useFilterData from '../../../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../../../utils/departmentOptions'
import type { TranslateFn } from '../../../../utils/utils'
import { useExpenseRequestQueryBuilder } from '../data/expenseRequestQueryBuilder'
import { useExpenseRequestsTableUrlSearch } from './useExpenseRequestsTableUrlSearch'
import { useExpenseRequestFilters } from './useExpenseRequestFilters'
import { useExpenseRequestDisplayFilters } from './useExpenseRequestDisplayFilters'
import { useExpenseRequestTableState } from './useExpenseRequestTableState'

interface UseExpenseRequestTabStateParams {
  accessToken: string
  t: TranslateFn
  isActive: boolean
  searchFromParent: string
  onSearchChange: (search: string) => void
}

export function useExpenseRequestTabState({
  accessToken,
  t,
  isActive,
  searchFromParent,
  onSearchChange
}: UseExpenseRequestTabStateParams) {
  const contextProps = useMemo(() => ({ accessToken }), [accessToken])

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
    handleRemainingAmountFilter,
    handleDepartmentFilter,
    handleSearch,
    handleCurrencyFilter,
    amountMinFilter,
    amountMaxFilter,
    remainingMinFilter,
    remainingMaxFilter,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
    setRequestTypeFilter
  } = useExpenseRequests(contextProps, t, isActive)

  const {
    currencies,
    organizationalUnits = [],
    mostUsedCurrency: mostUsedCurrencyRef
  } = useFilterData({
    accessToken: accessToken || undefined
  })

  const departmentOptionsForConfig = useMemo(
    () => getActiveStructureDepartmentOptions(organizationalUnits).map(o => ({ id: o.id, label: o.name })),
    [organizationalUnits]
  )

  const availableCurrencyCodes = useMemo(
    () => [...new Set(currencies.map(c => c.code))].sort((a, b) => a.localeCompare(b)),
    [currencies]
  )

  const mostUsedCurrencyCode = useMemo(() => {
    if (!mostUsedCurrencyRef || currencies.length === 0) return null
    return currencies.find(c => c.currencyRef === mostUsedCurrencyRef)?.code ?? null
  }, [mostUsedCurrencyRef, currencies])

  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null)

  useCurrencyInit(mostUsedCurrencyCode, setSelectedCurrencyCode, selectedCurrencyCode)

  const currencyRefFromCode = useCallback(
    (code: string | null): string => {
      if (!code) return ''
      return currencies.find(c => c.code === code)?.currencyRef ?? ''
    },
    [currencies]
  )

  useEffect(() => {
    handleCurrencyFilter(currencyRefFromCode(selectedCurrencyCode))
  }, [selectedCurrencyCode, currencyRefFromCode, handleCurrencyFilter])

  const handleCurrencyChange = useCallback(
    (code: string | null) => {
      setSelectedCurrencyCode(code)
      setCurrentPage(1)
    },
    [setCurrentPage]
  )

  const { searchText, debouncedSearchText, handleSearchChange } = useExpenseRequestsTableUrlSearch({
    searchFromParent,
    onSearchChange,
    handleSearch
  })

  const {
    employeeFilter,
    setEmployeeFilter,
    employeeSearchResults,
    selectedEmployees,
    setSelectedEmployees,
    statusFilter,
    setStatusFilter
  } = useExpenseRequestFilters({
    searchEmployees,
    handleEmployeeFilter,
    handleStatusFilter,
    handleAmountFilter,
    amountMinFilter,
    amountMaxFilter
  })

  const {
    effectiveDateRange,
    requestDateRange,
    requestTypeFilterLocal,
    departmentIds,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    filterSignature,
    hasActiveFilters
  } = useExpenseRequestDisplayFilters({
    t,
    isActive,
    searchText,
    amountMinFilter,
    amountMaxFilter,
    remainingMinFilter,
    remainingMaxFilter,
    selectedCurrencyCode,
    employeeFilter,
    setEmployeeFilter,
    handleEmployeeFilter,
    statusFilter,
    setStatusFilter,
    handleStatusFilter,
    setRequestTypeFilter,
    handleDepartmentFilter,
    handleAmountFilter,
    handleRemainingAmountFilter,
    setEffectiveDateRangeFilter,
    setRequestDateRangeFilter,
    setCurrentPage,
    departmentOptionsForConfig,
    selectedEmployees,
    setSelectedEmployees,
    employeeSearchResults
  })

  const {
    visibleColumns,
    setVisibleColumns,
    sortingState,
    handleSortingChange,
    allDataColumns,
    sortableColumns,
    columnsFilteredByVisibility,
    listEmptyMessage
  } = useExpenseRequestTableState({
    t,
    sorting,
    applySorting,
    setCurrentPage,
    hasActiveFilters,
    filterSignature
  })

  const { buildQueryConditions } = useExpenseRequestQueryBuilder({
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    remainingMinFilter,
    remainingMaxFilter,
    departmentIds,
    currencyRef: currencyRefFromCode(selectedCurrencyCode),
    effectiveDateRange,
    requestDateRange,
    requestTypeFilterLocal,
    searchText: debouncedSearchText
  })

  return {
    expenses,
    totalItems,
    loading,
    error,
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    fetchData,
    searchText,
    handleSearchChange,
    sortingState,
    allDataColumns,
    sortableColumns,
    handleSortingChange,
    columnsFilteredByVisibility,
    visibleColumns,
    setVisibleColumns,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    listEmptyMessage,
    buildQueryConditions,
    availableCurrencyCodes,
    selectedCurrencyCode,
    handleCurrencyChange
  }
}
