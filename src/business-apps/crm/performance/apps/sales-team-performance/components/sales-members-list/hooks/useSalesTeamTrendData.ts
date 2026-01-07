import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { calculateTrend, getCurrentAndPreviousMonthDates } from '../../../utils/trendCalculations'

export interface TrendData {
  currentValue: number
  previousValue: number
  trend: 'up' | 'down' | 'stable'
  trendPercentage: number
}

export interface SalesTeamTrends {
  totalRevenue: TrendData
  averageWinRate: TrendData
  totalActivities: TrendData
  pipelineValue: TrendData
  isLoading: boolean
  error: string | null
}

export const useSalesTeamTrendData = (accessToken: string) => {
  const [trends, setTrends] = useState<SalesTeamTrends>({
    totalRevenue: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    averageWinRate: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    totalActivities: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    pipelineValue: {
      currentValue: 0,
      previousValue: 0,
      trend: 'stable',
      trendPercentage: 0
    },
    isLoading: !!accessToken,
    error: null
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAllTrends = useCallback(async () => {
    if (!accessToken) return

    setTrends(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()
      const now = new Date()
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

      // Combined query that fetches all team KPI data in a single request
      const combinedQuery = `
        query GetTeamKPITrends(
          $currentStart: timestamptz!
          $previousStart: timestamptz!
          $previousEnd: timestamptz!
          $currentMonthStart: timestamptz!
          $previousMonthStart: timestamptz!
        ) {
          # Current Month Revenue (Closed Won)
          currentRevenue: Opportunity(
            where: {
              closeDate: { _gte: $currentStart }
              salesPipelineStage: { value: { _eq: "Closed Won" } }
              isDeleted: { _eq: false }
            }
          ) {
            estimatedAmount
          }
          
          # Previous Month Revenue (Closed Won)
          previousRevenue: Opportunity(
            where: {
              closeDate: { _gte: $previousStart, _lte: $previousEnd }
              salesPipelineStage: { value: { _eq: "Closed Won" } }
              isDeleted: { _eq: false }
            }
          ) {
            estimatedAmount
          }
          
          # Current Month Win Rate (Closed Won + Lost)
          currentClosedOpportunities: Opportunity(
            where: {
              closeDate: { _gte: $currentStart }
              salesPipelineStage: { value: { _in: ["Closed Won", "Closed Lost"] } }
              isDeleted: { _eq: false }
            }
          ) {
            salesPipelineStage { value }
          }
          
          # Previous Month Win Rate (Closed Won + Lost)
          previousClosedOpportunities: Opportunity(
            where: {
              closeDate: { _gte: $previousStart, _lte: $previousEnd }
              salesPipelineStage: { value: { _in: ["Closed Won", "Closed Lost"] } }
              isDeleted: { _eq: false }
            }
          ) {
            salesPipelineStage { value }
          }
          
          # Current Month Activities
          currentActivities: SalesActivity(
            where: {
              createdAt: { _gte: $currentStart }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          # Previous Month Activities
          previousActivities: SalesActivity(
            where: {
              createdAt: { _gte: $previousStart, _lte: $previousEnd }
              isDeleted: { _eq: false }
            }
          ) {
            id
          }
          
          # Current Pipeline Value (Open opportunities)
          currentPipeline: Opportunity(
            where: {
              salesPipelineStage: { value: { _nin: ["Closed Won", "Closed Lost"] } }
              isDeleted: { _eq: false }
              createdAt: { _gte: $currentMonthStart }
            }
          ) {
            estimatedAmount
          }
          
          # Previous Pipeline Value (Open opportunities)
          previousPipeline: Opportunity(
            where: {
              salesPipelineStage: { value: { _nin: ["Closed Won", "Closed Lost"] } }
              isDeleted: { _eq: false }
              createdAt: { _gte: $previousMonthStart, _lt: $currentMonthStart }
            }
          ) {
            estimatedAmount
          }
        }
      `

      const variables = {
        currentStart,
        previousStart,
        previousEnd,
        currentMonthStart: currentMonth.toISOString(),
        previousMonthStart: previousMonth.toISOString()
      }

      const result = await graphqlClient.request<{
        currentRevenue: Array<{ estimatedAmount: number }>
        previousRevenue: Array<{ estimatedAmount: number }>
        currentClosedOpportunities: Array<{ salesPipelineStage: { value: string } }>
        previousClosedOpportunities: Array<{ salesPipelineStage: { value: string } }>
        currentActivities: Array<{ id: string }>
        previousActivities: Array<{ id: string }>
        currentPipeline: Array<{ estimatedAmount: number }>
        previousPipeline: Array<{ estimatedAmount: number }>
      }>(combinedQuery, variables)

      // Calculate Revenue (using 5% threshold for team-level trends)
      const currentRevenue = result.currentRevenue.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
      const previousRevenue = result.previousRevenue.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
      const revenueTrend = calculateTrend(currentRevenue, previousRevenue, 5)

      // Calculate Win Rate
      const calculateWinRate = (opportunities: Array<{ salesPipelineStage: { value: string } }>) => {
        const total = opportunities.length
        if (total === 0) return 0
        const won = opportunities.filter(opp => opp.salesPipelineStage?.value === 'Closed Won').length
        return (won / total) * 100
      }
      const currentWinRate = calculateWinRate(result.currentClosedOpportunities)
      const previousWinRate = calculateWinRate(result.previousClosedOpportunities)
      const winRateTrend = calculateTrend(currentWinRate, previousWinRate, 5)

      // Calculate Activities (using 5% threshold for team-level trends)
      const currentActivities = result.currentActivities.length
      const previousActivities = result.previousActivities.length
      const activitiesTrend = calculateTrend(currentActivities, previousActivities, 5)

      // Calculate Pipeline Value (using 5% threshold for team-level trends)
      const currentPipeline = result.currentPipeline.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
      const previousPipeline = result.previousPipeline.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
      const pipelineTrend = calculateTrend(currentPipeline, previousPipeline, 5)

      setTrends({
        totalRevenue: {
          currentValue: currentRevenue,
          previousValue: previousRevenue,
          trend: revenueTrend.trend,
          trendPercentage: revenueTrend.percentage
        },
        averageWinRate: {
          currentValue: currentWinRate,
          previousValue: previousWinRate,
          trend: winRateTrend.trend,
          trendPercentage: winRateTrend.percentage
        },
        totalActivities: {
          currentValue: currentActivities,
          previousValue: previousActivities,
          trend: activitiesTrend.trend,
          trendPercentage: activitiesTrend.percentage
        },
        pipelineValue: {
          currentValue: currentPipeline,
          previousValue: previousPipeline,
          trend: pipelineTrend.trend,
          trendPercentage: pipelineTrend.percentage
        },
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Error fetching team trend data:', error)
      setTrends(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trend data'
      }))
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchAllTrends()
  }, [fetchAllTrends])

  return {
    trends,
    refetch: fetchAllTrends
  }
}
