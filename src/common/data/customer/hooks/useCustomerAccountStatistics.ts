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
  revenue: TrendData
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
    $lastQuarter: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!
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
    revenueCurrent: Account(where: {
      isDeleted: {_eq: false},
      annualRevenueRef: {_isNull: false}
    }) {
      annualRevenue {
        value
        code
      }
    }
    revenuePrevious: Account(where: {
      isDeleted: {_eq: false},
      annualRevenueRef: {_isNull: false},
      createdAt: {_lt: $lastQuarter}
    }) {
      annualRevenue {
        value
        code
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
  }
`

// Helper functions outside component to prevent recreation
const calculateTrend = (current: number, previous: number): TrendData => {
  const change = current - previous
  const changePercent = previous > 0 ? (change / previous) * 100 : current > 0 ? 100 : 0
  return {
    current,
    previous,
    change,
    changePercent,
    isPositive: change >= 0
  }
}

const calculateRevenue = (accounts: Array<{ annualRevenue: { value: string; code: string } | null }>): number => {
  let totalRevenue = 0
  accounts.forEach(account => {
    const revenueValue = account.annualRevenue?.value
    if (revenueValue && !isNaN(Number(revenueValue))) {
      totalRevenue += Number(revenueValue)
    }
  })
  return totalRevenue
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
      const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      const result = await graphqlClient.request<{
        recentAccountsCurrent: { aggregate: { count: number } }
        recentAccountsPrevious: { aggregate: { count: number } }
        activeAccountsCurrent: { aggregate: { count: number } }
        activeAccountsPrevious: { aggregate: { count: number } }
        revenueCurrent: Array<{ annualRevenue: { value: string; code: string } | null }>
        revenuePrevious: Array<{ annualRevenue: { value: string; code: string } | null }>
        accountsThisYearCurrent: { aggregate: { count: number } }
        accountsThisYearPrevious: { aggregate: { count: number } }
      }>(GET_ALL_CUSTOMER_ACCOUNT_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastMonth: lastMonth.toISOString(),
        lastQuarter: lastQuarter.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString()
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
        revenue: calculateTrend(calculateRevenue(result.revenueCurrent), calculateRevenue(result.revenuePrevious)),
        accountsThisYear: calculateTrend(
          result.accountsThisYearCurrent.aggregate.count,
          result.accountsThisYearPrevious.aggregate.count
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
