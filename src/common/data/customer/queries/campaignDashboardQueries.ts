import {
  CAMPAIGN_SEGMENT_CODE_ENTERPRISE,
  CAMPAIGN_SEGMENT_CODE_MID_MARKET,
  CAMPAIGN_STATUS_CODE_ACTIVE
} from '@/common/data/customer/constants/customerCatalogs'

export const GET_REVENUE_ALIGNMENT_DATA = (): string => {
  return `
    query GetRevenueAlignmentData(
      $where: SalesCampaignBoolExp
      $orderBy: [SalesCampaignOrderBy!]
      $limit: Int
      $offset: Int
      $countWhere: SalesCampaignBoolExp
    ) {
      SalesCampaign(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        name
        budgetAllocated
        pipelineTarget
        customerCampaignStatus { id value code objectValue }
        customerCampaignSegment { id value code objectValue }
        pipelineAgg: opportunityAggregate(
          where: {
            isDeleted: { _eq: false }
            opportunityStatus: { code: { _nin: ["LOST"] } }
          }
        ) {
          aggregate {
            sum { estimatedAmount }
            count
          }
        }
        wonAgg: opportunityAggregate(
          where: {
            isDeleted: { _eq: false }
            opportunityStatus: { code: { _eq: "WON" } }
          }
        ) {
          aggregate {
            sum { estimatedAmount }
          }
        }
        customerCampaignEventsAggregate(where: { isDeleted: { _eq: false } }) {
          aggregate {
            sum {
              budget
              pipelineGenerated
            }
          }
        }
      }
      SalesCampaignAggregate(where: $countWhere) {
        aggregate {
          count
        }
      }
    }
  `
}

export type ABMSegmentFilter = 'enterprise' | 'mid-market' | 'all'

const buildABMSegmentWhere = (segmentFilter: ABMSegmentFilter): string => {
  const base = `isDeleted: { _eq: false }, customerCampaignStatus: { code: { _eq: "${CAMPAIGN_STATUS_CODE_ACTIVE}" } }`
  switch (segmentFilter) {
    case 'enterprise':
      return `{ ${base}, customerCampaignSegment: { code: { _eq: "${CAMPAIGN_SEGMENT_CODE_ENTERPRISE}" } } }`
    case 'mid-market':
      return `{ ${base}, customerCampaignSegment: { code: { _eq: "${CAMPAIGN_SEGMENT_CODE_MID_MARKET}" } } }`
    case 'all':
      return `{ ${base}, customerCampaignSegment: { code: { _in: ["${CAMPAIGN_SEGMENT_CODE_ENTERPRISE}", "${CAMPAIGN_SEGMENT_CODE_MID_MARKET}"] } } }`
    default:
      return `{ ${base}, customerCampaignSegment: { code: { _eq: "${CAMPAIGN_SEGMENT_CODE_ENTERPRISE}" } } }`
  }
}

export const GET_ABM_CAMPAIGN_KPIS = (segmentFilter: ABMSegmentFilter = 'enterprise'): string => {
  const segmentWhere = buildABMSegmentWhere(segmentFilter)
  return `
    query GetABMCampaignKpis {
      SalesCampaign(
        where: ${segmentWhere}
      ) {
        id
        customerCampaignAccountsAggregate {
          aggregate {
            count
          }
        }
        customerCampaignEventsAggregate(where: { isDeleted: { _eq: false } }) {
          aggregate {
            sum {
              meetingsHeld
              pipelineGenerated
            }
          }
        }
      }
    }
  `
}

export const GET_ABM_CAMPAIGN_DETAILS = (segmentFilter: ABMSegmentFilter = 'enterprise'): string => {
  const segmentWhere = buildABMSegmentWhere(segmentFilter)
  return `
    query GetABMCampaignDetails {
      SalesCampaign(
        where: ${segmentWhere}
        orderBy: [{ createdAt: DESC }]
      ) {
        id
        name
        budgetAllocated
        pipelineTarget
        startDate
        endDate
        customerCampaignStatus { id value code objectValue }
        customerCampaignSegment { id value code objectValue }
        customerCampaignAccounts {
          id
          customerAccount {
            id
            name
            industry { id value }
          }
          customerEngagementLevel { id value code objectValue }
        }
        customerCampaignEventsAggregate(where: { isDeleted: { _eq: false } }) {
          aggregate {
            sum {
              meetingsHeld
              pipelineGenerated
            }
          }
        }
      }
    }
  `
}

