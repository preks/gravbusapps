import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InvestmentSizeRangeData {
  range: string
  minValue: number
  maxValue: number | null
  count: number
  totalAmount: number
  percentage?: number
}

/**
 * Fixed investment size ranges (in millions)
 * Using fixed intervals for consistent comparison across currencies
 */
const SIZE_RANGES = [
  { label: '<50M', min: 0, max: 50000000 },
  { label: '50M-200M', min: 50000001, max: 200000000 },
  { label: '200M-500M', min: 200000001, max: 500000000 },
  { label: '500M-1B', min: 500000001, max: 1000000000 },
  { label: '>1B', min: 1000000000, max: null }
]

/**
 * Build GraphQL query to fetch investment size distribution using aggregates
 * Uses multiple aliased aggregate queries to get counts for each size range
 */
const BUILD_INVESTMENT_SIZE_QUERY = (currency: string): string => {
  // Generate aggregate queries for each size range
  const aggregateQueries = SIZE_RANGES.map((range, index) => {
    const whereConditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${currency}" } }`,
      'totalInvestmentAmount: { _isNull: false }'
    ]

    // Add range conditions
    if (range.max === null) {
      // Last range: > 1B
      whereConditions.push(`totalInvestmentAmount: { _gte: ${range.min} }`)
    } else {
      // All other ranges: min <= amount < max
      whereConditions.push(`totalInvestmentAmount: { _gte: ${range.min}, _lt: ${range.max} }`)
    }

    return `
      range_${index}: InvestmentAggregate(
        where: {
          _and: [
            { ${whereConditions.join(' },\n            { ')} }
          ]
        }
      ) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
          }
        }
      }`
  }).join('\n\n')

  // Also get total count for percentage calculation
  const totalQuery = `
      total: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { totalInvestmentAmount: { _isNull: false } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }`

  return `
    query GetInvestmentSizeDistribution {
      ${aggregateQueries}

      ${totalQuery}
    }
  `
}

interface AggregateResult {
  aggregate: {
    count: number
    sum?: {
      totalInvestmentAmount: number | null
    }
  }
}

interface InvestmentSizeQueryResult {
  range_0: AggregateResult
  range_1: AggregateResult
  range_2: AggregateResult
  range_3: AggregateResult
  range_4: AggregateResult
  total: AggregateResult
}

/**
 * Hook to fetch investment size distribution data using server-side aggregates
 */
export const useGetInvestmentSizeData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentSizeData = useCallback(
    async (currency: string): Promise<InvestmentSizeRangeData[]> => {
      const query = BUILD_INVESTMENT_SIZE_QUERY(currency)
      const result = await graphqlClient.request<InvestmentSizeQueryResult>(query)

      // Get total count for percentage calculation
      const totalCount = result.total.aggregate.count

      if (totalCount === 0) {
        return []
      }

      // Transform aggregate results into chart data
      const sizeData: InvestmentSizeRangeData[] = SIZE_RANGES.map((range, index) => {
        const rangeKey = `range_${index}` as keyof InvestmentSizeQueryResult
        const aggregateData = result[rangeKey]
        const count = aggregateData.aggregate.count
        const totalAmount = aggregateData.aggregate.sum?.totalInvestmentAmount || 0

        return {
          range: range.label,
          minValue: range.min,
          maxValue: range.max,
          count,
          totalAmount,
          percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
        }
      })

      return sizeData
    },
    [graphqlClient]
  )

  return { fetchInvestmentSizeData }
}
