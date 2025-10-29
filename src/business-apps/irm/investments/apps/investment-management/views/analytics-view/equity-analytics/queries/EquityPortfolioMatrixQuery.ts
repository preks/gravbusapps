import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface PortfolioMatrixDataPoint {
  id: string
  company: string
  acquisitionDate: string
  totalInvestmentAmount: number
  investmentMarketValue: number
  currencyCode: string
}

interface PortfolioMatrixResponse {
  Investment: Array<{
    id: string
    name: string | null
    code: string | null
    acquisitionDate: string
    totalInvestmentAmount: number
    investmentMarketValue: number
    currency: {
      code: string
    } | null
  }>
}

/**
 * Optimized query for Portfolio Matrix (Bubble Chart)
 * Only fetches the exact fields needed for the visualization
 */
const BUILD_PORTFOLIO_MATRIX_QUERY = (currency: string): string => {
  return `
    query GetPortfolioMatrixData {
      Investment(
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
          currency: { code: { _eq: "${currency}" } }
          acquisitionDate: { _isNull: false }
          totalInvestmentAmount: { _gt: 0 }
          investmentMarketValue: { _isNull: false, _gt: 0 }
        }
        orderBy: { totalInvestmentAmount: DESC }
      ) {
        id
        name
        code
        acquisitionDate
        totalInvestmentAmount
        investmentMarketValue
        currency {
          code
        }
      }
    }
  `
}

/**
 * Hook for fetching optimized portfolio matrix data
 * Server-side filtering reduces data transfer and client-side processing
 */
export const useGetEquityPortfolioMatrix = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchPortfolioMatrix = useCallback(
    async (currency: string): Promise<PortfolioMatrixDataPoint[]> => {
      const query = BUILD_PORTFOLIO_MATRIX_QUERY(currency)
      const result = await graphqlClient.request<PortfolioMatrixResponse>(query)

      const dataPoints: PortfolioMatrixDataPoint[] = result.Investment.map(investment => ({
        id: investment.id,
        company: investment.name || investment.code || 'Unknown',
        acquisitionDate: investment.acquisitionDate,
        totalInvestmentAmount: investment.totalInvestmentAmount,
        investmentMarketValue: investment.investmentMarketValue,
        currencyCode: investment.currency?.code || currency
      }))

      return dataPoints
    },
    [graphqlClient]
  )

  return { fetchPortfolioMatrix }
}
