import React from 'react'
import {
  RevenueTrendChart,
  RevenueTrendData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/RevenueTrendChart'
import {
  PipelineHealthOverview,
  PipelineHealthMetrics
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/PipelineHealthOverview'
import {
  GeographicChart,
  GeographicData
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/GeographicChart'
import {
  ActivityHeatmapChart,
  ActivityHeatmapData
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/ActivityHeatmapChart'
import {
  TopPerformers,
  TopPerformerItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/TopPerformers'
import OverviewMetricsWidgets from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'

export interface OverviewCounts {
  leads: number
  accounts: number
  opportunities: number
  contacts: number
}

export interface ConversionMetrics {
  leadToOpportunityRate: number
  opportunityWinRate: number
  avgDealSize: number
  salesCycleLength: number
}

export interface TrendData {
  totalLeadsThisMonth: number
  totalLeadsLastMonth: number
  totalAccountsThisMonth: number
  totalAccountsLastMonth: number
  totalOpportunitiesThisMonth: number
  totalOpportunitiesLastMonth: number
  totalContactsThisMonth: number
  totalContactsLastMonth: number
  currentMonthWonOpportunities: number
  previousMonthWonOpportunities: number
  // New trend metrics for conversion rates and performance indicators
  currentMonthLeadConversionRate: number
  previousMonthLeadConversionRate: number
  currentMonthAvgDealSize: number
  previousMonthAvgDealSize: number
  currentMonthSalesCycleLength: number
  previousMonthSalesCycleLength: number
}

export interface OverviewTabLayoutProps {
  title?: string
  moduleColor?: string
  counts: OverviewCounts
  conversionMetrics: ConversionMetrics
  trendData?: TrendData | null
  trendLoading?: boolean

  pipelines: Array<{ id: string; name: string }>

  // Revenue Trends specific pipeline filter
  revenuePipelineId?: string
  onRevenuePipelineChange?: (pipelineId: string | undefined) => void
  revenueTimeFilter?: TimeFilter
  onRevenueTimeFilterChange?: (timeFilter: TimeFilter) => void
  revenueTrends: RevenueTrendData[]
  revenueLoading?: boolean

  // Pipeline Health specific pipeline filter
  healthPipelineId?: string
  onHealthPipelineChange?: (pipelineId: string | undefined) => void
  pipelineHealth: {
    data?: PipelineHealthMetrics | null
    isLoading?: boolean
    error?: string | null
  }

  geographicDistribution: {
    data: GeographicData[]
    isLoading?: boolean
  }

  activityHeatmap: {
    data: ActivityHeatmapData[]
    isLoading?: boolean
  }

  topPerformers: TopPerformerItem[]

  // Currency filters
  kpiCurrency?: string
  onKpiCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
  revenueCurrency?: string
  onRevenueCurrencyChange?: (currency: string) => void
  topPerformersCurrency?: string
  onTopPerformersCurrencyChange?: (currency: string) => void
}

export const OverviewTabLayout: React.FC<OverviewTabLayoutProps> = ({
  title = 'CRM Overview',
  counts,
  conversionMetrics,
  trendData,
  trendLoading = false,
  pipelines,
  revenuePipelineId,
  onRevenuePipelineChange,
  revenueTimeFilter = 'sixMonths',
  onRevenueTimeFilterChange,
  revenueTrends,
  revenueLoading = false,
  healthPipelineId,
  onHealthPipelineChange,
  pipelineHealth,
  geographicDistribution,
  activityHeatmap,
  topPerformers,
  moduleColor = 'default',
  kpiCurrency = 'EUR',
  onKpiCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  revenueCurrency = 'EUR',
  onRevenueCurrencyChange,
  topPerformersCurrency = 'EUR',
  onTopPerformersCurrencyChange
}) => {
  return (
    <div className="gba:space-y-6" data-testid="overview-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
        <OverviewMetricsWidgets
          counts={counts}
          conversionMetrics={conversionMetrics}
          trendData={trendData}
          trendLoading={trendLoading}
          selectedCurrency={kpiCurrency}
          onCurrencyChange={onKpiCurrencyChange}
          availableCurrencies={availableCurrencies}
        />
      </div>

      <RevenueTrendChart
        moduleColor={moduleColor as any}
        data={revenueTrends}
        isLoading={revenueLoading}
        pipelines={pipelines}
        selectedPipelineId={revenuePipelineId}
        onPipelineChange={onRevenuePipelineChange}
        selectedTimeFilter={revenueTimeFilter}
        onTimeFilterChange={onRevenueTimeFilterChange}
        selectedCurrency={revenueCurrency}
        onCurrencyChange={onRevenueCurrencyChange}
        availableCurrencies={availableCurrencies}
      />

      <div className="gba:flex gba:gap-6" data-testid="analytics-charts-container">
        <div className="gba:min-w-0 gba:w-full lg:gba:w-2/3" data-testid="pipeline-health-container">
          <PipelineHealthOverview
            isLoading={pipelineHealth?.isLoading}
            error={pipelineHealth?.error ?? null}
            data={pipelineHealth?.data ?? null}
            moduleColor={moduleColor}
            pipelines={pipelines}
            selectedPipelineId={healthPipelineId}
            onPipelineChange={onHealthPipelineChange}
          />
        </div>
        <div className="gba:min-w-0 gba:w-full lg:gba:w-1/3" data-testid="geographic-chart-container">
          <GeographicChart
            data={geographicDistribution.data}
            isLoading={geographicDistribution?.isLoading}
            moduleColor={moduleColor}
          />
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-1 gba:gap-6">
        <ActivityHeatmapChart
          data={activityHeatmap.data}
          isLoading={activityHeatmap?.isLoading}
          moduleColor={moduleColor}
        />
      </div>

      <TopPerformers
        performers={topPerformers}
        moduleColor={moduleColor}
        selectedCurrency={topPerformersCurrency}
        onCurrencyChange={onTopPerformersCurrencyChange}
        availableCurrencies={availableCurrencies}
      />
    </div>
  )
}

export default OverviewTabLayout
