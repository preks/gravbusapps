import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CrmAnalyticsData, OverviewAnalytics, AccountsAnalytics, OpportunitiesAnalytics } from '../types/analyticsTypes'
import {
  GET_OVERVIEW_ONLY_ANALYTICS,
  GET_ACCOUNTS_ANALYTICS,
  GET_OPPORTUNITIES_ANALYTICS
} from '../queries/analyticsQueries'

type AnalyticsTab = 'overview' | 'leads' | 'accounts' | 'opportunities' | 'contacts'

export const useCrmAnalyticsData = (
  context: BusinessAppContextProps,
  activeTab: AnalyticsTab,
  kpiCurrency?: string,
  accountsCurrency?: string,
  opportunitiesCurrency?: string
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

      // Clear cache when currencies change
      const currencyKey = `${kpiCurrency}-${accountsCurrency}-${opportunitiesCurrency}`
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
        switch (activeTab) {
          case 'overview': {
            const overviewResponse = await graphqlClient.request(GET_OVERVIEW_ONLY_ANALYTICS(kpiCurrency))
            const { overview, trendData, geographicData } = transformOverviewOnlyData(overviewResponse)
            tabData.overview = overview
            tabData.overviewTrendData = trendData
            tabData.overviewGeographicData = geographicData
            break
          }

          case 'leads': {
            // No longer needed - all leads data now comes from useLeadsStaticData hook
            break
          }

          case 'accounts': {
            const [accountsResponse, opportunitiesResponse] = await Promise.all([
              graphqlClient.request(GET_ACCOUNTS_ANALYTICS, {}),
              graphqlClient.request(GET_OPPORTUNITIES_ANALYTICS(accountsCurrency || kpiCurrency))
            ])
            tabData.accounts = transformAccountsData(accountsResponse, opportunitiesResponse)
            break
          }

          case 'opportunities': {
            const opportunitiesResponse = await graphqlClient.request(
              GET_OPPORTUNITIES_ANALYTICS(opportunitiesCurrency || kpiCurrency)
            )
            tabData.opportunities = transformOpportunitiesData(opportunitiesResponse)
            break
          }

          // Contacts tab uses useContactsOverTime hook directly in AnalyticsView.tsx
          // No need to fetch via useCrmAnalyticsData
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
  }, [activeTab, context.accessToken, graphqlClient, kpiCurrency, accountsCurrency, opportunitiesCurrency])

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
  trendData: any
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

  return {
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
}

