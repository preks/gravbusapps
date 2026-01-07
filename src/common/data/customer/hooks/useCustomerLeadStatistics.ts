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
    $lastQuarter: timestamptz!
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
    convertedLeadsCurrent: LeadAggregate(where: {
      isDeleted: {_eq: false},
      leadStatus: {type: {_eq: "CONVERTED"}}
    }) {
      aggregate { count }
    }
    convertedLeadsPrevious: LeadAggregate(where: {
      isDeleted: {_eq: false},
      leadStatus: {type: {_eq: "CONVERTED"}},
      createdAt: {_lt: $lastQuarter}
    }) {
      aggregate { count }
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
  convertedLeads: {
    current: number
    changePercent: number
    isPositive: boolean
  }
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

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

const calculateConversionTrend = (
  currentTotal: number,
  currentConverted: number,
  previousTotal: number,
  previousConverted: number
): ConversionTrendData => {
  const currentRate = currentTotal > 0 ? (currentConverted / currentTotal) * 100 : 0
  const previousRate = previousTotal > 0 ? (previousConverted / previousTotal) * 100 : 0
  const change = currentRate - previousRate
  let changePercent: number
  if (previousRate > 0) {
    changePercent = (change / previousRate) * 100
  } else if (currentRate > 0) {
    changePercent = 100
  } else {
    changePercent = 0
  }

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
  const [convertedLeads, setConvertedLeads] = useState({ current: 0, changePercent: 0, isPositive: true })
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
      const lastQuarter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      const result = await graphqlClient.request<{
        recentLeadsCurrent: { aggregate: { count: number } }
        recentLeadsPrevious: { aggregate: { count: number } }
        hotLeadsCurrent: { aggregate: { count: number } }
        hotLeadsPrevious: { aggregate: { count: number } }
        conversionRateCurrentTotal: { aggregate: { count: number } }
        conversionRateCurrentConverted: { aggregate: { count: number } }
        conversionRatePreviousTotal: { aggregate: { count: number } }
        conversionRatePreviousConverted: { aggregate: { count: number } }
        convertedLeadsCurrent: { aggregate: { count: number } }
        convertedLeadsPrevious: { aggregate: { count: number } }
      }>(GET_ALL_CUSTOMER_LEAD_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastMonth: lastMonth.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        lastQuarter: lastQuarter.toISOString()
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

      const convertedTrend = calculateTrend(
        result.convertedLeadsCurrent.aggregate.count,
        result.convertedLeadsPrevious.aggregate.count
      )
      setConvertedLeads({
        current: convertedTrend.current,
        changePercent: convertedTrend.changePercent,
        isPositive: convertedTrend.isPositive
      })
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
    convertedLeads,
    isLoading,
    error,
    refetch
  }
}
