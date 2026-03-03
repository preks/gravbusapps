/**
 * Backoffice Team Spending Analytics hook - global data (no supervisor/manager filter).
 * Adapted from manager useTeamSpendingAnalytics; does not filter by managerId.
 */
import { useEffect, useMemo } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

import type { ProcessedAnalyticsData } from '../../manager-expenses/hooks/teamSpendingAnalytics/types'
import { fetchBackofficeAnalyticsData } from './teamSpendingAnalytics/backofficeDataFetch'
import {
  processTimeSeriesData,
  processOrgUnitData,
  processLocationData,
  calculateTotalAmount,
  extractAvailableCurrencies,
  mapToOrgUnitBreakdown,
  mapToLocationBreakdown
} from '../../manager-expenses/hooks/teamSpendingAnalytics/utils'
import {
  computeDateRangeBounds,
  buildLocationFilters,
  buildDepartmentFilters,
  toggleFilterById,
  filterBySearch,
  getSelectedFilterIds,
  buildCoreProcessedAnalyticsData,
  buildCorePaidClosedData,
  useAnalyticsBaseState
} from '../../manager-expenses/hooks/teamSpendingAnalytics/shared'

export { DateRangeOption } from '../../manager-expenses/hooks/teamSpendingAnalytics/types'
export type { LocationFilter, DepartmentFilter } from '../../manager-expenses/hooks/teamSpendingAnalytics/types'

