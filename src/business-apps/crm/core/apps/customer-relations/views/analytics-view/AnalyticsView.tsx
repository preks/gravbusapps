import React, { useEffect } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AnalyticsLayout } from '@/common/components/common-relations/view-layouts/analytics-layout/AnalyticsLayout'
import {
  buildAccountsProps,
  buildLeadsProps,
  buildOpportunitiesProps,
  buildContactsProps,
  buildOverviewProps
} from '@/common/components/common-relations/view-layouts/analytics-layout/utils/propBuilders'
import { useAnalyticsState } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useAnalyticsState'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useOpportunitiesOverTime } from './hooks/useOpportunitiesOverTime'
import { useOpportunitiesByStage } from './hooks/useOpportunitiesByStage'
import { useContactsOverTime } from './hooks/useContactsOverTime'
import { useContactsStaticData } from './hooks/useContactsStaticData'
import { useContactQualityData } from './hooks/useContactQualityData'
import { useContactsByContactType } from './hooks/useContactsByContactType'
import { useCrmAnalyticsData } from './hooks/useCrmAnalyticsData'
import { useOverviewData } from './hooks/useOverviewData'
import { useRevenueTrends } from './hooks/useRevenueTrends'
import { useActivityHeatmap } from './hooks/useActivityHeatmap'
import { usePipelines } from './hooks/usePipelines'
import { useOpportunityVelocityData } from './hooks/useOpportunityVelocityData'
import { useOpportunityStatusDistribution } from './hooks/useOpportunityStatusDistribution'
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
  // Shared state management hook - handles all tab state, filters, and currencies
  const {
    activeTab: activeAnalyticsTab,
    handleTabChange: handleAnalyticsTabChange,
    leadsTimeFilter,
    setLeadsTimeFilter,
    accountsTimeFilter,
    setAccountsTimeFilter,
    oppTimeFilter,
    setOppTimeFilter,
    contactsTimeFilter,
    setContactsTimeFilter,
    revenueTimeFilter,
    setRevenueTimeFilter,
    revenuePipelineId,
    setRevenuePipelineId,
    healthPipelineId: overviewStagePipelineId,
    setHealthPipelineId: setOverviewStagePipelineId,
    oppLifecyclePipelineId,
    setOppLifecyclePipelineId,
    selectedStagePipelineId,
    setSelectedStagePipelineId,
    kpiCurrency,
    setKpiCurrency,
    revenueCurrency,
    setRevenueCurrency,
    accountsCurrency,
    setAccountsCurrency,
    opportunitiesKpiCurrency,
    setOpportunitiesKpiCurrency,
    topDealsCurrency,
    setTopDealsCurrency
  } = useAnalyticsState({
    defaultCurrency: 'EUR',
    defaultTimeFilter: 'quarter'
  })

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
  const effectiveOverviewStagePipelineId = overviewStagePipelineId || pipelines?.[0]?.id

  // Overview tab - Use dedicated hook
  const { data: overviewData } = useOverviewData(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    kpiCurrency
  )

  // Legacy hook - kept for backward compatibility (can be removed once all tabs use dedicated hooks)
  const { isLoading, error, refetch } = useCrmAnalyticsData(
    context,
    activeAnalyticsTab, // Only fetch data for active tab (Overview only)
    kpiCurrency
  )

  // Overview tab data - get trend data from useOverviewData hook
  const kpiTrendData = activeAnalyticsTab === 'overview' ? overviewData?.overviewTrendData || null : null
  const { revenueTrends, isLoading: revenueLoading } = useRevenueTrends(
    activeAnalyticsTab === 'overview' ? context.accessToken : '',
    revenueTimeFilter,
    revenuePipelineId,
    revenueCurrency
  )
  const { data: overviewStageData, isLoading: overviewStageLoading } = useOpportunitiesByStage(
    activeAnalyticsTab === 'overview' && effectiveOverviewStagePipelineId ? context.accessToken : '',
    effectiveOverviewStagePipelineId,
    true
  )
  const { activityData: activityHeatmap, isLoading: activityLoading } = useActivityHeatmap(
    activeAnalyticsTab === 'overview' ? context.accessToken : ''
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
  const { data: oppFlowData, isLoading: oppFlowLoading } = useOpportunityVelocityData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : ''
  )
  const { data: oppStatusDistributionData, isLoading: oppStatusDistributionLoading } = useOpportunityStatusDistribution(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : ''
  )
  const { data: oppLifecycleData, isLoading: oppLifecycleLoading } = useOpportunitiesOverTime(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    oppTimeFilter,
    oppLifecyclePipelineId
  )
  const { data: oppStageData } = useOpportunitiesByStage(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : '',
    selectedStagePipelineId
  )
  const { data: topDealsData, isLoading: topDealsLoading } = useTopDeals(
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

  const { data: contactQuality, isLoading: contactQualityLoading } = useContactQualityData(
    activeAnalyticsTab === 'contacts' ? context.accessToken : ''
  )
  const { data: contactsByContactType, isLoading: contactsByContactTypeLoading } = useContactsByContactType(
    activeAnalyticsTab === 'contacts' ? context.accessToken : ''
  )

  // Initialize pipeline selectors to the first pipeline when pipelines are loaded.
  useEffect(() => {
    if (pipelines && pipelines.length > 0 && !selectedStagePipelineId) {
      setSelectedStagePipelineId(pipelines[0].id)
    }
    if (pipelines && pipelines.length > 0 && !overviewStagePipelineId) {
      setOverviewStagePipelineId(pipelines[0].id)
    }
  }, [pipelines, selectedStagePipelineId, overviewStagePipelineId])

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

  // Prepare Overview Props - Uses shared builder
  const overviewProps = buildOverviewProps(
    {
      overviewData,
      kpiTrendData,
      pipelines: pipelines || [],
      revenuePipelineId,
      onRevenuePipelineChange: setRevenuePipelineId,
      revenueTimeFilter,
      onRevenueTimeFilterChange: setRevenueTimeFilter,
      revenueTrends: revenueTrends || [],
      revenueLoading,
      openPipelineByStage: overviewStageData || [],
      openPipelineByStageLoading: overviewStageLoading,
      stagePipelineId: effectiveOverviewStagePipelineId,
      onStagePipelineChange: setOverviewStagePipelineId,
      activityHeatmap: activityHeatmap || [],
      activityLoading
    },
    {
      moduleColor,
      kpiCurrency,
      onKpiCurrencyChange: setKpiCurrency,
      revenueCurrency,
      onRevenueCurrencyChange: setRevenueCurrency,
      availableCurrencies
    }
  )

  const leadsProps = buildLeadsProps(
    {
      leadsStaticData,
      leadsTrendData,
      leadsTrendLoading,
      leadsStaticLoading,
      leadsOverTime: leadsLifecycleData || [],
      leadsOverTimeLoading: leadsLifecycleLoading,
      leadsTimeFilter,
      onLeadsTimeFilterChange: setLeadsTimeFilter
    },
    {
      title: 'Leads Analytics'
    }
  )

  // Prepare Accounts Props - Always show tab
  const accountsProps = buildAccountsProps(
    {
      accountsStaticData,
      accountsStaticLoading,
      accountsOverTime: accountsLifecycleData || [],
      accountsOverTimeLoading: accountsLifecycleLoading,
      accountsTimeFilter,
      onAccountsTimeFilterChange: setAccountsTimeFilter,
      accountsCurrency,
      onAccountsCurrencyChange: setAccountsCurrency,
      availableCurrencies
    },
    {
      title: 'Accounts Analytics'
    }
  )

  // Prepare Opportunities Props - Always show tab
  const opportunitiesProps = buildOpportunitiesProps(
    {
      opportunitiesStaticData,
      opportunitiesStaticLoading,
      oppLifecycleData: oppLifecycleData || [],
      oppLifecycleLoading,
      oppTimeFilter,
      onOppTimeFilterChange: setOppTimeFilter,
      pipelines: pipelines || [],
      selectedPipelineId: oppLifecyclePipelineId,
      onPipelineChange: (id: string) => setOppLifecyclePipelineId(id === 'all' ? undefined : id),
      oppStageData: oppStageData || [],
      selectedStagePipelineId,
      onStagePipelineChange: (id: string | undefined) => setSelectedStagePipelineId(id),
      topDeals: topDealsData,
      topDealsLoading,
      flowData: oppFlowData || null,
      flowLoading: oppFlowLoading,
      statusDistributionData: oppStatusDistributionData || [],
      statusDistributionLoading: oppStatusDistributionLoading,
      kpiCurrency: opportunitiesKpiCurrency,
      onKpiCurrencyChange: setOpportunitiesKpiCurrency,
      topDealsCurrency,
      onTopDealsCurrencyChange: setTopDealsCurrency,
      availableCurrencies
    },
    {
      title: 'Opportunities Analytics',
      showTopDeals: true,
      useTrendData: false // CRM calculates from static data
    }
  )

  // Prepare Contacts Props - Always show tab (matches Leads/Accounts pattern)
  const contactsProps = buildContactsProps(
    {
      contactsStaticData,
      contactsStaticLoading,
      contactsOverTime: contactsLifecycleData || [],
      contactsOverTimeLoading: contactsLifecycleLoading,
      contactsTimeFilter,
      onContactsTimeFilterChange: setContactsTimeFilter,
      contactQuality,
      contactQualityLoading,
      contactsByContactType,
      contactsByContactTypeLoading
    },
    {
      title: 'Contacts Analytics',
      module: 'crm'
    }
  )

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
