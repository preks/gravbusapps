import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLeadStatisticsQueries } from '../queries/LeadStatisticsQueries'

export interface UseLeadStatisticsWithTrendProps extends BusinessAppContextProps {
  sourceApp?: string
}

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

interface LeadStatisticsTrendData {
  recentLeads: TrendData
  hotLeads: TrendData
  conversionRate: ConversionTrendData
}

export interface UseLeadStatisticsWithTrendReturn {
  trendData: LeadStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useLeadStatisticsWithTrend = (
  context: UseLeadStatisticsWithTrendProps
): UseLeadStatisticsWithTrendReturn => {
  const [trendData, setTrendData] = useState<LeadStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const { fetchRecentLeadsWithTrend, fetchHotLeadsWithTrend, fetchConversionRateWithTrend } =
    useLeadStatisticsQueries(context)

  const refetch = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('No access token available'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch statistics using enhanced trend queries
      const [recentLeadsTrend, hotLeadsTrend, conversionTrend] = await Promise.all([
        fetchRecentLeadsWithTrend(),
        fetchHotLeadsWithTrend(),
        fetchConversionRateWithTrend()
      ])

      setTrendData({
        recentLeads: recentLeadsTrend,
        hotLeads: hotLeadsTrend,
        conversionRate: conversionTrend
      })
    } catch (err) {
      console.error('Error fetching lead statistics with trend:', err)
      setError(new Error(err instanceof Error ? err.message : 'Unknown error fetching statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, fetchRecentLeadsWithTrend, fetchHotLeadsWithTrend, fetchConversionRateWithTrend])

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
