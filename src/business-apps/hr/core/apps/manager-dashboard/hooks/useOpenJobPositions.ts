import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { JobPosition } from '@/business-apps/hr/core/apps/human-resources/components/views/job-position-view/hooks/useJobPositionListData'
import { filterEmployeesByStartedEmployment } from '../utils/hireDateFilters'

// Re-export JobPosition for use in ManagerDashboard
export type { JobPosition }

// Legacy interface for backwards compatibility (simplified display)
export interface OpenJobPosition {
  id: string
  name: string
  organizationalUnitId?: string
  organizationalUnitName?: string
  jobFunctionName?: string
  jobLevelName?: string
  contractType?: string
  employmentType?: string
}

export interface UseOpenJobPositionsResult {
  openPositions: OpenJobPosition[]
  /** Full JobPosition data for use with JobPositionDetails component */
  fullPositions: JobPosition[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseOpenJobPositionsProps {
  accessToken: string
  managerId: string
}

/**
 * Hook to fetch open/vacant job positions in the manager's team.
 * Uses the same query pattern as platform/hr/workforce-management?view=positions
 * A position is considered "open/vacant" if it has no employee assigned (employeeId is null).
 */
export const useOpenJobPositions = ({
  accessToken,
  managerId
}: UseOpenJobPositionsProps): UseOpenJobPositionsResult => {
  const [openPositions, setOpenPositions] = useState<OpenJobPosition[]>([])
  const [fullPositions, setFullPositions] = useState<JobPosition[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)
  const structureId = getCurrentActiveStructureId()

  const fetchOpenPositions = useCallback(async () => {
    if (!managerId || !accessToken || !structureId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Step 1: Get the organizational unit IDs where the manager's direct reports work
      // This tells us which org units the manager supervises
      const getOrgUnitsQuery = `
        query GetManagerOrgUnits($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
          ) {
            workingCondition {
              hireDate
            }
            employeePosition {
              organizationalUnitId
              organizationalUnit {
                id
                name
              }
            }
          }
        }
      `

      const orgUnitsResponse = await graphQLClient.request(getOrgUnitsQuery, {
        managerId
      })

      // Extract unique org unit IDs from direct reports
      const orgUnitIds: string[] = []
      if (orgUnitsResponse?.Employee) {
        const activeEmployees = filterEmployeesByStartedEmployment(orgUnitsResponse.Employee)
        activeEmployees.forEach((emp: any) => {
          const orgUnitId = emp.employeePosition?.organizationalUnitId
          if (orgUnitId && !orgUnitIds.includes(orgUnitId)) {
            orgUnitIds.push(orgUnitId)
          }
        })
      }

      if (orgUnitIds.length === 0) {
        // No org units found for this manager
        setOpenPositions([])
        setLoading(false)
        return
      }

      // Step 2: Query vacant positions using the SAME pattern as human-resources
      // Key: employeeId: { _isNull: true } means vacant positions
      // Fetching all fields needed by JobPositionDetails component
      const vacantPositionsQuery = `
        query GetVacantPositions(
          $structureId: uuid!,
          $orgUnitIds: [uuid!]!
        ) {
          JobPosition(
            where: {
              _and: [
                {
                  organizationalUnitEmployees: {
                    structureId: { _eq: $structureId },
                    employeeId: { _isNull: true }
                  }
                },
                { isDeleted: { _eq: false } },
                {
                  organizationalUnitEmployees: {
                    organizationalUnitId: { _in: $orgUnitIds }
                  }
                },
                {
                  _or: [
                    { activeTo: { _isNull: true } },
                    { activeTo: { _gte: "${new Date().toISOString()}" } }
                  ]
                }
              ]
            }
            orderBy: [{ name: ASC }]
            limit: 50
          ) {
            id
            name
            activeTo
            jobFunction { 
              id
              name 
              jobFamily {
                id
                code
              }
            }
            jobLevel { 
              id
              name 
            }
            jobProfile {
              id
              name
            }
            contractType { 
              id
              code
              value
              catalogId
              translations {
                id
                value
                localeCode
              }
            }
            employmentType { 
              id
              code
              value
              catalogId
              translations {
                id
                value
                localeCode
              }
            }
            organizationalUnitEmployees {
              organizationalUnitId
              organizationalUnit { 
                id 
                name 
              }
            }
            employeePositions {
              firstName
              lastName
              employeeId
              employee {
                pictureThumbnail
              }
              supervisor {
                id
                firstName
                lastName
                pictureThumbnail
              }
            }
          }
        }
      `

      const positionsResponse = await graphQLClient.request(vacantPositionsQuery, {
        structureId,
        orgUnitIds
      })

      if (positionsResponse?.JobPosition) {
        // Store full positions for JobPositionDetails component
        const fullPositionsData: JobPosition[] = positionsResponse.JobPosition.map((pos: any) => ({
          id: pos.id,
          name: pos.name,
          activeTo: pos.activeTo || null,
          jobFunction: pos.jobFunction || null,
          jobLevel: pos.jobLevel || null,
          jobProfile: pos.jobProfile || null,
          contractType: pos.contractType || null,
          employmentType: pos.employmentType || null,
          organizationalUnitEmployees: pos.organizationalUnitEmployees || [],
          // Open positions in this query are intentionally vacant.
          // Keep details view consistent by forcing no assignee in this context.
          employeePositions: []
        }))
        setFullPositions(fullPositionsData)

        // Create simplified positions for table display
        const positions: OpenJobPosition[] = positionsResponse.JobPosition.map((pos: any) => {
          // Find the org unit that matches the manager's org units
          const matchingOrgUnit = pos.organizationalUnitEmployees?.find((oue: any) =>
            orgUnitIds.includes(oue.organizationalUnitId)
          )
          const orgUnit =
            matchingOrgUnit?.organizationalUnit || pos.organizationalUnitEmployees?.[0]?.organizationalUnit

          return {
            id: pos.id,
            name: pos.name,
            organizationalUnitId: orgUnit?.id,
            organizationalUnitName: orgUnit?.name,
            jobFunctionName: pos.jobFunction?.name,
            jobLevelName: pos.jobLevel?.name,
            contractType: pos.contractType?.value,
            employmentType: pos.employmentType?.value
          }
        })

        setOpenPositions(positions)
      } else {
        setOpenPositions([])
        setFullPositions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch open job positions'))
      console.error('Error fetching open job positions:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, managerId, graphQLClient, structureId])

  useEffect(() => {
    fetchOpenPositions()
  }, [fetchOpenPositions])

  return {
    openPositions,
    fullPositions,
    loading,
    error,
    refetch: fetchOpenPositions
  }
}
