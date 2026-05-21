import { useMemo } from 'react'
import { QueryType } from '@/common/network/dataset'
import { useDatasetQuery } from './useDatasetQuery'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

export interface OrganizationalUnitSalary {
  id: string
  name: string
  averageSalary: number
  employeeCount: number
}

/**
 * Dataset response type for average salary by org unit query
 */
type DatasetRow = { id?: string; category?: string; value?: number; employee_count?: number; [key: string]: any }

/**
 * Transform dataset rows to OrganizationalUnitSalary format
 */
const transformSalaryByOrgUnit = (rows: DatasetRow[]): OrganizationalUnitSalary[] => {
  const salaryData = rows
    .map((row: DatasetRow) => {
      const id = String(row.id || row.category || 'unknown')
      const name = String(row.category || 'Unknown')
      const averageSalary = Number(row.value ?? 0)
      const employeeCount = Number(row.employee_count ?? 0)

      return {
        id,
        name,
        averageSalary: Math.round(averageSalary),
        employeeCount
      }
    })
    .filter((item: OrganizationalUnitSalary) => item.employeeCount > 0)

  return [...salaryData].sort((a, b) => b.averageSalary - a.averageSalary)
}

/**
 * Hook to fetch and process employee salary data grouped by organizational unit
 * Uses the avgSalaryEmployeeByOrgUnit dataset query
 * @param accessToken Access token for API authorization
 * @returns Object containing salary distribution data and loading/error states
 */
export function useSalaryByOrgUnit(accessToken: string) {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const structureId = getCurrentActiveStructureId()
  const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
  const params = useMemo(() => {
    const queryParams: Record<string, string> = { structureId: structureId || 'null' }
    if (companyIdsParam) queryParams.companyIds = companyIdsParam
    return queryParams
  }, [companyIdsParam, structureId])
  const transform = useMemo(() => transformSalaryByOrgUnit, [])

  const {
    data: salaryByOrgUnit,
    loading,
    error
  } = useDatasetQuery<OrganizationalUnitSalary>(
    accessToken,
    'avgSalaryEmployeeByOrgUnit',
    QueryType.DATASET,
    params,
    transform,
    'useSalaryByOrgUnit'
  )

  return {
    salaryByOrgUnit,
    loading,
    error
  }
}
