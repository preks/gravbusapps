import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { TeamInfo } from '../types/userRoles'

interface OrganizationalUnitEmployee {
  employeeId: string
  employee: {
    firstName: string
    lastName: string
  } | null // Can be null if employee is deleted or inactive
}

interface OrganizationalUnitResponse {
  id: string
  name: string
  code: string
  type: string
  description: string | null
  organizationalUnitEmployeeAggregate: {
    aggregate: {
      count: number
    }
  }
  organizationalUnitEmployee: OrganizationalUnitEmployee[]
}

interface GetTeamsDataResult {
  OrganizationalUnit: OrganizationalUnitResponse[]
}

export interface UseTeamsDataProps {
  accessToken: string
  structureId?: string // Optional - will auto-detect from window if not provided
}

export interface UseTeamsDataResult {
  teams: TeamInfo[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Optimized hook to fetch teams directly from OrganizationalUnit table
 * Returns teams with memberIds populated, compatible with useTeamPerformanceData
 */
export const useTeamsData = ({ accessToken, structureId: propStructureId }: UseTeamsDataProps): UseTeamsDataResult => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get structure ID from prop or window context
  const structureId = propStructureId || getCurrentActiveStructureId()

  const fetchTeams = useCallback(async () => {
    if (!accessToken || !structureId) {
      setTeams([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query GetTeamsWithMembers($structureId: uuid!) {
          OrganizationalUnit(
            where: {
              isDeleted: { _eq: false },
              structureId: { _eq: $structureId },
              type: { _in: ["TEAM", "DEPARTMENT", "UNIT"] }
            }
            orderBy: { name: ASC }
          ) {
            id
            name
            code
            type
            description
            
            # Get member count efficiently via aggregate
            organizationalUnitEmployeeAggregate {
              aggregate {
                count
              }
            }
            
            # Get all team members via relationship (filter at database level)
            organizationalUnitEmployee(
              where: {
                employee: {
                  isDeleted: { _eq: false }
                }
              }
            ) {
              employeeId
              employee {
                firstName
                lastName
              }
            }
          }
        }
      `

      const response = await graphqlClient.request<GetTeamsDataResult>(query, { structureId })

      if (!response?.OrganizationalUnit) {
        throw new Error('No teams data received from server')
      }

      // Transform to TeamInfo format (compatible with current implementation)
      const teamsData: TeamInfo[] = response.OrganizationalUnit.map(unit => {
        // Filter out null employees and extract member IDs
        const validMembers = unit.organizationalUnitEmployee.filter(emp => emp.employee !== null)
        const memberIds = validMembers.map(emp => emp.employeeId)

        return {
          id: unit.id,
          name: unit.name,
          code: unit.code,
          type: unit.type,
          description: unit.description || '',
          memberCount: memberIds.length, // Count only valid members
          memberIds, // 👈 Already populated from database!
          // Optional: Store member details for future use
          members: validMembers.map(emp => ({
            employeeId: emp.employeeId,
            firstName: emp.employee!.firstName,
            lastName: emp.employee!.lastName,
            fullName: `${emp.employee!.firstName} ${emp.employee!.lastName}`.trim()
          }))
        }
      })

      setTeams(teamsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch teams data'
      setError(errorMessage)
      setTeams([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, structureId, graphqlClient])

  useEffect(() => {
    void fetchTeams()
  }, [fetchTeams])

  return {
    teams,
    isLoading,
    error,
    refetch: () => void fetchTeams()
  }
}
