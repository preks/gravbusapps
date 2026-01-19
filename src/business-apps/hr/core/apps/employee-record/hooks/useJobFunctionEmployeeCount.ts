import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// GraphQL query to fetch the number of employees with the same job function
const GET_JOB_FUNCTION_EMPLOYEE_COUNT = /*sql*/ `
  query GetJobFunctionEmployeeCount($jobPositionId: uuid!) {
    employeePositionAggregate(where: {jobPositionId: {_eq: $jobPositionId}}) {
      aggregate {
        count
      }
    }
  }
`

// Response type for the employee count query
interface JobFunctionEmployeeCountResponse {
  employeePositionAggregate: {
    aggregate: {
      count: number
    }
  }
}

interface UseJobFunctionEmployeeCountResult {
  employeeCount: number | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch the number of employees with the same job function
 * @param accessToken User access token
 * @param jobPositionId The ID of the job position to count employees for
 * @returns The number of employees with the job function, loading state, and error state
 */
export const useJobFunctionEmployeeCount = (
  accessToken: string,
  jobPositionId: string
): UseJobFunctionEmployeeCountResult => {
  const [employeeCount, setEmployeeCount] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get GraphQL client
  const client = useGraphqlClient(accessToken)

  // Function to fetch employee count
  const fetchEmployeeCount = useCallback(async () => {
    if (!accessToken || !jobPositionId) {
      setEmployeeCount(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Execute the GraphQL query
      const variables = {
        jobPositionId
      }

      const response = await client.request<JobFunctionEmployeeCountResponse>(
        GET_JOB_FUNCTION_EMPLOYEE_COUNT,
        variables
      )

      // Extract the employee count from the response
      const count = response.employeePositionAggregate?.aggregate?.count ?? 0
      setEmployeeCount(count)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job function employee count'))
      console.error('Error fetching job function employee count:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, jobPositionId])

  // Fetch employee count on component mount or when dependencies change
  useEffect(() => {
    fetchEmployeeCount()
  }, [fetchEmployeeCount])

  return {
    employeeCount,
    loading,
    error,
    refetch: fetchEmployeeCount
  }
}
