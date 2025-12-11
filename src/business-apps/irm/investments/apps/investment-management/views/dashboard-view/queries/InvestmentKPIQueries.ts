import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InvestmentKPIData {
  totalInvestments: number
  totalInvested: number
  averageStakePercentage: number
  totalMarketValue: number
}

export interface InvestmentKPIComparison {
  current: InvestmentKPIData
  previous: InvestmentKPIData
}

export const GET_INVESTMENT_KPIS_WITH_COMPARISON = (comparisonDate: string, currencyFilter?: string): string => {
  // Currency codes are stored exactly as "EUR", "USD", etc.
  // Use exact match for reliable filtering
  const currencyCondition = currencyFilter ? `{ currency: { code: { _eq: "${currencyFilter}" } } }` : ''

  return `
    query GetInvestmentKPIsWithComparison {
      # Current data (filtered by currency)
      currentAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
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
          avg {
            stakePercentage
          }
        }
      }
      
      # Previous period data (investments created before comparison date, filtered by currency)
      previousAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
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
          avg {
            stakePercentage
          }
        }
      }
      
      # Get recent investments for additional context
      recentInvestments: Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _gte: "${comparisonDate}" } }
            ${currencyCondition}
          ]
        }
        limit: 10
      ) {
        id
        name
        totalInvestmentAmount
        investmentMarketValue
        stakePercentage
        createdAt
      }
    }
  `
}

export interface InvestmentKPIResponse {
  currentAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number
        investmentMarketValue: number
      }
      avg: {
        stakePercentage: number
      }
    }
  }
  previousAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number | null
        investmentMarketValue: number | null
      }
      avg: {
        stakePercentage: number | null
      }
    }
  }
  recentInvestments: Array<{
    id: string
    name: string
    totalInvestmentAmount: number
    investmentMarketValue: number
    stakePercentage: number
    createdAt: string
  }>
}

export const useGetInvestmentKPIs = (context: BusinessAppContextProps, currency?: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentKPIs = useCallback(async (): Promise<InvestmentKPIComparison> => {
    // Calculate date 91 days ago for comparison (stable within this call)
    const quarterAgo = new Date()
    quarterAgo.setDate(quarterAgo.getDate() - 91)
    const comparisonDate = quarterAgo.toISOString()

    // Currency is already a code (e.g., "EUR", "USD") - use directly
    const query = GET_INVESTMENT_KPIS_WITH_COMPARISON(comparisonDate, currency)
    try {
      const result = await graphqlClient.request<InvestmentKPIResponse>(query)

      // Transform current data
      const current: InvestmentKPIData = {
        totalInvestments: result.currentAggregate.aggregate.count,
        totalInvested: result.currentAggregate.aggregate.sum.totalInvestmentAmount || 0,
        averageStakePercentage: result.currentAggregate.aggregate.avg.stakePercentage || 0,
        totalMarketValue: result.currentAggregate.aggregate.sum.investmentMarketValue || 0
      }

      // Transform previous data (handle null values)
      const previous: InvestmentKPIData = {
        totalInvestments: result.previousAggregate.aggregate.count,
        totalInvested: result.previousAggregate.aggregate.sum.totalInvestmentAmount || 0,
        averageStakePercentage: result.previousAggregate.aggregate.avg.stakePercentage || 0,
        totalMarketValue: result.previousAggregate.aggregate.sum.investmentMarketValue || 0
      }

      return { current, previous }
    } catch (error) {
      console.error('Error fetching investment KPIs:', error)
      throw error
    }
  }, [graphqlClient, currency])

  return { fetchInvestmentKPIs }
}
