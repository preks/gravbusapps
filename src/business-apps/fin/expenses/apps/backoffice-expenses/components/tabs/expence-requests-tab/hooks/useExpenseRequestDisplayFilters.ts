import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DateRange } from '../../../../../../common/utils/dateRangeFilterUtils'
import type { TranslateFn } from '../../../../utils/utils'
import {
  applyExpenseRequestDisplayFilters,
  buildEmployeeMultiSelectOptions,
  buildExpenseRequestFilterConfiguration,
  buildExpenseRequestFiltersObject,
  type EmployeeOption
} from './expenseRequestDisplayFilterUtils'

interface UseExpenseRequestDisplayFiltersParams {
  t: TranslateFn
  isActive: boolean
  searchText: string
  amountMinFilter: string
  amountMaxFilter: string
  remainingMinFilter: string
  remainingMaxFilter: string
  selectedCurrencyCode: string | null
  employeeFilter: string
  setEmployeeFilter: (value: string) => void
  handleEmployeeFilter: (value: string) => void
  statusFilter: string[]
  setStatusFilter: (value: string[]) => void
  handleStatusFilter: (value: string) => void
  setRequestTypeFilter: (value: string[]) => void
  handleDepartmentFilter: (value: string) => void
  handleAmountFilter: (amountMin: string, amountMax: string) => void
  handleRemainingAmountFilter: (remainingMin: string, remainingMax: string) => void
  setEffectiveDateRangeFilter: (value: { from?: string; to?: string } | null) => void
  setRequestDateRangeFilter: (value: { from?: string; to?: string } | null) => void
  setCurrentPage: (page: number) => void
  departmentOptionsForConfig: Array<{ id: string; label: string }>
  selectedEmployees: EmployeeOption[]
  setSelectedEmployees: (value: EmployeeOption[]) => void
  employeeSearchResults: EmployeeOption[]
}

export function useExpenseRequestDisplayFilters({
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
}: UseExpenseRequestDisplayFiltersParams) {
  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange>(null)
  const [requestDateRange, setRequestDateRange] = useState<DateRange>(null)
  const [requestTypeFilterLocal, setRequestTypeFilterLocal] = useState<string[]>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])

  const employeeMultiSelectOptions = useMemo(
    () => buildEmployeeMultiSelectOptions(selectedEmployees, employeeSearchResults),
    [employeeSearchResults, selectedEmployees]
  )

  const hasNonCurrencyFilters = useMemo(
    () =>
      searchText.trim() !== '' ||
      statusFilter.length > 0 ||
      requestTypeFilterLocal.length > 0 ||
      departmentIds.length > 0 ||
      employeeFilter.trim() !== '' ||
      amountMinFilter.trim() !== '' ||
      amountMaxFilter.trim() !== '' ||
      remainingMinFilter.trim() !== '' ||
      remainingMaxFilter.trim() !== '' ||
      !!(effectiveDateRange && (effectiveDateRange[0] || effectiveDateRange[1])) ||
      !!(requestDateRange && (requestDateRange[0] || requestDateRange[1])),
    [
      amountMaxFilter,
      amountMinFilter,
      remainingMaxFilter,
      remainingMinFilter,
      departmentIds,
      effectiveDateRange,
      employeeFilter,
      requestDateRange,
      requestTypeFilterLocal,
      searchText,
      statusFilter
    ]
  )

  const hasActiveFilters = useMemo(
    () => hasNonCurrencyFilters || !!selectedCurrencyCode,
    [hasNonCurrencyFilters, selectedCurrencyCode]
  )

  const wasActiveRef = useRef<boolean>(isActive)
  useEffect(() => {
    const becameActive = isActive && !wasActiveRef.current
    if (becameActive && !hasNonCurrencyFilters) {
      setStatusFilter(['BOOKED'])
      handleStatusFilter('BOOKED')
    }

    wasActiveRef.current = isActive
  }, [handleStatusFilter, hasNonCurrencyFilters, isActive, setStatusFilter])

  const filterConfiguration = useMemo(
    () =>
      buildExpenseRequestFilterConfiguration({
        t,
        departmentOptionsForConfig,
        employeeMultiSelectOptions
      }),
    [departmentOptionsForConfig, employeeMultiSelectOptions, t]
  )

  const filtersObject = useMemo(
    () =>
      buildExpenseRequestFiltersObject({
        statusFilter,
        requestTypeFilterLocal,
        departmentIds,
        effectiveDateRange,
        requestDateRange,
        amountMinFilter,
        amountMaxFilter,
        remainingMinFilter,
        remainingMaxFilter,
        selectedEmployees
      }),
    [
      amountMaxFilter,
      amountMinFilter,
      remainingMaxFilter,
      remainingMinFilter,
      departmentIds,
      effectiveDateRange,
      requestDateRange,
      requestTypeFilterLocal,
      selectedEmployees,
      statusFilter
    ]
  )

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) =>
      applyExpenseRequestDisplayFilters({
        filters,
        statusFilter,
        setStatusFilter,
        handleStatusFilter,
        setRequestTypeFilterLocal,
        setRequestTypeFilter,
        departmentIds,
        setDepartmentIds,
        handleDepartmentFilter,
        amountMinFilter,
        amountMaxFilter,
        handleAmountFilter,
        remainingMinFilter,
        remainingMaxFilter,
        handleRemainingAmountFilter,
        employeeMultiSelectOptions,
        selectedEmployees,
        employeeSearchResults,
        setSelectedEmployees,
        employeeFilter,
        setEmployeeFilter,
        handleEmployeeFilter,
        setEffectiveDateRange,
        setRequestDateRange,
        setEffectiveDateRangeFilter,
        setRequestDateRangeFilter,
        setCurrentPage
      }),
    [
      amountMaxFilter,
      amountMinFilter,
      remainingMaxFilter,
      remainingMinFilter,
      departmentIds,
      employeeFilter,
      employeeMultiSelectOptions,
      employeeSearchResults,
      handleAmountFilter,
      handleRemainingAmountFilter,
      handleDepartmentFilter,
      handleEmployeeFilter,
      handleStatusFilter,
      selectedEmployees,
      setCurrentPage,
      setEffectiveDateRangeFilter,
      setEmployeeFilter,
      setRequestDateRangeFilter,
      setRequestTypeFilter,
      setSelectedEmployees,
      setStatusFilter
    ]
  )

  const filterSignature = useMemo(
    () => [
      searchText,
      statusFilter,
      requestTypeFilterLocal,
      departmentIds,
      employeeFilter,
      selectedCurrencyCode,
      effectiveDateRange,
      requestDateRange,
      amountMinFilter,
      amountMaxFilter,
      remainingMinFilter,
      remainingMaxFilter
    ],
    [
      amountMaxFilter,
      amountMinFilter,
      remainingMaxFilter,
      remainingMinFilter,
      departmentIds,
      effectiveDateRange,
      employeeFilter,
      requestDateRange,
      requestTypeFilterLocal,
      searchText,
      selectedCurrencyCode,
      statusFilter
    ]
  )

  return {
    effectiveDateRange,
    requestDateRange,
    requestTypeFilterLocal,
    departmentIds,
    filterConfiguration,
    filtersObject,
    handleFilterChangeFromDisplay,
    filterSignature,
    hasActiveFilters
  }
}
