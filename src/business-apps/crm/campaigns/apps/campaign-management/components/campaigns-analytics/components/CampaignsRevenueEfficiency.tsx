import React, { useMemo, useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, ComposedChart, Bar, Line, Treemap } from 'recharts'
import { ChartScatterIcon, ChartBarIcon, GridFourIcon } from '@phosphor-icons/react'
import {
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { NW_CHART_COLOR_VARS, nwChartColorAt } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'
import { TooltipWrapper, TooltipDataLine } from '@/common/components/customer/campaign-management/ChartHelpers'
import { ChartCard, ChartTypeSwitcher } from '@/common/components/customer/campaign-management/ChartCard'

/**
 * Scatter chart tooltip - Extracted for performance
 */
interface EfficiencyScatterData {
  fullName: string
  revenuePerLead: number
  winRate: number
  efficiencyScore: number
  leadsCount: number
  revenue: number
}

interface EfficiencyScatterTooltipProps {
  active?: boolean
  payload?: Array<{ payload: EfficiencyScatterData }>
}

const EfficiencyScatterTooltip: React.FC<EfficiencyScatterTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <TooltipWrapper title={data.fullName}>
        <TooltipDataLine
          label="Revenue/Lead"
          value={formatCurrencyCompact(data.revenuePerLead, 'USD')}
          color={NW_CHART_COLOR_VARS[1]}
        />
        <TooltipDataLine label="Win Rate" value={`${data.winRate.toFixed(1)}%`} color={NW_CHART_COLOR_VARS[0]} />
        <TooltipDataLine
          label="Efficiency Score"
          value={`${data.efficiencyScore.toFixed(1)}%`}
          color={NW_CHART_COLOR_VARS[2]}
        />
        <TooltipDataLine label="Total Leads" value={data.leadsCount} color={NW_CHART_COLOR_VARS[3]} />
        <TooltipDataLine
          label="Total Revenue"
          value={formatCurrencyCompact(data.revenue, 'USD')}
          color={NW_CHART_COLOR_VARS[4]}
        />
      </TooltipWrapper>
    )
  }
  return null
}

/**
 * Treemap tooltip - Extracted for performance
 */
interface EfficiencyTreemapData {
  size?: number
  fullName?: string
  name?: string
  revenuePerLead?: number
  efficiencyScore?: number
}

interface EfficiencyTreemapTooltipProps {
  active?: boolean
  payload?: Array<{ payload: EfficiencyTreemapData }>
  totalRevenue: number
}

const EfficiencyTreemapTooltip: React.FC<EfficiencyTreemapTooltipProps> = ({ active, payload, totalRevenue }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    if (data?.size) {
      const percentage = totalRevenue > 0 ? ((data.size / totalRevenue) * 100).toFixed(1) : '0.0'
      return (
        <TooltipWrapper title={data.fullName || data.name || 'Unknown'}>
          <TooltipDataLine
            label="Revenue"
            value={`${formatCurrencyCompact(data.size || 0, 'USD')} (${percentage}%)`}
            color={NW_CHART_COLOR_VARS[1]}
          />
          {data.revenuePerLead && (
            <TooltipDataLine
              label="Revenue/Lead"
              value={formatCurrencyCompact(data.revenuePerLead, 'USD')}
              color={NW_CHART_COLOR_VARS[0]}
            />
          )}
          {data.efficiencyScore && (
            <TooltipDataLine
              label="Efficiency Score"
              value={`${data.efficiencyScore.toFixed(1)}%`}
              color={NW_CHART_COLOR_VARS[2]}
            />
          )}
        </TooltipWrapper>
      )
    }
  }
  return null
}

/**
 * Composed chart tooltip - Extracted for performance
 */
interface EfficiencyComposedData {
  fullName: string
  revenuePerLead: number
  revenuePerOpportunity: number
  efficiencyScore: number
  winRate: number
}

interface EfficiencyComposedTooltipProps {
  active?: boolean
  payload?: Array<{ payload: EfficiencyComposedData }>
}

