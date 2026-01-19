import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface RoleDistributionData {
  roleId: string
  roleCode: string
  roleValue: string
  count: number
}

export interface RoleAmountDistributionData {
  roleId: string
  roleCode: string
  roleValue: string
  totalAmount: number
}

/**
 * Single query with aliases for all roles
 * This reduces N+1 queries to just 2 queries total
 */

// Get ALL distinct roles (no currency filter)
const GET_DISTINCT_ROLES = (): string => {
  return `
    query GetDistinctRoles {
      InvestmentRole(
        distinctOn: investmentRoleRef
        where: {
          isDeleted: { _eq: false }
          investment: {
            isDeleted: { _eq: false }
            investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
          }
        }
      ) {
        investmentRoleRef
        investmentRole {
          id
          code
          value
        }
      }
    }
  `
}

interface RoleInfo {
  roleRef: string
  roleId: string
  roleCode: string
  roleValue: string
}

/**
 * Build a single query with aliases for ALL role aggregates (count + amount)
 * This is the key optimization - one query instead of N queries
 */
const BUILD_ALL_ROLES_AGGREGATE_QUERY = (
  roles: RoleInfo[],
  countCurrency?: string,
  amountCurrency?: string
): string => {
  const countConditions = (roleRef: string) => {
    const currencyCondition =
      countCurrency && countCurrency !== 'All' ? `currency: { code: { _eq: "${countCurrency}" } }` : ''

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

  const amountConditions = (roleRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${amountCurrency}" } }`,
      `investmentRole: { investmentRoleRef: { _eq: "${roleRef}" } }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from roleRef (remove special chars)
  const createAlias = (roleRef: string, suffix: string) => {
    return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
  }

  // Build count aggregates for all roles
  const countAggregates = roles
    .map(role => {
      const alias = createAlias(role.roleRef, 'count')
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

  // Build amount aggregates for all roles (only if amountCurrency provided)
  const amountAggregates = amountCurrency
    ? roles
        .map(role => {
          const alias = createAlias(role.roleRef, 'amount')
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
    : ''

  return `
    query GetAllRoleAggregates {
      ${countAggregates}
      ${amountAggregates}
    }
  `
}

interface DistinctRolesResponse {
  InvestmentRole: Array<{
    investmentRoleRef: string
    investmentRole: {
      id: string
      code: string
      value: string
    } | null
  }>
}

interface AggregateResult {
  aggregate: {
    count?: number
    sum?: {
      totalInvestmentAmount: number | null
    }
  }
}

interface AllRolesAggregateResponse {
  [key: string]: AggregateResult
}

export interface CombinedRoleDistribution {
  countData: RoleDistributionData[]
  amountData: RoleAmountDistributionData[]
}

/**
 * Hook that fetches all role aggregates in a SINGLE query using aliases
 * This is much more efficient than N separate queries
 */
export const useGetEquityRoleDistributionCombined = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCombinedRoleDistribution = useCallback(
    async (countCurrency?: string, amountCurrency?: string): Promise<CombinedRoleDistribution> => {
      try {
        // Step 1: Get ALL distinct roles ONCE (no currency filter)
        const distinctQuery = GET_DISTINCT_ROLES()
        const distinctResult = await graphqlClient.request<DistinctRolesResponse>(distinctQuery)

        const rolesInfo: RoleInfo[] = distinctResult.InvestmentRole.filter(
          item => item.investmentRole && item.investmentRoleRef
        ).map(item => ({
          roleRef: item.investmentRoleRef,
          roleId: item.investmentRole!.id,
          roleCode: item.investmentRole!.code,
          roleValue: item.investmentRole!.value
        }))

        if (rolesInfo.length === 0) {
          return { countData: [], amountData: [] }
        }

        // Step 2: Get ALL aggregates (count + amount) in a SINGLE query with aliases
        const aggregateQuery = BUILD_ALL_ROLES_AGGREGATE_QUERY(rolesInfo, countCurrency, amountCurrency)
        const aggregateResult = await graphqlClient.request<AllRolesAggregateResponse>(aggregateQuery)

        // Helper to create alias (same logic as in query builder)
        const createAlias = (roleRef: string, suffix: string) => {
          return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
        }

        // Step 3: Parse results and map back to roles
        const countData: RoleDistributionData[] = rolesInfo
          .map(role => {
            const countAlias = createAlias(role.roleRef, 'count')
            const count = aggregateResult[countAlias]?.aggregate?.count || 0

            return {
              roleId: role.roleId,
              roleCode: role.roleCode,
              roleValue: role.roleValue,
              count
            }
          })
          .sort((a, b) => b.count - a.count)

        const amountData: RoleAmountDistributionData[] = amountCurrency
          ? rolesInfo
              .map(role => {
                const amountAlias = createAlias(role.roleRef, 'amount')
                const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

                return {
                  roleId: role.roleId,
                  roleCode: role.roleCode,
                  roleValue: role.roleValue,
                  totalAmount
                }
              })
              .sort((a, b) => b.totalAmount - a.totalAmount)
          : []

        return {
          countData,
          amountData
        }
      } catch (error) {
        console.error('Error fetching combined equity role distribution:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchCombinedRoleDistribution }
}
