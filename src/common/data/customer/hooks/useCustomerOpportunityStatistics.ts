import { useState, useEffect, useCallback } from 'react'
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
  totalOpportunities: TrendData
  winRate: TrendData
  opportunitiesThisYear: TrendData
}

export interface UseCustomerOpportunityStatisticsReturn {
  trendData: OpportunityStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const GET_ALL_CUSTOMER_OPPORTUNITY_STATISTICS_WITH_TREND = (currencyId?: string) => {
  const currencyFilter = currencyId ? `, currencyRef: { _eq: "${currencyId}" }` : ''

  return `
  query GetAllCustomerOpportunityStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastQuarter: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!
  ) {
    recentOpportunitiesCurrent: OpportunityAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    recentOpportunitiesPrevious: OpportunityAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    totalOpportunitiesCurrent: OpportunityAggregate(where: {
      isDeleted: {_eq: false}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    totalOpportunitiesPrevious: OpportunityAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_lt: $lastQuarter}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    winRateCurrentWon: OpportunityAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false},
      opportunityStatus: {code: {_eq: "WON"}}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    winRateCurrentClosed: OpportunityAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false},
      opportunityStatus: {code: {_in: ["WON", "LOST"]}}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    winRatePreviousWon: OpportunityAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false},
      opportunityStatus: {code: {_eq: "WON"}}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    winRatePreviousClosed: OpportunityAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false},
      opportunityStatus: {code: {_in: ["WON", "LOST"]}}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    opportunitiesThisYearCurrent: OpportunityAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
    opportunitiesThisYearPrevious: OpportunityAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}${currencyFilter}
    }) {
      aggregate {
        count
      }
    }
  }
`
}

// Helper function outside component to prevent recreation
const calculateTrend = (current: number, previous: number): TrendData => {
  const change = current - previous
  let changePercent = 0
  if (previous > 0) {
    changePercent = (change / previous) * 100
  } else if (current > 0) {
    changePercent = 100
  }
  return {
    current,
    previous,
    change,
    changePercent,
    isPositive: change >= 0
  }
}

export const useCustomerOpportunityStatistics = (
  props: BusinessAppContextProps,
  currencyId?: string
): UseCustomerOpportunityStatisticsReturn => {
  const graphqlClient = useGraphQLClient(props.accessToken)
  const [trendData, setTrendData] = useState<OpportunityStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!props.accessToken) {
      console.warn('No access token provided for customer opportunity statistics with trend loading')
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
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)

      const query = GET_ALL_CUSTOMER_OPPORTUNITY_STATISTICS_WITH_TREND(currencyId)
      const result = await graphqlClient.request<{
        recentOpportunitiesCurrent: { aggregate: { count: number } }
        recentOpportunitiesPrevious: { aggregate: { count: number } }
        totalOpportunitiesCurrent: { aggregate: { count: number } }
        totalOpportunitiesPrevious: { aggregate: { count: number } }
        winRateCurrentWon: { aggregate: { count: number } }
        winRateCurrentClosed: { aggregate: { count: number } }
        winRatePreviousWon: { aggregate: { count: number } }
        winRatePreviousClosed: { aggregate: { count: number } }
        opportunitiesThisYearCurrent: { aggregate: { count: number } }
        opportunitiesThisYearPrevious: { aggregate: { count: number } }
      }>(query, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastQuarter: lastQuarter.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString()
      })

      const currentWon = result.winRateCurrentWon.aggregate.count || 0
      const currentClosed = result.winRateCurrentClosed.aggregate.count || 0
      const previousWon = result.winRatePreviousWon.aggregate.count || 0
      const previousClosed = result.winRatePreviousClosed.aggregate.count || 0

      const currentRate = currentClosed > 0 ? Math.round((currentWon / currentClosed) * 100) : 0
      const previousRate = previousClosed > 0 ? Math.round((previousWon / previousClosed) * 100) : 0

      setTrendData({
        recentOpportunities: calculateTrend(
          result.recentOpportunitiesCurrent.aggregate.count,
          result.recentOpportunitiesPrevious.aggregate.count
        ),
        totalOpportunities: calculateTrend(
          result.totalOpportunitiesCurrent.aggregate.count,
          result.totalOpportunitiesPrevious.aggregate.count
        ),
        winRate: calculateTrend(currentRate, previousRate),
        opportunitiesThisYear: calculateTrend(
          result.opportunitiesThisYearCurrent.aggregate.count,
          result.opportunitiesThisYearPrevious.aggregate.count
        )
      })
    } catch (err) {
      console.error('Error fetching customer opportunity statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Failed to load customer opportunity statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [props.accessToken, currencyId, graphqlClient])

  // Fetch statistics on mount and when access token or currency changes
  useEffect(() => {
    if (props.accessToken) {
      refetch()
    }
  }, [props.accessToken, currencyId, refetch])

  return {
    trendData,
    isLoading,
    error,
    refetch
  }
}
