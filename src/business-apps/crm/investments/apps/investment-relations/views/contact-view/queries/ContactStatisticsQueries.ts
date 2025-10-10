import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

export const GET_INVESTMENT_RECENT_CONTACTS_WITH_TREND = `
  query GetInvestmentRecentContactsWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!) {
    current: InvestmentContactAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
    previous: InvestmentContactAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_ACTIVE_CONTACTS_WITH_TREND = `
  query GetInvestmentActiveContactsWithTrend($lastMonth: timestamptz!) {
    current: InvestmentContactAggregate(where: {
      isDeleted: {_eq: false},
      activeTo: {_isNull: true}
    }) { aggregate { count } }
    previous: InvestmentContactAggregate(where: {
      isDeleted: {_eq: false},
      activeTo: {_isNull: true},
      createdAt: {_lt: $lastMonth}
    }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_EMAIL_ENGAGEMENTS_WITH_TREND = `
  query GetInvestmentEmailEngagementsWithTrend($lastMonth: timestamptz!) {
    current: InvestmentContactAggregate(where: {
      isDeleted: {_eq: false},
      email: {_isNull: false}
    }) { aggregate { count } }
    previous: InvestmentContactAggregate(where: {
      isDeleted: {_eq: false},
      email: {_isNull: false},
      createdAt: {_lt: $lastMonth}
    }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_CONTACTS_THIS_YEAR_WITH_TREND = `
  query GetInvestmentContactsThisYearWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!) {
    current: InvestmentContactAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
    previous: InvestmentContactAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
  }
`

export interface TrendData {
  current: number
  previous: number
}

export const useContactStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRecentContactsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const previousEnd = currentStart
    const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_RECENT_CONTACTS_WITH_TREND, {
      currentStart: currentStart.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString()
    })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchActiveContactsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_ACTIVE_CONTACTS_WITH_TREND, { lastMonth: lastMonth.toISOString() })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchEmailEngagementsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_EMAIL_ENGAGEMENTS_WITH_TREND, { lastMonth: lastMonth.toISOString() })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchContactsThisYearWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const thisYearStart = new Date(now.getFullYear(), 0, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_CONTACTS_THIS_YEAR_WITH_TREND, {
      thisYearStart: thisYearStart.toISOString(),
      lastYearStart: lastYearStart.toISOString(),
      lastYearEnd: lastYearEnd.toISOString()
    })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  return {
    fetchRecentContactsWithTrend,
    fetchActiveContactsWithTrend,
    fetchEmailEngagementsWithTrend,
    fetchContactsThisYearWithTrend
  }
}
