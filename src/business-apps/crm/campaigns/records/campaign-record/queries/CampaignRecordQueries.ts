import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CampaignEntityType, CampaignRecordQueryVariables } from '../types'
import { LEAD_STATUS_CODE_CONVERTED, LEAD_STATUS_CODE_MQL, LEAD_STATUS_CODE_SQL } from './CampaignAnalyticsGraphQL'
import { GET_CAMPAIGN_EVENTS } from '@/common/data/customer/queries/customerCampaignEventQueries'
import type { CustomerCampaignEventsQueryResponse } from '@/common/data/customer/queries/customerCampaignEventQueries'
import { GET_CAMPAIGN_CONTENTS } from '@/common/data/customer/queries/customerCampaignContentQueries'
import type { CustomerCampaignContentsQueryResponse } from '@/common/data/customer/queries/customerCampaignContentQueries'
import { GET_CAMPAIGN_ACCOUNTS } from '@/common/data/customer/queries/customerCampaignAccountQueries'
import type { CustomerCampaignAccountsQueryResponse } from '@/common/data/customer/queries/customerCampaignAccountQueries'
import type { CustomerCampaignEvent } from '@/common/data/customer/types/customerCampaignEventTypes'
import type { CustomerCampaignContent } from '@/common/data/customer/types/customerCampaignContentTypes'
import type { CustomerCampaignAccount } from '@/common/data/customer/types/customerCampaignAccountTypes'

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
    customerCampaignAccounts?: Array<{
      customerAccountId?: string
    }>
  }>
}

