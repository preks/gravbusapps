import React from 'react'
import { WidgetGroup } from '@/components/widget-group'
import { CurrencyCircleDollarIcon, TrophyIcon, TrendUpIcon, PercentIcon } from '@phosphor-icons/react'
import {
  OpportunityLifecycleChart,
  TimeFilter as OpportunityTimeFilter,
  PipelineItem
} from './widgets/OpportunityLifecycleChart'
import { OpportunityVelocityAnalysis } from './widgets/OpportunityVelocityAnalysis'
import { OpportunityStatusDistribution } from './widgets/OpportunityStatusDistribution'
import type { StatusBucket, StatusSelection } from '../hooks/useStatusDrillDownState'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label,
  Spinner
} from '@newwork/nw-design-system'
import { OpportunitiesByStagePie } from './widgets/OpportunitiesByStagePie'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { calculateTrend, TrendResult } from '@/common/utils/trendUtils'

export interface OpportunitiesTrendData {
  totalOpportunitiesLastMonth: number
  previousPeriodPipelineValue: number
  actualWinRateThisMonth: number
  actualWinRateLastMonth: number
  actualAvgDealSizeThisMonth: number
  actualAvgDealSizeLastMonth: number
  actualAvgOpportunityValueThisMonth?: number // Average value of ALL opportunities
  actualAvgOpportunityValueLastMonth?: number // Average value of ALL opportunities (previous period)
  actualAvgSalesCycleLastMonth: number
  currentPeriodOpportunities: number
  previousPeriodOpportunities: number
  currentPeriodWonOpportunities?: number
  previousPeriodWonOpportunities?: number
  actualConversionRateThisMonth?: number
  actualConversionRateLastMonth?: number
  actualPipelineVelocityLastMonth?: number
}

export interface OpportunityLifecyclePoint {
  date: string
  startDate: string
  endDate: string
  opportunitiesCreated: number
  opportunitiesWon: number
}

const TREND_DESCRIPTION = 'vs previous period (30 days ago)'

const calculateAbsoluteDiffTrend = (current: number, previous: number, description: string): TrendResult => {
  if (current === previous) {
    return { value: '0.0%', positive: undefined, badgeVariant: 'offline', description }
  }
  const diff = Math.abs(current - previous)
  return { value: `${diff.toFixed(1)}%`, positive: current > previous, description }
}

export interface OpportunitiesTabLayoutProps {
  title?: string
  totalOpportunities: number
  totalValue: number
  wonOpportunities: number
  winRate: number
  avgDealSize: number
  avgSalesCycle: number
  trendData?: OpportunitiesTrendData | null
  trendLoading?: boolean
  lifecycleData: OpportunityLifecyclePoint[]
  lifecycleLoading?: boolean
  pipelines: PipelineItem[]
  selectedPipelineId?: string
  onPipelineChange: (id: string) => void
  selectedTimeFilter: OpportunityTimeFilter
  onTimeFilterChange: (filter: OpportunityTimeFilter) => void
  opportunitiesByStage: Array<{ stage: string; stageRef?: string; count: number; value: number }>
  onOpportunitiesStageClick?: (stage: string, stageRef: string) => void
  renderOpportunitiesStageDrillDown?: (selection: { stage: string; stageRef: string }) => React.ReactNode
  selectedOppTabStage?: { stage: string; stageRef: string } | null
  selectedStagePipelineId?: string
  onStagePipelineChange?: (id: string | undefined) => void
  topDeals: Array<{
    id: string
    name: string
    value: number
    stage: string
    winChance: number
    owner: string
    currencyCode?: string
  }>
  topDealsLoading?: boolean
  onTopDealClick?: (dealId: string) => void
  flowData?: {
    flowTrend: Array<{
      month: string
      startDate: string
      endDate: string
      opportunitiesCreated: number
      opportunitiesWon: number
    }>
  } | null
  onFlowTrendPointClick?: (
    label: string,
    startDate: string,
    endDate: string,
    metric: 'opportunitiesCreated' | 'opportunitiesWon'
  ) => void
  renderFlowTrendDrillDown?: React.ReactNode
  statusDistributionData?: Array<{ status: 'Open' | 'Won' | 'Lost'; count: number; value: number }>
  onStatusClick?: (status: StatusBucket) => void
  renderStatusDrillDown?: (selection: StatusSelection) => React.ReactNode
  selectedStatus?: StatusSelection | null
  moduleColor?: string

