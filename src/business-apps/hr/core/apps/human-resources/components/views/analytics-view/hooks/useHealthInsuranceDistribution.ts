import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

interface HealthInsuranceItem {
  name: string
  count: number
  percentage: number
}

interface HealthInsuranceDistributionHookResult {
  distribution: HealthInsuranceItem[]
  loading: boolean
  error: Error | null
  totalEmployees: number
}

/**
 * Dataset response type for health insurer distribution query
 */
type DatasetRow = { category?: string; value?: number; [key: string]: any }

/**
 * Hook to fetch and process health insurance distribution data from dataset API
 * Uses the healthInsurerDistributionQuery dataset query
 * Returns distribution data, loading state, and any error
 */
export const useHealthInsuranceDistribution = (accessToken: string): HealthInsuranceDistributionHookResult => {
  const [distribution, setDistribution] = useState<HealthInsuranceItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalEmployees, setTotalEmployees] = useState<number>(0)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useHealthInsuranceDistribution] No access token provided'))
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
      const ds = await datasetClient.executeQuery('healthInsurerDistributionQuery', QueryType.DATASET, {})

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useHealthInsuranceDistribution] Invalid response structure from dataset API')
      }

      const rows: DatasetRow[] = ds.data

      // Calculate total employees (sum of all values)
      const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0)

      // Transform dataset rows to HealthInsuranceItem format
      // Format: category (insurer name), value (employee count)
      const transformedData: HealthInsuranceItem[] = rows
        .map((row: DatasetRow) => {
          const name = String(row.category || 'Unknown')
          const count = Number(row.value ?? 0)

          return {
            name,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0
          }
        })
        .filter((item: HealthInsuranceItem) => item.count > 0) // Filter out entries with no employees
        .sort((a: HealthInsuranceItem, b: HealthInsuranceItem) => b.count - a.count) // Sort by count (descending)

      if (isMounted.current) {
        setDistribution(transformedData)
        setTotalEmployees(total)
        setError(null)
      }
    } catch (err) {
      console.error('[useHealthInsuranceDistribution] Error fetching health insurance data:', err)

      if (isMounted.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('[useHealthInsuranceDistribution] Failed to fetch health insurance data')
        )
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient])

  useEffect(() => {
    isMounted.current = true
    fetchData()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchData])

  return { distribution, loading, error, totalEmployees }
}
