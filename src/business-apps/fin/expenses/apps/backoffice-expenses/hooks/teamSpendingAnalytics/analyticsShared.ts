import dayjs from 'dayjs'
import { useState } from 'react'
import type {
  AnalyticsData,
  DateRangeOption,
  DepartmentFilter,
  LocationFilter,
  ProcessedAnalyticsData
} from '../../../manager-expenses/hooks/teamSpendingAnalytics/types'
import { DateRangeOption as DateRangeEnum } from '../../../manager-expenses/hooks/teamSpendingAnalytics/types'
import { filterAllData } from '../../../manager-expenses/hooks/teamSpendingAnalytics/filterUtils'
import {
  processExpenseItemsByCategory,
  processTimeSeriesData,
  processStatusData,
  processOrgUnitData,
  processLocationData,
  mapToOrgUnitBreakdown,
  mapToLocationBreakdown,
  calculateTotalAmount
} from '../../../manager-expenses/hooks/teamSpendingAnalytics/utils'

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

export type CorePaidClosedData = {
  paidClosedExpenseItems: any[]
  paidClosedExpenseRequests: any[]
  paidClosedExpensePlans: any[]
  paidClosedAdvancePayments: any[]
}

export const useAnalyticsBaseState = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeOption>(DateRangeEnum.CURRENT_YEAR)
  const [locationFilters, setLocationFilters] = useState<LocationFilter[]>([])
  const [departmentFilters, setDepartmentFilters] = useState<DepartmentFilter[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState<string>('')
  const [rawData, setRawData] = useState<AnalyticsData | null>(null)

  return {
    isLoading,
    setIsLoading,
    error,
    setError,
    dateRange,
    setDateRange,
    locationFilters,
    setLocationFilters,
    departmentFilters,
    setDepartmentFilters,
    searchTerm,
    setSearchTerm,
    departmentSearchTerm,
    setDepartmentSearchTerm,
    rawData,
    setRawData
  }
}

export const getSelectedFilterIds = (
  locationFilters: LocationFilter[],
  departmentFilters: DepartmentFilter[]
): { selectedLocationIds: string[]; selectedDepartmentIds: string[] } => {
  return {
    selectedLocationIds: locationFilters.filter(location => location.selected).map(location => location.id),
    selectedDepartmentIds: departmentFilters.filter(department => department.selected).map(department => department.id)
  }
}

export const buildCorePaidClosedData = (
  rawData: AnalyticsData,
  selectedLocationIds: string[],
  selectedDepartmentIds: string[]
): CorePaidClosedData => {
  const { filteredExpenseItems, filteredExpenseRequests, filteredExpensePlans, filteredAdvancePayments } =
    filterAllData(rawData, selectedLocationIds, selectedDepartmentIds)

  const isPaidOrClosedStatus = (status?: string | null): boolean => {
    const normalizedStatus = String(status || '').toUpperCase()
    return normalizedStatus === 'PAID' || normalizedStatus === 'CLOSED'
  }

  return {
    paidClosedExpenseItems: filteredExpenseItems.filter(item => isPaidOrClosedStatus(item?.status)),
    paidClosedExpenseRequests: filteredExpenseRequests.filter(item => isPaidOrClosedStatus(item?.status)),
    paidClosedExpensePlans: filteredExpensePlans.filter(item => isPaidOrClosedStatus(item?.status)),
    paidClosedAdvancePayments: filteredAdvancePayments.filter(item => isPaidOrClosedStatus(item?.status))
  }
}

export const buildCoreProcessedAnalyticsData = (
  rawData: AnalyticsData,
  selectedLocationIds: string[],
  selectedDepartmentIds: string[]
): { processedData: ProcessedAnalyticsData; corePaidClosedData: CorePaidClosedData } => {
  const corePaidClosedData = buildCorePaidClosedData(rawData, selectedLocationIds, selectedDepartmentIds)
  const { paidClosedExpenseItems, paidClosedExpenseRequests, paidClosedExpensePlans, paidClosedAdvancePayments } =
    corePaidClosedData

  const orgUnitMap = new Map<string, { count: number; amount: number }>()
  const locationMap = new Map<string, { count: number; amount: number }>()

  processOrgUnitData(paidClosedExpenseItems, orgUnitMap)
  processOrgUnitData(paidClosedExpenseRequests, orgUnitMap)
  processOrgUnitData(paidClosedExpensePlans, orgUnitMap)
  processOrgUnitData(paidClosedAdvancePayments, orgUnitMap, 'amount')

  processLocationData(paidClosedExpenseItems, locationMap)
  processLocationData(paidClosedExpenseRequests, locationMap)
  processLocationData(paidClosedExpensePlans, locationMap)
  processLocationData(paidClosedAdvancePayments, locationMap, 'amount')

  return {
    processedData: {
      expenseItemsByCategory: processExpenseItemsByCategory(paidClosedExpenseItems),
      expenseItemsByMonth: processTimeSeriesData(paidClosedExpenseItems, 'reimbursableAmount', 'expenseDate'),
      expenseItemsByStatus: processStatusData(paidClosedExpenseItems),
      expenseRequestsByMonth: processTimeSeriesData(paidClosedExpenseRequests, 'reimbursableAmount', 'createdAt'),
      expenseRequestsByStatus: processStatusData(paidClosedExpenseRequests),
      expensePlansByMonth: processTimeSeriesData(paidClosedExpensePlans, 'totalAmount', 'createdAt'),
      expensePlansByStatus: processStatusData(paidClosedExpensePlans),
      advancePaymentsByMonth: processTimeSeriesData(paidClosedAdvancePayments, 'amount', 'createdAt'),
      advancePaymentsByStatus: processStatusData(paidClosedAdvancePayments, 'amount'),
      expensesByOrgUnit: mapToOrgUnitBreakdown(orgUnitMap),
      expensesByLocation: mapToLocationBreakdown(locationMap),
      totalExpenseAmount: calculateTotalAmount(paidClosedExpenseItems),
      totalRequestAmount: calculateTotalAmount(paidClosedExpenseRequests),
      totalPlanAmount: calculateTotalAmount(paidClosedExpensePlans),
      totalAdvanceAmount: calculateTotalAmount(paidClosedAdvancePayments, 'amount')
    },
    corePaidClosedData
  }
}

export const mapAnalyticsResult = (result: any): AnalyticsData => ({
  expenseItems: result?.expenseItems || [],
  expenseRequests: result?.expenseRequests || [],
  expensePlans: result?.expensePlans || [],
  advancePayments: result?.advancePayments || []
})

export const buildCurrencyQueryVariables = (currencyRef: string | undefined | null): Record<string, unknown> => {
  const hasCurrency = currencyRef && currencyRef !== '' && currencyRef !== 'null' && currencyRef !== 'undefined'
  if (!hasCurrency) return {}
  return {
    itemCurrencyWhere: { currencyRef: { _eq: currencyRef } },
    reqCurrencyWhere: { currencyRef: { _eq: currencyRef } },
    planCurrencyWhere: { currencyRef: { _eq: currencyRef } },
    payCurrencyWhere: { currencyRef: { _eq: currencyRef } }
  }
}
