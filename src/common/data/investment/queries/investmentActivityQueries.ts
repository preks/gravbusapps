import { INVESTMENT_ACTIVITY } from './fragments/investmentFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_ACTIVITY_DESCRIPTORS } from '@/common/data/investment/types/investmentActivityTypes'

// Query variables interface
export interface InvestmentActivityQueryVariables {
  id?: string
  offset?: number
  limit?: number
  search?: string
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
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
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

// Build where condition for Investment Activity queries
export const buildInvestmentActivityWhereCondition = (variables: InvestmentActivityQueryVariables = {}) => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // ID filter
  if (variables.id) {
    whereClause += `, id: { _eq: "${variables.id}" }`
  }

  // Custom single ID filters (for backward compatibility)
  if (variables.accountId) {
    whereClause += `, account: { id: { _eq: "${variables.accountId}" } }`
  }
  if (variables.contactId) {
    whereClause += `, contact: { id: { _eq: "${variables.contactId}" } }`
  }
  if (variables.opportunityId) {
    whereClause += `, opportunity: { id: { _eq: "${variables.opportunityId}" } }`
  }
  if (variables.leadId) {
    whereClause += `, lead: { id: { _eq: "${variables.leadId}" } }`
  }

  // Apply standard filters using descriptors
  const filterConditions = buildFilter(variables, INVESTMENT_ACTIVITY_DESCRIPTORS)
  if (filterConditions) {
    whereClause += `, ${filterConditions}`
  }

  // Apply search using descriptors
  if (variables.search?.trim()) {
    const searchConditions = buildSearch(variables.search, INVESTMENT_ACTIVITY_DESCRIPTORS)
    if (searchConditions) {
      whereClause += `, ${searchConditions}`
    }
  }

  whereClause += ' }'
  return whereClause
}

// Get investment activities with filtering
export const GET_INVESTMENT_ACTIVITIES = (variables: InvestmentActivityQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentActivityWhereCondition(variables)
  const orderByClause = buildOrderBy(variables.orderBy, INVESTMENT_ACTIVITY_DESCRIPTORS)

  return `
    query GetInvestmentActivities {
      InvestmentActivity(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_ACTIVITY}
      }
      InvestmentActivityAggregate(${where}) {
        aggregate {
          count
        }
      }
    }
  `
}

// Get investment activity by ID
export const GET_INVESTMENT_ACTIVITY_BY_ID = (id: string): string => {
  return GET_INVESTMENT_ACTIVITIES({ id })
}

// Get investment activities by account ID (alias for backward compatibility)
export const GET_INVESTMENT_ACTIVITIES_BY_ACCOUNT_ID = (accountId: string): string => {
  return GET_INVESTMENT_ACTIVITIES({ accountId })
}
