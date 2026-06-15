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

interface EntityCountTeamInput {
  index: number
  memberIds: string[]
}

type EntityCountResponse = Record<string, { aggregate?: { count?: number } }>

/**
 * Builds a single GraphQL query that counts entities for every active team at
 * once (aliased per team index), so selecting N teams triggers one request
 * instead of one request per team.
 */
const buildEntityCountsQuery = (teams: EntityCountTeamInput[]): string => {
  const teamBlocks = teams
    .map(({ index, memberIds }) => {
      const memberIdsJson = JSON.stringify(memberIds)
      const baseWhere = `isDeleted: {_eq: false}
          ownerEmployeeId: {_in: ${memberIdsJson}}`

      return `
      t${index}_leads: LeadAggregate(where: { ${baseWhere} }) { aggregate { count } }
      t${index}_opportunities: OpportunityAggregate(where: { ${baseWhere} }) { aggregate { count } }
      t${index}_accounts: AccountAggregate(where: { ${baseWhere} }) { aggregate { count } }
      t${index}_contacts: ContactAggregate(where: { ${baseWhere} }) { aggregate { count } }`
    })
    .join('\n')

  return `
    query GetTeamEntityCounts {
${teamBlocks}
    }
  `
}

/**
 * Hook to fetch entity counts (leads, opportunities, accounts, contacts) for selected teams.
 *
 * Counts are fetched for ALL selected teams (one batched request), and the chart
 * decides which teams to display. Keying off the selected teams (rather than the
 * "active"/visible set, which updates a render later) avoids a redundant fetch
 * whenever a team is added.
 *
 * @param accessToken - The access token for API authentication
 * @param teamsData - Array of selected team data with member IDs
 */
export const useTeamEntityCounts = (accessToken: string, teamsData: TeamData[]): UseTeamEntityCountsResult => {
  const [entityCounts, setEntityCounts] = useState<TeamEntityCountsPoint[]>([])
  const [teamEntityCounts, setTeamEntityCounts] = useState<TeamEntityCount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEntityCounts = useCallback(async () => {
    if (teamsData.length === 0) {
      setEntityCounts([])
      setTeamEntityCounts([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const teamsToQuery = teamsData
        .map((team, index) => ({ team, index }))
        .filter(entry => entry.team.memberIds.length > 0)

      let response: EntityCountResponse = {}
      if (teamsToQuery.length > 0) {
        const query = buildEntityCountsQuery(
          teamsToQuery.map(entry => ({ index: entry.index, memberIds: entry.team.memberIds }))
        )
        response = await graphqlClient.request<EntityCountResponse>(query)
      }

      const teamCounts: TeamEntityCount[] = teamsData.map((team, index) => ({
        teamId: team.id,
        teamName: team.name,
        color: team.color,
        leads: response[`t${index}_leads`]?.aggregate?.count || 0,
        opportunities: response[`t${index}_opportunities`]?.aggregate?.count || 0,
        accounts: response[`t${index}_accounts`]?.aggregate?.count || 0,
        contacts: response[`t${index}_contacts`]?.aggregate?.count || 0
      }))

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
  }, [accessToken, graphqlClient, teamsData])

  useEffect(() => {
    fetchEntityCounts().catch(() => undefined)
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