export interface CampaignKPIsQueryResponse {
  totalLeads: { aggregate: { count: number } }
  convertedLeads: { aggregate: { count: number } }
  mqlCount: { aggregate: { count: number } }
  sqlCount: { aggregate: { count: number } }
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
    leadStatus?: { value: string; code?: string }
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
    opportunityStatus?: { value: string; code?: string }
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
        type { id value code objectValue }
        customerCampaignSegment { id value code objectValue }
        customerCampaignSegmentRef
        customerPersona { id value code }
        customerPersonaRef
        customerValuePackFocus { id value code }
        customerValuePackFocusRef
        customerIndustryFocus { id value code }
        customerIndustryFocusRef
        country { id value code }
        countryRef
        budgetAllocated
        pipelineTarget
        expectedWinRate
        expectedRevenueContribution
        ownerEmployee { id displayName }
        customerCampaignStatus { id value code objectValue }
        customerCampaignStatusRef
        customerCampaignAccounts(where: { isDeleted: { _eq: false } }) {
          customerAccountId
        }
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
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_CONVERTED}" } }
        }
      ) {
        aggregate {
          count
        }
      }
      mqlCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false },
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_MQL}" } }
        }
      ) {
        aggregate {
          count
        }
      }
      sqlCount: LeadAggregate(
        where: { 
          salesCampaignId: { _eq: $campaignId },
          isDeleted: { _eq: false },
          leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_SQL}" } }
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
    query GetCampaignEntities(
      $leadsWhere: LeadBoolExp!,
      $accountsWhere: AccountBoolExp!,
      $contactsWhere: ContactBoolExp!,
      $opportunitiesWhere: OpportunityBoolExp!,
      $limit: Int,
      $offset: Int,
      $orderByLeads: [LeadOrderBy!],
      $orderByAccounts: [AccountOrderBy!],
      $orderByContacts: [ContactOrderBy!],
      $orderByOpportunities: [OpportunityOrderBy!]
    ) {
      leads: Lead(
        where: $leadsWhere
        orderBy: $orderByLeads
        limit: $limit
        offset: $offset
      ) {
        id
        firstName
        lastName
        createdAt
        ownerEmployee {
          id
          displayName
        }
        leadStatus { value code }
      }
      accounts: Account(
        where: $accountsWhere
        orderBy: $orderByAccounts
        limit: $limit
        offset: $offset
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
        where: $contactsWhere
        orderBy: $orderByContacts
        limit: $limit
        offset: $offset
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
        where: $opportunitiesWhere
        orderBy: $orderByOpportunities
        limit: $limit
        offset: $offset
      ) {
        id
        name
        createdAt
        ownerEmployee {
          id
          displayName
        }
        opportunityStatus { value code }
      }
      leadsCount: LeadAggregate(
        where: $leadsWhere
      ) {
        aggregate {
          count
        }
      }
      accountsCount: AccountAggregate(
        where: $accountsWhere
      ) {
        aggregate {
          count
        }
      }
      contactsCount: ContactAggregate(
        where: $contactsWhere
      ) {
        aggregate {
          count
        }
      }
      opportunitiesCount: OpportunityAggregate(
        where: $opportunitiesWhere
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

const GET_CAMPAIGN_LEAD_ENTITIES_QUERY = `
  query GetCampaignLeadEntities($where: LeadBoolExp!, $limit: Int, $offset: Int, $orderBy: [LeadOrderBy!]) {
    leads: Lead(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
      id
      firstName
      lastName
      createdAt
      ownerEmployee { id displayName }
      leadStatus { value code }
    }
    leadsCount: LeadAggregate(where: $where) {
      aggregate { count }
    }
  }
`

const GET_CAMPAIGN_ACCOUNT_ENTITIES_QUERY = `
  query GetCampaignAccountEntities($where: AccountBoolExp!, $limit: Int, $offset: Int, $orderBy: [AccountOrderBy!]) {
    accounts: Account(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
      id
      name
      createdAt
      ownerEmployee { id displayName }
    }
    accountsCount: AccountAggregate(where: $where) {
      aggregate { count }
    }
  }
`

const GET_CAMPAIGN_CONTACT_ENTITIES_QUERY = `
  query GetCampaignContactEntities($where: ContactBoolExp!, $limit: Int, $offset: Int, $orderBy: [ContactOrderBy!]) {
    contacts: Contact(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
      id
      firstName
      lastName
      createdAt
      ownerEmployee { id displayName }
    }
    contactsCount: ContactAggregate(where: $where) {
      aggregate { count }
    }
  }
`

const GET_CAMPAIGN_OPPORTUNITY_ENTITIES_QUERY = `
  query GetCampaignOpportunityEntities(
    $where: OpportunityBoolExp!,
    $limit: Int,
    $offset: Int,
    $orderBy: [OpportunityOrderBy!]
  ) {
    opportunities: Opportunity(where: $where, limit: $limit, offset: $offset, orderBy: $orderBy) {
      id
      name
      createdAt
      ownerEmployee { id displayName }
      opportunityStatus { value code }
    }
    opportunitiesCount: OpportunityAggregate(where: $where) {
      aggregate { count }
    }
  }
`

interface CampaignEntityFilterFlags {
  includeLead: boolean
  includeAccount: boolean
  includeContact: boolean
  includeOpportunity: boolean
}

const createDisabledFilter = (): Record<string, any> => ({ id: { _is_null: true } })

const getEntityFilterFlags = (types: CampaignRecordQueryVariables['types']): CampaignEntityFilterFlags => {
  const selectedTypes = types ?? []
  const hasTypeFilter = selectedTypes.length > 0

  return {
    includeLead: !hasTypeFilter || selectedTypes.includes('lead'),
    includeAccount: !hasTypeFilter || selectedTypes.includes('account'),
    includeContact: !hasTypeFilter || selectedTypes.includes('contact'),
    includeOpportunity: !hasTypeFilter || selectedTypes.includes('opportunity')
  }
}

const buildDateFilter = (variables: CampaignRecordQueryVariables): { createdAt: Record<string, string> } | null => {
  const createdAt: Record<string, string> = {}

  if (variables.createdAtFrom) {
    createdAt._gte = variables.createdAtFrom
  }

  if (variables.createdAtTo) {
    createdAt._lte = variables.createdAtTo
  }

  return Object.keys(createdAt).length > 0 ? { createdAt } : null
}

const appendAndFilter = (whereClause: Record<string, any>, filterClause: Record<string, any>) => {
  whereClause._and = [...(whereClause._and ?? []), filterClause]
}

const applyDateFilter = (
  whereClause: Record<string, any>,
  includeEntity: boolean,
  dateFilter: { createdAt: Record<string, string> } | null
) => {
  if (includeEntity && dateFilter) {
    appendAndFilter(whereClause, dateFilter)
  }
}

const applyStatusFilters = (
  variables: CampaignRecordQueryVariables,
  leadWhere: Record<string, any>,
  opportunityWhere: Record<string, any>,
  includeLead: boolean,
  includeOpportunity: boolean
) => {
  const hasStatusFilter = Array.isArray(variables.statuses) && variables.statuses.length > 0
  if (!hasStatusFilter || !variables.statuses) {
    return
  }

  const statusCodes = variables.statuses.map(status => String(status).trim()).filter(Boolean)
  if (statusCodes.length === 0) {
    return
  }

  if (includeLead) {
    appendAndFilter(leadWhere, { leadStatus: { code: { _in: statusCodes } } })
  }

  if (includeOpportunity) {
    appendAndFilter(opportunityWhere, { opportunityStatus: { code: { _in: statusCodes } } })
  }
}

const getOrderByClause = (variables: CampaignRecordQueryVariables) => {
  const firstSort = variables.orderBy?.[0]
  const orderField = firstSort ? Object.keys(firstSort)[0] : 'createdAt'
  const orderDir = firstSort ? (firstSort as any)[orderField] : 'DESC'
  return [{ [orderField]: orderDir }]
}

const buildEntityWhereClauses = (variables: CampaignRecordQueryVariables) => {
  const searchPattern = variables.search?.trim() ? `%${variables.search.trim()}%` : '%'
  const { includeLead, includeAccount, includeContact, includeOpportunity } = getEntityFilterFlags(variables.types)
  const dateFilter = buildDateFilter(variables)
  const accountReferenceIds = variables.accountReferenceIds ?? []
  const hasAccountReferenceIds = accountReferenceIds.length > 0

  const leadWhere: Record<string, any> = includeLead
    ? {
        salesCampaignId: { _eq: variables.campaignId },
        isDeleted: { _eq: false },
        _or: [
          { firstName: { _ilike: searchPattern } },
          { lastName: { _ilike: searchPattern } },
          { ownerEmployee: { displayName: { _ilike: searchPattern } } },
          { leadStatus: { value: { _ilike: searchPattern } } },
          { leadStatus: { code: { _ilike: searchPattern } } }
        ]
      }
    : createDisabledFilter()

  const accountWhere: Record<string, any> = includeAccount
    ? {
        isDeleted: { _eq: false },
        _and: [
          hasAccountReferenceIds
            ? {
                _or: [{ salesCampaignId: { _eq: variables.campaignId } }, { id: { _in: accountReferenceIds } }]
              }
            : { salesCampaignId: { _eq: variables.campaignId } },
          {
            _or: [{ name: { _ilike: searchPattern } }, { ownerEmployee: { displayName: { _ilike: searchPattern } } }]
          }
        ]
      }
    : createDisabledFilter()

  const contactWhere: Record<string, any> = includeContact
    ? {
        salesCampaignId: { _eq: variables.campaignId },
        isDeleted: { _eq: false },
        _or: [
          { firstName: { _ilike: searchPattern } },
          { lastName: { _ilike: searchPattern } },
          { ownerEmployee: { displayName: { _ilike: searchPattern } } }
        ]
      }
    : createDisabledFilter()

  const opportunityWhere: Record<string, any> = includeOpportunity
    ? {
        salesCampaignId: { _eq: variables.campaignId },
        isDeleted: { _eq: false },
        _or: [
          { name: { _ilike: searchPattern } },
          { ownerEmployee: { displayName: { _ilike: searchPattern } } },
          { opportunityStatus: { value: { _ilike: searchPattern } } },
          { opportunityStatus: { code: { _ilike: searchPattern } } }
        ]
      }
    : createDisabledFilter()

  applyDateFilter(leadWhere, includeLead, dateFilter)
  applyDateFilter(accountWhere, includeAccount, dateFilter)
  applyDateFilter(contactWhere, includeContact, dateFilter)
  applyDateFilter(opportunityWhere, includeOpportunity, dateFilter)

  applyStatusFilters(variables, leadWhere, opportunityWhere, includeLead, includeOpportunity)

  return {
    activeType: variables.types?.[0],
    orderByClause: getOrderByClause(variables),
    leadWhere,
    accountWhere,
    contactWhere,
    opportunityWhere
  }
}

const getCampaignEntityQueryConfig = (activeType?: CampaignEntityType) => {
  if (activeType === 'lead') {
    return { query: GET_CAMPAIGN_LEAD_ENTITIES_QUERY, whereKey: 'leadWhere' as const }
  }

  if (activeType === 'account') {
    return { query: GET_CAMPAIGN_ACCOUNT_ENTITIES_QUERY, whereKey: 'accountWhere' as const }
  }

  if (activeType === 'contact') {
    return { query: GET_CAMPAIGN_CONTACT_ENTITIES_QUERY, whereKey: 'contactWhere' as const }
  }

  return { query: GET_CAMPAIGN_OPPORTUNITY_ENTITIES_QUERY, whereKey: 'opportunityWhere' as const }
}

// Campaign Record Query Hook
export const useCampaignRecordQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCampaignEvents = useCallback(
    async (variables: { campaignId: string }): Promise<CustomerCampaignEvent[]> => {
      const query = GET_CAMPAIGN_EVENTS()
      const result = await graphqlClient.request<CustomerCampaignEventsQueryResponse>(query, variables)
      return result?.CustomerCampaignEvent ?? []
    },
    [graphqlClient]
  )

  const fetchCampaignContents = useCallback(
    async (variables: { campaignId: string }): Promise<CustomerCampaignContent[]> => {
      const query = GET_CAMPAIGN_CONTENTS()
      const result = await graphqlClient.request<CustomerCampaignContentsQueryResponse>(query, variables)
      return result?.CustomerCampaignContent ?? []
    },
    [graphqlClient]
  )

  const fetchCampaignAccounts = useCallback(
    async (variables: { campaignId: string }): Promise<CustomerCampaignAccount[]> => {
      const query = GET_CAMPAIGN_ACCOUNTS()
      const result = await graphqlClient.request<CustomerCampaignAccountsQueryResponse>(query, variables)
      return result?.CustomerCampaignAccount ?? []
    },
    [graphqlClient]
  )

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
      const { activeType, orderByClause, leadWhere, accountWhere, contactWhere, opportunityWhere } =
        buildEntityWhereClauses(variables)
      const queryConfig = getCampaignEntityQueryConfig(activeType)

      const whereClauseByType = {
        leadWhere,
        accountWhere,
        contactWhere,
        opportunityWhere
      }

      return graphqlClient.request<CampaignEntitiesQueryResponse>(queryConfig.query, {
        where: whereClauseByType[queryConfig.whereKey],
        limit: variables.limit,
        offset: variables.offset,
        orderBy: orderByClause
      })
    },
    [graphqlClient]
  )

  return {
    fetchCampaignRecord,
    fetchCampaignKPIs,
    fetchCampaignEntities,
    fetchCampaignEvents,
    fetchCampaignContents,
    fetchCampaignAccounts
  }
}
