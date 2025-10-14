import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  EquityAnalyticsQueryVariables,
  EquityAnalyticsFilters,
  EquityInvestmentAnalyticsResponse
} from '../types/EquityTypes'

// Query to fetch equity investments for analytics
const GET_EQUITY_INVESTMENTS_QUERY = `
  query GetEquityInvestmentsAnalytics($limit: Int, $offset: Int, $where: InvestmentBoolExp, $orderBy: [InvestmentOrderBy!]) {
    Investment(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
      id
      name
      code
      fundManagerName
      acquisitionDate
      forecastedProfitAmount
      forecastedRevenueAmount
      currencyRef
      equityInvestment {
        id
        marketValue
        ebitdaAmount
        foundationDate
        equityInvestmentReport {
          id
          date
          marketValue
          ebitdaAmount
          turnoverAmount
          equityInvestmentId
        }
      }
    }
  }
`

// Query to get count of equity investments for pagination
const GET_EQUITY_INVESTMENTS_COUNT_QUERY = `
  query GetEquityInvestmentsCount($where: InvestmentBoolExp) {
    InvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export interface EquityInvestmentsQueryResponse {
  Investment: EquityInvestmentAnalyticsResponse[]
}

export interface EquityInvestmentsCountResponse {
  InvestmentAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const useGetEquityInvestmentsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEquityInvestmentsData = useCallback(
    async (
      variables: EquityAnalyticsQueryVariables & {
        filters: EquityAnalyticsFilters
      }
    ) => {
      // Build where clause for investments with equity investments
      const investmentWhere: any = {
        _and: [
          // Only include investments that have equity investments
          { equityInvestment: {} }
        ]
      }

      // Filter by acquisition date range if provided
      if (variables.filters.startDate && variables.filters.endDate) {
        investmentWhere._and.push({
          acquisitionDate: {
            _gte: variables.filters.startDate,
            _lte: variables.filters.endDate
          }
        })
      }

      // Filter by fund manager if provided
      if (variables.filters.fundManagerName) {
        investmentWhere._and.push({
          fundManagerName: { _ilike: `%${variables.filters.fundManagerName}%` }
        })
      }

      const investmentQueryVariables = {
        limit: variables.limit || 1000,
        offset: variables.offset,
        where: investmentWhere,
        orderBy: variables.orderBy || [{ name: 'ASC' }]
      }

      try {
        // Fetch investments with equity data
        const investmentResult = await graphqlClient.request<EquityInvestmentsQueryResponse>(
          GET_EQUITY_INVESTMENTS_QUERY,
          investmentQueryVariables
        )

        const investments = investmentResult.Investment

        if (investments.length === 0) {
          return []
        }

        // Transform the data to match the expected format
        const investmentsWithEquity = investments.map(investment => ({
          ...investment,
          equityInvestment: investment.equityInvestment.map(equity => ({
            ...equity,
            investment: {
              id: investment.id,
              name: investment.name,
              code: investment.code,
              fundManagerName: investment.fundManagerName,
              acquisitionDate: investment.acquisitionDate,
              forecastedProfitAmount: investment.forecastedProfitAmount,
              forecastedRevenueAmount: investment.forecastedRevenueAmount,
              currencyRef: investment.currencyRef
            }
          }))
        }))

        // Flatten the data to return equity investments with their parent investment data
        const equityInvestments: EquityInvestmentAnalyticsResponse[] = []

        investmentsWithEquity.forEach(investment => {
          investment.equityInvestment.forEach(equity => {
            equityInvestments.push({
              id: equity.id,
              marketValue: equity.marketValue,
              ebitdaAmount: equity.ebitdaAmount,
              foundationDate: equity.foundationDate,
              investmentId: investment.id,
              investment: {
                id: investment.id,
                name: investment.name,
                code: investment.code,
                fundManagerName: investment.fundManagerName,
                acquisitionDate: investment.acquisitionDate,
                forecastedProfitAmount: investment.forecastedProfitAmount,
                forecastedRevenueAmount: investment.forecastedRevenueAmount,
                currencyRef: investment.currencyRef
              },
              equityInvestmentReport: equity.equityInvestmentReport || []
            })
          })
        })

        return equityInvestments
      } catch (error) {
        console.error('Error fetching equity investments data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchEquityInvestmentsCount = useCallback(
    async (filters: EquityAnalyticsFilters) => {
      // Build same where clause as main query
      const investmentWhere: any = {
        _and: [{ equityInvestment: {} }]
      }

      if (filters.startDate && filters.endDate) {
        investmentWhere._and.push({
          acquisitionDate: {
            _gte: filters.startDate,
            _lte: filters.endDate
          }
        })
      }

      if (filters.fundManagerName) {
        investmentWhere._and.push({
          fundManagerName: { _ilike: `%${filters.fundManagerName}%` }
        })
      }

      try {
        const result = await graphqlClient.request<EquityInvestmentsCountResponse>(GET_EQUITY_INVESTMENTS_COUNT_QUERY, {
          where: investmentWhere
        })
        return result.InvestmentAggregate.aggregate.count
      } catch (error) {
        console.error('Error fetching equity investments count:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchEquityInvestmentsData,
    fetchEquityInvestmentsCount
  }
}

export { GET_EQUITY_INVESTMENTS_QUERY, GET_EQUITY_INVESTMENTS_COUNT_QUERY }
