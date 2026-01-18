import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

// Investment Lead statistics queries (trend-based)

const GET_INVESTMENT_RECENT_LEADS_WITH_TREND = `
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

const GET_INVESTMENT_HOT_LEADS_WITH_TREND = `
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

const GET_INVESTMENT_CONVERSION_RATE_WITH_TREND = `
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

const GET_INVESTMENT_CONVERTED_LEADS_WITH_TREND = `
  query GetInvestmentConvertedLeadsWithTrend($lastQuarter: timestamptz!) {
    current: InvestmentLeadAggregate(where: {
      isDeleted: {_eq: false},
      leadStatus: {type: {_eq: "CONVERTED"}}
    }) {
      aggregate { count }
    }
    previous: InvestmentLeadAggregate(where: {
      isDeleted: {_eq: false},
      leadStatus: {type: {_eq: "CONVERTED"}},
      createdAt: {_lt: $lastQuarter}
    }) {
      aggregate { count }
    }
  }
`

interface TrendData {
  current: number
  changePercent: number
  isPositive: boolean
}

interface ConversionTrendData extends TrendData {
  currentRate: number
  currentTotal: number
}

export interface UseInvestmentLeadStatisticsReturn {
  recentLeads: TrendData
  hotLeads: TrendData
  conversionRate: ConversionTrendData
  convertedLeads: TrendData
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useInvestmentLeadStatistics = (context: BusinessAppContextProps): UseInvestmentLeadStatisticsReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [recentLeads, setRecentLeads] = useState<TrendData>({ current: 0, changePercent: 0, isPositive: true })
  const [hotLeads, setHotLeads] = useState<TrendData>({ current: 0, changePercent: 0, isPositive: true })
  const [conversionRate, setConversionRate] = useState<ConversionTrendData>({
    current: 0,
    currentRate: 0,
    currentTotal: 0,
    changePercent: 0,
    isPositive: true
  })
  const [convertedLeads, setConvertedLeads] = useState<TrendData>({ current: 0, changePercent: 0, isPositive: true })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('No access token available'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Recent Leads
      const now = new Date()
      const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const previousEnd = currentStart
      const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)

      const recentResult = await graphqlClient.request<{
        current: { aggregate: { count: number } }
        previous: { aggregate: { count: number } }
      }>(GET_INVESTMENT_RECENT_LEADS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString()
      })

      const rCurrent = recentResult.current.aggregate.count
      const rPrevious = recentResult.previous.aggregate.count
      let rChange: number
      if (rPrevious > 0) {
        rChange = ((rCurrent - rPrevious) / rPrevious) * 100
      } else if (rCurrent > 0) {
        rChange = 100
      } else {
        rChange = 0
      }

      setRecentLeads({
        current: rCurrent,
        changePercent: rChange,
        isPositive: rCurrent >= rPrevious
      })

      // Hot Leads
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      const hotResult = await graphqlClient.request<{
        current: { aggregate: { count: number } }
        previous: { aggregate: { count: number } }
      }>(GET_INVESTMENT_HOT_LEADS_WITH_TREND, { lastMonth: lastMonth.toISOString() })

      const hCurrent = hotResult.current.aggregate.count
      const hPrevious = hotResult.previous.aggregate.count
      let hChange: number
      if (hPrevious > 0) {
        hChange = ((hCurrent - hPrevious) / hPrevious) * 100
      } else if (hCurrent > 0) {
        hChange = 100
      } else {
        hChange = 0
      }

      setHotLeads({
        current: hCurrent,
        changePercent: hChange,
        isPositive: hCurrent >= hPrevious
      })

      // Conversion Rate
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      const convResult = await graphqlClient.request<{
        currentTotal: { aggregate: { count: number } }
        currentConverted: { aggregate: { count: number } }
        previousTotal: { aggregate: { count: number } }
        previousConverted: { aggregate: { count: number } }
      }>(GET_INVESTMENT_CONVERSION_RATE_WITH_TREND, {
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString()
      })

      const cCurrentTotal = convResult.currentTotal.aggregate.count
      const cCurrentConverted = convResult.currentConverted.aggregate.count
      const cPreviousTotal = convResult.previousTotal.aggregate.count
      const cPreviousConverted = convResult.previousConverted.aggregate.count

      const currentRate = cCurrentTotal > 0 ? (cCurrentConverted / cCurrentTotal) * 100 : 0
      const previousRate = cPreviousTotal > 0 ? (cPreviousConverted / cPreviousTotal) * 100 : 0
      let convChange: number
      if (previousRate > 0) {
        convChange = currentRate - previousRate
      } else if (currentRate > 0) {
        convChange = 100
      } else {
        convChange = 0
      }

      setConversionRate({
        current: cCurrentConverted,
        currentRate,
        currentTotal: cCurrentTotal,
        changePercent: convChange,
        isPositive: convChange >= 0
      })

      // Converted Leads (quarterly trend)
      const lastQuarter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const convertedResult = await graphqlClient.request<{
        current: { aggregate: { count: number } }
        previous: { aggregate: { count: number } }
      }>(GET_INVESTMENT_CONVERTED_LEADS_WITH_TREND, { lastQuarter: lastQuarter.toISOString() })

      const cCurrent = convertedResult.current.aggregate.count
      const cPrevious = convertedResult.previous.aggregate.count
      let cChange: number
      if (cPrevious > 0) {
        cChange = ((cCurrent - cPrevious) / cPrevious) * 100
      } else if (cCurrent > 0) {
        cChange = 100
      } else {
        cChange = 0
      }

      setConvertedLeads({
        current: cCurrent,
        changePercent: cChange,
        isPositive: cCurrent >= cPrevious
      })
    } catch (err) {
      console.error('Error fetching investment lead statistics:', err)
      setError(new Error(err instanceof Error ? err.message : 'Unknown error'))
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
    recentLeads,
    hotLeads,
    conversionRate,
    convertedLeads,
    isLoading,
    error,
    refetch
  }
}
