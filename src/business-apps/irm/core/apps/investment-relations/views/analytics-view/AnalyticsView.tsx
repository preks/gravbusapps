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
import { useOpportunitiesStaticData } from './hooks/useOpportunitiesStaticData'
import { useOpportunitiesOverTime } from './hooks/useOpportunitiesOverTime'
import { useOpportunityTrendData } from './hooks/useOpportunityTrendData'
import { useOpportunitiesByStage } from './hooks/useOpportunitiesByStage'
import { useContactsStaticData } from './hooks/useContactsStaticData'
import { useContactsOverTime } from './hooks/useContactsOverTime'
import { useContactInsights as useInvestmentContactInsights } from './hooks/useContactInsights'
import { useContactQualityData as useInvestmentContactQualityData } from './hooks/useContactQualityData'
import { useIrmAnalyticsData } from './hooks/useIrmAnalyticsData'
import { useOverviewData } from './hooks/useOverviewData'
import { useLeadsTrendData } from './hooks/useLeadsTrendData'
import { useLeadsStaticData } from './hooks/useLeadsStaticData'
import { useLeadsOverTime } from './hooks/useLeadsOverTime'
import { useAccountsStaticData } from './hooks/useAccountsStaticData'
import { useAccountsOverTime } from './hooks/useAccountsOverTime'
import { useRevenueTrends } from './hooks/useRevenueTrends'
import { usePipelineHealth } from './hooks/usePipelineHealth'
import { useActivityHeatmap } from './hooks/useActivityHeatmap'
import { usePipelines } from './hooks/usePipelines'
import { IRM_KPI_LABELS, IRM_KPI_VISIBILITY } from './config/kpiConfig'

import { useOpportunityVelocityData } from './hooks/useOpportunityVelocityData'
import { useDealHealthData } from './hooks/useDealHealthData'

