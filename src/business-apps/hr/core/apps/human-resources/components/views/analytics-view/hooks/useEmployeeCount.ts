import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'

/**
 * GraphQL response type for employee count query
 */
type TimeseriesRow = {
  category?: string
  date_category?: string
  dateCategory?: string
  value?: number
  [key: string]: any
}

// Module-level in-flight cache to dedupe concurrent/duplicate requests (per token and date range)
const employeeCountRequestCache = new Map<string, Promise<TimeseriesRow[]>>()

/**
 * Hook to fetch employee count from the GraphQL API
 * @param accessToken - Access token for API authentication
 * @returns Object containing count, loading state, error, and refetch function
 */
export const useEmployeeCount = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [count, setCount] = useState<number>(0) // this year count (backward compatible)
  const [lastYearCount, setLastYearCount] = useState<number>(0)
  const [diffYoY, setDiffYoY] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Dataset client (EMPLOYEE service)
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  /**
   * Fetch employee counts using dataset timeseries 'employeesPerYear' and derive
   * current year and last year counts from the response.
   */
  const fetchEmployeeCount = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('No access token provided'))
        setLoading(false)
      }
      return
    }

    const cacheKey = `${accessToken}|employeesPerYear|5`

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      let promise = employeeCountRequestCache.get(cacheKey)
      if (!promise) {
        promise = (async () => {
          const result = await datasetClient.executeQuery('employeesPerYear', QueryType.TIMESERIES, { years: 5 })
          return (result?.data ?? []) as TimeseriesRow[]
        })()
        employeeCountRequestCache.set(cacheKey, promise)
      }

      const rows = await promise

      // Build year -> value map
      const byYear = new Map<number, number>()
      rows.forEach(r => {
        const dateStr = r.date_category ?? r.dateCategory
        if (dateStr != null) {
          const y = dayjs(dateStr).year()
          const v = Number(r.value ?? 0)
          if (Number.isFinite(y) && Number.isFinite(v)) {
            byYear.set(y, v)
          }
        }
      })

      const currentYear = dayjs().year()
      const thisYearCount = Number(byYear.get(currentYear) ?? 0)
      const prevYearCount = Number(byYear.get(currentYear - 1) ?? 0)

      if (isNaN(thisYearCount) || isNaN(prevYearCount)) {
        throw new Error('Employee count is not a valid number')
      }

      if (isMounted.current) {
        setCount(thisYearCount)
        setLastYearCount(prevYearCount)
        setDiffYoY(thisYearCount - prevYearCount)
        setError(null)
      }
    } catch (err) {
      console.error('[useEmployeeCount] Error fetching employee count:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch employee count'))
      }
    } finally {
      // Clear in-flight cache entry so future mounts/refetches get fresh data
      employeeCountRequestCache.delete(cacheKey)
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient])

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true

    // Fetch data
    fetchEmployeeCount()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchEmployeeCount])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchEmployeeCount()
  }, [fetchEmployeeCount])

  return {
    count,
    lastYearCount,
    diffYoY,
    loading,
    error,
    refetch
  }
}
