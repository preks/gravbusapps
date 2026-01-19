import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { employeeCountQuery } from '../queries/getEmployeeCount'
import { formatDate } from '@/common/utils/windowUtils'

/**
 * GraphQL response type for employee count query
 */
interface EmployeeCountResponse {
  thisYear: {
    aggregate: {
      count: number
    }
  }
  lastYear: {
    aggregate: {
      count: number
    }
  }
}

// Module-level in-flight cache to dedupe concurrent/duplicate requests (per token and date range)
const employeeCountRequestCache = new Map<string, Promise<EmployeeCountResponse>>()

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

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Fetch employee count from GraphQL API
   */
  const fetchEmployeeCount = useCallback(async () => {
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

      // Use end-of-today for current year to keep a stable key across calls in the same day,
      // and Dec 31 (23:59:59.999) for last year
      const now = new Date()
      const thisYearEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)

      const thisYearEndIso = formatDate(thisYearEnd, 'fullDateTime.ISO') as string
      const lastYearEndIso = formatDate(lastYearEnd, 'fullDateTime.ISO') as string
      const cacheKey = `${accessToken}|${thisYearEndIso}|${lastYearEndIso}`

      let promise = employeeCountRequestCache.get(cacheKey)
      if (!promise) {
        promise = graphQLClient.request<EmployeeCountResponse>(employeeCountQuery, {
          thisYearEnd: thisYearEndIso,
          lastYearEnd: lastYearEndIso
        })
        employeeCountRequestCache.set(cacheKey, promise)
      }

      const combinedResponse = await promise

      const thisYearCount = Number(combinedResponse?.thisYear?.aggregate?.count ?? 0)
      const prevYearCount = Number(combinedResponse?.lastYear?.aggregate?.count ?? 0)

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
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, graphQLClient])

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
