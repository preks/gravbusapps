import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useCampaignAnalyticsQueries,
  CampaignAnalyticsMetrics,
  CampaignConversionFunnel,
  CampaignTimelineAnalysis
} from '../queries/CampaignAnalyticsQueries'

interface TopPerformer {
  employeeId: string
  employeeName: string
  leads: { total: number; converted: number }
  opportunities: { total: number; won: number }
  contacts: { total: number }
  accounts: { total: number }
  revenue: number
}

interface CampaignAnalyticsData {
  metrics: CampaignAnalyticsMetrics | null
  conversionFunnel: CampaignConversionFunnel | null
  timelineAnalysis: CampaignTimelineAnalysis | null
  topPerformers: TopPerformer[]
}

interface UseCampaignAnalyticsReturn {
  analyticsData: CampaignAnalyticsData
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useCampaignAnalytics = (
  context: BusinessAppContextProps,
  campaignId: string
): UseCampaignAnalyticsReturn => {
  const [analyticsData, setAnalyticsData] = useState<CampaignAnalyticsData>({
    metrics: null,
    conversionFunnel: null,
    timelineAnalysis: null,
    topPerformers: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchAnalyticsMetrics, fetchConversionFunnel, fetchTimelineAnalysis, fetchTopPerformers } =
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
      const [metrics, conversionFunnel, timelineAnalysis, topPerformers] = await Promise.all([
        fetchAnalyticsMetrics(campaignId),
        fetchConversionFunnel(campaignId),
        fetchTimelineAnalysis(campaignId),
        fetchTopPerformers(campaignId)
      ])

      // Update performance metrics with top performers data
      // Transform detailed top performers into simpler format for performance metrics
      const simplifiedTopPerformers = topPerformers.slice(0, 5).map(performer => ({
        employeeId: performer.employeeId,
        employeeName: performer.employeeName,
        entitiesCount:
          performer.leads.total + performer.opportunities.total + performer.contacts.total + performer.accounts.total,
        revenue: performer.revenue
      }))

      const updatedMetrics: CampaignAnalyticsMetrics = {
        ...metrics,
        performanceMetrics: {
          ...metrics.performanceMetrics,
          topPerformers: simplifiedTopPerformers
        }
      }

      setAnalyticsData({
        metrics: updatedMetrics,
        conversionFunnel,
        timelineAnalysis,
        topPerformers: topPerformers.slice(0, 10) // Show top 10 in detailed view
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')

      // Set empty data on error
      setAnalyticsData({
        metrics: null,
        conversionFunnel: null,
        timelineAnalysis: null,
        topPerformers: []
      })
    } finally {
      setIsLoading(false)
    }
  }, [
    campaignId,
    context.accessToken,
    fetchAnalyticsMetrics,
    fetchConversionFunnel,
    fetchTimelineAnalysis,
    fetchTopPerformers
  ])

  // Load data when campaign or context changes
  useEffect(() => {
    if (campaignId && context.accessToken) {
      loadAllAnalyticsData()
    }
  }, [campaignId, context.accessToken, loadAllAnalyticsData])

  return {
    analyticsData,
    isLoading,
    error,
    refetch: () => {
      loadAllAnalyticsData().catch(err => {
        console.error('Error refetching analytics:', err)
      })
    }
  }
}
