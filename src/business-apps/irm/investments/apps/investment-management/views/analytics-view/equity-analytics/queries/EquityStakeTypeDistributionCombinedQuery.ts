import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface StakeTypeDistributionData {
  stakeTypeId: string
  stakeTypeCode: string
  stakeTypeValue: string
  count: number
}

export interface StakeTypeAmountDistributionData {
  stakeTypeId: string
  stakeTypeCode: string
  stakeTypeValue: string
  totalAmount: number
}

/**
 * Single query with aliases for all stake types
 * This reduces N+1 queries to just 2 queries total
 */

// Get ALL distinct stake types (no currency filter)
const GET_DISTINCT_STAKE_TYPES = (): string => {
  return `
    query GetDistinctStakeTypes {
      Investment(
        distinctOn: investmentStakeTypeRef
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
        }
      ) {
        investmentStakeTypeRef
        investmentStakeType {
          id
          code
          value
        }
      }
    }
  `
}

interface StakeTypeInfo {
  stakeTypeRef: string
  stakeTypeId: string
  stakeTypeCode: string
  stakeTypeValue: string
}

/**
 * Build a single query with aliases for ALL stake type aggregates (count + amount)
 * This is the key optimization - one query instead of N queries
 */
const BUILD_ALL_STAKE_TYPES_AGGREGATE_QUERY = (
  stakeTypes: StakeTypeInfo[],
  countCurrency?: string,
  amountCurrency?: string
): string => {
  const countConditions = (stakeTypeRef: string) => {
    const currencyCondition =
      countCurrency && countCurrency !== 'All' ? `currency: { code: { _eq: "${countCurrency}" } }` : ''

    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      currencyCondition,
      `investmentStakeTypeRef: { _eq: "${stakeTypeRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  const amountConditions = (stakeTypeRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${amountCurrency}" } }`,
      `investmentStakeTypeRef: { _eq: "${stakeTypeRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from stakeTypeRef (remove special chars)
  const createAlias = (stakeTypeRef: string, suffix: string) => {
    return `stakeType_${stakeTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
  }

  // Build count aggregates for all stake types
  const countAggregates = stakeTypes
    .map(stakeType => {
      const alias = createAlias(stakeType.stakeTypeRef, 'count')
      return `
      ${alias}: InvestmentAggregate(
        where: {
          ${countConditions(stakeType.stakeTypeRef)}
        }
      ) {
        aggregate {
          count
        }
      }`
    })
    .join('\n')

  // Build amount aggregates for all stake types (only if amountCurrency provided)
  const amountAggregates = amountCurrency
    ? stakeTypes
        .map(stakeType => {
          const alias = createAlias(stakeType.stakeTypeRef, 'amount')
          return `
      ${alias}: InvestmentAggregate(
        where: {
          ${amountConditions(stakeType.stakeTypeRef)}
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
    query GetAllStakeTypeAggregates {
      ${countAggregates}
      ${amountAggregates}
    }
  `
}

interface DistinctStakeTypesResponse {
  Investment: Array<{
    investmentStakeTypeRef: string | null
    investmentStakeType: {
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

interface AllStakeTypesAggregateResponse {
  [key: string]: AggregateResult
}

export interface CombinedStakeTypeDistribution {
  countData: StakeTypeDistributionData[]
  amountData: StakeTypeAmountDistributionData[]
}

/**
 * Hook that fetches all stake type aggregates in a SINGLE query using aliases
 * This is much more efficient than N separate queries
 */
export const useGetEquityStakeTypeDistributionCombined = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCombinedStakeTypeDistribution = useCallback(
    async (countCurrency?: string, amountCurrency?: string): Promise<CombinedStakeTypeDistribution> => {
      try {
        // Step 1: Get ALL distinct stake types ONCE (no currency filter)
        const distinctQuery = GET_DISTINCT_STAKE_TYPES()
        const distinctResult = await graphqlClient.request<DistinctStakeTypesResponse>(distinctQuery)

        const stakeTypesInfo: StakeTypeInfo[] = distinctResult.Investment.filter(
          item => item.investmentStakeType && item.investmentStakeTypeRef
        ).map(item => ({
          stakeTypeRef: item.investmentStakeTypeRef!,
          stakeTypeId: item.investmentStakeType!.id,
          stakeTypeCode: item.investmentStakeType!.code,
          stakeTypeValue: item.investmentStakeType!.value
        }))

        if (stakeTypesInfo.length === 0) {
          return { countData: [], amountData: [] }
        }

        // Step 2: Get ALL aggregates (count + amount) in a SINGLE query with aliases
        const aggregateQuery = BUILD_ALL_STAKE_TYPES_AGGREGATE_QUERY(stakeTypesInfo, countCurrency, amountCurrency)
        const aggregateResult = await graphqlClient.request<AllStakeTypesAggregateResponse>(aggregateQuery)

        // Helper to create alias (same logic as in query builder)
        const createAlias = (stakeTypeRef: string, suffix: string) => {
          return `stakeType_${stakeTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
        }

        // Step 3: Parse results and map back to stake types
        const countData: StakeTypeDistributionData[] = stakeTypesInfo
          .map(stakeType => {
            const countAlias = createAlias(stakeType.stakeTypeRef, 'count')
            const count = aggregateResult[countAlias]?.aggregate?.count || 0

            return {
              stakeTypeId: stakeType.stakeTypeId,
              stakeTypeCode: stakeType.stakeTypeCode,
              stakeTypeValue: stakeType.stakeTypeValue,
              count
            }
          })
          .sort((a, b) => b.count - a.count)

        const amountData: StakeTypeAmountDistributionData[] = amountCurrency
          ? stakeTypesInfo
              .map(stakeType => {
                const amountAlias = createAlias(stakeType.stakeTypeRef, 'amount')
                const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

                return {
                  stakeTypeId: stakeType.stakeTypeId,
                  stakeTypeCode: stakeType.stakeTypeCode,
                  stakeTypeValue: stakeType.stakeTypeValue,
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
        console.error('Error fetching combined equity stake type distribution:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchCombinedStakeTypeDistribution }
}
