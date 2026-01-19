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
  totalOpportunities: TrendData
  opportunitiesThisQuarter: TrendData
  opportunitiesThisYear: TrendData
}

export interface UseInvestmentOpportunityStatisticsReturn {
  trendData: OpportunityStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Build the statistics query with optional status code filter
 * @param statusCodes - Optional array of status codes to filter by (e.g., ['WON'] or ['OPEN', 'LOST'])
 */
const buildStatisticsQuery = (statusCodes?: string[]): string => {
  // Build status filter condition if status codes are provided
  const statusFilter = statusCodes?.length
    ? `, opportunityStatus: { code: { _in: [${statusCodes.map(c => `"${c}"`).join(', ')}] } }`
    : ''

  return `
  query GetAllInvestmentOpportunityStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastQuarter: timestamptz!,
    $thisQuarterStart: timestamptz!,
    $lastYearSameQuarterStart: timestamptz!,
    $lastYearSameQuarterEnd: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!,
    $currencyId: String
  ) {
    recentOpportunitiesCurrent: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
    recentOpportunitiesPrevious: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
    totalOpportunitiesCurrent: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
    totalOpportunitiesPrevious: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_lt: $lastQuarter}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
    opportunitiesThisQuarterCurrent: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $thisQuarterStart},
      isDeleted: {_eq: false}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
    opportunitiesThisQuarterPrevious: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $lastYearSameQuarterStart, _lt: $lastYearSameQuarterEnd},
      isDeleted: {_eq: false}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
    opportunitiesThisYearCurrent: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
    opportunitiesThisYearPrevious: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}${statusFilter},
      _and: [{ currencyRef: { _eq: $currencyId } }]
    }) {
      aggregate { count }
    }
  }
`
}

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
  context: BusinessAppContextProps,
  currencyId?: string,
  opportunityStatusCodes?: string[]
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

      // Calculate this quarter start (Q1: Jan 1, Q2: Apr 1, Q3: Jul 1, Q4: Oct 1)
      const currentQuarter = Math.floor(now.getMonth() / 3)
      const thisQuarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)

      // Calculate same quarter last year for comparison
      const lastYearSameQuarterStart = new Date(now.getFullYear() - 1, currentQuarter * 3, 1)
      // End is the current day/month but last year (to compare same period within quarter)
      const lastYearSameQuarterEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      // Build query with optional status filter
      const query = buildStatisticsQuery(opportunityStatusCodes)

      const result = await graphqlClient.request<{
        recentOpportunitiesCurrent: { aggregate: { count: number } }
        recentOpportunitiesPrevious: { aggregate: { count: number } }
        totalOpportunitiesCurrent: { aggregate: { count: number } }
        totalOpportunitiesPrevious: { aggregate: { count: number } }
        opportunitiesThisQuarterCurrent: { aggregate: { count: number } }
        opportunitiesThisQuarterPrevious: { aggregate: { count: number } }
        opportunitiesThisYearCurrent: { aggregate: { count: number } }
        opportunitiesThisYearPrevious: { aggregate: { count: number } }
      }>(query, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastQuarter: lastQuarter.toISOString(),
        thisQuarterStart: thisQuarterStart.toISOString(),
        lastYearSameQuarterStart: lastYearSameQuarterStart.toISOString(),
        lastYearSameQuarterEnd: lastYearSameQuarterEnd.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        currencyId: currencyId || null
      })

      setTrendData({
        recentOpportunities: calculateTrend(
          result.recentOpportunitiesCurrent.aggregate.count,
          result.recentOpportunitiesPrevious.aggregate.count
        ),
        totalOpportunities: calculateTrend(
          result.totalOpportunitiesCurrent.aggregate.count,
          result.totalOpportunitiesPrevious.aggregate.count
        ),
        opportunitiesThisQuarter: calculateTrend(
          result.opportunitiesThisQuarterCurrent.aggregate.count,
          result.opportunitiesThisQuarterPrevious.aggregate.count
        ),
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
  }, [context.accessToken, graphqlClient, currencyId, opportunityStatusCodes])

  useEffect(() => {
    if (context.accessToken) {
      refetch()
    }
  }, [context.accessToken, currencyId, opportunityStatusCodes, refetch])

  return {
    trendData,
    isLoading,
    error,
    refetch
  }
}
