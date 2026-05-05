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
import { ActivityHeatmapChart } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/ActivityHeatmapChart'
import {
  TopPerformers,
  TopPerformerItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/TopPerformers'
import OverviewMetricsWidgets, {
  KpiLabels,
  KpiVisibility
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'
import type { ActivityHeatmapData, OverviewTrendData } from '../hooks'

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
  totalWonRevenue: number
  salesCycleLength?: number // Optional: not always used
}

export interface OverviewTabLayoutProps {
  title?: string
  moduleColor?: string

  // Required: Core KPI metrics
  counts: OverviewCounts
  conversionMetrics: ConversionMetrics
  trendData?: OverviewTrendData | null
  trendLoading?: boolean

  // Optional: Customize KPI labels and visibility
  kpiLabels?: KpiLabels
  kpiVisibility?: KpiVisibility

  // Required: Revenue trends
  pipelines: Array<{ id: string; name: string }>
  revenuePipelineId?: string
  onRevenuePipelineChange?: (pipelineId: string | undefined) => void
  revenueTimeFilter?: TimeFilter
  onRevenueTimeFilterChange?: (timeFilter: TimeFilter) => void
  revenueTrends: RevenueTrendData[]
  revenueLoading?: boolean

  // Optional: Pipeline Health chart (can be hidden)
  pipelineHealth?: {
    data?: PipelineHealthMetrics | null
    isLoading?: boolean
    error?: string | null
  }
  healthPipelineId?: string
  onHealthPipelineChange?: (pipelineId: string | undefined) => void

  // Optional: Geographic distribution chart (can be hidden)
  geographicDistribution?: {
    data: GeographicData[]
    isLoading?: boolean
  }

  // Optional: Activity timeline chart (can be hidden)
  activityHeatmap?: {
    data: ActivityHeatmapData[]
    isLoading?: boolean
  }

  // Optional: Top performers table (can be hidden)
  topPerformers?: TopPerformerItem[]
  topPerformersLoading?: boolean
  topPerformersCurrency?: string
  onTopPerformersCurrencyChange?: (currency: string) => void

  // Currency filters for KPIs and charts
  kpiCurrency?: string
  onKpiCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]
  revenueCurrency?: string
  onRevenueCurrencyChange?: (currency: string) => void
}

export const OverviewTabLayout: React.FC<OverviewTabLayoutProps> = ({
  counts,
  conversionMetrics,
  trendData,
  trendLoading = false,
  kpiLabels,
  kpiVisibility,
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
  topPerformersLoading = false,
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
        <OverviewMetricsWidgets
          counts={counts}
          conversionMetrics={conversionMetrics}
          trendData={trendData}
          trendLoading={trendLoading}
          selectedCurrency={kpiCurrency}
          onCurrencyChange={onKpiCurrencyChange}
          availableCurrencies={availableCurrencies}
          kpiLabels={kpiLabels}
          kpiVisibility={kpiVisibility}
        />
      </div>

      {/* Revenue Trends - Always shown */}
      <RevenueTrendChart
        key={`revenue-trends-${revenueTimeFilter}-${revenuePipelineId || 'all'}-${revenueCurrency}`}
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

      {/* Optional: Pipeline Health & Geographic Distribution */}
      {(pipelineHealth || geographicDistribution) && (
        <div className="gba:flex gba:gap-6" data-testid="analytics-charts-container">
          {pipelineHealth && (
            <div className="gba:min-w-0 gba:w-full lg:gba:w-2/3" data-testid="pipeline-health-container">
              <PipelineHealthOverview
                isLoading={pipelineHealth.isLoading}
                error={pipelineHealth.error ?? null}
                data={pipelineHealth.data ?? null}
                moduleColor={moduleColor}
                pipelines={pipelines}
                selectedPipelineId={healthPipelineId}
                onPipelineChange={onHealthPipelineChange}
              />
            </div>
          )}
          {geographicDistribution && (
            <div
              className={`gba:min-w-0 gba:w-full ${pipelineHealth ? 'lg:gba:w-1/3' : ''}`}
              data-testid="geographic-chart-container"
            >
              <GeographicChart
                data={geographicDistribution.data}
                isLoading={geographicDistribution.isLoading}
                moduleColor={moduleColor}
              />
            </div>
          )}
        </div>
      )}

      {/* Optional: Activity Timeline */}
      {activityHeatmap && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-6">
          <ActivityHeatmapChart
            data={activityHeatmap.data}
            isLoading={activityHeatmap.isLoading}
            moduleColor={moduleColor}
          />
        </div>
      )}

      {/* Optional: Top Performers */}
      {topPerformers !== undefined && (
        <TopPerformers
          performers={topPerformers}
          isLoading={topPerformersLoading}
          moduleColor={moduleColor}
          selectedCurrency={topPerformersCurrency}
          onCurrencyChange={onTopPerformersCurrencyChange}
          availableCurrencies={availableCurrencies}
        />
      )}
    </div>
  )
}

export default OverviewTabLayout
