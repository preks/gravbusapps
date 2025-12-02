import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctRoles, type RoleInfo } from './EquityDistinctRolesQuery'

export interface RoleCountDistributionData {
  roleId: string
  roleCode: string
  roleValue: string
  count: number
}

/**
 * Query for Role Count Distribution (supports "All")
 * Uses shared distinct roles query to avoid duplication
 */

/**
 * Build query with aliases for ALL role count aggregates
 */
const BUILD_ALL_ROLES_COUNT_QUERY = (roles: RoleInfo[], currency?: string): string => {
  const countConditions = (roleRef: string) => {
    const currencyCondition = currency && currency !== 'All' ? `currency: { code: { _eq: "${currency}" } }` : ''

    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      currencyCondition,
      `investmentRole: { investmentRoleRef: { _eq: "${roleRef}" } }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from roleRef (remove special chars)
  const createAlias = (roleRef: string) => {
    return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
  }

  // Build count aggregates for all roles
  const countAggregates = roles
    .map(role => {
      const alias = createAlias(role.roleRef)
      return `
      ${alias}: InvestmentAggregate(
        where: {
          ${countConditions(role.roleRef)}
        }
      ) {
        aggregate {
          count
        }
      }`
    })
    .join('\n')

  return `
    query GetRoleCountAggregates {
      ${countAggregates}
    }
  `
}

interface AggregateResult {
  aggregate: {
    count?: number
  }
}

interface AllRolesCountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches role count distribution
 * Uses shared distinct roles query to avoid duplication with amount query
 */
export const useGetEquityRoleCountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctRoles } = useGetEquityDistinctRoles(context)

  const fetchRoleCountDistribution = useCallback(
    async (currency?: string): Promise<RoleCountDistributionData[]> => {
      // Step 1: Get ALL distinct roles using shared query
      const rolesInfo = await fetchDistinctRoles()

      if (rolesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL count aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_ROLES_COUNT_QUERY(rolesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllRolesCountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (roleRef: string) => {
        return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
      }

      // Step 3: Parse results and map back to roles
      const countData: RoleCountDistributionData[] = rolesInfo
        .map(role => {
          const countAlias = createAlias(role.roleRef)
          const count = aggregateResult[countAlias]?.aggregate?.count || 0

          return {
            roleId: role.roleId,
            roleCode: role.roleCode,
            roleValue: role.roleValue,
            count
          }
        })
        .sort((a, b) => b.count - a.count)

      return countData
    },
    [graphqlClient, fetchDistinctRoles]
  )

  return { fetchRoleCountDistribution }
}
