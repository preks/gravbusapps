export interface ExpenseRequestsChipFilterSetterContext {
  selectedFilters: string[]
  setStatusFilter: (value: string[]) => void
  setRequestTypeFilterLocal: (value: string[]) => void
  setCurrencyRef: (value: string) => void
  setDepartmentId: (value: string) => void
  setSelectedEmployees: (value: Array<{ id: string; name: string }>) => void
  setEmployeeFilter: (value: string) => void
  setEmployeeSearchText: (value: string) => void
  setShowEmployeeDropdown: (value: boolean) => void
  setLocalAmountMin: (value: string) => void
  setLocalAmountMax: (value: string) => void
  setEffectiveDateRange: (value: [Date | null, Date | null] | null) => void
  setRequestDateRange: (value: [Date | null, Date | null] | null) => void
  handleStatusFilter: (value: string) => void
  setRequestTypeFilter: (value: string[]) => void
  handleCurrencyFilter: (value: string) => void
  handleDepartmentFilter: (value: string) => void
  handleEmployeeFilter: (value: string) => void
  handleAmountFilter: (min: string, max: string) => void
  setEffectiveDateRangeFilter: (value: { from?: string; to?: string } | null) => void
  setRequestDateRangeFilter: (value: { from?: string; to?: string } | null) => void
  handleStatusFilterChange: (status: string, selected: boolean) => void
  handleRequestTypeFilterChange: (filterId: string, selected: boolean) => void
  handleRemoveEmployeeFilter: () => void
  currencyRef: string
  employeeFilter: string
  amountMinFilter: string
  amountMaxFilter: string
  departmentId: string
}

/**
 * Builds the DataController chip `setFilter` handler for backoffice expense requests.
 */
export function createExpenseRequestsChipFilterSetter(ctx: ExpenseRequestsChipFilterSetterContext) {
  return (newFilters: string[]): void => {
    if (newFilters.length === 0) {
      ctx.setStatusFilter([])
      ctx.setRequestTypeFilterLocal([])
      ctx.setCurrencyRef('')
      ctx.setDepartmentId('')
      ctx.setSelectedEmployees([])
      ctx.setEmployeeFilter('')
      ctx.setEmployeeSearchText('')
      ctx.setShowEmployeeDropdown(false)
      ctx.setLocalAmountMin('')
      ctx.setLocalAmountMax('')
      ctx.setEffectiveDateRange(null)
      ctx.setRequestDateRange(null)
      ctx.handleStatusFilter('')
      ctx.setRequestTypeFilter([])
      ctx.handleCurrencyFilter('')
      ctx.handleDepartmentFilter('')
      ctx.handleEmployeeFilter('')
      ctx.handleAmountFilter('', '')
      ctx.setEffectiveDateRangeFilter(null)
      ctx.setRequestDateRangeFilter(null)
      return
    }

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

    const requestTypeFilters = newFilters.filter(isRequestTypeFilter)
    const statusFilters = newFilters.filter(isStatusFilter)

    const statusToRemove = ctx.selectedFilters.filter(f => isStatusFilter(f) && !statusFilters.includes(f))
    const statusToAdd = statusFilters.filter(f => !ctx.selectedFilters.includes(f))
    statusToRemove.forEach(f => ctx.handleStatusFilterChange(f, false))
    statusToAdd.forEach(f => ctx.handleStatusFilterChange(f, true))

    const dateRangesToRemove = ctx.selectedFilters.filter(f => isDateRangeFilter(f) && !newFilters.includes(f))
    dateRangesToRemove.forEach(f => {
      if (f === 'effectiveDateRange') {
        ctx.setEffectiveDateRange(null)
        ctx.setEffectiveDateRangeFilter(null)
      } else if (f === 'requestDateRange') {
        ctx.setRequestDateRange(null)
        ctx.setRequestDateRangeFilter(null)
      }
    })

    const requestTypesToRemove = ctx.selectedFilters.filter(
      f => isRequestTypeFilter(f) && !requestTypeFilters.includes(f)
    )
    const requestTypesToAdd = requestTypeFilters.filter(f => !ctx.selectedFilters.includes(f))
    requestTypesToRemove.forEach(f => ctx.handleRequestTypeFilterChange(f, false))
    requestTypesToAdd.forEach(f => ctx.handleRequestTypeFilterChange(f, true))

    if (!newFilters.includes('currency') && ctx.currencyRef) {
      ctx.setCurrencyRef('')
      ctx.handleCurrencyFilter('')
    }

    if (!newFilters.includes('employee') && ctx.employeeFilter) {
      ctx.handleRemoveEmployeeFilter()
    }

    if (!newFilters.includes('amount') && (ctx.amountMinFilter || ctx.amountMaxFilter)) {
      ctx.setLocalAmountMin('')
      ctx.setLocalAmountMax('')
      ctx.handleAmountFilter('', '')
    }

    if (!newFilters.includes('department') && ctx.departmentId) {
      ctx.setDepartmentId('')
      ctx.handleDepartmentFilter('')
    }
  }
}
