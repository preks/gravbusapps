import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useLeadStatisticsQueries } from '../queries/customerLeadStatisticsQueries'

export interface UseLeadStatisticsWithTrendProps extends BusinessAppContextProps {
  sourceApp?: string
}

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

export const useLeadStatisticsWithTrend = (
  context: UseLeadStatisticsWithTrendProps
): UseLeadStatisticsWithTrendReturn => {
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

  const { fetchRecentLeadsWithTrend, fetchHotLeadsWithTrend, fetchConversionRateWithTrend, fetchMostCommonLeadSource } =
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
      const [r, h, c, s] = await Promise.all([
        fetchRecentLeadsWithTrend(),
        fetchHotLeadsWithTrend(),
        fetchConversionRateWithTrend(),
        fetchMostCommonLeadSource()
      ])

      const rChange = r.previous > 0 ? ((r.current - r.previous) / r.previous) * 100 : r.current > 0 ? 100 : 0
      const hChange = h.previous > 0 ? ((h.current - h.previous) / h.previous) * 100 : h.current > 0 ? 100 : 0

      setRecentLeads({
        current: r.current,
        changePercent: rChange,
        isPositive: r.current >= r.previous
      })

      setHotLeads({
        current: h.current,
        changePercent: hChange,
        isPositive: h.current >= h.previous
      })

      const currentRate = c.currentTotal > 0 ? (c.currentConverted / c.currentTotal) * 100 : 0
      const previousRate = c.previousTotal > 0 ? (c.previousConverted / c.previousTotal) * 100 : 0
      const convChange = previousRate > 0 ? currentRate - previousRate : currentRate > 0 ? 100 : 0

      setConversionRate({
        current: c.currentConverted,
        currentRate,
        currentTotal: c.currentTotal,
        changePercent: convChange,
        isPositive: convChange >= 0
      })

      setTopSource(s)
    } catch (err) {
      console.error('Error fetching lead statistics with trend:', err)
      setError(new Error(err instanceof Error ? err.message : 'Unknown error fetching statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [
    context.accessToken,
    fetchRecentLeadsWithTrend,
    fetchHotLeadsWithTrend,
    fetchConversionRateWithTrend,
    fetchMostCommonLeadSource
  ])

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
