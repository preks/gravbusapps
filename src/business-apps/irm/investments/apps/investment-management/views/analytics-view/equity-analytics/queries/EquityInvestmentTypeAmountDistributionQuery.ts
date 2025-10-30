import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctInvestmentTypes, type InvestmentTypeInfo } from './EquityDistinctInvestmentTypesQuery'

export interface InvestmentTypeAmountDistributionData {
  investmentTypeId: string
  investmentTypeCode: string
  investmentTypeValue: string
  totalAmount: number
}

/**
 * Query for Investment Type Amount Distribution (requires specific currency)
 * Uses shared distinct investment types query to avoid duplication
 */

/**
 * Build query with aliases for ALL investment type amount aggregates
 */
const BUILD_ALL_INVESTMENT_TYPES_AMOUNT_QUERY = (investmentTypes: InvestmentTypeInfo[], currency: string): string => {
  const amountConditions = (investmentTypeRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${currency}" } }`,
      `investmentTypeRef: { _eq: "${investmentTypeRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from investmentTypeRef (remove special chars)
  const createAlias = (investmentTypeRef: string) => {
    return `investmentType_${investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
  }

  // Build amount aggregates for all investment types
  const amountAggregates = investmentTypes
    .map(investmentType => {
      const alias = createAlias(investmentType.investmentTypeRef)
      return `
      ${alias}: InvestmentAggregate(
        where: {
          ${amountConditions(investmentType.investmentTypeRef)}
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
    query GetInvestmentTypeAmountAggregates {
      ${amountAggregates}
    }
  `
}

interface AggregateResult {
  aggregate: {
    sum?: {
      totalInvestmentAmount?: number
    }
  }
}

interface AllInvestmentTypesAmountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches investment type amount distribution
 * Uses shared distinct investment types query to avoid duplication with count query
 */
export const useGetEquityInvestmentTypeAmountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctInvestmentTypes } = useGetEquityDistinctInvestmentTypes(context)

  const fetchInvestmentTypeAmountDistribution = useCallback(
    async (currency: string): Promise<InvestmentTypeAmountDistributionData[]> => {
      // Step 1: Get ALL distinct investment types using shared query
      const investmentTypesInfo = await fetchDistinctInvestmentTypes()

      if (investmentTypesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL amount aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_INVESTMENT_TYPES_AMOUNT_QUERY(investmentTypesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllInvestmentTypesAmountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (investmentTypeRef: string) => {
        return `investmentType_${investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
      }

      // Step 3: Parse results and map back to investment types
      const amountData: InvestmentTypeAmountDistributionData[] = investmentTypesInfo
        .map(investmentType => {
          const amountAlias = createAlias(investmentType.investmentTypeRef)
          const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

          return {
            investmentTypeId: investmentType.investmentTypeId,
            investmentTypeCode: investmentType.investmentTypeCode,
            investmentTypeValue: investmentType.investmentTypeValue,
            totalAmount
          }
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)

      return amountData
    },
    [graphqlClient, fetchDistinctInvestmentTypes]
  )

  return { fetchInvestmentTypeAmountDistribution }
}
