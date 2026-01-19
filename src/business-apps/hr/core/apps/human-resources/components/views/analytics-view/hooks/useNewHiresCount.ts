import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getNewHiresCountQuery } from '../queries/getNewHiresCount'
import dayjs from 'dayjs'
import { formatDate } from '@/common/utils/windowUtils'

/**
 * GraphQL response type for new hires count query using the EmployeeWorkingCondition.hireDate field
 * with distinct employee count
 */
interface NewHiresCountResponse {
  EmployeeWorkingConditionAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch new hires count from the GraphQL API for the current month
 * Uses the EmployeeWorkingCondition.hireDate field to accurately identify new employees
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing count, loading state, error, and refetch function
 */
export const useNewHiresCount = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Get the start and end dates for the current month using standardized ISO formatting.
   * Uses a half-open interval: [monthStart, nextMonthStart)
   */
  const getMonthDateRange = useCallback(() => {
    const now = dayjs()
    const startOfMonth = formatDate(now.startOf('month').toDate(), 'fullDateTime.ISO') as string
    const startOfNextMonth = formatDate(now.add(1, 'month').startOf('month').toDate(), 'fullDateTime.ISO') as string

    // Log the date range for debugging
    console.log(`[useNewHiresCount] Date range for hireDate filter: ${startOfMonth} to ${startOfNextMonth}`)

    return {
      startDate: startOfMonth,
      endDate: startOfNextMonth
    }
  }, [])

  /**
   * Fetch new hires count from GraphQL API
   */
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

      // Get date range for current month
      const { startDate, endDate } = getMonthDateRange()
      const startDateISO = startDate
      const endDateISO = endDate

      console.log('[useNewHiresCount] Date range:', startDateISO, 'to', endDateISO)
      console.log('[useNewHiresCount] Fetching new hires using hireDate between', startDateISO, 'and', endDateISO)

      // Execute the GraphQL query with variables
      const response = await graphQLClient.request<NewHiresCountResponse>(getNewHiresCountQuery, { startDate, endDate })

      // Log the response for debugging
      console.log('[useNewHiresCount] GraphQL response:', response)

      // Validate response structure
      if (
        !response ||
        !response.EmployeeWorkingConditionAggregate ||
        !response.EmployeeWorkingConditionAggregate.aggregate
      ) {
        throw new Error('Invalid response structure from GraphQL API')
      }

      // Extract and validate count
      const hiresCount = Number(response.EmployeeWorkingConditionAggregate.aggregate.count)
      if (isNaN(hiresCount)) {
        throw new Error('New hires count is not a valid number')
      }

      // Update state if component is still mounted
      if (isMounted.current) {
        setCount(hiresCount)
        setError(null)
      }
    } catch (err) {
      console.error('[useNewHiresCount] Error fetching new hires count:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch new hires count'))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, graphQLClient, getMonthDateRange])

  // Set up effect to fetch data and handle cleanup
  useEffect(() => {
    isMounted.current = true

    // Fetch data
    fetchNewHiresCount()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchNewHiresCount])

  // Function to manually refresh the data
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
