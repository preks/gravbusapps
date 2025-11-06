/**
 * Investment Account Queries
 * GraphQL queries for IRM Account entities
 */

import { INVESTMENT_ACCOUNT } from './fragments/investmentFragments'
import { buildOrderBy, buildSearch, buildFilter } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_ACCOUNT_DESCRIPTORS } from '@/common/data/investment/types/investmentAccountTypes'
/**
 * Investment Account Query Variables Interface
 */
export interface InvestmentAccountQueryVariables {
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
 * Build WHERE condition for Investment Account queries
 */
export const buildInvestmentAccountWhereCondition = (variables: InvestmentAccountQueryVariables = {}): string => {
  let whereClause = 'where: { isDeleted: { _eq: false }'

  // Filter by IDs
  if (variables.ids && variables.ids.length > 0) {
    whereClause += `, id: { _in: ["${variables.ids.join('","')}"] }`
  }

  // Apply filters using descriptors
  const filterConditions = buildFilter(variables, INVESTMENT_ACCOUNT_DESCRIPTORS)
  if (filterConditions) {
    whereClause += `, ${filterConditions}`
  }

  // Apply search using descriptors
  if (variables.search?.trim()) {
    const searchConditions = buildSearch(variables.search, INVESTMENT_ACCOUNT_DESCRIPTORS)
    if (searchConditions) {
      whereClause += `, ${searchConditions}`
    }
  }

  whereClause += ' }'
  return whereClause
}

/**
 * Get Investment Accounts with full details and aggregate count
 */
export const GET_INVESTMENT_ACCOUNTS = (variables: InvestmentAccountQueryVariables = {}): string => {
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0
  const where = buildInvestmentAccountWhereCondition(variables)
  const orderByClause = buildOrderBy(variables.orderBy, INVESTMENT_ACCOUNT_DESCRIPTORS)

  return `
    query GetInvestmentAccounts {
      InvestmentAccount(
        limit: ${limit}
        offset: ${offset}
        ${orderByClause}
        ${where}
      ) {
        ${INVESTMENT_ACCOUNT}
      }
      InvestmentAccountAggregate(${where}) {
        aggregate { count }
      }
    }
  `
}

/**
 * Get Investment Account by ID
 */
export const GET_INVESTMENT_ACCOUNT_BY_ID = (id: string): string => {
  return `
    query GetInvestmentAccountById {
      InvestmentAccount(where: { id: { _eq: "${id}" }, isDeleted: { _eq: false } }) {
        ${INVESTMENT_ACCOUNT}
      }
    }
  `
}