export const GET_MARKETING_ACTIVITIES_CALENDAR = (fromDate: string, toDate: string): string => {
  return `
    query GetMarketingActivitiesCalendar {
      events: CustomerCampaignEvent(
        where: {
          isDeleted: { _eq: false }
          eventDate: { _gte: "${fromDate}", _lte: "${toDate}" }
        }
        orderBy: [{ eventDate: ASC }]
      ) {
        id
        name
        eventDate
        customerCampaignId
        ownerEmployee { id displayName }
        customerCampaign {
          id
          name
          customerCampaignStatus { id value code objectValue }
          customerCampaignSegment { id value code objectValue }
          ownerEmployee { id displayName }
        }
      }
      contents: CustomerCampaignContent(
        where: {
          isDeleted: { _eq: false }
          publishDate: { _gte: "${fromDate}", _lte: "${toDate}" }
        }
        orderBy: [{ publishDate: ASC }]
      ) {
        id
        title
        publishDate
        customerCampaignId
        marketingChannel { id value code objectValue }
        customerCampaign {
          id
          name
          customerCampaignStatus { id value code objectValue }
          customerCampaignSegment { id value code objectValue }
          ownerEmployee { id displayName }
        }
      }
    }
  `
}

export const GET_MARKETING_ACTIVITIES_TIMELINE = (fromDate: string, toDate: string): string => {
  return `
    query GetMarketingActivitiesTimeline {
      events: CustomerCampaignEvent(
        where: {
          isDeleted: { _eq: false }
          eventDate: { _gte: "${fromDate}", _lte: "${toDate}" }
        }
        orderBy: [{ eventDate: ASC }]
      ) {
        id
        name
        eventDate
        customerCampaignId
        ownerEmployee { id displayName }
        customerCampaign {
          id
          name
          customerCampaignStatus { id value code objectValue }
          customerCampaignSegment { id value code objectValue }
          ownerEmployee { id displayName }
        }
      }
      contents: CustomerCampaignContent(
        where: {
          isDeleted: { _eq: false }
          publishDate: { _gte: "${fromDate}", _lte: "${toDate}" }
        }
        orderBy: [{ publishDate: ASC }]
      ) {
        id
        title
        publishDate
        customerCampaignId
        marketingChannel { id value code objectValue }
        customerCampaign {
          id
          name
          customerCampaignStatus { id value code objectValue }
          customerCampaignSegment { id value code objectValue }
          ownerEmployee { id displayName }
        }
      }
    }
  `
}

export interface RevenueAlignmentCampaign {
  id: string
  name: string
  budgetAllocated?: number
  pipelineTarget?: number
  customerCampaignStatus?: { id: string; value: string; code: string; objectValue?: any }
  customerCampaignSegment?: { id: string; value: string; code: string; objectValue?: any }
  pipelineAgg?: {
    aggregate?: {
      sum?: { estimatedAmount?: number | null }
      count?: number
    } | null
  }
  wonAgg?: {
    aggregate?: {
      sum?: { estimatedAmount?: number | null }
    } | null
  }
  customerCampaignEventsAggregate?: {
    aggregate?: {
      sum?: { budget?: number | null; pipelineGenerated?: number | null }
    } | null
  }
}

export interface RevenueAlignmentRow extends RevenueAlignmentCampaign {
  pipelineGenerated: number
  revenueClosed: number
  percentToGoal: number
  opportunitiesCreated: number
  totalEventBudget: number
  totalPipelineFromEvents: number
  costPerOpportunity: number
}

export interface EnterpriseABMCampaign {
  id: string
  name: string
  budgetAllocated?: number
  pipelineTarget?: number
  startDate?: string
  endDate?: string
  customerCampaignStatus?: { id: string; value: string; code: string; objectValue?: any }
  customerCampaignSegment?: { id: string; value: string; code: string; objectValue?: any }
  customerCampaignAccounts?: Array<{
    id: string
    customerAccount?: { id: string; name: string; industry?: { value: string } }
    customerEngagementLevel?: { id: string; value: string; code: string; objectValue?: any }
  }>
  customerCampaignEventsAggregate?: {
    aggregate?: {
      sum?: { meetingsHeld?: number | null; pipelineGenerated?: number | null }
    } | null
  }
  customerCampaignAccountsAggregate?: {
    aggregate?: {
      count?: number | null
    } | null
  }
}

export interface MarketingActivity {
  id: string
  title: string
  date: string
  endDate?: string
  type: 'event' | 'content'
  ownerName?: string
  campaignName?: string
  channel?: string
  relatedEntityId?: string
  relatedEntityName?: string
  status?: string
  segment?: string
  channelEntry?: { id?: string; value?: string; code?: string; objectValue?: any }
  statusEntry?: { id?: string; value?: string; code?: string; objectValue?: any }
  segmentEntry?: { id?: string; value?: string; code?: string; objectValue?: any }
}
