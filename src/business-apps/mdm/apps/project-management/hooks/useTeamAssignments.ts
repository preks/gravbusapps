import { useRestClient } from '@/common/network/rest/useRestClient'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { env } from '@/common/env/EnvUtils'
import { useCallback } from 'react'

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

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
  totalAllocationPercent?: number | null
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
}

/**
 * Hook for managing team employee assignments
 */
export const useTeamAssignments = (accessToken: string) => {
  const restClient = useRestClient(ORGCHART_BASE_URL)
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
          MatrixUnit(where: {isDeleted: {_eq: false}, id: {_eq: $teamId}}) {
            id
            name
            employeePositions {
              employee {
                displayName
                id
                workingHours {
                  totalAllocationPercent
                }
              }
              matrixUnitEmployees(where: {matrixUnitId: {_eq: $teamId}}) {
                id
                percentage
                matrixUnit {
                  name
                  id
                }
              }
              jobPosition {
                name
                id
              }
            }
          }
        }
      `

      const graphqlResponse = await graphqlClient.request<{
        MatrixUnit: Array<{
          id: string
          name: string
          employeePositions: Array<{
            employee: {
              displayName: string
              id: string
              workingHours: Array<{
                totalAllocationPercent: number | null
              }>
            }
            matrixUnitEmployees: Array<{
              id: string
              percentage: number
              matrixUnit: {
                name: string
                id: string
              }
            }>
            jobPosition: {
              name: string
              id: string
            } | null
          }>
        }>
      }>(query, { teamId })

      const matrixUnit = graphqlResponse?.MatrixUnit?.[0]

      if (!matrixUnit?.employeePositions || matrixUnit.employeePositions.length === 0) {
        return []
      }

      // Transform GraphQL response to TeamEmployee format
      const enrichedEmployees: TeamEmployee[] = matrixUnit.employeePositions.map(employeePosition => {
        const employee = employeePosition.employee
        const matrixUnitEmployee = employeePosition.matrixUnitEmployees?.[0]
        const jobPosition = employeePosition.jobPosition
        const workingHours = employee.workingHours?.[0]

        return {
          id: employee.id,
          employeeId: employee.id,
          fullName: employee.displayName,
          displayName: employee.displayName,
          percentage: matrixUnitEmployee?.percentage,
          teamAssignmentId: matrixUnitEmployee?.id,
          jobPosition: jobPosition?.name,
          totalAllocationPercent: workingHours?.totalAllocationPercent ?? null
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
        const response = await restClient.post(`/employee-assignments/matrix-unit`, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        return response
      } catch (error) {
        console.error('Error assigning employees to team:', error)
        throw error
      }
    },
    [restClient, accessToken]
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

        // Build where condition
        const whereCondition: any = {
          employeePosition: {
            matrixUnitId: { _neq: matrixUnitId },
            structureId: { _eq: structureId }
          }
        }

        // Add search condition if provided
        if (searchCriteria.trim()) {
          const searchPattern = { _ilike: `%${searchCriteria.trim()}%` }
          // Combine conditions: matrixUnitId != X AND structureId = Y AND (firstName ILIKE search OR lastName ILIKE search)
          whereCondition._and = [
            {
              employeePosition: {
                matrixUnitEmployees: {
                  matrixUnitId: { _neq: matrixUnitId },
                  structureId: { _eq: structureId }
                }
              }
            },
            {
              _or: [
                { employeePosition: { firstName: searchPattern } },
                { employeePosition: { lastName: searchPattern } }
              ]
            }
          ]
          delete whereCondition.employeePosition
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
                : undefined
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
   * Remove an employee from a team
   * @param employeeAssignmentId - The employee assignment ID (from employee.matrixUnit.matrixUnitAssignmentId)
   * @returns Promise resolving to the deletion response
   */
  const removeEmployeeFromTeam = async (employeeAssignmentId: string): Promise<any> => {
    try {
      const response = await restClient.delete(`/employee-assignments/matrix-unit/${employeeAssignmentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      return response
    } catch (error) {
      console.error('Error removing employee from team:', error)
      throw error
    }
  }

  return {
    getTeamEmployees,
    assignEmployeeToTeam,
    getAvailableEmployees,
    removeEmployeeFromTeam
  }
}
