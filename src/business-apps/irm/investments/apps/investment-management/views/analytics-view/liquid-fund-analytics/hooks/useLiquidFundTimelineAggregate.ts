import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetLiquidFundTimelineAggregate,
  type YearlyPerformanceData,
  type YearlyValueData
} from '../queries/LiquidFundTimelineAggregateQuery'

export interface LiquidFundTimelineAggregateIntegration {
  performanceData: YearlyPerformanceData[]
  valueTrendsData: YearlyValueData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches Liquid Fund timeline data using server-side aggregates (yearly data)
 * Optimized to execute only when the Timeline Analysis tab is active
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter for the timeline data
 * @param chartType - Type of chart ('performance' or 'valueTrends') for query differentiation
 * @returns Timeline data with loading/error states
 */
export const useLiquidFundTimelineAggregate = (
  context: BusinessAppContextProps,
  currency: string,
  chartType: 'performance' | 'valueTrends' = 'performance'
): LiquidFundTimelineAggregateIntegration => {
  const { fetchTimelineData } = useGetLiquidFundTimelineAggregate(context)
  const [performanceData, setPerformanceData] = useState<YearlyPerformanceData[]>([])
  const [valueTrendsData, setValueTrendsData] = useState<YearlyValueData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  // Generate unique query name based on chart type
  const queryName = chartType === 'performance' ? 'GetLiquidFundPerformanceTimeline' : 'GetLiquidFundValueTrends'

  const loadData = useCallback(async () => {
    if (!context.accessToken || isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { performanceData: perf, valueTrendsData: trends } = await fetchTimelineData(currency, queryName)

      setPerformanceData(perf)
      setValueTrendsData(trends)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, queryName, fetchTimelineData])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    performanceData,
    valueTrendsData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
