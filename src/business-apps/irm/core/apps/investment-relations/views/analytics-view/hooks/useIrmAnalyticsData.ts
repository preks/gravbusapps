import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { IrmAnalyticsData } from '../types/analyticsTypes'

export type AnalyticsTab = 'overview' | 'leads' | 'accounts' | 'opportunities' | 'contacts'

/**
 * IRM Analytics Data Hook with Lazy Loading
 * Only fetches data for the active tab to improve performance
 * Similar to CRM's optimized approach
 */
export const useIrmAnalyticsData = (
  context: BusinessAppContextProps,
  activeTab: AnalyticsTab, // NEW: Lazy loading based on active tab
  kpiCurrency?: string
) => {
  const [data, setData] = useState<Partial<IrmAnalyticsData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  // Cache for tab data - avoid refetching when switching back
  const tabDataCache = useRef<Partial<IrmAnalyticsData>>({})
  const fetchedTabs = useRef<Set<AnalyticsTab>>(new Set())
  const isFetching = useRef(false)
  const lastCurrencyKey = useRef<string>()

  useEffect(() => {
    const fetchTabData = async () => {
      if (!context.accessToken || isFetching.current) return

      // Clear cache when currency changes
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
        const tabData: Partial<IrmAnalyticsData> = {}

        // Fetch only the data for the active tab (LAZY LOADING!)
        switch (activeTab) {
          case 'overview': {
            // Overview now uses dedicated useOverviewData hook - no query needed here!
            break
          }

          case 'leads': {
            // Leads data is now fully handled by dedicated aggregate-based hooks:
            // - useLeadsStaticData: KPIs, distributions, velocity
            // - useLeadsOverTime: lifecycle chart data
            // - useLeadsTrendData: KPI trend data
            // No query needed in this hook anymore!
            break
          }

          case 'accounts': {
            // Accounts data is now fully handled by dedicated aggregate-based hooks:
            // - useAccountsStaticData: KPIs, distributions, growth trends
            // - useAccountsOverTime: lifecycle chart data
            // No query needed in this hook anymore!
            break
          }

          case 'opportunities': {
            // Opportunities data is now fully handled by dedicated aggregate-based hooks:
            // - useOpportunitiesStaticData: KPIs, trends, velocity
            // - useOpportunitiesOverTime: lifecycle chart data
            // - useOpportunityTrendData: KPI trend data
            // - useOpportunitiesByStage: stage distribution
            // - useTopDeals: top opportunities
            // No query needed in this hook anymore!
            break
          }

          // Note: Contacts tab now uses dedicated hooks (useContactsStaticData + useContactsOverTime)
          // No need to fetch here anymore - data is fetched directly in AnalyticsView.tsx
        }

        // Cache the fetched tab data
        tabDataCache.current = { ...tabDataCache.current, ...tabData }
        fetchedTabs.current.add(activeTab)

        // Update the full data with cached tabs
        setData(tabDataCache.current)
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
    // Clear cache and refetch current tab
    tabDataCache.current = {}
    fetchedTabs.current.clear()
    setIsLoading(true)
  }, [])

  return {
    data: data as IrmAnalyticsData,
    isLoading,
    error,
    refetch
  }
}
