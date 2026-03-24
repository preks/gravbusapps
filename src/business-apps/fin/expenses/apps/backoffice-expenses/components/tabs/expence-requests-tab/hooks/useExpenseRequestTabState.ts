import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { SortingState } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import {
  useCurrencyInit,
  useFilterSignatureReset,
  useVisibleColumns
} from '../../../../../manager-expenses/hooks/useTabState'
import {
  applyDateRangeFromFilter,
  formatDateRangeForChip,
  type DateRange
} from '../../../../../manager-expenses/components/tabs/expense-plans-tab/config/dataDisplayFilterUtils'
import { useExpenseRequests } from '../../../../hooks/useExpenseRequests'
import useFilterData from '../../../../hooks/useFilterData'
import { getActiveStructureDepartmentOptions } from '../../../../utils/departmentOptions'
import { getExpenseRequestStatusDisplay, ExpenseStatus } from '../../../../utils/utils'
import { buildStatusDisplayName } from '../../../../utils/sharedUtils'
import { useExpenseRequestQueryBuilder } from '../expenseRequestQueryBuilder'
import { createBackofficeExpenseRequestFilterConfig } from '../config/backofficeExpenseRequestFilterConfig'
import {
  BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS,
  createBackofficeExpenseRequestSortableColumns
} from '../config/backofficeExpenseRequestSortableColumns'
import {
  expenseRequestColumnIdToSortField,
  expenseRequestSortFieldToColumnId
} from '../backofficeExpenseRequestSortUtils'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useExpenseRequestsTableUrlSearch } from './useExpenseRequestsTableUrlSearch'
import { useExpenseRequestFilters } from './useExpenseRequestFilters'
import type { TranslateFn } from '../../../../utils/utils'
import { EXPENSE_REQUEST_EMPLOYEE_FILTER_GROUP_ID } from '../constants/expenseRequestEmployeeFilter'

const DEFAULT_VISIBLE_COLUMN_IDS = [...BACKOFFICE_EXPENSE_REQUEST_DATA_COLUMN_IDS]

function buildEmployeeLabelByIdMap(
  options: Array<{ id: string; label: string }>,
  selected: Array<{ id: string; name: string }>,
  searchResults: Array<{ id: string; name: string }>
): Map<string, string> {
  const map = new Map<string, string>()
  for (const option of options) {
    map.set(option.id, option.label)
  }
  for (const employee of selected) {
    map.set(employee.id, employee.name)
  }
  for (const result of searchResults) {
    if (!map.has(result.id)) {
      map.set(result.id, result.name)
    }
  }
  return map
}

