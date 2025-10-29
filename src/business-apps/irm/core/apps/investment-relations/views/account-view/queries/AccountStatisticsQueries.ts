import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

export const GET_INVESTMENT_RECENT_ACCOUNTS_WITH_TREND = `
  query GetInvestmentRecentAccountsWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!) {
    current: InvestmentAccountAggregate(where: { createdAt: { _gte: $currentStart }, isDeleted: { _eq: false } }) { aggregate { count } }
    previous: InvestmentAccountAggregate(where: { createdAt: { _gte: $previousStart, _lt: $previousEnd }, isDeleted: { _eq: false } }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_ACTIVE_ACCOUNTS_WITH_TREND = `
  query GetInvestmentActiveAccountsWithTrend($lastMonth: timestamptz!) {
    current: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, investmentOpportunity: { id: { _isNull: false } } }) { aggregate { count } }
    previous: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, investmentOpportunity: { id: { _isNull: false } }, createdAt: { _lt: $lastMonth } }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_ACCOUNTS_THIS_YEAR_WITH_TREND = `
  query GetInvestmentAccountsThisYearWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!) {
    current: InvestmentAccountAggregate(where: { createdAt: { _gte: $thisYearStart }, isDeleted: { _eq: false } }) { aggregate { count } }
    previous: InvestmentAccountAggregate(where: { createdAt: { _gte: $lastYearStart, _lt: $lastYearEnd }, isDeleted: { _eq: false } }) { aggregate { count } }
  }
`

// Query to get total accounts with trend data (current vs previous period)
export const GET_INVESTMENT_TOTAL_ACCOUNTS_WITH_TREND = `
  query GetInvestmentTotalAccountsWithTrend($currentEnd: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!) {
    current: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, createdAt: { _lt: $currentEnd } }) { aggregate { count } }
    previous: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $previousStart, _lt: $previousEnd } }) { aggregate { count } }
  }
`

export interface TrendData {
  current: number
  previous: number
}

export const useAccountStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRecentAccountsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const previousEnd = currentStart
    const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_RECENT_ACCOUNTS_WITH_TREND, {
      currentStart: currentStart.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString()
    })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchActiveAccountsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_ACTIVE_ACCOUNTS_WITH_TREND, { lastMonth: lastMonth.toISOString() })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchAccountsThisYearWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const thisYearStart = new Date(now.getFullYear(), 0, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_ACCOUNTS_THIS_YEAR_WITH_TREND, {
      thisYearStart: thisYearStart.toISOString(),
      lastYearStart: lastYearStart.toISOString(),
      lastYearEnd: lastYearEnd.toISOString()
    })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchTotalAccountsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const currentEnd = now
    const previousEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000) // 60 days ago

    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_TOTAL_ACCOUNTS_WITH_TREND, {
      currentEnd: currentEnd.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString()
    })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  return {
    fetchRecentAccountsWithTrend,
    fetchActiveAccountsWithTrend,
    fetchAccountsThisYearWithTrend,
    fetchTotalAccountsWithTrend
  }
}
