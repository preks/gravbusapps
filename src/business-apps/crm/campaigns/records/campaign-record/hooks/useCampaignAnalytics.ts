import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useCampaignAnalyticsQueries,
  CampaignAnalyticsMetrics,
  CampaignConversionFunnel,
  CampaignTimelineAnalysis,
  CampaignRevenueTrendAnalysis
} from '../queries/CampaignAnalyticsQueries'

interface CampaignAnalyticsData {
  metrics: CampaignAnalyticsMetrics | null
  conversionFunnel: CampaignConversionFunnel | null
  entityTimelineAnalysis: CampaignTimelineAnalysis | null
  revenueTrendAnalysis: CampaignRevenueTrendAnalysis | null
}

interface UseCampaignAnalyticsReturn {
  analyticsData: CampaignAnalyticsData
  timelineDateRangeLabel: string
  isLoading: boolean
  isTimelineLoading: boolean
  error: string | null
  refetch: () => void
}

interface UseCampaignAnalyticsOptions {
  enabled?: boolean
  startDate?: string
  endDate?: string
}

export const useCampaignAnalytics = (
  context: BusinessAppContextProps,
  campaignId: string,
  options: UseCampaignAnalyticsOptions = {}
): UseCampaignAnalyticsReturn => {
  const { enabled = true, startDate, endDate } = options
  const [analyticsData, setAnalyticsData] = useState<CampaignAnalyticsData>({
    metrics: null,
    conversionFunnel: null,
    entityTimelineAnalysis: null,
    revenueTrendAnalysis: null
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialLoadDoneRef = useRef(false)
  const selectedRangeRef = useRef({ startDate, endDate })

  const { fetchAnalyticsMetrics, fetchConversionFunnel, fetchCombinedTimelineAnalysis } =
    useCampaignAnalyticsQueries(context)

  const loadAllAnalyticsData = useCallback(async () => {
    if (!campaignId || !context.accessToken) {
      setError('Missing campaign ID or access token')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all analytics data in parallel for better performance
      const [metrics, conversionFunnel, combinedTimelineAnalysis] = await Promise.all([
        fetchAnalyticsMetrics(campaignId),
        fetchConversionFunnel(campaignId),
        fetchCombinedTimelineAnalysis(campaignId, selectedRangeRef.current)
      ])

      setAnalyticsData({
        metrics,
        conversionFunnel,
        entityTimelineAnalysis: combinedTimelineAnalysis.entityTimelineAnalysis,
        revenueTrendAnalysis: combinedTimelineAnalysis.revenueTrendAnalysis
      })
      initialLoadDoneRef.current = true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')

      // Set empty data on error
      setAnalyticsData({
        metrics: null,
        conversionFunnel: null,
        entityTimelineAnalysis: null,
        revenueTrendAnalysis: null
      })
    } finally {
      setIsLoading(false)
    }
  }, [campaignId, context.accessToken, fetchAnalyticsMetrics, fetchConversionFunnel, fetchCombinedTimelineAnalysis])

  useEffect(() => {
    selectedRangeRef.current = { startDate, endDate }
  }, [startDate, endDate])

  const loadTimelineAnalysis = useCallback(async () => {
    if (!campaignId || !context.accessToken || !initialLoadDoneRef.current) {
      return
    }

    setIsTimelineLoading(true)
    try {
      const combinedTimelineAnalysis = await fetchCombinedTimelineAnalysis(campaignId, selectedRangeRef.current)
      setAnalyticsData(prev => ({
        ...prev,
        entityTimelineAnalysis: combinedTimelineAnalysis.entityTimelineAnalysis,
        revenueTrendAnalysis: combinedTimelineAnalysis.revenueTrendAnalysis
      }))
    } catch (err) {
      console.error('Failed to load timeline analysis:', err)
    } finally {
      setIsTimelineLoading(false)
    }
  }, [campaignId, context.accessToken, fetchCombinedTimelineAnalysis])

  // Load full analytics data on first mount / refetch only.
  useEffect(() => {
    if (enabled && campaignId && context.accessToken) {
      loadAllAnalyticsData()
    }
  }, [enabled, campaignId, context.accessToken, loadAllAnalyticsData])

  // Reload timeline when campaign date range changes.
  useEffect(() => {
    if (enabled && campaignId && context.accessToken) {
      loadTimelineAnalysis()
    }
  }, [enabled, campaignId, context.accessToken, startDate, endDate, loadTimelineAnalysis])

  return {
    analyticsData,
    timelineDateRangeLabel:
      analyticsData.entityTimelineAnalysis?.selectedRangeLabel ??
      analyticsData.revenueTrendAnalysis?.selectedRangeLabel ??
      'Date Range unavailable',
    isLoading,
    isTimelineLoading,
    error,
    refetch: () => {
      loadAllAnalyticsData().catch(err => {
        console.error('Error refetching analytics:', err)
      })
    }
  }
}
