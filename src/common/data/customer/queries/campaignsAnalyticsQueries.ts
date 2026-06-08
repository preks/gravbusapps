import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import type { TimelinePeriod } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaigns-analytics/types/CampaignsAnalyticsTypes'

const OPPORTUNITY_STATUS_CODE_WON = 'WON'

export const GET_CAMPAIGNS_ANALYTICS_METRICS = (): string => {
  return `
    query GetCampaignsAnalyticsMetrics {
      totalLeads: LeadAggregate(
        where: {
          isDeleted: { _eq: false }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) {
        aggregate {
          count
        }
      }

      totalAccounts: AccountAggregate(
        where: {
          isDeleted: { _eq: false }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) {
        aggregate {
          count
        }
      }

      totalContacts: ContactAggregate(
        where: {
          isDeleted: { _eq: false }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) {
        aggregate {
          count
        }
      }

      totalOpportunities: OpportunityAggregate(
        where: {
          isDeleted: { _eq: false }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) {
        aggregate {
          count
        }
      }

      wonOpportunities: OpportunityAggregate(
        where: {
          isDeleted: { _eq: false }
          salesCampaign: { isDeleted: { _eq: false } }
          opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
        }
      ) {
        aggregate {
          count
        }
      }

      totalRevenue: OpportunityAggregate(
        where: {
          isDeleted: { _eq: false }
          salesCampaign: { isDeleted: { _eq: false } }
          opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
          estimatedAmount: { _gt: 0 }
        }
      ) {
        aggregate {
          sum {
            estimatedAmount
          }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_PERFORMANCE_COMPARISON = (): string => {
  return `
    query GetCampaignsPerformanceComparison($limit: Int!) {
      campaigns: SalesCampaign(
        where: {
          isDeleted: { _eq: false }
        }
        orderBy: [{ createdAt: DESC }]
        limit: $limit
      ) {
        id
        name
        typeRef
        startDate
        endDate
        customerCampaignStatus { id value code objectValue }
        createdAt
        leadAggregate { aggregate { count } }
        accountAggregate { aggregate { count } }
        contactAggregate { aggregate { count } }
        opportunityAggregate { aggregate { count } }
        wonOpportunityAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
          }
        ) {
          aggregate { count }
        }
        revenueAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate { sum { estimatedAmount } }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_REVENUE_ANALYSIS = (): string => {
  return `
    query GetCampaignsRevenueAnalysis($limit: Int!) {
      campaigns: SalesCampaign(
        where: {
          isDeleted: { _eq: false }
          opportunity: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
            estimatedAmount: { _gt: 0 }
          }
        }
        orderBy: [{ createdAt: DESC }]
        limit: $limit
      ) {
        id
        name
        typeRef
        startDate
        endDate
        customerCampaignStatus { id value code objectValue }
        createdAt
        leadAggregate { aggregate { count } }
        accountAggregate { aggregate { count } }
        contactAggregate { aggregate { count } }
        opportunityAggregate { aggregate { count } }
        wonOpportunityAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
          }
        ) {
          aggregate { count }
        }
        revenueAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate { sum { estimatedAmount } }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_EFFICIENCY_ANALYSIS = (): string => {
  return `
    query GetCampaignsEfficiencyAnalysis($limit: Int!) {
      campaigns: SalesCampaign(
        where: {
          isDeleted: { _eq: false }
          _and: [
            {
              opportunity: {
                opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
                estimatedAmount: { _gt: 0 }
              }
            }
            { lead: { id: { _isNull: false } } }
            { opportunity: { id: { _isNull: false } } }
          ]
        }
        orderBy: [{ createdAt: DESC }]
        limit: $limit
      ) {
        id
        name
        typeRef
        startDate
        endDate
        customerCampaignStatus { id value code objectValue }
        createdAt
        leadAggregate { aggregate { count } }
        accountAggregate { aggregate { count } }
        contactAggregate { aggregate { count } }
        opportunityAggregate { aggregate { count } }
        wonOpportunityAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
          }
        ) {
          aggregate { count }
        }
        revenueAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate { sum { estimatedAmount } }
        }
      }
    }
  `
}

export const GET_CAMPAIGNS_TIMELINE_ANALYSIS = (period: TimelinePeriod = 'last-year'): string => {
  const timelineBuckets = buildTimelineBuckets(period)
  const timelineSelections = timelineBuckets
    .map(bucket => {
      return `
      ${bucket.alias}Campaigns: SalesCampaignAggregate(
        where: {
          isDeleted: { _eq: false }
          createdAt: { _gte: "${bucket.startIso}", _lt: "${bucket.endIso}" }
        }
      ) { aggregate { count } }

      ${bucket.alias}Leads: LeadAggregate(
        where: {
          isDeleted: { _eq: false }
          createdAt: { _gte: "${bucket.startIso}", _lt: "${bucket.endIso}" }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) { aggregate { count } }

      ${bucket.alias}Accounts: AccountAggregate(
        where: {
          isDeleted: { _eq: false }
          createdAt: { _gte: "${bucket.startIso}", _lt: "${bucket.endIso}" }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) { aggregate { count } }

      ${bucket.alias}Contacts: ContactAggregate(
        where: {
          isDeleted: { _eq: false }
          createdAt: { _gte: "${bucket.startIso}", _lt: "${bucket.endIso}" }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) { aggregate { count } }

      ${bucket.alias}Opportunities: OpportunityAggregate(
        where: {
          isDeleted: { _eq: false }
          createdAt: { _gte: "${bucket.startIso}", _lt: "${bucket.endIso}" }
          salesCampaign: { isDeleted: { _eq: false } }
        }
      ) { aggregate { count } }

      ${bucket.alias}Revenue: OpportunityAggregate(
        where: {
          isDeleted: { _eq: false }
          createdAt: { _gte: "${bucket.startIso}", _lt: "${bucket.endIso}" }
          salesCampaign: { isDeleted: { _eq: false } }
          opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
        }
      ) { aggregate { sum { estimatedAmount } } }
      `
    })
    .join('\n')

  return `
    query GetCampaignsTimelineAnalysis {
      ${timelineSelections}
    }
  `
}

interface TimelineBucket {
  alias: string
  startIso: string
  endIso: string
  dateLabel: string
}

const buildTimelineBuckets = (period: TimelinePeriod = 'last-year'): TimelineBucket[] => {
  const end = dayjs()
  let start: Dayjs
  let granularity: 'month' | 'year' = 'month'

  switch (period) {
    case 'last-month':
      start = end.startOf('month')
      break
    case 'last-quarter':
      start = end.subtract(2, 'month').startOf('month')
      break
    case 'last-6-months':
      start = end.subtract(5, 'month').startOf('month')
      break
    case 'historical':
      start = end.subtract(4, 'year').startOf('year')
      granularity = 'year'
      break
    case 'last-year':
    default:
      start = end.subtract(11, 'month').startOf('month')
      break
  }

  const loopEnd = granularity === 'year' ? end.endOf('year') : end.endOf('month')
  const buckets: TimelineBucket[] = []

  let current = start
  let index = 0
  while (current.isBefore(loopEnd) || current.isSame(loopEnd, granularity)) {
    const bucketStart = granularity === 'year' ? current.startOf('year') : current.startOf('month')
    const bucketEnd =
      granularity === 'year' ? current.add(1, 'year').startOf('year') : current.add(1, 'month').startOf('month')

    buckets.push({
      alias: `bucket${index}`,
      startIso: bucketStart.toISOString(),
      endIso: bucketEnd.toISOString(),
      dateLabel: bucketStart.format('YYYY-MM-DD')
    })

    current = granularity === 'year' ? current.add(1, 'year') : current.add(1, 'month')
    index += 1
  }

  return buckets
}

export const GET_CAMPAIGNS_TIMELINE_BUCKETS = (
  period: TimelinePeriod = 'last-year'
): Array<{ alias: string; dateLabel: string }> => {
  return buildTimelineBuckets(period).map(bucket => ({
    alias: bucket.alias,
    dateLabel: bucket.dateLabel
  }))
}

export const GET_TOP_PERFORMING_CAMPAIGNS = (): string => {
  return `
    query GetTopPerformingCampaigns($limit: Int!) {
      campaigns: SalesCampaign(
        where: {
          isDeleted: { _eq: false }
        }
        orderBy: [{ createdAt: DESC }]
        limit: $limit
      ) {
        id
        name
        typeRef
        type {
          id
          value
          code
        }
        startDate
        endDate
        customerCampaignStatus { id value code objectValue }
        createdAt
        leadAggregate { aggregate { count } }
        accountAggregate { aggregate { count } }
        contactAggregate { aggregate { count } }
        opportunityAggregate { aggregate { count } }
        wonOpportunityAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
          }
        ) {
          aggregate { count }
        }
        revenueAggregate: opportunityAggregate(
          where: {
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
            estimatedAmount: { _gt: 0 }
          }
        ) {
          aggregate { sum { estimatedAmount } }
        }
      }
    }
  `
}
