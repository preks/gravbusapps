import { useState, useEffect, useCallback, useRef } from 'react'
import dayjs from 'dayjs'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

type TimeseriesRow = {
  category?: string
  date_category?: string
  dateCategory?: string
  value?: number
  [key: string]: any
}

/**
 * Hook to fetch new hires count using the Dataset timeseries 'hiresPerYear'
 * We derive the current year's hires (YTD if endDate is today).
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing count, loading state, error, and refetch function
 */
export const useNewHiresCount = (accessToken: string) => {
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  const fetchNewHiresCount = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Build a range from start of current year to today (YTD)
      const currentYear = dayjs().year()
      const startDate = dayjs().startOf('year').format('YYYY-MM-DD')
      const endDate = dayjs().format('YYYY-MM-DD')

      const response = await datasetClient.executeQuery('hiresPerYear', QueryType.TIMESERIES, {
        startDate,
        endDate
      })

      const rows = (response?.data ?? []) as TimeseriesRow[]
      const byYear = new Map<number, number>()
      rows.forEach(r => {
        const dateStr = r.dateCategory ?? r.date_category
        if (dateStr) {
          const y = dayjs(dateStr).year()
          const v = Number(r.value ?? 0)
          if (Number.isFinite(y) && Number.isFinite(v)) {
            byYear.set(y, v)
          }
        }
      })

      const thisYearCount = Number(byYear.get(currentYear) ?? 0)
      if (isMounted.current) {
        setCount(thisYearCount)
      }
    } catch (err) {
      console.error('[useNewHiresCount] Error fetching hires per year (dataset):', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch new hires count'))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient])

  useEffect(() => {
    isMounted.current = true
    fetchNewHiresCount()
    return () => {
      isMounted.current = false
    }
  }, [fetchNewHiresCount])

  const refetch = useCallback(() => {
    fetchNewHiresCount()
  }, [fetchNewHiresCount])

  return {
    count,
    loading,
    error,
    refetch
  }
}
