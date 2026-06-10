/**
 * Customer Campaign Content types for GraphQL responses and form payloads.
 * Used by common/data/customer queries and campaign record sections.
 */

export interface CustomerCampaignContentRef {
  id: string
  value: string
  objectValue?: unknown
}

export interface CustomerCampaignContent {
  id: string
  version: number
  title?: string
  description?: string
  publishDate?: string
  assistedOpportunities?: number
  engagementMetrics?: unknown
  createdAt: string
  customerCampaignId?: string
  customerPersona?: CustomerCampaignContentRef
  marketingFunnelStage?: CustomerCampaignContentRef
  marketingChannel?: CustomerCampaignContentRef
  marketingDistributionType?: CustomerCampaignContentRef
}

export interface CustomerCampaignContentsQueryResponse {
  CustomerCampaignContent: CustomerCampaignContent[]
  CustomerCampaignContentAggregate?: {
    aggregate?: {
      count?: number
    } | null
  } | null
}
