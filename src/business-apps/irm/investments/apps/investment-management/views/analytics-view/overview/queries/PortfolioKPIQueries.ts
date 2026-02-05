import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isValidDate } from '@/common/utils/dateFormatter'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'

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

interface PortfolioKPIQueryResult {
  query: string
  variables: Record<string, any>
}

const buildPortfolioKPIQuery = (
  comparisonDate: string,
  currencyCode?: string,
  filters?: Record<string, any>
): PortfolioKPIQueryResult => {
  // Validate comparison date
  if (!isValidDate(comparisonDate)) {
    throw new Error('Invalid comparison date format')
  }

  const variables = { ...filters }

  // Build custom conditions for currency
  const customConditions: Record<string, any>[] = []

  if (currencyCode) {
    customConditions.push({ currency: { code: { _eq: currencyCode } } })
  }

  // Build where clauses using standard buildWhere from common
  // Note: investmentGroupIds is already handled by INVESTMENT_DESCRIPTORS
  const currentWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions,
    isDeleted: true
  })

  const currentActiveWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [...customConditions, { investmentStatus: { value: { _eq: 'Active' } } }],
    isDeleted: true
  })

  const previousWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [...customConditions, { createdAt: { _lte: comparisonDate } }],
    isDeleted: true
  })

  const previousActiveWhere = buildWhere({
    variables,
    descriptors: INVESTMENT_DESCRIPTORS,
    customConditions: [
      ...customConditions,
      { createdAt: { _lte: comparisonDate } },
      { investmentStatus: { value: { _eq: 'Active' } } }
    ],
    isDeleted: true
  })

  const query = `
    query GetPortfolioKPIsWithComparison(
      $currentWhere: InvestmentBoolExp,
      $currentActiveWhere: InvestmentBoolExp,
      $previousWhere: InvestmentBoolExp,
      $previousActiveWhere: InvestmentBoolExp
    ) {
      # Current data (all investments)
      currentAggregate: InvestmentAggregate(where: $currentWhere) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Current active investments count
      currentActiveAggregate: InvestmentAggregate(where: $currentActiveWhere) {
        aggregate {
          count
        }
      }
      
      # Previous period data (investments that existed 91 days ago)
      previousAggregate: InvestmentAggregate(where: $previousWhere) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
            investmentMarketValue
          }
        }
      }
      
      # Previous active investments count
      previousActiveAggregate: InvestmentAggregate(where: $previousActiveWhere) {
        aggregate {
          count
        }
      }
    }
  `

  return {
    query,
    variables: {
      currentWhere,
      currentActiveWhere,
      previousWhere,
      previousActiveWhere
    }
  }
}

const AVERAGE_FALLBACK = 0

/**
 * Hook to fetch portfolio KPI data with period comparison
 * Uses standard descriptor-based filtering from common
 */
export const useGetPortfolioKPIs = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchPortfolioKPIs = async (
    currencyCode?: string,
    filters?: Record<string, any>
  ): Promise<PortfolioKPIComparison> => {
    // Calculate comparison date (91 days ago)
    const comparisonDate = new Date()
    comparisonDate.setDate(comparisonDate.getDate() - 91)
    const comparisonDateString = comparisonDate.toISOString()
    if (!context.accessToken) {
      throw new Error('[useGetPortfolioKPIs] Access token is required')
    }

    const { query, variables } = buildPortfolioKPIQuery(comparisonDateString, currencyCode, filters)

    try {
      const result = await graphqlClient.request<any>(query, variables)

      // Process current KPIs
      const currentData: PortfolioKPIData = {
        totalPortfolioValue: result.currentAggregate.aggregate.sum?.investmentMarketValue || 0,
        totalInvestments: result.currentAggregate.aggregate.count || 0,
        totalAmountInvested: result.currentAggregate.aggregate.sum?.totalInvestmentAmount || 0,
        activeInvestments: result.currentActiveAggregate.aggregate.count || 0,
        averageInvestmentValue:
          result.currentAggregate.aggregate.count > 0
            ? (result.currentAggregate.aggregate.sum?.totalInvestmentAmount || 0) /
              result.currentAggregate.aggregate.count
            : AVERAGE_FALLBACK,
        averageMarketValue:
          result.currentAggregate.aggregate.count > 0
            ? (result.currentAggregate.aggregate.sum?.investmentMarketValue || 0) /
              result.currentAggregate.aggregate.count
            : AVERAGE_FALLBACK
      }

      // Process previous KPIs
      const previousData: PortfolioKPIData = {
        totalPortfolioValue: result.previousAggregate.aggregate.sum?.investmentMarketValue || 0,
        totalInvestments: result.previousAggregate.aggregate.count || 0,
        totalAmountInvested: result.previousAggregate.aggregate.sum?.totalInvestmentAmount || 0,
        activeInvestments: result.previousActiveAggregate.aggregate.count || 0,
        averageInvestmentValue:
          result.previousAggregate.aggregate.count > 0
            ? (result.previousAggregate.aggregate.sum?.totalInvestmentAmount || 0) /
              result.previousAggregate.aggregate.count
            : AVERAGE_FALLBACK,
        averageMarketValue:
          result.previousAggregate.aggregate.count > 0
            ? (result.previousAggregate.aggregate.sum?.investmentMarketValue || 0) /
              result.previousAggregate.aggregate.count
            : AVERAGE_FALLBACK
      }

      return {
        current: currentData,
        previous: previousData
      }
    } catch (error) {
      console.error('[useGetPortfolioKPIs] Error fetching portfolio KPIs:', error)
      throw error
    }
  }

  return { fetchPortfolioKPIs }
}
