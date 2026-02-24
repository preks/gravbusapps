// Refactored Team Spending Analytics Hook (< 300 lines)

import { useState, useEffect, useMemo, useRef } from 'react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import localeData from 'dayjs/plugin/localeData'

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Import modularized code
import type {
  AnalyticsData,
  ProcessedAnalyticsData,
  DateRangeOption,
  LocationFilter,
  DepartmentFilter
} from './teamSpendingAnalytics/types'
import { DateRangeOption as DateRangeEnum } from './teamSpendingAnalytics/types'
import { fetchAnalyticsData } from './teamSpendingAnalytics/dataFetch'
import { filterAllData } from './teamSpendingAnalytics/filterUtils'
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
} from './teamSpendingAnalytics/utils'

dayjs.extend(weekday)
dayjs.extend(localeData)

export { DateRangeOption } from './teamSpendingAnalytics/types'
export type { LocationFilter, DepartmentFilter } from './teamSpendingAnalytics/types'

export const useTeamSpendingAnalytics = (accessToken: string, managerId: string, currencyFilter?: string | null) => {
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<DateRangeOption>(DateRangeEnum.LAST_30_DAYS)
  const [locationFilters, setLocationFilters] = useState<LocationFilter[]>([])
  const [departmentFilters, setDepartmentFilters] = useState<DepartmentFilter[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState<string>('')
  const [rawData, setRawData] = useState<AnalyticsData | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Compute date range primitives to keep effect deps stable
  const computedEndDate = useMemo(() => {
    const now = dayjs()
    switch (dateRange) {
      case DateRangeEnum.LAST_30_DAYS:
      case DateRangeEnum.LAST_90_DAYS:
      case DateRangeEnum.LAST_6_MONTHS:
      case DateRangeEnum.LAST_YEAR:
        return now.format('YYYY-MM-DD') // end = today
      case DateRangeEnum.CURRENT_YEAR:
        return now.endOf('year').format('YYYY-MM-DD') // end = Dec 31st
      case DateRangeEnum.ALL_TIME:
        return null // no upper bound
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

  // Fetch data with signature-based deduplication (prevents StrictMode double-fetch)
  const lastFetchSignatureRef = useRef<string | null>(null)
  useEffect(() => {
    const fetchData = async () => {
      // Validate required parameters
      if (!accessToken) {
        setError('Missing authentication token')
        setIsLoading(false)
        return
      }

      if (
        !managerId ||
        managerId === 'undefined' ||
        managerId === 'null' ||
        managerId === '00000000-0000-0000-0000-000000000000'
      ) {
        setError('Invalid manager ID')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Currency is already standardized by the component, just pass it through
        // If null/undefined, pass as undefined (not as a string)
        const formattedCurrencyRef = currencyFilter || undefined

        const variables = {
          managerId,
          startDateTs: computedStartDate,
          endDateTs: computedEndDate,
          currencyRef: formattedCurrencyRef
        }

        // Create signature to avoid duplicate fetches (e.g., StrictMode double-render)
        const signature = JSON.stringify(variables)
        if (lastFetchSignatureRef.current === signature) {
          setIsLoading(false)
          return
        }
        lastFetchSignatureRef.current = signature

        const data = await fetchAnalyticsData(graphqlClient, variables)
        setRawData(data)
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch analytics data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [accessToken, managerId, computedStartDate, computedEndDate, currencyFilter, graphqlClient])

  // Extract location and department filters from raw data
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
      .map(location => ({
        id: location.id,
        name: location.name,
        selected: false
      }))

    setLocationFilters(locations)

    const departments = Array.from(uniqueDepartments.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(department => ({
        id: department.id,
        name: department.name,
        selected: false
      }))

    setDepartmentFilters(departments)
  }, [rawData])

  // Filter toggles
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

  const handleSearchTermChange = (term: string) => setSearchTerm(term)
  const handleDepartmentSearchTermChange = (term: string) => setDepartmentSearchTerm(term)

  // Filter by search term
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

  // Extract available currencies
  const availableCurrencies = useMemo(() => extractAvailableCurrencies(rawData), [rawData])

  // Apply filters and process data
  const processedData: ProcessedAnalyticsData | null = useMemo(() => {
    if (!rawData) return null

    const selectedLocationIds = locationFilters.filter(l => l.selected).map(l => l.id)
    const selectedDepartmentIds = departmentFilters.filter(d => d.selected).map(d => d.id)

    const { filteredExpenseItems, filteredExpenseRequests, filteredExpensePlans, filteredAdvancePayments } =
      filterAllData(rawData, selectedLocationIds, selectedDepartmentIds)

    // Process data using utility functions
    const orgUnitMap = new Map<string, { count: number; amount: number }>()
    const locationMap = new Map<string, { count: number; amount: number }>()

    processOrgUnitData(filteredExpenseItems, orgUnitMap)
    processOrgUnitData(filteredExpenseRequests, orgUnitMap)
    processOrgUnitData(filteredExpensePlans, orgUnitMap)
    processOrgUnitData(filteredAdvancePayments, orgUnitMap, 'amount')

    processLocationData(filteredExpenseItems, locationMap)
    processLocationData(filteredExpenseRequests, locationMap)
    processLocationData(filteredExpensePlans, locationMap)
    processLocationData(filteredAdvancePayments, locationMap, 'amount')

    return {
      expenseItemsByCategory: processExpenseItemsByCategory(filteredExpenseItems),
      expenseItemsByMonth: processTimeSeriesData(filteredExpenseItems, 'totalAmount', 'expenseDate'),
      expenseItemsByStatus: processStatusData(filteredExpenseItems),
      expenseRequestsByMonth: processTimeSeriesData(filteredExpenseRequests, 'totalAmount', 'createdAt'),
      expenseRequestsByStatus: processStatusData(filteredExpenseRequests),
      expensePlansByMonth: processTimeSeriesData(filteredExpensePlans, 'totalAmount', 'createdAt'),
      expensePlansByStatus: processStatusData(filteredExpensePlans),
      advancePaymentsByMonth: processTimeSeriesData(filteredAdvancePayments, 'amount', 'createdAt'),
      advancePaymentsByStatus: processStatusData(filteredAdvancePayments, 'amount'),
      expensesByOrgUnit: mapToOrgUnitBreakdown(orgUnitMap),
      expensesByLocation: mapToLocationBreakdown(locationMap),
      totalExpenseAmount: calculateTotalAmount(filteredExpenseItems),
      totalRequestAmount: calculateTotalAmount(filteredExpenseRequests),
      totalPlanAmount: calculateTotalAmount(filteredExpensePlans),
      totalAdvanceAmount: calculateTotalAmount(filteredAdvancePayments, 'amount')
    }
  }, [rawData, locationFilters, departmentFilters, dateRange, currencyFilter])

  return {
    isLoading,
    error,
    data: processedData,
    dateRange,
    setDateRange,
    locationFilters: filteredLocationFilters,
    toggleLocationFilter,
    searchTerm,
    setSearchTerm: handleSearchTermChange,
    departmentFilters: filteredDepartmentFilters,
    toggleDepartmentFilter,
    departmentSearchTerm,
    setDepartmentSearchTerm: handleDepartmentSearchTermChange,
    currencyFilter,
    availableCurrencies
  }
}
