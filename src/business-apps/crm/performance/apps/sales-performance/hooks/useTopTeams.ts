import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { type TopTeam } from '../types'

interface UseTopTeamsResult {
  topTeams: TopTeam[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

interface OrganizationalUnitEmployee {
  employeeId: string
  employee: {
    id: string
    displayName: string
    picture: string | null
    pictureThumbnail: string | null
  } | null
}

interface OrganizationalUnit {
  id: string
  name: string
  organizationalUnitEmployee: OrganizationalUnitEmployee[]
}

// Sales Associate capability name for filtering
const SALES_ASSOCIATE_CAPABILITY = 'Sales Associate'

// Build teams query using central EMPLOYEE_REF fragment - filtered to Sales Associate capability
const buildTeamsWithMembersQuery = (): string => `
  query GetTeamsWithMembers($structureId: uuid!) {
    OrganizationalUnit(
      where: {
        isDeleted: {_eq: false}
        structureId: {_eq: $structureId}
        type: {_in: ["TEAM", "DEPARTMENT", "UNIT"]}
        organizationalUnitEmployee: {
          employee: {
            isDeleted: {_eq: false}
            employeePosition: {
              employeeCapabilities: {
                capability: {
                  name: {_eq: "${SALES_ASSOCIATE_CAPABILITY}"}
                }
              }
            }
          }
        }
      }
    ) {
      id
      name
      organizationalUnitEmployee(
        where: {
          employee: {
            isDeleted: {_eq: false}
            employeePosition: {
              employeeCapabilities: {
                capability: {
                  name: {_eq: "${SALES_ASSOCIATE_CAPABILITY}"}
                }
              }
            }
          }
        }
      ) {
        employeeId
        employee {
          ${EMPLOYEE_REF}
        }
      }
    }
  }
`

// Build opportunities query for team members with optional currency filter
const buildWonOpportunitiesQuery = (selectedCurrencyId?: string): string => {
  const currencyFilter = selectedCurrencyId ? `currencyRef: {_eq: "${selectedCurrencyId}"}` : ''
  const baseWhere = `isDeleted: {_eq: false}${currencyFilter ? '\n        ' + currencyFilter : ''}`

  return `
  query GetWonOpportunitiesForMembers($memberIds: [uuid!]!) {
    Opportunity(
      where: {
        ${baseWhere}
        opportunityStatus: {code: {_eq: "WON"}}
        ownerEmployeeId: {_in: $memberIds}
        estimatedAmount: {_isNull: false}
      }
    ) {
      id
      estimatedAmount
      currencyRef
      ownerEmployeeId
    }
  }
`
}

/**
 * Hook to fetch top 5 teams (business units) by revenue generated
 * Revenue is calculated from opportunities with status WON owned by team members
 * Uses central EMPLOYEE_REF fragment for consistent employee data
 *
 * @param accessToken - The access token for API authentication
 * @param limit - Maximum number of teams to return
 * @param selectedCurrencyId - Optional currency ID to filter by (e.g., "Currency:v1:EUR")
 */
export const useTopTeams = (accessToken: string, limit: number = 5, selectedCurrencyId?: string): UseTopTeamsResult => {
  const [topTeams, setTopTeams] = useState<TopTeam[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const structureId = getCurrentActiveStructureId()

  const fetchTopTeams = useCallback(async () => {
    if (!accessToken || !structureId) {
      setError('Access token and structure ID are required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // First, get all teams with their members using central fragment
      const teamsQuery = buildTeamsWithMembersQuery()

      const teamsResult = await graphqlClient.request<{
        OrganizationalUnit: OrganizationalUnit[]
      }>(teamsQuery, { structureId })

      const teams = teamsResult.OrganizationalUnit || []

      if (teams.length === 0) {
        setTopTeams([])
        setIsLoading(false)
        return
      }

      // Collect all member IDs for bulk query
      const allMemberIds = new Set<string>()
      teams.forEach(team => {
        team.organizationalUnitEmployee.forEach(emp => {
          if (emp.employee) {
            allMemberIds.add(emp.employeeId)
          }
        })
      })

      if (allMemberIds.size === 0) {
        setTopTeams([])
        setIsLoading(false)
        return
      }

      // Fetch all won opportunities for all members
      const opportunitiesQuery = buildWonOpportunitiesQuery(selectedCurrencyId)

      const oppsResult = await graphqlClient.request<{
        Opportunity: Array<{
          id: string
          estimatedAmount: number
          currencyRef: string
          ownerEmployeeId: string
        }>
      }>(opportunitiesQuery, { memberIds: Array.from(allMemberIds) })

      const opportunities = oppsResult.Opportunity || []

      // Create a map of employeeId to their revenue
      const employeeRevenue = new Map<string, { revenue: number; opportunitiesWon: number; currencyCode: string }>()
      opportunities.forEach(opp => {
        const existing = employeeRevenue.get(opp.ownerEmployeeId)
        const currencyCode = opp.currencyRef?.split(':').pop() || 'EUR'

        if (existing) {
          existing.revenue += opp.estimatedAmount
          existing.opportunitiesWon += 1
        } else {
          employeeRevenue.set(opp.ownerEmployeeId, {
            revenue: opp.estimatedAmount,
            opportunitiesWon: 1,
            currencyCode
          })
        }
      })

      // Calculate team totals
      const teamPerformance: TopTeam[] = teams.map(team => {
        let totalRevenue = 0
        let totalOpportunitiesWon = 0
        let currencyCode = 'EUR'

        team.organizationalUnitEmployee.forEach(emp => {
          const empData = employeeRevenue.get(emp.employeeId)
          if (empData) {
            totalRevenue += empData.revenue
            totalOpportunitiesWon += empData.opportunitiesWon
            currencyCode = empData.currencyCode
          }
        })

        return {
          id: team.id,
          name: team.name,
          revenue: totalRevenue,
          opportunitiesWon: totalOpportunitiesWon,
          memberCount: team.organizationalUnitEmployee.filter(emp => emp.employee !== null).length,
          currencyCode
        }
      })

      // Sort by revenue and take top teams
      const sortedTeams = teamPerformance
        .filter(team => team.revenue > 0) // Only teams with revenue
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit)

      setTopTeams(sortedTeams)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch top teams'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, structureId, limit, selectedCurrencyId])

  useEffect(() => {
    void fetchTopTeams()
  }, [fetchTopTeams])

  return {
    topTeams,
    isLoading,
    error,
    refetch: () => void fetchTopTeams()
  }
}
