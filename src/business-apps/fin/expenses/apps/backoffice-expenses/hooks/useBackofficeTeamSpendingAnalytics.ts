/**
 * Backoffice Team Spending Analytics hook - global data (no supervisor/manager filter).
 * Adapted from manager useTeamSpendingAnalytics; does not filter by managerId.
 */
import { useState, useEffect, useMemo } from 'react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

import type {
  AnalyticsData,
  ProcessedAnalyticsData,
  DateRangeOption,
  LocationFilter,
  DepartmentFilter
} from '../../manager-expenses/hooks/teamSpendingAnalytics/types'
import { DateRangeOption as DateRangeEnum } from '../../manager-expenses/hooks/teamSpendingAnalytics/types'
import { fetchBackofficeAnalyticsData } from './teamSpendingAnalytics/backofficeDataFetch'
import { filterAllData } from '../../manager-expenses/hooks/teamSpendingAnalytics/filterUtils'
import {
  processExpenseItemsByCategory,
  processTimeSeriesData,
  processStatusData,
  processOrgUnitData,
  processLocationData,
  mapToOrgUnitBreakdown,
  mapToLocationBreakdown,
  calculateTotalAmount,
  extractAvailableCurrencies
} from '../../manager-expenses/hooks/teamSpendingAnalytics/utils'

dayjs.extend(weekday)
dayjs.extend(localeData)

export { DateRangeOption } from '../../manager-expenses/hooks/teamSpendingAnalytics/types'
export type { LocationFilter, DepartmentFilter } from '../../manager-expenses/hooks/teamSpendingAnalytics/types'

