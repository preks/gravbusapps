import { useState, useEffect, useCallback, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface HealthInsuranceTypeItem {
  name: string
  count: number
  percentage: number
}

/**
 * Dataset response type for health insurance type distribution query
 */
type DatasetRow = { category?: string; value?: number; [key: string]: any }

/**
 * Hook to fetch and process health insurance type distribution data from dataset API
 * Uses the healthInsurerDistributionTypeQuery dataset query
 * @param accessToken - Access token for API authentication
 * @returns Object containing the distribution data, loading state, error, and total employee count
 */
export const useHealthInsuranceTypeDistribution = (accessToken: string) => {
  const [distribution, setDistribution] = useState<HealthInsuranceTypeItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalEmployees, setTotalEmployees] = useState<number>(0)
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const localeCode = getCurrentActiveUserLocale() || 'en-US'

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useHealthInsuranceTypeDistribution] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      // Execute the dataset query with localeCode parameter
      const ds = await datasetClient.executeQuery('healthInsurerDistributionTypeQuery', QueryType.DATASET, {
        localeCode
      })

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useHealthInsuranceTypeDistribution] Invalid response structure from dataset API')
      }

      const rows: DatasetRow[] = ds.data

      // Calculate total employees (sum of all values)
      const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0)

      // Transform dataset rows to HealthInsuranceTypeItem format
      // Format: category (insurance type name), value (employee count)
      const transformedData: HealthInsuranceTypeItem[] = rows
        .map((row: DatasetRow) => {
          const name = String(row.category || 'Unknown')
          const count = Number(row.value ?? 0)

          return {
            name,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0
          }
        })
        .filter((item: HealthInsuranceTypeItem) => item.count > 0) // Filter out entries with no employees
        .sort((a: HealthInsuranceTypeItem, b: HealthInsuranceTypeItem) => b.count - a.count) // Sort by count (descending)

      if (isMounted.current) {
        setDistribution(transformedData)
        setTotalEmployees(total)
        setError(null)
      }
    } catch (err) {
      console.error('[useHealthInsuranceTypeDistribution] Error fetching health insurance type data:', err)

      if (isMounted.current) {
        setError(
          err instanceof Error
            ? err
            : new Error('[useHealthInsuranceTypeDistribution] Failed to fetch health insurance type data')
        )
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient, localeCode])

  useEffect(() => {
    isMounted.current = true
    fetchData()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchData])

  return {
    distribution,
    loading,
    error,
    totalEmployees
  }
}
