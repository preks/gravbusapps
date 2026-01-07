import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { TeamInfo } from '../types/userRoles'

// Helper function to build optimized query with aliases for each team AND get available currencies
const buildTeamsPerformanceQuery = (teams: TeamInfo[], currencyCode?: string) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const teamQueries = teams
    .map((team, index) => {
      const alias = `team${index}`
      const currencyFilter = currencyCode ? `currencyRef: { _ilike: "%${currencyCode}" }` : ''
      const currencyWhere = currencyCode ? `, ${currencyFilter}` : ''

      return `
    # Team: ${team.name}
    # Current Data
    ${alias}_revenue: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _eq: "WON" } },
      ownerEmployeeId: { _in: $team${index}MemberIds }${currencyWhere}
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
        count
      }
    }
    
    ${alias}_totalOpps: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $team${index}MemberIds }${currencyWhere}
    }) {
      aggregate {
        count
      }
    }
    
    ${alias}_pipeline: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _nin: ["WON", "LOST"] } },
      ownerEmployeeId: { _in: $team${index}MemberIds }${currencyWhere}
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    
    ${alias}_activities: SalesActivityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $team${index}MemberIds }
    }) {
      aggregate {
        count
      }
    }
    
    ${alias}_activityTypes: SalesActivity(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $team${index}MemberIds }
    }) {
      activityTypeRef
      activityType {
        value
      }
    }
    
    # Historical Data (30 days ago)
    ${alias}_revenue_30d: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _eq: "WON" } },
      ownerEmployeeId: { _in: $team${index}MemberIds }${currencyWhere},
      closeDate: { _lte: "${thirtyDaysAgo}" }
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
        count
      }
    }
    
    ${alias}_totalOpps_30d: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $team${index}MemberIds }${currencyWhere},
      createdAt: { _lte: "${thirtyDaysAgo}" }
    }) {
      aggregate {
        count
      }
    }
    
    ${alias}_pipeline_30d: OpportunityAggregate(where: {
      isDeleted: { _eq: false },
      opportunityStatus: { code: { _nin: ["WON", "LOST"] } },
      ownerEmployeeId: { _in: $team${index}MemberIds }${currencyWhere},
      createdAt: { _lte: "${thirtyDaysAgo}" }
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    
    ${alias}_activities_30d: SalesActivityAggregate(where: {
      isDeleted: { _eq: false },
      ownerEmployeeId: { _in: $team${index}MemberIds },
      createdAt: { _lte: "${thirtyDaysAgo}" }
    }) {
      aggregate {
        count
      }
    }
    `
    })
    .join('\n')

  const variableDefinitions = teams.map((_, index) => `$team${index}MemberIds: [uuid!]!`).join(', ')

  return `
    query GetAllTeamsPerformanceData(${variableDefinitions}) {
      ${teamQueries}
    }
  `
}

export interface ActivityTypeBreakdown {
  type: string
  count: number
}

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
  // Historical comparisons (30-day percentage changes)
  revenueChange: number
  winRateChange: number
  pipelineChange: number
  activitiesChange: number
  // Activity types breakdown
  activityTypesBreakdown: ActivityTypeBreakdown[]
}

interface TeamAggregateData {
  aggregate: {
    sum: { estimatedAmount: number | null }
    count: number
  }
}

interface TeamCountData {
  aggregate: {
    count: number
  }
}

