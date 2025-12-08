import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CrmAnalyticsData, OverviewAnalytics, OverviewTrendData } from '../types/analyticsTypes'
import { GET_OVERVIEW_ONLY_ANALYTICS } from '../queries/analyticsQueries'

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

        // Fetch only the data for the active tab
        // Note: Only Overview tab uses this hook now. Other tabs use dedicated hooks:
        // - Leads: useLeadsStaticData, useLeadsOverTime
        // - Accounts: useAccountsStaticData, useAccountsOverTime
        // - Opportunities: useOpportunitiesStaticData, useOpportunitiesOverTime, etc.
        // - Contacts: useContactsStaticData, useContactsOverTime
        switch (activeTab) {
          case 'overview': {
            const overviewResponse = await graphqlClient.request(GET_OVERVIEW_ONLY_ANALYTICS(kpiCurrency))
            const { overview, trendData, geographicData } = transformOverviewOnlyData(overviewResponse)
            tabData.overview = overview
            tabData.overviewTrendData = trendData
            tabData.overviewGeographicData = geographicData
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

// Transform functions
const transformOverviewOnlyData = (
  response: any
): {
  overview: OverviewAnalytics
  trendData: OverviewTrendData
  geographicData: Array<{ country: string; accounts: number }>
} => {
  // Calculate conversion metrics from aggregates only
  const totalLeads = response.LeadAggregate?.aggregate?.count || 0
  const totalOpportunities = response.OpportunityAggregate?.aggregate?.count || 0
  const wonOpportunitiesCount = response.WonOpportunities?.aggregate?.count || 0
  const totalWonRevenue = response.WonOpportunities?.aggregate?.sum?.estimatedAmount || 0

  // Last 30 days data
  const last30DaysLeads = response.Last30DaysLeads?.aggregate?.count || 0
  const last30DaysAccounts = response.Last30DaysAccounts?.aggregate?.count || 0
  const last30DaysOpportunities = response.Last30DaysOpportunities?.aggregate?.count || 0
  const last30DaysContacts = response.Last30DaysContacts?.aggregate?.count || 0
  const last30DaysWonOpportunities = response.Last30DaysWonOpportunities?.aggregate?.count || 0
  const last30DaysWonRevenue = response.Last30DaysWonOpportunities?.aggregate?.sum?.estimatedAmount || 0
  const last30DaysConvertedLeads = response.Last30DaysConvertedLeads?.aggregate?.count || 0

  // Previous 30 days data
  const previous30DaysLeads = response.Previous30DaysLeads?.aggregate?.count || 0
  const previous30DaysAccounts = response.Previous30DaysAccounts?.aggregate?.count || 0
  const previous30DaysOpportunities = response.Previous30DaysOpportunities?.aggregate?.count || 0
  const previous30DaysContacts = response.Previous30DaysContacts?.aggregate?.count || 0
  const previous30DaysWonOpportunities = response.Previous30DaysWonOpportunities?.aggregate?.count || 0
  const previous30DaysWonRevenue = response.Previous30DaysWonOpportunities?.aggregate?.sum?.estimatedAmount || 0
  const previous30DaysConvertedLeads = response.Previous30DaysConvertedLeads?.aggregate?.count || 0

  // Calculate conversion rates for last 30 days and previous 30 days
  const last30DaysLeadConversionRate = last30DaysLeads > 0 ? (last30DaysConvertedLeads / last30DaysLeads) * 100 : 0
  const previous30DaysLeadConversionRate =
    previous30DaysLeads > 0 ? (previous30DaysConvertedLeads / previous30DaysLeads) * 100 : 0

  const last30DaysAvgDealSize = last30DaysWonOpportunities > 0 ? last30DaysWonRevenue / last30DaysWonOpportunities : 0
  const previous30DaysAvgDealSize =
    previous30DaysWonOpportunities > 0 ? previous30DaysWonRevenue / previous30DaysWonOpportunities : 0

  // Process geographic distribution data
  // Note: Query uses distinctOn(accountId, countryRef) to fetch only unique account-country pairs
  // This reduces data transfer significantly (e.g., 10,000 addresses → 2,000 unique pairs)
  const accountAddresses = response.accountAddresses || []
  const countryMap = new Map<string, Set<string>>()

  // Group unique account IDs by country
  accountAddresses.forEach((address: any) => {
    const country = address.country?.value
    const accountId = address.accountId
    if (country && accountId) {
      if (!countryMap.has(country)) {
        countryMap.set(country, new Set())
      }
      countryMap.get(country)!.add(accountId) // Set handles any remaining duplicates
    }
  })

  const geographicData = Array.from(countryMap.entries())
    .map(([country, accountIds]) => ({ country, accounts: accountIds.size }))
    .sort((a, b) => b.accounts - a.accounts)
    .slice(0, 5) // Top 5 countries

  const result = {
    overview: {
      totalCounts: {
        leads: totalLeads,
        accounts: response.AccountAggregate?.aggregate?.count || 0,
        opportunities: totalOpportunities,
        contacts: response.ContactAggregate?.aggregate?.count || 0
      },
      recentActivity: {
        // These would require full record queries, so we set them to 0 for overview-only
        newLeadsThisWeek: 0,
        convertedLeadsThisWeek: 0,
        newAccountsThisWeek: 0,
        accountsWithWonOpportunitiesThisWeek: 0,
        newOpportunitiesThisWeek: 0,
        wonOpportunitiesThisWeek: 0,
        newContactsThisWeek: 0,
        contactsRelatedToWonAccountsThisWeek: 0
      },
      conversionMetrics: {
        leadToOpportunityRate: totalLeads > 0 ? Math.round((totalOpportunities / totalLeads) * 100) : 0,
        opportunityWinRate: totalOpportunities > 0 ? Math.round((wonOpportunitiesCount / totalOpportunities) * 100) : 0,
        avgDealSize: wonOpportunitiesCount > 0 ? Math.round(totalWonRevenue / wonOpportunitiesCount) : 0,
        salesCycleLength: totalWonRevenue // Now represents Total Won Revenue instead of sales cycle days
      },
      topPerformers: [] // Will be populated by useTopRevenueEarners hook
    },
    trendData: {
      // Last 30 days vs Previous 30 days for entity counts
      totalLeadsThisMonth: last30DaysLeads,
      totalLeadsLastMonth: previous30DaysLeads,
      totalAccountsThisMonth: last30DaysAccounts,
      totalAccountsLastMonth: previous30DaysAccounts,
      totalOpportunitiesThisMonth: last30DaysOpportunities,
      totalOpportunitiesLastMonth: previous30DaysOpportunities,
      totalContactsThisMonth: last30DaysContacts,
      totalContactsLastMonth: previous30DaysContacts,

      // Won opportunities trend
      currentMonthWonOpportunities: last30DaysWonOpportunities,
      previousMonthWonOpportunities: previous30DaysWonOpportunities,

      // Conversion metrics trend
      currentMonthLeadConversionRate: last30DaysLeadConversionRate,
      previousMonthLeadConversionRate: previous30DaysLeadConversionRate,
      currentMonthAvgDealSize: last30DaysAvgDealSize,
      previousMonthAvgDealSize: previous30DaysAvgDealSize,
      currentMonthSalesCycleLength: last30DaysWonRevenue,
      previousMonthSalesCycleLength: previous30DaysWonRevenue,

      // Additional fields for compatibility
      currentMonthLeads: last30DaysLeads,
      previousMonthLeads: previous30DaysLeads,
      currentMonthAccounts: last30DaysAccounts,
      previousMonthAccounts: previous30DaysAccounts,
      currentMonthOpportunities: last30DaysOpportunities,
      previousMonthOpportunities: previous30DaysOpportunities
    },
    geographicData
  }

  return result
}

// transformAccountsData removed - Accounts tab now uses useAccountsStaticData and useAccountsOverTime hooks directly
// transformOpportunitiesData removed - Opportunities tab now uses useOpportunitiesStaticData hook directly
// transformContactsData removed - Contacts tab now uses useContactsOverTime hook directly

// All account-related helper functions removed - now handled in useAccountsStaticData hook:
// - groupByField
// - groupAccountsBySize
// - createAccountLifecycleTimeSeriesData

// All lead-related helper functions removed - now handled in useLeadsStaticData hook:
// - createLeadLifecycleTimeSeriesData
// - extractTopLeadOwners

// All opportunity-related helper functions removed - now handled in useOpportunitiesStaticData hook:
// - groupByFieldWithValue
// - createTimeSeriesData
// - createTimeSeriesDataWithValue
// - calculateConversionRate
// - calculateWinRate
// - calculateWinRateLastMonth
// - calculateAvgDealSize
// - calculateSalesCycleLength
// - calculatePipelineVelocity

// All contact-related helper functions removed:
// - extractTopContactOwners
