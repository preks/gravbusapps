/**
 * Customer Account Queries
 * GraphQL queries for CRM Account entities
 */

import { CUSTOMER_ACCOUNT } from './fragments/customerFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { CUSTOMER_ACCOUNT_DESCRIPTORS } from '@/common/data/customer/types/customerAccountTypes'
/**
 * Customer Account Query Variables Interface
 */
export interface CustomerAccountQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>

  // Filter fields
  ownerEmployeeIds?: string[]
  industryIds?: string[]
  legalFormIds?: string[]
  companySizeIds?: string[]
  revenueBandIds?: string[]
  countryIds?: string[]
  regionIds?: string[]

  // Date range filters
  createdAfter?: string
  createdBefore?: string
  foundedAfter?: string
  foundedBefore?: string
}

/**
 * Build WHERE condition for Customer Account queries
 */
export const buildCustomerAccountWhereCondition = (variables: CustomerAccountQueryVariables = {}): string => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Filter by IDs
  if (variables.ids && variables.ids.length > 0) {
    whereClause += `, id: { _in: ["${variables.ids.join('","')}"] }`
  }

  // Apply filters using descriptors
  const filterConditions = buildFilter(variables, CUSTOMER_ACCOUNT_DESCRIPTORS)
  if (filterConditions) {
    whereClause += `, ${filterConditions}`
  }

  // Apply search using descriptors
  if (variables.search?.trim()) {
    const searchConditions = buildSearch(variables.search, CUSTOMER_ACCOUNT_DESCRIPTORS)
    if (searchConditions) {
      whereClause += `, ${searchConditions}`
    }
  }

  whereClause += ' }'
  return whereClause
}

/**
 * Get Customer Accounts with full details and aggregate count
 */
export const GET_CUSTOMER_ACCOUNTS = (variables: CustomerAccountQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildCustomerAccountWhereCondition(variables)
  const orderByClause = buildOrderBy(variables.orderBy, CUSTOMER_ACCOUNT_DESCRIPTORS)

  return `
    query GetCustomerAccounts {
      Account(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${CUSTOMER_ACCOUNT}
      }
      AccountAggregate(${where}) {
        aggregate { count }
      }
    }
  `
}

/**
 * Get Customer Account by ID
 */
export const GET_CUSTOMER_ACCOUNT_BY_ID = (id: string): string => {
  return `
    query GetCustomerAccountById {
      Account(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${CUSTOMER_ACCOUNT}
      }
    }
  `
}

/**
 * Search Customer Accounts (minimal fields for quick search)
 */
export const SEARCH_CUSTOMER_ACCOUNTS = (variables: CustomerAccountQueryVariables): string => {
  const limit = Math.min(variables.limit || 20, 50)
  const where = buildCustomerAccountWhereCondition(variables)

  return `
    query SearchCustomerAccounts {
      Account(
        limit: ${limit}
        ${where}
      ) {
        id
        code
        name
        website
      }
    }
  `
}
