/**
 * Customer Campaign Content GraphQL queries.
 * Consumed via the shared useCampaignEntityList/useCampaignEntityById hooks in campaign record sections, forms and popups.
 */

import type { CustomerCampaignContent } from '../types/customerCampaignContentTypes'

export const GET_CAMPAIGN_CONTENTS = (): string => {
  return `
    query GetCampaignContents(
      $campaignId: uuid!
      $limit: Int
      $offset: Int
      $orderBy: [CustomerCampaignContentOrderBy!]
    ) {
      CustomerCampaignContent(
        where: { customerCampaignId: { _eq: $campaignId }, isDeleted: { _eq: false } }
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        version
        title
        description
        publishDate
        assistedOpportunities
        engagementMetrics
        createdAt
        customerCampaignId
        customerPersona { id value objectValue }
        marketingFunnelStage { id value objectValue }
        marketingChannel { id value objectValue }
        marketingDistributionType { id value objectValue }
      }
      CustomerCampaignContentAggregate(
        where: { customerCampaignId: { _eq: $campaignId }, isDeleted: { _eq: false } }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const GET_CAMPAIGN_CONTENT_BY_ID = (): string => {
  return `
    query GetCampaignContentById($id: uuid!) {
      CustomerCampaignContentByPk(id: $id) {
        id
        version
        title
        description
        publishDate
        assistedOpportunities
        engagementMetrics
        createdAt
        customerCampaignId
        customerPersona { id value objectValue }
        marketingFunnelStage { id value objectValue }
        marketingChannel { id value objectValue }
        marketingDistributionType { id value objectValue }
      }
    }
  `
}

export interface CustomerCampaignContentByPkResponse {
  CustomerCampaignContentByPk: CustomerCampaignContent | null
}

export type { CustomerCampaignContentsQueryResponse } from '../types/customerCampaignContentTypes'
