import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

export interface UseInvestmentAccountStatisticsReturn {
  recentAccounts: TrendData
  activeAccounts: TrendData
  accountsThisYear: TrendData
  totalAccounts: TrendData
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const GET_ALL_INVESTMENT_ACCOUNT_STATISTICS_WITH_TREND = `
  query GetAllInvestmentAccountStatisticsWithTrend(
    $currentStart: timestamptz!,
    $previousStart: timestamptz!,
    $previousEnd: timestamptz!,
    $lastMonth: timestamptz!,
    $thisYearStart: timestamptz!,
    $lastYearStart: timestamptz!,
    $lastYearEnd: timestamptz!,
    $currentEnd: timestamptz!,
    $previousTotalStart: timestamptz!,
    $previousTotalEnd: timestamptz!
  ) {
    recentAccountsCurrent: InvestmentAccountAggregate(where: { createdAt: { _gte: $currentStart }, isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    recentAccountsPrevious: InvestmentAccountAggregate(where: { createdAt: { _gte: $previousStart, _lt: $previousEnd }, isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    # Active accounts = accounts with OPEN opportunities OR ACTIVE investments
    # Query through junction tables due to schema architecture
    
    # Step 1: Get accounts with open opportunities
    activeOpportunityAccounts: InvestmentOpportunityAccountAggregate(
      where: {
        isDeleted: { _eq: false }
        opportunity: {
          isDeleted: { _eq: false }
          opportunityStatus: { code: { _eq: "OPEN" } }
        }
      }
      distinctOn: [accountId]
    ) {
      aggregate { count }
    }
    
    # Step 2: Get accounts with active investments
    activeInvestmentAccounts: InvestmentInvestmentAccountAggregate(
      where: {
        isDeleted: { _eq: false }
        investment: {
          isDeleted: { _eq: false }
          investmentStatus: { code: { _eq: "ACTIVE" } }
        }
      }
      distinctOn: [investmentAccountId]
    ) {
      aggregate { count }
    }
    
    # Previous period - accounts with open opportunities
    previousOpportunityAccounts: InvestmentOpportunityAccountAggregate(
      where: {
        isDeleted: { _eq: false }
        opportunity: {
          isDeleted: { _eq: false }
          opportunityStatus: { code: { _eq: "OPEN" } }
        }
        account: {
          createdAt: { _lt: $lastMonth }
        }
      }
      distinctOn: [accountId]
    ) {
      aggregate { count }
    }
    
    # Previous period - accounts with active investments
    previousInvestmentAccounts: InvestmentInvestmentAccountAggregate(
      where: {
        isDeleted: { _eq: false }
        investment: {
          isDeleted: { _eq: false }
          investmentStatus: { code: { _eq: "ACTIVE" } }
        }
        investmentAccount: {
          createdAt: { _lt: $lastMonth }
        }
      }
      distinctOn: [investmentAccountId]
    ) {
      aggregate { count }
    }
    accountsThisYearCurrent: InvestmentAccountAggregate(where: { createdAt: { _gte: $thisYearStart }, isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    accountsThisYearPrevious: InvestmentAccountAggregate(where: { createdAt: { _gte: $lastYearStart, _lt: $lastYearEnd }, isDeleted: { _eq: false } }) {
      aggregate { count }
    }
    totalAccountsCurrent: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, createdAt: { _lt: $currentEnd } }) {
      aggregate { count }
    }
    totalAccountsPrevious: InvestmentAccountAggregate(where: { isDeleted: { _eq: false }, createdAt: { _gte: $previousTotalStart, _lt: $previousTotalEnd } }) {
      aggregate { count }
    }
  }
`

// Helper function outside component to prevent recreation
const calculateTrend = (current: number, previous: number): TrendData => {
  const change = current - previous
  let changePercent: number
  if (previous > 0) {
    changePercent = (change / previous) * 100
  } else if (current > 0) {
    changePercent = 100
  } else {
    changePercent = 0
  }
  return {
    current,
    previous,
    change,
    changePercent,
    isPositive: change >= 0
  }
}

export const useInvestmentAccountStatistics = (
  context: BusinessAppContextProps
): UseInvestmentAccountStatisticsReturn => {
  const [recentAccounts, setRecentAccounts] = useState<TrendData>({
    current: 0,
    previous: 0,
    change: 0,
    changePercent: 0,
    isPositive: true
  })
  const [activeAccounts, setActiveAccounts] = useState<TrendData>({
    current: 0,
    previous: 0,
    change: 0,
    changePercent: 0,
    isPositive: true
  })
  const [accountsThisYear, setAccountsThisYear] = useState<TrendData>({
    current: 0,
    previous: 0,
    change: 0,
    changePercent: 0,
    isPositive: true
  })
  const [totalAccounts, setTotalAccounts] = useState<TrendData>({
    current: 0,
    previous: 0,
    change: 0,
    changePercent: 0,
    isPositive: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const refetch = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('No access token provided for investment account statistics loading')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const previousEnd = currentStart
      const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      const currentEnd = now
      const previousTotalEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const previousTotalStart = new Date(previousTotalEnd.getTime() - 30 * 24 * 60 * 60 * 1000)

      const result = await graphqlClient.request<{
        recentAccountsCurrent: { aggregate: { count: number } }
        recentAccountsPrevious: { aggregate: { count: number } }
        activeOpportunityAccounts: { aggregate: { count: number } }
        activeInvestmentAccounts: { aggregate: { count: number } }
        previousOpportunityAccounts: { aggregate: { count: number } }
        previousInvestmentAccounts: { aggregate: { count: number } }
        accountsThisYearCurrent: { aggregate: { count: number } }
        accountsThisYearPrevious: { aggregate: { count: number } }
        totalAccountsCurrent: { aggregate: { count: number } }
        totalAccountsPrevious: { aggregate: { count: number } }
      }>(GET_ALL_INVESTMENT_ACCOUNT_STATISTICS_WITH_TREND, {
        currentStart: currentStart.toISOString(),
        previousStart: previousStart.toISOString(),
        previousEnd: previousEnd.toISOString(),
        lastMonth: lastMonth.toISOString(),
        thisYearStart: thisYearStart.toISOString(),
        lastYearStart: lastYearStart.toISOString(),
        lastYearEnd: lastYearEnd.toISOString(),
        currentEnd: currentEnd.toISOString(),
        previousTotalStart: previousTotalStart.toISOString(),
        previousTotalEnd: previousTotalEnd.toISOString()
      })

      // Combine opportunity and investment account counts
      // Note: This may slightly overcount if an account has both open opportunities AND active investments
      // A more precise count would require frontend deduplication, but this provides a good approximation
      const activeAccountsCurrent =
        result.activeOpportunityAccounts.aggregate.count + result.activeInvestmentAccounts.aggregate.count

      const activeAccountsPrevious =
        result.previousOpportunityAccounts.aggregate.count + result.previousInvestmentAccounts.aggregate.count

      setRecentAccounts(
        calculateTrend(result.recentAccountsCurrent.aggregate.count, result.recentAccountsPrevious.aggregate.count)
      )
      setActiveAccounts(calculateTrend(activeAccountsCurrent, activeAccountsPrevious))
      setAccountsThisYear(
        calculateTrend(result.accountsThisYearCurrent.aggregate.count, result.accountsThisYearPrevious.aggregate.count)
      )
      setTotalAccounts(
        calculateTrend(result.totalAccountsCurrent.aggregate.count, result.totalAccountsPrevious.aggregate.count)
      )
    } catch (err) {
      console.error('Error fetching investment account statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Failed to load investment account statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  useEffect(() => {
    if (context.accessToken) {
      refetch()
    }
  }, [context.accessToken, refetch])

  return {
    recentAccounts,
    activeAccounts,
    accountsThisYear,
    totalAccounts,
    isLoading,
    error,
    refetch
  }
}
