import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useGetEquityDistinctRoles } from '../queries/EquityDistinctRolesQuery'
import type { RoleInfo } from '../queries/EquityDistinctRolesQuery'

export interface RoleCountDistributionData {
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

export interface EquityRoleDistributionIntegration {
  roleCountDistribution: RoleCountDistributionData[]
  roleAmountDistribution: RoleAmountDistributionData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Build query for count aggregates
 */
const buildCountQuery = (roles: RoleInfo[], currency?: string): string => {
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

  const createAlias = (roleRef: string) => {
    return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
  }

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

/**
 * Build query for amount aggregates
 */
const buildAmountQuery = (roles: RoleInfo[], currency: string): string => {
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

  const createAlias = (roleRef: string) => {
    return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
  }

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

interface AggregateCountResult {
  aggregate: {
    count?: number
  }
}

interface AggregateAmountResult {
  aggregate: {
    sum?: {
      totalInvestmentAmount: number | null
    }
  }
}

interface CountResponse {
  [key: string]: AggregateCountResult
}

interface AmountResponse {
  [key: string]: AggregateAmountResult
}

/**
 * Optimized hook that fetches roles ONCE and then fetches both count and amount data
 * This prevents duplicate GetDistinctEquityRoles queries
 *
 * @param context - Business app context with access token
 * @param countCurrency - Currency for count distribution (supports 'All')
 * @param amountCurrency - Currency for amount distribution (specific currency only)
 * @returns Combined role distribution data with loading/error states
 */
export const useEquityRoleDistribution = (
  context: BusinessAppContextProps,
  countCurrency?: string,
  amountCurrency?: string
): EquityRoleDistributionIntegration => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctRoles } = useGetEquityDistinctRoles(context)

  const [roleCountDistribution, setRoleCountDistribution] = useState<RoleCountDistributionData[]>([])
  const [roleAmountDistribution, setRoleAmountDistribution] = useState<RoleAmountDistributionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = useRef(false)

  const loadData = useCallback(async () => {
    if (!context.accessToken || isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Fetch distinct roles ONCE
      const rolesInfo = await fetchDistinctRoles()

      if (rolesInfo.length === 0) {
        setRoleCountDistribution([])
        setRoleAmountDistribution([])
        setIsLoading(false)
        isLoadingRef.current = false
        return
      }

      // Step 2: Fetch count and amount aggregates in parallel
      const countQuery = buildCountQuery(rolesInfo, countCurrency)
      const amountQuery = buildAmountQuery(rolesInfo, amountCurrency || 'EUR')

      const [countResult, amountResult] = await Promise.all([
        graphqlClient.request<CountResponse>(countQuery),
        amountCurrency ? graphqlClient.request<AmountResponse>(amountQuery) : Promise.resolve({} as AmountResponse)
      ])

      // Step 3: Parse count results
      const createCountAlias = (roleRef: string) => {
        return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
      }

      const countData: RoleCountDistributionData[] = rolesInfo
        .map(role => {
          const countAlias = createCountAlias(role.roleRef)
          const count = countResult[countAlias]?.aggregate?.count || 0

          return {
            roleId: role.roleId,
            roleCode: role.roleCode,
            roleValue: role.roleValue,
            count
          }
        })
        .sort((a, b) => b.count - a.count)

      // Step 4: Parse amount results
      const createAmountAlias = (roleRef: string) => {
        return `role_${roleRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
      }

      const amountData: RoleAmountDistributionData[] = amountCurrency
        ? rolesInfo
            .map(role => {
              const amountAlias = createAmountAlias(role.roleRef)
              const totalAmount = amountResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

              return {
                roleId: role.roleId,
                roleCode: role.roleCode,
                roleValue: role.roleValue,
                totalAmount
              }
            })
            .sort((a, b) => b.totalAmount - a.totalAmount)
        : []

      setRoleCountDistribution(countData)
      setRoleAmountDistribution(amountData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [context.accessToken, countCurrency, amountCurrency, fetchDistinctRoles, graphqlClient])

  useEffect(() => {
    void loadData()
  }, [loadData])

  return {
    roleCountDistribution,
    roleAmountDistribution,
    isLoading,
    error,
    refetch: () => void loadData()
  }
}
