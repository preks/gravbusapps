import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { getEmployeesByOrgUnitQuery } from '../queries/getEmployeesByOrgUnit'
import { formatDate } from '@/common/utils/windowUtils'

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
  const [data, setData] = useState<OrgUnitEmployeeData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !structureId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const response = await graphQLClient.request(getEmployeesByOrgUnitQuery, {
          structureId,
          asOf: formatDate(new Date(), 'fullDateTime.ISO')
        })

        // Extract employee assignments and organizational units
        const { EmployeeOrganizationalUnit, OrganizationalUnit } = response

        // Create a map to count employees per organizational unit
        const orgUnitCounts = new Map<string, number>()

        // Initialize all organizational units with 0 count
        OrganizationalUnit.forEach((unit: { id: string }) => {
          orgUnitCounts.set(unit.id, 0)
        })

        // Count employees per organizational unit
        EmployeeOrganizationalUnit.forEach((assignment: { organizationalUnitId: string }) => {
          const unitId = assignment.organizationalUnitId
          const currentCount = orgUnitCounts.get(unitId) || 0
          orgUnitCounts.set(unitId, currentCount + 1)
        })

        // Calculate total employee count
        const totalEmployees = Array.from(orgUnitCounts.values()).reduce((sum, count) => sum + count, 0)

        // Transform to final data structure
        const orgUnitData: OrgUnitEmployeeData[] = OrganizationalUnit.map((unit: { id: string; name: string }) => {
          const count = orgUnitCounts.get(unit.id) || 0
          return {
            id: unit.id,
            name: unit.name,
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
  }, [accessToken, structureId, graphQLClient])

  return { data, loading, error }
}
