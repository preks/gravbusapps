import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamInfo } from '../types/teamTypes'

const buildTeamsRevenueQuery = (teams: TeamInfo[], currencyCode?: string) => {
  const teamQueries = teams
    .map((team, index) => {
      const alias = `team${index}`
      const currencyFilter = currencyCode ? `currencyRef: { _ilike: "%${currencyCode}" }` : ''
      const currencyWhere = currencyCode ? `, ${currencyFilter}` : ''

      return `
    ${alias}_revenue: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _eq: "WON" } },
      ownerEmployeeId: { _in: $team${index}MemberIds }${currencyWhere}
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    `
    })
    .join('\n')

  const variableDefinitions = teams.map((_, index) => `$team${index}MemberIds: [uuid!]!`).join(', ')

  return `
    query GetAllTeamsRevenue(${variableDefinitions}) {
      ${teamQueries}
    }
  `
}

export interface TeamPerformanceData {
  teamId: string
  totalRevenue: number
  currencyCode: string
}

interface TeamRevenueAggregateData {
  aggregate: {
    sum: { estimatedAmount: number | null }
  }
}

type TeamsRevenueResponse = Record<string, TeamRevenueAggregateData>

export interface UseTeamPerformanceDataProps {
  accessToken: string
  teams: TeamInfo[]
  currencyCode?: string
}

export interface UseTeamPerformanceDataResult {
  teamsData: TeamPerformanceData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useTeamPerformanceData = ({
  accessToken,
  teams,
  currencyCode
}: UseTeamPerformanceDataProps): UseTeamPerformanceDataResult => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [teamsData, setTeamsData] = useState<TeamPerformanceData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTeamPerformanceData = useCallback(async () => {
    if (!accessToken || teams.length === 0) {
      setTeamsData([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const allMemberIds = Array.from(new Set(teams.flatMap(team => team.memberIds)))

      if (allMemberIds.length === 0) {
        setTeamsData(
          teams.map(team => ({
            teamId: team.id,
            totalRevenue: 0,
            currencyCode: currencyCode || 'EUR'
          }))
        )
        setIsLoading(false)
        return
      }

      const query = buildTeamsRevenueQuery(teams, currencyCode)

      const variables: Record<string, string[]> = {}
      teams.forEach((team, index) => {
        variables[`team${index}MemberIds`] = team.memberIds
      })

      const response = await graphqlClient.request<TeamsRevenueResponse>(query, variables)

      const results = teams.map((team, index) => {
        const alias = `team${index}`
        const revenueData = response[`${alias}_revenue`]

        return {
          teamId: team.id,
          totalRevenue: revenueData?.aggregate?.sum?.estimatedAmount || 0,
          currencyCode: currencyCode || 'EUR'
        }
      })

      setTeamsData(results)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team performance data'
      setError(errorMessage)
      setTeamsData([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, teams, currencyCode, graphqlClient])

  useEffect(() => {
    fetchTeamPerformanceData()
  }, [fetchTeamPerformanceData])

  return {
    teamsData,
    isLoading,
    error,
    refetch: fetchTeamPerformanceData
  }
}
