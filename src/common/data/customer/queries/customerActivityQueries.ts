// Customer Activity Queries - generic activity list queries for customer relations
import { CUSTOMER_ACTIVITY } from './fragments/customerFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { CUSTOMER_ACTIVITY_DESCRIPTORS } from '@/common/data/customer/types/customerActivityTypes'

export interface CustomerActivityQueryVariables {
  search?: string
  activityTypeIds?: string[]
  ownerEmployeeIds?: string[]

  accountIds?: string[]
  contactIds?: string[]
  leadIds?: string[]
  opportunityIds?: string[]

  occurredAtFrom?: string
  occurredAtTo?: string
  completedAtFrom?: string
  completedAtTo?: string

  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Build where condition for Customer Activity queries
export const buildCustomerActivityWhereCondition = (variables: CustomerActivityQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Generic search across dot-paths from descriptors
  const searchOr = buildSearch(variables.search || '', CUSTOMER_ACTIVITY_DESCRIPTORS)
  if (searchOr) whereClause += `, ${searchOr}`

  // Generic AND filters from descriptors
  const andFilters = buildFilter(variables as any, CUSTOMER_ACTIVITY_DESCRIPTORS)
  if (andFilters) whereClause += `, ${andFilters}`

  whereClause += ' }'
  return whereClause
}

// Get Customer Activities with full details and aggregate count
export const GET_CUSTOMER_ACTIVITIES = (variables: CustomerActivityQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerActivityWhereCondition(variables)

  const orderByBuilt = buildOrderBy(variables.orderBy || [], CUSTOMER_ACTIVITY_DESCRIPTORS)
  const orderByClause = orderByBuilt || 'orderBy: [{ createdAt: DESC }]'

  return `
    query GetCustomerActivities {
      SalesActivity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_ACTIVITY}
      }

      SalesActivityAggregate(${where}) {
        aggregate { count }
      }
    }
  `
}

// Get Customer Activity by ID
export const GET_CUSTOMER_ACTIVITY_BY_ID = (id: string): string => {
  return `
    query GetCustomerActivityById {
      SalesActivity(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_ACTIVITY}
      }
    }
  `
}

// Get Customer Activities by Account ID
export const GET_CUSTOMER_ACTIVITIES_BY_ACCOUNT_ID = (accountId: string): string => {
  return `
    query GetCustomerActivitiesByAccountId {
      SalesActivity(
        where: { 
          account: { id: { _eq: "${accountId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_ACTIVITY}

        # Entity references
        account {
          id
          code
          name
        }
      }
    }
  `
}

// Get Customer Activities by Contact ID
export const GET_CUSTOMER_ACTIVITIES_BY_CONTACT_ID = (contactId: string): string => {
  return `
    query GetCustomerActivitiesByContactId {
      SalesActivity(
        where: { 
          contact: { id: { _eq: "${contactId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_ACTIVITY}

        # Entity references
        contact {
          id
          code
          firstName
          lastName
          email
        }
      }
    }
  `
}

// Get Customer Activities by Lead ID
export const GET_CUSTOMER_ACTIVITIES_BY_LEAD_ID = (leadId: string): string => {
  return `
    query GetCustomerActivitiesByLeadId {
      SalesActivity(
        where: { 
          lead: { id: { _eq: "${leadId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_ACTIVITY}

        # Entity references
        lead {
          id
          code
          firstName
          lastName
          email
        }
      }
    }
  `
}

// Get Customer Activities by Opportunity ID
export const GET_CUSTOMER_ACTIVITIES_BY_OPPORTUNITY_ID = (opportunityId: string): string => {
  return `
    query GetCustomerActivitiesByOpportunityId {
      SalesActivity(
        where: { 
          opportunity: { id: { _eq: "${opportunityId}" } }, 
          isDeleted: { _eq: false } 
        }
        orderBy: [{ createdAt: DESC }]
      ) {
        ${CUSTOMER_ACTIVITY}

        # Entity references
        opportunity {
          id
          code
          name
        }
      }
    }
  `
}
