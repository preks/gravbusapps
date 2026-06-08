import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'
import dayjs from 'dayjs'

// Import types and GraphQL queries from separate files
export * from './CampaignAnalyticsTypes'
export * from './CampaignAnalyticsGraphQL'
import {
  CampaignAnalyticsMetrics,
  CampaignConversionFunnel,
  CampaignTimelineAnalysis,
  CampaignRevenueTrendAnalysis
} from './CampaignAnalyticsTypes'
import { GET_CAMPAIGN_ANALYTICS_METRICS, GET_CAMPAIGN_CONVERSION_FUNNEL } from './CampaignAnalyticsGraphQL'

interface DayRange {
  date: string
  startIso: string
  endIso: string
}

interface CampaignTimelineDateRange {
  startDate?: string
  endDate?: string
}

interface CampaignCombinedTimelineAnalysis {
  entityTimelineAnalysis: CampaignTimelineAnalysis
  revenueTrendAnalysis: CampaignRevenueTrendAnalysis
}

// Hook for Campaign Analytics Queries
export const useCampaignAnalyticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const buildDateDayRanges = useCallback(
    (
      selectedRange?: CampaignTimelineDateRange
    ): { rangeStart: dayjs.Dayjs; rangeEnd: dayjs.Dayjs; days: DayRange[] } => {
      const today = dayjs()
      const parsedStart = selectedRange?.startDate ? dayjs(selectedRange.startDate).startOf('day') : null
      const parsedEnd = selectedRange?.endDate ? dayjs(selectedRange.endDate).endOf('day') : null

      const hasValidRange = Boolean(parsedStart && parsedEnd && parsedStart.isValid() && parsedEnd.isValid())
      const normalizedStart = hasValidRange ? (parsedStart as dayjs.Dayjs) : today.startOf('month')
      let normalizedEnd = today.endOf('day')

      if (hasValidRange) {
        const validStart = parsedStart as dayjs.Dayjs
        const validEnd = parsedEnd as dayjs.Dayjs
        normalizedEnd = (validEnd.isAfter(validStart) ? validEnd : validStart).endOf('day')
      }

      const rangeStart = hasValidRange ? normalizedStart : today.startOf('month')
      const rangeEnd = hasValidRange ? normalizedEnd : today.endOf('day')
      const dayCount = rangeEnd.diff(rangeStart.startOf('day'), 'day') + 1

      const days = Array.from({ length: dayCount }, (_, dayIndex) => {
        const start = rangeStart.startOf('day').add(dayIndex, 'day')
        return {
          date: start.format('YYYY-MM-DD'),
          startIso: start.toISOString(),
          endIso: start.add(1, 'day').toISOString()
        }
      })

      return { rangeStart, rangeEnd, days }
    },
    []
  )

  const fetchAnalyticsMetrics = useCallback(
    async (campaignId: string): Promise<CampaignAnalyticsMetrics> => {
      const query = GET_CAMPAIGN_ANALYTICS_METRICS()
      const result = await graphqlClient.request<any>(query, { campaignId })

      const totalEntities = {
        leads: result.leadsCount.aggregate.count || 0,
        accounts: result.accountsCount.aggregate.count || 0,
        contacts: result.contactsCount.aggregate.count || 0,
        opportunities: result.opportunitiesCount.aggregate.count || 0
      }

      const conversionMetrics = {
        leadsConverted: result.convertedLeads.aggregate.count || 0,
        conversionRate:
          totalEntities.leads > 0 ? ((result.convertedLeads.aggregate.count || 0) / totalEntities.leads) * 100 : 0,
        mqlCount: result.mqlCount?.aggregate?.count || 0,
        sqlCount: result.sqlCount?.aggregate?.count || 0
      }

      const revenueMetrics = {
        totalPipeline: result.opportunitiesRevenue.aggregate.sum?.estimatedAmount || 0,
        wonRevenue: result.wonOpportunities.aggregate.sum?.estimatedAmount || 0,
        averageOpportunitySize: result.opportunitiesRevenue.aggregate.avg?.estimatedAmount || 0,
        winRate:
          totalEntities.opportunities > 0
            ? ((result.wonOpportunities.aggregate.count || 0) / totalEntities.opportunities) * 100
            : 0
      }

      return {
        totalEntities,
        conversionMetrics,
        revenueMetrics,
        performanceMetrics: {
          activitiesCount: 0,
          avgDaysToClose: 0
        }
      }
    },
    [graphqlClient]
  )

  const fetchConversionFunnel = useCallback(
    async (campaignId: string): Promise<CampaignConversionFunnel> => {
      const query = GET_CAMPAIGN_CONVERSION_FUNNEL()
      const result = await graphqlClient.request<any>(query, { campaignId })

      const totalLeads = result.totalLeads.aggregate.count || 0
      const mqlCount = result.mqlCount?.aggregate?.count || 0
      const sqlCount = result.sqlCount?.aggregate?.count || 0
      const convertedLeads = result.convertedLeads.aggregate.count || 0
      const createdAccounts = result.createdAccounts.aggregate.count || 0
      const createdContacts = result.createdContacts.aggregate.count || 0
      const createdOpportunities = result.createdOpportunities.aggregate.count || 0
      const wonOpportunities = result.wonOpportunities.aggregate.count || 0

      // Create stages array with proper calculations
      const stages = [
        {
          stage: 'Total Leads',
          count: totalLeads,
          percentage: totalLeads > 0 ? 100 : 0
        },
        {
          stage: 'MQL',
          count: mqlCount,
          percentage: totalLeads > 0 ? (mqlCount / totalLeads) * 100 : 0,
          dropoffRate: totalLeads > 0 ? ((totalLeads - mqlCount) / totalLeads) * 100 : 0
        },
        {
          stage: 'SQL',
          count: sqlCount,
          percentage: totalLeads > 0 ? (sqlCount / totalLeads) * 100 : 0,
          dropoffRate: mqlCount > 0 ? ((mqlCount - sqlCount) / mqlCount) * 100 : 0
        },
        {
          stage: 'Converted Leads',
          count: convertedLeads,
          percentage: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
        },
        {
          stage: 'Created Accounts',
          count: createdAccounts,
          percentage: convertedLeads > 0 ? (createdAccounts / convertedLeads) * 100 : 0,
          dropoffRate: convertedLeads > 0 ? ((convertedLeads - createdAccounts) / convertedLeads) * 100 : 0
        },
        {
          stage: 'Created Contacts',
          count: createdContacts,
          percentage: convertedLeads > 0 ? (createdContacts / convertedLeads) * 100 : 0,
          dropoffRate: createdAccounts > 0 ? ((createdAccounts - createdContacts) / createdAccounts) * 100 : 0
        },
        {
          stage: 'Created Opportunities',
          count: createdOpportunities,
          percentage: convertedLeads > 0 ? (createdOpportunities / convertedLeads) * 100 : 0,
          dropoffRate: createdContacts > 0 ? ((createdContacts - createdOpportunities) / createdContacts) * 100 : 0
        },
        {
          stage: 'Won Opportunities',
          count: wonOpportunities,
          percentage: convertedLeads > 0 ? (wonOpportunities / convertedLeads) * 100 : 0,
          dropoffRate:
            createdOpportunities > 0 ? ((createdOpportunities - wonOpportunities) / createdOpportunities) * 100 : 0
        }
      ]

      return { stages }
    },
    [graphqlClient]
  )

  const fetchCombinedTimelineAnalysis = useCallback(
    async (
      campaignId: string,
      selectedRange?: CampaignTimelineDateRange
    ): Promise<CampaignCombinedTimelineAnalysis> => {
      const { rangeStart, rangeEnd, days } = buildDateDayRanges(selectedRange)

      const queryParts = days
        .map(
          (day, dayIndex) => `
          day${dayIndex}_leads: LeadAggregate(
            where: {
              salesCampaignId: { _eq: $campaignId }
              isDeleted: { _eq: false }
              createdAt: { _gte: "${day.startIso}", _lt: "${day.endIso}" }
            }
          ) { aggregate { count } }
          day${dayIndex}_accounts: AccountAggregate(
            where: {
              salesCampaignId: { _eq: $campaignId }
              isDeleted: { _eq: false }
              createdAt: { _gte: "${day.startIso}", _lt: "${day.endIso}" }
            }
          ) { aggregate { count } }
          day${dayIndex}_contacts: ContactAggregate(
            where: {
              salesCampaignId: { _eq: $campaignId }
              isDeleted: { _eq: false }
              createdAt: { _gte: "${day.startIso}", _lt: "${day.endIso}" }
            }
          ) { aggregate { count } }
          day${dayIndex}_opportunities: OpportunityAggregate(
            where: {
              salesCampaignId: { _eq: $campaignId }
              isDeleted: { _eq: false }
              createdAt: { _gte: "${day.startIso}", _lt: "${day.endIso}" }
            }
          ) { aggregate { count } }
          day${dayIndex}_revenue: OpportunityAggregate(
            where: {
              salesCampaignId: { _eq: $campaignId }
              isDeleted: { _eq: false }
              createdAt: { _gte: "${day.startIso}", _lt: "${day.endIso}" }
              estimatedAmount: { _gt: 0 }
            }
          ) {
            aggregate {
              sum {
                estimatedAmount
              }
            }
          }
        `
        )
        .join('\n')

      const query = `
        query GetCampaignCombinedTimelineByRange($campaignId: uuid!) {
          ${queryParts}
        }
      `
      const result = await graphqlClient.request<Record<string, any>>(query, { campaignId })

      let cumulativeLeads = 0
      let cumulativeAccounts = 0
      let cumulativeContacts = 0
      let cumulativeOpportunities = 0
      let cumulativeRevenue = 0

      const entityCreationTimeline = days.map((day, dayIndex) => {
        const leads = result[`day${dayIndex}_leads`]?.aggregate?.count || 0
        const accounts = result[`day${dayIndex}_accounts`]?.aggregate?.count || 0
        const contacts = result[`day${dayIndex}_contacts`]?.aggregate?.count || 0
        const opportunities = result[`day${dayIndex}_opportunities`]?.aggregate?.count || 0
        const dailyRevenue = Number(result[`day${dayIndex}_revenue`]?.aggregate?.sum?.estimatedAmount || 0)

        cumulativeLeads += leads
        cumulativeAccounts += accounts
        cumulativeContacts += contacts
        cumulativeOpportunities += opportunities
        cumulativeRevenue += dailyRevenue

        return {
          date: day.date,
          leads,
          accounts,
          contacts,
          opportunities,
          dailyRevenue,
          cumulativeLeads,
          cumulativeAccounts,
          cumulativeContacts,
          cumulativeOpportunities,
          cumulativeRevenue
        }
      })

      const revenueTimeline = entityCreationTimeline.map(item => ({
        date: item.date,
        dailyRevenue: item.dailyRevenue,
        cumulativeRevenue: item.cumulativeRevenue
      }))

      const selectedRangeLabel = `${rangeStart.format('DD MMM YYYY')} – ${rangeEnd.format('DD MMM YYYY')}`

      return {
        entityTimelineAnalysis: {
          selectedRangeStart: rangeStart.toISOString(),
          selectedRangeEnd: rangeEnd.toISOString(),
          selectedRangeLabel,
          entityCreationTimeline
        },
        revenueTrendAnalysis: {
          selectedRangeStart: rangeStart.toISOString(),
          selectedRangeEnd: rangeEnd.toISOString(),
          selectedRangeLabel,
          revenueTimeline
        }
      }
    },
    [buildDateDayRanges, graphqlClient]
  )

  return {
    fetchAnalyticsMetrics,
    fetchConversionFunnel,
    fetchCombinedTimelineAnalysis
  }
}
