import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamInfo } from '../types/userRoles'

// GraphQL query to get team performance KPIs
const GET_TEAM_PERFORMANCE_DATA = `
  query GetTeamPerformanceData($teamMemberIds: [uuid!]!) {
    # Total revenue from won opportunities
    teamRevenue: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _eq: "WON" } },
      ownerEmployeeId: { _in: $teamMemberIds }
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
        count
      }
    }
    
    # Win rate calculation
    totalOpportunities: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $teamMemberIds }
    }) {
      aggregate {
        count
      }
    }
    
    # Pipeline value (open opportunities)
    pipelineValue: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _nin: ["WON", "LOST"] } },
      ownerEmployeeId: { _in: $teamMemberIds }
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    
    # Total activities count
    totalActivities: SalesActivityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $teamMemberIds }
    }) {
      aggregate {
        count
      }
    }
    
    # Get activity types for scoring calculation
    activityTypes: SalesActivity(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $teamMemberIds }
    }) {
      id
      activityType {
        value
        code
      }
    }
    
    # Get currency from first opportunity
    sampleOpportunity: Opportunity(
      limit: 1,
      where: {
        isDeleted: { _eq: false },
        ownerEmployeeId: { _in: $teamMemberIds }
      }
    ) {
      currencyRef
      currency {
        value
        code
      }
    }
  }
`

export interface TeamPerformanceData {
  teamId: string
  teamName: string
  totalRevenue: number
  winRate: number
  totalActivities: number
  pipelineValue: number
  memberCount: number
  averageRevenuePerMember: number
  averageActivityScore: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
  ranking: number
  currencyCode: string
}

interface TeamPerformanceDataResponse {
  teamRevenue: {
    aggregate: {
      sum: { estimatedAmount: number | null }
      count: number
    }
  }
  totalOpportunities: {
    aggregate: { count: number }
  }
  pipelineValue: {
    aggregate: {
      sum: { estimatedAmount: number | null }
    }
  }
  totalActivities: {
    aggregate: { count: number }
  }
  activityTypes: Array<{
    id: string
    activityType: {
      value: string
      code: string
    } | null
  }>
  sampleOpportunity: Array<{
    currencyRef: string | null
    currency: { value: string; code: string } | null
  }>
}

export interface UseTeamPerformanceDataProps {
  accessToken: string
  teams: TeamInfo[]
}

export interface UseTeamPerformanceDataResult {
  teamsData: TeamPerformanceData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useTeamPerformanceData = ({
  accessToken,
  teams
}: UseTeamPerformanceDataProps): UseTeamPerformanceDataResult => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [teamsData, setTeamsData] = useState<TeamPerformanceData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Helper function to extract currency code
  const extractCurrencyCode = useCallback((currencyRef: string | null, currencyObj: any): string => {
    if (currencyObj?.code) {
      return currencyObj.code
    }
    if (currencyRef) {
      return currencyRef.split(':').pop() || 'EUR'
    }
    return 'EUR'
  }, [])

  // Helper function to calculate average activity score based on activity types
  const calculateAverageActivityScore = useCallback(
    (activityTypes: Array<{ id: string; activityType: { value: string; code: string } | null }>): number => {
      if (activityTypes.length === 0) return 0

      // Scoring system based on activity types
      const getActivityScore = (activityType: string): number => {
        const type = activityType.toLowerCase()
        if (type.includes('meeting') || type.includes('demo')) return 5
        if (type.includes('call') || type.includes('phone')) return 4
        if (type.includes('email') || type.includes('message')) return 2
        if (type.includes('task') || type.includes('follow')) return 3
        return 1 // Default score
      }

      const totalScore = activityTypes.reduce((acc, activity) => {
        const activityTypeValue = activity.activityType?.value || activity.activityType?.code || 'task'
        return acc + getActivityScore(activityTypeValue)
      }, 0)

      return Math.round(totalScore / activityTypes.length)
    },
    []
  )

  const fetchTeamPerformanceData = useCallback(async () => {
    if (!accessToken || teams.length === 0) {
      setTeamsData([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch performance data for each team
      const teamPromises = teams.map(async team => {
        if (team.memberIds.length === 0) {
          // Return empty data for teams with no members
          return {
            teamId: team.id,
            teamName: team.name,
            totalRevenue: 0,
            winRate: 0,
            totalActivities: 0,
            pipelineValue: 0,
            memberCount: team.memberCount,
            averageRevenuePerMember: 0,
            averageActivityScore: 0,
            trend: 'stable' as const,
            trendPercentage: 0,
            ranking: 0,
            currencyCode: 'EUR'
          }
        }

        const response = await graphqlClient.request<TeamPerformanceDataResponse>(GET_TEAM_PERFORMANCE_DATA, {
          teamMemberIds: team.memberIds
        })

        // Extract data from response
        const totalRevenue = response.teamRevenue?.aggregate?.sum?.estimatedAmount || 0
        const wonOpportunities = response.teamRevenue?.aggregate?.count || 0
        const totalOpportunities = response.totalOpportunities?.aggregate?.count || 0
        const pipelineValue = response.pipelineValue?.aggregate?.sum?.estimatedAmount || 0
        const totalActivities = response.totalActivities?.aggregate?.count || 0
        const averageActivityScore = calculateAverageActivityScore(response.activityTypes || [])

        // Calculate win rate
        const winRate = totalOpportunities > 0 ? Math.round((wonOpportunities / totalOpportunities) * 100) : 0

        // Calculate revenue per member
        const averageRevenuePerMember = team.memberCount > 0 ? totalRevenue / team.memberCount : 0

        // Get currency
        const sampleOpp = response.sampleOpportunity?.[0]
        const currencyCode = extractCurrencyCode(sampleOpp?.currencyRef, sampleOpp?.currency)

        // Calculate trend (placeholder for now - could be enhanced with historical data)
        const trend: 'up' | 'down' | 'stable' = totalRevenue > 0 ? 'up' : totalActivities > 0 ? 'stable' : 'down'
        const trendPercentage = totalRevenue > 0 ? 5.2 : 0 // Placeholder trend

        return {
          teamId: team.id,
          teamName: team.name,
          totalRevenue,
          winRate,
          totalActivities,
          pipelineValue,
          memberCount: team.memberCount,
          averageRevenuePerMember,
          averageActivityScore,
          trend,
          trendPercentage,
          ranking: 0, // Will be calculated after sorting
          currencyCode
        }
      })

      const results = await Promise.all(teamPromises)

      // Sort by total revenue and assign rankings
      const sortedResults = results
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((team, index) => ({
          ...team,
          ranking: index + 1
        }))

      setTeamsData(sortedResults)

      console.log('Team performance data loaded:', sortedResults.length, 'teams')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team performance data'
      console.error('Error fetching team performance data:', err)
      setError(errorMessage)
      setTeamsData([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, teams, graphqlClient, extractCurrencyCode, calculateAverageActivityScore])

  // Fetch data when dependencies change
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
