import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCallback } from 'react'

export interface UseAccountStatisticsQueriesProps extends BusinessAppContextProps {
  sourceApp?: string
}

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

// Enhanced queries that fetch both current and previous period data for trend calculations

// Query to get recent accounts count (current 2 weeks vs previous 2 weeks)
export const GET_RECENT_ACCOUNTS_WITH_TREND = `
  query GetRecentAccountsWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!, $sourceApp: String) {
    current: AccountAggregate(where: {
      createdAt: {_gte: $currentStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previous: AccountAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`

// Query to get active accounts count (current vs last month)
export const GET_ACTIVE_ACCOUNTS_WITH_TREND = `
  query GetActiveAccountsWithTrend($lastMonth: timestamptz!, $sourceApp: String) {
    current: AccountAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      liquidationDate: {_isNull: true}
    }) {
      aggregate {
        count
      }
    }
    previous: AccountAggregate(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      liquidationDate: {_isNull: true},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate {
        count
      }
    }
  }
`

// Query to get revenue estimates with trend (current vs last quarter)
export const GET_REVENUE_WITH_TREND = `
  query GetRevenueWithTrend($lastQuarter: timestamptz!, $sourceApp: String) {
    current: Account(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      annualRevenueRef: {_isNull: false}
    }) {
      annualRevenue {
        value
        code
      }
    }
    previous: Account(where: {
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false},
      annualRevenueRef: {_isNull: false},
      createdAt: {_lt: $lastQuarter}
    }) {
      annualRevenue {
        value
        code
      }
    }
  }
`

// Query to get accounts this year vs same period last year
export const GET_ACCOUNTS_THIS_YEAR_WITH_TREND = `
  query GetAccountsThisYearWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!, $sourceApp: String) {
    current: AccountAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
    previous: AccountAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      sourceApp: {_eq: $sourceApp},
      isDeleted: {_eq: false}
    }) {
      aggregate {
        count
      }
    }
  }
`

export const useAccountStatisticsQueries = (context: UseAccountStatisticsQueriesProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { sourceApp } = context

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

  const fetchRecentAccountsWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date()
      const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const previousEnd = currentStart
      const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)

      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } }
        previous: { aggregate: { count: number } }
      }>(GET_RECENT_ACCOUNTS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        sourceApp
      })

      return calculateTrend(result.current.aggregate.count, result.previous.aggregate.count)
    } catch (error) {
      console.error('Error fetching recent accounts with trend:', error)
      throw error
    }
  }, [graphqlClient, sourceApp])

  const fetchActiveAccountsWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } }
        previous: { aggregate: { count: number } }
      }>(GET_ACTIVE_ACCOUNTS_WITH_TREND, {
        lastMonth: lastMonth.toISOString(),
        sourceApp
      })

      return calculateTrend(result.current.aggregate.count, result.previous.aggregate.count)
    } catch (error) {
      console.error('Error fetching active accounts with trend:', error)
      throw error
    }
  }, [graphqlClient, sourceApp])

  const fetchRevenueWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date()
      const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())

      const result = await graphqlClient.request<{
        current: Array<{ annualRevenue: { value: string; code: string } | null }>
        previous: Array<{ annualRevenue: { value: string; code: string } | null }>
      }>(GET_REVENUE_WITH_TREND, {
        lastQuarter: lastQuarter.toISOString(),
        sourceApp
      })

      const currentRevenue = calculateRevenue(result.current)
      const previousRevenue = calculateRevenue(result.previous)

      return calculateTrend(currentRevenue, previousRevenue)
    } catch (error) {
      console.error('Error fetching revenue with trend:', error)
      throw error
    }
  }, [graphqlClient, sourceApp])

  const fetchAccountsThisYearWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date()
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      const result = await graphqlClient.request<{
        current: { aggregate: { count: number } }
        previous: { aggregate: { count: number } }
      }>(GET_ACCOUNTS_THIS_YEAR_WITH_TREND, {
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        sourceApp
      })

      return calculateTrend(result.current.aggregate.count, result.previous.aggregate.count)
    } catch (error) {
      console.error('Error fetching accounts this year with trend:', error)
      throw error
    }
  }, [graphqlClient, sourceApp])

  return {
    // Enhanced methods with trend data
    fetchRecentAccountsWithTrend,
    fetchActiveAccountsWithTrend,
    fetchRevenueWithTrend,
    fetchAccountsThisYearWithTrend
  }
}
