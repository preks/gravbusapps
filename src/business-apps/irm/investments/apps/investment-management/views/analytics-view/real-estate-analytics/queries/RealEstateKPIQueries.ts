import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface RealEstateKPIData {
  totalInvestments: number
  totalAmountInvested: number
  totalMarketValue: number
  averageOccupancyRate: number
}

export interface RealEstateKPIComparison {
  current: RealEstateKPIData
  previous: RealEstateKPIData
}

const GET_REAL_ESTATE_KPIS_WITH_COMPARISON = (comparisonDate: string, currencyFilter?: string): string => {
  // Currency filter condition
  const currencyCondition = currencyFilter ? `{ currency: { code: { _eq: "${currencyFilter}" } } }` : ''

  return `
    query GetRealEstateKPIsWithComparison {
      # Current data (real estate investments only)
      currentAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { realEstateInvestment: {} }
            ${currencyCondition}
          ]
        }
      ) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Current average occupancy rate from real estate table (exclude nulls, include zeros)
      currentRealEstateAggregate: RealEstateInvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { occupancyPercent: { _gte: 0 } }
            { investment: { isDeleted: { _eq: false } } }
          ]
        }
      ) {
        aggregate {
          avg {
            occupancyPercent
          }
          count
        }
      }
      
      # Previous period data (real estate investments existing 91 days ago)
      previousAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
            { realEstateInvestment: {} }
            ${currencyCondition}
          ]
        }
      ) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Previous average occupancy rate from real estate table (exclude nulls, include zeros)
      previousRealEstateAggregate: RealEstateInvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { occupancyPercent: { _gte: 0 } }
            { createdAt: { _lte: "${comparisonDate}" } }
            { investment: { isDeleted: { _eq: false } } }
          ]
        }
      ) {
        aggregate {
          avg {
            occupancyPercent
          }
          count
        }
      }
    }
  `
}

export interface RealEstateKPIResponse {
  currentAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number | null
        investmentMarketValue: number | null
      }
    }
  }
  currentRealEstateAggregate: {
    aggregate: {
      avg: {
        occupancyPercent: number | null
      }
      count: number
    }
  }
  previousAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number | null
        investmentMarketValue: number | null
      }
    }
  }
  previousRealEstateAggregate: {
    aggregate: {
      avg: {
        occupancyPercent: number | null
      }
      count: number
    }
  }
}

export const useGetRealEstateKPIs = (context: BusinessAppContextProps, currency?: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRealEstateKPIs = useCallback(async (): Promise<RealEstateKPIComparison> => {
    // Calculate date 91 days ago for comparison
    const quarterAgo = new Date()
    quarterAgo.setDate(quarterAgo.getDate() - 91)
    const comparisonDate = quarterAgo.toISOString()

    const query = GET_REAL_ESTATE_KPIS_WITH_COMPARISON(comparisonDate, currency)
    try {
      const result = await graphqlClient.request<RealEstateKPIResponse>(query)

      // Transform current data
      const currentCount = result.currentAggregate.aggregate.count
      const currentTotalAmount = result.currentAggregate.aggregate.sum.totalInvestmentAmount || 0
      const currentMarketValue = result.currentAggregate.aggregate.sum.investmentMarketValue || 0
      const currentAvgOccupancy = result.currentRealEstateAggregate.aggregate.avg.occupancyPercent || 0

      const current: RealEstateKPIData = {
        totalInvestments: currentCount,
        totalAmountInvested: currentTotalAmount,
        totalMarketValue: currentMarketValue,
        averageOccupancyRate: currentAvgOccupancy
      }

      // Use actual historical data
      const previousCount = result.previousAggregate.aggregate.count
      const previousTotalAmount = result.previousAggregate.aggregate.sum.totalInvestmentAmount || 0
      const previousMarketValue = result.previousAggregate.aggregate.sum.investmentMarketValue || 0
      const previousAvgOccupancy = result.previousRealEstateAggregate.aggregate.avg.occupancyPercent || 0

      const previous: RealEstateKPIData = {
        totalInvestments: previousCount,
        totalAmountInvested: previousTotalAmount,
        totalMarketValue: previousMarketValue,
        averageOccupancyRate: previousAvgOccupancy
      }

      return { current, previous }
    } catch (error) {
      console.error('Error fetching real estate KPIs:', error)
      throw error
    }
  }, [graphqlClient, currency])

  return { fetchRealEstateKPIs }
}
