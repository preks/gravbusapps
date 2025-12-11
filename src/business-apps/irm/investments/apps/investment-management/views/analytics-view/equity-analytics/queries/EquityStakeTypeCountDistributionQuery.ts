import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctStakeTypes, type StakeTypeInfo } from './EquityDistinctStakeTypesQuery'

export interface StakeTypeCountDistributionData {
  stakeTypeId: string
  stakeTypeCode: string
  stakeTypeValue: string
  count: number
}

/**
 * Query for Stake Type Count Distribution (supports "All")
 * Uses shared distinct stake types query to avoid duplication
 */

/**
 * Build query with aliases for ALL stake type count aggregates
 */
const BUILD_ALL_STAKE_TYPES_COUNT_QUERY = (stakeTypes: StakeTypeInfo[], currency?: string): string => {
  const countConditions = (stakeTypeRef: string) => {
    const currencyCondition = currency && currency !== 'All' ? `currency: { code: { _eq: "${currency}" } }` : ''

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

  // Create a safe alias name from stakeTypeRef (remove special chars)
  const createAlias = (stakeTypeRef: string) => {
    return `stakeType_${stakeTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
  }

  // Build count aggregates for all stake types
  const countAggregates = stakeTypes
    .map(stakeType => {
      const alias = createAlias(stakeType.stakeTypeRef)
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

  return `
    query GetStakeTypeCountAggregates {
      ${countAggregates}
    }
  `
}

interface AggregateResult {
  aggregate: {
    count?: number
  }
}

interface AllStakeTypesCountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches stake type count distribution
 * Uses shared distinct stake types query to avoid duplication with amount query
 */
export const useGetEquityStakeTypeCountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctStakeTypes } = useGetEquityDistinctStakeTypes(context)

  const fetchStakeTypeCountDistribution = useCallback(
    async (currency?: string): Promise<StakeTypeCountDistributionData[]> => {
      // Step 1: Get ALL distinct stake types using shared query
      const stakeTypesInfo = await fetchDistinctStakeTypes()

      if (stakeTypesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL count aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_STAKE_TYPES_COUNT_QUERY(stakeTypesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllStakeTypesCountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (stakeTypeRef: string) => {
        return `stakeType_${stakeTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
      }

      // Step 3: Parse results and map back to stake types
      const countData: StakeTypeCountDistributionData[] = stakeTypesInfo
        .map(stakeType => {
          const countAlias = createAlias(stakeType.stakeTypeRef)
          const count = aggregateResult[countAlias]?.aggregate?.count || 0

          return {
            stakeTypeId: stakeType.stakeTypeId,
            stakeTypeCode: stakeType.stakeTypeCode,
            stakeTypeValue: stakeType.stakeTypeValue,
            count
          }
        })
        .sort((a, b) => b.count - a.count)

      return countData
    },
    [graphqlClient, fetchDistinctStakeTypes]
  )

  return { fetchStakeTypeCountDistribution }
}
