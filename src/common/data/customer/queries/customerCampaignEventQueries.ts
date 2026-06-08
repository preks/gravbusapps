/**
 * Customer Campaign Event GraphQL queries.
 * Consumed via the shared useCampaignEntityList/useCampaignEntityById hooks in campaign record sections, forms and popups.
 */

import type { CustomerCampaignEvent } from '../types/customerCampaignEventTypes'

export const GET_CAMPAIGN_EVENTS = (): string => {
  return `
    query GetCampaignEvents($campaignId: uuid!, $limit: Int, $offset: Int) {
      CustomerCampaignEvent(
        where: { customerCampaignId: { _eq: $campaignId }, isDeleted: { _eq: false } }
        orderBy: [{ eventDate: DESC }]
        limit: $limit
        offset: $offset
      ) {
        id
        version
        name
        description
        eventDate
        budget
        expectedMeetings
        meetingsHeld
        opportunitiesGenerated
        pipelineGenerated
        followUpComplete
        createdAt
        customerCampaignId
        ownerEmployeeId
        ownerEmployee { id displayName }
      }
      CustomerCampaignEventAggregate(
        where: { customerCampaignId: { _eq: $campaignId }, isDeleted: { _eq: false } }
      ) {
        aggregate {
          count
          sum {
            budget
            pipelineGenerated
          }
        }
      }
    }
  `
}

export const GET_CAMPAIGN_EVENT_BY_ID = (): string => {
  return `
    query GetCampaignEventById($id: uuid!) {
      CustomerCampaignEventByPk(id: $id) {
        id
        version
        name
        description
        eventDate
        budget
        expectedMeetings
        meetingsHeld
        opportunitiesGenerated
        pipelineGenerated
        followUpComplete
        createdAt
        customerCampaignId
        ownerEmployeeId
        ownerEmployee { id displayName }
        customerCampaignEventAccounts(
          where: { isDeleted: { _eq: false } }
          orderBy: [{ createdAt: ASC }]
        ) {
          id
          version
          customerAccountId
          customerAccount { id name }
        }
      }
    }
  `
}

export interface CustomerCampaignEventByPkResponse {
  CustomerCampaignEventByPk: CustomerCampaignEvent | null
}

export type { CustomerCampaignEventsQueryResponse } from '../types/customerCampaignEventTypes'
