import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetLiquidFundTimelineAggregate,
  type MonthlyPerformanceData,
  type MonthlyValueData
} from '../queries/LiquidFundTimelineAggregateQuery'

export interface LiquidFundTimelineAggregateIntegration {
  performanceData: MonthlyPerformanceData[]
  valueTrendsData: MonthlyValueData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches Liquid Fund timeline data using server-side aggregates
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
  const [performanceData, setPerformanceData] = useState<MonthlyPerformanceData[]>([])
  const [valueTrendsData, setValueTrendsData] = useState<MonthlyValueData[]>([])
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

    console.log('🔄 Loading liquid fund timeline data...', { currency, chartType, queryName })
    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { performanceData: perf, valueTrendsData: trends } = await fetchTimelineData(currency, queryName)

      console.log('✅ Timeline data loaded successfully', {
        performanceMonths: perf.length,
        valueTrendsMonths: trends.length
      })

      setPerformanceData(perf)
      setValueTrendsData(trends)
    } catch (err) {
      console.error('❌ Error loading liquid fund timeline data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, queryName, fetchTimelineData])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    performanceData,
    valueTrendsData,
    isLoading,
    error,
    refetch: loadData
  }
}
