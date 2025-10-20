import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

// Investment Lead statistics queries (trend-based)

export const GET_INVESTMENT_RECENT_LEADS_WITH_TREND = `
  query GetInvestmentRecentLeadsWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!) {
    current: InvestmentLeadAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    previous: InvestmentLeadAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
  }
`

export const GET_INVESTMENT_HOT_LEADS_WITH_TREND = `
  query GetInvestmentHotLeadsWithTrend($lastMonth: timestamptz!) {
    current: InvestmentLeadAggregate(where: {
      isDeleted: {_eq: false},
      leadRating: { code: {_in: ["HOT", "HIGH"] } }
    }) {
      aggregate { count }
    }
    previous: InvestmentLeadAggregate(where: {
      isDeleted: {_eq: false},
      leadRating: { code: {_in: ["HOT", "HIGH"] } },
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate { count }
    }
  }
`

export const GET_INVESTMENT_CONVERSION_RATE_WITH_TREND = `
  query GetInvestmentLeadConversionRateWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!) {
    currentTotal: InvestmentLeadAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}
    }) { aggregate { count } }

    currentConverted: InvestmentLeadAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false},
      leadStatus: { code: { _eq: "CONVERTED" } }
    }) { aggregate { count } }

    previousTotal: InvestmentLeadAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}
    }) { aggregate { count } }

    previousConverted: InvestmentLeadAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false},
      leadStatus: { code: { _eq: "CONVERTED" } }
    }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_MOST_COMMON_LEAD_SOURCE = `
  query GetInvestmentMostCommonLeadSource($twoWeeksAgo: timestamptz!) {
    InvestmentLead(
      where: { createdAt: {_gte: $twoWeeksAgo}, isDeleted: {_eq: false}, leadSourceRef: {_isNull: false} }
    ) {
      leadSource { value code }
      leadSourceRef
    }
  }
`

export interface TrendData {
  current: number
  previous: number
}

export interface ConversionTrendData {
  currentTotal: number
  currentConverted: number
  previousTotal: number
  previousConverted: number
}

export const useLeadStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRecentLeadsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const previousEnd = currentStart
    const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)

    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_RECENT_LEADS_WITH_TREND, {
      currentStart: currentStart.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString()
    })
    return {
      current: result.current.aggregate.count,
      previous: result.previous.aggregate.count
    }
  }, [graphqlClient])

  const fetchHotLeadsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_HOT_LEADS_WITH_TREND, { lastMonth: lastMonth.toISOString() })
    return {
      current: result.current.aggregate.count,
      previous: result.previous.aggregate.count
    }
  }, [graphqlClient])

  const fetchConversionRateWithTrend = useCallback(async (): Promise<ConversionTrendData> => {
    const now = new Date()
    const thisYearStart = new Date(now.getFullYear(), 0, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const result = await graphqlClient.request<{
      currentTotal: { aggregate: { count: number } }
      currentConverted: { aggregate: { count: number } }
      previousTotal: { aggregate: { count: number } }
      previousConverted: { aggregate: { count: number } }
    }>(GET_INVESTMENT_CONVERSION_RATE_WITH_TREND, {
      thisYearStart: thisYearStart.toISOString(),
      lastYearStart: lastYearStart.toISOString(),
      lastYearEnd: lastYearEnd.toISOString()
    })
    return {
      currentTotal: result.currentTotal.aggregate.count,
      currentConverted: result.currentConverted.aggregate.count,
      previousTotal: result.previousTotal.aggregate.count,
      previousConverted: result.previousConverted.aggregate.count
    }
  }, [graphqlClient])

  const fetchMostCommonLeadSource = useCallback(async (): Promise<string> => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
    const result = await graphqlClient.request<{
      InvestmentLead: Array<{
        leadSource: { value: string | null; code: string | null } | null
        leadSourceRef: string | null
      }>
    }>(GET_INVESTMENT_MOST_COMMON_LEAD_SOURCE, { twoWeeksAgo })
    const counts: Record<string, number> = {}
    result.InvestmentLead.forEach(item => {
      const label = item.leadSource?.value
      if (label) counts[label] = (counts[label] || 0) + 1
    })
    let most = 'N/A'
    let max = 0
    Object.entries(counts).forEach(([k, v]) => {
      if (v > max) {
        max = v
        most = k
      }
    })
    return most
  }, [graphqlClient])

  return {
    fetchRecentLeadsWithTrend,
    fetchHotLeadsWithTrend,
    fetchConversionRateWithTrend,
    fetchMostCommonLeadSource
  }
}
