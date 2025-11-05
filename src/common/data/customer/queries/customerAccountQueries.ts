/**
 * Customer Account Queries
 * GraphQL queries for CRM Account entities
 */

import { CUSTOMER_ACCOUNT, CUSTOMER_ACCOUNT_REF } from './customerAccountFragments'

/**
 * Build orderBy clause from array of { field, direction }
 * Handles nested paths like 'industry.value' -> { industry: { value: ASC } }
 */
const buildOrderByClause = (orderBy: Array<{ field: string | any; direction: string }>): string => {
  if (!orderBy || orderBy.length === 0) {
    return 'orderBy: [{ createdAt: DESC }]'
  }

  const orderByParts = orderBy.map(o => {
    // If field is already an object (nested), use it directly
    if (typeof o.field === 'object') {
      // Convert to JSON and remove quotes from direction ENUMs
      return JSON.stringify(o.field)
        .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
        .replace(/:"(ASC_NULLS_LAST|DESC_NULLS_LAST|ASC|DESC)"/g, ':$1') // Remove quotes from ENUM values
    }
    // Otherwise it's a simple field name
    return `{ ${o.field}: ${o.direction} }`
  })

  return `orderBy: [${orderByParts.join(', ')}]`
}

/**
 * Customer Account Query Variables Interface
 */
export interface CustomerAccountQueryVariables {
  ids?: string[]
  limit?: number
  offset?: number
  search?: string
  orderBy?: Array<{ field: string | any; direction: string }>

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

  // Filter by owner employee
  if (variables.ownerEmployeeIds && variables.ownerEmployeeIds.length > 0) {
    whereClause += `, ownerEmployeeId: { _in: ["${variables.ownerEmployeeIds.join('","')}"] }`
  }

  // Filter by industry (CRM field name)
  if (variables.industryIds && variables.industryIds.length > 0) {
    whereClause += `, industryRef: { _in: ["${variables.industryIds.join('","')}"] }`
  }

  // Filter by legal form
  if (variables.legalFormIds && variables.legalFormIds.length > 0) {
    whereClause += `, legalFormRef: { _in: ["${variables.legalFormIds.join('","')}"] }`
  }

  // Filter by company size (CRM field name: numberOfEmployees)
  if (variables.companySizeIds && variables.companySizeIds.length > 0) {
    whereClause += `, numberOfEmployeesRef: { _in: ["${variables.companySizeIds.join('","')}"] }`
  }

  // Filter by revenue band (CRM field name: annualRevenue)
  if (variables.revenueBandIds && variables.revenueBandIds.length > 0) {
    whereClause += `, annualRevenueRef: { _in: ["${variables.revenueBandIds.join('","')}"] }`
  }

  // Filter by country (nested in addresses)
  if (variables.countryIds && variables.countryIds.length > 0) {
    whereClause += `, addresses: { countryRef: { _in: ["${variables.countryIds.join('","')}"] } }`
  }

  // Filter by region (nested in addresses)
  if (variables.regionIds && variables.regionIds.length > 0) {
    whereClause += `, addresses: { regionRef: { _in: ["${variables.regionIds.join('","')}"] } }`
  }

  // Date range: createdAt
  if (variables.createdAfter) {
    whereClause += `, createdAt: { _gte: "${variables.createdAfter}" }`
  }
  if (variables.createdBefore) {
    whereClause += `, createdAt: { _lte: "${variables.createdBefore}" }`
  }

  // Date range: foundationDate
  if (variables.foundedAfter) {
    whereClause += `, foundationDate: { _gte: "${variables.foundedAfter}" }`
  }
  if (variables.foundedBefore) {
    whereClause += `, foundationDate: { _lte: "${variables.foundedBefore}" }`
  }

  // Search across all displayed fields
  if (variables.search && variables.search.trim()) {
    const searchPattern = `%${variables.search.trim()}%`
    whereClause += `, _or: [
      { name: { _ilike: "${searchPattern}" } },
      { website: { _ilike: "${searchPattern}" } },
      { mission: { _ilike: "${searchPattern}" } },
      { specialty: { _ilike: "${searchPattern}" } },
      { geographicPresence: { _ilike: "${searchPattern}" } },
      { notesSummary: { _ilike: "${searchPattern}" } },
      { addresses: { addressLine: { _ilike: "${searchPattern}" } } },
      { addresses: { city: { _ilike: "${searchPattern}" } } },
      { addresses: { postalCode: { _ilike: "${searchPattern}" } } },
      { addresses: { country: { value: { _ilike: "${searchPattern}" } } } },
      { addresses: { region: { value: { _ilike: "${searchPattern}" } } } },
      { industry: { value: { _ilike: "${searchPattern}" } } },
      { legalForm: { value: { _ilike: "${searchPattern}" } } },
      { numberOfEmployees: { value: { _ilike: "${searchPattern}" } } },
      { annualRevenue: { value: { _ilike: "${searchPattern}" } } },
      { ownerEmployee: { displayName: { _ilike: "${searchPattern}" } } },
      { ownerEmployee: { firstName: { _ilike: "${searchPattern}" } } },
      { ownerEmployee: { lastName: { _ilike: "${searchPattern}" } } }
    ]`
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
  const orderByClause = buildOrderByClause(variables.orderBy || [])

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
        ${CUSTOMER_ACCOUNT_REF}
      }
    }
  `
}
