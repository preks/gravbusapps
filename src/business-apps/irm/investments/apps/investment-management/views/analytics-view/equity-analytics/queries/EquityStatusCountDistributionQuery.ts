import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityDistinctStatuses, type StatusInfo } from './EquityDistinctStatusesQuery'

export interface StatusCountDistributionData {
  statusId: string
  statusCode: string
  statusValue: string
  count: number
}

/**
 * Query for Status Count Distribution (supports "All")
 * Uses shared distinct statuses query to avoid duplication
 */

/**
 * Build query with aliases for ALL status count aggregates
 */
const BUILD_ALL_STATUSES_COUNT_QUERY = (statuses: StatusInfo[], currency?: string): string => {
  const countConditions = (statusRef: string) => {
    const currencyCondition = currency && currency !== 'All' ? `currency: { code: { _eq: "${currency}" } }` : ''

    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      currencyCondition,
      `investmentStatusRef: { _eq: "${statusRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from statusRef (remove special chars)
  const createAlias = (statusRef: string) => {
    return `status_${statusRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
  }

  // Build count aggregates for all statuses
  const countAggregates = statuses
    .map(status => {
      const alias = createAlias(status.statusRef)
      return `
      ${alias}: InvestmentAggregate(
        where: {
          ${countConditions(status.statusRef)}
        }
      ) {
        aggregate {
          count
        }
      }`
    })
    .join('\n')

  return `
    query GetStatusCountAggregates {
      ${countAggregates}
    }
  `
}

interface AggregateResult {
  aggregate: {
    count?: number
  }
}

interface AllStatusesCountResponse {
  [key: string]: AggregateResult
}

/**
 * Hook that fetches status count distribution
 * Uses shared distinct statuses query to avoid duplication with amount query
 */
export const useGetEquityStatusCountDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const { fetchDistinctStatuses } = useGetEquityDistinctStatuses(context)

  const fetchStatusCountDistribution = useCallback(
    async (currency?: string): Promise<StatusCountDistributionData[]> => {
      // Step 1: Get ALL distinct statuses using shared query
      const statusesInfo = await fetchDistinctStatuses()

      if (statusesInfo.length === 0) {
        return []
      }

      // Step 2: Get ALL count aggregates in a SINGLE query with aliases
      const aggregateQuery = BUILD_ALL_STATUSES_COUNT_QUERY(statusesInfo, currency)
      const aggregateResult = await graphqlClient.request<AllStatusesCountResponse>(aggregateQuery)

      // Helper to create alias (same logic as in query builder)
      const createAlias = (statusRef: string) => {
        return `status_${statusRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_count`
      }

      // Step 3: Parse results and map back to statuses
      const countData: StatusCountDistributionData[] = statusesInfo
        .map(status => {
          const countAlias = createAlias(status.statusRef)
          const count = aggregateResult[countAlias]?.aggregate?.count || 0

          return {
            statusId: status.statusId,
            statusCode: status.statusCode,
            statusValue: status.statusValue,
            count
          }
        })
        .sort((a, b) => b.count - a.count)

      return countData
    },
    [graphqlClient, fetchDistinctStatuses]
  )

  return { fetchStatusCountDistribution }
}
