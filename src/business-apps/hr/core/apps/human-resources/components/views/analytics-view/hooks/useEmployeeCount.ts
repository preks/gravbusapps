import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

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

function setMountedErrorAndStopLoading(
  isMounted: { current: boolean },
  setError: (value: (prev: Error | null) => Error) => void,
  setLoading: (value: boolean) => void,
  message: string
) {
  if (!isMounted.current) return
  setError(prev => (prev?.message === message ? prev : new Error(message)))
  setLoading(false)
}

function buildEmployeeCountCacheKey(accessToken: string, structureId: string | null, companyIdsParam: string): string {
  return `${accessToken}|employeesPerYear|5|${structureId ?? ''}|${companyIdsParam}`
}

async function getEmployeesPerYearRows(
  cacheKey: string,
  datasetClient: ReturnType<typeof useQueryExecutionClient>,
  params: Record<string, string | number | boolean>
): Promise<TimeseriesRow[]> {
  let promise = employeeCountRequestCache.get(cacheKey)
  if (!promise) {
    promise = (async () => {
      const result = await datasetClient.executeQuery('employeesPerYear', QueryType.TIMESERIES, params)
      return (result?.data ?? []) as TimeseriesRow[]
    })()
    employeeCountRequestCache.set(cacheKey, promise)
  }
  return await promise
}

function computeCountsFromRows(rows: TimeseriesRow[]) {
  const byYear = new Map<number, number>()
  rows.forEach(r => {
    const dateStr = r.date_category ?? r.dateCategory
    if (dateStr == null) return
    const y = dayjs(dateStr).year()
    const v = Number(r.value ?? 0)
    if (Number.isFinite(y) && Number.isFinite(v)) {
      byYear.set(y, v)
    }
  })

  const currentYear = dayjs().year()
  const thisYearCount = Number(byYear.get(currentYear) ?? 0)
  const prevYearCount = Number(byYear.get(currentYear - 1) ?? 0)

  if (Number.isNaN(thisYearCount) || Number.isNaN(prevYearCount)) {
    throw new Error('Employee count is not a valid number')
  }

  return { thisYearCount, prevYearCount }
}

/**
 * Hook to fetch employee count from the GraphQL API
 * @param accessToken - Access token for API authentication
 * @returns Object containing count, loading state, error, and refetch function
 */
export const useEmployeeCount = (accessToken: string) => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  // Define all hooks at the top level to ensure consistent order
  const [count, setCount] = useState<number>(0) // this year count (backward compatible)
  const [lastYearCount, setLastYearCount] = useState<number>(0)
  const [diffYoY, setDiffYoY] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)
  const lastFetchKeyRef = useRef<string>('')

  // Dataset client (EMPLOYEE service)
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const companyIdsParam = useMemo(
    () => (selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''),
    [selectedCompanyIds]
  )

  /**
   * Fetch employee counts using dataset timeseries 'employeesPerYear' and derive
   * current year and last year counts from the response.
   */
  const fetchEmployeeCount = useCallback(
    async (force = false) => {
      if (!accessToken) {
        setMountedErrorAndStopLoading(isMounted, setError, setLoading, 'No access token provided')
        return
      }

      if (!datasetClient) {
        setMountedErrorAndStopLoading(isMounted, setError, setLoading, 'Dataset client is not available')
        return
      }

      const structureId = getCurrentActiveStructureId()
      const cacheKey = buildEmployeeCountCacheKey(accessToken, structureId, companyIdsParam)
      if (!force && lastFetchKeyRef.current === cacheKey) {
        return
      }
      lastFetchKeyRef.current = cacheKey

      try {
        if (isMounted.current) {
          setLoading(true)
          setError(null)
        }

        const params: Record<string, string | number | boolean> = { years: 5 }
        if (structureId) params.structureId = structureId
        if (companyIdsParam) params.companyIds = companyIdsParam

        const rows = await getEmployeesPerYearRows(cacheKey, datasetClient, params)
        const { thisYearCount, prevYearCount } = computeCountsFromRows(rows)

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
    },
    [accessToken, companyIdsParam, datasetClient]
  )

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
    fetchEmployeeCount(true)
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
