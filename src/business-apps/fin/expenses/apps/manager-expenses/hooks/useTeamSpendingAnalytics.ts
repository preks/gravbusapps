// Refactored Team Spending Analytics Hook (< 300 lines)

import { useEffect, useMemo, useRef } from 'react'

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Import modularized code
import type { ProcessedAnalyticsData } from './teamSpendingAnalytics/types'
import { fetchAnalyticsData } from './teamSpendingAnalytics/dataFetch'
import { extractAvailableCurrencies } from './teamSpendingAnalytics/utils'
import {
  computeDateRangeBounds,
  buildLocationFilters,
  buildDepartmentFilters,
  toggleFilterById,
  filterBySearch,
  getSelectedFilterIds,
  buildCoreProcessedAnalyticsData,
  useAnalyticsBaseState
} from './teamSpendingAnalytics/shared'

export { DateRangeOption } from './teamSpendingAnalytics/types'
export type { LocationFilter, DepartmentFilter } from './teamSpendingAnalytics/types'

export const useTeamSpendingAnalytics = (accessToken: string, managerId: string, currencyFilter?: string | null) => {
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

  // Compute date range primitives to keep effect deps stable
  const { startDate: computedStartDate, endDate: computedEndDate } = useMemo(
    () => computeDateRangeBounds(dateRange),
    [dateRange]
  )

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
    setLocationFilters(buildLocationFilters(rawData))
    setDepartmentFilters(buildDepartmentFilters(rawData))
  }, [rawData])

  // Filter toggles
  const toggleLocationFilter = (locationId: string) => {
    setLocationFilters(prevFilters => toggleFilterById(prevFilters, locationId))
  }

  const toggleDepartmentFilter = (departmentId: string) => {
    setDepartmentFilters(prevFilters => toggleFilterById(prevFilters, departmentId))
  }

  const handleSearchTermChange = (term: string) => setSearchTerm(term)
  const handleDepartmentSearchTermChange = (term: string) => setDepartmentSearchTerm(term)

  // Filter by search term
  const filteredLocationFilters = useMemo(() => {
    return filterBySearch(locationFilters, searchTerm)
  }, [locationFilters, searchTerm])

  const filteredDepartmentFilters = useMemo(() => {
    return filterBySearch(departmentFilters, departmentSearchTerm)
  }, [departmentFilters, departmentSearchTerm])

  // Extract available currencies
  const availableCurrencies = useMemo(() => extractAvailableCurrencies(rawData), [rawData])

  // Apply filters and process data
  const processedData: ProcessedAnalyticsData | null = useMemo(() => {
    if (!rawData) return null

    const { selectedLocationIds, selectedDepartmentIds } = getSelectedFilterIds(locationFilters, departmentFilters)
    const { processedData: coreProcessedData } = buildCoreProcessedAnalyticsData(
      rawData,
      selectedLocationIds,
      selectedDepartmentIds
    )
    return coreProcessedData
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
