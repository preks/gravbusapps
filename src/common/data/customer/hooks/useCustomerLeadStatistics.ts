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

interface ConversionTrendData extends TrendData {
  currentRate: number
  previousRate: number
  currentTotal: number
  previousTotal: number
}

const GET_ALL_CUSTOMER_LEAD_STATISTICS_WITH_TREND = `
  query GetAllCustomerLeadStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastMonth: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!,
    $twoWeeksAgo: timestamptz!
  ) {
    recentLeadsCurrent: LeadAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    recentLeadsPrevious: LeadAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    hotLeadsCurrent: LeadAggregate(where: {
      isDeleted: {_eq: false},
      leadRating: {code: {_eq: "HOT"}}
    }) {
      aggregate { count }
    }
    hotLeadsPrevious: LeadAggregate(where: {
      isDeleted: {_eq: false},
      leadRating: {code: {_eq: "HOT"}},
      createdAt: {_lt: $lastMonth}
    }) {
      aggregate { count }
    }
    conversionRateCurrentTotal: LeadAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    conversionRateCurrentConverted: LeadAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false},
      leadStatus: {code: {_eq: "CONVERTED"}}
    }) {
      aggregate { count }
    }
    conversionRatePreviousTotal: LeadAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}
    }) {
      aggregate { count }
    }
    conversionRatePreviousConverted: LeadAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false},
      leadStatus: {code: {_eq: "CONVERTED"}}
    }) {
      aggregate { count }
    }
    mostCommonLeadSource: Lead(
      where: {
        createdAt: {_gte: $twoWeeksAgo}, 
        leadSourceRef: {_isNull: false}
      }
    ) {
      leadSource {
        value
        code
      }
      leadSourceRef
    }
  }
`

export interface UseLeadStatisticsWithTrendReturn {
  recentLeads: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  hotLeads: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  conversionRate: {
    current: number
    currentRate: number
    currentTotal: number
    changePercent: number
    isPositive: boolean
  }
  topSource: string
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

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

const calculateConversionTrend = (
  currentTotal: number,
  currentConverted: number,
  previousTotal: number,
  previousConverted: number
): ConversionTrendData => {
  const currentRate = currentTotal > 0 ? (currentConverted / currentTotal) * 100 : 0
  const previousRate = previousTotal > 0 ? (previousConverted / previousTotal) * 100 : 0
  const change = currentRate - previousRate
  const changePercent = previousRate > 0 ? (change / previousRate) * 100 : currentRate > 0 ? 100 : 0

  return {
    current: currentConverted,
    previous: previousConverted,
    change: currentConverted - previousConverted,
    changePercent,
    isPositive: change >= 0,
    currentRate,
    previousRate,
    currentTotal,
    previousTotal
  }
}

const getMostCommonLeadSource = (leads: Array<{ leadSource: { value: string; code: string } | null }>): string => {
  const sourceCounts: Record<string, number> = {}
  leads.forEach(lead => {
    const source = lead.leadSource?.value
    if (source) {
      sourceCounts[source] = (sourceCounts[source] || 0) + 1
    }
  })

  let mostCommon = 'N/A'
  let maxCount = 0
  Object.entries(sourceCounts).forEach(([source, count]) => {
    if (count > maxCount) {
      maxCount = count
      mostCommon = source
    }
  })

  return mostCommon
}

export const useCustomerLeadStatistics = (context: BusinessAppContextProps): UseLeadStatisticsWithTrendReturn => {
  const [recentLeads, setRecentLeads] = useState({ current: 0, changePercent: 0, isPositive: true })
  const [hotLeads, setHotLeads] = useState({ current: 0, changePercent: 0, isPositive: true })
  const [conversionRate, setConversionRate] = useState({
    current: 0,
    currentRate: 0,
    currentTotal: 0,
    changePercent: 0,
    isPositive: true
  })
  const [topSource, setTopSource] = useState<string>('N/A')
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
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const result = await graphqlClient.request<{
        recentLeadsCurrent: { aggregate: { count: number } }
        recentLeadsPrevious: { aggregate: { count: number } }
        hotLeadsCurrent: { aggregate: { count: number } }
        hotLeadsPrevious: { aggregate: { count: number } }
        conversionRateCurrentTotal: { aggregate: { count: number } }
        conversionRateCurrentConverted: { aggregate: { count: number } }
        conversionRatePreviousTotal: { aggregate: { count: number } }
        conversionRatePreviousConverted: { aggregate: { count: number } }
        mostCommonLeadSource: Array<{
          leadSource: { value: string; code: string } | null
          leadSourceRef: string | null
        }>
      }>(GET_ALL_CUSTOMER_LEAD_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastMonth: lastMonth.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        twoWeeksAgo: twoWeeksAgo.toISOString()
      })

      const recentTrend = calculateTrend(
        result.recentLeadsCurrent.aggregate.count,
        result.recentLeadsPrevious.aggregate.count
      )
      const hotTrend = calculateTrend(result.hotLeadsCurrent.aggregate.count, result.hotLeadsPrevious.aggregate.count)
      const conversionTrend = calculateConversionTrend(
        result.conversionRateCurrentTotal.aggregate.count,
        result.conversionRateCurrentConverted.aggregate.count,
        result.conversionRatePreviousTotal.aggregate.count,
        result.conversionRatePreviousConverted.aggregate.count
      )

      setRecentLeads({
        current: recentTrend.current,
        changePercent: recentTrend.changePercent,
        isPositive: recentTrend.isPositive
      })

      setHotLeads({
        current: hotTrend.current,
        changePercent: hotTrend.changePercent,
        isPositive: hotTrend.isPositive
      })

      setConversionRate({
        current: conversionTrend.current,
        currentRate: conversionTrend.currentRate,
        currentTotal: conversionTrend.currentTotal,
        changePercent: conversionTrend.changePercent,
        isPositive: conversionTrend.isPositive
      })

      setTopSource(getMostCommonLeadSource(result.mostCommonLeadSource))
    } catch (err) {
      console.error('Error fetching lead statistics with trend:', err)
      setError(new Error(err instanceof Error ? err.message : 'Unknown error fetching statistics with trend'))
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
    topSource,
    isLoading,
    error,
    refetch
  }
}
