import { useState, useEffect, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_PROBATION_RATE_BY_ORG_UNIT } from '../queries/getProbationRateByOrgUnit'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

/**
 * Interface for organizational unit probation rate data
 */
export interface OrganizationalUnitProbationRate {
  id: string
  name: string
  totalEmployees: number
  employeesInProbation: number
  probationRate: number // percentage of employees in probation
}

/**
 * Response type for Probation Rate by Org Unit query
 */
interface ProbationRateByOrgUnitResponse {
  OrganizationalUnit: Array<{
    id: string
    name: string
  }>
  EmployeeOrganizationalUnit: Array<{
    organizationalUnitId: string
    employeeId: string
  }>
  EmployeeWorkingCondition: Array<{
    employeeId: string
  }>
}

/**
 * Hook to fetch and calculate Probation Rate by Organizational Unit
 * @param accessToken Access token for API authentication
 * @returns Object containing probation rate data by org unit, loading state, and error
 */
export function useProbationRateByOrgUnit(accessToken: string) {
  const [data, setData] = useState<OrganizationalUnitProbationRate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  // Get GraphQL client
  const graphqlClient = useGraphqlClient(accessToken)
  const lastFetchKeyRef = useRef<string>('')
  const staticCache =
    (useProbationRateByOrgUnit as any).__cache ||
    ((useProbationRateByOrgUnit as any).__cache = new Map<string, Promise<any>>())

  // Fetch probation rate data by organizational unit
  useEffect(() => {
    if (!graphqlClient) return

    setLoading(true)
    setError(null)

    // Get the current structure ID from windowUtils
    const structureId = getCurrentActiveStructureId()

    if (!structureId) {
      console.warn('[useProbationRateByOrgUnit] No active structure ID found')
      setError(new Error('No active structure ID found'))
      setLoading(false)
      return
    }

    // Build dedupe key and guard
    const fetchKey = `${accessToken}|${structureId}`
    if (lastFetchKeyRef.current === fetchKey) {
      return
    }
    lastFetchKeyRef.current = fetchKey

    // Log request
    console.info('[useProbationRateByOrgUnit] Fetching probation rate data for structure:', structureId)

    let p = staticCache.get(fetchKey)
    if (!p) {
      p = graphqlClient.request<ProbationRateByOrgUnitResponse>(GET_PROBATION_RATE_BY_ORG_UNIT, { structureId })
      staticCache.set(fetchKey, p)
    }

    p.then(response => {
      console.info('[useProbationRateByOrgUnit] Received probation rate data')

      // Check if the response has the expected structure
      if (!response?.OrganizationalUnit || !Array.isArray(response.OrganizationalUnit)) {
        throw new Error('Invalid response format from API')
      }

      // Process the data
      // First, create a map of employeeIds that are currently in probation (with end date > today)
      const employeesInProbationMap = new Map()
      response.EmployeeWorkingCondition.forEach((item: any) => {
        employeesInProbationMap.set(item.employeeId, true)
      })
      console.debug(
        `[useProbationRateByOrgUnit] Found ${employeesInProbationMap.size} employees currently in probation`
      )

      // Create a map of employees per org unit
      const employeesPerOrgUnit = new Map()
      response.EmployeeOrganizationalUnit.forEach((item: any) => {
        if (!employeesPerOrgUnit.has(item.organizationalUnitId)) {
          employeesPerOrgUnit.set(item.organizationalUnitId, [])
        }
        employeesPerOrgUnit.get(item.organizationalUnitId).push(item.employeeId)
      })
      console.debug(
        `[useProbationRateByOrgUnit] Processed ${response.EmployeeOrganizationalUnit.length} employee-org unit associations`
      )

      const orgUnitProbationRateData = response.OrganizationalUnit.map((orgUnit: any) => {
        // Get all employees in this org unit
        const orgUnitEmployees = employeesPerOrgUnit.get(orgUnit.id) || []

        // Total employees in this org unit
        const totalEmployees = orgUnitEmployees.length

        // Count employees currently in probation (with end date > today) in this org unit
        const employeesInProbation = orgUnitEmployees.filter((employeeId: string) =>
          employeesInProbationMap.has(employeeId)
        ).length

        // Calculate probation rate (avoid division by zero)
        const probationRate = totalEmployees > 0 ? (employeesInProbation / totalEmployees) * 100 : 0

        // Round to one decimal place
        const roundedProbationRate = Math.round(probationRate * 10) / 10

        return {
          id: orgUnit.id,
          name: orgUnit.name,
          totalEmployees,
          employeesInProbation,
          probationRate: roundedProbationRate
        }
      })

      // Filter out org units with no employees
      const filteredData = orgUnitProbationRateData.filter(item => item.totalEmployees > 0)

      // Sort by probation rate in descending order
      const sortedData = filteredData.sort((a, b) => b.probationRate - a.probationRate)

      console.info(`[useProbationRateByOrgUnit] Processed probation rate data for ${sortedData.length} org units`)

      setData(sortedData)
      setLoading(false)
    }).catch(err => {
      console.error('[useProbationRateByOrgUnit] Error fetching probation rate data:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch probation rate data'))
      setLoading(false)
    })
  }, [accessToken])

  return {
    data,
    loading,
    error
  }
}
