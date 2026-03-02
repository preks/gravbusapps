import React from 'react'
import { WidgetGroup } from '@/components/widget-group'
import {
  CurrencyCircleDollarIcon,
  TrophyIcon,
  ClockIcon,
  TrendUpIcon,
  PercentIcon
} from '@phosphor-icons/react'
import {
  OpportunityLifecycleChart,
  TimeFilter as OpportunityTimeFilter,
  PipelineItem
} from './widgets/OpportunityLifecycleChart'
import { OpportunityVelocityAnalysis } from './widgets/OpportunityVelocityAnalysis'
import { DealHealthMatrix } from './widgets/DealHealthMatrix'
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
  actualConversionRateThisMonth?: number
  actualConversionRateLastMonth?: number
  actualPipelineVelocityLastMonth?: number
}

export interface OpportunityLifecyclePoint {
  date: string
  opportunitiesCreated: number
  opportunitiesWon: number
}

const calculatePercentChange = (current: number, previous: number): string => {
  // Handle edge case where previous is 0
  if (previous === 0) {
    if (current === 0) {
      return '0.0%'
    } else {
      return '100.0%'
    }
  }
  return `${(((current - previous) / previous) * 100).toFixed(1)}%`
}

export interface OpportunitiesTabLayoutProps {
  title?: string
  totalOpportunities: number
  totalValue: number
  winRate: number
  avgDealSize: number
  avgSalesCycle: number
  pipelineVelocity: number
  trendData?: OpportunitiesTrendData | null
  trendLoading?: boolean
  lifecycleData: OpportunityLifecyclePoint[]
  lifecycleLoading?: boolean
  pipelines: PipelineItem[]
  selectedPipelineId?: string
  onPipelineChange: (id: string) => void
  selectedTimeFilter: OpportunityTimeFilter
  onTimeFilterChange: (filter: OpportunityTimeFilter) => void
  opportunitiesByStage: Array<{ stage: string; count: number; value: number }>
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
  velocityData?: { averageDaysInPipeline: number; velocityTrend: any[]; quickWins: any[]; slowMovers: any[] } | null
  dealHealthData?: { healthDistribution: any; matrixData: any[] } | null
  moduleColor?: string

  // Currency filter props
  kpiCurrency?: string
  onKpiCurrencyChange?: (currency: string) => void
  topDealsCurrency?: string
  onTopDealsCurrencyChange?: (currency: string) => void
  availableCurrencies?: string[]

  // Feature flags
  showTopDeals?: boolean // Default: true - Set to false to hide top deals section (e.g., for IRM)
}

// colors local to pie widget

export const OpportunitiesTabLayout: React.FC<OpportunitiesTabLayoutProps> = ({
  title = 'Opportunities Analytics',
  totalOpportunities,
  totalValue,
  winRate,
  avgDealSize,
  avgSalesCycle,
  pipelineVelocity: _pipelineVelocity,
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
  topDeals,
  topDealsLoading = false,
  velocityData,
  dealHealthData,
  moduleColor = 'default',
  kpiCurrency = 'EUR',
  onKpiCurrencyChange,
  topDealsCurrency = 'EUR',
  onTopDealsCurrencyChange,
  availableCurrencies = ['EUR', 'USD'],
  showTopDeals = true
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
            trend: {
              value: calculatePercentChange(totalOpportunities, trendData.totalOpportunitiesLastMonth || 0),
              positive: totalOpportunities >= (trendData.totalOpportunitiesLastMonth || 0),
              description: 'vs previous period (30 days ago)'
            }
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
            trend: {
              value: calculatePercentChange(totalValue, trendData.previousPeriodPipelineValue || 0),
              positive: totalValue >= (trendData.previousPeriodPipelineValue || 0),
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    },
    {
      key: 'win-rate',
      title: 'Win Rate',
      value: trendData?.actualWinRateThisMonth || winRate,
      suffix: '%',
      prefix: <TrophyOutlined />,
      description: 'Percentage of won opportunities',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs((trendData.actualWinRateThisMonth || winRate) - (trendData.actualWinRateLastMonth || 0)).toFixed(1)}%`,
              positive: (trendData.actualWinRateThisMonth || winRate) >= (trendData.actualWinRateLastMonth || 0),
              description: 'vs previous period (30 days ago)'
            }
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
            trend: {
              value: calculatePercentChange(
                trendData.actualAvgDealSizeThisMonth || avgDealSize,
                trendData.actualAvgDealSizeLastMonth || 0
              ),
              positive:
                (trendData.actualAvgDealSizeThisMonth || avgDealSize) >= (trendData.actualAvgDealSizeLastMonth || 0),
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    },
    {
      key: 'opportunities-this-period',
      title: 'New This Period',
      value: trendData?.currentPeriodOpportunities || lifecycleData.reduce((s, i) => s + (i as any).count || 0, 0),
      prefix: <TrendUpIcon size={16} />,
      description: 'Opportunities created in selected period',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: calculatePercentChange(
                trendData.currentPeriodOpportunities || 0,
                trendData.previousPeriodOpportunities || 0
              ),
              positive: (trendData.currentPeriodOpportunities || 0) >= (trendData.previousPeriodOpportunities || 0),
              description: 'vs previous period (30 days ago)'
            }
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
            trend: {
              value: calculatePercentChange(avgSalesCycle, trendData.actualAvgOpportunityValueLastMonth || 0),
              positive: avgSalesCycle >= (trendData.actualAvgOpportunityValueLastMonth || 0),
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    },
    {
      key: 'conversion-rate',
      title: 'Conversion Rate',
      value: trendData?.actualConversionRateThisMonth ?? 0,
      suffix: '%',
      prefix: <PercentageOutlined />,
      description: 'Leads converted to opportunities',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs((trendData.actualConversionRateThisMonth || 0) - (trendData.actualConversionRateLastMonth || 0)).toFixed(1)}%`,
              positive:
                (trendData.actualConversionRateThisMonth || 0) >= (trendData.actualConversionRateLastMonth || 0),
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    },
    {
      key: 'pipeline-velocity',
      title: 'Pipeline Velocity',
      value: typeof _pipelineVelocity === 'number' && Number.isFinite(_pipelineVelocity) ? _pipelineVelocity : 0,
      suffix: ' days',
      prefix: <ClockIcon size={16} />,
      description: 'Average time in pipeline',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: calculatePercentChange(
                Number(_pipelineVelocity) || 0,
                Number(trendData.actualPipelineVelocityLastMonth) || 0
              ),
              positive: (Number(_pipelineVelocity) || 0) <= (Number(trendData.actualPipelineVelocityLastMonth) || 0),
              description: 'vs previous period (30 days ago)'
            }
          }
        : {})
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="opportunities-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
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
      />

      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        <OpportunityVelocityAnalysis
          data={velocityData || { averageDaysInPipeline: 0, velocityTrend: [], quickWins: [], slowMovers: [] }}
          moduleColor={moduleColor}
        />
        <DealHealthMatrix
          data={
            dealHealthData || {
              healthDistribution: { excellent: 0, healthy: 0, warning: 0, critical: 0 },
              matrixData: []
            }
          }
          moduleColor={moduleColor}
        />
      </div>

      <OpportunitiesByStagePie
        data={opportunitiesByStage}
        moduleColor={moduleColor}
        pipelines={pipelines}
        selectedPipelineId={selectedStagePipelineId}
        onPipelineChange={onStagePipelineChange}
      />

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
                {topDeals.map((deal, index) => (
                  <div
                    key={deal.id}
                    className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                    data-testid={`top-deal-${index}`}
                  >
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
                  </div>
                ))}
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
