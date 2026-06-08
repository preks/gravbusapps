import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignsAnalyticsQueries } from '@/common/data/customer/hooks/useCampaignsAnalyticsQueries'
import {
  CampaignsAnalyticsData,
  CampaignsAnalyticsMetrics,
  CampaignPerformanceComparison,
  CampaignsTimelineData,
  TopPerformingCampaign,
  TimelinePeriod
} from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaigns-analytics/types/CampaignsAnalyticsTypes'

dayjs.extend(weekday)
dayjs.extend(advancedFormat)

interface CampaignWithEntities {
  id: string
  name: string
  createdAt: string
  startDate: string
  endDate: string
  type?: {
    value?: string
  } | null
  customerCampaignStatus?: {
    value?: string
    code?: string
  } | null
  leadAggregate?: { aggregate: { count: number } }
  accountAggregate?: { aggregate: { count: number } }
  contactAggregate?: { aggregate: { count: number } }
  opportunityAggregate?: { aggregate: { count: number } }
  wonOpportunityAggregate?: { aggregate: { count: number; sum?: { estimatedAmount?: number | null } } }
  revenueAggregate?: { aggregate: { sum: { estimatedAmount?: number | null } } }
}

const getCampaignStatus = (campaign: Pick<CampaignWithEntities, 'customerCampaignStatus'>): string =>
  campaign.customerCampaignStatus?.value || campaign.customerCampaignStatus?.code || 'Unknown'

const calculateConversionRate = (converted: number, total: number): number => {
  return total > 0 ? (converted / total) * 100 : 0
}

const calculateWinRate = (won: number, total: number): number => {
  return total > 0 ? (won / total) * 100 : 0
}

const calculateDuration = (startDate: string, endDate: string): number => {
  return dayjs(endDate).diff(dayjs(startDate), 'day')
}

const extractAggregates = (campaign: {
  leadAggregate?: { aggregate: { count: number } }
  accountAggregate?: { aggregate: { count: number } }
  contactAggregate?: { aggregate: { count: number } }
  opportunityAggregate?: { aggregate: { count: number } }
  wonOpportunityAggregate?: { aggregate: { count: number; sum?: { estimatedAmount?: number | null } } }
  revenueAggregate?: { aggregate: { sum: { estimatedAmount?: number | null } } }
}) => ({
  leadsCount: campaign.leadAggregate?.aggregate.count || 0,
  accountsCount: campaign.accountAggregate?.aggregate.count || 0,
  contactsCount: campaign.contactAggregate?.aggregate.count || 0,
  opportunitiesCount: campaign.opportunityAggregate?.aggregate.count || 0,
  wonOpportunitiesCount: campaign.wonOpportunityAggregate?.aggregate.count || 0,
  totalRevenue:
    campaign.revenueAggregate?.aggregate.sum.estimatedAmount ||
    campaign.wonOpportunityAggregate?.aggregate.sum?.estimatedAmount ||
    0
})

const sortByRevenueAndRank = <T extends { totalRevenue: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => b.totalRevenue - a.totalRevenue).map((item, index) => ({ ...item, rank: index + 1 }))
}

const transformCampaignData = (campaign: CampaignWithEntities): CampaignPerformanceComparison => {
  const aggregates = extractAggregates(campaign)

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    status: getCampaignStatus(campaign),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    ...aggregates,
    conversionRate: calculateConversionRate(aggregates.accountsCount, aggregates.leadsCount),
    winRate: calculateWinRate(aggregates.wonOpportunitiesCount, aggregates.opportunitiesCount),
    duration: calculateDuration(campaign.startDate, campaign.endDate)
  }
}

const transformTimelineData = (
  timelinePoints: Array<{
    date: string
    campaignsCreated: number
    leadsGenerated: number
    accountsCreated: number
    contactsCreated: number
    opportunitiesCreated: number
    dailyRevenue: number
  }>
): CampaignsTimelineData[] => {
  const timelineAnalysis: CampaignsTimelineData[] = []
  const sortedPoints = [...timelinePoints].sort((a, b) => a.date.localeCompare(b.date))

  let cumulativeCampaigns = 0
  let cumulativeLeads = 0
  let cumulativeAccounts = 0
  let cumulativeContacts = 0
  let cumulativeOpportunities = 0
  let cumulativeRevenue = 0

  for (const point of sortedPoints) {
    cumulativeCampaigns += point.campaignsCreated
    cumulativeLeads += point.leadsGenerated
    cumulativeAccounts += point.accountsCreated
    cumulativeContacts += point.contactsCreated
    cumulativeOpportunities += point.opportunitiesCreated
    cumulativeRevenue += point.dailyRevenue

    timelineAnalysis.push({
      date: point.date,
      campaignsCreated: point.campaignsCreated,
      cumulativeCampaigns,
      leadsGenerated: point.leadsGenerated,
      cumulativeLeads,
      accountsCreated: point.accountsCreated,
      cumulativeAccounts,
      contactsCreated: point.contactsCreated,
      cumulativeContacts,
      opportunitiesCreated: point.opportunitiesCreated,
      cumulativeOpportunities,
      dailyRevenue: point.dailyRevenue,
      cumulativeRevenue
    })
  }

  return timelineAnalysis
}

