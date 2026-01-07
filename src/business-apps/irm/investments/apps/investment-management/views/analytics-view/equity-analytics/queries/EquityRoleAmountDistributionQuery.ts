import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctRoles, type RoleInfo } from './EquityDistinctRolesQuery'

export interface RoleAmountDistributionData {
  roleId: string
  roleCode: string
  roleValue: string
  totalAmount: number
}

/**
 * Query for Role Amount Distribution (requires specific currency)
 * Uses shared distinct roles query to avoid duplication
 */

/**
 * Build query with aliases for ALL role amount aggregates
 */
const BUILD_ALL_ROLES_AMOUNT_QUERY = (roles: RoleInfo[], currency: string): string => {
  const amountConditions = (roleRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${currency}" } }`,
      `investmentRole: { investmentRoleRef: { _eq: "${roleRef}" } }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from roleRef (remove special chars)
  const createAlias = (roleRef: string) => {
    return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
  }

  // Build amount aggregates for all roles
  const amountAggregates = roles
    .map(role => {
      const alias = createAlias(role.roleRef)
      return `
      ${alias}: InvestmentAggregate(
        where: {
          ${amountConditions(role.roleRef)}
        }
      ) {
        aggregate {
          sum {
            totalInvestmentAmount
          }
        }
      }`
    })
    .join('\n')

  return `
    query GetRoleAmountAggregates {
      ${amountAggregates}
    }
  `
}

interface AggregateResult {
  aggregate: {
    sum?: {
      totalInvestmentAmount: number | null
    }
  }
}

interface AllRolesAmountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches role amount distribution
 * Uses shared distinct roles query to avoid duplication with count query
 */
export const useGetEquityRoleAmountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctRoles } = useGetEquityDistinctRoles(context)

  const fetchRoleAmountDistribution = useCallback(
    async (currency: string): Promise<RoleAmountDistributionData[]> => {
      // Step 1: Get ALL distinct roles using shared query
      const rolesInfo = await fetchDistinctRoles()

      if (rolesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL amount aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_ROLES_AMOUNT_QUERY(rolesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllRolesAmountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (roleRef: string) => {
        return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
      }

      // Step 3: Parse results and map back to roles
      const amountData: RoleAmountDistributionData[] = rolesInfo
        .map(role => {
          const amountAlias = createAlias(role.roleRef)
          const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

          return {
            roleId: role.roleId,
            roleCode: role.roleCode,
            roleValue: role.roleValue,
            totalAmount
          }
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)

      return amountData
    },
    [graphqlClient, fetchDistinctRoles]
  )

  return { fetchRoleAmountDistribution }
}
