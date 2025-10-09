import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getAverageSalaryQuery } from '../queries/getAverageSalary'

/**
 * GraphQL response type for average salary query
 */
interface AverageSalaryResponse {
  EmployeeWorkingConditionAggregate: {
    aggregate: {
      avg: {
        annualGrossSalary: number
      }
      count: number
    }
  }
}

/**
 * Hook to fetch the average annual gross salary from the GraphQL API
 * Uses the EmployeeWorkingCondition.annualGrossSalary field to calculate the average
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing average salary, employee count, loading state, error, and refetch function
 */
export const useAverageSalary = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [averageSalary, setAverageSalary] = useState<number>(0)
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Fetch average salary data from GraphQL API
   */
  const fetchAverageSalary = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useAverageSalary] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      console.log('[useAverageSalary] Fetching average annual gross salary data')

      // Execute the GraphQL query
      const response = await graphQLClient.request<AverageSalaryResponse>(getAverageSalaryQuery)

      // Log the response for debugging
      console.log('[useAverageSalary] GraphQL response:', response)

      // Validate response structure
      if (
        !response ||
        !response.EmployeeWorkingConditionAggregate ||
        !response.EmployeeWorkingConditionAggregate.aggregate ||
        !response.EmployeeWorkingConditionAggregate.aggregate.avg
      ) {
        throw new Error('[useAverageSalary] Invalid response structure from GraphQL API')
      }

      // Extract and validate average salary
      const avgSalary = Number(response.EmployeeWorkingConditionAggregate.aggregate.avg.annualGrossSalary)
      if (isNaN(avgSalary)) {
        throw new Error('[useAverageSalary] Average salary is not a valid number')
      }

      // Get count of employees with salary data
      const count = Number(response.EmployeeWorkingConditionAggregate.aggregate.count)

      // Round to whole number (no decimals)
      const roundedSalary = Math.round(avgSalary)

      // Update state if component is still mounted
      if (isMounted.current) {
        setAverageSalary(roundedSalary)
        setEmployeeCount(count)
        setError(null)
      }

      console.log(`[useAverageSalary] Calculated average annual gross salary: ${roundedSalary} for ${count} employees`)
    } catch (err) {
      console.error('[useAverageSalary] Error fetching average salary data:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useAverageSalary] Failed to fetch average salary data'))
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
    fetchAverageSalary()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchAverageSalary])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchAverageSalary()
  }, [fetchAverageSalary])

  return {
    averageSalary,
    employeeCount,
    loading,
    error,
    refetch
  }
}
