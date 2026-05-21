import React from 'react'
import {
  RevenueTrendChart,
  RevenueTrendData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/RevenueTrendChart'
import {
  GeographicChart,
  GeographicData
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/GeographicChart'
import type { CountrySelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useCountryAccountsState'
import type { DateSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useActivityDrillDownState'
import type { StageSelection } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useStageDrillDownState'
import { ActivityHeatmapChart } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/ActivityHeatmapChart'
import { OpenPipelineByStageChart } from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OpenPipelineByStageChart'
import OverviewMetricsWidgets, {
  KpiLabels,
  KpiVisibility
} from '@/common/components/common-relations/view-layouts/analytics-layout/overview/widgets/OverviewMetricsWidgets'
import type { ActivityHeatmapData, OverviewTrendData } from '../hooks'
import type { StageItem } from '../opportunities/widgets/types'

export type { GeographicData }

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
  salesCycleLength?: number
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

  // Optional: Geographic distribution chart
  geographicDistribution?: {
    data: GeographicData[]
    isLoading?: boolean
  }

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

  // Country accounts drill-down (geographic chart click)
  selectedCountry?: CountrySelection | null
  onCountryClick?: (country: string, countryId: string) => void
  renderCountryAccounts?: (selection: CountrySelection) => React.ReactNode

  // Stage opportunities drill-down (pipeline by stage chart click)
  selectedStage?: StageSelection | null
  onStageClick?: (stage: string, stageRef: string, pipelineId?: string) => void
  renderStageOpportunities?: (selection: StageSelection) => React.ReactNode

  // Activity drill-down (timeline chart click)
  selectedDate?: DateSelection | null
  onDateClick?: (date: string, fullDate: string) => void
  renderActivityPanel?: (selection: DateSelection) => React.ReactNode

  // Revenue trend drill-down (chart click)
  onRevenuePointClick?: (
    label: string,
    startDate: string,
    endDate: string,
    metric: 'pipelineRevenue' | 'wonRevenue',
    pipelineId?: string,
    currencyCode?: string
  ) => void
  renderRevenueDrillDown?: React.ReactNode
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
  geographicDistribution,
  activityHeatmap,
  moduleColor = 'default',
  kpiCurrency = 'EUR',
  onKpiCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  revenueCurrency = 'EUR',
  onRevenueCurrencyChange,
  selectedCountry,
  onCountryClick,
  renderCountryAccounts,
  selectedStage,
  onStageClick,
  renderStageOpportunities,
  selectedDate,
  onDateClick,
  renderActivityPanel,
  onRevenuePointClick,
  renderRevenueDrillDown
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
        onPointClick={onRevenuePointClick}
        renderDrillDown={renderRevenueDrillDown}
      />

      {/* Optional: Open Pipeline by Stage + Geographic Distribution */}
      {(openPipelineByStage || geographicDistribution) && (
        <div className="gba:flex gba:gap-6" data-testid="analytics-charts-container">
          {openPipelineByStage && (
            <div
              className={`gba:min-w-0 gba:w-full ${geographicDistribution ? 'lg:gba:w-2/3' : ''}`}
              data-testid="open-pipeline-stage-container"
            >
              <OpenPipelineByStageChart
                data={openPipelineByStage.data}
                isLoading={openPipelineByStage.isLoading}
                moduleColor={moduleColor}
                pipelines={pipelines}
                selectedPipelineId={stagePipelineId}
                onPipelineChange={onStagePipelineChange}
                onStageClick={onStageClick}
              />
            </div>
          )}
          {geographicDistribution && (
            <div
              className={`gba:min-w-0 gba:w-full ${openPipelineByStage ? 'lg:gba:w-1/3' : ''}`}
              data-testid="geographic-chart-container"
            >
              <GeographicChart
                data={geographicDistribution.data}
                isLoading={geographicDistribution.isLoading}
                moduleColor={moduleColor}
                onCountryClick={onCountryClick}
              />
            </div>
          )}
        </div>
      )}

      {/* Country accounts drill-down panel — mutually exclusive with stage panel */}
      {selectedCountry && renderCountryAccounts && (
        <div className="gba:w-full" data-testid="country-accounts-drill-down">
          {renderCountryAccounts(selectedCountry)}
        </div>
      )}

      {/* Stage opportunities drill-down panel — mutually exclusive with country panel */}
      {selectedStage && renderStageOpportunities && (
        <div className="gba:w-full" data-testid="stage-opportunities-drill-down">
          {renderStageOpportunities(selectedStage)}
        </div>
      )}

      {/* Optional: Activity Timeline */}
      {activityHeatmap && (
        <div className="gba:grid gba:grid-cols-1 gba:gap-6">
          <ActivityHeatmapChart
            data={activityHeatmap.data}
            isLoading={activityHeatmap.isLoading}
            moduleColor={moduleColor}
            onDateClick={onDateClick}
          />
        </div>
      )}

      {/* Activity drill-down panel */}
      {selectedDate && renderActivityPanel && (
        <div className="gba:w-full" data-testid="activity-drill-down">
          {renderActivityPanel(selectedDate)}
        </div>
      )}
    </div>
  )
}

export default OverviewTabLayout
