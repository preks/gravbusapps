import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctStatuses, type StatusInfo } from './EquityDistinctStatusesQuery'

export interface StatusAmountDistributionData {
  statusId: string
  statusCode: string
  statusValue: string
  totalAmount: number
}

/**
 * Query for Status Amount Distribution (requires specific currency)
 * Uses shared distinct statuses query to avoid duplication
 */

/**
 * Build query with aliases for ALL status amount aggregates
 */
const BUILD_ALL_STATUSES_AMOUNT_QUERY = (statuses: StatusInfo[], currency: string): string => {
  const amountConditions = (statusRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${currency}" } }`,
      `investmentStatusRef: { _eq: "${statusRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from statusRef (remove special chars)
  const createAlias = (statusRef: string) => {
    return `status_${statusRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
  }

  // Build amount aggregates for all statuses
  const amountAggregates = statuses
    .map(status => {
      const alias = createAlias(status.statusRef)
      return `
      ${alias}: InvestmentAggregate(
        where: {
          ${amountConditions(status.statusRef)}
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
    query GetStatusAmountAggregates {
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

interface AllStatusesAmountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches status amount distribution
 * Uses shared distinct statuses query to avoid duplication with count query
 */
export const useGetEquityStatusAmountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctStatuses } = useGetEquityDistinctStatuses(context)

  const fetchStatusAmountDistribution = useCallback(
    async (currency: string): Promise<StatusAmountDistributionData[]> => {
      // Step 1: Get ALL distinct statuses using shared query
      const statusesInfo = await fetchDistinctStatuses()

      if (statusesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL amount aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_STATUSES_AMOUNT_QUERY(statusesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllStatusesAmountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (statusRef: string) => {
        return `status_${statusRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_amount`
      }

      // Step 3: Parse results and map back to statuses
      const amountData: StatusAmountDistributionData[] = statusesInfo
        .map(status => {
          const amountAlias = createAlias(status.statusRef)
          const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

          return {
            statusId: status.statusId,
            statusCode: status.statusCode,
            statusValue: status.statusValue,
            totalAmount
          }
        })
        .sort((a, b) => b.totalAmount - a.totalAmount)

      return amountData
    },
    [graphqlClient, fetchDistinctStatuses]
  )

  return { fetchStatusAmountDistribution }
}
