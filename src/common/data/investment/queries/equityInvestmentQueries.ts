/**
 * Equity Investment Queries
 * GraphQL queries for EquityInvestment entities
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'

export interface EquityInvestmentQueryVariables {
  ids?: string[]
  search?: string
  investmentIds?: string[]
  limit?: number
  offset?: number
  orderBy?: Array<{
    field: string
    direction: 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'
  }>
}

/**
 * Build where condition for EquityInvestment queries
 */
export const buildEquityInvestmentWhereCondition = (variables: EquityInvestmentQueryVariables = {}): string => {
  const conditions: string[] = ['isDeleted: { _eq: false }']

  // Filter by IDs
  if (variables.ids?.length) {
    conditions.push(`id: { _in: [${variables.ids.map(id => `"${id}"`).join(', ')}] }`)
  }

  // Filter by parent investment IDs
  if (variables.investmentIds?.length) {
    conditions.push(`investment: { id: { _in: [${variables.investmentIds.map(id => `"${id}"`).join(', ')}] } }`)
  }

  // Search by investment name
  if (variables.search?.trim()) {
    const searchTerm = variables.search.trim()
    conditions.push(`investment: { name: { _ilike: "%${searchTerm}%" } }`)
  }

  return `{ ${conditions.join(', ')} }`
}

/**
 * Build order by clause for EquityInvestment queries
 */
export const buildEquityInvestmentOrderBy = (orderBy: EquityInvestmentQueryVariables['orderBy'] = []): string => {
  if (!orderBy.length) {
    // Default: order by parent investment name
    return '{ investment: { name: ASC_NULLS_LAST } }'
  }

  const orderClauses = orderBy.map(({ field, direction }) => {
    // Map common field names to GraphQL paths
    switch (field) {
      case 'investmentName':
      case 'name':
        return `investment: { name: ${direction} }`
      case 'createdAt':
        return `createdAt: ${direction}`
      default:
        return `${field}: ${direction}`
    }
  })

  return `{ ${orderClauses.join(', ')} }`
}

/**
 * Build EquityInvestment list query with pagination
 */
export const buildEquityInvestmentQuery = (variables: EquityInvestmentQueryVariables = {}): string => {
  const whereCondition = buildEquityInvestmentWhereCondition(variables)
  const orderBy = buildEquityInvestmentOrderBy(variables.orderBy)
  const limit = Math.min(variables.limit || 50, 100)
  const offset = variables.offset || 0

  return `
    query GetEquityInvestments {
      EquityInvestment(
        where: ${whereCondition}
        orderBy: ${orderBy}
        limit: ${limit}
        offset: ${offset}
      ) {
        id
        investment {
          id
          name
          code
        }
        ${AUDIT_FIELDS}
      }
      EquityInvestmentAggregate(
        where: ${whereCondition}
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Build EquityInvestment by ID query
 */
export const buildEquityInvestmentByIdQuery = (id: string): string => {
  return `
    query GetEquityInvestmentById {
      EquityInvestmentByPk(id: "${id}") {
        id
        investment {
          id
          name
          code
        }
        ${AUDIT_FIELDS}
      }
    }
  `
}
