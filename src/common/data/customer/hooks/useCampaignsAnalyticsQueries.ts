import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  GET_CAMPAIGNS_ANALYTICS_METRICS,
  GET_CAMPAIGNS_PERFORMANCE_COMPARISON,
  GET_CAMPAIGNS_REVENUE_ANALYSIS,
  GET_CAMPAIGNS_EFFICIENCY_ANALYSIS,
  GET_CAMPAIGNS_TIMELINE_ANALYSIS,
  GET_CAMPAIGNS_TIMELINE_BUCKETS,
  GET_TOP_PERFORMING_CAMPAIGNS
} from '@/common/data/customer/queries/campaignsAnalyticsQueries'
import type { TimelinePeriod } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaigns-analytics/types/CampaignsAnalyticsTypes'

const CAMPAIGN_COMPARISON_LIMIT = 5
const TOP_CAMPAIGNS_LIMIT = 10

interface AggregateCount {
  aggregate: { count: number }
}

interface AggregateSum {
  aggregate: {
    sum: { estimatedAmount: number | null }
  }
}

interface CatalogEntryInfo {
  id: string
  value?: string
  code?: string
  objectValue?: unknown
}

interface CampaignAggregates {
  leadAggregate: AggregateCount
  accountAggregate: AggregateCount
  contactAggregate: AggregateCount
  opportunityAggregate: AggregateCount
}

interface CampaignAggregatesWithRevenue extends CampaignAggregates {
  wonOpportunityAggregate: AggregateCount
  revenueAggregate: AggregateSum
}

interface CampaignsMetricsResponse {
  totalLeads: AggregateCount
  totalAccounts: AggregateCount
  totalContacts: AggregateCount
  totalOpportunities: AggregateCount
  wonOpportunities: AggregateCount
  totalRevenue: AggregateSum
}

interface CampaignPerformanceResponse {
  campaigns: Array<
    {
      id: string
      name: string
      typeRef: string
      startDate: string
      endDate: string
      customerCampaignStatus?: CatalogEntryInfo | null
      createdAt: string
    } & CampaignAggregatesWithRevenue
  >
}

interface CampaignsTimelineAnalysisResponse {
  timelineData: Array<{
    date: string
    campaignsCreated: number
    leadsGenerated: number
    accountsCreated: number
    contactsCreated: number
    opportunitiesCreated: number
    dailyRevenue: number
  }>
}

interface TopPerformingCampaignsResponse {
  campaigns: Array<
    {
      id: string
      name: string
      typeRef: string
      type: {
        id: string
        value: string
        code: string
      }
      startDate: string
      endDate: string
      customerCampaignStatus?: CatalogEntryInfo | null
      createdAt: string
    } & CampaignAggregatesWithRevenue
  >
}

export const useCampaignsAnalyticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCampaignsAnalyticsMetrics = useCallback(async (): Promise<CampaignsMetricsResponse> => {
    return await graphqlClient.request<CampaignsMetricsResponse>(GET_CAMPAIGNS_ANALYTICS_METRICS())
  }, [graphqlClient])

  const fetchCampaignsPerformanceComparison = useCallback(async (): Promise<CampaignPerformanceResponse> => {
    return await graphqlClient.request<CampaignPerformanceResponse>(GET_CAMPAIGNS_PERFORMANCE_COMPARISON(), {
      limit: CAMPAIGN_COMPARISON_LIMIT
    })
  }, [graphqlClient])

  const fetchCampaignsRevenueAnalysis = useCallback(async (): Promise<CampaignPerformanceResponse> => {
    return await graphqlClient.request<CampaignPerformanceResponse>(GET_CAMPAIGNS_REVENUE_ANALYSIS(), {
      limit: CAMPAIGN_COMPARISON_LIMIT
    })
  }, [graphqlClient])

  const fetchCampaignsEfficiencyAnalysis = useCallback(async (): Promise<CampaignPerformanceResponse> => {
    return await graphqlClient.request<CampaignPerformanceResponse>(GET_CAMPAIGNS_EFFICIENCY_ANALYSIS(), {
      limit: CAMPAIGN_COMPARISON_LIMIT
    })
  }, [graphqlClient])

  const fetchCampaignsTimelineAnalysis = useCallback(
    async (period: TimelinePeriod = 'last-year'): Promise<CampaignsTimelineAnalysisResponse> => {
      const query = GET_CAMPAIGNS_TIMELINE_ANALYSIS(period)
      const buckets = GET_CAMPAIGNS_TIMELINE_BUCKETS(period)
      const rawResult = await graphqlClient.request<Record<string, any>>(query)

      const timelineData = buckets.map(bucket => {
        const campaignsCount = rawResult?.[`${bucket.alias}Campaigns`]?.aggregate?.count ?? 0
        const leadsCount = rawResult?.[`${bucket.alias}Leads`]?.aggregate?.count ?? 0
        const accountsCount = rawResult?.[`${bucket.alias}Accounts`]?.aggregate?.count ?? 0
        const contactsCount = rawResult?.[`${bucket.alias}Contacts`]?.aggregate?.count ?? 0
        const opportunitiesCount = rawResult?.[`${bucket.alias}Opportunities`]?.aggregate?.count ?? 0
        const dailyRevenue = rawResult?.[`${bucket.alias}Revenue`]?.aggregate?.sum?.estimatedAmount ?? 0

        return {
          date: bucket.dateLabel,
          campaignsCreated: campaignsCount,
          leadsGenerated: leadsCount,
          accountsCreated: accountsCount,
          contactsCreated: contactsCount,
          opportunitiesCreated: opportunitiesCount,
          dailyRevenue
        }
      })

      return { timelineData }
    },
    [graphqlClient]
  )

  const fetchTopPerformingCampaigns = useCallback(async (): Promise<TopPerformingCampaignsResponse> => {
    return await graphqlClient.request<TopPerformingCampaignsResponse>(GET_TOP_PERFORMING_CAMPAIGNS(), {
      limit: TOP_CAMPAIGNS_LIMIT
    })
  }, [graphqlClient])

  return {
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsRevenueAnalysis,
    fetchCampaignsEfficiencyAnalysis,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns
  }
}
