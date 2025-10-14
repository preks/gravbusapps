// Customer Activity Queries - generic activity list queries for customer relations
import {
  CUSTOMER_SALES_ACTIVITY,
  CUSTOMER_ACCOUNT_REF,
  CUSTOMER_OPPORTUNITY_REF,
  CUSTOMER_LEAD_REF
} from './fragments/customerRelationFragments'
import { buildOrderBy, buildSearch, buildFilter, type Descriptor } from '@/common/network/graphql/queryHelpers'

// Unified descriptors for Sales Activity (search, sort, filters, and option metadata)
export const CUSTOMER_ACTIVITY_DESCRIPTORS: Descriptor[] = [
  // Search/sort
  { key: 'title', searchPaths: ['title', 'description'], sortPath: 'title', type: 'text' },
  {
    key: 'activityType',
    searchPaths: ['activityType.value', 'activityType.code'],
    sortPath: 'activityType.code',
    type: 'text'
  },
  {
    key: 'ownerEmployee',
    searchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },
  { key: 'occurredAt', searchPaths: ['occurredAt'], type: 'date' },
  { key: 'completedAt', searchPaths: ['completedAt'], type: 'date' },
  { key: 'createdAt', searchPaths: ['createdAt'], type: 'date' },

  // Filters (IDs, strings, booleans, dates, custom)
  { key: 'activityTypeIds', path: 'activityType.id', kind: 'inIds' },
  { key: 'ownerEmployeeIds', path: 'ownerEmployee.id', kind: 'inIds' },

  // Relation filters
  { key: 'accountIds', path: 'account.id', kind: 'inIds' },
  { key: 'contactIds', path: 'contact.id', kind: 'inIds' },
  { key: 'leadIds', path: 'lead.id', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunity.id', kind: 'inIds' },

  // Date range filters
  { key: 'occurredAtFrom', path: 'occurredAt', kind: 'dateFrom' },
  { key: 'occurredAtTo', path: 'occurredAt', kind: 'dateTo' },
  { key: 'completedAtFrom', path: 'completedAt', kind: 'dateFrom' },
  { key: 'completedAtTo', path: 'completedAt', kind: 'dateTo' }
]

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
        ${CUSTOMER_SALES_ACTIVITY}

        # Entity references (minimal for display)
        account { ${CUSTOMER_ACCOUNT_REF} }
        contact { id code firstName lastName email }
        lead { ${CUSTOMER_LEAD_REF} }
        opportunity { ${CUSTOMER_OPPORTUNITY_REF} }
      }

      SalesActivityAggregate(${where}) {
        aggregate { count }
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
        ${CUSTOMER_SALES_ACTIVITY}

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
        ${CUSTOMER_SALES_ACTIVITY}

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
        ${CUSTOMER_SALES_ACTIVITY}

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
        ${CUSTOMER_SALES_ACTIVITY}

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
