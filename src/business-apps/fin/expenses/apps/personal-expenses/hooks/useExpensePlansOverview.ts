import dayjs from 'dayjs'
import { useCallback, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCatalogValue } from '@/common/utils/windowUtils'
import { GET_EXPENSE_PLANS_LIST, GET_EXPENSE_PLANS_STATISTICS } from '../queries/expensePlans'

export interface PlansOverviewResult {
  items: any[]
  totalCount: number
  statistics?: {
    currentMonthTotal: number
    previousMonthTotal: number
    totalEstimated: number
    pendingApproval: number
    topDestination: string
    currentMonthClosedPlans: number
    previousMonthClosedPlans: number
  } | null
}

export const useExpensePlansOverview = (context: BusinessAppContextProps) => {
  const [data, setData] = useState<PlansOverviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Start with statistics loading as true to show skeleton immediately on initial load
  const [isStatisticsLoading, setIsStatisticsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map())
  const lastListKeyRef = useRef<string>()
  const lastStatsKeyRef = useRef<string>()
  const currentRequestRef = useRef<string>() // Track current request to prevent stale updates
  const lastStatsCurrencyRef = useRef<string>() // Track last currency to detect currency changes
  const abortControllerRef = useRef<AbortController | null>(null) // For request cancellation
  const statsAbortControllerRef = useRef<AbortController | null>(null) // For statistics cancellation
  // Page cache: stores results by cache key (filters, page, pageSize, sortField, sortOrder, currencyRef)
  const pageCacheRef = useRef<Map<string, PlansOverviewResult>>(new Map())
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Helper to normalize objects for stable keys - memoized to prevent recreation
  const normalize = useCallback((val: any): any => {
    if (Array.isArray(val)) {
      return val.map(normalize)
    }
    if (val && typeof val === 'object') {
      const sorted: any = {}
      Object.keys(val)
        .sort()
        .forEach(k => {
          sorted[k] = normalize(val[k])
        })
      return sorted
    }
    return val
  }, [])

  // Memoize normalize for request ID generation
  const generateRequestId = useCallback(
    (
      filters: Record<string, any>,
      page: number,
      pageSize: number,
      sortField: string | null,
      sortOrder: 'ascend' | 'descend' | null,
      currencyRef: string
    ) => {
      return `${JSON.stringify(normalize({ filters, page, pageSize, sortField, sortOrder, currencyRef }))}`
    },
    [normalize]
  )

  // Generate cache key for a specific page (includes all parameters that affect the query)
  // Cache key includes filters, so different filters = different key = automatic cache miss
  // No need for explicit cache invalidation - cache key mismatch handles it naturally
  const generateCacheKey = useCallback(
    (
      filters: Record<string, any>,
      page: number,
      pageSize: number,
      sortField: string | null,
      sortOrder: 'ascend' | 'descend' | null,
      currencyRef: string
    ) => {
      return `cache:${JSON.stringify(normalize({ filters, page, pageSize, sortField, sortOrder, currencyRef }))}`
    },
    [normalize]
  )

  // Separate list fetch function - faster, no statistics
  const fetchList = useCallback(
    async (
      filters: Record<string, any>,
      page: number,
      pageSize: number,
      sortField: string | null,
      sortOrder: 'ascend' | 'descend' | null,
      options?: { force?: boolean }
    ) => {
      // options parameter kept for backward compatibility and future use
      void options
      const employeeId = context.userInfo?.employeeDetails?.employeeId
      const accessToken = context.accessToken
      if (!employeeId || !accessToken) return { items: [], totalCount: 0 }

      const offset = (page - 1) * pageSize
      const orderBy = (() => {
        if (sortField && sortOrder) {
          const direction = sortOrder === 'ascend' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST'
          return [{ [sortField]: direction }]
        }
        return [{ createdAt: 'DESC_NULLS_LAST' }]
      })()

      const variables = {
        employeeId,
        filters,
        limit: pageSize,
        offset,
        orderBy
      }

      const key = `list:${JSON.stringify(normalize(variables))}`

      // Check for in-flight request first - reuse existing request to avoid duplicates
      if (inflightRef.current.has(key)) {
        const result = await inflightRef.current.get(key)
        return {
          items: result?.plans ?? [],
          totalCount: result?.plansAggregate?.aggregate?.count ?? 0
        }
      }

      // Cancel previous request if it exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new AbortController for this request
      const controller = new AbortController()
      abortControllerRef.current = controller

      // Track the last key for reference (used for debugging/logging)
      lastListKeyRef.current = key

      try {
        const p = graphqlClient
          .request<any>(GET_EXPENSE_PLANS_LIST, variables, { signal: controller.signal })
          .finally(() => {
            inflightRef.current.delete(key)
          })
        inflightRef.current.set(key, p)
        const result = await p

        return {
          items: result?.plans ?? [],
          totalCount: result?.plansAggregate?.aggregate?.count ?? 0
        }
      } catch (err) {
        // Ignore AbortError - it means the request was cancelled intentionally
        if (err instanceof Error && err.name === 'AbortError') {
          return { items: [], totalCount: 0 }
        }
        console.error('Error fetching expense plans list:', err)
        return { items: [], totalCount: 0 }
      }
    },
    [context.accessToken, context.userInfo?.employeeDetails?.employeeId, graphqlClient, normalize]
  )

  // Helper to process statistics data
  const processStatisticsData = useCallback((data: any) => {
    // Extract catalog objects for travel regions
    const allRegionObjects = (data?.destinations ?? []).flatMap((plan: any) =>
      (plan.expenseRequestTrip || []).map((trip: any) => trip?.travelRegion).filter(Boolean)
    )

    const topDestination = (() => {
      if (allRegionObjects.length === 0) return 'N/A'

      // Count frequency using getCatalogValue for consistent translation handling
      const frequencyMap = allRegionObjects.reduce(
        (acc: Record<string, { count: number; catalog: any }>, catalog: any) => {
          const translatedValue = getCatalogValue(catalog)
          if (!acc[translatedValue]) {
            acc[translatedValue] = { count: 0, catalog }
          }
          acc[translatedValue].count += 1
          return acc
        },
        {}
      )

      // Find the most frequent value
      const frequencyEntries = Object.values(frequencyMap) as Array<{ count: number; catalog: any }>
      const mostFrequent = frequencyEntries.reduce((a, b) => (a.count > b.count ? a : b))

      // Return the catalog object for proper translation display
      return mostFrequent?.catalog || 'N/A'
    })()

    return {
      currentMonthTotal: data?.currentMonthTotal?.aggregate?.count ?? 0,
      previousMonthTotal: data?.previousMonthTotal?.aggregate?.count ?? 0,
      totalEstimated: data?.totalEstimated?.aggregate?.sum?.totalAmount ?? 0,
      pendingApproval: data?.pendingApproval?.aggregate?.count ?? 0,
      topDestination,
      currentMonthClosedPlans: data?.currentMonthClosedPlans?.aggregate?.count ?? 0,
      previousMonthClosedPlans: data?.previousMonthClosedPlans?.aggregate?.count ?? 0
    }
  }, [])

  // Separate statistics fetch function
  const fetchStatistics = useCallback(
    async (currencyRef: string, options?: { force?: boolean }) => {
      // options parameter kept for backward compatibility and future use
      void options

      const employeeId = context.userInfo?.employeeDetails?.employeeId
      const accessToken = context.accessToken
      if (!employeeId || !accessToken) return null

      const now = dayjs()
      const currentStart = now.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const currentEnd = now.endOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previous = now.subtract(1, 'month')
      const previousStart = previous.startOf('month').format('YYYY-MM-DD HH:mm:ss')
      const previousEnd = previous.endOf('month').format('YYYY-MM-DD HH:mm:ss')

      const variables = {
        employeeId,
        currentStart,
        currentEnd,
        previousStart,
        previousEnd,
        currencyRef
      }

      const key = `stats:${JSON.stringify(normalize(variables))}`

      // Check for in-flight request first - reuse existing request to avoid duplicates
      if (inflightRef.current.has(key)) {
        const result = await inflightRef.current.get(key)
        return processStatisticsData(result)
      }

      // Cancel previous statistics request if it exists
      if (statsAbortControllerRef.current) {
        statsAbortControllerRef.current.abort()
      }

      // Create new AbortController for this request
      const controller = new AbortController()
      statsAbortControllerRef.current = controller

      // Track the last key for reference (used for debugging/logging)
      lastStatsKeyRef.current = key

      try {
        const p = graphqlClient
          .request<any>(GET_EXPENSE_PLANS_STATISTICS, variables, { signal: controller.signal })
          .finally(() => {
            inflightRef.current.delete(key)
          })
        inflightRef.current.set(key, p)
        const result = await p
        return processStatisticsData(result)
      } catch (err) {
        // Ignore AbortError - it means the request was cancelled intentionally
        if (err instanceof Error && err.name === 'AbortError') {
          return null
        }
        console.error('Error fetching expense plans statistics:', err)
        return null
      }
    },
    [
      context.accessToken,
      context.userInfo?.employeeDetails?.employeeId,
      graphqlClient,
      normalize,
      processStatisticsData
    ]
  )

  // Updated fetchOverview - fetch list first for immediate display, then statistics
  const fetchOverview = useCallback(
    async (
      filters: Record<string, any>,
      page: number,
      pageSize: number,
      sortField: string | null,
      sortOrder: 'ascend' | 'descend' | null,
      currencyRef: string,
      options?: { force?: boolean }
    ) => {
      const employeeId = context.userInfo?.employeeDetails?.employeeId
      const accessToken = context.accessToken
      if (!employeeId || !accessToken) return

      // Generate cache key (includes all parameters: filters, page, pageSize, sortField, sortOrder, currencyRef)
      const cacheKey = generateCacheKey(filters, page, pageSize, sortField, sortOrder, currencyRef)

      // Check cache first - if page is cached and not forcing refresh, return immediately
      // Cache key includes filters, so different filters = different key = automatic cache miss
      const cachedData = pageCacheRef.current.get(cacheKey)
      if (cachedData && !options?.force) {
        // Return cached data immediately - no loading state
        setData(cachedData)
        setIsLoading(false)
        // Only set statistics loading to false if statistics are actually present in cache
        // Otherwise keep loading state true to show skeleton instead of 0 values
        setIsStatisticsLoading(!cachedData.statistics)
        setError(null)
        return
      }

      // Page not in cache or force refresh - fetch from server
      setIsLoading(true)
      // Always set statistics loading on initial fetch or when statistics don't exist
      // This ensures loading skeleton shows instead of 0 values
      // On initial load (data is null) or when statistics are missing, show loading skeleton
      if (!data?.statistics || options?.force) {
        setIsStatisticsLoading(true)
      }
      setError(null)

      try {
        // Create a unique request ID to track this specific fetch
        const requestId = generateRequestId(filters, page, pageSize, sortField, sortOrder, currencyRef)
        currentRequestRef.current = requestId

        // Fetch list first - show table immediately
        const listData = await fetchList(filters, page, pageSize, sortField, sortOrder, options)

        // Only update if this is still the current request (prevent stale updates)
        if (currentRequestRef.current === requestId) {
          // Check if currency changed - if so, clear statistics to show loading
          const currencyChanged = lastStatsCurrencyRef.current !== currencyRef
          lastStatsCurrencyRef.current = currencyRef

          // Set list data immediately so users see the table right away
          // Only clear statistics if currency changed (prevents flickering on pagination/sorting)
          setData(prevData => {
            const newStatistics = currencyChanged ? undefined : prevData?.statistics // Keep previous stats unless currency changed
            const newData = {
              items: listData.items,
              totalCount: listData.totalCount,
              statistics: newStatistics
            }
            pageCacheRef.current.set(cacheKey, newData)
            return newData
          })

          setIsLoading(false) // Stop loading once list is ready

          if (currencyChanged || !data?.statistics) {
            setIsStatisticsLoading(true)
          }

          // Fetch statistics separately - don't block the UI
          fetchStatistics(currencyRef, options)
            .then(statsData => {
              // Only update statistics if this is still the current request
              if (currentRequestRef.current === requestId && statsData) {
                setData(prevData => {
                  if (!prevData) return null
                  // If we don't have previous statistics, always update
                  if (!prevData.statistics) {
                    const updatedData = {
                      ...prevData,
                      statistics: statsData
                    }
                    // Update cache with statistics
                    pageCacheRef.current.set(cacheKey, updatedData)
                    return updatedData
                  }

                  // Use JSON.stringify for cleaner statistics change detection
                  // This handles nested objects (like topDestination) and all fields uniformly
                  const prevStatsString = JSON.stringify(prevData.statistics)
                  const newStatsString = JSON.stringify(statsData)
                  const statsChanged = prevStatsString !== newStatsString

                  if (!statsChanged) return prevData

                  const updatedData = {
                    ...prevData,
                    statistics: statsData
                  }
                  // Update cache with statistics
                  pageCacheRef.current.set(cacheKey, updatedData)
                  return updatedData
                })
                setIsStatisticsLoading(false) // Stop statistics loading once data is set
              }
            })
            .catch(err => {
              // Don't show error for statistics - just log it
              console.error('Error fetching statistics (non-blocking):', err)
              setIsStatisticsLoading(false) // Stop loading on error too
            })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setData(null)
        setIsLoading(false)
      }
    },
    [fetchList, fetchStatistics, generateRequestId, generateCacheKey]
  )

  // Manual cache invalidation (for manual refresh or mutations)
  const invalidateAllCache = useCallback(() => {
    pageCacheRef.current.clear()
  }, [])

  return {
    data,
    isLoading,
    isStatisticsLoading,
    error,
    fetchOverview,
    fetchStatistics,
    invalidateCache: invalidateAllCache // Expose for manual refresh
  }
}
