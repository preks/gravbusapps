import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

/**
 * Interface for year and hire count data
 */
export interface YearlyHireData {
  year: number
  count: number
}

type TimeseriesRow = { category?: string; date_category?: string; dateCategory?: string; value?: number }

/**
 * Hook to fetch the number of hires per year for the last 5 years
 * Uses EmployeeWorkingCondition.hireDate to identify hires per year
 */
export const useHiresPerYear = (accessToken: string) => {
  const [hiresData, setHiresData] = useState<YearlyHireData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  const fetchHiresPerYear = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useHiresPerYear] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Use dataset timeseries 'hiresPerYear' for last 5 years
      const startDate = dayjs().startOf('year').subtract(4, 'year').format('YYYY-MM-DD')
      const endDate = dayjs().endOf('year').format('YYYY-MM-DD')
      const resp = await datasetClient.executeQuery('hiresPerYear', QueryType.TIMESERIES, { startDate, endDate })

      const raw = resp?.data ?? []
      const rows: TimeseriesRow[] = Array.isArray(raw) ? (raw as TimeseriesRow[]) : []
      const series: YearlyHireData[] = rows
        .map(r => {
          const d = r.dateCategory ?? r.date_category
          const year = d ? dayjs(d).year() : Number.NaN
          return { year, count: Number(r.value ?? 0) }
        })
        .filter(p => Number.isFinite(p.year))
        .sort((a, b) => a.year - b.year)

      if (isMounted.current) {
        setHiresData(series)
        setError(null)
      }
    } catch (err) {
      console.error('[useHiresPerYear] Error fetching hires per year:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useHiresPerYear] Failed to fetch hires per year'))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient])

  useEffect(() => {
    isMounted.current = true
    fetchHiresPerYear()
    return () => {
      isMounted.current = false
    }
  }, [fetchHiresPerYear])

  const refetch = useCallback(() => {
    fetchHiresPerYear()
  }, [fetchHiresPerYear])

  return { hiresData, loading, error, refetch }
}
