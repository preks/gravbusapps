/**
 * Shared prop builder functions for analytics tabs
 * These functions transform raw data from hooks into props for layout components
 * Used by both CRM and IRM to reduce code duplication
 */

import type React from 'react'
import type { TimeFilter } from './analyticsViewHelpers'
import type { AccountsStaticData as HookAccountsStaticData } from '../hooks/useGenericAccountsStaticData'
import type { LeadsTabKpiLabels } from '../leads/LeadsTabLayout'
import type { AccountsTabKpiLabels } from '../accounts/AccountsTabLayout'
import type { OpportunitiesTabKpiLabels } from '../opportunities/OpportunitiesTabLayout'
import type { ContactsTabKpiLabels } from '../contacts/ContactsTabLayout'

// ============================================================================
// OVERVIEW TAB BUILDER
// ============================================================================

export interface OverviewDataInput {
  overview?: {
    totalCounts?: { leads: number; accounts: number; opportunities: number; contacts: number }
    conversionMetrics?: {
      leadToOpportunityRate: number
      opportunityWinRate: number
      avgDealSize: number
      totalWonRevenue: number
      salesCycleLength?: number
    }
  }
  overviewTrendData?: any
  overviewGeographicData?: Array<{ country: string; countryId: string; accounts: number }>
}

export interface OverviewBuilderConfig {
  title?: string
  moduleColor?: string
  kpiLabels?: any // Accept any label object structure
  kpiVisibility?: any // Accept any visibility object structure
  kpiCurrency?: string
  onKpiCurrencyChange?: (currency: string) => void
  revenueCurrency?: string
  onRevenueCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
}

export interface OverviewBuilderData {
  overviewData: OverviewDataInput | null
  kpiTrendData: any
  pipelines: Array<{ id: string; name: string }>
  revenuePipelineId?: string
  onRevenuePipelineChange: (id: string | undefined) => void
  revenueTimeFilter: TimeFilter
  onRevenueTimeFilterChange: (filter: TimeFilter) => void
  revenueTrends: any[]
  revenueLoading: boolean
  openPipelineByStage?: any[]
  openPipelineByStageLoading?: boolean
  stagePipelineId?: string
  onStagePipelineChange?: (id: string | undefined) => void
  geographicData?: Array<{ country: string; countryId: string; accounts: number }>
  geographicLoading?: boolean
  activityHeatmap: any[]
  activityLoading: boolean
}

