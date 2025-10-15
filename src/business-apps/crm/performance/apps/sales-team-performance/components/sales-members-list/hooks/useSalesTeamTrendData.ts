import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

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
    isLoading: true,
    error: null
  })

  const graphqlClient = useGraphQLClient(accessToken)

  const calculateTrend = (
    current: number,
    previous: number
  ): { trend: 'up' | 'down' | 'stable'; percentage: number } => {
    if (previous === 0 && current > 0) return { trend: 'up', percentage: 100 }
    if (previous === 0 && current === 0) return { trend: 'stable', percentage: 0 }

    const percentage = ((current - previous) / previous) * 100
    const trend = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable'

    return { trend, percentage } // ✅ Removed Math.abs() to preserve sign
  }

  const getCurrentAndPreviousMonthDates = () => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    return {
      currentStart: currentMonth.toISOString(),
      previousStart: previousMonth.toISOString(),
      previousEnd: previousMonthEnd.toISOString()
    }
  }

  const fetchRevenueTrends = async () => {
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

    // Current month closed opportunities
    const currentRevenueQuery = `
      query GetCurrentMonthRevenue {
        Opportunity(
          where: {
            closeDate: { _gte: "${currentStart}" }
            salesPipelineStage: { value: { _eq: "Closed Won" } }
            isDeleted: { _eq: false }
          }
        ) {
          estimatedAmount
        }
      }
    `

    // Previous month closed opportunities
    const previousRevenueQuery = `
      query GetPreviousMonthRevenue {
        Opportunity(
          where: {
            closeDate: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            salesPipelineStage: { value: { _eq: "Closed Won" } }
            isDeleted: { _eq: false }
          }
        ) {
          estimatedAmount
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentRevenueQuery),
        graphqlClient.request(previousRevenueQuery)
      ])

      const currentRevenue = (currentResult as any).Opportunity.reduce(
        (sum: number, opp: any) => sum + (opp.estimatedAmount || 0),
        0
      )
      const previousRevenue = (previousResult as any).Opportunity.reduce(
        (sum: number, opp: any) => sum + (opp.estimatedAmount || 0),
        0
      )

      const { trend, percentage } = calculateTrend(currentRevenue, previousRevenue)

      return {
        currentValue: currentRevenue,
        previousValue: previousRevenue,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching revenue trends:', error)
      throw error
    }
  }

  const fetchWinRateTrends = async () => {
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

    const currentWinRateQuery = `
      query GetCurrentMonthWinRate {
        closedOpportunities: Opportunity(
          where: {
            closeDate: { _gte: "${currentStart}" }
            salesPipelineStage: { value: { _in: ["Closed Won", "Closed Lost"] } }
            isDeleted: { _eq: false }
          }
        ) {
          salesPipelineStage { value }
        }
      }
    `

    const previousWinRateQuery = `
      query GetPreviousMonthWinRate {
        closedOpportunities: Opportunity(
          where: {
            closeDate: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            salesPipelineStage: { value: { _in: ["Closed Won", "Closed Lost"] } }
            isDeleted: { _eq: false }
          }
        ) {
          salesPipelineStage { value }
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentWinRateQuery),
        graphqlClient.request(previousWinRateQuery)
      ])

      const calculateWinRate = (opportunities: any[]) => {
        const total = opportunities.length
        if (total === 0) return 0
        const won = opportunities.filter(opp => opp.salesPipelineStage?.value === 'Closed Won').length
        return (won / total) * 100
      }

      const currentWinRate = calculateWinRate((currentResult as any).closedOpportunities)
      const previousWinRate = calculateWinRate((previousResult as any).closedOpportunities)

      const { trend, percentage } = calculateTrend(currentWinRate, previousWinRate)

      return {
        currentValue: currentWinRate,
        previousValue: previousWinRate,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching win rate trends:', error)
      throw error
    }
  }

  const fetchActivityTrends = async () => {
    const { currentStart, previousStart, previousEnd } = getCurrentAndPreviousMonthDates()

    const currentActivitiesQuery = `
      query GetCurrentMonthActivities {
        SalesActivity(
          where: {
            createdAt: { _gte: "${currentStart}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    const previousActivitiesQuery = `
      query GetPreviousMonthActivities {
        SalesActivity(
          where: {
            createdAt: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentActivitiesQuery),
        graphqlClient.request(previousActivitiesQuery)
      ])

      const currentActivities = (currentResult as any).SalesActivity.length
      const previousActivities = (previousResult as any).SalesActivity.length

      const { trend, percentage } = calculateTrend(currentActivities, previousActivities)

      return {
        currentValue: currentActivities,
        previousValue: previousActivities,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching activity trends:', error)
      throw error
    }
  }

  const fetchPipelineTrends = async () => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const currentPipelineQuery = `
      query GetCurrentPipeline {
        Opportunity(
          where: {
            salesPipelineStage: { value: { _nin: ["Closed Won", "Closed Lost"] } }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${currentMonth.toISOString()}" }
          }
        ) {
          estimatedAmount
        }
      }
    `

    const previousPipelineQuery = `
      query GetPreviousPipeline {
        Opportunity(
          where: {
            salesPipelineStage: { value: { _nin: ["Closed Won", "Closed Lost"] } }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${previousMonth.toISOString()}", _lt: "${currentMonth.toISOString()}" }
          }
        ) {
          estimatedAmount
        }
      }
    `

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentPipelineQuery),
        graphqlClient.request(previousPipelineQuery)
      ])

      const currentPipeline = (currentResult as any).Opportunity.reduce(
        (sum: number, opp: any) => sum + (opp.estimatedAmount || 0),
        0
      )
      const previousPipeline = (previousResult as any).Opportunity.reduce(
        (sum: number, opp: any) => sum + (opp.estimatedAmount || 0),
        0
      )

      const { trend, percentage } = calculateTrend(currentPipeline, previousPipeline)

      return {
        currentValue: currentPipeline,
        previousValue: previousPipeline,
        trend,
        trendPercentage: percentage
      }
    } catch (error) {
      console.error('Error fetching pipeline trends:', error)
      throw error
    }
  }

  const fetchAllTrends = useCallback(async () => {
    if (!accessToken) return

    setTrends(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const [revenueTrend, winRateTrend, activityTrend, pipelineTrend] = await Promise.all([
        fetchRevenueTrends(),
        fetchWinRateTrends(),
        fetchActivityTrends(),
        fetchPipelineTrends()
      ])

      setTrends({
        totalRevenue: revenueTrend,
        averageWinRate: winRateTrend,
        totalActivities: activityTrend,
        pipelineValue: pipelineTrend,
        isLoading: false,
        error: null
      })
    } catch (error) {
      setTrends(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trend data'
      }))
    }
  }, [accessToken])

  useEffect(() => {
    fetchAllTrends()
  }, [fetchAllTrends])

  return {
    trends,
    refetch: fetchAllTrends
  }
}