const transformAccountsData = (data: any, opportunitiesData: any): AccountsAnalytics => {
  const accounts = data.Account || []
  // Use OpportunityForAccounts for accounts tab (accounts currency filtered)
  const opportunities = opportunitiesData.OpportunityForAccounts || []
  const totalAccounts = data.AccountAggregate?.aggregate?.count || 0

  // Group by industry - show top 5 and aggregate rest
  const industryGroups = groupByField(accounts, 'industry', 'value')
  const sortedIndustryGroups = industryGroups
    .map(group => ({
      industry: group.key || 'Unknown',
      count: group.count,
      percentage: totalAccounts > 0 ? Math.round((group.count / totalAccounts) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)

  const top5Industries = sortedIndustryGroups.slice(0, 5)
  const restIndustries = sortedIndustryGroups.slice(5)

  const accountsByIndustry = [...top5Industries]

  // Add "Rest" category if there are more than 5 industries
  if (restIndustries.length > 0) {
    const restCount = restIndustries.reduce((sum, group) => sum + group.count, 0)
    const restPercentage = totalAccounts > 0 ? Math.round((restCount / totalAccounts) * 100) : 0
    accountsByIndustry.push({
      industry: 'Rest',
      count: restCount,
      percentage: restPercentage
    })
  }

  // Group by size (number of employees)
  const accountsBySize = groupAccountsBySize(accounts)

  // Create account lifecycle time series data (full year like leads)
  const accountsOverTime = createAccountLifecycleTimeSeriesData(accounts)

  // Calculate top accounts by revenue (won opportunities only)
  const accountRevenueMap = new Map()

  // Group opportunities by accountId and calculate revenue from won opportunities
  opportunities.forEach((opp: any) => {
    const accountId = opp.accountId || opp.account?.id
    if (accountId) {
      if (!accountRevenueMap.has(accountId)) {
        accountRevenueMap.set(accountId, {
          opportunities: [],
          totalValue: 0,
          revenue: 0,
          wonOpportunities: 0
        })
      }
      const accountData = accountRevenueMap.get(accountId)
      accountData.opportunities.push(opp)
      accountData.totalValue += opp.estimatedAmount || 0

      // Calculate revenue from won opportunities only
      if (opp.opportunityStatus?.code === 'WON' || opp.opportunityStatus?.value?.toLowerCase().includes('won')) {
        accountData.revenue += opp.estimatedAmount || 0
        accountData.wonOpportunities += 1
      }
    }
  })

  // Create top accounts list ranked by revenue
  const topAccounts = accounts
    .map((acc: any) => {
      const oppData = accountRevenueMap.get(acc.id) || {
        opportunities: [],
        totalValue: 0,
        revenue: 0,
        wonOpportunities: 0
      }
      return {
        id: acc.id,
        name: acc.name,
        industry: acc.industry?.value || 'Unknown',
        opportunityCount: oppData.opportunities.length,
        totalValue: oppData.revenue, // Use revenue instead of total estimated amount
        revenue: oppData.revenue,
        wonOpportunities: oppData.wonOpportunities
      }
    })
    .filter((acc: any) => acc.revenue > 0) // Only accounts with won opportunities (revenue > 0)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10)

  const accountsWithOpportunities = data.accountWithOpportunities.aggregate.count || 0
  const totalOpportunities = opportunities.length

  return {
    totalAccounts,
    accountsByIndustry,
    accountsBySize,
    accountsOverTime,
    topAccounts,
    accountsWithOpportunities,
    avgOpportunitiesPerAccount:
      accountsWithOpportunities > 0 ? Math.round((totalOpportunities / accountsWithOpportunities) * 100) / 100 : 0
  }
}

const transformOpportunitiesData = (data: any): OpportunitiesAnalytics => {
  const opportunities = data.Opportunity || []
  const totalOpportunities = data.OpportunityForOpportunitiesTab?.aggregate?.count || 0
  const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0)

  // Group by stage
  const stageGroups = groupByFieldWithValue(opportunities, 'salesPipelineStage', 'value', 'estimatedAmount')
  const opportunitiesByStage = stageGroups.map(group => ({
    stage: group.key || 'Unknown',
    count: group.count,
    value: group.totalValue,
    percentage: totalOpportunities > 0 ? Math.round((group.count / totalOpportunities) * 100) : 0
  }))

  // Group by pipeline - include pipeline ID for filtering
  const pipelineGroupsMap = opportunities.reduce((acc: any, opp: any) => {
    const pipelineId = opp.salesPipeline?.id || 'unknown'
    const pipelineName = opp.salesPipeline?.value || 'Unknown'
    if (!acc[pipelineId]) {
      acc[pipelineId] = { pipelineId, pipeline: pipelineName, count: 0, value: 0 }
    }
    acc[pipelineId].count += 1
    acc[pipelineId].value += opp.estimatedAmount || 0
    return acc
  }, {})
  const opportunitiesByPipeline = Object.values(pipelineGroupsMap).map((group: any) => ({
    pipelineId: group.pipelineId,
    pipeline: group.pipeline,
    count: group.count,
    value: group.value,
    percentage: totalOpportunities > 0 ? Math.round((group.count / totalOpportunities) * 100) : 0
  }))

  // Create time series data
  const opportunitiesOverTime = createTimeSeriesDataWithValue(opportunities, 'createdAt', 'estimatedAmount')

  // Top deals
  const topDeals = opportunities
    .sort((a: any, b: any) => (b.estimatedAmount || 0) - (a.estimatedAmount || 0))
    .slice(0, 10)
    .map((opp: any) => ({
      id: opp.id,
      name: opp.name,
      value: opp.estimatedAmount || 0,
      stage: opp.salesPipelineStage?.value || 'Unknown',
      winChance: opp.winningChance || 0,
      owner:
        opp.ownerEmployee?.displayName || `${opp.ownerEmployee?.firstName} ${opp.ownerEmployee?.lastName}` || 'Unknown',
      currencyCode: opp.currency?.code || 'EUR'
    }))

  return {
    totalOpportunities,
    totalValue,
    opportunitiesByStage,
    opportunitiesByPipeline,
    opportunitiesOverTime,
    winRate: calculateWinRate(data),
    winRateLastMonthOpportunities: calculateWinRateLastMonth(data),
    avgDealSize: calculateAvgDealSize(data),
    avgSalesCycle: calculateSalesCycleLength(data),
    conversionRate: calculateConversionRate(data, data), // Using opportunities data for both leads and opportunities
    pipelineVelocity: calculatePipelineVelocity(data),
    topDeals
  }
}

// transformContactsData removed - Contacts tab now uses useContactsOverTime hook directly

// Helper functions
const groupByField = (items: any[], field: string, subField?: string) => {
  const groups = items.reduce((acc, item) => {
    const value = subField ? item[field]?.[subField] : item[field]
    const key = value || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(groups).map(([key, count]) => ({
    key,
    count: count as number
  }))
}

const groupByFieldWithValue = (items: any[], field: string, subField: string, valueField: string) => {
  const groups = items.reduce((acc, item) => {
    const key = item[field]?.[subField] || 'Unknown'
    if (!acc[key]) {
      acc[key] = { count: 0, totalValue: 0 }
    }
    acc[key].count += 1
    acc[key].totalValue += item[valueField] || 0
    return acc
  }, {})

  return Object.entries(groups).map(([key, data]) => ({
    key,
    count: (data as any).count,
    totalValue: (data as any).totalValue
  }))
}

const groupAccountsBySize = (accounts: any[]) => {
  const sizeRanges = [
    { label: '1-10', min: 1, max: 10 },
    { label: '11-50', min: 11, max: 50 },
    { label: '51-200', min: 51, max: 200 },
    { label: '201-1000', min: 201, max: 1000 },
    { label: '1000+', min: 1001, max: Infinity }
  ]

  return sizeRanges.map(range => {
    const count = accounts.filter(acc => {
      const empCount = parseInt(acc.numberOfEmployees?.value || '0')
      return empCount >= range.min && empCount <= range.max
    }).length

    return {
      sizeRange: range.label,
      count,
      percentage: accounts.length > 0 ? Math.round((count / accounts.length) * 100) : 0
    }
  })
}

// createTimeSeriesData removed - no longer needed

const createAccountLifecycleTimeSeriesData = (accounts: any[]) => {
  // Always generate daily data for the past year (same as leads)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - 1) // Always go back 1 year for daily data

  const periodMap = new Map<
    string,
    {
      accountsCreated: number
      accountsWithOpportunities: number
      accountsActive: number
      count: number
    }
  >()

  // Generate daily periods for the entire year
  const generateDailyPeriods = () => {
    const current = new Date(startDate)

    while (current <= endDate) {
      const periodKey = current.toISOString().split('T')[0]
      periodMap.set(periodKey, {
        accountsCreated: 0,
        accountsWithOpportunities: 0,
        accountsActive: 0,
        count: 0
      })
      current.setDate(current.getDate() + 1)
    }
  }

  generateDailyPeriods()

  // Helper function to get period key from date (always daily now)
  const getPeriodKey = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toISOString().split('T')[0]
  }

  // Process accounts data
  accounts.forEach((account: any) => {
    const accountDate = new Date(account.createdAt)

    // Only process accounts within our date range
    if (accountDate >= startDate && accountDate <= endDate) {
      // Track accounts created
      const createdPeriodKey = getPeriodKey(account.createdAt)
      const createdPeriod = periodMap.get(createdPeriodKey)
      if (createdPeriod) {
        createdPeriod.accountsCreated += 1
        createdPeriod.count += 1 // For backward compatibility

        // Simulate accounts with opportunities and active accounts
        // In real implementation, this would be based on actual relationship data
        createdPeriod.accountsWithOpportunities += Math.random() > 0.3 ? 1 : 0 // ~70% chance
        createdPeriod.accountsActive += Math.random() > 0.15 ? 1 : 0 // ~85% chance
      }
    }
  })

  // Return sorted periods
  return Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      date: period,
      count: data.count,
      accountsCreated: data.accountsCreated,
      accountsWithOpportunities: data.accountsWithOpportunities,
      accountsActive: data.accountsActive
    }))
}

