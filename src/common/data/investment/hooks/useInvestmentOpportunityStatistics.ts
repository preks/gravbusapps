import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

interface OpportunityStatisticsTrendData {
  recentOpportunities: TrendData
  opportunityValue: TrendData
  winRate: TrendData
  opportunitiesThisYear: TrendData
}

export interface UseInvestmentOpportunityStatisticsReturn {
  trendData: OpportunityStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const GET_ALL_INVESTMENT_OPPORTUNITY_STATISTICS_WITH_TREND = `
  query GetAllInvestmentOpportunityStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastQuarter: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!
  ) {
    recentOpportunitiesCurrent: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    recentOpportunitiesPrevious: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    opportunityValueCurrent: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      estimatedAmount: {_isNull: false}
    }) {
      aggregate { sum { estimatedAmount } }
    }
    opportunityValuePrevious: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      estimatedAmount: {_isNull: false},
      createdAt: {_lt: $lastQuarter}
    }) {
      aggregate { sum { estimatedAmount } }
    }
    winRateCurrentTotal: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    winRateCurrentWins: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      opportunityStatus: { code: {_eq: "WON"} }
    }) {
      aggregate { count }
    }
    winRatePreviousTotal: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_lt: $lastQuarter}
    }) {
      aggregate { count }
    }
    winRatePreviousWins: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      opportunityStatus: { code: {_eq: "WON"} },
      createdAt: {_lt: $lastQuarter}
    }) {
      aggregate { count }
    }
    opportunitiesThisYearCurrent: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    opportunitiesThisYearPrevious: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
  }
`

// Helper function outside component to prevent recreation
const calculateTrend = (current: number, previous: number): TrendData => {
  const change = current - previous
  let changePercent: number
  if (previous > 0) {
    changePercent = (change / previous) * 100
  } else if (current > 0) {
    changePercent = 100
  } else {
    changePercent = 0
  }
  return {
    current,
    previous,
    change,
    changePercent,
    isPositive: change >= 0
  }
}

export const useInvestmentOpportunityStatistics = (
  context: BusinessAppContextProps
): UseInvestmentOpportunityStatisticsReturn => {
  const [trendData, setTrendData] = useState<OpportunityStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const refetch = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('No access token provided for investment opportunity statistics loading')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const previousEnd = currentStart
      const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)
      const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      const result = await graphqlClient.request<{
        recentOpportunitiesCurrent: { aggregate: { count: number } }
        recentOpportunitiesPrevious: { aggregate: { count: number } }
        opportunityValueCurrent: { aggregate: { sum: { estimatedAmount: number | null } } }
        opportunityValuePrevious: { aggregate: { sum: { estimatedAmount: number | null } } }
        winRateCurrentTotal: { aggregate: { count: number } }
        winRateCurrentWins: { aggregate: { count: number } }
        winRatePreviousTotal: { aggregate: { count: number } }
        winRatePreviousWins: { aggregate: { count: number } }
        opportunitiesThisYearCurrent: { aggregate: { count: number } }
        opportunitiesThisYearPrevious: { aggregate: { count: number } }
      }>(GET_ALL_INVESTMENT_OPPORTUNITY_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastQuarter: lastQuarter.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString()
      })

      const currentRate =
        result.winRateCurrentTotal.aggregate.count > 0
          ? (result.winRateCurrentWins.aggregate.count / result.winRateCurrentTotal.aggregate.count) * 100
          : 0
      const previousRate =
        result.winRatePreviousTotal.aggregate.count > 0
          ? (result.winRatePreviousWins.aggregate.count / result.winRatePreviousTotal.aggregate.count) * 100
          : 0

      setTrendData({
        recentOpportunities: calculateTrend(
          result.recentOpportunitiesCurrent.aggregate.count,
          result.recentOpportunitiesPrevious.aggregate.count
        ),
        opportunityValue: calculateTrend(
          result.opportunityValueCurrent.aggregate.sum?.estimatedAmount || 0,
          result.opportunityValuePrevious.aggregate.sum?.estimatedAmount || 0
        ),
        winRate: calculateTrend(currentRate, previousRate),
        opportunitiesThisYear: calculateTrend(
          result.opportunitiesThisYearCurrent.aggregate.count,
          result.opportunitiesThisYearPrevious.aggregate.count
        )
      })
    } catch (err) {
      console.error('Error fetching investment opportunity statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Failed to load investment opportunity statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    if (context.accessToken) {
      refetch()
    }
  }, [context.accessToken, refetch])

  return {
    trendData,
    isLoading,
    error,
    refetch
  }
}
