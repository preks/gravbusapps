/**
 * Equity Investment Queries
 * GraphQL queries for EquityInvestment entities
 */

import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { buildWhere, buildOrderBy, type Descriptor } from '@/common/network/graphql/queryHelpers'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface EquityInvestmentQueryVariables extends BaseQueryVariables {
  investmentIds?: string[]
}

/**
 * Descriptors for EquityInvestment queries
 * Define searchable and sortable fields
 */
export const EQUITY_INVESTMENT_DESCRIPTORS: Descriptor[] = [
  {
    key: 'investmentName',
    searchPaths: ['investment.name'],
    sortPath: 'investment.name',
    type: 'text',
    enableSearch: true,
    enableSort: true
  },
  {
    key: 'createdAt',
    searchPaths: ['createdAt'],
    sortPath: 'createdAt',
    type: 'date',
    enableSort: true
  }
]

/**
 * Build where condition for EquityInvestment queries
 */
export const buildEquityInvestmentWhereCondition = (
  variables: EquityInvestmentQueryVariables = {},
  customConditions: Record<string, any>[] = []
): Record<string, any> => {
  const additionalConditions = [...customConditions]

  // Filter by parent investment IDs
  if (variables.investmentIds?.length) {
    additionalConditions.push({ investment: { id: { _in: variables.investmentIds } } })
  }

  return buildWhere({
    variables,
    descriptors: EQUITY_INVESTMENT_DESCRIPTORS,
    ids: variables.ids,
    customConditions: additionalConditions
  })
}

/**
 * Build order by clause for EquityInvestment queries
 */
export const buildEquityInvestmentOrderBy = (orderBy: EquityInvestmentQueryVariables['orderBy'] = []): any[] => {
  return buildOrderBy(orderBy, EQUITY_INVESTMENT_DESCRIPTORS)
}

/**
 * Build EquityInvestment list query with pagination using GraphQL variables
 */
export const buildEquityInvestmentQuery = (): string => {
  return `
    query GetEquityInvestments(
      $limit: Int
      $offset: Int
      $where: EquityInvestmentBoolExp
      $orderBy: [EquityInvestmentOrderBy!]
    ) {
      EquityInvestment(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
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
        where: $where
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

/**
 * Build EquityInvestment by ID query using GraphQL variables
 */
export const buildEquityInvestmentByIdQuery = (): string => {
  return `
    query GetEquityInvestmentById($id: uuid!) {
      EquityInvestmentByPk(id: $id) {
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