export interface UseCampaignsAnalyticsOptions {
  timelinePeriod?: TimelinePeriod
}

export const useCampaignsAnalytics = (context: BusinessAppContextProps, options: UseCampaignsAnalyticsOptions = {}) => {
  const { timelinePeriod = 'last-year' } = options
  const [analyticsData, setAnalyticsData] = useState<CampaignsAnalyticsData>({
    metrics: {
      totalLeads: 0,
      totalAccounts: 0,
      totalContacts: 0,
      totalOpportunities: 0,
      totalRevenue: 0,
      averageConversionRate: 0,
      averageWinRate: 0,
      averageCampaignDuration: 0
    },
    campaignComparisons: [],
    revenueComparisons: [],
    efficiencyComparisons: [],
    timelineAnalysis: [],
    topCampaigns: []
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timelineError, setTimelineError] = useState<string | null>(null)

  const {
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsRevenueAnalysis,
    fetchCampaignsEfficiencyAnalysis,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns
  } = useCampaignsAnalyticsQueries(context)

  const loadTimelineData = useCallback(
    async (periodOverride?: TimelinePeriod) => {
      setIsTimelineLoading(true)
      setTimelineError(null)

      try {
        const effectivePeriod = periodOverride ?? timelinePeriod
        const timelineResponse = await fetchCampaignsTimelineAnalysis(effectivePeriod)
        const timelineAnalysis = transformTimelineData(timelineResponse.timelineData)

        setAnalyticsData(prev => ({
          ...prev,
          timelineAnalysis
        }))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setTimelineError(errorMessage)
      } finally {
        setIsTimelineLoading(false)
      }
    },
    [timelinePeriod, fetchCampaignsTimelineAnalysis]
  )

  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const [
        metricsResponse,
        performanceResponse,
        revenueResponse,
        efficiencyResponse,
        timelineResponse,
        topCampaignsResponse
      ] = await Promise.all([
        fetchCampaignsAnalyticsMetrics(),
        fetchCampaignsPerformanceComparison(),
        fetchCampaignsRevenueAnalysis(),
        fetchCampaignsEfficiencyAnalysis(),
        fetchCampaignsTimelineAnalysis(timelinePeriod),
        fetchTopPerformingCampaigns()
      ])

      const totalLeads = metricsResponse.totalLeads.aggregate.count
      const totalAccounts = metricsResponse.totalAccounts.aggregate.count
      const totalContacts = metricsResponse.totalContacts.aggregate.count
      const totalOpportunities = metricsResponse.totalOpportunities.aggregate.count
      const totalWonOpportunities = metricsResponse.wonOpportunities.aggregate.count
      const totalRevenue = metricsResponse.totalRevenue.aggregate.sum.estimatedAmount || 0

      const metrics: CampaignsAnalyticsMetrics = {
        totalLeads,
        totalAccounts,
        totalContacts,
        totalOpportunities,
        totalRevenue,
        averageConversionRate: calculateConversionRate(totalAccounts, totalLeads),
        averageWinRate: calculateWinRate(totalWonOpportunities, totalOpportunities),
        averageCampaignDuration: 0
      }

      const campaignComparisons: CampaignPerformanceComparison[] =
        performanceResponse.campaigns.map(transformCampaignData)

      if (campaignComparisons.length > 0) {
        metrics.averageCampaignDuration =
          campaignComparisons.reduce((sum, campaign) => sum + campaign.duration, 0) / campaignComparisons.length
      }

      const revenueComparisons: CampaignPerformanceComparison[] = revenueResponse.campaigns.map(transformCampaignData)
      const efficiencyComparisons: CampaignPerformanceComparison[] =
        efficiencyResponse.campaigns.map(transformCampaignData)
      const timelineAnalysis = transformTimelineData(timelineResponse.timelineData)

      const unsortedTopCampaigns = topCampaignsResponse.campaigns.map((campaign, index) => {
        const aggregates = extractAggregates(campaign)

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignType: campaign.type?.value || 'Unknown',
          status: getCampaignStatus(campaign),
          ...aggregates,
          conversionRate: calculateConversionRate(aggregates.accountsCount, aggregates.leadsCount),
          winRate: calculateWinRate(aggregates.wonOpportunitiesCount, aggregates.opportunitiesCount),
          rank: index + 1
        }
      })

      const topCampaigns: TopPerformingCampaign[] = sortByRevenueAndRank(unsortedTopCampaigns)

      setAnalyticsData({
        metrics,
        campaignComparisons,
        revenueComparisons,
        efficiencyComparisons,
        timelineAnalysis,
        topCampaigns
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsRevenueAnalysis,
    fetchCampaignsEfficiencyAnalysis,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns,
    timelinePeriod
  ])

  const refetch = useCallback(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  const fetchAnalytics = useCallback(() => {
    if (context.accessToken) {
      loadAnalyticsData()
    }
  }, [context.accessToken, loadAnalyticsData])

  return {
    analyticsData,
    isLoading,
    isTimelineLoading,
    error,
    timelineError,
    refetch,
    fetchAnalytics,
    refetchTimeline: loadTimelineData
  }
}
