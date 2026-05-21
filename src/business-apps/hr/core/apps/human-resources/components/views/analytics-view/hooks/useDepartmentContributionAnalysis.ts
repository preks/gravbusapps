import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from './useDatasetQuery'
import { useHrAnalyticsStructureDateParams } from './useHrAnalyticsStructureDateParams'

/**
 * Department contribution analysis data structure
 */
export interface DepartmentContributionData {
  departmentId: string
  departmentName: string
  currentSalary: number
  firstMonthSalary: number
  percentage: number
  growthPercentage: number
}

/**
 * Transform dataset rows to DepartmentContributionData format
 */
const transformDepartmentContribution = (rows: any[]): DepartmentContributionData[] => {
  return rows
    .map((row: any) => {
      const departmentId = String(row.department_id || 'unknown')
      const departmentName = String(row.department_name || row.category || 'Unknown')
      const currentSalary = Number(row.value ?? 0)
      const firstMonthSalary = Number(row.first_month_salary ?? 0)
      const percentage = Number(row.percentage ?? 0)
      const growthPercentage = Number(row.growth_percentage ?? 0)

      return {
        departmentId,
        departmentName,
        currentSalary,
        firstMonthSalary,
        percentage,
        growthPercentage
      }
    })
    .filter((item: DepartmentContributionData) => item.departmentId !== 'unknown') // Filter out invalid departments
    .sort((a: DepartmentContributionData, b: DepartmentContributionData) => b.currentSalary - a.currentSalary) // Sort by current salary descending
}

/**
 * Hook to fetch department contribution analysis from dataset API
 * Uses the departmentContributionAnalysis query
 *
 * @param accessToken - Access token for API authentication
 * @param startDate - Start date for the range (YYYY-MM-DD)
 * @param endDate - End date for the range (YYYY-MM-DD)
 * @returns Object containing department contribution data, loading state, error, and refetch function
 */
export const useDepartmentContributionAnalysis = (accessToken: string, startDate: string, endDate: string) => {
  const params = useHrAnalyticsStructureDateParams(startDate, endDate)

  return useDatasetQuery<DepartmentContributionData>(
    accessToken,
    'departmentContributionAnalysis',
    QueryType.DATASET,
    params,
    transformDepartmentContribution,
    'useDepartmentContributionAnalysis'
  )
}
