import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useContactStatisticsQueries } from '@/business-apps/irm/core/apps/investment-relations/views/contact-view/queries/ContactStatisticsQueries'

interface TrendData {
  current: number
  previous: number
  change: number
  changePercent: number
  isPositive: boolean
}

interface ContactStatisticsTrendData {
  recentContacts: TrendData
  activeContacts: TrendData
  emailEngagements: TrendData
  contactsThisYear: TrendData
}

export interface UseInvestmentContactStatisticsReturn {
  trendData: ContactStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch investment contact statistics with trend data
 * Transforms raw trend data into the format expected by ContactStatisticsLayout
 */
export const useInvestmentContactStatistics = (
  context: BusinessAppContextProps
): UseInvestmentContactStatisticsReturn => {
  const [trendData, setTrendData] = useState<ContactStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {
    fetchRecentContactsWithTrend,
    fetchActiveContactsWithTrend,
    fetchEmailEngagementsWithTrend,
    fetchContactsThisYearWithTrend
  } = useContactStatisticsQueries(context)

  // Helper to calculate trend data from raw current/previous values
  const calculateTrend = (current: number, previous: number): TrendData => {
    const change = current - previous
    const changePercent = previous > 0 ? (change / previous) * 100 : current > 0 ? 100 : 0
    return {
      current,
      previous,
      change,
      changePercent,
      isPositive: change >= 0
    }
  }

  const refetch = useCallback(async () => {
    if (!context.accessToken) {
      console.warn('No access token provided for investment contact statistics loading')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all statistics with trend data
      const [recentContactsTrend, activeContactsTrend, emailEngagementsTrend, contactsThisYearTrend] =
        await Promise.all([
          fetchRecentContactsWithTrend(),
          fetchActiveContactsWithTrend(),
          fetchEmailEngagementsWithTrend(),
          fetchContactsThisYearWithTrend()
        ])

      setTrendData({
        recentContacts: calculateTrend(recentContactsTrend.current, recentContactsTrend.previous),
        activeContacts: calculateTrend(activeContactsTrend.current, activeContactsTrend.previous),
        emailEngagements: calculateTrend(emailEngagementsTrend.current, emailEngagementsTrend.previous),
        contactsThisYear: calculateTrend(contactsThisYearTrend.current, contactsThisYearTrend.previous)
      })
    } catch (err) {
      console.error('Error fetching investment contact statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Failed to load investment contact statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [
    context.accessToken,
    fetchRecentContactsWithTrend,
    fetchActiveContactsWithTrend,
    fetchEmailEngagementsWithTrend,
    fetchContactsThisYearWithTrend
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
