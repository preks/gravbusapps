import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  AnalyticsQueryVariables,
  AnalyticsFilters,
  LiquidFundPortfolioAnalyticsResponse
} from '../types/AnalyticsTypes'

// Query to fetch liquid fund portfolios for analytics (reports fetched separately)
const GET_LIQUID_FUND_ANALYTICS_QUERY = `
  query GetLiquidFundAnalytics($limit: Int, $offset: Int, $where: LiquidFundPortfolioBoolExp, $orderBy: [LiquidFundPortfolioOrderBy!]) {
    LiquidFundPortfolio(
      limit: $limit
      offset: $offset
      where: $where
      orderBy: $orderBy
    ) {
      id
      proprietorName
      depositName
      isin
      portfolioNumber
      portfolioCode
      uniquePortfolioCode
      positionCode
      investmentTypeRef
      currencyRef
      portfolioStartDate
      portfolioEndDate
      investmentType {
        id
        code
        value
      }
    }
  }
`

// Query to fetch liquid fund portfolio reports for analytics
const GET_LIQUID_FUND_ANALYTICS_REPORTS_QUERY = `
  query GetLiquidFundAnalyticsReports($where: LiquidFundPortfolioReportBoolExp, $orderBy: [LiquidFundPortfolioReportOrderBy!]) {
    LiquidFundPortfolioReport(
      where: $where
      orderBy: $orderBy
    ) {
      id
      liquidFundPortfolioId
      reportDate
      startDate
      endDate
      currencyRef
      openMarketValueAmount
      closeMarketValueAmount
      changeMarketValueAmount
      cashFlowAmount
      positiveCashFlowAmount
      negativeCashFlowAmount
      netIncomeAmount
      incomeAmount
      expensesAmount
      accruedAmount
      realizedIncomeAmount
      realizedMarketIncomeAmount
      realizedCurrencyExchangeIncomeAmount
      unrealizedIncomeAmount
      unrealizedMarketIncomeAmount
      unrealizedCurrencyExchangeIncomeAmount
      realizedUnrealizedIncomeAmount
      realizedUnrealizedMarketIncomeAmount
      realizedUnrealizedCurrencyExchangeIncomeAmount
      timeWeightCompoundYieldPercent
      timeWeightSectorYieldPercent
      maturityDate
      interestRate
      stocksQuantity
    }
  }
`

// Query to get count of portfolios for pagination
const GET_LIQUID_FUND_ANALYTICS_COUNT_QUERY = `
  query GetLiquidFundAnalyticsCount($where: LiquidFundPortfolioBoolExp) {
    LiquidFundPortfolioAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

// Query to get available investment types for filtering
const GET_INVESTMENT_TYPES_QUERY = `
  query GetInvestmentTypes($where: CatalogEntryBoolExp) {
    CatalogEntry(where: $where) {
      id
      code
      value
      description
    }
  }
