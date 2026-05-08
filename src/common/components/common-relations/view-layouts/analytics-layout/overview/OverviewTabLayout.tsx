import React from 'react'
import {
  RevenueTrendChart,
  RevenueTrendData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/RevenueTrendChart'
import { ActivityHeatmapChart } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/ActivityHeatmapChart'
import { OpenPipelineByStageChart } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OpenPipelineByStageChart'
import OverviewMetricsWidgets, {
  KpiLabels,
  KpiVisibility
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'
import type { ActivityHeatmapData, OverviewTrendData } from '../hooks'
import type { StageItem } from '../opportunities/widgets/types'

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

  // Optional: Open pipeline by stage chart (can be hidden)
  openPipelineByStage?: {
    data: StageItem[]
    isLoading?: boolean
  }
  stagePipelineId?: string
  onStagePipelineChange?: (pipelineId: string | undefined) => void

  // Optional: Activity timeline chart (can be hidden)
  activityHeatmap?: {
    data: ActivityHeatmapData[]
    isLoading?: boolean
  }

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
  stagePipelineId,
  onStagePipelineChange,
  openPipelineByStage,
  activityHeatmap,
  moduleColor = 'default',
  kpiCurrency = 'EUR',
  onKpiCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  revenueCurrency = 'EUR',
  onRevenueCurrencyChange
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

      {/* Optional: Open Pipeline by Stage */}
      {openPipelineByStage && (
        <div className="gba:grid gba:grid-cols-1" data-testid="analytics-charts-container">
          <div className="gba:min-w-0 gba:w-full" data-testid="open-pipeline-stage-container">
            <OpenPipelineByStageChart
              data={openPipelineByStage.data}
              isLoading={openPipelineByStage.isLoading}
              moduleColor={moduleColor}
              pipelines={pipelines}
              selectedPipelineId={stagePipelineId}
              onPipelineChange={onStagePipelineChange}
            />
          </div>
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
    </div>
  )
}

export default OverviewTabLayout
