import React, { useState, useEffect, useCallback } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  AnalyticsLayout,
  AnalyticsTabKey
} from '@/common/components/common-relations/view-layouts/analytics-layout/AnalyticsLayout'
import {
  getInitialAnalyticsTab,
  updateAnalyticsTabUrl,
  initializeAnalyticsTabUrl,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/utils/analyticsViewHelpers'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useOpportunitiesOverTime } from './hooks/useOpportunitiesOverTime'
import { useOpportunitiesByStage } from './hooks/useOpportunitiesByStage'
import { useContactsOverTime } from './hooks/useContactsOverTime'
import { useContactsStaticData } from './hooks/useContactsStaticData'
import { useContactInsights } from './hooks/useContactInsights'
import { useContactQualityData } from './hooks/useContactQualityData'
import { useTopRevenueEarners } from './hooks/useTopRevenueEarners'
import { useCrmAnalyticsData } from './hooks/useCrmAnalyticsData'
import { useRevenueTrends } from './hooks/useRevenueTrends'
import { usePipelineHealth } from './hooks/usePipelineHealth'
import { useActivityHeatmap } from './hooks/useActivityHeatmap'
import { usePipelines } from './hooks/usePipelines'
import { useOpportunityVelocityData } from './hooks/useOpportunityVelocityData'
import { useDealHealthData } from './hooks/useDealHealthData'
import { useLeadsTrendData } from './hooks/useLeadsTrendData'
import { useLeadsOverTime } from './hooks/useLeadsOverTime'
import { useLeadsStaticData } from './hooks/useLeadsStaticData'
import { useAccountsStaticData } from './hooks/useAccountsStaticData'
import { useAccountsOverTime } from './hooks/useAccountsOverTime'
import { useOpportunitiesStaticData } from './hooks/useOpportunitiesStaticData'
import { useTopDeals } from './hooks/useTopDeals'

export interface AnalyticsViewProps extends BusinessAppContextProps {
  moduleColor?: string
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ moduleColor = 'default', ...context }) => {
  const [leadsTimeFilter, setLeadsTimeFilter] = useState<TimeFilter>('quarter')
  const [oppTimeFilter, setOppTimeFilter] = useState<TimeFilter>('quarter')
  const [contactsTimeFilter, setContactsTimeFilter] = useState<TimeFilter>('quarter')
  const [accountsTimeFilter, setAccountsTimeFilter] = useState<TimeFilter>('quarter')
  const [revenueTimeFilter, setRevenueTimeFilter] = useState<TimeFilter>('sixMonths')
  // Separate pipeline filters for different charts to avoid cross-triggering queries
  const [revenuePipelineId, setRevenuePipelineId] = useState<string | undefined>(undefined)
  const [healthPipelineId, setHealthPipelineId] = useState<string | undefined>(undefined)
  const [oppLifecyclePipelineId, setOppLifecyclePipelineId] = useState<string | undefined>(undefined)
  const [selectedStagePipelineId, setSelectedStagePipelineId] = useState<string | undefined>(undefined)

  // Currency filters for analytics
  const [kpiCurrency, setKpiCurrency] = useState('EUR') // Master currency
  const [revenueCurrency, setRevenueCurrency] = useState('EUR')
  const [topPerformersCurrency, setTopPerformersCurrency] = useState('EUR')
  const [accountsCurrency, setAccountsCurrency] = useState('EUR') // Currency for Accounts tab
  const [opportunitiesKpiCurrency, setOpportunitiesKpiCurrency] = useState('EUR') // Master currency for Opportunities tab
  const [topDealsCurrency, setTopDealsCurrency] = useState('EUR') // Currency for Top Opportunities table

  // Reset chart currencies when master KPI currency changes
  useEffect(() => {
    setRevenueCurrency(kpiCurrency)
    setTopPerformersCurrency(kpiCurrency)
  }, [kpiCurrency])

  // Reset top deals currency when opportunities KPI currency changes
  useEffect(() => {
    setTopDealsCurrency(opportunitiesKpiCurrency)
  }, [opportunitiesKpiCurrency])

  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<AnalyticsTabKey>(getInitialAnalyticsTab())

  const handleAnalyticsTabChange = useCallback((tab: AnalyticsTabKey) => {
    setActiveAnalyticsTab(tab)
    updateAnalyticsTabUrl(tab)
  }, [])

  // Initialize URL on mount if not present
  useEffect(() => {
    initializeAnalyticsTabUrl(activeAnalyticsTab)
  }, []) // Run only on mount

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const newTab = getInitialAnalyticsTab()
      setActiveAnalyticsTab(newTab)
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [getInitialAnalyticsTab])

  // Fetch available currencies
  const { currencies: currencyOptions } = useAvailableCurrencies(context, {
    filters: {
      entity: 'Opportunity'
    },
    returnFormat: 'codes'
  })

  const availableCurrencies = currencyOptions as string[]

  // Fetch available pipelines for filtering (for Overview and Opportunities tabs)
  const { pipelines } = usePipelines(
    activeAnalyticsTab === 'overview' || activeAnalyticsTab === 'opportunities' ? context.accessToken : ''
  )

  // Contacts now uses same time filter types as Leads and Accounts

  // Data hooks - Pass active tab for lazy loading
  const { data, isLoading, error, refetch } = useCrmAnalyticsData(
    context,
    activeAnalyticsTab, // Only fetch data for active tab (Overview only)
    kpiCurrency
  )

  // Only fetch data for active tab - conditional data fetching
  // Overview tab data
  const kpiTrendData = activeAnalyticsTab === 'overview' ? data?.overviewTrendData || null : null
  const geographicData = activeAnalyticsTab === 'overview' ? data?.overviewGeographicData || [] : []

  const { revenueTrends, isLoading: revenueLoading } = useRevenueTrends(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    revenueTimeFilter,
    revenuePipelineId,
    revenueCurrency
  )
  const { pipelineHealth, isLoading: pipelineHealthLoading } = usePipelineHealth(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    healthPipelineId
  )
  const { activityData: activityHeatmap, isLoading: activityLoading } = useActivityHeatmap(
    activeAnalyticsTab === 'overview' ? context.accessToken : ''
  )
  const { contacts: topRevenueContacts } = useTopRevenueEarners(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    topPerformersCurrency
  )

  // Leads tab data
  // KPI trend data uses fixed 'month' period (current month vs last month) - independent of chart filter
  const { trendData: leadsTrendData, isLoading: leadsTrendLoading } = useLeadsTrendData(
    activeAnalyticsTab === 'leads' ? context.accessToken : '',
    'month' // Fixed period for KPIs - don't use leadsTimeFilter
  )
  // Combined static leads data (source, rating, status, velocity) - single query
  const { data: leadsStaticData, isLoading: leadsStaticLoading } = useLeadsStaticData(
    activeAnalyticsTab === 'leads' ? context.accessToken : ''
  )

  // Accounts static data (KPIs + trends) - single query
  const { data: accountsStaticData, isLoading: accountsStaticLoading } = useAccountsStaticData(
    activeAnalyticsTab === 'accounts' ? context.accessToken : ''
  )

  // Accounts lifecycle chart data - dynamic time filter
  const { accountsOverTime: accountsLifecycleData, isLoading: accountsLifecycleLoading } = useAccountsOverTime(
    activeAnalyticsTab === 'accounts' ? context.accessToken : '',
    accountsTimeFilter
  )

  // Lifecycle chart data uses dynamic time filter selected by user
  // Pass statusCatalogCodes from leadsStaticData to avoid duplicate catalog fetch
  const { leadsOverTime: leadsLifecycleData, isLoading: leadsLifecycleLoading } = useLeadsOverTime(
    activeAnalyticsTab === 'leads' ? context.accessToken : '',
    leadsTimeFilter,
    leadsStaticData?.statusCatalogCodes
  )

  // Accounts tab data (no additional hooks needed - data comes from useCrmAnalyticsData)

  // Opportunities tab data
  // Static KPIs with 30-day trends
  const { data: opportunitiesStaticData, isLoading: opportunitiesStaticLoading } = useOpportunitiesStaticData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    opportunitiesKpiCurrency
  )
  const { data: oppVelocityData } = useOpportunityVelocityData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : ''
  )
  const { data: oppHealthData } = useDealHealthData(activeAnalyticsTab === 'opportunities' ? context.accessToken : '')
  const { data: oppLifecycleData } = useOpportunitiesOverTime(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    oppTimeFilter,
    oppLifecyclePipelineId
  )
  const { data: oppStageData } = useOpportunitiesByStage(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    selectedStagePipelineId
  )
  const { data: topDealsData } = useTopDeals(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    topDealsCurrency
  )

  // Contacts tab static data (KPIs)
  const { data: contactsStaticData, isLoading: contactsStaticLoading } = useContactsStaticData(
    activeAnalyticsTab === 'contacts' ? context.accessToken : ''
  )

  // Contacts lifecycle chart data - dynamic time filter
  const { contactsOverTime: contactsLifecycleData, isLoading: contactsLifecycleLoading } = useContactsOverTime(
    activeAnalyticsTab === 'contacts' ? context.accessToken : '',
    contactsTimeFilter
  )

  const { data: contactInsights } = useContactInsights(activeAnalyticsTab === 'contacts' ? context.accessToken : '')
  const { data: contactQuality } = useContactQualityData(activeAnalyticsTab === 'contacts' ? context.accessToken : '')

  // Initialize selectedStagePipelineId to first pipeline when pipelines are loaded
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedStagePipelineId) {
      setSelectedStagePipelineId(pipelines[0].id)
    }
  }, [pipelines, selectedStagePipelineId])

  if (isLoading) {
    return (
      <div
        data-testid="crm-analytics-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
      >
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">Loading CRM Analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="crm-analytics-error"
        className="gba:min-h-screen gba:p-6 gba:flex gba:items-center gba:justify-center"
      >
        <div className="gba:max-w-lg gba:w-full">
          <Alert variant="destructive" className="gba:shadow-lg">
            <AlertTitle>Error Loading Analytics</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </div>
      </div>
    )
  }

  // Prepare Overview Props - Always show tab
  const overviewProps = {
    title: 'CRM Overview',
    counts: data?.overview?.totalCounts || { leads: 0, accounts: 0, opportunities: 0, contacts: 0 },
    conversionMetrics: data?.overview?.conversionMetrics || {
      leadToOpportunityRate: 0,
      opportunityWinRate: 0,
      avgDealSize: 0,
      salesCycleLength: 0 // Now represents Total Won Revenue (filtered by kpiCurrency)
    },
    trendData: kpiTrendData || null,
    trendLoading: false,
    pipelines: pipelines || [],
    revenuePipelineId: revenuePipelineId,
    onRevenuePipelineChange: setRevenuePipelineId,
    revenueTimeFilter: revenueTimeFilter,
    onRevenueTimeFilterChange: setRevenueTimeFilter,
    revenueTrends: revenueTrends || [],
    revenueLoading: revenueLoading,
    healthPipelineId: healthPipelineId,
    onHealthPipelineChange: setHealthPipelineId,
    pipelineHealth: {
      data: pipelineHealth,
      isLoading: pipelineHealthLoading
    },
    geographicDistribution: {
      data: geographicData || [],
      isLoading: isLoading
    },
    activityHeatmap: {
      data: activityHeatmap || [],
      isLoading: activityLoading
    },
    topPerformers: topRevenueContacts.map(contact => ({
      employeeId: contact.id,
      employeeName: `${contact.firstName} ${contact.lastName}`,
      dealsWon: contact.wonOpportunities,
      totalValue: contact.totalRevenue
    })),
    kpiCurrency,
    onKpiCurrencyChange: setKpiCurrency,
    availableCurrencies,
    revenueCurrency,
    onRevenueCurrencyChange: setRevenueCurrency,
    topPerformersCurrency,
    onTopPerformersCurrencyChange: setTopPerformersCurrency
  }

  // Prepare Leads Props - Always show tab
  const leadsProps = {
    title: 'Leads Analytics',
    totalLeads: leadsStaticData?.totalLeads || 0,
    conversionRate: leadsStaticData?.conversionRate || 0,
    avgTimeToConversion: leadsStaticData?.avgTimeToConversion || 0,
    trendData: leadsTrendData || null,
    trendLoading: leadsTrendLoading,
    leadsOverTime: leadsLifecycleData || [],
    leadsOverTimeLoading: leadsLifecycleLoading,
    selectedTimeFilter: leadsTimeFilter,
    onTimeFilterChange: setLeadsTimeFilter,
    leadsBySource: (leadsStaticData?.leadsBySource || []).map(x => ({
      source: x.source,
      count: x.count,
      percentage: x.percentage,
      conversionRate: x.conversionRate
    })),
    leadsBySourceLoading: leadsStaticLoading,
    leadsByStatus: (leadsStaticData?.leadsByStatus || []).map(x => ({ status: x.status, count: x.count })),
    leadsByStatusLoading: leadsStaticLoading,
    topOwners: (leadsStaticData?.topOwners || []).map(o => ({
      employeeId: o.employeeId,
      employeeName: o.employeeName,
      leadCount: o.leadCount,
      conversionRate: o.conversionRate
    })),
    leadsByRating: (leadsStaticData?.leadsByRating || []).map(r => ({
      rating: r.rating,
      count: r.count,
      percentage: r.percentage
    })),
    leadsByRatingLoading: leadsStaticLoading,
    highQualityPercentage: leadsStaticData?.highQualityPercentage || 0,
    // Lead velocity data from combined static data
    velocityData: leadsStaticData
      ? {
          avgTimeToConversion: leadsStaticData.avgTimeToConversion,
          conversionRate: leadsStaticData.conversionRate,
          volumeTrend: leadsStaticData.volumeTrend,
          velocityTrendData: leadsStaticData.velocityTrendData
        }
      : null,
    velocityLoading: leadsStaticLoading
  }

  // Prepare Accounts Props - Always show tab
  const accountsProps = {
    title: 'Accounts Analytics',
    totalAccounts: accountsStaticData?.totalAccounts || 0,
    accountsWithOpportunities: accountsStaticData?.accountsWithOpportunities || 0,
    avgOpportunitiesPerAccount: accountsStaticData?.avgOpportunitiesPerAccount || 0,
    trendData: accountsStaticData
      ? {
          currentMonthAccounts: accountsStaticData.last30DaysAccounts,
          previousMonthAccounts: accountsStaticData.previous30DaysAccounts,
          currentMonthOpportunities: 0, // Not tracked at account level
          previousMonthOpportunities: 0, // Not tracked at account level
          currentMonthAccountsWithOpportunities: accountsStaticData.last30DaysAccountsWithOpportunities,
          previousMonthAccountsWithOpportunities: accountsStaticData.previous30DaysAccountsWithOpportunities
        }
      : null,
    trendLoading: accountsStaticLoading,
    accountsOverTime: accountsLifecycleData || [],
    accountsOverTimeLoading: accountsLifecycleLoading,
    selectedTimeFilter: accountsTimeFilter,
    onTimeFilterChange: setAccountsTimeFilter,
    accountsByIndustry: accountsStaticData?.accountsByIndustry || [],
    accountsBySize: accountsStaticData?.accountsBySize || [],
    topAccounts: accountsStaticData?.topAccounts || [],
    monthlyGrowthTrend: accountsStaticData?.monthlyGrowthTrend || [],
    growthLoading: accountsStaticLoading,
    healthLoading: accountsStaticLoading,
    selectedCurrency: accountsCurrency,
    onCurrencyChange: setAccountsCurrency,
    availableCurrencies: availableCurrencies
  }

  // Prepare Opportunities Props - Always show tab
  const opportunitiesProps = {
    title: 'Opportunities Analytics',
    totalOpportunities: opportunitiesStaticData?.totalOpportunities || 0,
    totalValue: opportunitiesStaticData?.totalValue || 0,
    winRate: opportunitiesStaticData?.winRate || 0,
    avgDealSize: opportunitiesStaticData?.avgDealSize || 0,
    avgSalesCycle: opportunitiesStaticData?.avgOpportunityValue || 0,
    pipelineVelocity: opportunitiesStaticData?.pipelineVelocity || 0,
    trendData: opportunitiesStaticData
      ? {
          totalOpportunitiesLastMonth: opportunitiesStaticData.previous30DaysOpportunities,
          previousPeriodPipelineValue: opportunitiesStaticData.previous30DaysTotalValue,
          actualWinRateThisMonth:
            opportunitiesStaticData.last30DaysWonOpportunities > 0
              ? (opportunitiesStaticData.last30DaysWonOpportunities / opportunitiesStaticData.last30DaysOpportunities) *
                100
              : 0,
          actualWinRateLastMonth:
            opportunitiesStaticData.previous30DaysWonOpportunities > 0
              ? (opportunitiesStaticData.previous30DaysWonOpportunities /
                  opportunitiesStaticData.previous30DaysOpportunities) *
                100
              : 0,
          actualAvgDealSizeThisMonth:
            opportunitiesStaticData.last30DaysWonOpportunities > 0
              ? opportunitiesStaticData.last30DaysTotalValue / opportunitiesStaticData.last30DaysWonOpportunities
              : 0,
          actualAvgDealSizeLastMonth:
            opportunitiesStaticData.previous30DaysWonOpportunities > 0
              ? opportunitiesStaticData.previous30DaysTotalValue /
                opportunitiesStaticData.previous30DaysWonOpportunities
              : 0,
          actualAvgSalesCycleLastMonth: opportunitiesStaticData.previous30DaysAvgOpportunityValue,
          currentPeriodOpportunities: opportunitiesStaticData.last30DaysOpportunities,
          previousPeriodOpportunities: opportunitiesStaticData.previous30DaysOpportunities,
          actualConversionRateThisMonth: opportunitiesStaticData.last30DaysConversionRate,
          actualConversionRateLastMonth: opportunitiesStaticData.previous30DaysConversionRate
        }
      : null,
    trendLoading: opportunitiesStaticLoading,
    lifecycleData: (oppLifecycleData || []).map(d => ({
      date: d.date,
      opportunitiesCreated: d.opportunitiesCreated,
      opportunitiesWon: d.opportunitiesWon
    })),
    pipelines: pipelines || [],
    selectedPipelineId: oppLifecyclePipelineId,
    onPipelineChange: (id: string) => setOppLifecyclePipelineId(id === 'all' ? undefined : id),
    selectedTimeFilter: oppTimeFilter,
    onTimeFilterChange: setOppTimeFilter,
    opportunitiesByStage: (oppStageData || []).map(s => ({ stage: s.stage, count: s.count, value: s.value })),
    selectedStagePipelineId: selectedStagePipelineId,
    onStagePipelineChange: (id: string | undefined) => setSelectedStagePipelineId(id),
    topDeals: topDealsData,
    velocityData: oppVelocityData || null,
    dealHealthData: oppHealthData || null,
    kpiCurrency: opportunitiesKpiCurrency,
    onKpiCurrencyChange: setOpportunitiesKpiCurrency,
    topDealsCurrency: topDealsCurrency,
    onTopDealsCurrencyChange: setTopDealsCurrency,
    availableCurrencies: availableCurrencies
  }

  // Prepare Contacts Props - Always show tab (matches Leads/Accounts pattern)
  const contactsProps = {
    title: 'Contacts Analytics',
    totalContacts: contactsStaticData?.totalContacts || 0,
    thisMonth: contactsStaticData?.last30DaysContacts || 0,
    lastMonth: contactsStaticData?.previous30DaysContacts || 0,
    growth: contactsStaticData?.previous30DaysContacts
      ? Math.round(
          ((contactsStaticData.last30DaysContacts - contactsStaticData.previous30DaysContacts) /
            contactsStaticData.previous30DaysContacts) *
            100
        )
      : 0,
    totalLastMonth: contactsStaticData?.totalAtPreviousPeriodEnd || 0,
    totalGrowth: contactsStaticData?.totalAtPreviousPeriodEnd
      ? Math.round(
          ((contactsStaticData.totalContacts - contactsStaticData.totalAtPreviousPeriodEnd) /
            contactsStaticData.totalAtPreviousPeriodEnd) *
            100
        )
      : 0,
    trendLoading: contactsStaticLoading,
    selectedTimeFilter: contactsTimeFilter,
    onTimeFilterChange: setContactsTimeFilter,
    contactsOverTime: contactsLifecycleData || [],
    contactsOverTimeLoading: contactsLifecycleLoading,
    topAccountsByContacts: contactInsights?.topAccountsByContacts || [],
    recentContacts: contactInsights?.recentContacts || [],
    insightsData: {
      totalContacts: contactInsights?.totalContacts || 0,
      contactsByType: contactInsights?.contactsByType || [],
      contactsByAccount: contactInsights?.topAccountsByContacts || [],
      recentContacts: contactInsights?.recentContacts || []
    },
    qualityData: contactQuality || undefined,
    avgPerAccount:
      contactsStaticData?.totalAccounts && contactsStaticData.totalAccounts > 0
        ? Math.round((contactsStaticData.totalContacts / contactsStaticData.totalAccounts) * 10) / 10
        : 0,
    avgPerAccountLastMonth:
      contactsStaticData?.totalAccounts && contactsStaticData.totalAccounts > 0
        ? Math.round((contactsStaticData.totalAtPreviousPeriodEnd / contactsStaticData.totalAccounts) * 10) / 10
        : 0
  }

  // Note: Customer Relations includes campaigns, but this would need to be extended in AnalyticsLayout
  // For now, we'll use the AnalyticsLayout as-is and can extend it later for campaigns

  return (
    <div data-testid="crm-analytics" className="gba:h-full gba:p-6">
      <AnalyticsLayout
        defaultTab={activeAnalyticsTab}
        onTabChange={handleAnalyticsTabChange}
        overviewProps={overviewProps}
        leadsProps={leadsProps}
        accountsProps={accountsProps}
        opportunitiesProps={opportunitiesProps}
        contactsProps={contactsProps}
        moduleColor={moduleColor}
      />
    </div>
  )
}

export default AnalyticsView
