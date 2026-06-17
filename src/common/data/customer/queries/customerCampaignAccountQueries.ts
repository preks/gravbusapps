/**
 * Customer Campaign Account GraphQL queries.
 * Consumed via the shared useCampaignEntityList hook and useCustomerCampaignLinkedAccountIds.
 */

import type { CustomerCampaignAccount } from '../types/customerCampaignAccountTypes'

export const GET_CAMPAIGN_ACCOUNTS = (): string => {
  return `
    query GetCampaignAccounts(
      $campaignId: uuid!
      $limit: Int
      $offset: Int
      $orderBy: [CustomerCampaignAccountOrderBy!]
      $search: String
    ) {
      CustomerCampaignAccount(
        where: {
          customerCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { customerAccount: { name: { _ilike: $search } } }
            { customerAccount: { legalForm: { value: { _ilike: $search } } } }
            { customerAccount: { legalForm: { code: { _ilike: $search } } } }
            { customerAccount: { industry: { value: { _ilike: $search } } } }
            { customerAccount: { industry: { code: { _ilike: $search } } } }
            { customerEngagementLevel: { value: { _ilike: $search } } }
            { customerEngagementLevel: { code: { _ilike: $search } } }
          ]
        }
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        version
        customerAccountId
        customerAccount {
          id
          name
          pictureThumbnailUrl
          website
          legalForm { id value }
          industry { id value }
          numberOfEmployees { id value }
        }
        customerEngagementLevel { id value code objectValue }
      }
      CustomerCampaignAccountAggregate(
        where: {
          customerCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { customerAccount: { name: { _ilike: $search } } }
            { customerAccount: { legalForm: { value: { _ilike: $search } } } }
            { customerAccount: { legalForm: { code: { _ilike: $search } } } }
            { customerAccount: { industry: { value: { _ilike: $search } } } }
            { customerAccount: { industry: { code: { _ilike: $search } } } }
            { customerEngagementLevel: { value: { _ilike: $search } } }
            { customerEngagementLevel: { code: { _ilike: $search } } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const GET_CAMPAIGN_LINKED_ACCOUNT_IDS = (): string => {
  return `
    query GetCampaignLinkedAccountIds($campaignId: uuid!) {
      CustomerCampaignAccount(
        where: { customerCampaignId: { _eq: $campaignId }, isDeleted: { _eq: false } }
      ) {
        id
        customerAccountId
      }
    }
  `
}

export const GET_CAMPAIGN_ACCOUNT_BY_ID = (): string => {
  return `
    query GetCampaignAccountById($id: uuid!) {
      CustomerCampaignAccount(
        where: { id: { _eq: $id }, isDeleted: { _eq: false } }
        limit: 1
      ) {
        id
        version
        customerAccountId
        customerCampaignId
        customerAccount {
          id
          name
          pictureThumbnailUrl
          website
          legalForm { id value }
          industry { id value }
          numberOfEmployees { id value }
        }
        customerEngagementLevel { id value code objectValue }
      }
    }
  `
}

export const GET_CAMPAIGN_ACCOUNT_BY_CAMPAIGN_AND_CUSTOMER_ACCOUNT = (): string => {
  return `
    query GetCampaignAccountByCampaignAndCustomerAccount(
      $campaignId: uuid!
      $customerAccountId: uuid!
    ) {
      CustomerCampaignAccount(
        where: {
          customerCampaignId: { _eq: $campaignId }
          customerAccountId: { _eq: $customerAccountId }
          isDeleted: { _eq: false }
        }
        limit: 1
      ) {
        id
        version
        customerAccountId
        customerCampaignId
        customerAccount {
          id
          name
          pictureThumbnailUrl
          website
          legalForm { id value }
          industry { id value }
          numberOfEmployees { id value }
        }
        customerEngagementLevel { id value code objectValue }
      }
    }
  `
}

export interface CustomerCampaignAccountByIdResponse {
  CustomerCampaignAccount: CustomerCampaignAccount[]
}

export type { CustomerCampaignAccountsQueryResponse } from '../types/customerCampaignAccountTypes'
