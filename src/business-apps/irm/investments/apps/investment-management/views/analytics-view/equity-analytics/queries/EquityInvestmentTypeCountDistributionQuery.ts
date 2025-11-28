import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctInvestmentTypes, type InvestmentTypeInfo } from './EquityDistinctInvestmentTypesQuery'

export interface InvestmentTypeCountDistributionData {
  investmentTypeId: string
  investmentTypeCode: string
  investmentTypeValue: string
  count: number
}

/**
 * Query for Investment Type Count Distribution (supports "All")
 * Uses shared distinct investment types query to avoid duplication
 */

/**
 * Build query with aliases for ALL investment type count aggregates
 */
const BUILD_ALL_INVESTMENT_TYPES_COUNT_QUERY = (investmentTypes: InvestmentTypeInfo[], currency?: string): string => {
  const countConditions = (investmentTypeRef: string) => {
    const currencyCondition = currency && currency !== 'All' ? `currency: { code: { _eq: "${currency}" } }` : ''

    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      currencyCondition,
      `investmentTypeRef: { _eq: "${investmentTypeRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from investmentTypeRef (remove special chars)
  const createAlias = (investmentTypeRef: string) => {
    return `investmentType_${investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
  }

  // Build count aggregates for all investment types
  const countAggregates = investmentTypes
    .map(investmentType => {
      const alias = createAlias(investmentType.investmentTypeRef)
      return `
      ${alias}: InvestmentAggregate(
        where: {
          ${countConditions(investmentType.investmentTypeRef)}
        }
      ) {
        aggregate {
          count
        }
      }`
    })
    .join('\n')

  return `
    query GetInvestmentTypeCountAggregates {
      ${countAggregates}
    }
  `
}

interface AggregateResult {
  aggregate: {
    count?: number
  }
}

interface AllInvestmentTypesCountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches investment type count distribution
 * Uses shared distinct investment types query to avoid duplication with amount query
 */
export const useGetEquityInvestmentTypeCountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctInvestmentTypes } = useGetEquityDistinctInvestmentTypes(context)

  const fetchInvestmentTypeCountDistribution = useCallback(
    async (currency?: string): Promise<InvestmentTypeCountDistributionData[]> => {
      // Step 1: Get ALL distinct investment types using shared query
      const investmentTypesInfo = await fetchDistinctInvestmentTypes()

      if (investmentTypesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL count aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_INVESTMENT_TYPES_COUNT_QUERY(investmentTypesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllInvestmentTypesCountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (investmentTypeRef: string) => {
        return `investmentType_${investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
      }

      // Step 3: Parse results and map back to investment types
      const countData: InvestmentTypeCountDistributionData[] = investmentTypesInfo
        .map(investmentType => {
          const countAlias = createAlias(investmentType.investmentTypeRef)
          const count = aggregateResult[countAlias]?.aggregate?.count || 0

          return {
            investmentTypeId: investmentType.investmentTypeId,
            investmentTypeCode: investmentType.investmentTypeCode,
            investmentTypeValue: investmentType.investmentTypeValue,
            count
          }
        })
        .sort((a, b) => b.count - a.count)

      return countData
    },
    [graphqlClient, fetchDistinctInvestmentTypes]
  )

  return { fetchInvestmentTypeCountDistribution }
}
