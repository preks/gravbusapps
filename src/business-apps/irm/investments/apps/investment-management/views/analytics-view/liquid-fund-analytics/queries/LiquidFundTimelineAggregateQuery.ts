import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import dayjs from 'dayjs'

export interface MonthlyPerformanceData {
  month: string
  investmentCount: number
  totalInvestmentAmount: number
  totalMarketValue: number
  cumulativeInvestments: number
  cumulativeTotalInvested: number
}

export interface MonthlyValueData {
  date: string
  totalInvestmentAmount: number
  totalMarketValue: number
}

/**
 * Build aggregate query for Performance Timeline chart (last 5 years)
 * Only fetches count and totalInvestmentAmount (optimized - no investmentMarketValue)
 * @param currency - Currency code to filter by
 * @param years - Array of years to query
 * @param queryName - Query name for identification
 */
const BUILD_PERFORMANCE_TIMELINE_QUERY = (currency: string, years: string[], queryName: string): string => {
  // Create aliases for each year-month combination
  const monthAliases = years
    .flatMap(year =>
      Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, '0')
        const yearMonth = `${year}-${month}`
        const alias = `month_${year}_${month}`
        const startDate = `${yearMonth}-01`
        const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')

        return `
      ${alias}: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { acquisitionDate: { _gte: "${startDate}", _lte: "${endDate}" } }
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
    )
    .join('\n')

  return `
    query ${queryName} {
      ${monthAliases}
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
  // Create aliases for each year-month combination
  const monthAliases = years
    .flatMap(year =>
      Array.from({ length: 12 }, (_, i) => {
        const month = String(i + 1).padStart(2, '0')
        const yearMonth = `${year}-${month}`
        const alias = `month_${year}_${month}`
        const startDate = `${yearMonth}-01`
        const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')

        return `
      ${alias}: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:LIQUID_FUND" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { acquisitionDate: { _gte: "${startDate}", _lte: "${endDate}" } }
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
    )
    .join('\n')

  return `
    query ${queryName} {
      ${monthAliases}
    }
  `
}

/**
 * Parse aggregate response for Performance Timeline (with count)
 */
const parsePerformanceAggregateResponse = (data: any): MonthlyPerformanceData[] => {
  const monthlyData: MonthlyPerformanceData[] = []

  // Extract data from aliases
  Object.keys(data).forEach(key => {
    if (key.startsWith('month_')) {
      const parts = key.split('_')
      const year = parts[1]
      const month = parts[2]
      const yearMonth = `${year}-${month}`

      const aggregate = data[key].aggregate
      const count = aggregate.count || 0
      const totalInvestmentAmount = aggregate.sum?.totalInvestmentAmount || 0

      // Only include months with data
      if (count > 0 || totalInvestmentAmount > 0) {
        monthlyData.push({
          month: yearMonth,
          investmentCount: count,
          totalInvestmentAmount,
          totalMarketValue: 0, // Not fetched (optimization)
          cumulativeInvestments: 0, // Will calculate after
          cumulativeTotalInvested: 0 // Will calculate after
        })
      }
    }
  })

  // Sort by month
  monthlyData.sort((a, b) => a.month.localeCompare(b.month))

  // Calculate cumulative values
  let cumulativeCount = 0
  let cumulativeAmount = 0
  monthlyData.forEach(item => {
    cumulativeCount += item.investmentCount
    cumulativeAmount += item.totalInvestmentAmount
    item.cumulativeInvestments = cumulativeCount
    item.cumulativeTotalInvested = cumulativeAmount
  })

  console.log('📈 Parsed performance data:', { months: monthlyData.length })
  return monthlyData
}

/**
 * Parse aggregate response for Value Trends (with both sum fields, no count)
 */
const parseValueTrendsAggregateResponse = (data: any): MonthlyValueData[] => {
  const monthlyData: MonthlyValueData[] = []

  // Extract data from aliases
  Object.keys(data).forEach(key => {
    if (key.startsWith('month_')) {
      const parts = key.split('_')
      const year = parts[1]
      const month = parts[2]
      const yearMonth = `${year}-${month}`

      const aggregate = data[key].aggregate
      const totalInvestmentAmount = aggregate.sum?.totalInvestmentAmount || 0
      const totalMarketValue = aggregate.sum?.investmentMarketValue || 0

      // Only include months with data
      if (totalInvestmentAmount > 0 || totalMarketValue > 0) {
        monthlyData.push({
          date: yearMonth,
          totalInvestmentAmount,
          totalMarketValue
        })
      }
    }
  })

  // Sort by date
  monthlyData.sort((a, b) => a.date.localeCompare(b.date))

  console.log('📈 Parsed value trends data:', { months: monthlyData.length })
  return monthlyData
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
): Promise<{ performanceData: MonthlyPerformanceData[]; valueTrendsData: MonthlyValueData[] }> => {
  console.log('🚀 Fetching liquid fund timeline data...', { currency, queryName, isPerformanceChart })

  // Get last 5 years
  const currentYear = dayjs().year()
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - 4 + i))

  try {
    if (isPerformanceChart) {
      // Performance Timeline: Fetch count + totalInvestmentAmount only
      const query = BUILD_PERFORMANCE_TIMELINE_QUERY(currency, years, queryName)
      console.log('📊 Executing performance timeline query (optimized: count + totalInvestmentAmount)...')

      const result = await graphqlClient.request(query)
      console.log('✅ Performance timeline data received')

      const performanceData = parsePerformanceAggregateResponse(result)
      // For performance chart, we don't need value trends data
      const valueTrendsData: MonthlyValueData[] = []

      return { performanceData, valueTrendsData }
    } else {
      // Value Trends: Fetch sum fields only (no count)
      const query = BUILD_VALUE_TRENDS_QUERY(currency, years, queryName)
      console.log('📊 Executing value trends query (optimized: sum fields only)...')

      const result = await graphqlClient.request(query)
      console.log('✅ Value trends data received')

      const valueTrendsData = parseValueTrendsAggregateResponse(result)
      // For value trends chart, we don't need performance data
      const performanceData: MonthlyPerformanceData[] = []

      return { performanceData, valueTrendsData }
    }
  } catch (error) {
    console.error('❌ Error fetching timeline data:', error)
    throw error
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
