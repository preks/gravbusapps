import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InvestmentTypeDistributionData {
  investmentTypeId: string
  investmentTypeCode: string
  investmentTypeValue: string
  count: number
}

export interface InvestmentTypeAmountDistributionData {
  investmentTypeId: string
  investmentTypeCode: string
  investmentTypeValue: string
  totalAmount: number
}

/**
 * Single query with aliases for all investment types
 * This reduces N+1 queries to just 2 queries total
 */

// Get ALL distinct investment types (no currency filter)
const GET_DISTINCT_INVESTMENT_TYPES = (): string => {
  return `
    query GetDistinctInvestmentTypes {
      Investment(
        distinctOn: investmentTypeRef
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
        }
      ) {
        investmentTypeRef
        investmentType {
          id
          code
          value
        }
      }
    }
  `
}

interface InvestmentTypeInfo {
  investmentTypeRef: string
  investmentTypeId: string
  investmentTypeCode: string
  investmentTypeValue: string
}

/**
 * Build a single query with aliases for ALL investment type aggregates (count + amount)
 * This is the key optimization - one query instead of N queries
 */
const BUILD_ALL_INVESTMENT_TYPES_AGGREGATE_QUERY = (
  investmentTypes: InvestmentTypeInfo[],
  countCurrency?: string,
  amountCurrency?: string
): string => {
  const countConditions = (investmentTypeRef: string) => {
    const currencyCondition =
      countCurrency && countCurrency !== 'All' ? `currency: { code: { _eq: "${countCurrency}" } }` : ''

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

  const amountConditions = (investmentTypeRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${amountCurrency}" } }`,
      `investmentTypeRef: { _eq: "${investmentTypeRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from investmentTypeRef (remove special chars)
  const createAlias = (investmentTypeRef: string, suffix: string) => {
    return `investmentType_${investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
  }

  // Build count aggregates for all investment types
  const countAggregates = investmentTypes
    .map(investmentType => {
      const alias = createAlias(investmentType.investmentTypeRef, 'count')
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

  // Build amount aggregates for all investment types (only if amountCurrency provided)
  const amountAggregates = amountCurrency
    ? investmentTypes
        .map(investmentType => {
          const alias = createAlias(investmentType.investmentTypeRef, 'amount')
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
    : ''

  return `
    query GetAllInvestmentTypeAggregates {
      ${countAggregates}
      ${amountAggregates}
    }
  `
}

interface DistinctInvestmentTypesResponse {
  Investment: Array<{
    investmentTypeRef: string | null
    investmentType: {
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

interface AllInvestmentTypesAggregateResponse {
  [key: string]: AggregateResult
}

export interface CombinedInvestmentTypeDistribution {
  countData: InvestmentTypeDistributionData[]
  amountData: InvestmentTypeAmountDistributionData[]
}

/**
 * Hook that fetches all investment type aggregates in a SINGLE query using aliases
 * This is much more efficient than N separate queries
 */
export const useGetEquityInvestmentTypeDistributionCombined = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCombinedInvestmentTypeDistribution = useCallback(
    async (countCurrency?: string, amountCurrency?: string): Promise<CombinedInvestmentTypeDistribution> => {
      try {
        // Step 1: Get ALL distinct investment types ONCE (no currency filter)
        const distinctQuery = GET_DISTINCT_INVESTMENT_TYPES()
        const distinctResult = await graphqlClient.request<DistinctInvestmentTypesResponse>(distinctQuery)

        const investmentTypesInfo: InvestmentTypeInfo[] = distinctResult.Investment.filter(
          item => item.investmentType && item.investmentTypeRef
        ).map(item => ({
          investmentTypeRef: item.investmentTypeRef!,
          investmentTypeId: item.investmentType!.id,
          investmentTypeCode: item.investmentType!.code,
          investmentTypeValue: item.investmentType!.value
        }))

        if (investmentTypesInfo.length === 0) {
          return { countData: [], amountData: [] }
        }

        // Step 2: Get ALL aggregates (count + amount) in a SINGLE query with aliases
        const aggregateQuery = BUILD_ALL_INVESTMENT_TYPES_AGGREGATE_QUERY(
          investmentTypesInfo,
          countCurrency,
          amountCurrency
        )
        const aggregateResult = await graphqlClient.request<AllInvestmentTypesAggregateResponse>(aggregateQuery)

        // Helper to create alias (same logic as in query builder)
        const createAlias = (investmentTypeRef: string, suffix: string) => {
          return `investmentType_${investmentTypeRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
        }

        // Step 3: Parse results and map back to investment types
        const countData: InvestmentTypeDistributionData[] = investmentTypesInfo
          .map(investmentType => {
            const countAlias = createAlias(investmentType.investmentTypeRef, 'count')
            const count = aggregateResult[countAlias]?.aggregate?.count || 0

            return {
              investmentTypeId: investmentType.investmentTypeId,
              investmentTypeCode: investmentType.investmentTypeCode,
              investmentTypeValue: investmentType.investmentTypeValue,
              count
            }
          })
          .sort((a, b) => b.count - a.count)

        const amountData: InvestmentTypeAmountDistributionData[] = amountCurrency
          ? investmentTypesInfo
              .map(investmentType => {
                const amountAlias = createAlias(investmentType.investmentTypeRef, 'amount')
                const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

                return {
                  investmentTypeId: investmentType.investmentTypeId,
                  investmentTypeCode: investmentType.investmentTypeCode,
                  investmentTypeValue: investmentType.investmentTypeValue,
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
        console.error('Error fetching combined equity investment type distribution:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchCombinedInvestmentTypeDistribution }
}
