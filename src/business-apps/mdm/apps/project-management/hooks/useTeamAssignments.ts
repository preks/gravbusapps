import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { env } from '@/common/env/EnvUtils'
import { useCallback } from 'react'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { useRestClient } from '@/common/network/rest/useRestClient'

const EMPLOYEES_BASE_URL = `${env('NEXT_PUBLIC_BASE_URL')}/processes/employee`

export interface TeamEmployee {
  id: string
  employeeId: string
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  jobPosition?: string
  percentage?: number
  teamAssignmentId?: string
  totalAllocationPercent?: {
    id: string
    version: number
    totalAllocationPercent: number | null
  } | null
  matrixUnit?: {
    matrixUnitAssignmentId?: string
  }
  [key: string]: any
}

export interface AvailableEmployee {
  id: string
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  picture_thumbnail?: string
  jobPosition?: {
    jobPositionName?: string
    id?: string
  }
  totalAllocationPercent?: {
    id: string
    version: number
    totalAllocationPercent: number | null
  } | null
  [key: string]: any
}

export interface PaginatedEmployeesResponse {
  id: string
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  [key: string]: any
}

export interface AssignEmployeePayload {
  employeeId: string
  structureId: string
  matrixUnitId: string
  percentage: number
  totalAllocationPercent?: {
    id: string
    version: number
    totalAllocationPercent: number | null
  } | null
}

/**
 * Hook for managing team employee assignments
 */
