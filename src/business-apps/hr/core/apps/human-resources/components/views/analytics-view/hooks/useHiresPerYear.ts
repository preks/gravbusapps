import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getHiresPerYearQuery } from '../queries/getHiresPerYear'
import dayjs from 'dayjs'

/**
 * Interface for year and hire count data
 */
export interface YearlyHireData {
  year: number
  count: number
}

/**
 * GraphQL response type for hire count query
 */
interface HireCountResponse {
  EmployeeWorkingConditionAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch the number of hires per year for the last 5 years
 * Uses EmployeeWorkingCondition.hireDate to identify hire dates
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing hires data, loading state, error, and refetch function
 */
export const useHiresPerYear = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [hiresData, setHiresData] = useState<YearlyHireData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Fetch hire data for a specific year
   */
  const fetchYearData = useCallback(
    async (year: number): Promise<YearlyHireData> => {
      // Create date range for the year
      const startDate = dayjs().year(year).startOf('year').format('YYYY-MM-DD HH:mm:ss')
      const endDate = dayjs().year(year).endOf('year').format('YYYY-MM-DD HH:mm:ss')

      console.log(`[useHiresPerYear] Fetching hires for year ${year}: ${startDate} to ${endDate}`)

      // Execute the GraphQL query with variables
      const response = await graphQLClient.request<HireCountResponse>(getHiresPerYearQuery, { startDate, endDate })

      // Validate response structure and extract count
      if (!response?.EmployeeWorkingConditionAggregate?.aggregate) {
        throw new Error(`[useHiresPerYear] Invalid response for year ${year}`)
      }

      const count = Number(response.EmployeeWorkingConditionAggregate.aggregate.count)

      return {
        year,
        count: isNaN(count) ? 0 : count
      }
    },
    [graphQLClient]
  )

  /**
   * Fetch hire data for the last 5 years
   */
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
      const years = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)

      console.log(`[useHiresPerYear] Fetching data for years:`, years)

      // Fetch data for each year in parallel
      const results = await Promise.all(years.map(year => fetchYearData(year)))

      if (isMounted.current) {
        setHiresData(results)
        setError(null)
      }

      console.log(`[useHiresPerYear] Fetched data:`, results)
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
  }, [accessToken, fetchYearData])

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true
    fetchHiresPerYear()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchHiresPerYear])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchHiresPerYear()
  }, [fetchHiresPerYear])

  return {
    hiresData,
    loading,
    error,
    refetch
  }
}