// createLeadLifecycleTimeSeriesData removed - now using separate useLeadsOverTime hook with GraphQL aggregates

const createTimeSeriesDataWithValue = (items: any[], dateField: string, valueField: string) => {
  const groups = items.reduce((acc, item) => {
    const date = new Date(item[dateField]).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { count: 0, value: 0 }
    }
    acc[date].count += 1
    acc[date].value += item[valueField] || 0
    return acc
  }, {})

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30) // Last 30 days
    .map(([date, data]) => ({
      date,
      count: (data as any).count,
      value: (data as any).value
    }))
}

// extractTopLeadOwners removed - now handled in useLeadsStaticData hook

// extractTopContactOwners removed - no longer needed

const calculateConversionRate = (leads: any, opportunities: any): number => {
  const totalLeads = leads.LeadAggregate?.aggregate?.count || 0
  const totalOpportunities = opportunities.OpportunityAggregate?.aggregate?.count || 0
  return totalLeads > 0 ? Math.round((totalOpportunities / totalLeads) * 100) : 0
}

const calculateWinRate = (opportunities: any): number => {
  const total = opportunities.OpportunityAggregate?.aggregate?.count || 0
  const won = opportunities.WonOpportunities?.aggregate?.count || 0
  return total > 0 ? Math.round((won / total) * 100) : 0
}

