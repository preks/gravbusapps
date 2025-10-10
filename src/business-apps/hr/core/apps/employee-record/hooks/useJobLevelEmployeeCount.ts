import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// GraphQL query to fetch the number of employees with the same job level name
const GET_JOB_LEVEL_EMPLOYEE_COUNT = /*sql*/ `
  query GetJobLevelEmployeeCount($jobLevelName: String!) {
    EmployeePositionAggregate(where: {jobPosition: {jobLevel: {name: {_eq: $jobLevelName}}}}) {
      aggregate {
        count
      }
    }
  }
`

// Response type for the employee count query
interface JobLevelEmployeeCountResponse {
  EmployeePositionAggregate: {
    aggregate: {
      count: number
    }
  }
}

interface UseJobLevelEmployeeCountResult {
  employeeCount: number | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch the count of employees with the same job level name
 * @param accessToken The access token for authentication
 * @param jobLevelName The name of the job level to count employees for
 * @returns Object containing the count, loading state, error state, and refetch function
 */
export const useJobLevelEmployeeCount = (accessToken: string, jobLevelName: string): UseJobLevelEmployeeCountResult => {
  const [employeeCount, setEmployeeCount] = useState<number | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  // Function to fetch the employee count
  const fetchEmployeeCount = async () => {
    if (!jobLevelName) {
      setEmployeeCount(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Execute the GraphQL query
      const response = await graphqlClient.request<JobLevelEmployeeCountResponse>(GET_JOB_LEVEL_EMPLOYEE_COUNT, {
        jobLevelName
      })

      // Extract the employee count from the response
      const count = response.EmployeePositionAggregate?.aggregate?.count ?? 0
      setEmployeeCount(count)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job level employee count'))
      console.error('Error fetching job level employee count:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch employee count when dependencies change
  useEffect(() => {
    if (jobLevelName) {
      fetchEmployeeCount()
    } else {
      setEmployeeCount(null)
      setLoading(false)
      setError(null)
    }
  }, [accessToken, jobLevelName])

  return {
    employeeCount,
    loading,
    error,
    refetch: fetchEmployeeCount
  }
}