export const useBackofficeTeamSpendingAnalytics = (
  accessToken: string,
  currencyFilter?: string | null,
  availableDepartmentOptions?: Array<{ id: string; name: string }>
) => {
  const isPaidOrClosedStatus = (status?: string | null): boolean => {
    const normalizedStatus = String(status || '').toUpperCase()
    return normalizedStatus === 'PAID' || normalizedStatus === 'CLOSED'
  }

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeOption>(DateRangeEnum.LAST_30_DAYS)
  const [locationFilters, setLocationFilters] = useState<LocationFilter[]>([])
  const [departmentFilters, setDepartmentFilters] = useState<DepartmentFilter[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState<string>('')
  const [rawData, setRawData] = useState<AnalyticsData | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const analyticsDebugEnabled =
    globalThis.window !== undefined &&
    new URLSearchParams(globalThis.window.location.search).get('debugAnalytics') === '1'

  const computedEndDate = useMemo(() => {
    const now = dayjs()
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
  }, [dateRange])

  const computedStartDate = useMemo(() => {
    const now = dayjs()
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
  }, [dateRange])

  useEffect(() => {
    let isActive = true

    const fetchData = async () => {
      if (!accessToken) {
        if (!isActive) return
        setError('Missing authentication token')
        setIsLoading(false)
        return
      }

      if (!isActive) return
      setIsLoading(true)
      setError(null)

      try {
        const formattedCurrencyRef = currencyFilter || undefined
        const variables = {
          startDateTs: computedStartDate,
          endDateTs: computedEndDate,
          currencyRef: formattedCurrencyRef
        }

        const data = await fetchBackofficeAnalyticsData(graphqlClient, variables)
        if (!isActive) return
        setRawData(data)
      } catch (err: any) {
        if (!isActive) return
        setError(err?.message || 'Failed to fetch analytics data')
      } finally {
        if (!isActive) return
        setIsLoading(false)
      }
    }

    fetchData()

    return () => {
      isActive = false
    }
  }, [accessToken, computedStartDate, computedEndDate, currencyFilter, graphqlClient])

  useEffect(() => {
    if (!rawData) return

    const uniqueLocations = new Map<string, { id: string; name: string }>()
    const uniqueDepartments = new Map<string, { id: string; name: string }>()

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

    for (const item of rawData.expenseItems || []) {
      processEmployeeFilters(item.employee)
    }
    for (const item of rawData.expenseRequests || []) {
      processEmployeeFilters(item.employee)
    }
    for (const item of rawData.expensePlans || []) {
      processEmployeeFilters(item.employee)
    }
    for (const item of rawData.advancePayments || []) {
      processEmployeeFilters(item.expensePlan?.employee)
    }

    const locations = Array.from(uniqueLocations.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(location => ({ id: location.id, name: location.name, selected: false }))
    setLocationFilters(locations)

    const dashboardDepartments = (availableDepartmentOptions || [])
      .filter(department => department?.id && department?.name)
      .map(department => ({ id: department.id, name: department.name }))

    const departmentsFromData = Array.from(uniqueDepartments.values()).sort((a, b) => a.name.localeCompare(b.name))
    const baseDepartments = dashboardDepartments.length > 0 ? dashboardDepartments : departmentsFromData

    setDepartmentFilters(previousFilters => {
      const selectedById = new Map(previousFilters.map(filter => [filter.id, filter.selected]))
      return baseDepartments
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(department => ({
          id: department.id,
          name: department.name,
          selected: selectedById.get(department.id) || false
        }))
    })
  }, [rawData, availableDepartmentOptions])

  const toggleLocationFilter = (locationId: string) => {
    setLocationFilters(prevFilters =>
      prevFilters.map(filter => (filter.id === locationId ? { ...filter, selected: !filter.selected } : filter))
    )
  }

  const toggleDepartmentFilter = (departmentId: string) => {
    setDepartmentFilters(prevFilters =>
      prevFilters.map(filter => (filter.id === departmentId ? { ...filter, selected: !filter.selected } : filter))
    )
  }

  const filteredLocationFilters = useMemo(() => {
    if (!searchTerm) return locationFilters
    return locationFilters.filter(location => location.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }, [locationFilters, searchTerm])

  const filteredDepartmentFilters = useMemo(() => {
    if (!departmentSearchTerm) return departmentFilters
    return departmentFilters.filter(department =>
      department.name.toLowerCase().includes(departmentSearchTerm.toLowerCase())
    )
  }, [departmentFilters, departmentSearchTerm])

  const availableCurrencies = useMemo(() => extractAvailableCurrencies(rawData), [rawData])

  const processedData: ProcessedAnalyticsData | null = useMemo(() => {
    if (!rawData) return null

    const selectedLocationIds = locationFilters.filter(l => l.selected).map(l => l.id)
    const selectedDepartmentIds = departmentFilters.filter(d => d.selected).map(d => d.id)

    const { filteredExpenseItems, filteredExpenseRequests, filteredExpensePlans, filteredAdvancePayments } =
      filterAllData(rawData, selectedLocationIds, selectedDepartmentIds)

    const paidClosedExpenseItems = filteredExpenseItems.filter(item => isPaidOrClosedStatus(item?.status))
    const paidClosedExpenseRequests = filteredExpenseRequests.filter(item => isPaidOrClosedStatus(item?.status))
    const paidClosedExpensePlans = filteredExpensePlans.filter(item => isPaidOrClosedStatus(item?.status))
    const paidClosedAdvancePayments = filteredAdvancePayments.filter(item => isPaidOrClosedStatus(item?.status))

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
      expenseItemsByCategory: processExpenseItemsByCategory(paidClosedExpenseItems),
      expenseItemsByMonth: processTimeSeriesData(paidClosedExpenseItems, 'totalAmount', 'expenseDate'),
      expenseItemsByStatus: processStatusData(paidClosedExpenseItems),
      expenseRequestsByMonth: processTimeSeriesData(paidClosedExpenseRequests, 'totalAmount', 'createdAt'),
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
    }
  }, [rawData, locationFilters, departmentFilters, dateRange, currencyFilter])

  useEffect(() => {
    if (!analyticsDebugEnabled || !rawData) return

    const sumBy = (rows: Array<any>, key: string) => rows.reduce((sum, row) => sum + Number(row?.[key] || 0), 0)
    const selectedLocationIds = locationFilters.filter(l => l.selected).map(l => l.id)
    const selectedDepartmentIds = departmentFilters.filter(d => d.selected).map(d => d.id)
    const filtered = filterAllData(rawData, selectedLocationIds, selectedDepartmentIds)
    const paidClosedExpenseItems = filtered.filteredExpenseItems.filter(item => isPaidOrClosedStatus(item?.status))
    const paidClosedExpenseRequests = filtered.filteredExpenseRequests.filter(item =>
      isPaidOrClosedStatus(item?.status)
    )
    const paidClosedExpensePlans = filtered.filteredExpensePlans.filter(item => isPaidOrClosedStatus(item?.status))
    const paidClosedAdvancePayments = filtered.filteredAdvancePayments.filter(item =>
      isPaidOrClosedStatus(item?.status)
    )

    console.info(
      '[BackofficeAnalyticsDebug] queryContext',
      JSON.stringify({
        dateRange,
        startDateTs: computedStartDate,
        endDateTs: computedEndDate,
        currencyRef: currencyFilter || null,
        selectedLocationIds,
        selectedDepartmentIds
      })
    )

    console.info(
      '[BackofficeAnalyticsDebug] rawTotals',
      JSON.stringify({
        itemsCount: rawData.expenseItems?.length || 0,
        itemsAmount: sumBy(rawData.expenseItems || [], 'totalAmount'),
        requestsCount: rawData.expenseRequests?.length || 0,
        requestsAmount: sumBy(rawData.expenseRequests || [], 'totalAmount'),
        plansCount: rawData.expensePlans?.length || 0,
        plansAmount: sumBy(rawData.expensePlans || [], 'totalAmount'),
        paymentsCount: rawData.advancePayments?.length || 0,
        paymentsAmount: sumBy(rawData.advancePayments || [], 'amount')
      })
    )

    console.info(
      '[BackofficeAnalyticsDebug] filteredTotals',
      JSON.stringify({
        itemsCount: paidClosedExpenseItems.length,
        itemsAmount: sumBy(paidClosedExpenseItems, 'totalAmount'),
        requestsCount: paidClosedExpenseRequests.length,
        requestsAmount: sumBy(paidClosedExpenseRequests, 'totalAmount'),
        plansCount: paidClosedExpensePlans.length,
        plansAmount: sumBy(paidClosedExpensePlans, 'totalAmount'),
        paymentsCount: paidClosedAdvancePayments.length,
        paymentsAmount: sumBy(paidClosedAdvancePayments, 'amount')
      })
    )
  }, [
    analyticsDebugEnabled,
    rawData,
    locationFilters,
    departmentFilters,
    dateRange,
    computedStartDate,
    computedEndDate,
    currencyFilter
  ])

  return {
    isLoading,
    error,
    data: processedData,
    dateRange,
    setDateRange,
    locationFilters: filteredLocationFilters,
    toggleLocationFilter,
    searchTerm,
    setSearchTerm,
    departmentFilters: filteredDepartmentFilters,
    toggleDepartmentFilter,
    departmentSearchTerm,
    setDepartmentSearchTerm,
    currencyFilter,
    availableCurrencies
  }
}
