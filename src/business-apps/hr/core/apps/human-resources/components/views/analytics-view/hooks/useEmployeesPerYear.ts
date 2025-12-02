import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getEmployeesPerYearBatchQuery } from '../queries/getEmployeesPerYear'
import dayjs from 'dayjs'

/**
 * Interface for yearly employee count data
 */
export interface YearlyEmployeeData {
  year: number
  count: number
}

/**
 * GraphQL response type for employees per year query
 */
interface EmployeesPerYearBatchResponse {
  y0: { aggregate: { count: number } }
  y1: { aggregate: { count: number } }
  y2: { aggregate: { count: number } }
  y3: { aggregate: { count: number } }
  y4: { aggregate: { count: number } }
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

  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken)

  // Fetch end-of-year active headcount for the last 5 years in a single batched query
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

      const currentYear = dayjs().year()
      // Build 5 year-end cutoffs: y0=current year end, y1=prev, ... y4
      const y0 = dayjs(`${currentYear}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const y1 = dayjs(`${currentYear - 1}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const y2 = dayjs(`${currentYear - 2}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const y3 = dayjs(`${currentYear - 3}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')
      const y4 = dayjs(`${currentYear - 4}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss')

      const response = await graphQLClient.request<EmployeesPerYearBatchResponse>(getEmployeesPerYearBatchQuery, {
        y0,
        y1,
        y2,
        y3,
        y4
      })

      const series: YearlyEmployeeData[] = [
        { year: currentYear - 4, count: Number(response.y4?.aggregate?.count ?? 0) },
        { year: currentYear - 3, count: Number(response.y3?.aggregate?.count ?? 0) },
        { year: currentYear - 2, count: Number(response.y2?.aggregate?.count ?? 0) },
        { year: currentYear - 1, count: Number(response.y1?.aggregate?.count ?? 0) },
        { year: currentYear, count: Number(response.y0?.aggregate?.count ?? 0) }
      ]

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
  }, [accessToken, graphQLClient])

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
