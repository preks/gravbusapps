import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface OpenPosition {
  id: string
  name: string
  departmentName?: string
  jobFunctionName?: string
}

interface UseOpenPositionsProps {
  accessToken: string
  managerId: string
}

interface UseOpenPositionsResult {
  openPositions: OpenPosition[]
  count: number
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook to fetch open (vacant) job positions for the manager's department
 */
export const useOpenPositions = ({ accessToken, managerId }: UseOpenPositionsProps): UseOpenPositionsResult => {
  const [openPositions, setOpenPositions] = useState<OpenPosition[]>([])
  const [loading, setLoading] = useState(true)
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
      // First get the manager's organizational unit
      const managerOrgUnitQuery = `
        query GetManagerOrgUnit($managerId: uuid!) {
          Employee(where: { id: { _eq: $managerId }, isDeleted: { _eq: false } }) {
            id
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

      const managerResponse = await graphQLClient.request(managerOrgUnitQuery, { managerId })
      const orgUnitId = managerResponse?.Employee?.[0]?.employeePosition?.[0]?.organizationalUnitId

      if (!orgUnitId) {
        setOpenPositions([])
        setLoading(false)
        return
      }

      // Get vacant job positions for this org unit
      const openPositionsQuery = `
        query GetOpenPositions($structureId: uuid!, $orgUnitId: uuid!) {
          JobPosition(
            where: {
              isDeleted: { _eq: false },
              organizationalUnitEmployees: {
                structureId: { _eq: $structureId },
                employeeId: { _isNull: true },
                organizationalUnit: { id: { _eq: $orgUnitId } }
              },
              _or: [
                { activeTo: { _isNull: true } },
                { activeTo: { _gte: "now()" } }
              ]
            }
            limit: 10
          ) {
            id
            name
            jobFunction {
              name
            }
            organizationalUnitEmployees {
              organizationalUnit {
                name
              }
            }
          }
        }
      `

      const response = await graphQLClient.request(openPositionsQuery, {
        structureId,
        orgUnitId
      })

      if (response?.JobPosition) {
        const positions: OpenPosition[] = response.JobPosition.map((pos: any) => ({
          id: pos.id,
          name: pos.name,
          departmentName: pos.organizationalUnitEmployees?.[0]?.organizationalUnit?.name,
          jobFunctionName: pos.jobFunction?.name
        }))

        setOpenPositions(positions)
      } else {
        setOpenPositions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch open positions'))
      console.error('Error fetching open positions:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, structureId, graphQLClient])

  useEffect(() => {
    fetchOpenPositions()
  }, [fetchOpenPositions])

  return {
    openPositions,
    count: openPositions.length,
    loading,
    error,
    refetch: fetchOpenPositions
  }
}