const calculateWinRateLastMonth = (opportunities: any): number => {
  const total = opportunities.PreviousMonthOpportunities?.aggregate?.count || 0
  const won = opportunities.PreviousMonthWonOpportunities?.aggregate?.count || 0
  return total > 0 ? Math.round((won / total) * 100) : 0
}

const calculateAvgDealSize = (opportunities: any): number => {
  const opportunitiesList = opportunities.OpportunityAggregate?.aggregate?.count || 0
  if (opportunitiesList === 0) return 0

  const totalValue = opportunities.totalEstimatedAmount?.aggregate?.sum?.estimatedAmount || 0
  if (totalValue === 0) return 0
  return Math.round(totalValue / opportunitiesList)
}

const calculateSalesCycleLength = (opportunities: any): number => {
  const wonOpportunities = (opportunities.WonOpportunitiesAndWithCloseDate || []).filter(
    (opp: any) => opp.opportunityStatus?.code === 'WON' && opp.closeDate
  )

  if (wonOpportunities.length === 0) return 0

  const totalDays = wonOpportunities.reduce((sum: number, opp: any) => {
    const created = new Date(opp.createdAt)
    const closed = new Date(opp.closeDate)
    const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return sum + days
  }, 0)

  return Math.round(totalDays / wonOpportunities.length)
}

const calculatePipelineVelocity = (opportunities: any): number => {
  const opportunitiesList = opportunities.Opportunity || []
  if (opportunitiesList.length === 0) return 0

  const totalDays = opportunitiesList.reduce((sum: number, opp: any) => {
    const created = new Date(opp.createdAt)
    const updated = new Date(opp.updatedAt)
    const daysDiff = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    // Skip invalid dates
    if (Number.isNaN(daysDiff)) {
      return sum
    }

    // Use Math.max to ensure non-negative values
    return sum + Math.max(0, daysDiff)
  }, 0)

  return Math.round(totalDays / opportunitiesList.length)
}
