import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { type TeamEntityCountsPoint, TEAM_COLORS } from '../types'

interface TeamEntityCount {
  teamId: string
  teamName: string
  color: string
  leads: number
  opportunities: number
  accounts: number
  contacts: number
}

interface UseTeamEntityCountsResult {
  entityCounts: TeamEntityCountsPoint[]
  teamEntityCounts: TeamEntityCount[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

interface TeamData {
  id: string
  name: string
  memberIds: string[]
  color: string
}

/**
 * Builds GraphQL query to count entities owned by team members
 */
const buildEntityCountsQuery = (memberIds: string[]): string => {
  const memberIdsJson = JSON.stringify(memberIds)

  return `
    query GetTeamEntityCounts {
      leads: LeadAggregate(
        where: {
          isDeleted: {_eq: false}
          ownerEmployeeId: {_in: ${memberIdsJson}}
        }
      ) {
        aggregate {
          count
        }
      }
      opportunities: OpportunityAggregate(
        where: {
          isDeleted: {_eq: false}
          ownerEmployeeId: {_in: ${memberIdsJson}}
        }
      ) {
        aggregate {
          count
        }
      }
      accounts: AccountAggregate(
        where: {
          isDeleted: {_eq: false}
          ownerEmployeeId: {_in: ${memberIdsJson}}
        }
      ) {
        aggregate {
          count
        }
      }
      contacts: ContactAggregate(
        where: {
          isDeleted: {_eq: false}
          ownerEmployeeId: {_in: ${memberIdsJson}}
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Hook to fetch entity counts (leads, opportunities, accounts, contacts) for selected teams
 *
 * @param accessToken - The access token for API authentication
 * @param teamsData - Array of team data with member IDs
 * @param selectedTeamIds - Array of selected team IDs
 * @param activeTeamIds - Set of team IDs that should be visible in the chart
 */
export const useTeamEntityCounts = (
  accessToken: string,
  teamsData: TeamData[],
  selectedTeamIds: string[],
  activeTeamIds: Set<string>
): UseTeamEntityCountsResult => {
  const [entityCounts, setEntityCounts] = useState<TeamEntityCountsPoint[]>([])
  const [teamEntityCounts, setTeamEntityCounts] = useState<TeamEntityCount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEntityCounts = useCallback(async () => {
    // Only fetch if we have active teams
    const activeTeamsList = teamsData.filter(team => activeTeamIds.has(team.id))

    if (activeTeamsList.length === 0) {
      setEntityCounts([])
      setTeamEntityCounts([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const teamCounts: TeamEntityCount[] = []

      // Fetch entity counts for each active team
      for (let i = 0; i < activeTeamsList.length; i++) {
        const team = activeTeamsList[i]

        if (team.memberIds.length === 0) {
          teamCounts.push({
            teamId: team.id,
            teamName: team.name,
            color: team.color,
            leads: 0,
            opportunities: 0,
            accounts: 0,
            contacts: 0
          })
          continue
        }

        const query = buildEntityCountsQuery(team.memberIds)
        const result = await graphqlClient.request<{
          leads: { aggregate: { count: number } }
          opportunities: { aggregate: { count: number } }
          accounts: { aggregate: { count: number } }
          contacts: { aggregate: { count: number } }
        }>(query)

        teamCounts.push({
          teamId: team.id,
          teamName: team.name,
          color: team.color,
          leads: result.leads.aggregate.count || 0,
          opportunities: result.opportunities.aggregate.count || 0,
          accounts: result.accounts.aggregate.count || 0,
          contacts: result.contacts.aggregate.count || 0
        })
      }

      setTeamEntityCounts(teamCounts)

      // Transform to chart data format - each entity type as a data point with team values
      const chartData: TeamEntityCountsPoint[] = [
        {
          entity: 'Leads',
          ...Object.fromEntries(teamCounts.map(t => [t.teamId, t.leads]))
        },
        {
          entity: 'Opportunities',
          ...Object.fromEntries(teamCounts.map(t => [t.teamId, t.opportunities]))
        },
        {
          entity: 'Accounts',
          ...Object.fromEntries(teamCounts.map(t => [t.teamId, t.accounts]))
        },
        {
          entity: 'Contacts',
          ...Object.fromEntries(teamCounts.map(t => [t.teamId, t.contacts]))
        }
      ]

      setEntityCounts(chartData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entity counts')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, teamsData, activeTeamIds])

  useEffect(() => {
    void fetchEntityCounts()
  }, [fetchEntityCounts])

  return {
    entityCounts,
    teamEntityCounts,
    isLoading,
    error,
    refetch: fetchEntityCounts
  }
}

/**
 * Prepares team data from organizational units for the entity counts hook
 */
export const prepareTeamsDataForEntityCounts = (
  selectedTeamIds: string[],
  teamsData: Array<{
    id: string
    name: string
    organizationalUnitEmployee: Array<{
      employeeId: string
      employee: { id: string } | null
    }>
  }>
): TeamData[] => {
  return selectedTeamIds.map((teamId, index) => {
    const team = teamsData.find(t => t.id === teamId)
    return {
      id: teamId,
      name: team?.name || 'Unknown Team',
      memberIds: team?.organizationalUnitEmployee.filter(e => e.employee).map(e => e.employeeId) || [],
      color: TEAM_COLORS[index % TEAM_COLORS.length]
    }
  })
}
