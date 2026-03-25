import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatClient } from '@/common/network/chat/ChatClient'
import type {
  UserOverviewResponse,
  UserContactsResponse,
  UserActivityResponse,
  UserReactionsResponse,
  GlobalStatsResponse
} from '../types'

interface UseEveryOneAnalyticsOptions {
  apiClient: ChatClient | null
  isActive?: boolean
}

interface EveryOneAnalyticsState {
  userOverview: UserOverviewResponse | null
  userContacts: UserContactsResponse | null
  userActivity: UserActivityResponse | null
  userReactions: UserReactionsResponse | null
  globalStats: GlobalStatsResponse | null
  isLoading: boolean
  error: string | null
}

export function useEveryOneAnalytics({ apiClient, isActive = true }: UseEveryOneAnalyticsOptions) {
  const [state, setState] = useState<EveryOneAnalyticsState>({
    userOverview: null,
    userContacts: null,
    userActivity: null,
    userReactions: null,
    globalStats: null,
    isLoading: false,
    error: null
  })

  const isMounted = useRef(true)
  const hasFetched = useRef(false)

  // Fetch all analytics data
  const fetchAnalytics = useCallback(async () => {
    if (!apiClient) return

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Fetch all data in parallel
      const [userOverview, userContacts, userActivity, userReactions, globalStats] = await Promise.all([
        apiClient.getAnalyticsUserOverview().catch(err => {
          console.warn('Failed to fetch user overview:', err)
          return null
        }),
        apiClient.getAnalyticsUserContacts().catch(err => {
          console.warn('Failed to fetch user contacts:', err)
          return null
        }),
        apiClient.getAnalyticsUserActivity().catch(err => {
          console.warn('Failed to fetch user activity:', err)
          return null
        }),
        apiClient.getAnalyticsUserReactions().catch(err => {
          console.warn('Failed to fetch user reactions:', err)
          return null
        }),
        apiClient.getAnalyticsGlobalStats().catch(err => {
          console.warn('Failed to fetch global stats:', err)
          return null
        })
      ])

      if (isMounted.current) {
        setState({
          userOverview,
          userContacts,
          userActivity,
          userReactions,
          globalStats,
          isLoading: false,
          error: null
        })
      }
    } catch (err) {
      console.error('Error fetching analytics:', err)
      if (isMounted.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load analytics data'
        }))
      }
    }
  }, [apiClient])

  // Refresh specific data
  const refreshUserOverview = useCallback(async () => {
    if (!apiClient) return
    try {
      const userOverview = await apiClient.getAnalyticsUserOverview()
      if (isMounted.current) {
        setState(prev => ({ ...prev, userOverview }))
      }
    } catch (err) {
      console.warn('Failed to refresh user overview:', err)
    }
  }, [apiClient])

  const refreshUserContacts = useCallback(async () => {
    if (!apiClient) return
    try {
      const userContacts = await apiClient.getAnalyticsUserContacts()
      if (isMounted.current) {
        setState(prev => ({ ...prev, userContacts }))
      }
    } catch (err) {
      console.warn('Failed to refresh user contacts:', err)
    }
  }, [apiClient])

  const refreshGlobalStats = useCallback(async () => {
    if (!apiClient) return
    try {
      const globalStats = await apiClient.getAnalyticsGlobalStats()
      if (isMounted.current) {
        setState(prev => ({ ...prev, globalStats }))
      }
    } catch (err) {
      console.warn('Failed to refresh global stats:', err)
    }
  }, [apiClient])

  // Initial fetch when API client is available and tab is active
  useEffect(() => {
    if (apiClient && isActive && !hasFetched.current) {
      hasFetched.current = true
      fetchAnalytics()
    }
  }, [apiClient, isActive, fetchAnalytics])

  // Refetch when becoming active again (after switching tabs)
  useEffect(() => {
    if (apiClient && isActive && hasFetched.current) {
      // Optional: refresh data when tab becomes active again
      // Uncomment if you want to refresh on every tab switch:
      // fetchAnalytics()
    }
  }, [isActive, apiClient, fetchAnalytics])

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  return {
    ...state,
    fetchAnalytics,
    refreshUserOverview,
    refreshUserContacts,
    refreshGlobalStats
  }
}
