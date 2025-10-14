import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useContactStatisticsQueries } from '../queries/ContactStatisticsQueries'

interface UseContactStatisticsWithTrendProps extends BusinessAppContextProps {
  sourceApp?: string
}

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

export interface UseContactStatisticsWithTrendReturn {
  trendData: ContactStatisticsTrendData | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useContactStatisticsWithTrend = (
  props: UseContactStatisticsWithTrendProps
): UseContactStatisticsWithTrendReturn => {
  const [trendData, setTrendData] = useState<ContactStatisticsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {
    fetchRecentContactsWithTrend,
    fetchActiveContactsWithTrend,
    fetchEmailEngagementsWithTrend,
    fetchContactsThisYearWithTrend
  } = useContactStatisticsQueries({
    accessToken: props.accessToken,
    sourceApp: props.sourceApp || 'CRM'
  })

  const refetch = useCallback(async () => {
    if (!props.accessToken) {
      console.warn('No access token provided for contact statistics with trend loading')
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
        recentContacts: recentContactsTrend,
        activeContacts: activeContactsTrend,
        emailEngagements: emailEngagementsTrend,
        contactsThisYear: contactsThisYearTrend
      })
    } catch (err) {
      console.error('Error fetching contact statistics with trend:', err)
      setError(err instanceof Error ? err : new Error('Failed to load contact statistics with trend'))
    } finally {
      setIsLoading(false)
    }
  }, [
    props.accessToken,
    fetchRecentContactsWithTrend,
    fetchActiveContactsWithTrend,
    fetchEmailEngagementsWithTrend,
    fetchContactsThisYearWithTrend
  ])

  // Fetch statistics on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      refetch()
    }
  }, [props.accessToken, refetch])

  return {
    trendData,
    isLoading,
    error,
    refetch
  }
}
