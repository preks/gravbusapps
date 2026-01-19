import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LiquidFundKPIData {
  totalInvestments: number
  totalAmountInvested: number
  averageInvestmentValue: number
  activeInvestments: number
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
          }
        }
      }
      
      # Current active investments count
      currentActiveAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { liquidFundInvestment: {} }
            { investmentStatus: { value: { _eq: "Active" } } }
            ${currencyCondition}
          ]
        }
      ) {
        aggregate {
          count
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
          }
        }
      }
      
      # Previous active investments count
      previousActiveAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
            { liquidFundInvestment: {} }
            { investmentStatus: { value: { _eq: "Active" } } }
            ${currencyCondition}
          ]
        }
      ) {
        aggregate {
          count
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
      }
    }
  }
  currentActiveAggregate: {
    aggregate: {
      count: number
    }
  }
  previousAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number | null
      }
    }
  }
  previousActiveAggregate: {
    aggregate: {
      count: number
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
    const currentActiveCount = result.currentActiveAggregate.aggregate.count

    const current: LiquidFundKPIData = {
      totalInvestments: currentCount,
      totalAmountInvested: currentTotalAmount,
      averageInvestmentValue: currentCount > 0 ? currentTotalAmount / currentCount : 0,
      activeInvestments: currentActiveCount
    }

    // Use actual historical data
    const previousCount = result.previousAggregate.aggregate.count
    const previousTotalAmount = result.previousAggregate.aggregate.sum.totalInvestmentAmount || 0
    const previousActiveCount = result.previousActiveAggregate.aggregate.count

    const previous: LiquidFundKPIData = {
      totalInvestments: previousCount,
      totalAmountInvested: previousTotalAmount,
      averageInvestmentValue: previousCount > 0 ? previousTotalAmount / previousCount : 0,
      activeInvestments: previousActiveCount
    }

    return { current, previous }
  }, [graphqlClient, currency])

  return { fetchLiquidFundKPIs }
}
