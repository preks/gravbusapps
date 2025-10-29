import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'

export interface InvestmentDurationRangeData {
  range: string
  minYears: number
  maxYears: number | null
  count: number
  percentage?: number
}

/**
 * Fixed investment duration ranges (in years)
 * Using fixed intervals for consistent comparison
 */
const DURATION_RANGES = [
  { label: '<1y', minYears: 0, maxYears: 1 },
  { label: '1-3y', minYears: 1, maxYears: 3 },
  { label: '3-5y', minYears: 3, maxYears: 5 },
  { label: '5-10y', minYears: 5, maxYears: 10 },
  { label: '>10y', minYears: 10, maxYears: null }
]

/**
 * Build GraphQL query to fetch investment duration distribution using aggregates
 * Uses multiple aliased aggregate queries to get counts for each duration range
 */
const BUILD_INVESTMENT_DURATION_QUERY = (currency: string): string => {
  const today = dayjs()

  // Generate aggregate queries for each duration range
  const aggregateQueries = DURATION_RANGES.map((range, index) => {
    const whereConditions = [
      'isDeleted: { _eq: false }',
      'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
      `currency: { code: { _eq: "${currency}" } }`,
      'acquisitionDate: { _isNull: false }'
    ]

    // Calculate date thresholds
    if (range.maxYears === null) {
      // Last range: > 10 years (acquisitionDate before 10 years ago)
      const dateThreshold = today.subtract(range.minYears, 'year').format('YYYY-MM-DD')
      whereConditions.push(`acquisitionDate: { _lt: "${dateThreshold}" }`)
    } else {
      // All other ranges: between min and max years
      const minDateThreshold = today.subtract(range.maxYears, 'year').format('YYYY-MM-DD')
      const maxDateThreshold = today.subtract(range.minYears, 'year').format('YYYY-MM-DD')
      whereConditions.push(`acquisitionDate: { _gte: "${minDateThreshold}", _lt: "${maxDateThreshold}" }`)
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
            { acquisitionDate: { _isNull: false } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }`

  return `
    query GetInvestmentDurationDistribution {
      ${aggregateQueries}

      ${totalQuery}
    }
  `
}

interface AggregateResult {
  aggregate: {
    count: number
  }
}

interface InvestmentDurationQueryResult {
  range_0: AggregateResult
  range_1: AggregateResult
  range_2: AggregateResult
  range_3: AggregateResult
  range_4: AggregateResult
  total: AggregateResult
}

/**
 * Hook to fetch investment duration distribution data using server-side aggregates
 */
export const useGetInvestmentDurationData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentDurationData = useCallback(
    async (currency: string): Promise<InvestmentDurationRangeData[]> => {
      const query = BUILD_INVESTMENT_DURATION_QUERY(currency)
      const result = await graphqlClient.request<InvestmentDurationQueryResult>(query)

      // Get total count for percentage calculation
      const totalCount = result.total.aggregate.count

      if (totalCount === 0) {
        return []
      }

      // Transform aggregate results into chart data
      const durationData: InvestmentDurationRangeData[] = DURATION_RANGES.map((range, index) => {
        const rangeKey = `range_${index}` as keyof InvestmentDurationQueryResult
        const aggregateData = result[rangeKey]
        const count = aggregateData.aggregate.count

        return {
          range: range.label,
          minYears: range.minYears,
          maxYears: range.maxYears,
          count,
          percentage: totalCount > 0 ? (count / totalCount) * 100 : 0
        }
      })

      return durationData
    },
    [graphqlClient]
  )

  return { fetchInvestmentDurationData }
}
