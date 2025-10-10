import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { employeeCountQuery } from '../queries/getEmployeeCount'

/**
 * GraphQL response type for employee count query
 */
interface EmployeeCountResponse {
  EmployeePositionAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch employee count from the GraphQL API
 * @param accessToken - Access token for API authentication
 * @returns Object containing count, loading state, error, and refetch function
 */
export const useEmployeeCount = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [count, setCount] = useState<number>(0)
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

      // Execute the GraphQL query using the imported query with isDeleted filter
      const response = await graphQLClient.request<EmployeeCountResponse>(employeeCountQuery)
      console.log('[useEmployeeCount] GraphQL response:', response)

      // Validate response structure
      if (!response || !response.EmployeePositionAggregate || !response.EmployeePositionAggregate.aggregate) {
        throw new Error('Invalid response structure from GraphQL API')
      }

      // Extract and validate count
      const employeeCount = Number(response.EmployeePositionAggregate.aggregate.count)
      if (isNaN(employeeCount)) {
        throw new Error('Employee count is not a valid number')
      }

      // Update state if component is still mounted
      if (isMounted.current) {
        setCount(employeeCount)
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
    loading,
    error,
    refetch
  }
}
