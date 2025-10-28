import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useGetRealEstateTimelineAggregate,
  type YearlyTimelineData,
  type YearlyPerformanceData
} from '../queries/RealEstateTimelineAggregateQuery'

export interface RealEstateTimelineAggregateIntegration {
  timelineData: YearlyTimelineData[]
  performanceData: YearlyPerformanceData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Hook that fetches Real Estate timeline data using server-side aggregates (yearly data)
 * Optimized to execute only when the Timeline Analysis tab is active
 *
 * @param context - Business app context with access token
 * @param currency - Currency filter for the timeline data
 * @param chartType - Type of chart ('timeline' or 'performance') for query differentiation
 * @returns Timeline data with loading/error states
 */
export const useRealEstateTimelineAggregate = (
  context: BusinessAppContextProps,
  currency: string,
  chartType: 'timeline' | 'performance' = 'timeline'
): RealEstateTimelineAggregateIntegration => {
  const { fetchTimelineData } = useGetRealEstateTimelineAggregate(context)
  const [timelineData, setTimelineData] = useState<YearlyTimelineData[]>([])
  const [performanceData, setPerformanceData] = useState<YearlyPerformanceData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  // Generate unique query name based on chart type
  const queryName = chartType === 'timeline' ? 'GetRealEstateTimeline' : 'GetRealEstatePerformance'

  const loadData = useCallback(async () => {
    if (!context.accessToken || isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      const { timelineData: timeline, performanceData: perf } = await fetchTimelineData(currency, queryName)

      setTimelineData(timeline)
      setPerformanceData(perf)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, currency, queryName, fetchTimelineData])

  useEffect(() => {
    void loadData()
  }, [currency, queryName, loadData])

  return {
    timelineData,
    performanceData,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
