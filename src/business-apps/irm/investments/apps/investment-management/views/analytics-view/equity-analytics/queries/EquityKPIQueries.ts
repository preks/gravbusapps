import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EquityKPIData {
  totalInvestments: number
  totalAmountInvested: number
  portfolioMoic: number
  averageDuration: number
}

export interface EquityKPIComparison {
  current: EquityKPIData
  previous: EquityKPIData
}

const GET_EQUITY_KPIS_WITH_COMPARISON = (comparisonDate: string, currencyFilter?: string): string => {
  // Currency codes are stored exactly as "EUR", "USD", etc.
  // Use exact match for reliable filtering
  const currencyCondition = currencyFilter ? `{ currency: { code: { _eq: "${currencyFilter}" } } }` : ''
  return `
    query GetEquityKPIsWithComparison {
      # Current data (equity investments only - filter by investment group, not specialization)
      currentAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
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
      
      # Current investments for duration calculation
      currentInvestments: Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { acquisitionDate: { _isNull: false } }
            ${currencyCondition}
          ]
        }
        limit: 1000
      ) {
        id
        acquisitionDate
        totalInvestmentAmount
        investmentMarketValue
      }
      
      # Previous period data (equity investments existing 91 days ago)
      previousAggregate: InvestmentAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
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
      
      # Previous investments for duration calculation
      previousInvestments: Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { createdAt: { _lte: "${comparisonDate}" } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { acquisitionDate: { _isNull: false } }
            ${currencyCondition}
          ]
        }
        limit: 1000
      ) {
        id
        acquisitionDate
        totalInvestmentAmount
        investmentMarketValue
      }
    }
  `
}

export interface EquityKPIResponse {
  currentAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number | null
        investmentMarketValue: number | null
      }
    }
  }
  currentInvestments: Array<{
    id: string
    acquisitionDate: string | null
    totalInvestmentAmount: number | null
    investmentMarketValue: number | null
  }>
  previousAggregate: {
    aggregate: {
      count: number
      sum: {
        totalInvestmentAmount: number | null
        investmentMarketValue: number | null
      }
    }
  }
  previousInvestments: Array<{
    id: string
    acquisitionDate: string | null
    totalInvestmentAmount: number | null
    investmentMarketValue: number | null
  }>
}

export const useGetEquityKPIs = (context: BusinessAppContextProps, currency?: string) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEquityKPIs = useCallback(async (): Promise<EquityKPIComparison> => {
    // Calculate date 91 days ago for comparison
    const quarterAgo = new Date()
    quarterAgo.setDate(quarterAgo.getDate() - 91)
    const comparisonDate = quarterAgo.toISOString()

    const query = GET_EQUITY_KPIS_WITH_COMPARISON(comparisonDate, currency)
    try {
      const result = await graphqlClient.request<EquityKPIResponse>(query)

      // Helper function to calculate average duration in days
      const calculateAverageDuration = (
        investments: Array<{
          id: string
          acquisitionDate: string | null
          totalInvestmentAmount: number | null
          investmentMarketValue: number | null
        }>
      ): number => {
        if (investments.length === 0) return 0

        const today = new Date()

        const durations = investments
          .filter(inv => inv.acquisitionDate) // Has acquisition date
          .map(inv => {
            const acquisitionDate = new Date(inv.acquisitionDate!)

            // Validate date is valid
            if (Number.isNaN(acquisitionDate.getTime())) {
              return null
            }

            const durationInMs = today.getTime() - acquisitionDate.getTime()
            const durationInDays = Math.floor(durationInMs / (1000 * 60 * 60 * 24))

            // Validate duration is reasonable (between 0 and 50 years)
            if (durationInDays < 0) {
              return null
            }
            if (durationInDays > 18250) {
              // 50 years
              return null
            }

            return durationInDays
          })
          .filter((duration): duration is number => duration !== null) // Remove invalid entries

        if (durations.length === 0) {
          return 0
        }

        const totalDuration = durations.reduce((sum, duration) => sum + duration, 0)
        const avgDuration = Math.round(totalDuration / durations.length) // Round to nearest day

        return avgDuration
      }

      // Helper function to calculate Portfolio MOIC from aggregate sums (weighted by investment size)
      const calculatePortfolioMoicFromAggregates = (
        totalMarketValue: number | null,
        totalInvestmentAmount: number | null
      ): number => {
        if (!totalInvestmentAmount || totalInvestmentAmount === 0) return 0
        if (!totalMarketValue) return 0
        return totalMarketValue / totalInvestmentAmount
      }

      // Transform current data
      const currentCount = result.currentAggregate.aggregate.count
      const currentTotalAmount = result.currentAggregate.aggregate.sum.totalInvestmentAmount || 0
      const currentTotalMarketValue = result.currentAggregate.aggregate.sum.investmentMarketValue || 0
      const currentPortfolioMoic = calculatePortfolioMoicFromAggregates(currentTotalMarketValue, currentTotalAmount)
      const currentAvgDuration = calculateAverageDuration(result.currentInvestments)

      const current: EquityKPIData = {
        totalInvestments: currentCount,
        totalAmountInvested: currentTotalAmount,
        portfolioMoic: currentPortfolioMoic,
        averageDuration: currentAvgDuration
      }

      // Use actual historical data
      const previousCount = result.previousAggregate.aggregate.count
      const previousTotalAmount = result.previousAggregate.aggregate.sum.totalInvestmentAmount || 0
      const previousTotalMarketValue = result.previousAggregate.aggregate.sum.investmentMarketValue || 0
      const previousPortfolioMoic = calculatePortfolioMoicFromAggregates(previousTotalMarketValue, previousTotalAmount)
      const previousAvgDuration = calculateAverageDuration(result.previousInvestments)

      const previous: EquityKPIData = {
        totalInvestments: previousCount,
        totalAmountInvested: previousTotalAmount,
        portfolioMoic: previousPortfolioMoic,
        averageDuration: previousAvgDuration
      }

      return { current, previous }
    } catch (error) {
      console.error('Error fetching equity KPIs:', error)
      throw error
    }
  }, [graphqlClient, currency])

  return { fetchEquityKPIs }
}
