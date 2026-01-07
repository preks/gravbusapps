import React, { useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ComposedChart, Bar, Line, Legend, Cell, Treemap } from 'recharts'
import { DotChartOutlined, BarChartOutlined, AppstoreOutlined } from '@ant-design/icons'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { CHART_COLORS, CHART_COLOR_ARRAY } from '../../../utils/chartColors'
import {
  TooltipWrapper,
  TooltipDataLine,
  ChartContainer
} from '@/common/components/customer/campaign-management/ChartHelpers'
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
          color={CHART_COLORS.success}
        />
        <TooltipDataLine label="Win Rate" value={`${data.winRate.toFixed(1)}%`} color={CHART_COLORS.primary} />
        <TooltipDataLine
          label="Efficiency Score"
          value={`${data.efficiencyScore.toFixed(1)}%`}
          color={CHART_COLORS.accent}
        />
        <TooltipDataLine label="Total Leads" value={data.leadsCount} color={CHART_COLORS.warning} />
        <TooltipDataLine
          label="Total Revenue"
          value={formatCurrencyCompact(data.revenue, 'USD')}
          color={CHART_COLORS.danger}
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
            color={CHART_COLORS.success}
          />
          {data.revenuePerLead && (
            <TooltipDataLine
              label="Revenue/Lead"
              value={formatCurrencyCompact(data.revenuePerLead, 'USD')}
              color={CHART_COLORS.primary}
            />
          )}
          {data.efficiencyScore && (
            <TooltipDataLine
              label="Efficiency Score"
              value={`${data.efficiencyScore.toFixed(1)}%`}
              color={CHART_COLORS.accent}
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
          color={CHART_COLORS.success}
        />
        <TooltipDataLine
          label="Revenue/Opp"
          value={formatCurrencyCompact(data.revenuePerOpportunity, 'USD')}
          color={CHART_COLORS.primary}
        />
        <TooltipDataLine
          label="Efficiency Score"
          value={`${data.efficiencyScore.toFixed(1)}%`}
          color={CHART_COLORS.accent}
        />
        <TooltipDataLine label="Win Rate" value={`${data.winRate.toFixed(1)}%`} color={CHART_COLORS.warning} />
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

  // Prepare efficiency data (no filtering needed - already filtered by GraphQL query)
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

  // Calculate total revenue for treemap tooltip
  const totalRevenue = efficiencyData.reduce((sum, item) => sum + item.revenue, 0)

  const renderChart = () => {
    switch (chartType) {
      case 'scatter':
        return (
          <ChartContainer>
            {}
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
              <Tooltip content={<EfficiencyScatterTooltip />} />
              <Scatter name="Campaigns" dataKey="winRate" fill={CHART_COLORS.accent}>
                {efficiencyData.map((entry, index) => (
                  <Cell key={`cell-${entry.id}`} fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]} />
                ))}
              </Scatter>
            </ScatterChart>
            {}
          </ChartContainer>
        )

      case 'composed':
        return (
          <ChartContainer>
            {}
            <ComposedChart data={efficiencyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis yAxisId="revenue" orientation="left" tickFormatter={val => formatCurrencyCompact(val, 'USD')} />
              <YAxis yAxisId="score" orientation="right" domain={[0, 100]} />
              <Tooltip content={<EfficiencyComposedTooltip />} />
              <Legend />
              <Bar
                yAxisId="revenue"
                dataKey="revenuePerLead"
                fill={CHART_COLORS.success}
                name="Revenue per Lead"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="efficiencyScore"
                stroke={CHART_COLORS.accent}
                strokeWidth={3}
                name="Efficiency Score (%)"
                dot={{ fill: CHART_COLORS.accent, strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
            {}
          </ChartContainer>
        )

      case 'treemap':
        return (
          <ChartContainer>
            {/* eslint-disable newwork-local/no-hardcoded-colors */}
            {efficiencyData.length > 0 ? (
              <Treemap
                data={efficiencyData.map((campaign, index) => ({
                  name: campaign.name,
                  fullName: campaign.fullName,
                  size: campaign.revenue,
                  fill: CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length],
                  revenuePerLead: campaign.revenuePerLead,
                  efficiencyScore: campaign.efficiencyScore
                }))}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                fill={CHART_COLORS.accent}
              >
                <Tooltip content={<EfficiencyTreemapTooltip totalRevenue={totalRevenue} />} />
              </Treemap>
            ) : (
              <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  No data available for treemap visualization
                </span>
              </div>
            )}
            {/* eslint-enable newwork-local/no-hardcoded-colors */}
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
            { value: 'scatter' as const, label: 'Scatter', icon: <DotChartOutlined /> },
            { value: 'composed' as const, label: 'Composed', icon: <BarChartOutlined /> },
            { value: 'treemap' as const, label: 'Treemap', icon: <AppstoreOutlined /> }
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
        <div className="gba:mb-3 gba:p-3 gba:rounded-lg" style={{ backgroundColor: 'var(--color-surface-secondary)' }}>
          <div className="gba:flex gba:justify-between gba:items-center gba:text-sm gba:gap-3">
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold" style={{ color: 'var(--color-success-600)' }}>
                {efficiencyData.length > 0
                  ? formatCurrencyCompact(Math.max(...efficiencyData.map(c => c.revenuePerLead)), 'USD')
                  : '$0'}
              </span>
              <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                Best Rev/Lead
              </span>
            </div>
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold" style={{ color: 'var(--color-primary-600)' }}>
                {efficiencyData.length > 0 ? Math.max(...efficiencyData.map(c => c.efficiencyScore)).toFixed(1) : '0.0'}
                %
              </span>
              <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                Top Score
              </span>
            </div>
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold" style={{ color: 'var(--color-warning-600)' }}>
                {efficiencyData.length > 0
                  ? formatCurrencyCompact(
                      efficiencyData.reduce((sum, c) => sum + c.revenuePerLead, 0) / efficiencyData.length,
                      'USD'
                    )
                  : '$0'}
              </span>
              <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                Avg Rev/Lead
              </span>
            </div>
            <div className="gba:text-center gba:flex-1">
              <span className="gba:font-semibold" style={{ color: 'var(--color-purple-600)' }}>
                {efficiencyData[0]?.name || 'N/A'}
              </span>
              <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                Most Efficient
              </span>
            </div>
          </div>
        </div>

        {renderChart()}

        {/* Chart explanation */}
        <div className="gba:mt-4 gba:text-xs" style={{ color: 'var(--color-text-secondary)' }}>
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
