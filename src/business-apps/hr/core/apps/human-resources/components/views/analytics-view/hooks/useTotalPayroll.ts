import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getTotalPayrollQuery } from '../queries/getTotalPayroll'

/**
 * GraphQL response type for total payroll query
 */
interface TotalPayrollResponse {
  EmployeeWorkingConditionAggregate: {
    aggregate: {
      sum: {
        annualGrossSalary: number
      }
      count: number
    }
  }
}

/**
 * Hook to fetch the total annual gross salary from the GraphQL API
 * Uses the EmployeeWorkingCondition.annualGrossSalary field to calculate the total payroll
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing total payroll, employee count, loading state, error, and refetch function
 */
export const useTotalPayroll = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [totalPayroll, setTotalPayroll] = useState<number>(0)
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTotalPayroll = useCallback(async () => {
    if (!graphQLClient) {
      if (isMounted.current) {
        setError(new Error('[useTotalPayroll] GraphQL client not available'))
        setLoading(false)
      }
      return
    }

    try {
      // Set loading state
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Execute the GraphQL query with variables
      const response = await graphQLClient.request<TotalPayrollResponse>(getTotalPayrollQuery)

      // Validate response structure
      if (
        !response ||
        !response.EmployeeWorkingConditionAggregate ||
        !response.EmployeeWorkingConditionAggregate.aggregate
      ) {
        throw new Error('[useTotalPayroll] Invalid response structure from GraphQL API')
      }

      // Handle case when aggregate data exists but there are no employees with salary
      if (!response.EmployeeWorkingConditionAggregate.aggregate.sum) {
        console.warn('[useTotalPayroll] No salary data found')
        if (isMounted.current) {
          setTotalPayroll(0)
          setEmployeeCount(0)
          setError(null)
          setLoading(false)
        }
        return
      }

      // Extract and validate total payroll
      const payroll = Number(response.EmployeeWorkingConditionAggregate.aggregate.sum.annualGrossSalary)
      const count = response.EmployeeWorkingConditionAggregate.aggregate.count

      if (isNaN(payroll)) {
        throw new Error('[useTotalPayroll] Invalid payroll value received')
      }

      // Update state if component is still mounted
      if (isMounted.current) {
        setTotalPayroll(payroll)
        setEmployeeCount(count)
        setError(null)
      }
    } catch (err) {
      console.error('[useTotalPayroll] Error fetching payroll data:', err)
      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error(String(err)))
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
    fetchTotalPayroll()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchTotalPayroll])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchTotalPayroll()
  }, [fetchTotalPayroll])

  return {
    totalPayroll,
    employeeCount,
    loading,
    error,
    refetch
  }
}
