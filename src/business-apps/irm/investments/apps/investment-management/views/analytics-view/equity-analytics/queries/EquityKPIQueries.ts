import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isValidDate } from '@/common/utils/dateFormatter'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'

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

interface EquityKPIQueryResult {
  query: string
  variables: Record<string, any>
}

const buildEquityKPIQuery = (
  comparisonDate: string,
  currencyFilter?: string,
  filters?: Record<string, any>
): EquityKPIQueryResult => {
  // Validate comparison date
  if (!isValidDate(comparisonDate)) {
    throw new Error('Invalid comparison date format')
  }

  const variables = { ...filters }

  // Build custom conditions for equity investment type and currency
  const customConditions: Record<string, any>[] = [{ equityInvestment: { id: { _isNull: false } } }]

  if (currencyFilter) {
    customConditions.push({ currency: { code: { _eq: currencyFilter } } })
  }

  // Build where clauses using standard buildWhere from common
  const currentWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions,
    isDeleted: true
  })

  const previousWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [...customConditions, { createdAt: { _lte: comparisonDate } }],
    isDeleted: true
  })

  const currentInvestmentsWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [...customConditions, { acquisitionDate: { _isNull: false } }],
    isDeleted: true
  })

  const previousInvestmentsWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [
      ...customConditions,
      { createdAt: { _lte: comparisonDate } },
      { acquisitionDate: { _isNull: false } }
    ],
    isDeleted: true
  })

  const query = `
    query GetEquityKPIsWithComparison(
      $currentWhere: InvestmentBoolExp,
      $previousWhere: InvestmentBoolExp,
      $currentInvestmentsWhere: InvestmentBoolExp,
      $previousInvestmentsWhere: InvestmentBoolExp
    ) {
      # Current data (equity investments only)
      currentAggregate: InvestmentAggregate(where: $currentWhere) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Current investments for duration calculation
      currentInvestments: Investment(where: $currentInvestmentsWhere, limit: 1000) {
        id
        acquisitionDate
      }
      
      # Previous period data
      previousAggregate: InvestmentAggregate(where: $previousWhere) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Previous investments for duration calculation
      previousInvestments: Investment(where: $previousInvestmentsWhere, limit: 1000) {
        id
        acquisitionDate
      }
    }
  `

  return {
    query,
    variables: {
      currentWhere,
      previousWhere,
      currentInvestmentsWhere,
      previousInvestmentsWhere
    }
  }
}

/**
 * Calculate Portfolio MOIC from aggregate data
 */
const calculatePortfolioMoic = (marketValue: number | null, totalInvestment: number | null): number => {
  const MOIC_FALLBACK = 0

  if (!totalInvestment || totalInvestment === 0) return MOIC_FALLBACK
  if (!marketValue) return MOIC_FALLBACK

  return marketValue / totalInvestment
}

/**
 * Calculate Average Investment Duration in days
 */
const calculateAverageDuration = (investments: Array<{ acquisitionDate?: string | null }>): number => {
  const DURATION_FALLBACK = 0

  if (!investments || investments.length === 0) return DURATION_FALLBACK

  const currentDate = new Date()
  let totalDays = 0
  let validCount = 0

  for (const investment of investments) {
    if (investment.acquisitionDate) {
      const acquisitionDate = new Date(investment.acquisitionDate)
      if (!Number.isNaN(acquisitionDate.getTime())) {
        const durationMs = currentDate.getTime() - acquisitionDate.getTime()
        const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24))
        totalDays += durationDays
        validCount++
      }
    }
  }

  if (validCount === 0) return DURATION_FALLBACK
  return Math.floor(totalDays / validCount)
}

/**
 * Hook to fetch equity KPI data with period comparison
 * Uses standard descriptor-based filtering from common
 */
export const useGetEquityKPIs = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEquityKPIs = useCallback(
    async (
      comparisonDate: string,
      currencyFilter?: string,
      filters?: Record<string, any>
    ): Promise<EquityKPIComparison> => {
      if (!context.accessToken) {
        throw new Error('[useGetEquityKPIs] Access token is required')
      }

      const { query, variables } = buildEquityKPIQuery(comparisonDate, currencyFilter, filters)

      try {
        const result = await graphqlClient.request<any>(query, variables)

        // Process current KPIs
        const currentData: EquityKPIData = {
          totalInvestments: result.currentAggregate.aggregate.count || 0,
          totalAmountInvested: result.currentAggregate.aggregate.sum?.totalInvestmentAmount || 0,
          portfolioMoic: calculatePortfolioMoic(
            result.currentAggregate.aggregate.sum?.investmentMarketValue,
            result.currentAggregate.aggregate.sum?.totalInvestmentAmount
          ),
          averageDuration: calculateAverageDuration(result.currentInvestments)
        }

        // Process previous KPIs
        const previousData: EquityKPIData = {
          totalInvestments: result.previousAggregate.aggregate.count || 0,
          totalAmountInvested: result.previousAggregate.aggregate.sum?.totalInvestmentAmount || 0,
          portfolioMoic: calculatePortfolioMoic(
            result.previousAggregate.aggregate.sum?.investmentMarketValue,
            result.previousAggregate.aggregate.sum?.totalInvestmentAmount
          ),
          averageDuration: calculateAverageDuration(result.previousInvestments)
        }

        return {
          current: currentData,
          previous: previousData
        }
      } catch (error) {
        console.error('[useGetEquityKPIs] Error fetching equity KPIs:', error)
        throw error
      }
    },
    [context.accessToken, graphqlClient]
  )

  return { fetchEquityKPIs }
}
