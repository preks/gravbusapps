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
import { mergeTabKpiLabels, type PartialTabKpiLabels, type TabKpiLabel } from '../types/tabKpiLabels'

export type OpportunitiesTabKpiLabels = {
  totalOpportunities: TabKpiLabel
  totalValue: TabKpiLabel
  wonOpportunities: TabKpiLabel
  winRate: TabKpiLabel
  avgOpportunitySize: TabKpiLabel
  newThisPeriod: TabKpiLabel
  avgOpportunityValue: TabKpiLabel
  conversionRate: TabKpiLabel
}

const DEFAULT_OPPORTUNITIES_TAB_KPI_LABELS: OpportunitiesTabKpiLabels = {
  totalOpportunities: { title: 'Total Opportunities', description: 'All opportunities in pipeline' },
  totalValue: { title: 'Total Pipeline Value', description: 'Combined value of all opportunities' },
  wonOpportunities: { title: 'Won Opportunities', description: 'Opportunities marked as won' },
  winRate: { title: 'Win Rate', description: 'Percentage of won opportunities' },
  avgOpportunitySize: { title: 'Avg. Opportunity Size', description: 'Average opportunity value' },
  newThisPeriod: { title: 'New This Period', description: 'Opportunities created in selected period' },
  avgOpportunityValue: { title: 'Avg. Opportunity Value', description: 'Average value per opportunity' },
  conversionRate: { title: 'Conversion Rate', description: 'Leads converted to opportunities' }
}

export interface OpportunitiesTrendData {
  totalOpportunitiesLastMonth: number
  previousPeriodPipelineValue: number
  actualWinRateThisMonth: number
  actualWinRateLastMonth: number
  actualAvgOpportunitySizeThisMonth: number
  actualAvgOpportunitySizeLastMonth: number
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
  avgOpportunitySize: number
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
  topOpportunities: Array<{
    id: string
    name: string
    value: number
    stage: string
    winChance: number
    owner: string
    currencyCode?: string
  }>
  topOpportunitiesLoading?: boolean
  onTopOpportunityClick?: (opportunityId: string) => void
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
  topOpportunitiesCurrency?: string
  onTopOpportunitiesCurrencyChange?: (currency: string) => void
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
  showTopOpportunities?: boolean // Default: true - Set to false to hide top opportunities section (e.g., for IRM)

  /** Optional KPI title/description overrides (e.g. IRM investment terminology) */
  kpiLabels?: PartialTabKpiLabels<OpportunitiesTabKpiLabels>
}

// colors local to pie widget

