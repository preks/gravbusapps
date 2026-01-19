import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Employee, MatrixUnitMembership } from '../types/employee.types'

export interface MatrixTeamMember {
  id: string
  firstName: string
  lastName: string
  fullName: string
  pictureThumbnail?: string
  jobPositionName?: string
  matrixUnitName?: string
  status?: 'Available' | 'On Leave' | 'Away'
}

export interface UseMatrixTeamsResult {
  matrixTeamMembers: MatrixTeamMember[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseMatrixTeamsProps {
  accessToken: string
  employeeId: string
  structureId?: string
}

/**
 * Hook to fetch matrix team members for an employee
 * Based on the pattern used in EmployeeDetailsQueries.ts
 */
export const useMatrixTeams = ({ accessToken, employeeId, structureId }: UseMatrixTeamsProps): UseMatrixTeamsResult => {
  const [matrixTeamMembers, setMatrixTeamMembers] = useState<MatrixTeamMember[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const fetchMatrixTeams = async () => {
    if (!employeeId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Correct approach using EmployeeMatrixUnit entity
      const matrixTeamMembersQuery = `
        query GetMatrixTeamMembers($employeeId: uuid!, $structureId: uuid!) {
          # Step 1: Get all matrix units the current employee belongs to
          currentEmployeeMatrixUnits: EmployeeMatrixUnit(
            where: {
              employeeId: { _eq: $employeeId },
              structureId: { _eq: $structureId }
            }
          ) {
            matrixUnitId
            matrixUnit {
              id
              name
            }
          }
          
          # Step 2: Get all other employees in those same matrix units
          # Note: We'll filter by matrixUnitId in the processing logic since we need the IDs from step 1
          allMatrixTeamMembers: EmployeeMatrixUnit(
            where: {
              structureId: { _eq: $structureId },
              employeeId: { _neq: $employeeId }
            }
            limit: 100
          ) {
            employeeId
            matrixUnitId
            role
            percentage
            matrixUnit {
              id
              name
            }
          }
        }
      `

      const response = await graphQLClient.request(matrixTeamMembersQuery, {
        employeeId,
        structureId: structureId || ''
      })

      // Check if current employee has any matrix units
      const currentEmployeeMatrixUnits = response?.currentEmployeeMatrixUnits || []
      if (currentEmployeeMatrixUnits.length === 0) {
        setMatrixTeamMembers([])
        return
      }

      // Extract matrix unit IDs that the current employee belongs to
      const currentEmployeeMatrixUnitIds = currentEmployeeMatrixUnits.map(
        (unit: MatrixUnitMembership) => unit.matrixUnitId
      )

      // Filter team members to only include those in the same matrix units
      const allTeamMembers = response?.allMatrixTeamMembers || []
      const teamMembersInSameUnits = allTeamMembers.filter((member: MatrixUnitMembership) =>
        currentEmployeeMatrixUnitIds.includes(member.matrixUnitId)
      )

      if (teamMembersInSameUnits.length === 0) {
        setMatrixTeamMembers([])
        return
      }

      // Now we need to get Employee details for each team member
      // We'll create a second query to get the Employee data
      const employeeIds = [...new Set(teamMembersInSameUnits.map((member: MatrixUnitMembership) => member.employeeId))]

      const employeeDetailsQuery = `
        query GetEmployeeDetails($employeeIds: [uuid!]!) {
          Employee(where: { id: { _in: $employeeIds } }) {
            id
            firstName
            lastName
            pictureThumbnail
            picture
            employeePosition {
              jobPosition {
                name
              }
            }
          }
        }
      `

      const employeeDetailsResponse = await graphQLClient.request(employeeDetailsQuery, { employeeIds })
      const employees = employeeDetailsResponse?.Employee || []

      // Create a map for quick lookup of matrix unit assignments
      const matrixUnitMap = new Map<string, any[]>()
      teamMembersInSameUnits.forEach((member: MatrixUnitMembership) => {
        if (!matrixUnitMap.has(member.employeeId)) {
          matrixUnitMap.set(member.employeeId, [])
        }
        matrixUnitMap.get(member.employeeId || '')?.push({
          matrixUnitId: member.matrixUnitId,
          matrixUnitName: member.matrixUnit?.name || 'Matrix Team',
          role: member.role,
          percentage: member.percentage
        })
      })

      // Format the team members using employee details and matrix unit info
      const formattedMembers: MatrixTeamMember[] = employees.map((employee: Employee) => {
        // Handle picture data - pictureThumbnail might contain actual base64 or be null
        // picture field contains JSON metadata, not the actual image
        let actualPictureThumbnail = employee.pictureThumbnail

        // If pictureThumbnail is null but picture exists, try to extract from picture JSON
        if (!actualPictureThumbnail && employee.picture) {
          try {
            // The actual image would need to be fetched from the file service using pictureData.fileId
            // For now, we'll set it to null since we can't get the actual image data
            actualPictureThumbnail = undefined
          } catch {
            // If picture is not JSON, it might be actual base64 data
            actualPictureThumbnail = employee.picture
          }
        }

        // Get matrix unit info for this employee
        const matrixUnits = matrixUnitMap.get(employee.id || '') || []
        const primaryMatrixUnit = matrixUnits[0] // Use the first one as primary

        return {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          fullName: `${employee.firstName} ${employee.lastName}`,
          pictureThumbnail: actualPictureThumbnail,
          jobPositionName: employee.employeePosition?.[0]?.jobPosition?.name || 'Team Member',
          matrixUnitName: primaryMatrixUnit?.matrixUnitName || 'Matrix Team',
          status: 'Available' // Default status - could be enhanced later
        }
      })

      setMatrixTeamMembers(formattedMembers)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch matrix team members'))
      console.error('Error fetching matrix team members:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatrixTeams()
  }, [employeeId, accessToken, structureId])

  return {
    matrixTeamMembers,
    loading,
    error,
    refetch: fetchMatrixTeams
  }
}
