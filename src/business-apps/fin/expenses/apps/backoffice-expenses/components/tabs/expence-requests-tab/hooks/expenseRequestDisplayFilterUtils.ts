import type { FilterConfiguration } from '@newwork/nw-design-system'
import dayjs from 'dayjs'
import {
  applyDateRangeFromFilter,
  formatDateRangeForChip,
  type DateRange
} from '../../../../../manager-expenses/components/tabs/expense-plans-tab/config/dataDisplayFilterUtils'
import { getExpenseRequestStatusDisplay, ExpenseStatus, type TranslateFn } from '../../../../utils/utils'
import { buildStatusDisplayName } from '../../../../utils/sharedUtils'
import { createBackofficeExpenseRequestFilterConfig } from '../config/backofficeExpenseRequestFilterConfig'
import { EXPENSE_REQUEST_EMPLOYEE_FILTER_GROUP_ID } from '../constants/expenseRequestEmployeeFilter'

export interface EmployeeOption {
  id: string
  name: string
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

export function buildEmployeeMultiSelectOptions(
  selectedEmployees: EmployeeOption[],
  employeeSearchResults: EmployeeOption[]
) {
  const labelById = new Map<string, string>()

  for (const employee of selectedEmployees) {
    labelById.set(employee.id, employee.name)
  }

  for (const employee of employeeSearchResults) {
    if (!labelById.has(employee.id)) {
      labelById.set(employee.id, employee.name)
    }
  }

  return Array.from(labelById.entries()).map(([id, label]) => ({ id, label }))
}

function buildEmployeeLabelByIdMap(
  options: Array<{ id: string; label: string }>,
  selected: EmployeeOption[],
  searchResults: EmployeeOption[]
): Map<string, string> {
  const labelById = new Map<string, string>()

  for (const option of options) {
    labelById.set(option.id, option.label)
  }

  for (const employee of selected) {
    labelById.set(employee.id, employee.name)
  }

  for (const employee of searchResults) {
    if (!labelById.has(employee.id)) {
      labelById.set(employee.id, employee.name)
    }
  }

  return labelById
}

export function buildExpenseRequestFilterConfiguration(params: {
  t: TranslateFn
  departmentOptionsForConfig: Array<{ id: string; label: string }>
  employeeMultiSelectOptions: Array<{ id: string; label: string }>
}): FilterConfiguration {
  const { t, departmentOptionsForConfig, employeeMultiSelectOptions } = params
  const statusOptionsForConfig = Array.from(
    ALL_STATUSES.reduce((optionsByLabel, status) => {
      const label = buildStatusDisplayName(status, getExpenseRequestStatusDisplay, t).trim()
      const key = label.toLowerCase()

      if (!optionsByLabel.has(key)) {
        optionsByLabel.set(key, { id: status, label })
      }

      return optionsByLabel
    }, new Map<string, { id: string; label: string }>())
  ).map(([, option]) => option)

  const filterLabelMap: Record<string, string> = {}
  for (const option of statusOptionsForConfig) {
    filterLabelMap[option.id] = option.label
  }

  const baseConfiguration = createBackofficeExpenseRequestFilterConfig({
    statusOptions: statusOptionsForConfig.map(option => option.id),
    filterLabelMap,
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
    ...baseConfiguration,
    groups: [...baseConfiguration.groups.slice(0, 3), employeeGroup, ...baseConfiguration.groups.slice(3)]
  }
}

export function buildExpenseRequestFiltersObject(params: {
  statusFilter: string[]
  requestTypeFilterLocal: string[]
  departmentIds: string[]
  effectiveDateRange: DateRange
  requestDateRange: DateRange
  amountMinFilter: string
  amountMaxFilter: string
  selectedEmployees: EmployeeOption[]
}): Record<string, unknown> {
  const {
    statusFilter,
    requestTypeFilterLocal,
    departmentIds,
    effectiveDateRange,
    requestDateRange,
    amountMinFilter,
    amountMaxFilter,
    selectedEmployees
  } = params

  const filters: Record<string, unknown> = {}

  if (statusFilter.length > 0) {
    filters.statusIds = statusFilter
  }

  if (requestTypeFilterLocal.length > 0) {
    filters.requestTypeIds = requestTypeFilterLocal
  }

  if (departmentIds.length > 0) {
    filters.departmentIds = departmentIds
  }

  const effectiveDateLabel = formatDateRangeForChip(effectiveDateRange)
  if (effectiveDateLabel) {
    filters.effectiveDateRange = effectiveDateLabel
  }

  const requestDateLabel = formatDateRangeForChip(requestDateRange)
  if (requestDateLabel) {
    filters.requestDateRange = requestDateLabel
  }

  if (amountMinFilter || amountMaxFilter) {
    const minParsed = amountMinFilter ? Number.parseFloat(amountMinFilter) : undefined
    const maxParsed = amountMaxFilter ? Number.parseFloat(amountMaxFilter) : undefined
    const min = minParsed !== undefined && !Number.isNaN(minParsed) ? minParsed : undefined
    const max = maxParsed !== undefined && !Number.isNaN(maxParsed) ? maxParsed : undefined

    if (min !== undefined || max !== undefined) {
      filters.amount = { min, max }
    }
  }

  if (selectedEmployees.length > 0) {
    filters.employeeIds = selectedEmployees.map(employee => employee.id)
  }

  return filters
}

function syncDateRangeToQuery(range: DateRange, setFilter: (value: { from?: string; to?: string } | null) => void) {
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

interface ApplyExpenseRequestDisplayFiltersParams {
  filters: Record<string, unknown>
  statusFilter: string[]
  setStatusFilter: (value: string[]) => void
  handleStatusFilter: (value: string) => void
  setRequestTypeFilterLocal: (value: string[]) => void
  setRequestTypeFilter: (value: string[]) => void
  departmentIds: string[]
  setDepartmentIds: (value: string[]) => void
  handleDepartmentFilter: (value: string) => void
  amountMinFilter: string
  amountMaxFilter: string
  handleAmountFilter: (amountMin: string, amountMax: string) => void
  employeeMultiSelectOptions: Array<{ id: string; label: string }>
  selectedEmployees: EmployeeOption[]
  employeeSearchResults: EmployeeOption[]
  setSelectedEmployees: (value: EmployeeOption[]) => void
  employeeFilter: string
  setEmployeeFilter: (value: string) => void
  handleEmployeeFilter: (value: string) => void
  setEmployeeSheetSearchQuery: (value: string) => void
  setShowEmployeeDropdown: (value: boolean) => void
  setEffectiveDateRange: (value: DateRange) => void
  setRequestDateRange: (value: DateRange) => void
  setEffectiveDateRangeFilter: (value: { from?: string; to?: string } | null) => void
  setRequestDateRangeFilter: (value: { from?: string; to?: string } | null) => void
  setCurrentPage: (page: number) => void
}

export function applyExpenseRequestDisplayFilters({
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
  employeeMultiSelectOptions,
  selectedEmployees,
  employeeSearchResults,
  setSelectedEmployees,
  employeeFilter,
  setEmployeeFilter,
  handleEmployeeFilter,
  setEmployeeSheetSearchQuery,
  setShowEmployeeDropdown,
  setEffectiveDateRange,
  setRequestDateRange,
  setEffectiveDateRangeFilter,
  setRequestDateRangeFilter,
  setCurrentPage
}: ApplyExpenseRequestDisplayFiltersParams) {
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

  const statusIds = (filters.statusIds as string[] | undefined) ?? []
  if (statusIds !== statusFilter) {
    setStatusFilter(statusIds)
  }
  handleStatusFilter(statusIds.join(','))

  const requestTypeIds = (filters.requestTypeIds as string[] | undefined) ?? []
  setRequestTypeFilterLocal(requestTypeIds)
  setRequestTypeFilter(requestTypeIds)

  if ('departmentIds' in filters) {
    const nextDepartmentIds = (filters.departmentIds as string[] | undefined) ?? []
    setDepartmentIds(nextDepartmentIds)
    handleDepartmentFilter(nextDepartmentIds.join(','))
  } else if (departmentIds.length > 0) {
    setDepartmentIds([])
    handleDepartmentFilter('')
  }

  if ('amount' in filters) {
    const amount = filters.amount as { min?: number; max?: number } | null | undefined
    if (amount && (amount.min !== undefined || amount.max !== undefined)) {
      const minValue = amount.min !== undefined && !Number.isNaN(Number(amount.min)) ? String(amount.min) : ''
      const maxValue = amount.max !== undefined && !Number.isNaN(Number(amount.max)) ? String(amount.max) : ''
      handleAmountFilter(minValue, maxValue)
    } else {
      handleAmountFilter('', '')
    }
  } else if (amountMinFilter || amountMaxFilter) {
    handleAmountFilter('', '')
  }

  if ('employeeIds' in filters) {
    const employeeIds = (filters.employeeIds as string[] | undefined) ?? []
    const labelById = buildEmployeeLabelByIdMap(employeeMultiSelectOptions, selectedEmployees, employeeSearchResults)
    const nextSelectedEmployees = employeeIds.map(id => ({
      id,
      name: labelById.get(id) ?? id
    }))

    setSelectedEmployees(nextSelectedEmployees)
    const joinedEmployeeIds = employeeIds.join(',')
    setEmployeeFilter(joinedEmployeeIds)
    handleEmployeeFilter(joinedEmployeeIds)
  } else if (selectedEmployees.length > 0 || employeeFilter.trim() !== '') {
    setSelectedEmployees([])
    setEmployeeFilter('')
    handleEmployeeFilter('')
    setEmployeeSheetSearchQuery('')
    setShowEmployeeDropdown(false)
  }

  applyDateRangeFromFilter(filters.effectiveDateRange, range => {
    setEffectiveDateRange(range)
    syncDateRangeToQuery(range, setEffectiveDateRangeFilter)
  })

  applyDateRangeFromFilter(filters.requestDateRange, range => {
    setRequestDateRange(range)
    syncDateRangeToQuery(range, setRequestDateRangeFilter)
  })

  setCurrentPage(1)
}
