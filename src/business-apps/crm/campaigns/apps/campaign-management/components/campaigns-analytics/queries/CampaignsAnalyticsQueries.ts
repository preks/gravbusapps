import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  GET_CAMPAIGNS_ANALYTICS_METRICS,
  GET_CAMPAIGNS_PERFORMANCE_COMPARISON,
  GET_CAMPAIGNS_REVENUE_ANALYSIS,
  GET_CAMPAIGNS_EFFICIENCY_ANALYSIS,
  GET_CAMPAIGNS_TIMELINE_ANALYSIS,
  GET_TOP_PERFORMING_CAMPAIGNS,
  GET_TOP_PERFORMING_EMPLOYEES
} from './CampaignsAnalyticsGraphQL'

// Shared type definitions to eliminate duplication
interface AggregateCount {
  aggregate: { count: number }
}

interface AggregateSum {
  aggregate: {
    sum: { estimatedAmount: number | null }
  }
}

interface AggregateCountAndSum {
  aggregate: {
    count: number
    sum: { estimatedAmount: number | null }
  }
}

interface EmployeeInfo {
  id: string
  displayName: string
  firstName: string
  lastName: string
}

// Shared entity structure to eliminate duplication
interface EntityWithCreatedAt {
  id: string
  createdAt: string
}

interface EntityWithOwner {
  id: string
  ownerEmployee: EmployeeInfo
}

// Shared campaign aggregates structure to eliminate duplication
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

// Response interfaces
interface CampaignsMetricsResponse {
  totalCampaigns: AggregateCount
  activeCampaigns: AggregateCount
  upcomingCampaigns: AggregateCount
  completedCampaigns: AggregateCount
  campaigns: Array<{
    id: string
    name: string
    startDate: string
    endDate: string
    leadAggregate: AggregateCount
    accountAggregate: AggregateCount
    contactAggregate: AggregateCount
    opportunityAggregate: AggregateCount
    wonOpportunityAggregate: AggregateCountAndSum
  }>
}

interface CampaignPerformanceResponse {
  campaigns: Array<
    {
      id: string
      name: string
      typeRef: string
      startDate: string
      endDate: string
      createdAt: string
    } & CampaignAggregatesWithRevenue
  >
}

interface CampaignsTimelineAnalysisResponse {
  campaigns: Array<{
    id: string
    name: string
    createdAt: string
    startDate: string
    endDate: string
    lead: EntityWithCreatedAt[]
    account: EntityWithCreatedAt[]
    contact: EntityWithCreatedAt[]
    opportunity: Array<
      EntityWithCreatedAt & {
        estimatedAmount: number
        opportunityStatus: {
          value: string
        } | null
      }
    >
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
      createdAt: string
    } & CampaignAggregatesWithRevenue
  >
}

interface TopPerformingEmployeesResponse {
  campaigns: Array<{
    id: string
    name: string
    lead: Array<
      EntityWithOwner & {
        account: {
          id: string
        } | null
      }
    >
    account: EntityWithOwner[]
    contact: EntityWithOwner[]
    opportunity: Array<
      EntityWithOwner & {
        estimatedAmount: number
        opportunityStatus: {
          value: string
        } | null
      }
    >
  }>
}

export const useCampaignsAnalyticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Generic helper to eliminate duplicate fetch logic
  const createFetchFunction = useCallback(
    <T>(queryBuilder: (param?: string) => string) => {
      return async (param?: string): Promise<T> => {
        const query = queryBuilder(param)
        return await graphqlClient.request<T>(query)
      }
    },
    [graphqlClient]
  )

  const fetchCampaignsAnalyticsMetrics = useCallback(
    () => createFetchFunction<CampaignsMetricsResponse>(GET_CAMPAIGNS_ANALYTICS_METRICS)(),
    [createFetchFunction]
  )

  const fetchCampaignsPerformanceComparison = useCallback(
    () => createFetchFunction<CampaignPerformanceResponse>(GET_CAMPAIGNS_PERFORMANCE_COMPARISON)(),
    [createFetchFunction]
  )

  const fetchCampaignsRevenueAnalysis = useCallback(
    () => createFetchFunction<CampaignPerformanceResponse>(GET_CAMPAIGNS_REVENUE_ANALYSIS)(),
    [createFetchFunction]
  )

  const fetchCampaignsEfficiencyAnalysis = useCallback(
    () => createFetchFunction<CampaignPerformanceResponse>(GET_CAMPAIGNS_EFFICIENCY_ANALYSIS)(),
    [createFetchFunction]
  )

  const fetchCampaignsTimelineAnalysis = useCallback(
    (startDate?: string) =>
      createFetchFunction<CampaignsTimelineAnalysisResponse>(GET_CAMPAIGNS_TIMELINE_ANALYSIS)(startDate),
    [createFetchFunction]
  )

  const fetchTopPerformingCampaigns = useCallback(
    () => createFetchFunction<TopPerformingCampaignsResponse>(GET_TOP_PERFORMING_CAMPAIGNS)(),
    [createFetchFunction]
  )

  const fetchTopPerformingEmployees = useCallback(
    () => createFetchFunction<TopPerformingEmployeesResponse>(GET_TOP_PERFORMING_EMPLOYEES)(),
    [createFetchFunction]
  )

  return {
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsRevenueAnalysis,
    fetchCampaignsEfficiencyAnalysis,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns,
    fetchTopPerformingEmployees
  }
}
