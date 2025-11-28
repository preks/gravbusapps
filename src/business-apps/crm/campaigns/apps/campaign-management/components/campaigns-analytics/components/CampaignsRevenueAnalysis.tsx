import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from 'recharts'
import {
  DollarOutlined,
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  RadarChartOutlined
} from '@ant-design/icons'
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
 * Custom tooltip for revenue bar/area/radar charts
 * Extracted to improve performance and testability
 */
interface RevenueBarTooltipData {
  fullName: string
  revenue: number
  winRate: number
  revenuePerOpportunity: number
  revenuePerLead: number
}

interface RevenueBarTooltipProps {
  active?: boolean
  payload?: Array<{ payload: RevenueBarTooltipData }>
}

const RevenueBarTooltip: React.FC<RevenueBarTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    return (
      <TooltipWrapper title={data.fullName}>
        <TooltipDataLine
          label="Revenue"
          value={formatCurrencyCompact(data.revenue, 'USD')}
          color={CHART_COLORS.success}
        />
        <TooltipDataLine label="Win Rate" value={`${data.winRate.toFixed(1)}%`} color={CHART_COLORS.primary} />
        <TooltipDataLine
          label="Revenue/Opportunity"
          value={formatCurrencyCompact(data.revenuePerOpportunity, 'USD')}
          color={CHART_COLORS.accent}
        />
        <TooltipDataLine
          label="Revenue/Lead"
          value={formatCurrencyCompact(data.revenuePerLead, 'USD')}
          color={CHART_COLORS.warning}
        />
      </TooltipWrapper>
    )
  }
  return null
}

/**
 * Custom tooltip for revenue pie chart
 * Extracted to improve performance and testability
 */
interface RevenuePieTooltipData {
  fullName: string
  revenue: number
}

interface RevenuePieTooltipProps {
  active?: boolean
  payload?: Array<{ payload: RevenuePieTooltipData }>
  totalRevenue: number
}

const RevenuePieTooltip: React.FC<RevenuePieTooltipProps> = ({ active, payload, totalRevenue }) => {
  if (active && payload?.length) {
    const data = payload[0].payload
    const percentage = ((data.revenue / totalRevenue) * 100).toFixed(1)
    return (
      <TooltipWrapper title={data.fullName}>
        <TooltipDataLine
          label="Revenue"
          value={`${formatCurrencyCompact(data.revenue, 'USD')} (${percentage}%)`}
          color={CHART_COLORS.success}
        />
      </TooltipWrapper>
    )
  }
  return null
}

