import { useMemo } from 'react'
import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from './useDatasetQuery'

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
 * Transform dataset rows to HealthInsuranceItem format and calculate total
 */
const transformHealthInsuranceDistribution = (rows: any[]): HealthInsuranceItem[] => {
  // Calculate total employees (sum of all values)
  const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0)

  // Transform dataset rows to HealthInsuranceItem format
  // Format: category (insurer name), value (employee count)
  return rows
    .map((row: any) => {
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
}

/**
 * Hook to fetch and process health insurance distribution data from dataset API
 * Uses the healthInsurerDistributionQuery dataset query
 * Returns distribution data, loading state, and any error
 */
export const useHealthInsuranceDistribution = (accessToken: string): HealthInsuranceDistributionHookResult => {
  // Memoize empty params to avoid infinite re-renders
  const params = useMemo(() => ({}), [])

  const {
    data: distribution,
    loading,
    error
  } = useDatasetQuery<HealthInsuranceItem>(
    accessToken,
    'healthInsurerDistributionQuery',
    QueryType.DATASET,
    params,
    transformHealthInsuranceDistribution,
    'useHealthInsuranceDistribution'
  )

  // Calculate total employees from distribution data
  const totalEmployees = useMemo(() => {
    return distribution.reduce((sum, item) => sum + item.count, 0)
  }, [distribution])

  return { distribution, loading, error, totalEmployees }
}
