import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getHiresPerYearBatchQuery } from '../queries/getHiresPerYear'
import dayjs from 'dayjs'
import { formatDate } from '@/common/utils/windowUtils'

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
      const s0 = formatDate(new Date(currentYear, 0, 1, 0, 0, 0, 0), 'fullDateTime.ISO') as string
      const e0 = formatDate(new Date(), 'fullDateTime.ISO') as string
      const s1 = formatDate(new Date(currentYear - 1, 0, 1, 0, 0, 0, 0), 'fullDateTime.ISO') as string
      const e1 = formatDate(new Date(currentYear - 1, 11, 31, 23, 59, 59, 999), 'fullDateTime.ISO') as string
      const s2 = formatDate(new Date(currentYear - 2, 0, 1, 0, 0, 0, 0), 'fullDateTime.ISO') as string
      const e2 = formatDate(new Date(currentYear - 2, 11, 31, 23, 59, 59, 999), 'fullDateTime.ISO') as string
      const s3 = formatDate(new Date(currentYear - 3, 0, 1, 0, 0, 0, 0), 'fullDateTime.ISO') as string
      const e3 = formatDate(new Date(currentYear - 3, 11, 31, 23, 59, 59, 999), 'fullDateTime.ISO') as string
      const s4 = formatDate(new Date(currentYear - 4, 0, 1, 0, 0, 0, 0), 'fullDateTime.ISO') as string
      const e4 = formatDate(new Date(currentYear - 4, 11, 31, 23, 59, 59, 999), 'fullDateTime.ISO') as string

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
