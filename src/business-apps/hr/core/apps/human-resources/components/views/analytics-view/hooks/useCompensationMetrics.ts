import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

/**
 * Dataset response type for compensation metrics query
 */
type DatasetRow = { category?: string; value?: number; employee_count?: number; [key: string]: any }

/**
 * Compensation metrics extracted from dataset
 */
interface CompensationMetrics {
  median: number
  average: number
  meritIncrease: number
  count: number
}

/**
 * Find dataset row by category name (case-insensitive)
 */
const findRowByCategory = (rows: DatasetRow[], category: string): DatasetRow | undefined => {
  return rows.find(
    r =>
      String(r.category || '')
        .trim()
        .toLowerCase() === category
  )
}

/**
 * Extract compensation metrics from dataset rows
 */
const extractCompensationMetrics = (rows: DatasetRow[]): CompensationMetrics => {
  const medianRow = findRowByCategory(rows, 'median salary')
  const averageRow = findRowByCategory(rows, 'average salary')
  const meritIncreaseRow = findRowByCategory(rows, 'average merit increase')

  const median = medianRow ? Number(medianRow.value ?? 0) : 0
  const average = averageRow ? Number(averageRow.value ?? 0) : 0
  const meritIncrease = meritIncreaseRow ? Number(meritIncreaseRow.value ?? 0) : 0

  // Use employee_count from median or average row (they should be the same)
  let count = 0
  if (medianRow?.employee_count) {
    count = Number(medianRow.employee_count)
  } else if (averageRow?.employee_count) {
    count = Number(averageRow.employee_count)
  }

  return { median, average, meritIncrease, count }
}

/**
 * Round compensation metrics to appropriate precision
 */
const roundCompensationMetrics = (metrics: CompensationMetrics): CompensationMetrics => {
  return {
    median: Math.round(metrics.median),
    average: Math.round(metrics.average),
    meritIncrease: Math.round(metrics.meritIncrease * 10) / 10, // Round to 1 decimal place
    count: metrics.count
  }
}

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

      // Extract and process compensation metrics
      const metrics = extractCompensationMetrics(rows)
      const roundedMetrics = roundCompensationMetrics(metrics)

      // Update state if component is still mounted
      if (isMounted.current) {
        setMedianSalary(roundedMetrics.median)
        setAverageSalary(roundedMetrics.average)
        setAverageMeritIncrease(roundedMetrics.meritIncrease)
        setEmployeeCount(metrics.count)
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
