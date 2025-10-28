import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Top company data structure
 */
export interface TopCompanyData {
  id: string
  company: string
  valuation: number
}

export interface TopCompaniesResult {
  companies: TopCompanyData[]
}

/**
 * Build GraphQL query to fetch top companies by valuation
 */
const BUILD_TOP_COMPANIES_QUERY = (currency: string, limit: number = 10): string => {
  return `
    query GetTopCompaniesByValuation {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { investmentMarketValue: { _gt: 0 } }
          ]
        }
        orderBy: [{ investmentMarketValue: DESC }]
        limit: ${limit}
      ) {
        id
        name
        code
        investmentMarketValue
      }
    }
  `
}

/**
 * Hook to fetch top companies by valuation with optimized GraphQL query
 */
export const useGetEquityTopCompanies = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTopCompanies = useCallback(
    async (currency: string, limit: number = 10): Promise<TopCompaniesResult> => {
      const query = BUILD_TOP_COMPANIES_QUERY(currency, limit)

      const result = await graphqlClient.request<{
        Investment: Array<{
          id: string
          name: string | null
          code: string | null
          investmentMarketValue: number | null
        }>
      }>(query)

      // Transform to chart data format
      const companies: TopCompanyData[] = result.Investment.filter(
        inv => inv.investmentMarketValue && inv.investmentMarketValue > 0
      ).map(inv => ({
        id: inv.id,
        company: inv.name || inv.code || 'Unknown',
        valuation: inv.investmentMarketValue || 0
      }))

      return { companies }
    },
    [graphqlClient]
  )

  return { fetchTopCompanies }
}
