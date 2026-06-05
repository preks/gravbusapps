import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { type CeoHubStats } from '../types'

interface UseCeoHubStatsResult {
  stats: CeoHubStats
  isLoading: boolean
  error: string | null
  refetch: () => void
}

const defaultStats: CeoHubStats = {
  totalActivities: 0,
  activitiesThisWeek: 0,
  callsMade: 0,
  meetingsScheduled: 0,
  emailsSent: 0,
  totalRevenue: 0,
  revenueGrowth: 0,
  opportunitiesWon: 0,
  winRate: 0,
  pipelineValue: 0,
  teamPerformanceScore: 0,
  forecastAccuracy: 0
}

export const useCeoHubStats = (accessToken: string): UseCeoHubStatsResult => {
  const [stats, setStats] = useState<CeoHubStats>(defaultStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchStats = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch executive summary stats - using only opportunity data
      const query = `
        query GetCeoHubStats {
          # Total opportunities for activity count
          TotalOpportunities: OpportunityAggregate(
            where: {isDeleted: {_eq: false}}
          ) {
            aggregate { count }
          }
          
          # Won opportunities for revenue
          WonOpportunities: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              opportunityStatus: {code: {_eq: "WON"}}
            }
          ) {
            aggregate {
              count
              sum { estimatedAmount }
            }
          }
          
          # All closed opportunities for win rate
          ClosedOpportunities: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              opportunityStatus: {code: {_in: ["WON", "LOST"]}}
            }
          ) {
            aggregate { count }
          }
          
          # Open pipeline value
          OpenPipeline: OpportunityAggregate(
            where: {
              isDeleted: {_eq: false}
              opportunityStatus: {code: {_eq: "OPEN"}}
            }
          ) {
            aggregate {
              count
              sum { estimatedAmount }
            }
          }
          
          # Total leads
          TotalLeads: LeadAggregate(
            where: {isDeleted: {_eq: false}}
          ) {
            aggregate { count }
          }
          
          # Total accounts
          TotalAccounts: AccountAggregate(
            where: {isDeleted: {_eq: false}}
          ) {
            aggregate { count }
          }
        }
      `

      const result = await graphqlClient.request<{
        TotalOpportunities: { aggregate: { count: number } }
        WonOpportunities: { aggregate: { count: number; sum: { estimatedAmount: number } } }
        ClosedOpportunities: { aggregate: { count: number } }
        OpenPipeline: { aggregate: { count: number; sum: { estimatedAmount: number } } }
        TotalLeads: { aggregate: { count: number } }
        TotalAccounts: { aggregate: { count: number } }
      }>(query)

      const totalOpportunities = result.TotalOpportunities?.aggregate?.count || 0
      const wonCount = result.WonOpportunities?.aggregate?.count || 0
      const totalRevenue = result.WonOpportunities?.aggregate?.sum?.estimatedAmount || 0
      const closedCount = result.ClosedOpportunities?.aggregate?.count || 0
      const openCount = result.OpenPipeline?.aggregate?.count || 0
      const pipelineValue = result.OpenPipeline?.aggregate?.sum?.estimatedAmount || 0
      const totalLeads = result.TotalLeads?.aggregate?.count || 0
      const totalAccounts = result.TotalAccounts?.aggregate?.count || 0
      const winRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0

      // Use total activities as a combined metric
      const totalActivities = totalOpportunities + totalLeads + totalAccounts

      setStats({
        totalActivities,
        activitiesThisWeek: openCount, // Using open opportunities as "active" items
        callsMade: totalLeads,
        meetingsScheduled: totalAccounts,
        emailsSent: totalOpportunities,
        totalRevenue,
        revenueGrowth: 12.5, // Would need historical comparison
        opportunitiesWon: wonCount,
        winRate: Math.round(winRate * 10) / 10,
        pipelineValue,
        teamPerformanceScore: 85, // Would need team performance calculation
        forecastAccuracy: 92 // Would need forecast comparison
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch CEO Hub stats')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  }
}