`

export interface LiquidFundAnalyticsQueryResponse {
  LiquidFundPortfolio: LiquidFundPortfolioAnalyticsResponse[]
}

export interface LiquidFundAnalyticsReportsQueryResponse {
  LiquidFundPortfolioReport: any[]
}

export interface LiquidFundAnalyticsCountResponse {
  LiquidFundPortfolioAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const useGetLiquidFundAnalyticsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLiquidFundAnalyticsData = useCallback(
    async (
      variables: AnalyticsQueryVariables & {
        filters: AnalyticsFilters
      }
    ) => {
      // Build where clause for portfolios - filter by investment type "Bank Deposits"
      const portfolioWhere: any = {
        _and: []
      }

      // Only include portfolios that ended after the filter start date (if they have an end date)
      if (variables.filters.startDate) {
        portfolioWhere._and.push({
          _or: [
            { portfolioEndDate: { _gte: variables.filters.startDate } }, // Ended after period start
            { portfolioStartDate: { _lte: variables.filters.endDate || variables.filters.startDate } } // Or started before/during period
          ]
        })
      }

      // Filter by investment type(s) - supports single or multiple types
      if (variables.filters.investmentType) {
        const investmentTypes = variables.filters.investmentType.split(',').map(type => type.trim())

        if (investmentTypes.length === 1) {
          // Single investment type
          portfolioWhere._and.push({
            investmentType: {
              value: { _ilike: `%${investmentTypes[0]}%` }
            }
          })
        } else {
          // Multiple investment types - use OR condition
          portfolioWhere._and.push({
            _or: investmentTypes.map(type => ({
              investmentType: {
                value: { _ilike: `%${type}%` }
              }
            }))
          })
        }
      } else {
        // Default filter for Bank Deposits
        portfolioWhere._and.push({
          investmentType: {
            value: { _ilike: '%Bank Deposit%' }
          }
        })
      }

      const portfolioQueryVariables = {
        limit: variables.limit || 1000, // Allow loading all available data for analytics (up to 1000)
        offset: variables.offset,
        where: portfolioWhere,
        orderBy: variables.orderBy || [{ proprietorName: 'ASC' }]
      }

      try {
        // First, fetch portfolios
        const portfolioResult = await graphqlClient.request<LiquidFundAnalyticsQueryResponse>(
          GET_LIQUID_FUND_ANALYTICS_QUERY,
          portfolioQueryVariables
        )

        const portfolios = portfolioResult.LiquidFundPortfolio

        if (portfolios.length === 0) {
          return []
        }

        // Build where clause for reports - filter by date range and portfolio IDs
        const portfolioIds = portfolios.map(p => p.id)
        let reportsWhere: any = {
          liquidFundPortfolioId: { _in: portfolioIds }
        }

        // Re-enable date filtering (now that we're using 2023 dates)
        if (variables.filters.startDate && variables.filters.endDate) {
          reportsWhere = {
            _and: [
              { liquidFundPortfolioId: { _in: portfolioIds } },
              {
                reportDate: {
                  _gte: variables.filters.startDate,
                  _lte: variables.filters.endDate
                }
              }
            ]
          }
        }

        // Date filtering is now properly enabled for 2023 data

        // Fetch reports for these portfolios
        const reportsResult = await graphqlClient.request<LiquidFundAnalyticsReportsQueryResponse>(
          GET_LIQUID_FUND_ANALYTICS_REPORTS_QUERY,
          {
            where: reportsWhere,
            orderBy: [{ reportDate: 'ASC' }]
          }
        )

        // Combine portfolios with their reports
        const portfoliosWithReports = portfolios.map(portfolio => ({
          ...portfolio,
          portfolioReports: reportsResult.LiquidFundPortfolioReport.filter(
            report => report.liquidFundPortfolioId === portfolio.id
          )
        }))

        // Filter out portfolios that have no reports in the selected date range
        const portfoliosWithValidReports = portfoliosWithReports.filter(
          portfolio => portfolio.portfolioReports.length > 0
        )

        // Analytics data successfully loaded with proper date filtering

        return portfoliosWithValidReports
      } catch (error) {
        console.error('Error fetching liquid fund analytics data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchLiquidFundAnalyticsCount = useCallback(
    async (filters: AnalyticsFilters) => {
      // Build same where clause as main query
      const portfolioWhere: any = {
        _and: []
      }

      // Only include portfolios that ended after the filter start date (if they have an end date)
      if (filters.startDate) {
        portfolioWhere._and.push({
          _or: [
            { portfolioEndDate: { _gte: filters.startDate } }, // Ended after period start
            { portfolioStartDate: { _lte: filters.endDate || filters.startDate } } // Or started before/during period
          ]
        })
      }

      if (filters.investmentType) {
        portfolioWhere._and.push({
          investmentType: {
            value: { _ilike: `%${filters.investmentType}%` }
          }
        })
      } else {
        portfolioWhere._and.push({
          investmentType: {
            value: { _ilike: '%Bank Deposit%' }
          }
        })
      }

      try {
        const result = await graphqlClient.request<LiquidFundAnalyticsCountResponse>(
          GET_LIQUID_FUND_ANALYTICS_COUNT_QUERY,
          { where: portfolioWhere }
        )
        return result.LiquidFundPortfolioAggregate.aggregate.count
      } catch (error) {
        console.error('Error fetching liquid fund analytics count:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchInvestmentTypes = useCallback(async () => {
    const whereClause = {
      catalogIdentifier: { _eq: 'InvestmentType' },
      isActive: { _eq: true },
      isDeleted: { _eq: false }
    }

    try {
      const result = await graphqlClient.request(GET_INVESTMENT_TYPES_QUERY, { where: whereClause })
      return result.CatalogEntry
    } catch (error) {
      console.error('Error fetching investment types:', error)
      throw error
    }
  }, [graphqlClient])

  return {
    fetchLiquidFundAnalyticsData,
    fetchLiquidFundAnalyticsCount,
    fetchInvestmentTypes
  }
}

export {
  GET_LIQUID_FUND_ANALYTICS_QUERY,
  GET_LIQUID_FUND_ANALYTICS_REPORTS_QUERY,
  GET_LIQUID_FUND_ANALYTICS_COUNT_QUERY,
  GET_INVESTMENT_TYPES_QUERY
}
