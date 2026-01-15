import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'

/**
 * Interface for yearly employee count data
 */
export interface YearlyEmployeeData {
  year: number
  count: number
}

/**
 * Hook to fetch total employee count for each of the past 5 years
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing employees per year data array, loading state, error, and refetch function
 */
export const useEmployeesPerYear = (accessToken: string) => {
  const [data, setData] = useState<YearlyEmployeeData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Dataset client (EMPLOYEE service)
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  // Fetch yearly employee counts for the last 5 years via dataset timeseries ("employeesPerYear")
  const fetchEmployeesPerYear = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useEmployeesPerYear] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      const years = 5
      const result = await datasetClient.executeQuery('employeesPerYear', QueryType.TIMESERIES, { years })
      const rows = (result?.data ?? []) as Array<{
        category?: string
        date_category?: string
        dateCategory?: string
        value?: number
        [key: string]: any
      }>

      const series: YearlyEmployeeData[] = rows
        .map(r => ({
          year: (() => {
            const dateStr = r.date_category ?? r.dateCategory
            return dateStr ? dayjs(dateStr).year() : NaN
          })(),
          count: Number(r.value ?? 0)
        }))
        .filter(d => Number.isFinite(d.year))
        .sort((a, b) => a.year - b.year)

      if (isMounted.current) {
        setData(series)
        setLoading(false)
      }
    } catch (err) {
      console.error('[useEmployeesPerYear] Error fetching employee counts:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient])

  useEffect(() => {
    isMounted.current = true
    fetchEmployeesPerYear()

    return () => {
      isMounted.current = false
    }
  }, [fetchEmployeesPerYear])

  // Function to manually refetch the data
  const refetch = useCallback(() => {
    fetchEmployeesPerYear()
  }, [fetchEmployeesPerYear])

  return {
    data,
    loading,
    error,
    refetch
  }
}
