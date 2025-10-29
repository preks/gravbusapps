import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAccountStatisticsQueries } from '../queries/AccountStatisticsQueries'

export interface UseAccountStatisticsWithTrendProps extends BusinessAppContextProps {
  sourceApp?: string
}

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

interface AccountStatisticsTrendData {
  recentAccounts: TrendData
  activeAccounts: TrendData
  accountsThisYear: TrendData
  revenue: TrendData
}

export interface UseAccountStatisticsWithTrendReturn {
  trendData: AccountStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useAccountStatisticsWithTrend = (
  context: UseAccountStatisticsWithTrendProps
): UseAccountStatisticsWithTrendReturn => {
  const [trendData, setTrendData] = useState<AccountStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const {
    fetchRecentAccountsWithTrend,
    fetchActiveAccountsWithTrend,
    fetchAccountsThisYearWithTrend,
    fetchRevenueWithTrend
  } = useAccountStatisticsQueries(context)

  const refetch = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('No access token available'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all statistics with trend data
      const [recentAccountsTrend, activeAccountsTrend, accountsThisYearTrend, revenueTrend] = await Promise.all([
        fetchRecentAccountsWithTrend(),
        fetchActiveAccountsWithTrend(),
        fetchAccountsThisYearWithTrend(),
        fetchRevenueWithTrend()
      ])

      setTrendData({
        recentAccounts: recentAccountsTrend,
        activeAccounts: activeAccountsTrend,
        accountsThisYear: accountsThisYearTrend,
        revenue: revenueTrend
      })
    } catch (err) {
      console.error('Error fetching account statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Unknown error fetching statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [
    context.accessToken,
    fetchRecentAccountsWithTrend,
    fetchActiveAccountsWithTrend,
    fetchAccountsThisYearWithTrend,
    fetchRevenueWithTrend
  ])

  // Fetch statistics on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      refetch()
    }
  }, [context.accessToken, refetch])

  return {
    trendData,
    isLoading,
    error,
    refetch
  }
}
