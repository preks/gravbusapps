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

interface AccountStatisticsTrendData {
  recentAccounts: TrendData
  activeAccounts: TrendData
  accountsThisYear: TrendData
  totalAccounts: TrendData
}

export interface UseAccountStatisticsWithTrendReturn {
  trendData: AccountStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const GET_ALL_CUSTOMER_ACCOUNT_STATISTICS_WITH_TREND = `
  query GetAllCustomerAccountStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastMonth: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!,
    $currentEnd: timestamptz!,
    $previousTotalStart: timestamptz!,
    $previousTotalEnd: timestamptz!
  ) {
    recentAccountsCurrent: AccountAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    recentAccountsPrevious: AccountAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    activeAccountsCurrent: AccountAggregate(where: {
      isDeleted: {_eq: false},
      liquidationDate: {_isNull: true}
    }) {
      aggregate {
        count
      }
    }
    activeAccountsPrevious: AccountAggregate(where: {
      isDeleted: {_eq: false},
      liquidationDate: {_isNull: true},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate {
        count
      }
    }
    accountsThisYearCurrent: AccountAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    accountsThisYearPrevious: AccountAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    totalAccountsCurrent: AccountAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_lt: $currentEnd}
    }) {
      aggregate {
        count
      }
    }
    totalAccountsPrevious: AccountAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_gte: $previousTotalStart, _lt: $previousTotalEnd}
    }) {
      aggregate {
        count
      }
    }
  }
`

// Helper functions outside component to prevent recreation
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

export const useCustomerAccountStatistics = (context: BusinessAppContextProps): UseAccountStatisticsWithTrendReturn => {
  const [trendData, setTrendData] = useState<AccountStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const refetch = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('No access token available'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const previousEnd = currentStart
      const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const currentEnd = now
      const previousTotalEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const previousTotalStart = new Date(previousTotalEnd.getTime() - 30 * 24 * 60 * 60 * 1000)

      const result = await graphqlClient.request<{
        recentAccountsCurrent: { aggregate: { count: number } }
        recentAccountsPrevious: { aggregate: { count: number } }
        activeAccountsCurrent: { aggregate: { count: number } }
        activeAccountsPrevious: { aggregate: { count: number } }
        accountsThisYearCurrent: { aggregate: { count: number } }
        accountsThisYearPrevious: { aggregate: { count: number } }
        totalAccountsCurrent: { aggregate: { count: number } }
        totalAccountsPrevious: { aggregate: { count: number } }
      }>(GET_ALL_CUSTOMER_ACCOUNT_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastMonth: lastMonth.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        currentEnd: currentEnd.toISOString(),
        previousTotalStart: previousTotalStart.toISOString(),
        previousTotalEnd: previousTotalEnd.toISOString()
      })

      setTrendData({
        recentAccounts: calculateTrend(
          result.recentAccountsCurrent.aggregate.count,
          result.recentAccountsPrevious.aggregate.count
        ),
        activeAccounts: calculateTrend(
          result.activeAccountsCurrent.aggregate.count,
          result.activeAccountsPrevious.aggregate.count
        ),
        accountsThisYear: calculateTrend(
          result.accountsThisYearCurrent.aggregate.count,
          result.accountsThisYearPrevious.aggregate.count
        ),
        totalAccounts: calculateTrend(
          result.totalAccountsCurrent.aggregate.count,
          result.totalAccountsPrevious.aggregate.count
        )
      })
    } catch (err) {
      console.error('Error fetching account statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Unknown error fetching statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  // Fetch statistics on mount and when access token changes
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
