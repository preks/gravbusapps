import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface YearlyPerformanceData {
  year: string
  investmentCount: number
  totalInvestmentAmount: number
  totalMarketValue: number
  cumulativeInvestments: number
  cumulativeTotalInvested: number
}

export interface YearlyValueData {
  year: string
  totalInvestmentAmount: number
  totalMarketValue: number
}

/**
 * Get the last N years including current year
 */
const getLastNYears = (n: number): string[] => {
  const currentYear = new Date().getFullYear()
  const years: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    years.push((currentYear - i).toString())
  }
  return years
}

/**
 * Build aggregate query for Performance Timeline chart (last 5 years)
 * Only fetches count and totalInvestmentAmount (optimized - no investmentMarketValue)
 * @param currency - Currency code to filter by
 * @param years - Array of years to query
 * @param queryName - Query name for identification
 */
const BUILD_PERFORMANCE_TIMELINE_QUERY = (currency: string, years: string[], queryName: string): string => {
  // Create aliases for each year
  const yearAliases = years
    .map(year => {
      const alias = `year_${year}`
      const startDate = `${year}-01-01`
      const endDate = `${Number.parseInt(year) + 1}-01-01`

      return `
      ${alias}: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { acquisitionDate: { _gte: "${startDate}", _lt: "${endDate}" } }
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
    })
    .join('\n')

  return `
    query ${queryName} {
      ${yearAliases}
    }
  `
}

/**
 * Build aggregate query for Value Trends chart (last 5 years)
 * Only fetches sum fields (optimized - no count needed)
 * @param currency - Currency code to filter by
 * @param years - Array of years to query
 * @param queryName - Query name for identification
 */
const BUILD_VALUE_TRENDS_QUERY = (currency: string, years: string[], queryName: string): string => {
  // Create aliases for each year
  const yearAliases = years
    .map(year => {
      const alias = `year_${year}`
      const startDate = `${year}-01-01`
      const endDate = `${Number.parseInt(year) + 1}-01-01`

      return `
      ${alias}: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { acquisitionDate: { _gte: "${startDate}", _lt: "${endDate}" } }
          ]
        }
      ) {
        aggregate {
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }`
    })
    .join('\n')

  return `
    query ${queryName} {
      ${yearAliases}
    }
  `
}

/**
 * Parse aggregate response for Performance Timeline (with count)
 */
const parsePerformanceAggregateResponse = (data: any, years: string[]): YearlyPerformanceData[] => {
  const yearlyData: YearlyPerformanceData[] = []

  // Extract data from aliases in chronological order
  for (const year of years) {
    const key = `year_${year}`
    if (data[key]) {
      const aggregate = data[key].aggregate
      const count = aggregate.count || 0
      const totalInvestmentAmount = aggregate.sum?.totalInvestmentAmount || 0

      yearlyData.push({
        year,
        investmentCount: count,
        totalInvestmentAmount,
        totalMarketValue: 0, // Not fetched (optimization)
        cumulativeInvestments: 0, // Will calculate after
        cumulativeTotalInvested: 0 // Will calculate after
      })
    }
  }

  // Calculate cumulative values
  let cumulativeCount = 0
  let cumulativeAmount = 0
  for (const item of yearlyData) {
    cumulativeCount += item.investmentCount
    cumulativeAmount += item.totalInvestmentAmount
    item.cumulativeInvestments = cumulativeCount
    item.cumulativeTotalInvested = cumulativeAmount
  }

  return yearlyData
}

/**
 * Parse aggregate response for Value Trends (with both sum fields, no count)
 */
const parseValueTrendsAggregateResponse = (data: any, years: string[]): YearlyValueData[] => {
  const yearlyData: YearlyValueData[] = []

  // Extract data from aliases in chronological order
  for (const year of years) {
    const key = `year_${year}`
    if (data[key]) {
      const aggregate = data[key].aggregate
      const totalInvestmentAmount = aggregate.sum?.totalInvestmentAmount || 0
      const totalMarketValue = aggregate.sum?.investmentMarketValue || 0

      yearlyData.push({
        year,
        totalInvestmentAmount,
        totalMarketValue
      })
    }
  }

  return yearlyData
}

/**
 * Fetch timeline data based on chart type
 * Uses optimized queries that only fetch required fields
 */
export const fetchLiquidFundTimelineData = async (
  graphqlClient: any,
  currency: string,
  queryName: string,
  isPerformanceChart: boolean
): Promise<{ performanceData: YearlyPerformanceData[]; valueTrendsData: YearlyValueData[] }> => {
  // Get last 5 years including current year
  const years = getLastNYears(5)

  if (isPerformanceChart) {
    // Performance Timeline: Fetch count + totalInvestmentAmount only
    const query = BUILD_PERFORMANCE_TIMELINE_QUERY(currency, years, queryName)

    const result = await graphqlClient.request(query)

    const performanceData = parsePerformanceAggregateResponse(result, years)
    // For performance chart, we don't need value trends data
    const valueTrendsData: YearlyValueData[] = []

    return { performanceData, valueTrendsData }
  } else {
    // Value Trends: Fetch sum fields only (no count)
    const query = BUILD_VALUE_TRENDS_QUERY(currency, years, queryName)

    const result = await graphqlClient.request(query)

    const valueTrendsData = parseValueTrendsAggregateResponse(result, years)
    // For value trends chart, we don't need performance data
    const performanceData: YearlyPerformanceData[] = []

    return { performanceData, valueTrendsData }
  }
}

/**
 * Hook to use Liquid Fund Timeline aggregate queries
 * Uses optimized queries based on chart type
 */
export const useGetLiquidFundTimelineAggregate = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTimelineData = useCallback(
    async (currency: string, queryName: string) => {
      // Determine chart type from query name
      const isPerformanceChart = queryName.includes('Performance')

      return await fetchLiquidFundTimelineData(graphqlClient, currency, queryName, isPerformanceChart)
    },
    [graphqlClient]
  )

  return { fetchTimelineData }
}
