import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getMedianSalaryData } from '../queries/getMedianSalaryData'

/**
 * GraphQL response type for median salary query
 */
interface MedianSalaryResponse {
  EmployeeWorkingCondition: Array<{
    id: string
    annualGrossSalary: number
  }>
  EmployeeWorkingConditionAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to calculate median annual gross salary from employee data
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing median salary, employee count, loading state, error, and refetch function
 */
export const useMedianSalary = (accessToken: string) => {
  const [medianSalary, setMedianSalary] = useState<number>(0)
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Calculate median value from an array of numbers
   */
  const calculateMedian = (values: number[]): number => {
    if (values.length === 0) return 0

    // Sort the values in ascending order
    const sorted = [...values].sort((a, b) => a - b)

    const mid = Math.floor(sorted.length / 2)

    // If even number of elements, return average of two middle values
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2
    }

    // If odd number of elements, return the middle value
    return sorted[mid]
  }

  /**
   * Fetch employee salary data and calculate median
   */
  const fetchMedianSalary = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useMedianSalary] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Execute the GraphQL query
      const response = await graphQLClient.request<MedianSalaryResponse>(getMedianSalaryData)

      // Validate response structure
      if (!response || !response.EmployeeWorkingCondition || !response.EmployeeWorkingConditionAggregate) {
        throw new Error('[useMedianSalary] Invalid response structure from GraphQL API')
      }

      const employeeData = response.EmployeeWorkingCondition
      const totalCount = response.EmployeeWorkingConditionAggregate.aggregate.count

      if (totalCount === 0) {
        console.warn('[useMedianSalary] No employee data found with the current query filters')
        if (isMounted.current) {
          // Return zeros instead of error when no data is found
          setMedianSalary(0)
          setEmployeeCount(0)
          setError(null)
          setLoading(false)
        }
        return
      }

      // Extract all salary values
      const salaryValues = employeeData.map(e => Number(e.annualGrossSalary))

      // Calculate median salary
      const median = calculateMedian(salaryValues)

      // Round to whole number (no decimals)
      const roundedMedian = Math.round(median)

      // Update state if component is still mounted
      if (isMounted.current) {
        setMedianSalary(roundedMedian)
        setEmployeeCount(totalCount)
        setError(null)
      }
    } catch (err) {
      console.error('[useMedianSalary] Error fetching salary data:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useMedianSalary] Failed to fetch salary data'))
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
    fetchMedianSalary()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchMedianSalary])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchMedianSalary()
  }, [fetchMedianSalary])

  return {
    medianSalary,
    employeeCount,
    loading,
    error,
    refetch
  }
}
