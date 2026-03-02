import dayjs from 'dayjs'
import type { AnalyticsData, DateRangeOption, DepartmentFilter, LocationFilter } from './types'
import { DateRangeOption as DateRangeEnum } from './types'

type NamedOption = { id: string; name: string }

export const computeDateRangeBounds = (
  dateRange: DateRangeOption
): { startDate: string | null; endDate: string | null } => {
  const now = dayjs()

  const endDate = (() => {
    switch (dateRange) {
      case DateRangeEnum.LAST_30_DAYS:
      case DateRangeEnum.LAST_90_DAYS:
      case DateRangeEnum.LAST_6_MONTHS:
      case DateRangeEnum.LAST_YEAR:
        return now.format('YYYY-MM-DD')
      case DateRangeEnum.CURRENT_YEAR:
        return now.endOf('year').format('YYYY-MM-DD')
      case DateRangeEnum.ALL_TIME:
        return null
      default:
        return now.format('YYYY-MM-DD')
    }
  })()

  const startDate = (() => {
    switch (dateRange) {
      case DateRangeEnum.LAST_30_DAYS:
        return now.subtract(30, 'day').format('YYYY-MM-DD')
      case DateRangeEnum.LAST_90_DAYS:
        return now.subtract(90, 'day').format('YYYY-MM-DD')
      case DateRangeEnum.LAST_6_MONTHS:
        return now.subtract(6, 'month').format('YYYY-MM-DD')
      case DateRangeEnum.LAST_YEAR:
        return now.subtract(1, 'year').format('YYYY-MM-DD')
      case DateRangeEnum.CURRENT_YEAR:
        return now.startOf('year').format('YYYY-MM-DD')
      case DateRangeEnum.ALL_TIME:
        return null
      default:
        return now.subtract(30, 'day').format('YYYY-MM-DD')
    }
  })()

  return { startDate, endDate }
}

const collectEmployeeFilters = (rawData: AnalyticsData) => {
  const uniqueLocations = new Map<string, NamedOption>()
  const uniqueDepartments = new Map<string, NamedOption>()

  const processEmployeeFilters = (employee: any) => {
    const location = employee?.employeePosition?.siteLocation
    if (location?.id && location?.name) {
      uniqueLocations.set(location.id, { id: location.id, name: location.name })
    }

    const orgUnit = employee?.employeePosition?.organizationalUnit
    if (orgUnit?.id && orgUnit?.name) {
      uniqueDepartments.set(orgUnit.id, { id: orgUnit.id, name: orgUnit.name })
    }
  }

  for (const item of rawData.expenseItems || []) processEmployeeFilters(item.employee)
  for (const item of rawData.expenseRequests || []) processEmployeeFilters(item.employee)
  for (const item of rawData.expensePlans || []) processEmployeeFilters(item.employee)
  for (const item of rawData.advancePayments || []) processEmployeeFilters(item.expensePlan?.employee)

  return { uniqueLocations, uniqueDepartments }
}

export const buildLocationFilters = (rawData: AnalyticsData): LocationFilter[] => {
  const { uniqueLocations } = collectEmployeeFilters(rawData)
  return Array.from(uniqueLocations.values())
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map(location => ({ id: location.id, name: location.name, selected: false }))
}

export const buildDepartmentFilters = (
  rawData: AnalyticsData,
  options?: NamedOption[],
  previouslySelectedById?: Map<string, boolean>
): DepartmentFilter[] => {
  const { uniqueDepartments } = collectEmployeeFilters(rawData)
  const fromOptions = (options || []).filter(option => option?.id && option?.name)
  const fromData = Array.from(uniqueDepartments.values()).toSorted((a, b) => a.name.localeCompare(b.name))
  const base = fromOptions.length > 0 ? fromOptions : fromData

  return base
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map(department => ({
      id: department.id,
      name: department.name,
      selected: previouslySelectedById?.get(department.id) || false
    }))
}

export const toggleFilterById = <T extends { id: string; selected: boolean }>(filters: T[], id: string): T[] => {
  return filters.map(filter => (filter.id === id ? { ...filter, selected: !filter.selected } : filter))
}

export const filterBySearch = <T extends { name: string }>(filters: T[], searchTerm: string): T[] => {
  if (!searchTerm) return filters
  const normalizedTerm = searchTerm.toLowerCase()
  return filters.filter(filter => filter.name.toLowerCase().includes(normalizedTerm))
}
