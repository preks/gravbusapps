import { useState, useEffect, useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  IrmAnalyticsData,
  // OverviewAnalytics, // REMOVED: Handled by useOverviewData hook
  // OverviewTrendData, // REMOVED: Handled by useOverviewData hook
  // LeadsAnalytics, // REMOVED: Handled by useLeadsStaticData hook
  // AccountsAnalytics, // REMOVED: Handled by useAccountsStaticData hook
  // ContactsAnalytics, // REMOVED: Handled by useContactsStaticData hook
  OpportunitiesAnalytics
} from '../types/analyticsTypes'
import {
  // GET_IRM_OVERVIEW_ONLY_ANALYTICS, // REMOVED: Overview data now handled by useOverviewData hook
  // GET_LEADS_ANALYTICS, // REMOVED: Leads data now handled by dedicated aggregate hooks
  // GET_ACCOUNTS_ANALYTICS, // REMOVED: Accounts data now handled by dedicated aggregate hooks
  // GET_CONTACTS_ANALYTICS, // REMOVED: Contacts data now handled by useContactsStaticData + useContactsOverTime hooks
  GET_OPPORTUNITIES_ANALYTICS
} from '../queries/analyticsQueries'

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
            const opportunitiesResponse = await graphqlClient.request(GET_OPPORTUNITIES_ANALYTICS(kpiCurrency))
            tabData.opportunities = transformOpportunitiesData(opportunitiesResponse)
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

// transformOverviewOnlyData - REMOVED: Overview data now transformed in useGenericOverviewData hook
// All transformation logic moved to shared generic hook

// transformLeadsData - REMOVED: Replaced by aggregate-based hooks (useLeadsStaticData, useLeadsOverTime)

// transformAccountsData - REMOVED: Replaced by aggregate-based hooks (useAccountsStaticData, useAccountsOverTime)

const transformOpportunitiesData = (data: any): OpportunitiesAnalytics => {
  const opportunities = data.InvestmentOpportunity || []
  const totalOpportunities = data.InvestmentOpportunityAggregate?.aggregate?.count || 0
  const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0)

  // Group by stage
  const stageGroups = groupByFieldWithValue(opportunities, 'opportunityPipelineStage', 'value', 'estimatedAmount')
  const opportunitiesByStage = stageGroups.map(group => ({
    stage: group.key || 'Unknown',
    count: group.count,
    value: group.totalValue,
    percentage: totalOpportunities > 0 ? Math.round((group.count / totalOpportunities) * 100) : 0
  }))

  // Group by pipeline - need both ID and name for filtering
  type PipelineGroupType = { id: string; name: string; count: number; value: number }
  const pipelineGroupsMap = opportunities.reduce((acc: Map<string, PipelineGroupType>, opp: any) => {
    const pipelineId = opp.opportunityPipeline?.id || 'unknown'
    const pipelineName = opp.opportunityPipeline?.value || 'Unknown'

    if (!acc.has(pipelineId)) {
      acc.set(pipelineId, { id: pipelineId, name: pipelineName, count: 0, value: 0 })
    }
    const existing = acc.get(pipelineId)!
    existing.count += 1
    existing.value += opp.estimatedAmount || 0
    return acc
  }, new Map<string, PipelineGroupType>())

  const opportunitiesByPipeline = (Array.from(pipelineGroupsMap.values()) as PipelineGroupType[]).map(group => ({
    pipelineId: group.id,
    pipeline: group.name,
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
      stage: opp.opportunityPipelineStage?.value || 'Unknown',
      winChance: 0,
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

const calculateConversionRate = (leads: any, opportunities: any): number => {
  const totalLeads = leads.InvestmentLeadAggregate?.aggregate?.count || 0
  const totalOpportunities = opportunities.InvestmentOpportunityAggregate?.aggregate?.count || 0
  return totalLeads > 0 ? Math.round((totalOpportunities / totalLeads) * 100) : 0
}

const calculateWinRate = (opportunities: any): number => {
  const total = opportunities.InvestmentOpportunityAggregate?.aggregate?.count || 0
  const won = opportunities.WonOpportunities?.aggregate?.count || 0
  return total > 0 ? Math.round((won / total) * 100) : 0
}

const calculateWinRateLastMonth = (opportunities: any): number => {
  const total = opportunities.PreviousMonthOpportunities?.aggregate?.count || 0
  const won = opportunities.PreviousMonthWonOpportunities?.aggregate?.count || 0
  return total > 0 ? Math.round((won / total) * 100) : 0
}

const calculateAvgDealSize = (opportunities: any): number => {
  // Calculate average deal size using only WON opportunities
  const wonOpportunitiesCount = opportunities.WonOpportunities?.aggregate?.count || 0
  if (wonOpportunitiesCount === 0) return 0

  const totalWonValue = opportunities.WonOpportunitiesValue?.aggregate?.sum?.estimatedAmount || 0
  if (totalWonValue === 0) return 0
  return Math.round(totalWonValue / wonOpportunitiesCount)
}

const calculateSalesCycleLength = (opportunities: any): number => {
  const wonOpportunities = (opportunities.WonOpportunitiesAndWithCloseDate || []).filter(
    (opp: any) => opp.opportunityStatus?.code === 'WON' && opp.closeDate
  )

  if (wonOpportunities.length === 0) return 0

  const totalDays = wonOpportunities.reduce((sum: number, opp: any) => {
    const created = new Date(opp.createdAt)
    const closed = new Date(opp.closeDate)

    // Validate that closeDate is not before createdAt (data quality check)
    if (closed < created) {
      console.warn(
        `Opportunity ${opp.id} has closeDate (${opp.closeDate}) before createdAt (${opp.createdAt}). Skipping this opportunity.`
      )
      return sum // Skip this opportunity
    }

    const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    // Additional safety check - ensure days is not negative
    if (days < 0) {
      console.warn(`Opportunity ${opp.id} calculated negative days (${days}). Skipping this opportunity.`)
      return sum // Skip this opportunity
    }

    return sum + days
  }, 0)

  // Count only valid opportunities (those that passed validation)
  const validOpportunities = wonOpportunities.filter((opp: any) => {
    const created = new Date(opp.createdAt)
    const closed = new Date(opp.closeDate)
    return closed >= created
  })

  if (validOpportunities.length === 0) return 0

  return Math.round(totalDays / validOpportunities.length)
}

const calculatePipelineVelocity = (opportunities: any): number => {
  const opportunitiesList = opportunities.InvestmentOpportunity || []
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
