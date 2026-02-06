import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

/**
 * Dataset response type for compensation metrics query
 */
type DatasetRow = { category?: string; value?: number; employee_count?: number; [key: string]: any }

/**
 * Hook to fetch compensation metrics (median salary, average salary, and average merit increase) from the dataset API
 * Uses the medianAvgSalaryAvgMeritEmployees query which returns all three values
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing median salary, average salary, average merit increase, employee count, loading state, error, and refetch function
 */
export const useCompensationMetrics = (accessToken: string) => {
  const [medianSalary, setMedianSalary] = useState<number>(0)
  const [averageSalary, setAverageSalary] = useState<number>(0)
  const [averageMeritIncrease, setAverageMeritIncrease] = useState<number>(0)
  const [employeeCount, setEmployeeCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const isMounted = useRef<boolean>(true)

  // Dataset client
  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  /**
   * Fetch compensation metrics data from dataset API
   */
  const fetchCompensationMetrics = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useCompensationMetrics] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Execute the dataset query
      const ds = await datasetClient.executeQuery('medianAvgSalaryAvgMeritEmployees', QueryType.DATASET, {})

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useCompensationMetrics] Invalid response structure from dataset API')
      }

      const rows: DatasetRow[] = ds.data

      // Find median, average, and merit increase rows
      const medianRow = rows.find(
        r =>
          String(r.category || '')
            .trim()
            .toLowerCase() === 'median salary'
      )
      const averageRow = rows.find(
        r =>
          String(r.category || '')
            .trim()
            .toLowerCase() === 'average salary'
      )
      const meritIncreaseRow = rows.find(
        r =>
          String(r.category || '')
            .trim()
            .toLowerCase() === 'average merit increase'
      )

      const median = medianRow ? Number(medianRow.value ?? 0) : 0
      const average = averageRow ? Number(averageRow.value ?? 0) : 0
      const meritIncrease = meritIncreaseRow ? Number(meritIncreaseRow.value ?? 0) : 0
      // Use employee_count from median or average row (they should be the same)
      const count = medianRow?.employee_count
        ? Number(medianRow.employee_count)
        : averageRow?.employee_count
          ? Number(averageRow.employee_count)
          : 0

      // Round to whole numbers (no decimals for salaries, keep 1 decimal for merit increase percentage)
      const roundedMedian = Math.round(median)
      const roundedAverage = Math.round(average)
      const roundedMeritIncrease = Math.round(meritIncrease * 10) / 10 // Round to 1 decimal place

      // Update state if component is still mounted
      if (isMounted.current) {
        setMedianSalary(roundedMedian)
        setAverageSalary(roundedAverage)
        setAverageMeritIncrease(roundedMeritIncrease)
        setEmployeeCount(count)
        setError(null)
      }
    } catch (err) {
      console.error('[useCompensationMetrics] Error fetching compensation metrics:', err)

      if (isMounted.current) {
        setError(
          err instanceof Error ? err : new Error('[useCompensationMetrics] Failed to fetch compensation metrics')
        )
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
    fetchCompensationMetrics()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchCompensationMetrics])

  // Function to manually refresh the data
  const refetch = useCallback(() => {
    fetchCompensationMetrics()
  }, [fetchCompensationMetrics])

  return {
    medianSalary,
    averageSalary,
    averageMeritIncrease,
    employeeCount,
    loading,
    error,
    refetch
  }
}
