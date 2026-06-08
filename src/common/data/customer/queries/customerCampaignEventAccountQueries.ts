/**
 * Customer Campaign Event Account GraphQL queries.
 * Used by useCustomerCampaignEventAccount and campaign event account form.
 */

export interface CustomerCampaignEventAccount {
  id: string
  version: number
  customerCampaignEventId: string
  customerAccountId: string
  customerAccount?: { id: string; name: string }
}

export interface CustomerCampaignEventAccountByIdResponse {
  CustomerCampaignEventAccount: CustomerCampaignEventAccount[]
}

export const GET_CAMPAIGN_EVENT_ACCOUNT_BY_ID = (): string => {
  return `
    query GetCampaignEventAccountById($id: uuid!) {
      CustomerCampaignEventAccount(
        where: { id: { _eq: $id }, isDeleted: { _eq: false } }
        limit: 1
      ) {
        id
        version
        customerCampaignEventId
        customerAccountId
        customerAccount { id name }
      }
    }
  `
}

export interface CustomerCampaignEventLinkedAccountIdsResponse {
  CustomerCampaignEventAccount: Array<{ id: string; customerAccountId: string }>
}

/**
 * Returns the account ids already linked (not soft-deleted) to a given campaign event.
 * Used to exclude already-linked accounts from the "add event account" selector.
 */
export const GET_CAMPAIGN_EVENT_LINKED_ACCOUNT_IDS = (): string => {
  return `
    query GetCampaignEventLinkedAccountIds($eventId: uuid!) {
      CustomerCampaignEventAccount(
        where: { customerCampaignEventId: { _eq: $eventId }, isDeleted: { _eq: false } }
      ) {
        id
        customerAccountId
      }
    }
  `
}
