/**
 * Customer Campaign Event types for GraphQL responses and form payloads.
 * Used by common/data/customer queries and campaign record sections.
 */

export interface CustomerCampaignEventOwnerEmployee {
  id: string
  displayName: string
}

export interface CustomerCampaignEventAccountRef {
  id?: string
  version?: number
  customerAccountId: string
  customerAccount?: { id: string; name: string }
}

export interface CustomerCampaignEvent {
  id: string
  version: number
  name?: string
  description?: string
  eventDate?: string
  budget?: number
  expectedMeetings?: number
  meetingsHeld?: number
  opportunitiesGenerated?: number
  pipelineGenerated?: number
  followUpComplete?: boolean
  createdAt: string
  customerCampaignId?: string
  ownerEmployeeId?: string
  ownerEmployee?: CustomerCampaignEventOwnerEmployee
  customerCampaignEventAccounts?: CustomerCampaignEventAccountRef[]
}

export interface CustomerCampaignEventsQueryResponse {
  CustomerCampaignEvent: CustomerCampaignEvent[]
  CustomerCampaignEventAggregate?: {
    aggregate?: {
      count?: number
      sum?: {
        budget?: number | null
        pipelineGenerated?: number | null
      } | null
    } | null
  } | null
}
