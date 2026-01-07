import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LiquidFundKPIData {
  totalInvestments: number
  totalAmountInvested: number
  totalMarketValue: number
  averageInvestmentValue: number
  averageMarketValue: number
}

export interface LiquidFundKPIComparison {
  current: LiquidFundKPIData
  previous: LiquidFundKPIData
}

export const GET_LIQUID_FUND_KPIS_WITH_COMPARISON = (comparisonDate: string, currencyFilter?: string): string => {
  // Currency filter condition
  const currencyCondition = currencyFilter ? `{ currency: { code: { _eq: "${currencyFilter}" } } }` : ''

  return `
    query GetLiquidFundKPIsWithComparison {
      # Current data (all liquid fund investments)
      currentAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { liquidFundInvestment: {} }
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
      
      # Previous period data (liquid fund investments existing 91 days ago)
      previousAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
            { liquidFundInvestment: {} }
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
    }
  `
}

export interface LiquidFundKPIResponse {
  currentAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number | null
        investmentMarketValue: number | null
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
    }
  }
}

export const useGetLiquidFundKPIs = (context: BusinessAppContextProps, currency?: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLiquidFundKPIs = useCallback(async (): Promise<LiquidFundKPIComparison> => {
    // Calculate date 91 days ago for comparison
    const quarterAgo = new Date()
    quarterAgo.setDate(quarterAgo.getDate() - 91)
    const comparisonDate = quarterAgo.toISOString()

    const query = GET_LIQUID_FUND_KPIS_WITH_COMPARISON(comparisonDate, currency)
    const result = await graphqlClient.request<LiquidFundKPIResponse>(query)

    // Transform current data
    const currentCount = result.currentAggregate.aggregate.count
    const currentTotalAmount = result.currentAggregate.aggregate.sum.totalInvestmentAmount || 0
    const currentMarketValue = result.currentAggregate.aggregate.sum.investmentMarketValue || 0

    const current: LiquidFundKPIData = {
      totalInvestments: currentCount,
      totalAmountInvested: currentTotalAmount,
      totalMarketValue: currentMarketValue,
      averageInvestmentValue: currentCount > 0 ? currentTotalAmount / currentCount : 0,
      averageMarketValue: currentCount > 0 ? currentMarketValue / currentCount : 0
    }

    // Use actual historical data
    const previousCount = result.previousAggregate.aggregate.count
    const previousTotalAmount = result.previousAggregate.aggregate.sum.totalInvestmentAmount || 0
    const previousMarketValue = result.previousAggregate.aggregate.sum.investmentMarketValue || 0

    const previous: LiquidFundKPIData = {
      totalInvestments: previousCount,
      totalAmountInvested: previousTotalAmount,
      totalMarketValue: previousMarketValue,
      averageInvestmentValue: previousCount > 0 ? previousTotalAmount / previousCount : 0,
      averageMarketValue: previousCount > 0 ? previousMarketValue / previousCount : 0
    }

    return { current, previous }
  }, [graphqlClient, currency])

  return { fetchLiquidFundKPIs }
}
