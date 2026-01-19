import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface PortfolioKPIData {
  totalPortfolioValue: number
  totalInvestments: number
  totalAmountInvested: number
  activeInvestments: number
  averageInvestmentValue: number // Calculated from aggregates
  averageMarketValue: number // Calculated from aggregates
}

export interface PortfolioKPIComparison {
  current: PortfolioKPIData
  previous: PortfolioKPIData
}

export const GET_PORTFOLIO_KPIS_WITH_COMPARISON = (comparisonDate: string, currencyCode?: string): string => {
  // Build currency filter if provided
  const currencyFilter = currencyCode ? `currency: { code: { _eq: "${currencyCode}" } }` : ''

  return `
    query GetPortfolioKPIsWithComparison {
      # Current data (all investments - no date filter)
      currentAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            ${currencyFilter ? `{ ${currencyFilter} }` : ''}
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
      
      # Current active investments count
      currentActiveAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentStatus: { value: { _eq: "Active" } } }
            ${currencyFilter ? `{ ${currencyFilter} }` : ''}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      
      # Previous period data (investments that existed 91 days ago)
      previousAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
            ${currencyFilter ? `{ ${currencyFilter} }` : ''}
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
      
      # Previous active investments count (investments that were active 91 days ago)
      previousActiveAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
            { investmentStatus: { value: { _eq: "Active" } } }
            ${currencyFilter ? `{ ${currencyFilter} }` : ''}
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

export interface PortfolioKPIResponse {
  currentAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number
        investmentMarketValue: number
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
        investmentMarketValue: number | null
      }
    }
  }
  previousActiveAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const useGetPortfolioKPIs = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchPortfolioKPIs = async (currencyCode?: string): Promise<PortfolioKPIComparison> => {
    // Calculate date 91 days ago for comparison
    const quarterAgo = new Date()
    quarterAgo.setDate(quarterAgo.getDate() - 91)
    const comparisonDate = quarterAgo.toISOString()

    const query = GET_PORTFOLIO_KPIS_WITH_COMPARISON(comparisonDate, currencyCode)
    try {
      const result = await graphqlClient.request<PortfolioKPIResponse>(query)

      // Transform current data
      const currentCount = result.currentAggregate.aggregate.count
      const currentTotalAmount = result.currentAggregate.aggregate.sum.totalInvestmentAmount || 0
      const currentMarketValue = result.currentAggregate.aggregate.sum.investmentMarketValue || 0

      const current: PortfolioKPIData = {
        totalPortfolioValue: currentMarketValue,
        totalInvestments: currentCount,
        totalAmountInvested: currentTotalAmount,
        activeInvestments: result.currentActiveAggregate.aggregate.count,
        // Calculate averages from aggregates (efficient!)
        averageInvestmentValue: currentCount > 0 ? currentTotalAmount / currentCount : 0,
        averageMarketValue: currentCount > 0 ? currentMarketValue / currentCount : 0
      }

      // Transform previous data (handle null values)
      const previousCount = result.previousAggregate.aggregate.count
      const previousTotalAmount = result.previousAggregate.aggregate.sum.totalInvestmentAmount || 0
      const previousMarketValue = result.previousAggregate.aggregate.sum.investmentMarketValue || 0

      const previous: PortfolioKPIData = {
        totalPortfolioValue: previousMarketValue,
        totalInvestments: previousCount,
        totalAmountInvested: previousTotalAmount,
        activeInvestments: result.previousActiveAggregate.aggregate.count,
        // Calculate averages from aggregates (efficient!)
        averageInvestmentValue: previousCount > 0 ? previousTotalAmount / previousCount : 0,
        averageMarketValue: previousCount > 0 ? previousMarketValue / previousCount : 0
      }

      return { current, previous }
    } catch (error) {
      console.error('Error fetching portfolio KPIs:', error)
      throw error
    }
  }

  return { fetchPortfolioKPIs }
}
