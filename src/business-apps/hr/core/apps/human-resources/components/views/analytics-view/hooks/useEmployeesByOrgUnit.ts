import { useState, useEffect } from 'react'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'

// Define types for the hook results
export interface OrgUnitEmployeeData {
  id: string
  name: string
  count: number
  percentage: number
}

interface UseEmployeesByOrgUnitResult {
  data: OrgUnitEmployeeData[]
  loading: boolean
  error: Error | null
}

/**
 * Custom hook to fetch and process employee distribution data by organizational unit
 * @param accessToken User access token for API authentication
 * @returns {UseEmployeesByOrgUnitResult} Object containing data, loading state and any error
 */
export const useEmployeesByOrgUnit = (accessToken: string): UseEmployeesByOrgUnitResult => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
  const [data, setData] = useState<OrgUnitEmployeeData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const queryClient = useQueryExecutionClient(accessToken, Services.EMPLOYEE)

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const structureId = getCurrentActiveStructureId()
        const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
        const params: Record<string, string | number | boolean> = {}
        if (structureId) params.structureId = structureId
        if (companyIdsParam) params.companyIds = companyIdsParam

        const response = await queryClient.executeQuery('employeesByDepartment', QueryType.DATASET, params)

        const rows: Array<{ category: string; value: number }> = response?.data || []
        const totalEmployees = rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0)

        const orgUnitData: OrgUnitEmployeeData[] = rows.map(r => {
          const name = r.category || 'Unknown'
          const count = Number(r.value) || 0
          return {
            id: name,
            name,
            count,
            percentage: totalEmployees > 0 ? parseFloat(((count / totalEmployees) * 100).toFixed(1)) : 0
          }
        })

        // Filter out organizational units with no employees (for consistency with other charts)
        const filteredData = orgUnitData.filter(item => item.count > 0)

        // Sort by count in descending order
        filteredData.sort((a, b) => b.count - a.count)

        setData(filteredData)
        setError(null)
      } catch (err) {
        console.error('Error fetching employee organizational unit data:', err)
        setError(err instanceof Error ? err : new Error('Unknown error fetching employee organizational unit data'))
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [accessToken, queryClient, selectedCompanyIds])

  return { data, loading, error }
}
