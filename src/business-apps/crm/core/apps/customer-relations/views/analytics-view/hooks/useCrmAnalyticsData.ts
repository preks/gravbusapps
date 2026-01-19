import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CrmAnalyticsData } from '../types/analyticsTypes'
// import { GET_OVERVIEW_ONLY_ANALYTICS } from '../queries/analyticsQueries' // REMOVED: Now using useOverviewData hook

type AnalyticsTab = 'overview' | 'leads' | 'accounts' | 'opportunities' | 'contacts'

export const useCrmAnalyticsData = (
  context: BusinessAppContextProps,
  activeTab: AnalyticsTab,
  kpiCurrency?: string
) => {
  const [data, setData] = useState<CrmAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Cache to store fetched tab data
  const tabDataCache = useRef<Partial<CrmAnalyticsData>>({})
  const fetchedTabs = useRef<Set<AnalyticsTab>>(new Set())
  const isFetching = useRef(false)
  const lastCurrencyKey = useRef('')

  // Fetch data when active tab or currencies change
  useEffect(() => {
    const fetchTabData = async () => {
      if (!context.accessToken) {
        setError('Access token is required')
        setIsLoading(false)
        return
      }

      // Prevent multiple simultaneous fetches
      if (isFetching.current) {
        return
      }

      // Clear cache when currency changes (for Overview tab)
      const currencyKey = kpiCurrency || 'default'
      if (lastCurrencyKey.current && lastCurrencyKey.current !== currencyKey) {
        tabDataCache.current = {}
        fetchedTabs.current.clear()
      }
      lastCurrencyKey.current = currencyKey

      // If tab data is already cached, use it
      if (fetchedTabs.current.has(activeTab)) {
        setIsLoading(false)
        return
      }

      isFetching.current = true
      setIsLoading(true)
      setError(null)

      try {
        const tabData: Partial<CrmAnalyticsData> = {}

        switch (activeTab) {
          case 'overview': {
            break
          }
        }

        // Cache the fetched tab data
        tabDataCache.current = { ...tabDataCache.current, ...tabData }
        fetchedTabs.current.add(activeTab)

        // Update the full data with cached tabs
        setData(tabDataCache.current as CrmAnalyticsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to load ${activeTab} analytics data`)
      } finally {
        setIsLoading(false)
        isFetching.current = false
      }
    }

    fetchTabData()
  }, [activeTab, context.accessToken, graphqlClient, kpiCurrency])

  const refetch = useCallback(() => {
    // Clear cache and force refetch current tab
    tabDataCache.current = {}
    fetchedTabs.current.clear()
    isFetching.current = false
    lastCurrencyKey.current = '' // Force cache clear
    setIsLoading(true)
  }, [])

  return {
    data,
    isLoading,
    error,
    refetch
  }
}