export interface AnalyticsViewProps extends BusinessAppContextProps {
  moduleColor?: string
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ moduleColor = 'default', ...context }) => {
  const [leadsTimeFilter, setLeadsTimeFilter] = useState<TimeFilter>('quarter')
  const [accountsTimeFilter, setAccountsTimeFilter] = useState<TimeFilter>('quarter')
  const [oppTimeFilter, setOppTimeFilter] = useState<TimeFilter>('quarter')
  const [contactsTimeFilter, setContactsTimeFilter] = useState<TimeFilter>('quarter')
  const [revenueTimeFilter, setRevenueTimeFilter] = useState<TimeFilter>('sixMonths')
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  const [selectedStagePipelineId, setSelectedStagePipelineId] = useState<string | undefined>(undefined)

  const [kpiCurrency, setKpiCurrency] = useState('EUR') // Master currency
  const [revenueCurrency, setRevenueCurrency] = useState('EUR')
  const [accountsCurrency, setAccountsCurrency] = useState('EUR') // Currency for Accounts tab
  const [opportunitiesKpiCurrency, setOpportunitiesKpiCurrency] = useState('EUR') // Master currency for Opportunities tab
  const [topDealsCurrency, setTopDealsCurrency] = useState('EUR') // Currency for Top Opportunities table

  useEffect(() => {
    setRevenueCurrency(kpiCurrency)
  }, [kpiCurrency])

  useEffect(() => {
    setTopDealsCurrency(opportunitiesKpiCurrency)
  }, [opportunitiesKpiCurrency])

  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<AnalyticsTabKey>(getInitialAnalyticsTab())

  const handleAnalyticsTabChange = useCallback((tab: AnalyticsTabKey) => {
    setActiveAnalyticsTab(tab)
    updateAnalyticsTabUrl(tab)
  }, [])

  useEffect(() => {
    initializeAnalyticsTabUrl(activeAnalyticsTab)
  }, [])

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
      entity: 'InvestmentOpportunity'
    },
    returnFormat: 'codes'
  })

  const availableCurrencies = currencyOptions as string[]

  // Fetch pipelines from catalog
  const { pipelines } = usePipelines(context.accessToken)

  // Overview tab - Use dedicated hook
  const { data: overviewData, isLoading: overviewLoading } = useOverviewData(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    kpiCurrency
  )

  // Legacy hook - kept for backward compatibility (can be removed once all tabs use dedicated hooks)
  const { isLoading, error, refetch } = useIrmAnalyticsData(
    context,
    activeAnalyticsTab, // NEW: Lazy loading based on active tab
    kpiCurrency
  )

  // )
  const { revenueTrends, isLoading: revenueLoading } = useRevenueTrends(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    revenueTimeFilter,
    selectedPipelineId,
    revenueCurrency
  )
  const { pipelineHealth, isLoading: pipelineHealthLoading } = usePipelineHealth(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    selectedPipelineId
  )
  const { activityData: activityHeatmap, isLoading: activityLoading } = useActivityHeatmap(
    activeAnalyticsTab === 'overview' ? context.accessToken : ''
  )
  // Geographic data now comes from useOverviewData (shared generic hook)
  const geographicData = activeAnalyticsTab === 'overview' ? overviewData?.overviewGeographicData || [] : []

  // Leads tab hooks - Use aggregate-based hooks instead of full-record query
  const { data: leadsStaticData, isLoading: leadsStaticLoading } = useLeadsStaticData(
    activeAnalyticsTab === 'leads' ? context.accessToken : ''
  )
  const { trendData: leadsTrendData, isLoading: leadsTrendLoading } = useLeadsTrendData(
    activeAnalyticsTab === 'leads' ? context.accessToken : '',
    'month' // Fixed period for KPI trends - don't use leadsTimeFilter
  )
  const { leadsOverTime, isLoading: leadsOverTimeLoading } = useLeadsOverTime(
    activeAnalyticsTab === 'leads' ? context.accessToken : '',
    leadsTimeFilter,
    leadsStaticData?.statusCatalogCodes // Pass status codes to avoid duplicate catalog fetch
  )

  // Accounts tab hooks - Use aggregate-based hooks (lazy loaded like CRM)
  const { data: accountsStaticData, isLoading: accountsStaticLoading } = useAccountsStaticData(
    activeAnalyticsTab === 'accounts' ? context.accessToken : ''
  )
  const { accountsOverTime, isLoading: accountsLifecycleLoading } = useAccountsOverTime(
    activeAnalyticsTab === 'accounts' ? context.accessToken : '',
    accountsTimeFilter
  )

  // Opportunities tab hooks - Use aggregate-based hooks like CRM
  const { data: opportunitiesStaticData, isLoading: opportunitiesStaticLoading } = useOpportunitiesStaticData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    opportunitiesKpiCurrency
  )
  const { data: oppLifecycleData } = useOpportunitiesOverTime(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    oppTimeFilter,
    selectedPipelineId
  )
  const { trendData: oppTrendData } = useOpportunityTrendData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    'quarter',
    undefined,
    opportunitiesKpiCurrency
  )
  const { data: oppVelocityData } = useOpportunityVelocityData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : ''
  )
  const { data: oppHealthData } = useDealHealthData(activeAnalyticsTab === 'opportunities' ? context.accessToken : '')
  const { data: oppStageData } = useOpportunitiesByStage(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    selectedStagePipelineId
  )

  // Contacts tab hooks - using new generic hooks
  const { data: contactsStaticData, isLoading: contactsStaticLoading } = useContactsStaticData(
    activeAnalyticsTab === 'contacts' ? context.accessToken : ''
  )

  const { contactsOverTime: contactsLifecycleData, isLoading: contactsLifecycleLoading } = useContactsOverTime({
    accessToken: activeAnalyticsTab === 'contacts' ? context.accessToken : '',
    timeFilter: contactsTimeFilter
  })

  const { data: contactInsights } = useInvestmentContactInsights(
    activeAnalyticsTab === 'contacts' ? context.accessToken : ''
  )
  const { data: contactQuality } = useInvestmentContactQualityData(
    activeAnalyticsTab === 'contacts' ? context.accessToken : ''
  )

  // Initialize selectedStagePipelineId to first pipeline if not set
  useEffect(() => {
    if (pipelines.length > 0 && !selectedStagePipelineId) {
      setSelectedStagePipelineId(pipelines[0].id)
    }
  }, [pipelines.length])

  if (isLoading) {
    return (
      <div
        data-testid="irm-analytics-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
      >
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">Loading IRM Analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="irm-analytics-error"
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

  // Trend data comes from useOverviewData hook
  const transformedTrendData = overviewData?.overviewTrendData || null

  const overviewProps = {
    title: 'Investment Relations Overview',
    moduleColor,

    // Required: Core KPIs
    counts: overviewData?.overview?.totalCounts || { leads: 0, accounts: 0, opportunities: 0, contacts: 0 },
    conversionMetrics: {
      leadToOpportunityRate: overviewData?.overview?.conversionMetrics?.leadToOpportunityRate || 0,
      opportunityWinRate: overviewData?.overview?.conversionMetrics?.opportunityWinRate || 0,
      avgDealSize: overviewData?.overview?.conversionMetrics?.avgDealSize || 0,
      totalWonRevenue: overviewData?.overview?.conversionMetrics?.totalWonRevenue || 0,
      salesCycleLength: overviewData?.overview?.conversionMetrics?.salesCycleLength || 0 // Default to 0 if not provided
    },
    trendData: transformedTrendData,
    trendLoading: false,

    // IRM-specific: Custom KPI labels (investment terminology)
    kpiLabels: IRM_KPI_LABELS,
    kpiVisibility: IRM_KPI_VISIBILITY,

    // Required: Revenue trends
    pipelines: pipelines,
    revenuePipelineId: selectedPipelineId,
    onRevenuePipelineChange: setSelectedPipelineId,
    revenueTimeFilter: revenueTimeFilter,
    onRevenueTimeFilterChange: setRevenueTimeFilter,
    revenueTrends: revenueTrends || [],
    revenueLoading: revenueLoading,

    // Optional: Pipeline Health (can be removed by not passing it)
    pipelineHealth: {
      data: pipelineHealth,
      isLoading: pipelineHealthLoading
    },
    healthPipelineId: selectedPipelineId,
    onHealthPipelineChange: setSelectedPipelineId,

    // Optional: Geographic Distribution (can be removed by not passing it)
    geographicDistribution: {
      data: geographicData || [],
      isLoading: overviewLoading
    },

    // Optional: Activity Timeline (can be removed by not passing it)
    activityHeatmap: {
      data: activityHeatmap || [],
      isLoading: activityLoading
    },

    // Currency filters
    kpiCurrency,
    onKpiCurrencyChange: setKpiCurrency,
    availableCurrencies,
    revenueCurrency,
    onRevenueCurrencyChange: setRevenueCurrency
  }

  // Prepare leads props - Use aggregate-based data from useLeadsStaticData
  const leadsProps = {
    title: 'Investment Leads Analytics',
    moduleColor,

    // Required: Core KPIs from aggregate hook
    totalLeads: leadsStaticData?.totalLeads || 0,
    conversionRate: leadsStaticData?.conversionRate || 0,
    avgTimeToConversion: leadsStaticData?.avgTimeToConversion || 0,
    trendData: leadsTrendData || null,
    trendLoading: leadsTrendLoading || leadsStaticLoading,

    // Required: Lead Lifecycle Chart - from useLeadsOverTime hook (triggered by time filter)
    leadsOverTime: leadsOverTime,
    leadsOverTimeLoading: leadsOverTimeLoading,
    selectedTimeFilter: leadsTimeFilter,
    onTimeFilterChange: setLeadsTimeFilter,

    // Optional: Lead Velocity Analysis - use aggregate data
    velocityData: leadsStaticData
      ? {
          avgTimeToConversion: leadsStaticData.avgTimeToConversion,
          conversionRate: leadsStaticData.conversionRate,
          volumeTrend: 0, // Can calculate from velocity data if needed
          velocityTrendData: leadsStaticData.velocityData
        }
      : undefined,
    velocityLoading: leadsStaticLoading,

    // Optional: Lead Quality Matrix - use aggregate data
    leadQualityMatrix: leadsStaticData
      ? {
          leadsBySource: leadsStaticData.leadsBySource,
          isLoading: leadsStaticLoading
        }
      : undefined,

    // Optional: Lead Engagement Insights - use aggregate data
    leadEngagementInsights: leadsStaticData
      ? {
          leadsByRating: leadsStaticData.leadsByRating,
          leadHealthIndicators: [], // Can add health indicators if needed
          highQualityPercentage: leadsStaticData.highQualityPercentage,
          isLoading: leadsStaticLoading
        }
      : undefined,

    // Optional: Distribution Charts - use aggregate data
    leadsBySource: leadsStaticData?.leadsBySource,
    leadsBySourceLoading: leadsStaticLoading,
    leadsByStatus: leadsStaticData?.leadsByStatus,
    leadsByStatusLoading: leadsStaticLoading

    // Note: Top Lead Owners removed for IRM - not needed
  }

  // Prepare accounts props - Always define to show tab
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
    accountsOverTime: accountsOverTime || [],
    accountsOverTimeLoading: accountsLifecycleLoading,
    selectedTimeFilter: accountsTimeFilter,
    onTimeFilterChange: setAccountsTimeFilter,
    accountsByIndustry: accountsStaticData?.accountsByIndustry || [],
    accountsBySize: accountsStaticData?.accountsBySize || [],
    monthlyGrowthTrend: accountsStaticData?.monthlyGrowthTrend || [],
    growthLoading: accountsStaticLoading,
    healthLoading: accountsStaticLoading,
    selectedCurrency: accountsCurrency,
    onCurrencyChange: setAccountsCurrency,
    availableCurrencies: availableCurrencies,
    showTopAccounts: false // IRM doesn't show Top Accounts by Revenue section
  }

  // Prepare opportunities props - Use aggregate-based data like CRM
  const opportunitiesProps = {
    title: 'Opportunities Analytics',
    totalOpportunities: opportunitiesStaticData?.totalOpportunities || 0,
    totalValue: opportunitiesStaticData?.totalValue || 0,
    winRate: opportunitiesStaticData?.winRate || 0,
    avgDealSize: opportunitiesStaticData?.avgDealSize || 0,
    avgSalesCycle: opportunitiesStaticData?.avgOpportunityValue || 0, // Avg opportunity value for all opps
    pipelineVelocity: opportunitiesStaticData?.pipelineVelocity || 0,
    trendData: oppTrendData || null,
    trendLoading: opportunitiesStaticLoading,
    lifecycleData: (oppLifecycleData || []).map(d => ({
      date: d.date,
      opportunitiesCreated: d.opportunitiesCreated,
      opportunitiesWon: d.opportunitiesWon
    })),
    pipelines: pipelines, // From usePipelines hook
    selectedPipelineId: selectedPipelineId,
    onPipelineChange: (id: string) => setSelectedPipelineId(id === 'all' ? undefined : id),
    selectedTimeFilter: oppTimeFilter,
    onTimeFilterChange: setOppTimeFilter,
    opportunitiesByStage: (oppStageData || []).map(s => ({ stage: s.stage, count: s.count, value: s.value })),
    selectedStagePipelineId: selectedStagePipelineId,
    onStagePipelineChange: (id: string | undefined) => setSelectedStagePipelineId(id),
    topDeals: [], // IRM doesn't fetch or show top deals
    velocityData: oppVelocityData || null,
    dealHealthData: oppHealthData || null,
    kpiCurrency: opportunitiesKpiCurrency,
    onKpiCurrencyChange: setOpportunitiesKpiCurrency,
    topDealsCurrency: topDealsCurrency,
    onTopDealsCurrencyChange: setTopDealsCurrency,
    availableCurrencies: availableCurrencies,
    showTopDeals: false // IRM doesn't show Top Opportunities by Value section
  }

  // Prepare contacts props - Always define to show tab
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

  return (
    <div data-testid="irm-analytics" className="gba:h-full gba:p-6">
      <AnalyticsLayout
        defaultTab={activeAnalyticsTab}
        onTabChange={handleAnalyticsTabChange}
        moduleColor={moduleColor}
        overviewProps={overviewProps}
        leadsProps={leadsProps}
        accountsProps={accountsProps}
        opportunitiesProps={opportunitiesProps}
        contactsProps={contactsProps}
      />
    </div>
  )
}

export default AnalyticsView
