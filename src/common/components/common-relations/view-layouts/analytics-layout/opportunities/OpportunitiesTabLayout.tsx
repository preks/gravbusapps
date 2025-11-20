import React from 'react'
import { WidgetGroup } from '@/components/widget-group'
import {
  DollarCircleOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  PercentageOutlined
} from '@ant-design/icons'
import {
  OpportunityLifecycleChart,
  TimeFilter as OpportunityTimeFilter,
  PipelineItem
} from './widgets/OpportunityLifecycleChart'
import { OpportunityVelocityAnalysis } from './widgets/OpportunityVelocityAnalysis'
import { DealHealthMatrix } from './widgets/DealHealthMatrix'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { OpportunitiesByStageBar } from './widgets/OpportunitiesByStageBar'
import { OpportunitiesByPipelinePie } from './widgets/OpportunitiesByPipelinePie'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'

export interface OpportunitiesTrendData {
  totalOpportunitiesLastMonth: number
  previousPeriodPipelineValue: number
  actualWinRateThisMonth: number
  actualWinRateLastMonth: number
  actualAvgDealSizeThisMonth: number
  actualAvgDealSizeLastMonth: number
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
  if (previous === 0) {
    return current > 0 ? '100.0%' : '0.0%'
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
  pipelines: PipelineItem[]
  selectedPipelineId?: string
  onPipelineChange: (id: string) => void
  selectedTimeFilter: OpportunityTimeFilter
  onTimeFilterChange: (filter: OpportunityTimeFilter) => void
  opportunitiesByStage: Array<{ stage: string; count: number; value: number }>
  selectedStagePipelineId?: string
  onStagePipelineChange?: (id: string) => void
  opportunitiesByPipeline: Array<{ pipelineId: string; pipeline: string; count: number; percentage: number }>
  topDeals: Array<{ id: string; name: string; value: number; stage: string; winChance: number; owner: string }>
  velocityData?: { averageDaysInPipeline: number; velocityTrend: any[]; quickWins: any[]; slowMovers: any[] } | null
  dealHealthData?: { healthDistribution: any; matrixData: any[] } | null
  moduleColor?: string
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
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  selectedTimeFilter,
  onTimeFilterChange,
  opportunitiesByStage,
  selectedStagePipelineId,
  onStagePipelineChange,
  opportunitiesByPipeline,
  topDeals,
  velocityData,
  dealHealthData,
  moduleColor = 'default'
}) => {
  const kpis = [
    {
      key: 'total-opportunities',
      title: 'Total Opportunities',
      value: totalOpportunities,
      prefix: <DollarCircleOutlined />,
      description: 'All opportunities in pipeline',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: calculatePercentChange(totalOpportunities, trendData.totalOpportunitiesLastMonth || 0),
              positive: totalOpportunities >= (trendData.totalOpportunitiesLastMonth || 0),
              description: `${totalOpportunities} total vs ${trendData.totalOpportunitiesLastMonth || 0} last month`
            }
          }
        : {})
    },
    {
      key: 'total-value',
      title: selectedPipelineId ? 'Pipeline Value (Filtered)' : 'Total Pipeline Value',
      value: formatCurrencyCompact(totalValue, 'USD', undefined, 1, true),
      valueIsString: true,
      prefix: <DollarCircleOutlined />,
      description: selectedPipelineId ? 'Combined value in selected pipeline' : 'Combined value of all opportunities',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: calculatePercentChange(totalValue, trendData.previousPeriodPipelineValue || 0),
              positive: totalValue >= (trendData.previousPeriodPipelineValue || 0),
              description: `${formatCurrencyCompact(totalValue, 'USD', undefined, 1, true)} total vs ${formatCurrencyCompact(trendData.previousPeriodPipelineValue || 0, 'USD', undefined, 1, true)} last month`
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
              description: `${(trendData.actualWinRateThisMonth || winRate).toFixed(1)}% this period vs ${(trendData.actualWinRateLastMonth || 0).toFixed(1)}% last month`
            }
          }
        : {})
    },
    {
      key: 'avg-deal-size',
      title: 'Avg. Deal Size',
      value: formatCurrencyCompact(trendData?.actualAvgDealSizeThisMonth || avgDealSize, 'USD', undefined, 1, true),
      valueIsString: true,
      prefix: <DollarCircleOutlined />,
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
              description: `${formatCurrencyCompact(trendData.actualAvgDealSizeThisMonth || avgDealSize, 'USD', undefined, 1, true)} this period vs ${formatCurrencyCompact(trendData.actualAvgDealSizeLastMonth || 0, 'USD', undefined, 1, true)} last month`
            }
          }
        : {})
    },
    {
      key: 'opportunities-this-period',
      title: 'New This Period',
      value: trendData?.currentPeriodOpportunities || lifecycleData.reduce((s, i) => s + (i as any).count || 0, 0),
      prefix: <RiseOutlined />,
      description: 'Opportunities created in selected period',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: calculatePercentChange(
                trendData.currentPeriodOpportunities || 0,
                trendData.previousPeriodOpportunities || 0
              ),
              positive: (trendData.currentPeriodOpportunities || 0) >= (trendData.previousPeriodOpportunities || 0),
              description: `${trendData.currentPeriodOpportunities || 0} this period vs ${trendData.previousPeriodOpportunities || 0} previous`
            }
          }
        : {})
    },
    {
      key: 'avg-sales-cycle',
      title: 'Avg. Sales Cycle',
      value: avgSalesCycle,
      suffix: ' days',
      prefix: <ClockCircleOutlined />,
      description: 'Average time to close deals',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: calculatePercentChange(avgSalesCycle, trendData.actualAvgSalesCycleLastMonth || 0),
              positive: avgSalesCycle <= (trendData.actualAvgSalesCycleLastMonth || 0),
              description: `${avgSalesCycle} days this period vs ${trendData.actualAvgSalesCycleLastMonth || 0} days last month`
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
              description: `${(trendData.actualConversionRateThisMonth || 0).toFixed(1)}% this period vs ${(trendData.actualConversionRateLastMonth || 0).toFixed(1)}% last month`
            }
          }
        : {})
    },
    {
      key: 'pipeline-velocity',
      title: 'Pipeline Velocity',
      value: typeof _pipelineVelocity === 'number' && Number.isFinite(_pipelineVelocity) ? _pipelineVelocity : 0,
      suffix: ' days',
      prefix: <ClockCircleOutlined />,
      description: 'Average time in pipeline',
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: calculatePercentChange(
                Number(_pipelineVelocity) || 0,
                Number(trendData.actualPipelineVelocityLastMonth) || 0
              ),
              positive: (Number(_pipelineVelocity) || 0) <= (Number(trendData.actualPipelineVelocityLastMonth) || 0),
              description: `${Number(_pipelineVelocity) || 0} days this period vs ${Number(trendData.actualPipelineVelocityLastMonth) || 0} days last month`
            }
          }
        : {})
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid="opportunities-analytics-tab">
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">{title}</h2>
        <WidgetGroup widgets={kpis} data-testid="opportunities-key-metrics" />
      </div>

      <OpportunityLifecycleChart
        data={lifecycleData}
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

      <div className="gba:flex gba:flex-col lg:gba:flex-row gba:gap-6">
        <div className="gba:flex-1 lg:gba:w-3/4">
          <OpportunitiesByStageBar
            data={opportunitiesByStage}
            moduleColor={moduleColor}
            pipelines={pipelines}
            selectedPipelineId={selectedStagePipelineId}
            onPipelineChange={onStagePipelineChange}
          />
        </div>
        <div className="gba:flex-1 lg:gba:w-1/4 lg:gba:flex-none">
          <OpportunitiesByPipelinePie data={opportunitiesByPipeline} moduleColor={moduleColor} />
        </div>
      </div>

      <Card data-testid="top-deals-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">Top Opportunities by Value</CardTitle>
        </CardHeader>
        <CardContent>
          {topDeals.length > 0 ? (
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
                    <div className="gba:font-bold">{formatCurrencyCompact(deal.value, 'USD', undefined, 1, true)}</div>
                    <div className="gba:text-sm gba:text-gray-600">Opportunity Value</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-8">No deal data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default OpportunitiesTabLayout
