import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// GraphQL query to fetch the number of employees with the same job function name
const GET_JOB_FUNCTION_NAME_COUNT = /*sql*/ `
  query GetJobFunctionNameCount($jobFunctionName: String!) {
    EmployeePositionAggregate(where: {jobPosition: {jobFunction: {name: {_eq: $jobFunctionName}}}}) {
      aggregate {
        count
      }
    }
  }
`

interface Employee {
  id: string
  displayName: string
}

interface EmployeePosition {
  employee: Employee
}

// Response type for the employee count query
interface JobFunctionNameCountResponse {
  EmployeePositionAggregate: {
    aggregate: {
      count: number
    }
  }
  EmployeePosition: EmployeePosition[]
}

interface UseJobFunctionNameCountResult {
  employeeCount: number | null
  employees: Employee[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Custom hook to fetch the number of employees with the same job function name
 * @param accessToken User access token
 * @param jobFunctionName The name of the job function to count employees for
 * @returns The number of employees with the job function, loading state, and error state
 */
export const useJobFunctionNameCount = (
  accessToken: string,
  jobFunctionName: string
): UseJobFunctionNameCountResult => {
  const [employeeCount, setEmployeeCount] = useState<number | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get GraphQL client
  const client = useGraphqlClient(accessToken)

  // Function to fetch employee count
  const fetchEmployeeCount = useCallback(async () => {
    if (!accessToken || !jobFunctionName) {
      setEmployeeCount(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Execute the GraphQL query
      const variables = {
        jobFunctionName
      }

      const response = await client.request<JobFunctionNameCountResponse>(GET_JOB_FUNCTION_NAME_COUNT, variables)

      // Extract the employee count and employees from the response
      const count = response.EmployeePositionAggregate?.aggregate?.count ?? 0
      const employeeList = response.EmployeePosition?.map(position => position.employee) || []

      setEmployeeCount(count)
      setEmployees(employeeList)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch job function employee count'))
      console.error('Error fetching job function employee count:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, jobFunctionName])

  // Fetch employee count on component mount or when dependencies change
  useEffect(() => {
    fetchEmployeeCount()
  }, [fetchEmployeeCount])

  return {
    employeeCount,
    employees,
    loading,
    error,
    refetch: fetchEmployeeCount
  }
}
