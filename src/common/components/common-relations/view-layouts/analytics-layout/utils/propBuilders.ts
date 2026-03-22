/**
 * Shared prop builder functions for analytics tabs
 * These functions transform raw data from hooks into props for layout components
 * Used by both CRM and IRM to reduce code duplication
 */

import type { TimeFilter } from './analyticsViewHelpers'
import type { AccountsStaticData as HookAccountsStaticData } from '../hooks/useGenericAccountsStaticData'

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
  overviewGeographicData?: Array<{ country: string; accounts: number }>
}

export interface OverviewBuilderConfig {
  title: string
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
  pipelineHealth: any
  pipelineHealthLoading: boolean
  healthPipelineId?: string
  onHealthPipelineChange: (id: string | undefined) => void
  geographicData: Array<{ country: string; accounts: number }>
  geographicLoading: boolean
  activityHeatmap: any[]
  activityLoading: boolean
  topPerformers?: any[]
  topPerformersLoading?: boolean
  topPerformersCurrency?: string
  onTopPerformersCurrencyChange?: (currency: string) => void
}

export function buildOverviewProps(data: OverviewBuilderData, config: OverviewBuilderConfig) {
  return {
    title: config.title,
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
    trendLoading: data.revenueLoading || data.pipelineHealthLoading || data.geographicLoading || data.activityLoading,

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
    revenueLoading: data.revenueLoading || data.pipelineHealthLoading || data.geographicLoading || data.activityLoading,
    ...(config.revenueCurrency && { revenueCurrency: config.revenueCurrency }),
    ...(config.onRevenueCurrencyChange && { onRevenueCurrencyChange: config.onRevenueCurrencyChange }),

    // Optional: Pipeline Health
    pipelineHealth: {
      data: data.pipelineHealth,
      isLoading: data.pipelineHealthLoading
    },
    healthPipelineId: data.healthPipelineId,
    onHealthPipelineChange: data.onHealthPipelineChange,

    // Optional: Geographic Distribution
    geographicDistribution: {
      data: data.geographicData || [],
      isLoading: data.geographicLoading
    },

    // Optional: Activity Timeline
    activityHeatmap: {
      data: data.activityHeatmap || [],
      isLoading: data.activityLoading
    },

    // Optional: Top Performers (CRM only)
    ...(data.topPerformers !== undefined && {
      topPerformers: data.topPerformers,
      topPerformersLoading: data.topPerformersLoading,
      topPerformersCurrency: data.topPerformersCurrency,
      onTopPerformersCurrencyChange: data.onTopPerformersCurrencyChange
    }),

    // Currency filters
    ...(config.kpiCurrency && { kpiCurrency: config.kpiCurrency }),
    ...(config.onKpiCurrencyChange && { onKpiCurrencyChange: config.onKpiCurrencyChange }),
    ...(config.availableCurrencies && { availableCurrencies: config.availableCurrencies })
  }
}

// ============================================================================
// HELPER FUNCTIONS FOR LEADS TAB
// ============================================================================

/** Determine status based on threshold values */
function getQualityStatus(value: number, goodThreshold: number, warningThreshold: number): 'good' | 'warning' | 'bad' {
  if (value >= goodThreshold) return 'good'
  if (value >= warningThreshold) return 'warning'
  return 'bad'
}

// ============================================================================
// LEADS TAB BUILDER
// ============================================================================

export interface LeadsStaticData {
  totalLeads: number
  conversionRate: number
  avgTimeToConversion: number
  leadsBySource?: Array<{ source: string; count: number; percentage: number; conversionRate?: number }>
  leadsByStatus?: Array<{ status: string; count: number }>
  leadsByRating?: Array<{ rating: string; count: number; percentage?: number; value?: number }>
  topOwners?: Array<{ employeeId: string; employeeName: string; leadCount: number; conversionRate?: number }>
  velocityData?: any[]
  qualityMatrix?: any[]
  highQualityPercentage?: number
}

export interface LeadsBuilderConfig {
  title: string
  moduleColor?: string
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
    conversionRate: data.leadsStaticData?.conversionRate || 0,
    avgTimeToConversion: data.leadsStaticData?.avgTimeToConversion || 0,
    trendData: data.leadsTrendData || null,
    trendLoading: data.leadsTrendLoading || data.leadsStaticLoading,

    // Lead Lifecycle Chart
    leadsOverTime: data.leadsOverTime || [],
    leadsOverTimeLoading: data.leadsOverTimeLoading,
    selectedTimeFilter: data.leadsTimeFilter,
    onTimeFilterChange: data.onLeadsTimeFilterChange,