const CampaignsRevenueAnalysis: React.FC<CampaignsAnalyticsComponentProps> = ({
  revenueComparisons = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [chartType, setChartType] = useState<'revenue-bar' | 'revenue-pie' | 'revenue-area' | 'revenue-radar'>(
    'revenue-bar'
  )

  // Radar chart configuration to eliminate duplication
  const radarSeriesConfig = [
    { name: 'Revenue', dataKey: 'Revenue', color: CHART_COLORS.success },
    { name: 'Win Rate', dataKey: 'Win Rate', color: CHART_COLORS.primary },
    { name: 'Rev/Opp', dataKey: 'Rev/Opp', color: CHART_COLORS.accent },
    { name: 'Rev/Lead', dataKey: 'Rev/Lead', color: CHART_COLORS.warning }
  ] as const

  // Prepare revenue data for different visualizations with better filtering
  const revenueData = revenueComparisons
    .filter(campaign => campaign.totalRevenue > 0 && campaign.leadsCount > 0 && campaign.opportunitiesCount > 0)
    .map(campaign => ({
      id: campaign.campaignId,
      name: campaign.campaignName.length > 15 ? campaign.campaignName.substring(0, 15) + '...' : campaign.campaignName,
      fullName: campaign.campaignName,
      revenue: campaign.totalRevenue,
      winRate: campaign.winRate,
      opportunitiesCount: campaign.opportunitiesCount,
      wonOpportunitiesCount: campaign.wonOpportunitiesCount,
      status: campaign.status,
      // Calculate revenue per opportunity
      revenuePerOpportunity: campaign.opportunitiesCount > 0 ? campaign.totalRevenue / campaign.opportunitiesCount : 0,
      // Calculate revenue efficiency (revenue per lead)
      revenuePerLead: campaign.leadsCount > 0 ? campaign.totalRevenue / campaign.leadsCount : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Calculate total revenue for pie chart percentage
  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0)

  // Radar chart data - normalize values for better visualization
  const radarData = revenueData.slice(0, 6).map(campaign => {
    const maxRevenue = Math.max(...revenueData.map(c => c.revenue))
    const maxRevenuePerOpp = Math.max(...revenueData.map(c => c.revenuePerOpportunity))
    const maxRevenuePerLead = Math.max(...revenueData.map(c => c.revenuePerLead))

    return {
      campaign: campaign.name,
      fullName: campaign.fullName,
      Revenue: (campaign.revenue / maxRevenue) * 100,
      'Win Rate': campaign.winRate,
      'Rev/Opp': (campaign.revenuePerOpportunity / maxRevenuePerOpp) * 100,
      'Rev/Lead': (campaign.revenuePerLead / maxRevenuePerLead) * 100,
      Opportunities: (campaign.opportunitiesCount / Math.max(...revenueData.map(c => c.opportunitiesCount))) * 100
    }
  })

  const renderChart = () => {
    switch (chartType) {
      case 'revenue-bar':
        return (
          <ChartContainer>
            {}
            <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tickFormatter={val => formatCurrencyCompact(val, 'USD')} />
              <Tooltip content={<RevenueBarTooltip />} />
              <Bar dataKey="revenue" fill={CHART_COLORS.success} name="Revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
            {}
          </ChartContainer>
        )

      case 'revenue-pie':
        return (
          <ChartContainer>
            {}
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={40}
                paddingAngle={2}
                dataKey="revenue"
                label={(props: { name?: string; percent?: number }) => {
                  const name = props.name || ''
                  const percent = props.percent || 0
                  return `${name} ${(percent * 100).toFixed(0)}%`
                }}
                labelLine={false}
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${entry.id}`} fill={CHART_COLOR_ARRAY[index % CHART_COLOR_ARRAY.length]} />
                ))}
              </Pie>
              <Tooltip content={<RevenuePieTooltip totalRevenue={totalRevenue} />} />
            </PieChart>
            {}
          </ChartContainer>
        )

      case 'revenue-area':
        return (
          <ChartContainer>
            {}
            <AreaChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tickFormatter={val => formatCurrencyCompact(val, 'USD')} />
              <Tooltip content={<RevenueBarTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={CHART_COLORS.success}
                fillOpacity={1}
                fill="url(#revenueGradient)"
                strokeWidth={3}
              />
            </AreaChart>
            {}
          </ChartContainer>
        )

      case 'revenue-radar':
        return (
          <ChartContainer>
            {}
            <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="campaign" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tickFormatter={value => `${value}%`} />
              {radarSeriesConfig.map(series => (
                <Radar
                  key={series.dataKey}
                  name={series.name}
                  dataKey={series.dataKey}
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Tooltip />
              <Legend />
            </RadarChart>
            {}
          </ChartContainer>
        )

      default:
        return null
    }
  }

  const chartTypeOptions = [
    { value: 'revenue-bar' as const, label: 'Bar', icon: <BarChartOutlined /> },
    { value: 'revenue-pie' as const, label: 'Pie', icon: <PieChartOutlined /> },
    { value: 'revenue-area' as const, label: 'Area', icon: <LineChartOutlined /> },
    { value: 'revenue-radar' as const, label: 'Radar', icon: <RadarChartOutlined /> }
  ]

  return (
    <ChartCard
      title={
        <>
          <DollarOutlined style={{ color: CHART_COLORS.success }} />
          {getTranslationFromI18nKeyAndLabel('campaigns.analytics.revenueAnalysis.title', 'Won Revenue Analysis')}
        </>
      }
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      isEmpty={revenueData.length === 0}
      emptyMessage={getTranslationFromI18nKeyAndLabel(
        'campaigns.analytics.revenueAnalysis.noData',
        'No revenue data available - campaigns have not generated any won revenue yet'
      )}
      headerActions={
        <ChartTypeSwitcher
          options={chartTypeOptions}
          activeType={chartType}
          onChange={setChartType}
          data-testid="revenue-chart-type-switcher"
        />
      }
      data-testid="campaigns-revenue-analysis"
    >
      {revenueData.length > 0 && (
        <>
          {/* Revenue Insights - Horizontal Layout */}
          <div
            className="gba:mb-3 gba:p-3 gba:rounded-lg"
            style={{ backgroundColor: 'var(--color-surface-secondary)' }}
          >
            <div className="gba:flex gba:justify-between gba:items-center gba:text-sm gba:gap-4">
              <div className="gba:text-center gba:flex-1">
                <span className="gba:font-semibold" style={{ color: 'var(--color-success-600)' }}>
                  {formatCurrencyCompact(
                    revenueData.reduce((sum, item) => sum + item.revenue, 0),
                    'USD'
                  )}
                </span>
                <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Total Won
                </span>
              </div>
              <div className="gba:text-center gba:flex-1">
                <span className="gba:font-semibold" style={{ color: 'var(--color-primary-600)' }}>
                  {formatCurrencyCompact(
                    revenueData.length > 0
                      ? revenueData.reduce((sum, item) => sum + item.revenue, 0) / revenueData.length
                      : 0,
                    'USD'
                  )}
                </span>
                <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Avg/Campaign
                </span>
              </div>
              <div className="gba:text-center gba:flex-1">
                <span className="gba:font-semibold" style={{ color: 'var(--color-warning-600)' }}>
                  {revenueData[0]?.name || 'N/A'}
                </span>
                <span className="gba:ml-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Top Campaign
                </span>
              </div>
            </div>
          </div>

          {renderChart()}
        </>
      )}
    </ChartCard>
  )
}

export default CampaignsRevenueAnalysis
