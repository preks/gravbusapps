import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface OccupancyDistributionData {
  range: string
  count: number
  totalValue: number
}

/**
 * Occupancy rate ranges for distribution
 */
export const OCCUPANCY_RANGES = [
  { label: '0-20%', min: 0, max: 20 },
  { label: '21-40%', min: 21, max: 40 },
  { label: '41-60%', min: 41, max: 60 },
  { label: '61-80%', min: 61, max: 80 },
  { label: '81-100%', min: 81, max: 100 }
]

/**
 * Build query for Occupancy Distribution
 * Fetches investments with occupancy rates and market values for grouping
 */
const BUILD_OCCUPANCY_DISTRIBUTION_QUERY = (currency: string): string => {
  return `
    query GetOccupancyDistribution {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { realEstateInvestment: {} }
            { currency: { code: { _eq: "${currency}" } } }
          ]
        }
      ) {
        id
        investmentMarketValue
        realEstateInvestment {
          occupancyPercent
        }
      }
    }
  `
}

/**
 * Parse occupancy distribution response and group by ranges
 */
const parseOccupancyDistributionResponse = (data: any): OccupancyDistributionData[] => {
  if (!data.Investment || !Array.isArray(data.Investment)) {
    return OCCUPANCY_RANGES.map(range => ({
      range: range.label,
      count: 0,
      totalValue: 0
    }))
  }

  // Initialize range map
  const rangeMap = new Map<string, { count: number; totalValue: number }>()
  for (const range of OCCUPANCY_RANGES) {
    rangeMap.set(range.label, { count: 0, totalValue: 0 })
  }

  // Group investments by occupancy ranges
  for (const inv of data.Investment) {
    const occupancyRate = inv.realEstateInvestment?.[0]?.occupancyPercent || 0
    const marketValue = inv.investmentMarketValue || 0

    const matchingRange = OCCUPANCY_RANGES.find(r => occupancyRate >= r.min && occupancyRate <= r.max)

    if (matchingRange) {
      const entry = rangeMap.get(matchingRange.label)
      if (entry) {
        entry.count += 1
        entry.totalValue += marketValue
      }
    }
  }

  // Convert to array
  const distributionData: OccupancyDistributionData[] = OCCUPANCY_RANGES.map(range => ({
    range: range.label,
    count: rangeMap.get(range.label)?.count || 0,
    totalValue: rangeMap.get(range.label)?.totalValue || 0
  }))

  return distributionData
}

/**
 * Fetch occupancy distribution data
 */
export const fetchOccupancyDistribution = async (
  graphqlClient: any,
  currency: string
): Promise<OccupancyDistributionData[]> => {
  const query = BUILD_OCCUPANCY_DISTRIBUTION_QUERY(currency)

  const result = await graphqlClient.request(query)

  return parseOccupancyDistributionResponse(result)
}

/**
 * Hook to fetch occupancy distribution
 */
export const useGetOccupancyDistribution = (context: BusinessAppContextProps, currency: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchData = useCallback(async (): Promise<OccupancyDistributionData[]> => {
    return await fetchOccupancyDistribution(graphqlClient, currency)
  }, [graphqlClient, currency])

  return { fetchData }
}