    // Lead Velocity Analysis
    velocityData: data.leadsStaticData
      ? {
          avgTimeToConversion: data.leadsStaticData.avgTimeToConversion,
          conversionRate: data.leadsStaticData.conversionRate,
          volumeTrend: 0,
          velocityTrendData: data.leadsStaticData.velocityData || []
        }
      : null,
    velocityLoading: data.leadsStaticLoading || data.leadsOverTimeLoading,

    // Lead Quality Matrix - includes leadsBySource for CRM
    leadQualityMatrix: data.leadsStaticData
      ? {
          leadsBySource: data.leadsStaticData.leadsBySource || [],
          isLoading: data.leadsStaticLoading || data.leadsOverTimeLoading
        }
      : undefined,

    // Lead Engagement Insights - includes rating distribution and health indicators
    leadEngagementInsights: data.leadsStaticData
      ? {
          leadsByRating: (data.leadsStaticData.leadsByRating || []).map(r => ({
            rating: r.rating,
            count: r.count,
            percentage: r.percentage || 0
          })),
          leadHealthIndicators: [
            {
              label: 'High Quality Leads',
              value: data.leadsStaticData.highQualityPercentage || 0,
              status: getQualityStatus(data.leadsStaticData.highQualityPercentage || 0, 50, 30)
            },
            {
              label: 'Conversion Rate',
              value: data.leadsStaticData.conversionRate || 0,
              status: getQualityStatus(data.leadsStaticData.conversionRate || 0, 20, 10)
            }
          ],
          highQualityPercentage: data.leadsStaticData.highQualityPercentage || 0,
          isLoading: data.leadsStaticLoading || data.leadsOverTimeLoading
        }
      : undefined,

    // Distributions
    leadsBySource: (data.leadsStaticData?.leadsBySource || []).map(x => ({
      source: x.source,
      count: x.count,
      percentage: x.percentage,
      conversionRate: x.conversionRate
    })),
    leadsBySourceLoading: data.leadsStaticLoading || data.leadsOverTimeLoading,
    leadsByStatus: (data.leadsStaticData?.leadsByStatus || []).map(x => ({ status: x.status, count: x.count })),
    leadsByStatusLoading: data.leadsStaticLoading || data.leadsOverTimeLoading,
    topOwners: (data.leadsStaticData?.topOwners || []).map(o => ({
      employeeId: o.employeeId,
      employeeName: o.employeeName,
      leadCount: o.leadCount,
      conversionRate: o.conversionRate || 0
    }))
  }
}

// ============================================================================
// ACCOUNTS TAB BUILDER
// ============================================================================

// Use the actual type from the hook (re-export for convenience)
export type AccountsStaticData = HookAccountsStaticData

export interface AccountsBuilderConfig {
  title: string
  showTopAccounts?: boolean
}

export interface AccountsBuilderData {
  accountsStaticData: AccountsStaticData | null
  accountsStaticLoading: boolean
  accountsOverTime: any[]
  accountsOverTimeLoading: boolean
  accountsTimeFilter: TimeFilter
  onAccountsTimeFilterChange: (filter: TimeFilter) => void
  topAccounts?: any[]
  topAccountsLoading?: boolean
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
    avgRevenuePerAccount: data.accountsStaticData?.avgRevenuePerAccount, // Average revenue per account with won opportunities

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

    // Distributions (keep original types from hook)
    accountsByIndustry: data.accountsStaticData?.accountsByIndustry || [],
    accountsBySize: data.accountsStaticData?.accountsBySize || [],
    monthlyGrowthTrend: data.accountsStaticData?.monthlyGrowthTrend || [],
    growthLoading: data.accountsStaticLoading || data.accountsOverTimeLoading,
    healthLoading: data.accountsStaticLoading || data.accountsOverTimeLoading,

    // Optional: Top Accounts (CRM only)
    ...(config.showTopAccounts !== false &&
      data.topAccounts !== undefined && {
        topAccounts: data.topAccounts,
        topAccountsLoading: data.topAccountsLoading
      }),
    ...(config.showTopAccounts === false && { showTopAccounts: false }),

    // Currency filter
    ...(data.accountsCurrency && { selectedCurrency: data.accountsCurrency }),
    ...(data.onAccountsCurrencyChange && { onCurrencyChange: data.onAccountsCurrencyChange }),
    ...(data.availableCurrencies && { availableCurrencies: data.availableCurrencies })
  }
}

// ============================================================================
// OPPORTUNITIES TAB BUILDER
// ============================================================================

