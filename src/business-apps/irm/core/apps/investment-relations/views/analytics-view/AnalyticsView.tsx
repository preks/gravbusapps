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
    revenuePipelineId: selectedPipelineId, // IRM uses single pipeline ID for revenue and health
    setRevenuePipelineId: setSelectedPipelineId,
    selectedStagePipelineId,
    setSelectedStagePipelineId,
    kpiCurrency,
    setKpiCurrency,
    revenueCurrency,
    accountsCurrency,
    setAccountsCurrency,
    opportunitiesKpiCurrency,
    setOpportunitiesKpiCurrency,
    topDealsCurrency,
    setTopDealsCurrency
  } = useAnalyticsState({
    defaultCurrency: 'EUR',
    defaultTimeFilter: 'quarter',
    enableTopPerformersCurrency: false // IRM doesn't have top performers
  })

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
  const { data: oppLifecycleData, isLoading: oppLifecycleLoading } = useOpportunitiesOverTime(
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
  const { data: oppVelocityData, isLoading: oppVelocityLoading } = useOpportunityVelocityData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : ''
  )
  const { data: oppHealthData, isLoading: oppHealthLoading } = useDealHealthData(
    activeAnalyticsTab === 'opportunities' ? context.accessToken : ''
  )
  const { data: oppStageData, isLoading: oppStageLoading } = useOpportunitiesByStage(
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

  const { data: contactInsights, isLoading: contactInsightsLoading } = useInvestmentContactInsights(
    activeAnalyticsTab === 'contacts' ? context.accessToken : ''
  )
  const { data: contactQuality, isLoading: contactQualityLoading } = useInvestmentContactQualityData(
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

  // Prepare Overview Props - Uses shared builder with IRM-specific config
  const transformedTrendData = overviewData?.overviewTrendData || null

  const overviewProps = buildOverviewProps(
    {
      overviewData,
      kpiTrendData: transformedTrendData,
      pipelines,
      revenuePipelineId: selectedPipelineId,
      onRevenuePipelineChange: setSelectedPipelineId,
      revenueTimeFilter,
      onRevenueTimeFilterChange: setRevenueTimeFilter,
      revenueTrends: revenueTrends || [],
      revenueLoading,
      pipelineHealth,
      pipelineHealthLoading,
      healthPipelineId: selectedPipelineId,
      onHealthPipelineChange: setSelectedPipelineId,
      geographicData: geographicData || [],
      geographicLoading: overviewLoading,
      activityHeatmap: activityHeatmap || [],
      activityLoading
    },
    {
      title: 'Investment Relations Overview',
      moduleColor,
      kpiLabels: IRM_KPI_LABELS,
      kpiVisibility: IRM_KPI_VISIBILITY,
      kpiCurrency,
      onKpiCurrencyChange: setKpiCurrency,
      availableCurrencies
    }
  )

  // Prepare leads props - Use shared builder with IRM-specific config
  const leadsProps = buildLeadsProps(
    {
      leadsStaticData,
      leadsTrendData,
      leadsTrendLoading,
      leadsStaticLoading,
      leadsOverTime: leadsOverTime || [],
      leadsOverTimeLoading,
      leadsTimeFilter,
      onLeadsTimeFilterChange: setLeadsTimeFilter
    },
    {
      title: 'Investment Leads Analytics',
      moduleColor
    }
  )

  // Prepare accounts props - Always define to show tab
  const accountsProps = buildAccountsProps(
    {
      accountsStaticData,
      accountsStaticLoading,
      accountsOverTime: accountsOverTime || [],
      accountsOverTimeLoading: accountsLifecycleLoading,
      accountsTimeFilter,
      onAccountsTimeFilterChange: setAccountsTimeFilter,
      accountsCurrency,
      onAccountsCurrencyChange: setAccountsCurrency,
      availableCurrencies
    },
    {
      title: 'Accounts Analytics',
      showTopAccounts: false
    }
  )

  // Prepare opportunities props - Use aggregate-based data like CRM
  const opportunitiesProps = buildOpportunitiesProps(
    {
      opportunitiesStaticData,
      opportunitiesStaticLoading,
      oppTrendData, // IRM uses dedicated trend hook
      oppLifecycleData: oppLifecycleData || [],
      oppLifecycleLoading,
      oppTimeFilter,
      onOppTimeFilterChange: setOppTimeFilter,
      pipelines,
      selectedPipelineId,
      onPipelineChange: (id: string) => setSelectedPipelineId(id === 'all' ? undefined : id),
      oppStageData: oppStageData || [],
      oppStageLoading,
      selectedStagePipelineId,
      onStagePipelineChange: (id: string | undefined) => setSelectedStagePipelineId(id),
      topDeals: [],
      velocityData: oppVelocityData || null,
      velocityLoading: oppVelocityLoading,
      dealHealthData: oppHealthData || null,
      dealHealthLoading: oppHealthLoading,
      kpiCurrency: opportunitiesKpiCurrency,
      onKpiCurrencyChange: setOpportunitiesKpiCurrency,
      topDealsCurrency,
      onTopDealsCurrencyChange: setTopDealsCurrency,
      availableCurrencies
    },
    {
      title: 'Opportunities Analytics',
      showTopDeals: false,
      useTrendData: true // IRM uses dedicated trend hook
    }
  )

  // Prepare contacts props - Always define to show tab
  const contactsProps = buildContactsProps(
    {
      contactsStaticData,
      contactsStaticLoading,
      contactsOverTime: contactsLifecycleData || [],
      contactsOverTimeLoading: contactsLifecycleLoading,
      contactsTimeFilter,
      onContactsTimeFilterChange: setContactsTimeFilter,
      contactInsights,
      contactInsightsLoading,
      contactQuality,
      contactQualityLoading
    },
    {
      title: 'Contacts Analytics',
      module: 'irm'
    }
  )

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
