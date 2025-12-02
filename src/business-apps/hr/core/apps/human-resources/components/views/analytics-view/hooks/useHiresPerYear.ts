import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getHiresPerYearBatchQuery } from '../queries/getHiresPerYear'
import dayjs from 'dayjs'

/**
 * Interface for year and hire count data
 */
export interface YearlyHireData {
  year: number
  count: number
}

interface HiresBatchResponse {
  y0: { aggregate: { count: number } }
  y1: { aggregate: { count: number } }
  y2: { aggregate: { count: number } }
  y3: { aggregate: { count: number } }
  y4: { aggregate: { count: number } }
}

/**
 * Hook to fetch the number of hires per year for the last 5 years
 * Uses EmployeeWorkingCondition.hireDate to identify hires per year
 */
export const useHiresPerYear = (accessToken: string) => {
  const [hiresData, setHiresData] = useState<YearlyHireData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const graphQLClient = useGraphqlClient(accessToken)

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

      const currentYear = dayjs().year()
      const s0 = dayjs(`${currentYear}-01-01 00:00:00`).format('YYYY-MM-DD HH:mm:ss')
      const e0 = dayjs(`${currentYear}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const s1 = dayjs(`${currentYear - 1}-01-01 00:00:00`).format('YYYY-MM-DD HH:mm:ss')
      const e1 = dayjs(`${currentYear - 1}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const s2 = dayjs(`${currentYear - 2}-01-01 00:00:00`).format('YYYY-MM-DD HH:mm:ss')
      const e2 = dayjs(`${currentYear - 2}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const s3 = dayjs(`${currentYear - 3}-01-01 00:00:00`).format('YYYY-MM-DD HH:mm:ss')
      const e3 = dayjs(`${currentYear - 3}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const s4 = dayjs(`${currentYear - 4}-01-01 00:00:00`).format('YYYY-MM-DD HH:mm:ss')
      const e4 = dayjs(`${currentYear - 4}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')

      const resp = await graphQLClient.request<HiresBatchResponse>(getHiresPerYearBatchQuery, {
        s0,
        e0,
        s1,
        e1,
        s2,
        e2,
        s3,
        e3,
        s4,
        e4
      })

      const series: YearlyHireData[] = [
        { year: currentYear - 4, count: Number(resp.y4?.aggregate?.count ?? 0) },
        { year: currentYear - 3, count: Number(resp.y3?.aggregate?.count ?? 0) },
        { year: currentYear - 2, count: Number(resp.y2?.aggregate?.count ?? 0) },
        { year: currentYear - 1, count: Number(resp.y1?.aggregate?.count ?? 0) },
        { year: currentYear, count: Number(resp.y0?.aggregate?.count ?? 0) }
      ]

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
  }, [accessToken, graphQLClient])

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