type AllTeamsPerformanceDataResponse = Record<string, TeamAggregateData | TeamCountData>

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

  const fetchTeamPerformanceData = useCallback(async () => {
    if (!accessToken || teams.length === 0) {
      setTeamsData([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Collect all member IDs from all teams
      const allMemberIds = Array.from(new Set(teams.flatMap(team => team.memberIds)))

      if (allMemberIds.length === 0) {
        setTeamsData(
          teams.map((team, index) => ({
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
            ranking: index + 1,
            currencyCode: 'EUR',
            revenueChange: 0,
            winRateChange: 0,
            pipelineChange: 0,
            activitiesChange: 0,
            activityTypesBreakdown: []
          }))
        )
        setIsLoading(false)
        return
      }

      // Build dynamic query with aliases for each team
      const query = buildTeamsPerformanceQuery(teams, currencyCode)

      // Build variables object with each team's member IDs
      const variables: Record<string, any> = {}
      teams.forEach((team, index) => {
        variables[`team${index}MemberIds`] = team.memberIds
      })

      // Fetch ALL data in a SINGLE GraphQL query with AGGREGATES
      const response = await graphqlClient.request<AllTeamsPerformanceDataResponse>(query, variables)

      // Process data for each team from aliased responses
      const results = teams.map((team, index) => {
        const alias = `team${index}`

        // Extract current aggregated data for this team
        const revenueData = response[`${alias}_revenue`] as TeamAggregateData
        const totalOppsData = response[`${alias}_totalOpps`] as TeamCountData
        const pipelineData = response[`${alias}_pipeline`] as TeamAggregateData
        const activitiesData = response[`${alias}_activities`] as TeamCountData
        const activityTypesData =
          (response[`${alias}_activityTypes`] as unknown as Array<{
            activityTypeRef: string
            activityType: { value: string } | null
          }>) || []

        // Extract historical data (30 days ago)
        const revenueData30d = response[`${alias}_revenue_30d`] as TeamAggregateData
        const totalOppsData30d = response[`${alias}_totalOpps_30d`] as TeamCountData
        const pipelineData30d = response[`${alias}_pipeline_30d`] as TeamAggregateData
        const activitiesData30d = response[`${alias}_activities_30d`] as TeamCountData

        // Extract current metrics
        const totalRevenue = revenueData?.aggregate?.sum?.estimatedAmount || 0
        const wonOpportunitiesCount = revenueData?.aggregate?.count || 0
        const totalOpportunities = totalOppsData?.aggregate?.count || 0
        const pipelineValue = pipelineData?.aggregate?.sum?.estimatedAmount || 0
        const totalActivities = activitiesData?.aggregate?.count || 0

        // Extract historical metrics
        const totalRevenue30d = revenueData30d?.aggregate?.sum?.estimatedAmount || 0
        const wonOpportunitiesCount30d = revenueData30d?.aggregate?.count || 0
        const totalOpportunities30d = totalOppsData30d?.aggregate?.count || 0
        const pipelineValue30d = pipelineData30d?.aggregate?.sum?.estimatedAmount || 0
        const totalActivities30d = activitiesData30d?.aggregate?.count || 0

        // Calculate win rate (current and 30d ago)
        const winRate = totalOpportunities > 0 ? Math.round((wonOpportunitiesCount / totalOpportunities) * 100) : 0

        const winRate30d =
          totalOpportunities30d > 0 ? Math.round((wonOpportunitiesCount30d / totalOpportunities30d) * 100) : 0

        // Calculate revenue per member
        const averageRevenuePerMember = team.memberCount > 0 ? totalRevenue / team.memberCount : 0

        // Calculate percentage changes for all metrics
        const calculatePercentageChange = (current: number, previous: number): number => {
          if (previous === 0) {
            return current > 0 ? 100 : 0
          }
          return ((current - previous) / previous) * 100
        }

        // Calculate trends based on 30-day comparison
        const revenueChange = calculatePercentageChange(totalRevenue, totalRevenue30d)
        const winRateChange = calculatePercentageChange(winRate, winRate30d)
        const pipelineChange = calculatePercentageChange(pipelineValue, pipelineValue30d)
        const activitiesChange = calculatePercentageChange(totalActivities, totalActivities30d)

        // Overall trend based on primary metric (revenue)
        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (revenueChange > 5) {
          trend = 'up'
        } else if (revenueChange < -5) {
          trend = 'down'
        }

        const trendPercentage = Math.abs(revenueChange)

        // Aggregate activity types
        const activityTypesMap = new Map<string, number>()
        activityTypesData?.forEach(activity => {
          const activityType = activity.activityType?.value || 'Unknown'
          activityTypesMap.set(activityType, (activityTypesMap.get(activityType) || 0) + 1)
        })

        const activityTypesBreakdown: ActivityTypeBreakdown[] = Array.from(activityTypesMap.entries()).map(
          ([type, count]) => ({ type, count })
        )

        // For activity score, we use a simple calculation based on total activities
        const averageActivityScore =
          totalActivities > 0 ? Math.min(Math.round(totalActivities / team.memberCount), 10) : 0

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
          currencyCode: currencyCode || 'EUR',
          // Historical comparisons (30-day changes)
          revenueChange,
          winRateChange,
          pipelineChange,
          activitiesChange,
          // Activity types breakdown from real data
          activityTypesBreakdown
        }
      })

      // Sort by total revenue and assign rankings
      const sortedResults = results
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((team, index) => ({
          ...team,
          ranking: index + 1
        }))

      setTeamsData(sortedResults)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch team performance data'
      setError(errorMessage)
      setTeamsData([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, teams, currencyCode, graphqlClient, extractCurrencyCode])

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