export interface OpportunitiesStaticData {
  totalOpportunities: number
  totalValue: number
  winRate: number
  avgDealSize: number
  avgOpportunityValue: number
  pipelineVelocity: number
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
  velocityData?: any
  velocityLoading?: boolean
  dealHealthData?: any
  dealHealthLoading?: boolean
  kpiCurrency?: string
  onKpiCurrencyChange?: (currency: string) => void
  topDealsCurrency?: string
  onTopDealsCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
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
    actualConversionRateThisMonth: sd.last30DaysConversionRate || 0,
    actualConversionRateLastMonth: sd.previous30DaysConversionRate || 0
  }
}

export function buildOpportunitiesProps(data: OpportunitiesBuilderData, config: OpportunitiesBuilderConfig) {
  // Build trend data based on config
  let trendData = null
  if (config.useTrendData && data.oppTrendData) {
    trendData = data.oppTrendData
  } else if (data.opportunitiesStaticData) {
    trendData = calculateOpportunitiesTrendData(data.opportunitiesStaticData)
  }

  return {
    title: config.title,

    // Core KPIs
    totalOpportunities: data.opportunitiesStaticData?.totalOpportunities || 0,
    totalValue: data.opportunitiesStaticData?.totalValue || 0,
    winRate: data.opportunitiesStaticData?.winRate || 0,
    avgDealSize: data.opportunitiesStaticData?.avgDealSize || 0,
    avgSalesCycle: data.opportunitiesStaticData?.avgOpportunityValue || 0,
    pipelineVelocity: data.opportunitiesStaticData?.pipelineVelocity || 0,

    // Trend data
    trendData,
    trendLoading:
      data.opportunitiesStaticLoading ||
      data.oppLifecycleLoading ||
      data.velocityLoading ||
      data.dealHealthLoading ||
      data.oppStageLoading,

    // Lifecycle chart
    lifecycleData: (data.oppLifecycleData || []).map(d => ({
      date: d.date,
      opportunitiesCreated: d.opportunitiesCreated,
      opportunitiesWon: d.opportunitiesWon
    })),
    lifecycleLoading: data.oppLifecycleLoading || false,

    // Pipelines
    pipelines: data.pipelines,
    selectedPipelineId: data.selectedPipelineId,
    onPipelineChange: data.onPipelineChange,
    selectedTimeFilter: data.oppTimeFilter,
    onTimeFilterChange: data.onOppTimeFilterChange,

    // Stage distribution
    opportunitiesByStage: data.oppStageData.map(s => ({ stage: s.stage, count: s.count, value: s.value })),
    selectedStagePipelineId: data.selectedStagePipelineId,
    onStagePipelineChange: data.onStagePipelineChange,

    // Optional: Top Deals
    topDeals: data.topDeals || [],
    ...(data.topDealsLoading !== undefined && { topDealsLoading: data.topDealsLoading }),
    ...(config.showTopDeals === false && { showTopDeals: false }),

    // Velocity and health
    velocityData: data.velocityData || null,
    dealHealthData: data.dealHealthData || null,

    // Currency filters
    ...(data.kpiCurrency && { kpiCurrency: data.kpiCurrency }),
    ...(data.onKpiCurrencyChange && { onKpiCurrencyChange: data.onKpiCurrencyChange }),
    ...(data.topDealsCurrency && { topDealsCurrency: data.topDealsCurrency }),
    ...(data.onTopDealsCurrencyChange && { onTopDealsCurrencyChange: data.onTopDealsCurrencyChange }),
    ...(data.availableCurrencies && { availableCurrencies: data.availableCurrencies })
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
}

export interface ContactsBuilderData {
  contactsStaticData: ContactsStaticData | null
  contactsStaticLoading: boolean
  contactsOverTime: any[]
  contactsOverTimeLoading: boolean
  contactsTimeFilter: TimeFilter
  onContactsTimeFilterChange: (filter: TimeFilter) => void
  contactInsights?: {
    totalContacts?: number
    topAccountsByContacts?: any[]
    recentContacts?: any[]
  }
  contactInsightsLoading?: boolean
  contactQuality?: any
  contactQualityLoading?: boolean
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
      data.contactInsightsLoading ||
      data.contactQualityLoading,

    // Lifecycle chart
    selectedTimeFilter: data.contactsTimeFilter,
    onTimeFilterChange: data.onContactsTimeFilterChange,
    contactsOverTime: data.contactsOverTime || [],
    contactsOverTimeLoading: data.contactsOverTimeLoading,

    // Insights
    ...(data.contactInsights && {
      topAccountsByContacts: data.contactInsights.topAccountsByContacts || [],
      recentContacts: data.contactInsights.recentContacts || [],
      insightsData: {
        totalContacts: data.contactInsights.totalContacts || 0,
        contactsByAccount: data.contactInsights.topAccountsByContacts || [],
        recentContacts: data.contactInsights.recentContacts || []
      }
    }),

    // Quality data
    ...(data.contactQuality && {
      qualityData: data.contactQuality
    }),

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
