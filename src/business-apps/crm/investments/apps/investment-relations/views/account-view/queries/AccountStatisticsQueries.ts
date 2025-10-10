import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback } from 'react'

export const GET_INVESTMENT_RECENT_ACCOUNTS_WITH_TREND = `
  query GetInvestmentRecentAccountsWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!) {
    current: InvestmentAccountAggregate(where: { createdAt: { _gte: $currentStart }, isDeleted: { _eq: false } }) { aggregate { count } }
    previous: InvestmentAccountAggregate(where: { createdAt: { _gte: $previousStart, _lt: $previousEnd }, isDeleted: { _eq: false } }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_ACTIVE_ACCOUNTS_WITH_TREND = `
  query GetInvestmentActiveAccountsWithTrend($lastMonth: timestamptz!) {
    current: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, liquidationDate: { _isNull: true } }) { aggregate { count } }
    previous: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, liquidationDate: { _isNull: true }, createdAt: { _lt: $lastMonth } }) { aggregate { count } }
  }
`

export const GET_INVESTMENT_ACCOUNTS_THIS_YEAR_WITH_TREND = `
  query GetInvestmentAccountsThisYearWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!) {
    current: InvestmentAccountAggregate(where: { createdAt: { _gte: $thisYearStart }, isDeleted: { _eq: false } }) { aggregate { count } }
    previous: InvestmentAccountAggregate(where: { createdAt: { _gte: $lastYearStart, _lt: $lastYearEnd }, isDeleted: { _eq: false } }) { aggregate { count } }
  }
`

// Note: There is no raw numeric revenue field. We'll approximate Total Revenue by summing catalog bands mapped to midpoints.
// Count accounts per revenue band code (single roundtrip; avoids fetching all rows)
export const GET_INVESTMENT_ACCOUNT_REVENUE_COUNTS = `
  query GetInvestmentAccountRevenueCounts {
    # Revenue bands from AccountAnnualRevenueBand catalog
    band1000: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, accountAnnualRevenueBand: { code: { _eq: "1000" } } }) { aggregate { count } }
    band10000: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, accountAnnualRevenueBand: { code: { _eq: "10000" } } }) { aggregate { count } }
    band100000: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, accountAnnualRevenueBand: { code: { _eq: "100000" } } }) { aggregate { count } }
    band1000000: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, accountAnnualRevenueBand: { code: { _eq: "1000000" } } }) { aggregate { count } }
    band5000000: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, accountAnnualRevenueBand: { code: { _eq: "5000000" } } }) { aggregate { count } }
    band10000000: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, accountAnnualRevenueBand: { code: { _eq: "10000000" } } }) { aggregate { count } }
    
    # Total accounts for reference
    total: InvestmentAccountAggregate(where: { isDeleted: { _eq: false } }) { aggregate { count } }
  }
`

// New query to get actual revenue data from investments
export const GET_INVESTMENT_ACCOUNT_ACTUAL_REVENUE = `
  query GetInvestmentAccountActualRevenue {
    InvestmentAccount(where: { isDeleted: { _eq: false } }, limit: 100) {
      id
      investment {
        forecastedRevenueAmount
        forecastedProfitAmount
        currency {
          code
        }
      }
    }
  }
`

// Query to get total revenue with trend data (current vs previous period)
export const GET_INVESTMENT_TOTAL_REVENUE_WITH_TREND = `
  query GetInvestmentTotalRevenueWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!) {
    current: InvestmentAccount(where: { isDeleted: { _eq: false }, createdAt: { _gte: $currentStart } }, limit: 100) {
      id
      investment {
        forecastedRevenueAmount
        currency {
          code
        }
      }
    }
    previous: InvestmentAccount(where: { isDeleted: { _eq: false }, createdAt: { _gte: $previousStart, _lt: $previousEnd } }, limit: 100) {
      id
      investment {
        forecastedRevenueAmount
        currency {
          code
        }
      }
    }
  }