const ALL_STATUSES = [
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

function syncDateRangeToQuery(range: DateRange, setFilter: (v: { from?: string; to?: string } | null) => void) {
  if (!range?.[0] || !range?.[1]) {
    setFilter(null)
    return
  }
  const fromDate = range[0] instanceof Date ? range[0] : new Date(range[0])
  const toDate = range[1] instanceof Date ? range[1] : new Date(range[1])
  setFilter({
    from: dayjs(fromDate).startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
    to: dayjs(toDate).endOf('day').format('YYYY-MM-DDTHH:mm:ss')
  })
}

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
    handleDepartmentFilter,
    handleSearch,
    handleCurrencyFilter,
    amountMinFilter,
    amountMaxFilter,
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

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...DEFAULT_VISIBLE_COLUMN_IDS])

  const [employeeSheetSearchQuery, setEmployeeSheetSearchQuery] = useState('')
  const debouncedEmployeeSheetSearch = useDebounce(employeeSheetSearchQuery, 300)
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false)

  const {
    employeeFilter,
    setEmployeeFilter,
    employeeSearchResults,
    employeeSearchLoading,
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
    amountMaxFilter,
    employeeListSearchQuery: debouncedEmployeeSheetSearch
  })

  const employeeMultiSelectOptions = useMemo(() => {
    const byId = new Map<string, string>()
    for (const s of selectedEmployees) {
      byId.set(s.id, s.name)
    }
    for (const r of employeeSearchResults) {
      if (!byId.has(r.id)) {
        byId.set(r.id, r.name)
      }
    }
    return Array.from(byId.entries()).map(([id, label]) => ({ id, label }))
  }, [selectedEmployees, employeeSearchResults])

  const [effectiveDateRange, setEffectiveDateRange] = useState<DateRange>(null)
  const [requestDateRange, setRequestDateRange] = useState<DateRange>(null)
  const [requestTypeFilterLocal, setRequestTypeFilterLocal] = useState<string[]>([])
  const [departmentIds, setDepartmentIds] = useState<string[]>([])

  const hasNonCurrencyFilters = useMemo(
    () =>
      (searchText || '').trim() !== '' ||
      statusFilter.length > 0 ||
      requestTypeFilterLocal.length > 0 ||
      departmentIds.length > 0 ||
      (employeeFilter || '').trim() !== '' ||
      (amountMinFilter || '').trim() !== '' ||
      (amountMaxFilter || '').trim() !== '' ||
      !!(effectiveDateRange && (effectiveDateRange[0] || effectiveDateRange[1])) ||
      !!(requestDateRange && (requestDateRange[0] || requestDateRange[1])),
    [
      searchText,
      statusFilter,
      effectiveDateRange,
      requestDateRange,
      requestTypeFilterLocal,
      departmentIds,
      employeeFilter,
      amountMinFilter,
      amountMaxFilter
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
  }, [isActive, hasNonCurrencyFilters, setStatusFilter, handleStatusFilter])

  const getStatusDisplayName = useCallback(
    (status: string): string => buildStatusDisplayName(status, getExpenseRequestStatusDisplay, t),
    [t]
  )

  const statusOptionsForConfig = useMemo(() => {
    const byLabel = new Map<string, { id: string; label: string }>()
    for (const status of ALL_STATUSES) {
      const label = getStatusDisplayName(status).trim()
      const key = label.toLowerCase()
      if (!byLabel.has(key)) byLabel.set(key, { id: status, label })
    }
    return Array.from(byLabel.values())
  }, [getStatusDisplayName])

  const filterConfiguration: FilterConfiguration = useMemo(() => {
    const labelMap: Record<string, string> = {}
    for (const opt of statusOptionsForConfig) labelMap[opt.id] = opt.label
    const base = createBackofficeExpenseRequestFilterConfig({
      statusOptions: statusOptionsForConfig.map(o => o.id),
      filterLabelMap: labelMap,
      departmentOptions: departmentOptionsForConfig
    })

    const employeeGroup: FilterConfiguration['groups'][number] = {
      id: EXPENSE_REQUEST_EMPLOYEE_FILTER_GROUP_ID,
      label: t('filter-employee'),
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'employeeIds',
          field: 'employeeIds',
          label: t('filter-employee'),
          type: 'multi-select',
          config: {
            options: employeeMultiSelectOptions,
            showSearch: false,
            showSelectAll: false
          }
        }
      ]
    }

    return {
      ...base,
      groups: [...base.groups.slice(0, 3), employeeGroup, ...base.groups.slice(3)]
    }
  }, [statusOptionsForConfig, departmentOptionsForConfig, employeeMultiSelectOptions, t])

  const filtersObject = useMemo((): Record<string, unknown> => {
    const obj: Record<string, unknown> = {}
    if (statusFilter.length > 0) obj.statusIds = statusFilter
    if (requestTypeFilterLocal.length > 0) obj.requestTypeIds = requestTypeFilterLocal
    if (departmentIds.length > 0) obj.departmentIds = departmentIds
    const effectiveStr = formatDateRangeForChip(effectiveDateRange)
    if (effectiveStr) obj.effectiveDateRange = effectiveStr
    const requestStr = formatDateRangeForChip(requestDateRange)
    if (requestStr) obj.requestDateRange = requestStr
    if (amountMinFilter || amountMaxFilter) {
      const minParsed = amountMinFilter ? Number.parseFloat(amountMinFilter) : undefined
      const maxParsed = amountMaxFilter ? Number.parseFloat(amountMaxFilter) : undefined
      const min = minParsed !== undefined && !Number.isNaN(minParsed) ? minParsed : undefined
      const max = maxParsed !== undefined && !Number.isNaN(maxParsed) ? maxParsed : undefined
      if (min !== undefined || max !== undefined) {
        obj.amount = { min, max }
      }
    }
    if (selectedEmployees.length > 0) {
      obj.employeeIds = selectedEmployees.map(e => e.id)
    }
    return obj
  }, [
    statusFilter,
    requestTypeFilterLocal,
    departmentIds,
    effectiveDateRange,
    requestDateRange,
    amountMinFilter,
    amountMaxFilter,
    selectedEmployees
  ])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      if (Object.keys(filters).length === 0) {
        setStatusFilter([])
        handleStatusFilter('')
        setRequestTypeFilterLocal([])
        setRequestTypeFilter([])
        setDepartmentIds([])
        handleDepartmentFilter('')
        handleAmountFilter('', '')
        setEmployeeSheetSearchQuery('')
        setShowEmployeeDropdown(false)
        setSelectedEmployees([])
        setEmployeeFilter('')
        handleEmployeeFilter('')
        setEffectiveDateRange(null)
        setRequestDateRange(null)
        setEffectiveDateRangeFilter(null)
        setRequestDateRangeFilter(null)
        setCurrentPage(1)
        return
      }

      const statusIds = (filters.statusIds as string[] | undefined) || []
      setStatusFilter(statusIds)
      handleStatusFilter(statusIds.join(','))

      const requestTypeIds = (filters.requestTypeIds as string[] | undefined) || []
      setRequestTypeFilterLocal(requestTypeIds)
      setRequestTypeFilter(requestTypeIds)

      if ('departmentIds' in filters) {
        const nextDepartmentIds = (filters.departmentIds as string[] | undefined) ?? []
        setDepartmentIds(nextDepartmentIds)
        handleDepartmentFilter(nextDepartmentIds.join(','))
      } else if (departmentIds.length > 0) {
        // Chip remove omits the key; do not clear when the key was never in the payload (e.g. unused filter).
        setDepartmentIds([])
        handleDepartmentFilter('')
      }

      if ('amount' in filters) {
        const amt = filters.amount as { min?: number; max?: number } | null | undefined
        if (amt && (amt.min !== undefined || amt.max !== undefined)) {
          const minStr = amt.min !== undefined && !Number.isNaN(Number(amt.min)) ? String(amt.min) : ''
          const maxStr = amt.max !== undefined && !Number.isNaN(Number(amt.max)) ? String(amt.max) : ''
          handleAmountFilter(minStr, maxStr)
        } else {
          handleAmountFilter('', '')
        }
      } else if (amountMinFilter || amountMaxFilter) {
        // Chip remove omits the key instead of sending null.
        handleAmountFilter('', '')
      }

      if ('employeeIds' in filters) {
        const ids = (filters.employeeIds as string[] | undefined) ?? []
        const labelById = buildEmployeeLabelByIdMap(
          employeeMultiSelectOptions,
          selectedEmployees,
          employeeSearchResults
        )
        const nextSelected = ids.map(id => ({
          id,
          name: labelById.get(id) ?? id
        }))
        setSelectedEmployees(nextSelected)
        const joined = ids.join(',')
        setEmployeeFilter(joined)
        handleEmployeeFilter(joined)
      } else if (selectedEmployees.length > 0 || (employeeFilter || '').trim() !== '') {
        setSelectedEmployees([])
        setEmployeeFilter('')
        handleEmployeeFilter('')
        setEmployeeSheetSearchQuery('')
        setShowEmployeeDropdown(false)
      }

      const effSetter = (range: DateRange) => {
        setEffectiveDateRange(range)
        syncDateRangeToQuery(range, setEffectiveDateRangeFilter)
      }
      const reqSetter = (range: DateRange) => {
        setRequestDateRange(range)
        syncDateRangeToQuery(range, setRequestDateRangeFilter)
      }
      applyDateRangeFromFilter(filters.effectiveDateRange, effSetter)
      applyDateRangeFromFilter(filters.requestDateRange, reqSetter)

      setCurrentPage(1)
    },
    [
      setStatusFilter,
      handleStatusFilter,
      setRequestTypeFilter,
      handleDepartmentFilter,
      handleAmountFilter,
      setEmployeeFilter,
      handleEmployeeFilter,
      setSelectedEmployees,
      employeeMultiSelectOptions,
      selectedEmployees,
      employeeSearchResults,
      setEffectiveDateRangeFilter,
      setRequestDateRangeFilter,
      setCurrentPage,
      departmentIds,
      amountMinFilter,
      amountMaxFilter,
      employeeFilter
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
      amountMaxFilter
    ],
    [
      searchText,
      statusFilter,
      requestTypeFilterLocal,
      departmentIds,
      employeeFilter,
      selectedCurrencyCode,
      effectiveDateRange,
      requestDateRange,
      amountMinFilter,
      amountMaxFilter
    ]
  )
  const resetPage = useCallback(() => setCurrentPage(1), [setCurrentPage])
  useFilterSignatureReset(filterSignature, resetPage)

  const sortingState = useMemo((): SortingState => {
    if (!sorting.field || !sorting.order) return []
    const colId = expenseRequestSortFieldToColumnId(sorting.field)
    return [{ id: colId, desc: sorting.order === 'DESC' }]
  }, [sorting.field, sorting.order])

  const handleSortingChange = useCallback(
    (newSorting: SortingState) => {
      if (newSorting.length === 0) {
        if (sorting.field === 'createdAt') {
          applySorting(null, null)
        } else {
          applySorting('createdAt', 'DESC')
        }
        setCurrentPage(1)
        return
      }
      const first = newSorting[0]
      if (first.id === 'select' || first.id === 'actions') return
      const field = expenseRequestColumnIdToSortField(first.id)
      const order: 'ASC' | 'DESC' = first.desc ? 'DESC' : 'ASC'
      if (field === sorting.field && order === sorting.order) return
      applySorting(field, order)
      setCurrentPage(1)
    },
    [applySorting, sorting.field, sorting.order, setCurrentPage]
  )

  const sortableColumns = useMemo(() => createBackofficeExpenseRequestSortableColumns(t), [t])
  const columnsFilteredByVisibility = useVisibleColumns(visibleColumns, sortableColumns)

  const listEmptyMessage = useMemo(
    () => (hasActiveFilters ? t('empty-no-data') : t('empty-no-requests-yet')),
    [hasActiveFilters, t]
  )

  const { buildQueryConditions } = useExpenseRequestQueryBuilder({
    statusFilter,
    employeeFilter,
    amountMinFilter,
    amountMaxFilter,
    departmentIds,
    currencyRef: currencyRefFromCode(selectedCurrencyCode),
    effectiveDateRange,
    requestDateRange,
    requestTypeFilterLocal,
    searchText: debouncedSearchText
  })

  const employeeSearchFilterProps = useEmployeeSearchFilterProps(
    employeeSheetSearchQuery,
    setEmployeeSheetSearchQuery,
    showEmployeeDropdown,
    setShowEmployeeDropdown,
    employeeSearchResults,
    employeeSearchLoading
  )

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
    handleCurrencyChange,
    employeeSearchFilterProps
  }
}

function useEmployeeSearchFilterProps(
  employeeSheetSearchQuery: string,
  setEmployeeSheetSearchQuery: (v: string) => void,
  showEmployeeDropdown: boolean,
  setShowEmployeeDropdown: (v: boolean) => void,
  employeeSearchResults: Array<{ id: string; name: string }>,
  employeeSearchLoading: boolean
) {
  return useMemo(
    () => ({
      employeeSearchText: employeeSheetSearchQuery,
      setEmployeeSearchText: setEmployeeSheetSearchQuery,
      showEmployeeDropdown,
      setShowEmployeeDropdown,
      employeeSearchResults,
      employeeSearchLoading,
      debouncedSearchEmployees: () => undefined
    }),
    [
      employeeSheetSearchQuery,
      setEmployeeSheetSearchQuery,
      showEmployeeDropdown,
      setShowEmployeeDropdown,
      employeeSearchResults,
      employeeSearchLoading
    ]
  )
}