  // Currency filter props
  kpiCurrency?: string
  onKpiCurrencyChange?: (currency: string) => void
  topDealsCurrency?: string
  onTopDealsCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]

  // Lifecycle drill-down
  onLifecyclePointClick?: (
    date: string,
    startDate: string,
    endDate: string,
    metric: 'opportunitiesCreated' | 'opportunitiesWon',
    pipelineId?: string
  ) => void
  renderLifecycleDrillDown?: React.ReactNode

  // Feature flags
  showTopDeals?: boolean // Default: true - Set to false to hide top deals section (e.g., for IRM)
}

// colors local to pie widget

export const OpportunitiesTabLayout: React.FC<OpportunitiesTabLayoutProps> = ({
  totalOpportunities,
  totalValue,
  wonOpportunities,
  winRate,
  avgDealSize,
  avgSalesCycle,
  trendData,
  trendLoading = false,
  lifecycleData,
  lifecycleLoading = false,
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  selectedTimeFilter,
  onTimeFilterChange,
  opportunitiesByStage,
  selectedStagePipelineId,
  onStagePipelineChange,
  onOpportunitiesStageClick,
  renderOpportunitiesStageDrillDown,
  selectedOppTabStage,
  topDeals,
  topDealsLoading = false,
  onTopDealClick,
  flowData,
  statusDistributionData = [],
  onStatusClick,
  renderStatusDrillDown,
  selectedStatus,
  moduleColor = 'default',
  kpiCurrency = 'EUR',
  onKpiCurrencyChange,
  topDealsCurrency = 'EUR',
  onTopDealsCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  showTopDeals = true,
  onLifecyclePointClick,
  renderLifecycleDrillDown,
  onFlowTrendPointClick,
  renderFlowTrendDrillDown
}) => {
  const kpis = [
    {
      key: 'total-opportunities',
      title: 'Total Opportunities',
      value: totalOpportunities,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: 'All opportunities in pipeline',
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(totalOpportunities, trendData.totalOpportunitiesLastMonth || 0, TREND_DESCRIPTION)
          }
        : {})
    },
    {
      key: 'total-value',
      title: 'Total Pipeline Value',
      value: formatCurrencyCompact(totalValue, kpiCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: 'Combined value of all opportunities',
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(totalValue, trendData.previousPeriodPipelineValue || 0, TREND_DESCRIPTION)
          }
        : {})
    },
    {
      key: 'won-opportunities',
      title: 'Won Opportunities',
      value: wonOpportunities,
      prefix: <TrophyIcon />,
      description: 'Opportunities marked as won',
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.currentPeriodWonOpportunities || 0,
              trendData.previousPeriodWonOpportunities || 0,
              TREND_DESCRIPTION
            )
          }
        : {})
    },
    {
      key: 'win-rate',
      title: 'Win Rate',
      value: trendData?.actualWinRateThisMonth || winRate,
      suffix: '%',
      prefix: <TrophyIcon />,
      description: 'Percentage of won opportunities',
      ...(trendData && !trendLoading
        ? {
            trend: calculateAbsoluteDiffTrend(
              trendData.actualWinRateThisMonth || winRate,
              trendData.actualWinRateLastMonth || 0,
              TREND_DESCRIPTION
            )
          }
        : {})
    },
    {
      key: 'avg-deal-size',
      title: 'Avg. Deal Size',
      value: formatCurrencyCompact(
        trendData?.actualAvgDealSizeThisMonth || avgDealSize,
        kpiCurrency,
        undefined,
        1,
        true
      ),
      valueIsString: true,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: 'Average opportunity value',
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.actualAvgDealSizeThisMonth || avgDealSize,
              trendData.actualAvgDealSizeLastMonth || 0,
              TREND_DESCRIPTION
            )
          }
        : {})
    },
    {
      key: 'opportunities-this-period',
      title: 'New This Period',
      value: trendData?.currentPeriodOpportunities || 0,
      prefix: <TrendUpIcon size={16} />,
      description: 'Opportunities created in selected period',
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.currentPeriodOpportunities || 0,
              trendData.previousPeriodOpportunities || 0,
              TREND_DESCRIPTION
            )
          }
        : {})
    },
    {
      key: 'avg-opportunity-value',
      title: 'Avg. Opportunity Value',
      value: formatCurrencyCompact(avgSalesCycle, kpiCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: 'Average value per opportunity',
      ...(trendData && !trendLoading && trendData.actualAvgOpportunityValueLastMonth !== undefined
        ? {
            trend: calculateTrend(avgSalesCycle, trendData.actualAvgOpportunityValueLastMonth || 0, TREND_DESCRIPTION)
          }
        : {})
    },
    {
      key: 'conversion-rate',
      title: 'Conversion Rate',
      value: trendData?.actualConversionRateThisMonth ?? 0,
      suffix: '%',
      prefix: <PercentIcon />,
      description: 'Leads converted to opportunities',
      ...(trendData && !trendLoading
        ? {
            trend: calculateAbsoluteDiffTrend(
              trendData.actualConversionRateThisMonth || 0,
              trendData.actualConversionRateLastMonth || 0,
              TREND_DESCRIPTION
            )
          }
        : {})
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="opportunities-analytics-tab">
      <div>
        {/* Currency Filter for KPIs */}
        {availableCurrencies && availableCurrencies.length > 1 && onKpiCurrencyChange && (
          <div
            className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:justify-end"
            data-testid="opportunities-kpi-currency-filter"
          >
            <Label className="gba:text-sm gba:font-medium">Currency</Label>
            <Select value={kpiCurrency} onValueChange={onKpiCurrencyChange}>
              <SelectTrigger className="gba:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <WidgetGroup widgets={kpis} data-testid="opportunities-key-metrics" />
      </div>

      <OpportunityLifecycleChart
        key={`opportunity-lifecycle-${selectedTimeFilter}-${selectedPipelineId || 'all'}`}
        data={lifecycleData}
        isLoading={lifecycleLoading || trendLoading}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={onTimeFilterChange}
        pipelines={pipelines}
        selectedPipelineId={selectedPipelineId}
        onPipelineChange={onPipelineChange}
        moduleColor={moduleColor}
        onPointClick={onLifecyclePointClick}
        renderDrillDown={renderLifecycleDrillDown}
      />

      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        <OpportunityVelocityAnalysis
          data={flowData || { flowTrend: [] }}
          moduleColor={moduleColor}
          onPointClick={onFlowTrendPointClick}
          renderDrillDown={renderFlowTrendDrillDown}
        />
        <OpportunityStatusDistribution
          data={statusDistributionData}
          moduleColor={moduleColor}
          currency={kpiCurrency}
          onStatusClick={onStatusClick}
          selectedStatus={selectedStatus?.status}
        />
      </div>

      {selectedStatus && renderStatusDrillDown?.(selectedStatus)}

      <OpportunitiesByStagePie
        data={opportunitiesByStage}
        moduleColor={moduleColor}
        pipelines={pipelines}
        selectedPipelineId={selectedStagePipelineId}
        onPipelineChange={onStagePipelineChange}
        onStageClick={onOpportunitiesStageClick}
      />

      {selectedOppTabStage && renderOpportunitiesStageDrillDown?.(selectedOppTabStage)}

      {/* Conditionally render Top Deals section */}
      {showTopDeals && (
        <Card data-testid="top-deals-section">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <CardTitle className="gba:flex gba:items-center gba:gap-2">Top Opportunities by Value</CardTitle>
              {/* Currency Filter */}
              {availableCurrencies && availableCurrencies.length > 1 && onTopDealsCurrencyChange && (
                <div
                  className="gba:flex gba:items-center gba:gap-2 gba:ml-auto"
                  data-testid="top-deals-currency-filter"
                >
                  <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency</Label>
                  <Select value={topDealsCurrency} onValueChange={onTopDealsCurrencyChange}>
                    <SelectTrigger className="gba:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {topDealsLoading && (
              <div className="gba:flex gba:justify-center gba:items-center gba:py-12" data-testid="top-deals-loading">
                <Spinner size="lg" />
              </div>
            )}
            {!topDealsLoading && topDeals.length > 0 && (
              <div className="gba:space-y-3">
                {topDeals.map((deal, index) => {
                  const content = (
                    <>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <span className="gba:text-xs gba:text-gray-600">#{index + 1}</span>
                        <div>
                          <div className="gba:font-medium">{deal.name}</div>
                          <div className="gba:text-sm gba:text-gray-600">
                            {deal.stage} • {deal.winChance}% win chance • {deal.owner}
                          </div>
                        </div>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:font-bold">
                          {formatCurrencyCompact(deal.value, topDealsCurrency, undefined, 1, true)}
                        </div>
                        <div className="gba:text-sm gba:text-gray-600">Opportunity Value</div>
                      </div>
                    </>
                  )

                  if (onTopDealClick) {
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        className="gba:flex gba:w-full gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:text-left gba:transition-colors gba:hover:bg-muted"
                        onClick={() => onTopDealClick(deal.id)}
                        data-testid={`top-deal-${index}`}
                      >
                        {content}
                      </button>
                    )
                  }

                  return (
                    <div
                      key={deal.id}
                      className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                      data-testid={`top-deal-${index}`}
                    >
                      {content}
                    </div>
                  )
                })}
              </div>
            )}
            {!topDealsLoading && topDeals.length === 0 && (
              <div className="gba:text-center gba:text-gray-500 gba:py-8">No deal data available</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default OpportunitiesTabLayout