`

export interface TrendData {
  current: number
  previous: number
}

export const useAccountStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRecentAccountsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const previousEnd = currentStart
    const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_RECENT_ACCOUNTS_WITH_TREND, {
      currentStart: currentStart.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString()
    })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchActiveAccountsWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_ACTIVE_ACCOUNTS_WITH_TREND, { lastMonth: lastMonth.toISOString() })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchAccountsThisYearWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date()
    const thisYearStart = new Date(now.getFullYear(), 0, 1)
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } }
      previous: { aggregate: { count: number } }
    }>(GET_INVESTMENT_ACCOUNTS_THIS_YEAR_WITH_TREND, {
      thisYearStart: thisYearStart.toISOString(),
      lastYearStart: lastYearStart.toISOString(),
      lastYearEnd: lastYearEnd.toISOString()
    })
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count }
  }, [graphqlClient])

  const fetchCurrencyInfo = useCallback(async (): Promise<string | null> => {
    try {
      // Get currency from the first investment account that has currency data
      const result = await graphqlClient.request<{
        InvestmentAccount: Array<{
          investment: Array<{
            currency: { code: string } | null
          }>
        }>
      }>(`
        query GetCurrencyInfo {
          InvestmentAccount(where: { isDeleted: { _eq: false } }, limit: 1) {
            investment {
              currency {
                code
              }
            }
          }
        }
      `)

      // Extract the first available currency code
      for (const account of result.InvestmentAccount) {
        for (const investment of account.investment) {
          if (investment.currency?.code) {
            return investment.currency.code
          }
        }
      }

      // Return null if no currency found (will fallback to USD)
      return null
    } catch (error) {
      console.error('Error fetching currency info:', error)
      return null
    }
  }, [graphqlClient])

  const fetchTotalRevenueApprox = useCallback(async (): Promise<number> => {
    try {
      // First, try to get actual revenue data from investments
      const actualRevenueResult = await graphqlClient.request<{
        InvestmentAccount: Array<{
          id: string
          investment: Array<{
            forecastedRevenueAmount: number | null
            forecastedProfitAmount: number | null
            currency: { code: string } | null
          }>
        }>
      }>(GET_INVESTMENT_ACCOUNT_ACTUAL_REVENUE)

      // Calculate total from actual revenue data
      let totalActualRevenue = 0
      let hasActualData = false

      for (const account of actualRevenueResult.InvestmentAccount) {
        for (const investment of account.investment) {
          if (investment.forecastedRevenueAmount !== null && investment.forecastedRevenueAmount > 0) {
            totalActualRevenue += investment.forecastedRevenueAmount
            hasActualData = true
          }
        }
      }

      // If we have actual revenue data, return it
      if (hasActualData && totalActualRevenue > 0) {
        console.log('Using actual revenue data:', totalActualRevenue)
        return totalActualRevenue
      }

      // Fallback to revenue bands if no actual data available
      console.log('No actual revenue data available, falling back to revenue bands')

      // Map revenue band codes to approximate midpoints (EUR)
      const bandMidpoints: Record<string, number> = {
        '1000': 500, // 1-1000 → midpoint ~500
        '10000': 5500, // 1.001-10.000 → midpoint ~5500
        '100000': 55000, // 10.000-100.000 → midpoint ~55000
        '1000000': 750000, // 500.001-1.000.000 → midpoint ~750000
        '5000000': 3000000, // 1.000.001-5.000.000 → midpoint ~3000000
        '10000000': 7500000 // 5.000.001-10.000.000 → midpoint ~7500000
      }

      const result = await graphqlClient.request<{
        band1000: { aggregate: { count: number } }
        band10000: { aggregate: { count: number } }
        band100000: { aggregate: { count: number } }
        band1000000: { aggregate: { count: number } }
        band5000000: { aggregate: { count: number } }
        band10000000: { aggregate: { count: number } }
        total: { aggregate: { count: number } }
      }>(GET_INVESTMENT_ACCOUNT_REVENUE_COUNTS)

      const totalFromBands =
        (result.band1000.aggregate.count || 0) * bandMidpoints['1000'] +
        (result.band10000.aggregate.count || 0) * bandMidpoints['10000'] +
        (result.band100000.aggregate.count || 0) * bandMidpoints['100000'] +
        (result.band1000000.aggregate.count || 0) * bandMidpoints['1000000'] +
        (result.band5000000.aggregate.count || 0) * bandMidpoints['5000000'] +
        (result.band10000000.aggregate.count || 0) * bandMidpoints['10000000']

      console.log('Revenue bands result:', {
        total: result.total.aggregate.count,
        calculatedFromBands: totalFromBands
      })

      return totalFromBands
    } catch (error) {
      console.error('Error fetching total revenue:', error)
      return 0
    }
  }, [graphqlClient])

  const fetchTotalRevenueWithTrend = useCallback(async (): Promise<TrendData> => {
    try {
      const now = new Date()
      const currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      const previousEnd = currentStart
      const previousStart = new Date(currentStart.getTime() - 30 * 24 * 60 * 60 * 1000) // Previous 30 days

      const result = await graphqlClient.request<{
        current: Array<{
          id: string
          investment: Array<{
            forecastedRevenueAmount: number | null
            currency: { code: string } | null
          }>
        }>
        previous: Array<{
          id: string
          investment: Array<{
            forecastedRevenueAmount: number | null
            currency: { code: string } | null
          }>
        }>
      }>(GET_INVESTMENT_TOTAL_REVENUE_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString()
      })

      // Calculate current period revenue
      let currentRevenue = 0
      for (const account of result.current) {
        for (const investment of account.investment) {
          if (investment.forecastedRevenueAmount !== null && investment.forecastedRevenueAmount > 0) {
            currentRevenue += investment.forecastedRevenueAmount
          }
        }
      }

      // Calculate previous period revenue
      let previousRevenue = 0
      for (const account of result.previous) {
        for (const investment of account.investment) {
          if (investment.forecastedRevenueAmount !== null && investment.forecastedRevenueAmount > 0) {
            previousRevenue += investment.forecastedRevenueAmount
          }
        }
      }

      return { current: currentRevenue, previous: previousRevenue }
    } catch (error) {
      console.error('Error fetching total revenue with trend:', error)
      return { current: 0, previous: 0 }
    }
  }, [graphqlClient])

  return {
    fetchRecentAccountsWithTrend,
    fetchActiveAccountsWithTrend,
    fetchAccountsThisYearWithTrend,
    fetchTotalRevenueApprox,
    fetchTotalRevenueWithTrend,
    fetchCurrencyInfo
  }
}
