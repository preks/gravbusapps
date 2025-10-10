import { useCallback, useEffect, useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getSalaryByOrgUnitQuery } from '../queries/getSalaryByOrgUnit'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface OrganizationalUnitSalary {
  id: string
  name: string
  averageSalary: number
  employeeCount: number
}

/**
 * Hook to fetch and process employee salary data grouped by organizational unit
 * @param accessToken Access token for API authorization
 * @returns Object containing salary distribution data and loading/error states
 */
export function useSalaryByOrgUnit(accessToken: string) {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [salaryByOrgUnit, setSalaryByOrgUnit] = useState<OrganizationalUnitSalary[]>([])

  const graphqlClient = useGraphqlClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  const fetchData = useCallback(async () => {
    if (!accessToken || !graphqlClient) {
      console.warn('[useSalaryByOrgUnit] Missing access token or GraphQL client')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('[useSalaryByOrgUnit] Fetching salary data by org unit for structure:', structureId)
      const variables = { structureId }
      const response = await graphqlClient.request(getSalaryByOrgUnitQuery, variables)
      console.log('[useSalaryByOrgUnit] GraphQL response:', response)

      // Get employee data with salary information
      const employeeWorkingConditions = response?.EmployeeWorkingCondition || []
      console.log(
        `[useSalaryByOrgUnit] Retrieved ${employeeWorkingConditions.length} working conditions with salary data`
      )

      // Get org unit assignments
      const orgUnitAssignments = response?.EmployeeOrganizationalUnit || []
      console.log(`[useSalaryByOrgUnit] Retrieved ${orgUnitAssignments.length} organizational unit assignments`)

      // Get all org units
      const orgUnits = response?.OrganizationalUnit || []
      console.log(`[useSalaryByOrgUnit] Retrieved ${orgUnits.length} organizational units`)

      // Map to track employee salary by org unit
      const salaryByOrgUnitMap: Record<string, { totalSalary: number; employeeCount: number }> = {}

      // Initialize map with all org units
      orgUnits.forEach((orgUnit: { id: string }) => {
        salaryByOrgUnitMap[orgUnit.id] = { totalSalary: 0, employeeCount: 0 }
      })

      // Process employee salary data
      employeeWorkingConditions.forEach(
        (workingCondition: { id: string; employeeId: string; annualGrossSalary: number }) => {
          if (!workingCondition.annualGrossSalary) return

          // Find org unit assignment for employee
          const assignment = orgUnitAssignments.find(
            (assignment: { employeeId: string }) => assignment.employeeId === workingCondition.employeeId
          )

          if (!assignment) return

          const orgUnitId = assignment.organizationalUnitId
          if (!orgUnitId || !salaryByOrgUnitMap[orgUnitId]) return

          // Add salary to org unit total
          salaryByOrgUnitMap[orgUnitId].totalSalary += workingCondition.annualGrossSalary
          salaryByOrgUnitMap[orgUnitId].employeeCount += 1
        }
      )

      // Calculate average salary for each org unit and format data
      const salaryData: OrganizationalUnitSalary[] = orgUnits
        .map((orgUnit: { id: string; name: string }) => {
          const data = salaryByOrgUnitMap[orgUnit.id]
          const averageSalary = data.employeeCount > 0 ? Math.round(data.totalSalary / data.employeeCount) : 0

          return {
            id: orgUnit.id,
            name: orgUnit.name,
            averageSalary,
            employeeCount: data.employeeCount
          }
        })
        .filter((item: OrganizationalUnitSalary) => item.employeeCount > 0) // Filter out org units with no employees
        .sort((a: OrganizationalUnitSalary, b: OrganizationalUnitSalary) => b.averageSalary - a.averageSalary) // Sort by average salary (descending)

      console.log(
        `[useSalaryByOrgUnit] Calculated ${salaryData.length} org units with salary data out of ${orgUnits.length} total org units`
      )

      setSalaryByOrgUnit(salaryData)
      setLoading(false)
    } catch (err) {
      console.error('[useSalaryByOrgUnit] Error fetching or processing salary data:', err)
      setError(err instanceof Error ? err : new Error('[useSalaryByOrgUnit] Failed to fetch or process salary data'))
      setLoading(false)
    }
  }, [accessToken, graphqlClient, structureId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    salaryByOrgUnit,
    loading,
    error
  }
}
