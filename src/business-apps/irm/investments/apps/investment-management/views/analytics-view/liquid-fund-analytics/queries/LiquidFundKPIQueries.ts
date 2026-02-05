import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { isValidDate } from '@/common/utils/dateFormatter'
import { buildWhere } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'

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

interface LiquidFundKPIQueryResult {
  query: string
  variables: Record<string, any>
}

const buildLiquidFundKPIQuery = (
  comparisonDate: string,
  currencyFilter?: string,
  filters?: Record<string, any>
): LiquidFundKPIQueryResult => {
  // Validate comparison date
  if (!isValidDate(comparisonDate)) {
    throw new Error('Invalid comparison date format')
  }

  const variables = { ...filters }

  // Build custom conditions for liquid fund investment type and currency
  const customConditions: Record<string, any>[] = [{ liquidFundInvestment: { id: { _isNull: false } } }]

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
    query GetLiquidFundKPIsWithComparison(
      $currentWhere: InvestmentBoolExp,
      $currentActiveWhere: InvestmentBoolExp,
      $previousWhere: InvestmentBoolExp,
      $previousActiveWhere: InvestmentBoolExp
    ) {
      # Current data (liquid fund investments only)
      currentAggregate: InvestmentAggregate(where: $currentWhere) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
          }
        }
      }
      
      # Current active investments count
      currentActiveAggregate: InvestmentAggregate(where: $currentActiveWhere) {
        aggregate {
          count
        }
      }
      
      # Previous period data
      previousAggregate: InvestmentAggregate(where: $previousWhere) {
        aggregate {
          count
          sum {
            totalInvestmentAmount
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
 * Hook to fetch liquid fund KPI data with period comparison
 * Uses standard descriptor-based filtering from common
 */
export const useGetLiquidFundKPIs = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLiquidFundKPIs = useCallback(
    async (
      comparisonDate: string,
      currencyFilter?: string,
      filters?: Record<string, any>
    ): Promise<LiquidFundKPIComparison> => {
      if (!context.accessToken) {
        throw new Error('[useGetLiquidFundKPIs] Access token is required')
      }

      const { query, variables } = buildLiquidFundKPIQuery(comparisonDate, currencyFilter, filters)

      try {
        const result = await graphqlClient.request<any>(query, variables)

        // Process current KPIs
        const currentData: LiquidFundKPIData = {
          totalInvestments: result.currentAggregate.aggregate.count || 0,
          totalAmountInvested: result.currentAggregate.aggregate.sum?.totalInvestmentAmount || 0,
          activeInvestments: result.currentActiveAggregate.aggregate.count || 0,
          averageInvestmentValue:
            result.currentAggregate.aggregate.count > 0
              ? (result.currentAggregate.aggregate.sum?.totalInvestmentAmount || 0) /
                result.currentAggregate.aggregate.count
              : AVERAGE_FALLBACK
        }

        // Process previous KPIs
        const previousData: LiquidFundKPIData = {
          totalInvestments: result.previousAggregate.aggregate.count || 0,
          totalAmountInvested: result.previousAggregate.aggregate.sum?.totalInvestmentAmount || 0,
          activeInvestments: result.previousActiveAggregate.aggregate.count || 0,
          averageInvestmentValue:
            result.previousAggregate.aggregate.count > 0
              ? (result.previousAggregate.aggregate.sum?.totalInvestmentAmount || 0) /
                result.previousAggregate.aggregate.count
              : AVERAGE_FALLBACK
        }

        return {
          current: currentData,
          previous: previousData
        }
      } catch (error) {
        console.error('[useGetLiquidFundKPIs] Error fetching liquid fund KPIs:', error)
        throw error
      }
    },
    [context.accessToken, graphqlClient]
  )

  return { fetchLiquidFundKPIs }
}
