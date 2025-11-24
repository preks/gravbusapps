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

export interface UseCustomerOpportunityStatisticsReturn {
  trendData: OpportunityStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export interface UseCustomerOpportunityStatisticsOptions {
  selectedCurrency?: string
}

const GET_ALL_CUSTOMER_OPPORTUNITY_STATISTICS_WITH_TREND = `
  query GetAllCustomerOpportunityStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastQuarter: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!,
    $currencyCode: String
  ) {
    recentOpportunitiesCurrent: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $currentStart} },
        { isDeleted: {_eq: false} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
    recentOpportunitiesPrevious: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $previousStart, _lt: $previousEnd} },
        { isDeleted: {_eq: false} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
    opportunityValueCurrent: OpportunityAggregate(where: {
      _and: [
        { isDeleted: {_eq: false} },
        { estimatedAmount: {_isNull: false} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    opportunityValuePrevious: OpportunityAggregate(where: {
      _and: [
        { isDeleted: {_eq: false} },
        { estimatedAmount: {_isNull: false} },
        { createdAt: {_lt: $lastQuarter} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        sum {
          estimatedAmount
        }
      }
    }
    winRateCurrentWon: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $thisYearStart} },
        { isDeleted: {_eq: false} },
        { opportunityStatus: {code: {_eq: "WON"}} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
    winRateCurrentClosed: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $thisYearStart} },
        { isDeleted: {_eq: false} },
        { opportunityStatus: {code: {_in: ["WON", "LOST"]}} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
    winRatePreviousWon: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd} },
        { isDeleted: {_eq: false} },
        { opportunityStatus: {code: {_eq: "WON"}} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
    winRatePreviousClosed: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd} },
        { isDeleted: {_eq: false} },
        { opportunityStatus: {code: {_in: ["WON", "LOST"]}} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
    opportunitiesThisYearCurrent: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $thisYearStart} },
        { isDeleted: {_eq: false} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
    opportunitiesThisYearPrevious: OpportunityAggregate(where: {
      _and: [
        { createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd} },
        { isDeleted: {_eq: false} },
        { currency: { code: { _eq: $currencyCode } } }
      ]
    }) {
      aggregate {
        count
      }
    }
  }
`

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
  options: UseCustomerOpportunityStatisticsOptions = {}
): UseCustomerOpportunityStatisticsReturn => {
  const { selectedCurrency } = options
  const [trendData, setTrendData] = useState<OpportunityStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken)

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

      const result = await graphqlClient.request<{
        recentOpportunitiesCurrent: { aggregate: { count: number } }
        recentOpportunitiesPrevious: { aggregate: { count: number } }
        opportunityValueCurrent: { aggregate: { sum: { estimatedAmount: number } } }
        opportunityValuePrevious: { aggregate: { sum: { estimatedAmount: number } } }
        winRateCurrentWon: { aggregate: { count: number } }
        winRateCurrentClosed: { aggregate: { count: number } }
        winRatePreviousWon: { aggregate: { count: number } }
        winRatePreviousClosed: { aggregate: { count: number } }
        opportunitiesThisYearCurrent: { aggregate: { count: number } }
        opportunitiesThisYearPrevious: { aggregate: { count: number } }
      }>(GET_ALL_CUSTOMER_OPPORTUNITY_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastQuarter: lastQuarter.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        currencyCode: selectedCurrency || null
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
      console.error('Error fetching customer opportunity statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Failed to load customer opportunity statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [props.accessToken, graphqlClient, selectedCurrency])

  // Fetch statistics on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      refetch()
    }
  }, [props.accessToken, refetch])

  return {
    trendData,
    isLoading,
    error,
    refetch
  }
}