export function buildOverviewProps(data: OverviewBuilderData, config: OverviewBuilderConfig) {
  return {
    ...(config.title ? { title: config.title } : {}),
    moduleColor: config.moduleColor,

    // Core KPI metrics
    counts: data.overviewData?.overview?.totalCounts || { leads: 0, accounts: 0, opportunities: 0, contacts: 0 },
    conversionMetrics: {
      leadToOpportunityRate: data.overviewData?.overview?.conversionMetrics?.leadToOpportunityRate || 0,
      opportunityWinRate: data.overviewData?.overview?.conversionMetrics?.opportunityWinRate || 0,
      avgDealSize: data.overviewData?.overview?.conversionMetrics?.avgDealSize || 0,
      totalWonRevenue: data.overviewData?.overview?.conversionMetrics?.totalWonRevenue || 0,
      salesCycleLength: data.overviewData?.overview?.conversionMetrics?.salesCycleLength || 0
    },
    trendData: data.kpiTrendData || null,
    trendLoading: data.revenueLoading,

    // Optional: Custom KPI labels and visibility (IRM uses this)
    ...(config.kpiLabels && { kpiLabels: config.kpiLabels }),
    ...(config.kpiVisibility && { kpiVisibility: config.kpiVisibility }),

    // Revenue trends
    pipelines: data.pipelines || [],
    revenuePipelineId: data.revenuePipelineId,
    onRevenuePipelineChange: data.onRevenuePipelineChange,
    revenueTimeFilter: data.revenueTimeFilter,
    onRevenueTimeFilterChange: data.onRevenueTimeFilterChange,
    revenueTrends: data.revenueTrends || [],
    revenueLoading: data.revenueLoading,
    ...(config.revenueCurrency && { revenueCurrency: config.revenueCurrency }),
    ...(config.onRevenueCurrencyChange && { onRevenueCurrencyChange: config.onRevenueCurrencyChange }),

    // Optional: Open Pipeline by Stage
    ...(data.openPipelineByStage && {
      openPipelineByStage: {
        data: data.openPipelineByStage,
        isLoading: data.openPipelineByStageLoading
      },
      stagePipelineId: data.stagePipelineId,
      onStagePipelineChange: data.onStagePipelineChange
    }),

    // Geographic Distribution
    geographicDistribution: {
      data: data.geographicData || [],
      isLoading: data.geographicLoading ?? false
    },

    // Optional: Activity Timeline
    activityHeatmap: {
      data: data.activityHeatmap || [],
      isLoading: data.activityLoading
    },

    // Currency filters
    ...(config.kpiCurrency && { kpiCurrency: config.kpiCurrency }),
    ...(config.onKpiCurrencyChange && { onKpiCurrencyChange: config.onKpiCurrencyChange }),
    ...(config.availableCurrencies && { availableCurrencies: config.availableCurrencies })
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR LEADS TAB
// ============================================================================

// ============================================================================
// LEADS TAB BUILDER
// ============================================================================

export interface LeadsStaticData {
  totalLeads: number
  convertedLeads: number
  conversionRate: number
  avgTimeToConversion?: number
  leadsBySource?: Array<{
    source: string
    sourceRef?: string
    count: number
    percentage: number
    conversionRate?: number
  }>
  leadsByStatus?: Array<{ status: string; statusRef?: string; count: number }>
  leadsByRating?: Array<{ rating: string; count: number; percentage?: number; value?: number }>
  topOwners?: Array<{ employeeId: string; employeeName: string; leadCount: number; conversionRate?: number }>
  velocityData?: any[]
  qualityMatrix?: any[]
  highQualityPercentage?: number
}

export interface LeadsBuilderConfig {
  title: string
  moduleColor?: string
  kpiLabels?: LeadsTabKpiLabels
}

export interface LeadsBuilderData {
  leadsStaticData: LeadsStaticData | null
  leadsTrendData: any
  leadsTrendLoading: boolean
  leadsStaticLoading: boolean
  leadsOverTime: any[]
  leadsOverTimeLoading: boolean
  leadsTimeFilter: TimeFilter
  onLeadsTimeFilterChange: (filter: TimeFilter) => void
}

export function buildLeadsProps(data: LeadsBuilderData, config: LeadsBuilderConfig) {
  return {
    title: config.title,
    ...(config.moduleColor && { moduleColor: config.moduleColor }),

    // Core KPIs
    totalLeads: data.leadsStaticData?.totalLeads || 0,
    convertedLeads: data.leadsStaticData?.convertedLeads || 0,
    conversionRate: data.leadsStaticData?.conversionRate || 0,
    trendData: data.leadsTrendData || null,
    trendLoading: data.leadsTrendLoading || data.leadsStaticLoading,

    // Lead Lifecycle Chart
    leadsOverTime: data.leadsOverTime || [],
    leadsOverTimeLoading: data.leadsOverTimeLoading,
    selectedTimeFilter: data.leadsTimeFilter,
    onTimeFilterChange: data.onLeadsTimeFilterChange,

    // Distributions
    leadsBySource: (data.leadsStaticData?.leadsBySource || []).map(x => ({
      source: x.source,
      sourceRef: x.sourceRef,
      count: x.count,
      percentage: x.percentage,
      conversionRate: x.conversionRate
    })),
    leadsBySourceLoading: data.leadsStaticLoading || data.leadsOverTimeLoading,
    leadsByStatus: (data.leadsStaticData?.leadsByStatus || []).map(x => ({
      status: x.status,
      statusRef: x.statusRef,
      count: x.count
    })),
    leadsByStatusLoading: data.leadsStaticLoading || data.leadsOverTimeLoading,
    topOwners: (data.leadsStaticData?.topOwners || []).map(o => ({
      employeeId: o.employeeId,
      employeeName: o.employeeName,
      leadCount: o.leadCount,
      conversionRate: o.conversionRate || 0
    })),

    ...(config.kpiLabels && { kpiLabels: config.kpiLabels })
  }
}

// ============================================================================
// ACCOUNTS TAB BUILDER
// ============================================================================

// Use the actual type from the hook (re-export for convenience)
export type AccountsStaticData = HookAccountsStaticData

export interface AccountsBuilderConfig {
  title: string
  kpiLabels?: AccountsTabKpiLabels
}

export interface AccountsBuilderData {
  accountsStaticData: AccountsStaticData | null
  accountsStaticLoading: boolean
  accountsOverTime: any[]
  accountsOverTimeLoading: boolean
  accountsTimeFilter: TimeFilter
  onAccountsTimeFilterChange: (filter: TimeFilter) => void
  accountsCurrency?: string
  onAccountsCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
}

export function buildAccountsProps(data: AccountsBuilderData, config: AccountsBuilderConfig) {
  return {
    title: config.title,

    // Core KPIs
    totalAccounts: data.accountsStaticData?.totalAccounts || 0,
    accountsWithOpportunities: data.accountsStaticData?.accountsWithOpportunities || 0,
    avgOpportunitiesPerAccount: data.accountsStaticData?.avgOpportunitiesPerAccount || 0,

    // Trend data
    trendData: data.accountsStaticData
      ? {
          currentMonthAccounts: data.accountsStaticData.last30DaysAccounts,
          previousMonthAccounts: data.accountsStaticData.previous30DaysAccounts,
          currentMonthOpportunities: 0,
          previousMonthOpportunities: 0,
          currentMonthAccountsWithOpportunities: data.accountsStaticData.last30DaysAccountsWithOpportunities,
          previousMonthAccountsWithOpportunities: data.accountsStaticData.previous30DaysAccountsWithOpportunities
        }
      : null,
    trendLoading: data.accountsStaticLoading,

    // Lifecycle chart
    accountsOverTime: data.accountsOverTime || [],
    accountsOverTimeLoading: data.accountsOverTimeLoading,
    selectedTimeFilter: data.accountsTimeFilter,
    onTimeFilterChange: data.onAccountsTimeFilterChange,

    monthlyGrowthTrend: data.accountsStaticData?.monthlyGrowthTrend || [],
    growthLoading: data.accountsStaticLoading || data.accountsOverTimeLoading,

    // Currency filter
    ...(data.accountsCurrency && { selectedCurrency: data.accountsCurrency }),
    ...(data.onAccountsCurrencyChange && { onCurrencyChange: data.onAccountsCurrencyChange }),
    ...(data.availableCurrencies && { availableCurrencies: data.availableCurrencies }),

    ...(config.kpiLabels && { kpiLabels: config.kpiLabels })
  }
}

// ============================================================================
// OPPORTUNITIES TAB BUILDER
// ============================================================================

export interface OpportunitiesStaticData {
  totalOpportunities: number
  totalValue: number
  wonOpportunities: number
  winRate: number
  avgDealSize: number
  avgOpportunityValue: number
  last30DaysOpportunities?: number
  previous30DaysOpportunities?: number
  last30DaysTotalValue?: number
  previous30DaysTotalValue?: number
  last30DaysWonOpportunities?: number
  previous30DaysWonOpportunities?: number
  previous30DaysAvgOpportunityValue?: number
  last30DaysConversionRate?: number
  previous30DaysConversionRate?: number
}

export interface OpportunitiesBuilderConfig {
  title: string
  showTopDeals?: boolean
  useTrendData?: boolean // If true, use oppTrendData param; if false, calculate from static data
  kpiLabels?: OpportunitiesTabKpiLabels
}

export interface OpportunitiesBuilderData {
  opportunitiesStaticData: OpportunitiesStaticData | null
  opportunitiesStaticLoading: boolean
  oppTrendData?: any // IRM uses dedicated trend hook
  oppLifecycleData: any[]
  oppLifecycleLoading?: boolean
  oppTimeFilter: TimeFilter
  onOppTimeFilterChange: (filter: TimeFilter) => void
  pipelines: Array<{ id: string; name: string }>
  selectedPipelineId?: string
  onPipelineChange: (id: string) => void
  oppStageData: Array<{ stage: string; count: number; value: number }>
  oppStageLoading?: boolean
  selectedStagePipelineId?: string
  onStagePipelineChange?: (id: string | undefined) => void
  topDeals?: any[]
  topDealsLoading?: boolean
  flowData?: any
  flowLoading?: boolean
  statusDistributionData?: Array<{ status: 'Open' | 'Won' | 'Lost'; count: number; value: number }>
  statusDistributionLoading?: boolean
  kpiCurrency?: string
  onKpiCurrencyChange?: (currency: string) => void
  topDealsCurrency?: string
  onTopDealsCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
  onLifecyclePointClick?: (
    date: string,
    startDate: string,
    endDate: string,
    metric: 'opportunitiesCreated' | 'opportunitiesWon',
    pipelineId?: string
  ) => void
  renderLifecycleDrillDown?: React.ReactNode
  onFlowTrendPointClick?: (
    label: string,
    startDate: string,
    endDate: string,
    metric: 'opportunitiesCreated' | 'opportunitiesWon'
  ) => void
  renderFlowTrendDrillDown?: React.ReactNode
}

/** Helper: Calculate trend data from static opportunities data */
function calculateOpportunitiesTrendData(staticData: OpportunitiesStaticData) {
  const sd = staticData
  return {
    totalOpportunitiesLastMonth: sd.previous30DaysOpportunities || 0,
    previousPeriodPipelineValue: sd.previous30DaysTotalValue || 0,
    actualWinRateThisMonth:
      (sd.last30DaysWonOpportunities || 0) > 0
        ? ((sd.last30DaysWonOpportunities || 0) / (sd.last30DaysOpportunities || 1)) * 100
        : 0,
    actualWinRateLastMonth:
      (sd.previous30DaysWonOpportunities || 0) > 0
        ? ((sd.previous30DaysWonOpportunities || 0) / (sd.previous30DaysOpportunities || 1)) * 100
        : 0,
    actualAvgDealSizeThisMonth:
      (sd.last30DaysWonOpportunities || 0) > 0
        ? (sd.last30DaysTotalValue || 0) / (sd.last30DaysWonOpportunities || 1)
        : 0,
    actualAvgDealSizeLastMonth:
      (sd.previous30DaysWonOpportunities || 0) > 0
        ? (sd.previous30DaysTotalValue || 0) / (sd.previous30DaysWonOpportunities || 1)
        : 0,
    actualAvgOpportunityValueLastMonth: sd.previous30DaysAvgOpportunityValue || 0,
    actualAvgSalesCycleLastMonth: sd.previous30DaysAvgOpportunityValue || 0,
    currentPeriodOpportunities: sd.last30DaysOpportunities || 0,
    previousPeriodOpportunities: sd.previous30DaysOpportunities || 0,
    currentPeriodWonOpportunities: sd.last30DaysWonOpportunities || 0,
    previousPeriodWonOpportunities: sd.previous30DaysWonOpportunities || 0,
    actualConversionRateThisMonth: sd.last30DaysConversionRate || 0,
    actualConversionRateLastMonth: sd.previous30DaysConversionRate || 0
  }
}

export function buildOpportunitiesProps(data: OpportunitiesBuilderData, config: OpportunitiesBuilderConfig) {
  // Build trend data based on config
  let trendData = null
  if (config.useTrendData && data.oppTrendData) {
    trendData = {
      ...data.oppTrendData,
      currentPeriodWonOpportunities: data.opportunitiesStaticData?.last30DaysWonOpportunities || 0,
      previousPeriodWonOpportunities: data.opportunitiesStaticData?.previous30DaysWonOpportunities || 0
    }
  } else if (data.opportunitiesStaticData) {
    trendData = calculateOpportunitiesTrendData(data.opportunitiesStaticData)
  }

  return {
    title: config.title,

    // Core KPIs
    totalOpportunities: data.opportunitiesStaticData?.totalOpportunities || 0,
    totalValue: data.opportunitiesStaticData?.totalValue || 0,
    wonOpportunities: data.opportunitiesStaticData?.wonOpportunities || 0,
    winRate: data.opportunitiesStaticData?.winRate || 0,
    avgDealSize: data.opportunitiesStaticData?.avgDealSize || 0,
    avgSalesCycle: data.opportunitiesStaticData?.avgOpportunityValue || 0,

    // Trend data
    trendData,
    trendLoading:
      data.opportunitiesStaticLoading ||
      data.oppLifecycleLoading ||
      data.flowLoading ||
      data.statusDistributionLoading ||
      data.oppStageLoading,

    // Lifecycle chart
    lifecycleData: (data.oppLifecycleData || []).map(d => ({
      date: d.date,
      startDate: d.startDate,
      endDate: d.endDate,
      opportunitiesCreated: d.opportunitiesCreated,
      opportunitiesWon: d.opportunitiesWon
    })),
    lifecycleLoading: data.oppLifecycleLoading || false,
    ...(data.onLifecyclePointClick && { onLifecyclePointClick: data.onLifecyclePointClick }),
    ...(data.renderLifecycleDrillDown !== undefined && { renderLifecycleDrillDown: data.renderLifecycleDrillDown }),
    ...(data.onFlowTrendPointClick && { onFlowTrendPointClick: data.onFlowTrendPointClick }),
    ...(data.renderFlowTrendDrillDown !== undefined && { renderFlowTrendDrillDown: data.renderFlowTrendDrillDown }),

    // Pipelines
    pipelines: data.pipelines,
    selectedPipelineId: data.selectedPipelineId,
    onPipelineChange: data.onPipelineChange,
    selectedTimeFilter: data.oppTimeFilter,
    onTimeFilterChange: data.onOppTimeFilterChange,

    // Stage distribution
    opportunitiesByStage: data.oppStageData.map(s => ({
      stage: s.stage,
      stageRef: s.stageRef,
      count: s.count,
      value: s.value
    })),
    selectedStagePipelineId: data.selectedStagePipelineId,
    onStagePipelineChange: data.onStagePipelineChange,

    // Optional: Top Deals
    topDeals: data.topDeals || [],
    ...(data.topDealsLoading !== undefined && { topDealsLoading: data.topDealsLoading }),
    ...(config.showTopDeals === false && { showTopDeals: false }),

    // Aggregate flow and status distribution
    flowData: data.flowData || null,
    statusDistributionData: data.statusDistributionData || [],

    // Currency filters
    ...(data.kpiCurrency && { kpiCurrency: data.kpiCurrency }),
    ...(data.onKpiCurrencyChange && { onKpiCurrencyChange: data.onKpiCurrencyChange }),
    ...(data.topDealsCurrency && { topDealsCurrency: data.topDealsCurrency }),
    ...(data.onTopDealsCurrencyChange && { onTopDealsCurrencyChange: data.onTopDealsCurrencyChange }),
    ...(data.availableCurrencies && { availableCurrencies: data.availableCurrencies }),

    ...(config.kpiLabels && { kpiLabels: config.kpiLabels })
  }
}

// ============================================================================
// CONTACTS TAB BUILDER
// ============================================================================

export interface ContactsStaticData {
  totalContacts: number
  last30DaysContacts: number
  previous30DaysContacts: number
  totalAtPreviousPeriodEnd?: number
  totalAccounts?: number
}

export interface ContactsBuilderConfig {
  title: string
  module: 'crm' | 'irm'
  kpiLabels?: ContactsTabKpiLabels
}

export interface ContactsBuilderData {
  contactsStaticData: ContactsStaticData | null
  contactsStaticLoading: boolean
  contactsOverTime: any[]
  contactsOverTimeLoading: boolean
  contactsTimeFilter: TimeFilter
  onContactsTimeFilterChange: (filter: TimeFilter) => void
  contactQuality?: any
  contactQualityLoading?: boolean
  contactsByContactType?: Array<{ type: string; count: number }>
  contactsByContactTypeLoading?: boolean
  onContactLifecyclePointClick?: (label: string, startDate: string, endDate: string) => void
  renderContactLifecycleDrillDown?: React.ReactNode
}

export function buildContactsProps(data: ContactsBuilderData, config: ContactsBuilderConfig) {
  return {
    title: config.title,
    module: config.module,

    // Core KPIs
    totalContacts: data.contactsStaticData?.totalContacts || 0,
    thisMonth: data.contactsStaticData?.last30DaysContacts || 0,
    lastMonth: data.contactsStaticData?.previous30DaysContacts || 0,
    growth: data.contactsStaticData?.previous30DaysContacts
      ? Math.round(
          ((data.contactsStaticData.last30DaysContacts - data.contactsStaticData.previous30DaysContacts) /
            data.contactsStaticData.previous30DaysContacts) *
            100
        )
      : 0,
    totalLastMonth: data.contactsStaticData?.totalAtPreviousPeriodEnd || 0,
    totalGrowth: data.contactsStaticData?.totalAtPreviousPeriodEnd
      ? Math.round(
          ((data.contactsStaticData.totalContacts - data.contactsStaticData.totalAtPreviousPeriodEnd) /
            data.contactsStaticData.totalAtPreviousPeriodEnd) *
            100
        )
      : 0,
    trendLoading:
      data.contactsStaticLoading ||
      data.contactsOverTimeLoading ||
      data.contactQualityLoading ||
      data.contactsByContactTypeLoading,

    // Lifecycle chart
    selectedTimeFilter: data.contactsTimeFilter,
    onTimeFilterChange: data.onContactsTimeFilterChange,
    contactsOverTime: data.contactsOverTime || [],
    contactsOverTimeLoading: data.contactsOverTimeLoading,

    // Distribution charts
    contactsByContactType: data.contactsByContactType || [],
    contactsByContactTypeLoading: data.contactsByContactTypeLoading,

    // Quality data
    ...(data.contactQuality && {
      qualityData: data.contactQuality
    }),

    // Lifecycle drill-down
    ...(data.onContactLifecyclePointClick && { onLifecyclePointClick: data.onContactLifecyclePointClick }),
    ...(data.renderContactLifecycleDrillDown !== undefined && {
      renderLifecycleDrillDown: data.renderContactLifecycleDrillDown
    }),

    ...(config.kpiLabels && { kpiLabels: config.kpiLabels }),

    // Average contacts per account
    avgPerAccount:
      data.contactsStaticData?.totalAccounts && data.contactsStaticData.totalAccounts > 0
        ? Math.round((data.contactsStaticData.totalContacts / data.contactsStaticData.totalAccounts) * 10) / 10
        : 0,
    avgPerAccountLastMonth:
      data.contactsStaticData?.totalAccounts && data.contactsStaticData.totalAccounts > 0
        ? Math.round(
            ((data.contactsStaticData.totalAtPreviousPeriodEnd || 0) / data.contactsStaticData.totalAccounts) * 10
          ) / 10
        : 0
  }
}
