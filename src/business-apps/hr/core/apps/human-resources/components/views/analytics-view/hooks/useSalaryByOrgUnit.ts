import { useCallback, useEffect, useState, useRef } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

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
 * Hook to fetch and process employee salary data grouped by organizational unit
 * Uses the avgSalaryEmployeeByOrgUnit dataset query
 * @param accessToken Access token for API authorization
 * @returns Object containing salary distribution data and loading/error states
 */
export function useSalaryByOrgUnit(accessToken: string) {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [salaryByOrgUnit, setSalaryByOrgUnit] = useState<OrganizationalUnitSalary[]>([])
  const isMounted = useRef<boolean>(true)

  const datasetClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)
  const structureId = getCurrentActiveStructureId()

  const fetchData = useCallback(async () => {
    if (!accessToken) {
      if (isMounted.current) {
        setError(new Error('[useSalaryByOrgUnit] No access token provided'))
        setLoading(false)
      }
      return
    }

    try {
      if (isMounted.current) {
        setLoading(true)
        setError(null)
      }

      console.log('[useSalaryByOrgUnit] Fetching salary data by org unit for structure:', structureId)

      // Execute the dataset query with structureId parameter (if available)
      // Pass 'null' as string if structureId is not available, as the query expects it
      const params = structureId ? { structureId } : { structureId: 'null' }
      const ds = await datasetClient.executeQuery('avgSalaryEmployeeByOrgUnit', QueryType.DATASET, params)

      if (!ds?.data || !Array.isArray(ds.data)) {
        throw new Error('[useSalaryByOrgUnit] Invalid response structure from dataset API')
      }

      const rows: DatasetRow[] = ds.data

      // Transform dataset rows to OrganizationalUnitSalary format
      // Format: id (org unit ID), category (org unit name), value (average salary), employee_count
      const salaryData: OrganizationalUnitSalary[] = rows
        .map((row: DatasetRow) => {
          const id = String(row.id || row.category || 'unknown')
          const name = String(row.category || 'Unknown')
          const averageSalary = Number(row.value ?? 0)
          const employeeCount = Number(row.employee_count ?? 0)

          return {
            id,
            name,
            averageSalary: Math.round(averageSalary), // Round to whole number
            employeeCount
          }
        })
        .filter((item: OrganizationalUnitSalary) => item.employeeCount > 0) // Filter out org units with no employees
        .sort((a: OrganizationalUnitSalary, b: OrganizationalUnitSalary) => b.averageSalary - a.averageSalary) // Sort by average salary (descending)

      console.log(`[useSalaryByOrgUnit] Retrieved ${salaryData.length} org units with salary data`)

      if (isMounted.current) {
        setSalaryByOrgUnit(salaryData)
        setError(null)
      }
    } catch (err) {
      console.error('[useSalaryByOrgUnit] Error fetching salary data:', err)

      if (isMounted.current) {
        setError(err instanceof Error ? err : new Error('[useSalaryByOrgUnit] Failed to fetch salary data'))
      }
    } finally {
      if (isMounted.current) {
        setLoading(false)
      }
    }
  }, [accessToken, datasetClient, structureId])

  useEffect(() => {
    isMounted.current = true
    fetchData()

    // Cleanup function
    return () => {
      isMounted.current = false
    }
  }, [fetchData])

  return {
    salaryByOrgUnit,
    loading,
    error
  }
}