export const OpportunitiesTabLayout: React.FC<OpportunitiesTabLayoutProps> = ({
  totalOpportunities,
  totalValue,
  wonOpportunities,
  winRate,
  avgOpportunitySize,
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
  topOpportunities,
  topOpportunitiesLoading = false,
  onTopOpportunityClick,
  flowData,
  statusDistributionData = [],
  onStatusClick,
  renderStatusDrillDown,
  selectedStatus,
  moduleColor = 'default',
  kpiCurrency = 'EUR',
  onKpiCurrencyChange,
  topOpportunitiesCurrency = 'EUR',
  onTopOpportunitiesCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  showTopOpportunities = true,
  onLifecyclePointClick,
  renderLifecycleDrillDown,
  onFlowTrendPointClick,
  renderFlowTrendDrillDown,
  kpiLabels = {}
}) => {
  const labels = mergeTabKpiLabels(DEFAULT_OPPORTUNITIES_TAB_KPI_LABELS, kpiLabels)

  const kpis = [
    {
      key: 'total-opportunities',
      title: labels.totalOpportunities.title,
      value: totalOpportunities,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: labels.totalOpportunities.description,
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(totalOpportunities, trendData.totalOpportunitiesLastMonth || 0, TREND_DESCRIPTION)
          }
        : {})
    },
    {
      key: 'total-value',
      title: labels.totalValue.title,
      value: formatCurrencyCompact(totalValue, kpiCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: labels.totalValue.description,
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(totalValue, trendData.previousPeriodPipelineValue || 0, TREND_DESCRIPTION)
          }
        : {})
    },
    {
      key: 'won-opportunities',
      title: labels.wonOpportunities.title,
      value: wonOpportunities,
      prefix: <TrophyIcon />,
      description: labels.wonOpportunities.description,
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
      title: labels.winRate.title,
      value: trendData?.actualWinRateThisMonth || winRate,
      suffix: '%',
      prefix: <TrophyIcon />,
      description: labels.winRate.description,
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
      key: 'avg-opportunity-size',
      title: labels.avgOpportunitySize.title,
      value: formatCurrencyCompact(
        trendData?.actualAvgOpportunitySizeThisMonth || avgOpportunitySize,
        kpiCurrency,
        undefined,
        1,
        true
      ),
      valueIsString: true,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: labels.avgOpportunitySize.description,
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.actualAvgOpportunitySizeThisMonth || avgOpportunitySize,
              trendData.actualAvgOpportunitySizeLastMonth || 0,
              TREND_DESCRIPTION
            )
          }
        : {})
    },
    {
      key: 'opportunities-this-period',
      title: labels.newThisPeriod.title,
      value: trendData?.currentPeriodOpportunities || 0,
      prefix: <TrendUpIcon size={16} />,
      description: labels.newThisPeriod.description,
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
      title: labels.avgOpportunityValue.title,
      value: formatCurrencyCompact(avgSalesCycle, kpiCurrency, undefined, 1, true),
      valueIsString: true,
      prefix: <CurrencyCircleDollarIcon size={16} />,
      description: labels.avgOpportunityValue.description,
      ...(trendData && !trendLoading && trendData.actualAvgOpportunityValueLastMonth !== undefined
        ? {
            trend: calculateTrend(avgSalesCycle, trendData.actualAvgOpportunityValueLastMonth || 0, TREND_DESCRIPTION)
          }
        : {})
    },
    {
      key: 'conversion-rate',
      title: labels.conversionRate.title,
      value: trendData?.actualConversionRateThisMonth ?? 0,
      suffix: '%',
      prefix: <PercentIcon />,
      description: labels.conversionRate.description,
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

      {/* Conditionally render Top Opportunities section */}
      {showTopOpportunities && (
        <Card data-testid="top-opportunities-section">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:justify-between">
              <CardTitle className="gba:flex gba:items-center gba:gap-2">Top Opportunities by Value</CardTitle>
              {/* Currency Filter */}
              {availableCurrencies && availableCurrencies.length > 1 && onTopOpportunitiesCurrencyChange && (
                <div
                  className="gba:flex gba:items-center gba:gap-2 gba:ml-auto"
                  data-testid="top-opportunities-currency-filter"
                >
                  <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency</Label>
                  <Select value={topOpportunitiesCurrency} onValueChange={onTopOpportunitiesCurrencyChange}>
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
            {topOpportunitiesLoading && (
              <div
                className="gba:flex gba:justify-center gba:items-center gba:py-12"
                data-testid="top-opportunities-loading"
              >
                <Spinner size="lg" />
              </div>
            )}
            {!topOpportunitiesLoading && topOpportunities.length > 0 && (
              <div className="gba:space-y-3">
                {topOpportunities.map((opportunity, index) => {
                  const content = (
                    <>
                      <div className="gba:flex gba:items-center gba:gap-3">
                        <span className="gba:text-xs gba:text-gray-600">#{index + 1}</span>
                        <div>
                          <div className="gba:font-medium">{opportunity.name}</div>
                          <div className="gba:text-sm gba:text-gray-600">
                            {opportunity.stage} • {opportunity.winChance}% win chance • {opportunity.owner}
                          </div>
                        </div>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:font-bold">
                          {formatCurrencyCompact(opportunity.value, topOpportunitiesCurrency, undefined, 1, true)}
                        </div>
                        <div className="gba:text-sm gba:text-gray-600">Opportunity Value</div>
                      </div>
                    </>
                  )

                  if (onTopOpportunityClick) {
                    return (
                      <button
                        key={opportunity.id}
                        type="button"
                        className="gba:flex gba:w-full gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:text-left gba:transition-colors gba:hover:bg-muted"
                        onClick={() => onTopOpportunityClick(opportunity.id)}
                        data-testid={`top-opportunity-${index}`}
                      >
                        {content}
                      </button>
                    )
                  }

                  return (
                    <div
                      key={opportunity.id}
                      className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                      data-testid={`top-opportunity-${index}`}
                    >
                      {content}
                    </div>
                  )
                })}
              </div>
            )}
            {!topOpportunitiesLoading && topOpportunities.length === 0 && (
              <div className="gba:text-center gba:text-gray-500 gba:py-8">No opportunity data available</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default OpportunitiesTabLayout
