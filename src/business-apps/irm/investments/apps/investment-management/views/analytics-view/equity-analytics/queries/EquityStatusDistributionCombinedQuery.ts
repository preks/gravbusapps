import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface StatusDistributionData {
  statusId: string
  statusCode: string
  statusValue: string
  count: number
}

export interface StatusAmountDistributionData {
  statusId: string
  statusCode: string
  statusValue: string
  totalAmount: number
}

/**
 * Single query with aliases for all statuses
 * This reduces N+1 queries to just 2 queries total
 */

// Get ALL distinct statuses (no currency filter)
const GET_DISTINCT_STATUSES = (): string => {
  return `
    query GetDistinctStatuses {
      Investment(
        distinctOn: investmentStatusRef
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
        }
      ) {
        investmentStatusRef
        investmentStatus {
          id
          code
          value
        }
      }
    }
  `
}

interface StatusInfo {
  statusRef: string
  statusId: string
  statusCode: string
  statusValue: string
}

/**
 * Build a single query with aliases for ALL status aggregates (count + amount)
 * This is the key optimization - one query instead of N queries
 */
const BUILD_ALL_STATUSES_AGGREGATE_QUERY = (
  statuses: StatusInfo[],
  countCurrency?: string,
  amountCurrency?: string
): string => {
  const countConditions = (statusRef: string) => {
    const currencyCondition =
      countCurrency && countCurrency !== 'All' ? `currency: { code: { _eq: "${countCurrency}" } }` : ''

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

  const amountConditions = (statusRef: string) => {
    const conditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${amountCurrency}" } }`,
      `investmentStatusRef: { _eq: "${statusRef}" }`
    ]
      .filter(Boolean)
      .join('\n          ')

    return conditions
  }

  // Create a safe alias name from statusRef (remove special chars)
  const createAlias = (statusRef: string, suffix: string) => {
    return `status_${statusRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
  }

  // Build count aggregates for all statuses
  const countAggregates = statuses
    .map(status => {
      const alias = createAlias(status.statusRef, 'count')
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

  // Build amount aggregates for all statuses (only if amountCurrency provided)
  const amountAggregates = amountCurrency
    ? statuses
        .map(status => {
          const alias = createAlias(status.statusRef, 'amount')
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
    : ''

  return `
    query GetAllStatusAggregates {
      ${countAggregates}
      ${amountAggregates}
    }
  `
}

interface DistinctStatusesResponse {
  Investment: Array<{
    investmentStatusRef: string | null
    investmentStatus: {
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

interface AllStatusesAggregateResponse {
  [key: string]: AggregateResult
}

export interface CombinedStatusDistribution {
  countData: StatusDistributionData[]
  amountData: StatusAmountDistributionData[]
}

/**
 * Hook that fetches all status aggregates in a SINGLE query using aliases
 * This is much more efficient than N separate queries
 */
export const useGetEquityStatusDistributionCombined = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCombinedStatusDistribution = useCallback(
    async (countCurrency?: string, amountCurrency?: string): Promise<CombinedStatusDistribution> => {
      try {
        // Step 1: Get ALL distinct statuses ONCE (no currency filter)
        const distinctQuery = GET_DISTINCT_STATUSES()
        const distinctResult = await graphqlClient.request<DistinctStatusesResponse>(distinctQuery)

        const statusesInfo: StatusInfo[] = distinctResult.Investment.filter(
          item => item.investmentStatus && item.investmentStatusRef
        ).map(item => ({
          statusRef: item.investmentStatusRef!,
          statusId: item.investmentStatus!.id,
          statusCode: item.investmentStatus!.code,
          statusValue: item.investmentStatus!.value
        }))

        if (statusesInfo.length === 0) {
          return { countData: [], amountData: [] }
        }

        // Step 2: Get ALL aggregates (count + amount) in a SINGLE query with aliases
        const aggregateQuery = BUILD_ALL_STATUSES_AGGREGATE_QUERY(statusesInfo, countCurrency, amountCurrency)
        const aggregateResult = await graphqlClient.request<AllStatusesAggregateResponse>(aggregateQuery)

        // Helper to create alias (same logic as in query builder)
        const createAlias = (statusRef: string, suffix: string) => {
          return `status_${statusRef.replaceAll(/[^a-zA-Z0-9]/g, '_')}_${suffix}`
        }

        // Step 3: Parse results and map back to statuses
        const countData: StatusDistributionData[] = statusesInfo
          .map(status => {
            const countAlias = createAlias(status.statusRef, 'count')
            const count = aggregateResult[countAlias]?.aggregate?.count || 0

            return {
              statusId: status.statusId,
              statusCode: status.statusCode,
              statusValue: status.statusValue,
              count
            }
          })
          .sort((a, b) => b.count - a.count)

        const amountData: StatusAmountDistributionData[] = amountCurrency
          ? statusesInfo
              .map(status => {
                const amountAlias = createAlias(status.statusRef, 'amount')
                const totalAmount = aggregateResult[amountAlias]?.aggregate?.sum?.totalInvestmentAmount || 0

                return {
                  statusId: status.statusId,
                  statusCode: status.statusCode,
                  statusValue: status.statusValue,
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
        console.error('Error fetching combined equity status distribution:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchCombinedStatusDistribution }
}
