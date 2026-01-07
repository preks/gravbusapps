import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctStakeTypes, type StakeTypeInfo } from './EquityDistinctStakeTypesQuery'

export interface StakeTypeAmountDistributionData {
  stakeTypeId: string
  stakeTypeCode: string
  stakeTypeValue: string
  totalAmount: number
}

/**
 * Query for Stake Type Amount Distribution (requires specific currency)
 * Uses shared distinct stake types query to avoid duplication
 */

/**
 * Build query with aliases for ALL stake type amount aggregates
 */
const BUILD_ALL_STAKE_TYPES_AMOUNT_QUERY = (stakeTypes: StakeTypeInfo[], currency: string): string => {
  const amountConditions = (stakeTypeRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${currency}" } }`,
      `investmentStakeTypeRef: { _eq: "${stakeTypeRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from stakeTypeRef (remove special chars)
  const createAlias = (stakeTypeRef: string) => {
    return `stakeType_${stakeTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
  }

  // Build amount aggregates for all stake types
  const amountAggregates = stakeTypes
    .map(stakeType => {
      const alias = createAlias(stakeType.stakeTypeRef)
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

  return `
    query GetStakeTypeAmountAggregates {
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

interface AllStakeTypesAmountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches stake type amount distribution
 * Uses shared distinct stake types query to avoid duplication with count query
 */
export const useGetEquityStakeTypeAmountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctStakeTypes } = useGetEquityDistinctStakeTypes(context)

  const fetchStakeTypeAmountDistribution = useCallback(
    async (currency: string): Promise<StakeTypeAmountDistributionData[]> => {
      // Step 1: Get ALL distinct stake types using shared query
      const stakeTypesInfo = await fetchDistinctStakeTypes()

      if (stakeTypesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL amount aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_STAKE_TYPES_AMOUNT_QUERY(stakeTypesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllStakeTypesAmountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (stakeTypeRef: string) => {
        return `stakeType_${stakeTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
      }

      // Step 3: Parse results and map back to stake types
      const amountData: StakeTypeAmountDistributionData[] = stakeTypesInfo
        .map(stakeType => {
          const amountAlias = createAlias(stakeType.stakeTypeRef)
          const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

          return {
            stakeTypeId: stakeType.stakeTypeId,
            stakeTypeCode: stakeType.stakeTypeCode,
            stakeTypeValue: stakeType.stakeTypeValue,
            totalAmount
          }
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)

      return amountData
    },
    [graphqlClient, fetchDistinctStakeTypes]
  )

  return { fetchStakeTypeAmountDistribution }
}