export const useTeamAssignments = (accessToken: string) => {
  const orgchartClient = useOrgchartClient(accessToken)
  const restClientEmployees = useRestClient(EMPLOYEES_BASE_URL)
  const graphqlClient = useGraphqlClient(accessToken)

  /**
   * Get employees assigned to a team with allocation percentage
   * @param teamId - The team (matrix unit) ID
   * @returns Promise resolving to an array of assigned employees with percentage and teamAssignmentId
   */
  const getTeamEmployees = async (teamId: string): Promise<TeamEmployee[]> => {
    try {
      const query = `
        query GetTeamEmployees($teamId: uuid!) {
          Employee(where: {employeePosition: {matrixUnitEmployees: {matrixUnitId: {_eq: $teamId}}}}) {
            id
            displayName
            workingHours {
              totalAllocationPercent
              id
              version
            }
            employeePosition {
              matrixUnitEmployees(where: {matrixUnitId: {_eq: $teamId}}) {
                id
                percentage
                matrixUnit {
                  id
                  name
                }
              }
              jobPosition {
                id
                name
              }
            }
          }
        }
      `

      const graphqlResponse = await graphqlClient.request<{
        Employee: Array<{
          id: string
          displayName: string
          workingHours: Array<{
            totalAllocationPercent: number | null
            id: string
            version: number
          }>
          employeePosition: {
            matrixUnitEmployees: Array<{
              id: string
              percentage: number
              matrixUnit: {
                id: string
                name: string
              }
            }>
            jobPosition: {
              id: string
              name: string
            } | null
          } | null
        }>
      }>(query, { teamId })

      const employees = graphqlResponse?.Employee

      if (!employees || employees.length === 0) {
        return []
      }

      // Transform GraphQL response to TeamEmployee format
      const enrichedEmployees: TeamEmployee[] = employees.map(employee => {
        const matrixUnitEmployee = employee.employeePosition?.matrixUnitEmployees?.[0]
        const jobPosition = employee.employeePosition?.jobPosition
        const workingHours = employee.workingHours?.[0]

        return {
          id: employee.id,
          employeeId: employee.id,
          fullName: employee.displayName,
          displayName: employee.displayName,
          percentage: matrixUnitEmployee?.percentage,
          teamAssignmentId: matrixUnitEmployee?.id,
          jobPosition: jobPosition?.name,
          totalAllocationPercent: workingHours
            ? {
                id: workingHours.id,
                version: workingHours.version,
                totalAllocationPercent: workingHours.totalAllocationPercent
              }
            : null
        }
      })

      return enrichedEmployees
    } catch (error) {
      console.error('Error fetching team employees:', error)
      throw error
    }
  }

  const assignEmployeeToTeam = useCallback(
    async (payload: AssignEmployeePayload[]): Promise<any> => {
      try {
        const formattedPayload = payload.map(employee => ({
          employeeId: employee.employeeId,
          structureId: employee.structureId,
          matrixUnitId: employee.matrixUnitId,
          percentage: employee.percentage
        }))

        const response = await orgchartClient.assignEmployeesToMatrixUnit(formattedPayload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        // Wait for all working hours updates to complete before returning
        await Promise.all(
          payload.map(async employee => {
            const totalAllocationPercent = employee.totalAllocationPercent

            const updatedTotalAllocationPercent = totalAllocationPercent
              ? (totalAllocationPercent.totalAllocationPercent ?? 0) + employee.percentage
              : employee.percentage
            const workingHoursPayload = {
              changeMode: 'INSERT',
              employeeWorkingHours: {
                employeeId: employee.employeeId,
                totalAllocationPercent: updatedTotalAllocationPercent,
                id: totalAllocationPercent?.id ?? employee.employeeId,
                version: totalAllocationPercent?.version ?? 0
              }
            }
            await restClientEmployees.post(`/updateEmployeeWorkingHours`, workingHoursPayload, {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            })
          })
        )

        return response
      } catch (error) {
        console.error('Error assigning employees to team:', error)
        throw error
      }
    },
    [orgchartClient, restClientEmployees, accessToken]
  )

  /**
   * Get available employees for assignment to a team
   * @param params - Search and pagination parameters
   * @returns Promise resolving to paginated employees response
   */
  const getAvailableEmployees = useCallback(
    async (params: {
      searchCriteria?: string
      page?: number
      size?: number
      matrixUnitId: string
      structureId: string
    }): Promise<AvailableEmployee[]> => {
      try {
        const { searchCriteria = '', page = 0, size = 10, matrixUnitId, structureId } = params
        const offset = page * size

        // Build where condition - exclude employees already in this team, include only from this structure
        const whereCondition: any = {
          employeePosition: {
            structureId: { _eq: structureId },
            _not: {
              matrixUnitEmployees: {
                matrixUnitId: { _eq: matrixUnitId }
              }
            }
          }
        }

        // Add search condition if provided
        if (searchCriteria.trim()) {
          const searchPattern = { _ilike: `%${searchCriteria.trim()}%` }
          whereCondition.employeePosition._or = [{ firstName: searchPattern }, { lastName: searchPattern }]
        }

        const query = `
          query GetAvailableEmployees($where: EmployeeBoolExp!, $limit: Int!, $offset: Int!) {
            Employee(where: $where, limit: $limit, offset: $offset, orderBy: {employeePosition: {lastName: ASC, firstName: ASC}}) {
              id
              employeePosition {
                matrixUnitEmployees {
                  id
                  matrixUnitId
                  percentage
                  matrixUnit {
                    name
                  }
                }
                lastName
                firstName
                id
                jobPosition {
                  name
                  id
                }
                employee {
                  pictureThumbnail
                }
              }
              workingHours {
                id
                version
                totalAllocationPercent
              }
            }
          }
        `

        const graphqlResponse = await graphqlClient.request<{
          Employee: Array<{
            id: string
            employeePosition: {
              matrixUnitEmployees: Array<{
                id: string
                matrixUnitId: string
                percentage: number
                matrixUnit: {
                  name: string
                }
              }>
              lastName: string | null
              firstName: string | null
              id: string
              jobPosition: {
                name: string
                id: string
              } | null
              employee: {
                pictureThumbnail: string | null
              } | null
            } | null
            workingHours: Array<{
              totalAllocationPercent: number | null
              id: string
              version: number
            }>
          }>
        }>(query, {
          where: whereCondition,
          limit: size,
          offset: offset
        })

        // Transform GraphQL response to AvailableEmployee format
        const employees: AvailableEmployee[] = (graphqlResponse?.Employee || [])
          .filter(emp => emp.employeePosition !== null)
          .map(emp => {
            const employeePosition = emp.employeePosition!
            const firstName = employeePosition.firstName || ''
            const lastName = employeePosition.lastName || ''
            const fullName = `${firstName} ${lastName}`.trim()

            return {
              id: emp.id,
              firstName: firstName,
              lastName: lastName,
              fullName: fullName || undefined,
              picture_thumbnail: employeePosition.employee?.pictureThumbnail || undefined,
              jobPosition: employeePosition.jobPosition
                ? {
                    jobPositionName: employeePosition.jobPosition.name,
                    id: employeePosition.jobPosition.id
                  }
                : undefined,
              totalAllocationPercent: emp.workingHours?.[0]
            }
          })

        return employees
      } catch (error) {
        console.error('Error fetching available employees:', error)
        throw error
      }
    },
    [graphqlClient, accessToken]
  )

  /**
   * Update total allocation percent for an employee (subtract project allocation)
   * @param employee - The employee with their current allocation data
   * @returns Promise resolving when the update is complete
   */
  const updateEmployeeTotalAllocation = async (employee: TeamEmployee): Promise<void> => {
    const totalAllocationPercent = employee.totalAllocationPercent
    const workingHoursPayload = {
      changeMode: 'UPDATE',
      employeeWorkingHours: {
        employeeId: employee?.id ?? '',
        totalAllocationPercent: totalAllocationPercent
          ? (totalAllocationPercent.totalAllocationPercent ?? 0) - (employee.percentage ?? 0)
          : employee.percentage,
        ...(totalAllocationPercent && {
          id: totalAllocationPercent.id,
          version: totalAllocationPercent.version
        })
      }
    }

    await restClientEmployees.post(`/updateEmployeeWorkingHours`, workingHoursPayload, {
      headers: { Authorization: `Bearer ${accessToken}` }
    })
  }

  /**
   * Remove an employee from a team
   * Updates totalAllocationPercent and deletes the assignment
   * @param employee - The employee to remove
   * @returns Promise resolving to the deletion response
   */
  const removeEmployeeFromTeam = async (employee: TeamEmployee): Promise<any> => {
    try {
      // Update total allocation
      await updateEmployeeTotalAllocation(employee)

      // Delete the assignment
      const response = await orgchartClient.deleteMatrixUnitEmployeeAssignment(String(employee.teamAssignmentId), {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      return response
    } catch (error) {
      console.error('Error removing employee from team:', error)
      throw error
    }
  }

  /**
   * Reset total allocation for all employees in a team
   * Use this when deleting a team (BE auto-deletes assignments, we just need to update totals)
   * @param teamId - The team (matrix unit) ID
   * @returns Promise resolving when all allocations have been updated
   */
  const resetTeamAllocations = async (teamId: string): Promise<void> => {
    try {
      // Get all employees assigned to this team
      const employees = await getTeamEmployees(teamId)

      if (employees.length === 0) {
        return
      }

      // Update total allocation for each employee in parallel (subtract their project percentage)
      await Promise.all(employees.map(employee => updateEmployeeTotalAllocation(employee)))
    } catch (error) {
      console.error('Error resetting team allocations:', error)
      throw error
    }
  }

  return {
    getTeamEmployees,
    assignEmployeeToTeam,
    getAvailableEmployees,
    removeEmployeeFromTeam,
    resetTeamAllocations
  }
}
