import { useMemo } from 'react'
import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from '../../../../core/apps/human-resources/components/views/analytics-view/hooks/useDatasetQuery.ts'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils.ts'
import { useHrAnalyticsFilters } from '../../../../core/apps/human-resources/components/views/analytics-view/context/HrAnalyticsFiltersContext.tsx'

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
 * Extract and round compensation metrics from dataset rows
 */
const transformToCompensationMetrics = (rows: DatasetRow[]): CompensationMetrics[] => {
  const medianRow = findRowByCategory(rows, 'median salary')
  const averageRow = findRowByCategory(rows, 'average salary')
  const meritIncreaseRow = findRowByCategory(rows, 'average merit increase')

  const median = medianRow ? Number(medianRow.value ?? 0) : 0
  const average = averageRow ? Number(averageRow.value ?? 0) : 0
  const meritIncrease = meritIncreaseRow ? Number(meritIncreaseRow.value ?? 0) : 0

  let count = 0
  if (medianRow?.employee_count) {
    count = Number(medianRow.employee_count)
  } else if (averageRow?.employee_count) {
    count = Number(averageRow.employee_count)
  }

  const rounded: CompensationMetrics = {
    median: Math.round(median),
    average: Math.round(average),
    meritIncrease: Math.round(meritIncrease * 10) / 10,
    count
  }

  return [rounded]
}

/**
 * Hook to fetch compensation metrics (median salary, average salary, and average merit increase) from the dataset API
 * Uses the medianAvgSalaryAvgMeritEmployees query which returns all three values
 *
 * @param accessToken - Access token for API authentication
 * @returns Object containing median salary, average salary, average merit increase, employee count, loading state, error, and refetch function
 */
export const useCompensationMetrics = (accessToken: string) => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const params = useMemo(() => {
    const structureId = getCurrentActiveStructureId()
    const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
    const next: Record<string, string | number | boolean> = {}
    if (structureId) next.structureId = structureId
    if (companyIdsParam) next.companyIds = companyIdsParam
    return next
  }, [selectedCompanyIds])

  const { data, loading, error, refetch } = useDatasetQuery<CompensationMetrics>(
    accessToken,
    'medianAvgSalaryAvgMeritEmployees',
    QueryType.DATASET,
    params,
    transformToCompensationMetrics,
    'useCompensationMetrics'
  )

  const metrics = data[0]

  return {
    medianSalary: metrics?.median ?? 0,
    averageSalary: metrics?.average ?? 0,
    averageMeritIncrease: metrics?.meritIncrease ?? 0,
    employeeCount: metrics?.count ?? 0,
    loading,
    error,
    refetch
  }
}
