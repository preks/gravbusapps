import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface YearlyTimelineData {
  year: string
  investmentCount: number
  totalInvestmentAmount: number
  cumulativeInvestments: number
  cumulativeTotalInvested: number
}

export interface YearlyPerformanceData {
  year: string
  totalPropertyValue: number
  averageOccupancyRate: number
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
 * Build aggregate query for Timeline data (last 5 years)
 * Fetches count and totalInvestmentAmount for real estate investments
 */
const BUILD_TIMELINE_QUERY = (currency: string, years: string[], queryName: string): string => {
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
            { realEstateInvestment: {} }
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
 * Build aggregate query for Performance data (last 5 years)
 * Fetches property values and occupancy rates
 */
const BUILD_PERFORMANCE_QUERY = (currency: string, years: string[], queryName: string): string => {
  // Create aliases for each year to get property values
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
            { realEstateInvestment: {} }
            { currency: { code: { _eq: "${currency}" } } }
            { acquisitionDate: { _gte: "${startDate}", _lt: "${endDate}" } }
          ]
        }
      ) {
        aggregate {
          count
          sum {
            investmentMarketValue
          }
        }
      }
      
      ${alias}_occupancy: RealEstateInvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { occupancyPercent: { _gte: 0 } }
            { investment: { 
              isDeleted: { _eq: false }
              currency: { code: { _eq: "${currency}" } }
              acquisitionDate: { _gte: "${startDate}", _lt: "${endDate}" }
            } }
          ]
        }
      ) {
        aggregate {
          avg {
            occupancyPercent
          }
          count
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
 * Parse timeline aggregate response
 */
const parseTimelineAggregateResponse = (data: any, years: string[]): YearlyTimelineData[] => {
  const yearlyData: YearlyTimelineData[] = []

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
 * Parse performance aggregate response
 */
const parsePerformanceAggregateResponse = (data: any, years: string[]): YearlyPerformanceData[] => {
  const yearlyData: YearlyPerformanceData[] = []

  // Extract data from aliases in chronological order
  for (const year of years) {
    const investmentKey = `year_${year}`
    const occupancyKey = `year_${year}_occupancy`

    if (data[investmentKey] && data[occupancyKey]) {
      const investmentAggregate = data[investmentKey].aggregate
      const occupancyAggregate = data[occupancyKey].aggregate

      const totalPropertyValue = investmentAggregate.sum?.investmentMarketValue || 0
      const averageOccupancyRate = occupancyAggregate.avg?.occupancyPercent || 0

      yearlyData.push({
        year,
        totalPropertyValue,
        averageOccupancyRate
      })
    }
  }

  return yearlyData
}

/**
 * Fetch timeline data based on chart type
 */
export const fetchRealEstateTimelineData = async (
  graphqlClient: any,
  currency: string,
  queryName: string,
  isTimelineChart: boolean
): Promise<{ timelineData: YearlyTimelineData[]; performanceData: YearlyPerformanceData[] }> => {
  // Get last 5 years including current year
  const years = getLastNYears(5)

  if (isTimelineChart) {
    // Timeline: Fetch count + totalInvestmentAmount
    const query = BUILD_TIMELINE_QUERY(currency, years, queryName)

    const result = await graphqlClient.request(query)

    const timelineData = parseTimelineAggregateResponse(result, years)
    const performanceData: YearlyPerformanceData[] = []

    return { timelineData, performanceData }
  } else {
    // Performance: Fetch property values and occupancy rates
    const query = BUILD_PERFORMANCE_QUERY(currency, years, queryName)

    const result = await graphqlClient.request(query)

    const performanceData = parsePerformanceAggregateResponse(result, years)
    const timelineData: YearlyTimelineData[] = []

    return { timelineData, performanceData }
  }
}

/**
 * Hook to use Real Estate Timeline aggregate queries
 */
export const useGetRealEstateTimelineAggregate = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTimelineData = useCallback(
    async (currency: string, queryName: string) => {
      // Determine chart type from query name
      const isTimelineChart = queryName.includes('Timeline')

      return await fetchRealEstateTimelineData(graphqlClient, currency, queryName, isTimelineChart)
    },
    [graphqlClient]
  )

  return { fetchTimelineData }
}
