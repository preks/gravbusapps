/**
 * Customer Campaign Account (target account) types for GraphQL responses and form payloads.
 * Used by common/data/customer queries and campaign record sections.
 */

export interface CustomerCampaignAccountIndustry {
  id: string
  value: string
}

export interface CustomerCampaignAccountAccount {
  id: string
  name: string
  pictureThumbnailUrl?: string
  website?: string
  legalForm?: { id: string; value: string }
  industry?: CustomerCampaignAccountIndustry
  numberOfEmployees?: { id: string; value: string }
}

export interface CustomerCampaignAccountRef {
  id: string
  value: string
  code?: string
  objectValue?: unknown
}

export interface CustomerCampaignAccount {
  id: string
  version: number
  customerAccountId?: string
  customerCampaignId?: string
  customerAccount?: CustomerCampaignAccountAccount
  customerEngagementLevel?: CustomerCampaignAccountRef
}

export interface CustomerCampaignAccountsQueryResponse {
  CustomerCampaignAccount: CustomerCampaignAccount[]
  CustomerCampaignAccountAggregate?: {
    aggregate?: {
      count?: number
    } | null
  } | null
}
