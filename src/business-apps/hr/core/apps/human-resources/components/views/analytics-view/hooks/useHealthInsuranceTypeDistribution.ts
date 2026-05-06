import { useMemo } from 'react'
import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from './useDatasetQuery'
import { getCurrentActiveStructureId, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

interface HealthInsuranceTypeItem {
  name: string
  count: number
  percentage: number
}

/**
 * Transform dataset rows to HealthInsuranceTypeItem format and calculate total
 */
const transformHealthInsuranceTypeDistribution = (rows: any[]): HealthInsuranceTypeItem[] => {
  // Calculate total employees (sum of all values)
  const total = rows.reduce((sum, row) => sum + (Number(row.value) || 0), 0)

  // Transform dataset rows to HealthInsuranceTypeItem format
  // Format: category (insurance type name), value (employee count)
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
    .filter((item: HealthInsuranceTypeItem) => item.count > 0) // Filter out entries with no employees
    .sort((a: HealthInsuranceTypeItem, b: HealthInsuranceTypeItem) => b.count - a.count) // Sort by count (descending)
}

/**
 * Hook to fetch and process health insurance type distribution data from dataset API
 * Uses the healthInsurerDistributionTypeQuery dataset query
 * @param accessToken - Access token for API authentication
 * @returns Object containing the distribution data, loading state, error, and total employee count
 */
export const useHealthInsuranceTypeDistribution = (accessToken: string) => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const structureId = getCurrentActiveStructureId()
  const localeCode = getCurrentActiveUserLocale() || 'en-US'
  const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''

  // Memoize params to avoid recreating object on every render
  const params = useMemo(() => {
    const queryParams: Record<string, string> = { localeCode, structureId: structureId || 'null' }
    if (companyIdsParam) queryParams.companyIds = companyIdsParam
    return queryParams
  }, [companyIdsParam, localeCode, structureId])

  const {
    data: distribution,
    loading,
    error
  } = useDatasetQuery<HealthInsuranceTypeItem>(
    accessToken,
    'healthInsurerDistributionTypeQuery',
    QueryType.DATASET,
    params,
    transformHealthInsuranceTypeDistribution,
    'useHealthInsuranceTypeDistribution'
  )

  // Calculate total employees from distribution data
  const totalEmployees = useMemo(() => {
    return distribution.reduce((sum, item) => sum + item.count, 0)
  }, [distribution])

  return {
    distribution,
    loading,
    error,
    totalEmployees
  }
}
