import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CampaignRecordQueryVariables } from '../types'

export interface CampaignRecordQueryResponse {
  SalesCampaign: Array<{
    id: string
    name: string
    description?: string
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
    isDeleted: boolean
    typeRef?: string
  }>
}

export interface CampaignKPIsQueryResponse {
  totalLeads: { aggregate: { count: number } }
  convertedLeads: { aggregate: { count: number } }
  totalAccounts: { aggregate: { count: number } }
  totalContacts: { aggregate: { count: number } }
  totalOpportunities: { aggregate: { count: number } }
  wonOpportunities: { aggregate: { count: number } }
}

export interface CampaignEntitiesQueryResponse {
  leads: Array<{
    id: string
    firstName?: string
    lastName?: string
    createdAt: string
    ownerEmployee?: {
      id: string
      displayName: string
    }
    leadStatus?: { value: string }
  }>
  accounts: Array<{
    id: string
    name: string
    createdAt: string
    ownerEmployee?: {
      id: string
      displayName: string
    }
  }>
  contacts: Array<{
    id: string
    firstName: string
    lastName: string
    createdAt: string
    ownerEmployee?: {
      id: string
      displayName: string
    }
  }>
  opportunities: Array<{
    id: string
    name: string
    createdAt: string
    ownerEmployee?: {
      id: string
      displayName: string
    }
  }>
  leadsCount: { aggregate: { count: number } }
  accountsCount: { aggregate: { count: number } }
  contactsCount: { aggregate: { count: number } }
  opportunitiesCount: { aggregate: { count: number } }
}

// Get Campaign Details Query
export const GET_CAMPAIGN_RECORD = (): string => {
  return `
    query GetCampaignRecord($campaignId: uuid!) {
      SalesCampaign(where: { id: { _eq: $campaignId }, isDeleted: { _eq: false } }) {
        id
        name
        description
        startDate
        endDate
        createdAt
        updatedAt
        isDeleted
        typeRef
      }
    }
  `
}

// Get Campaign KPIs Query
export const GET_CAMPAIGN_KPIS = (): string => {
  return `
    query GetCampaignKPIs($campaignId: uuid!) {
      totalLeads: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      convertedLeads: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false },
          conversionDate: { _isNull: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalAccounts: AccountAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalContacts: ContactAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      totalOpportunities: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
      wonOpportunities: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false },
          opportunityStatus: { code: { _eq: "WON" } }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get Campaign Entities Query - Fetches all entities for client-side pagination
export const GET_CAMPAIGN_ENTITIES = (): string => {
  return `
    query GetCampaignEntities($campaignId: uuid!, $search: String, $orderByLeads: [LeadOrderBy!], $orderByAccounts: [AccountOrderBy!], $orderByContacts: [ContactOrderBy!], $orderByOpportunities: [OpportunityOrderBy!]) {
      leads: Lead(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { firstName: { _ilike: $search } }
            { lastName: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
            { leadStatus: { value: { _ilike: $search } } }
          ]
        }
        orderBy: $orderByLeads
      ) {
        id
        firstName
        lastName
        createdAt
        ownerEmployee {
          id
          displayName
        }
        leadStatus { value }
      }
      accounts: Account(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { name: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
          ]
        }
        orderBy: $orderByAccounts
      ) {
        id
        name
        createdAt
        ownerEmployee {
          id
          displayName
        }
      }
      contacts: Contact(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { firstName: { _ilike: $search } }
            { lastName: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
          ]
        }
        orderBy: $orderByContacts
      ) {
        id
        firstName
        lastName
        createdAt
        ownerEmployee {
          id
          displayName
        }
      }
      opportunities: Opportunity(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { name: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
            { opportunityStatus: { value: { _ilike: $search } } }
          ]
        }
        orderBy: $orderByOpportunities
      ) {
        id
        name
        createdAt
        ownerEmployee {
          id
          displayName
        }
        opportunityStatus { value }
      }
      leadsCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { firstName: { _ilike: $search } }
            { lastName: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
            { leadStatus: { value: { _ilike: $search } } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      accountsCount: AccountAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { name: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      contactsCount: ContactAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { firstName: { _ilike: $search } }
            { lastName: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      opportunitiesCount: OpportunityAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId }
          isDeleted: { _eq: false }
          _or: [
            { name: { _ilike: $search } }
            { ownerEmployee: { displayName: { _ilike: $search } } }
            { opportunityStatus: { value: { _ilike: $search } } }
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

// Campaign Record Query Hook
export const useCampaignRecordQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCampaignRecord = useCallback(
    async (variables: { campaignId: string }) => {
      const query = GET_CAMPAIGN_RECORD()
      const result = await graphqlClient.request<CampaignRecordQueryResponse>(query, variables)
      return result
    },
    [graphqlClient]
  )

  const fetchCampaignKPIs = useCallback(
    async (variables: { campaignId: string }) => {
      const query = GET_CAMPAIGN_KPIS()
      const result = await graphqlClient.request<CampaignKPIsQueryResponse>(query, variables)
      return result
    },
    [graphqlClient]
  )

  const fetchCampaignEntities = useCallback(
    async (variables: CampaignRecordQueryVariables) => {
      const query = GET_CAMPAIGN_ENTITIES()
      const orderField = variables.orderBy?.[0] ? Object.keys(variables.orderBy[0])[0] : 'createdAt'
      const orderDir = variables.orderBy?.[0] ? (variables.orderBy[0] as any)[orderField] : 'DESC'
      const orderByClause = [{ [orderField]: orderDir }]
      // Prepare search pattern for GraphQL (add wildcards)
      // Use empty pattern % to match all if no search, so _or conditions work properly
      const searchPattern = variables.search?.trim() ? `%${variables.search.trim()}%` : '%'

      const result = await graphqlClient.request<CampaignEntitiesQueryResponse>(query, {
        campaignId: variables.campaignId,
        search: searchPattern,
        orderByLeads: orderByClause,
        orderByAccounts: orderByClause,
        orderByContacts: orderByClause,
        orderByOpportunities: orderByClause
      })
      return result
    },
    [graphqlClient]
  )

  return {
    fetchCampaignRecord,
    fetchCampaignKPIs,
    fetchCampaignEntities
  }
}