export const useBackofficeTeamSpendingAnalytics = (
  accessToken: string,
  currencyFilter?: string | null,
  availableDepartmentOptions?: Array<{ id: string; name: string }>
) => {
  const {
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
  } = useAnalyticsBaseState()

  const graphqlClient = useGraphQLClient(accessToken)
  const analyticsDebugEnabled =
    globalThis.window !== undefined &&
    new URLSearchParams(globalThis.window.location.search).get('debugAnalytics') === '1'

  const { startDate: computedStartDate, endDate: computedEndDate } = useMemo(
    () => computeDateRangeBounds(dateRange),
    [dateRange]
  )

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
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isActive = false
    }
  }, [accessToken, computedStartDate, computedEndDate, currencyFilter, graphqlClient])

  useEffect(() => {
    if (!rawData) return

    setLocationFilters(buildLocationFilters(rawData))

    setDepartmentFilters(previousFilters => {
      const selectedById = new Map(previousFilters.map(filter => [filter.id, filter.selected]))
      return buildDepartmentFilters(rawData, availableDepartmentOptions, selectedById)
    })
  }, [rawData, availableDepartmentOptions])

  const toggleLocationFilter = (locationId: string) => {
    setLocationFilters(prevFilters => toggleFilterById(prevFilters, locationId))
  }

  const toggleDepartmentFilter = (departmentId: string) => {
    setDepartmentFilters(prevFilters => toggleFilterById(prevFilters, departmentId))
  }

  const filteredLocationFilters = useMemo(() => {
    return filterBySearch(locationFilters, searchTerm)
  }, [locationFilters, searchTerm])

  const filteredDepartmentFilters = useMemo(() => {
    return filterBySearch(departmentFilters, departmentSearchTerm)
  }, [departmentFilters, departmentSearchTerm])

  const availableCurrencies = useMemo(() => extractAvailableCurrencies(rawData), [rawData])

  const processedData: ProcessedAnalyticsData | null = useMemo(() => {
    if (!rawData) return null

    const { selectedLocationIds, selectedDepartmentIds } = getSelectedFilterIds(locationFilters, departmentFilters)
    const { processedData: coreProcessedData, corePaidClosedData } = buildCoreProcessedAnalyticsData(
      rawData,
      selectedLocationIds,
      selectedDepartmentIds
    )
    const { paidClosedExpenseItems, paidClosedExpenseRequests, paidClosedExpensePlans, paidClosedAdvancePayments } =
      corePaidClosedData

    const paidClosedTravelExpenseItems = paidClosedExpenseItems.filter(
      item => item?.expenseRequest?.requestTypeRef === 'ExpenseRequestType:v1:TRIP'
    )
    const paidClosedTravelExpenseRequests = paidClosedExpenseRequests.filter(
      item => item?.requestTypeRef === 'ExpenseRequestType:v1:TRIP'
    )
    const paidClosedTravelAdvancePayments = paidClosedAdvancePayments.filter(
      item => item?.expensePlan?.requestTypeRef === 'ExpenseRequestType:v1:TRIP'
    )

    const orgUnitMap = new Map<string, { count: number; amount: number }>()
    const locationMap = new Map<string, { count: number; amount: number }>()
    const travelOrgUnitMap = new Map<string, { count: number; amount: number }>()
    const travelLocationMap = new Map<string, { count: number; amount: number }>()
    const travelDestinationMap = new Map<string, { count: number; amount: number }>()

    const locale = String(getCurrentActiveUserLocale() || 'en-US').toLowerCase()
    const resolveDestinationPoint = (request: any): string => {
      const points = Array.isArray(request?.expenseRequestTrip) ? request.expenseRequestTrip : []
      const destination = points[0]
      if (!destination) return 'Unknown destination'
      const translations = Array.isArray(destination?.travelRegion?.translations)
        ? destination.travelRegion.translations
        : []
      const localizedRegion = translations.find(
        (translation: any) => String(translation?.localeCode || '').toLowerCase() === locale
      )?.value
      const regionValue = localizedRegion || destination?.travelRegion?.value
      return regionValue || destination?.address || destination?.countryRef || 'Unknown destination'
    }

    processOrgUnitData(paidClosedExpenseItems, orgUnitMap)
    processOrgUnitData(paidClosedExpenseRequests, orgUnitMap)
    processOrgUnitData(paidClosedExpensePlans, orgUnitMap)
    processOrgUnitData(paidClosedAdvancePayments, orgUnitMap, 'amount')

    processLocationData(paidClosedExpenseItems, locationMap)
    processLocationData(paidClosedExpenseRequests, locationMap)
    processLocationData(paidClosedExpensePlans, locationMap)
    processLocationData(paidClosedAdvancePayments, locationMap, 'amount')
    processOrgUnitData(paidClosedTravelExpenseItems, travelOrgUnitMap)
    processOrgUnitData(paidClosedTravelExpenseRequests, travelOrgUnitMap)
    processOrgUnitData(paidClosedTravelAdvancePayments, travelOrgUnitMap, 'amount')
    processLocationData(paidClosedTravelExpenseItems, travelLocationMap)
    processLocationData(paidClosedTravelExpenseRequests, travelLocationMap)
    processLocationData(paidClosedTravelAdvancePayments, travelLocationMap, 'amount')
    for (const request of paidClosedTravelExpenseRequests) {
      const destinationPoint = resolveDestinationPoint(request)
      const existing = travelDestinationMap.get(destinationPoint) || { count: 0, amount: 0 }
      const requestAmount = Number(request?.totalAmount || 0)
      travelDestinationMap.set(destinationPoint, {
        count: existing.count + 1,
        amount: existing.amount + requestAmount
      })
    }

    return {
      ...coreProcessedData,
      travelExpenseItemsByMonth: processTimeSeriesData(paidClosedTravelExpenseItems, 'totalAmount', 'expenseDate'),
      travelRequestsByMonth: processTimeSeriesData(paidClosedTravelExpenseRequests, 'totalAmount', 'startDate'),
      travelAdvancePaymentsByMonth: processTimeSeriesData(paidClosedTravelAdvancePayments, 'amount', 'createdAt'),
      travelByDepartment: mapToOrgUnitBreakdown(travelOrgUnitMap),
      travelByLocation: mapToLocationBreakdown(travelLocationMap),
      totalTravelExpenseAmount: calculateTotalAmount(paidClosedTravelExpenseItems),
      totalTravelRequestAmount: calculateTotalAmount(paidClosedTravelExpenseRequests),
      totalTravelAdvancePaidAmount: calculateTotalAmount(paidClosedTravelAdvancePayments, 'amount'),
      totalTravelCount: paidClosedTravelExpenseRequests.length,
      travelByDestinationPoint: mapToLocationBreakdown(travelDestinationMap)
    }
  }, [rawData, locationFilters, departmentFilters, dateRange, currencyFilter])

  useEffect(() => {
    if (!analyticsDebugEnabled || !rawData) return

    const sumBy = (rows: Array<any>, key: string) => rows.reduce((sum, row) => sum + Number(row?.[key] || 0), 0)
    const { selectedLocationIds, selectedDepartmentIds } = getSelectedFilterIds(locationFilters, departmentFilters)
    const { paidClosedExpenseItems, paidClosedExpenseRequests, paidClosedExpensePlans, paidClosedAdvancePayments } =
      buildCorePaidClosedData(rawData, selectedLocationIds, selectedDepartmentIds)

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
