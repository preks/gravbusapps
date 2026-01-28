import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import dayjs from 'dayjs'

/**
 * GraphQL response type for average salary query
 */
type DatasetRow = { category?: string; value?: number; employee_count?: number; [key: string]: any }

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

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

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

      // Use dataset query 'averageSalaryEmployee' with asOf = today
      const asOf = dayjs().format('YYYY-MM-DD')
      const ds = await datasetClient.executeQuery('averageSalaryEmployee', QueryType.DATASET, { asOf })
      const row: DatasetRow | undefined = Array.isArray(ds?.data) ? ds.data[0] : undefined
      const avgSalary = Number(row?.value ?? 0)
      const count = Number(row?.employee_count ?? 0)

      // Round to whole number (no decimals)
      const roundedSalary = Math.round(avgSalary)

      // Update state if component is still mounted
      if (isMounted.current) {
        setAverageSalary(roundedSalary)
        setEmployeeCount(count)
        setError(null)
      }
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
  }, [accessToken, datasetClient])

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