const EfficiencyComposedTooltip: React.FC<EfficiencyComposedTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <TooltipWrapper title={data.fullName}>
        <TooltipDataLine
          label="Revenue/Lead"
          value={formatCurrencyCompact(data.revenuePerLead, 'USD')}
          color={NW_CHART_COLOR_VARS[1]}
        />
        <TooltipDataLine
          label="Revenue/Opp"
          value={formatCurrencyCompact(data.revenuePerOpportunity, 'USD')}
          color={NW_CHART_COLOR_VARS[0]}
        />
        <TooltipDataLine
          label="Efficiency Score"
          value={`${data.efficiencyScore.toFixed(1)}%`}
          color={NW_CHART_COLOR_VARS[2]}
        />
        <TooltipDataLine label="Win Rate" value={`${data.winRate.toFixed(1)}%`} color={NW_CHART_COLOR_VARS[3]} />
      </TooltipWrapper>
    )
  }
  return null
}

const CampaignsRevenueEfficiency: React.FC<CampaignsAnalyticsComponentProps> = ({
  efficiencyComparisons = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [chartType, setChartType] = useState<'scatter' | 'composed' | 'treemap'>('scatter')

  const scatterChartConfig = useMemo<ChartConfig>(() => ({ scatter: { label: 'Campaigns' } }), [])
  const composedChartConfig = useMemo<ChartConfig>(
    () => ({
      revenueperlead: { label: 'Revenue per Lead' },
      efficiencyscore: { label: 'Efficiency Score (%)' }
    }),
    []
  )
  const treemapChartConfig = useMemo<ChartConfig>(() => ({ segments: { label: 'Revenue share' } }), [])

  const efficiencyData = efficiencyComparisons
    .map(campaign => ({
      id: campaign.campaignId,
      name: campaign.campaignName.length > 20 ? campaign.campaignName.substring(0, 20) + '...' : campaign.campaignName,
      fullName: campaign.campaignName,
      revenue: campaign.totalRevenue,
      winRate: campaign.winRate,
      conversionRate: campaign.conversionRate,
      leadsCount: campaign.leadsCount,
      opportunitiesCount: campaign.opportunitiesCount,
      wonOpportunitiesCount: campaign.wonOpportunitiesCount,
      // Efficiency metrics
      revenuePerLead: campaign.leadsCount > 0 ? campaign.totalRevenue / campaign.leadsCount : 0,
      revenuePerOpportunity: campaign.opportunitiesCount > 0 ? campaign.totalRevenue / campaign.opportunitiesCount : 0,
      revenuePerWonOpportunity:
        campaign.wonOpportunitiesCount > 0 ? campaign.totalRevenue / campaign.wonOpportunitiesCount : 0,
      // ROI efficiency score (combination of conversion and win rates)
      efficiencyScore: (campaign.conversionRate + campaign.winRate) / 2,
      // Size for bubble chart
      size: campaign.leadsCount,
      status: campaign.status
    }))
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    .map((entry, index) => ({
      ...entry,
      fill: nwChartColorAt(index)
    }))

  // Calculate total revenue for treemap tooltip
  const totalRevenue = efficiencyData.reduce((sum, item) => sum + item.revenue, 0)

  const renderChart = () => {
    switch (chartType) {
      case 'scatter':
        return (
          <ChartContainer config={scatterChartConfig} className="gba:h-[500px] gba:w-full">
            <ScatterChart data={efficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <XAxis
                type="number"
                dataKey="revenuePerLead"
                name="Revenue per Lead"
                tickFormatter={val => formatCurrencyCompact(val, 'USD')}
                label={{ value: 'Revenue per Lead', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="winRate"
                name="Win Rate"
                label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip content={<EfficiencyScatterTooltip />} />
              <Scatter name="Campaigns" dataKey="winRate" fill="var(--color-scatter)" />
            </ScatterChart>
          </ChartContainer>
        )

      case 'composed':
        return (
          <ChartContainer config={composedChartConfig} className="gba:h-[500px] gba:w-full">
            <ComposedChart data={efficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis yAxisId="revenue" orientation="left" tickFormatter={val => formatCurrencyCompact(val, 'USD')} />
              <YAxis yAxisId="score" orientation="right" domain={[0, 100]} />
              <ChartTooltip content={<EfficiencyComposedTooltip />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="revenue"
                dataKey="revenuePerLead"
                fill="var(--color-revenueperlead)"
                name="Revenue per Lead"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="efficiencyScore"
                stroke="var(--color-efficiencyscore)"
                strokeWidth={3}
                name="Efficiency Score (%)"
                dot={{ fill: 'var(--color-efficiencyscore)', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ChartContainer>
        )

      case 'treemap':
        return (
          <ChartContainer config={treemapChartConfig} className="gba:h-[500px] gba:w-full">
            {efficiencyData.length > 0 ? (
              <Treemap
                data={efficiencyData.map((campaign, index) => ({
                  name: campaign.name,
                  fullName: campaign.fullName,
                  size: campaign.revenue,
                  fill: nwChartColorAt(index),
                  revenuePerLead: campaign.revenuePerLead,
                  efficiencyScore: campaign.efficiencyScore
                }))}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="var(--color-border-default)"
                fill="var(--nw-chart-3)"
              >
                <ChartTooltip content={<EfficiencyTreemapTooltip totalRevenue={totalRevenue} />} />
              </Treemap>
            ) : (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
                <span className="gba:text-muted-foreground">No data available for treemap visualization</span>
              </div>
            )}
          </ChartContainer>
        )

      default:
        return null
    }
  }

  return (
    <ChartCard
      title={getTranslationFromI18nKeyAndLabel(
        'campaigns.analytics.revenueEfficiency.title',
        'Revenue Efficiency Analysis'
      )}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={efficiencyData.length === 0}
      emptyMessage={getTranslationFromI18nKeyAndLabel(
        'campaigns.analytics.revenueEfficiency.noData',
        'No efficiency data available - need campaigns with both leads and revenue'
      )}
      headerActions={
        <ChartTypeSwitcher
          options={[
            { value: 'scatter' as const, label: 'Scatter', icon: <ChartScatterIcon /> },
            { value: 'composed' as const, label: 'Composed', icon: <ChartBarIcon /> },
            { value: 'treemap' as const, label: 'Treemap', icon: <GridFourIcon /> }
          ]}
          activeType={chartType}
          onChange={setChartType}
          data-testid="revenue-efficiency-chart-type"
        />
      }
      data-testid="campaigns-revenue-efficiency"
    >
      <>
        {/* Efficiency Insights - Horizontal Layout */}
        <div className="gba:mb-3 gba:p-3 gba:rounded-lg gba:bg-muted">
          <div className="gba:flex gba:justify-between gba:items-center gba:text-sm gba:gap-3">
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold gba:text-[var(--nw-chart-2)]">
                {efficiencyData.length > 0
                  ? formatCurrencyCompact(Math.max(...efficiencyData.map(c => c.revenuePerLead)), 'USD')
                  : '$0'}
              </span>
              <span className="gba:ml-1 gba:text-muted-foreground">Best Rev/Lead</span>
            </div>
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold gba:text-[var(--nw-chart-1)]">
                {efficiencyData.length > 0 ? Math.max(...efficiencyData.map(c => c.efficiencyScore)).toFixed(1) : '0.0'}
                %
              </span>
              <span className="gba:ml-1 gba:text-muted-foreground">Top Score</span>
            </div>
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold gba:text-[var(--nw-chart-4)]">
                {efficiencyData.length > 0
                  ? formatCurrencyCompact(
                      efficiencyData.reduce((sum, c) => sum + c.revenuePerLead, 0) / efficiencyData.length,
                      'USD'
                    )
                  : '$0'}
              </span>
              <span className="gba:ml-1 gba:text-muted-foreground">Avg Rev/Lead</span>
            </div>
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold gba:text-[var(--nw-chart-5)]">{efficiencyData[0]?.name || 'N/A'}</span>
              <span className="gba:ml-1 gba:text-muted-foreground">Most Efficient</span>
            </div>
          </div>
        </div>

        {renderChart()}

        {/* Chart explanation */}
        <div className="gba:mt-4 gba:text-xs gba:text-muted-foreground">
          {chartType === 'scatter' && (
            <p>
              <strong>Scatter Plot:</strong> Revenue per Lead vs Win Rate. Color intensity indicates efficiency score.
              Top-right quadrant shows best performers.
            </p>
          )}
          {chartType === 'composed' && (
            <p>
              <strong>Composed Chart:</strong> Green bars show revenue per lead (left axis), purple line shows
              efficiency score (right axis).
            </p>
          )}
          {chartType === 'treemap' && (
            <p>
              <strong>Treemap:</strong> Rectangle size represents total revenue. Hover to see efficiency metrics for
              each campaign.
            </p>
          )}
        </div>
      </>
    </ChartCard>
  )
}

export default CampaignsRevenueEfficiency
