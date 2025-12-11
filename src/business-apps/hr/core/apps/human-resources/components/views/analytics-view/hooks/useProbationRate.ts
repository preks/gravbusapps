import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_PROBATION_RATE_DATA } from '../queries/getProbationRateData'

/**
 * Response type for Probation Rate data query
 */
interface ProbationRateDataResponse {
  EmployeePositionAggregate: {
    aggregate: {
      count: number
    }
  }
  EmployeeWorkingConditionAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch and calculate probation rate
 * @param accessToken - Access token for API authentication
 * @returns Object containing probationRate, employee counts, loading state, error, and refetch function
 */
export const useProbationRate = (accessToken: string) => {
  // Define all hooks at the top level to ensure consistent order
  const [probationRate, setProbationRate] = useState<number>(0)
  const [employeesInProbation, setEmployeesInProbation] = useState<number>(0)
  const [totalEmployees, setTotalEmployees] = useState<number>(1) // Default to 1 to avoid 0/0 display
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Get GraphQL client using the project's pattern
  const graphQLClient = useGraphqlClient(accessToken)

  /**
   * Fetch probation rate data from GraphQL API
   */
  const fetchProbationRate = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useProbationRate] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Log request
      console.log('[useProbationRate] Fetching probation rate data')

      // Execute the GraphQL query
      const response = await graphQLClient.request<ProbationRateDataResponse>(GET_PROBATION_RATE_DATA)

      // Extract counts from aliased aggregates
      const total = Number((response as any)?.totalActive?.aggregate?.count)
      if (isNaN(total)) {
        throw new Error('[useProbationRate] Total employee count is not a valid number')
      }

      const inProbation = Number((response as any)?.inProbationActive?.aggregate?.count)
      if (isNaN(inProbation)) {
        throw new Error('[useProbationRate] In-probation employee count is not a valid number')
      }

      // Calculate probation rate (percentage of employees currently in probation)
      const calculatedProbationRate = total > 0 ? (inProbation / total) * 100 : 0

      // Round to one decimal place
      const roundedProbationRate = Math.round(calculatedProbationRate * 10) / 10

      // Log the results
      console.info(
        `[useProbationRate] Total employees: ${total}, Employees in probation: ${inProbation}, Rate: ${roundedProbationRate}%`
      )

      // Update state if component is still mounted
      if (isMounted.current) {
        setTotalEmployees(total)
        setEmployeesInProbation(inProbation)
        setProbationRate(roundedProbationRate)
        setError(null)
      }
    } catch (err) {
      console.error('[useProbationRate] Error fetching probation rate:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useProbationRate] Failed to fetch probation rate'))
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
    fetchProbationRate()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchProbationRate])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchProbationRate()
  }, [fetchProbationRate])

  return {
    probationRate,
    employeesInProbation,
    totalEmployees,
    loading,
    error,
    refetch
  }
}
