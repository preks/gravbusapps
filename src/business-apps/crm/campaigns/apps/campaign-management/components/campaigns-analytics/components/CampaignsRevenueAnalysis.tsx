import React, { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@newwork/nw-design-system'
import { CurrencyDollarIcon, ChartBarIcon, ChartPieIcon, ChartLineIcon, ChartPolarIcon } from '@phosphor-icons/react'
import { CampaignsAnalyticsComponentProps } from '../types/CampaignsAnalyticsTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import {
  NW_CHART_COLOR_VARS,
  nwChartColorAt,
  resolveCssColor
} from '@/business-apps/crm/campaigns/utils/campaignChartTokens'
import { TooltipWrapper, TooltipDataLine } from '@/common/components/customer/campaign-management/ChartHelpers'
import { ChartCard, ChartTypeSwitcher } from '@/common/components/customer/campaign-management/ChartCard'

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
          color={NW_CHART_COLOR_VARS[1]}
        />
        <TooltipDataLine label="Win Rate" value={`${data.winRate.toFixed(1)}%`} color={NW_CHART_COLOR_VARS[0]} />
        <TooltipDataLine
          label="Revenue/Opportunity"
          value={formatCurrencyCompact(data.revenuePerOpportunity, 'USD')}
          color={NW_CHART_COLOR_VARS[2]}
        />
        <TooltipDataLine
          label="Revenue/Lead"
          value={formatCurrencyCompact(data.revenuePerLead, 'USD')}
          color={NW_CHART_COLOR_VARS[3]}
        />
      </TooltipWrapper>
    )
  }
  return null
}

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
          color={NW_CHART_COLOR_VARS[1]}
        />
      </TooltipWrapper>
    )
  }
  return null
}

const SLICE_KEY = 'sliceKey' as const

const CampaignsRevenueAnalysis: React.FC<CampaignsAnalyticsComponentProps> = ({
  revenueComparisons = [],
  isLoading = false,
  error = null,
  onRetry
}) => {
  const [chartType, setChartType] = useState<'revenue-bar' | 'revenue-pie' | 'revenue-area' | 'revenue-radar'>(
    'revenue-bar'
  )

  const areaGradientStops = useMemo(() => {
    const resolved = resolveCssColor(NW_CHART_COLOR_VARS[1], 'rgb(34, 197, 94)')
    return { top: resolved, bottom: resolved }
  }, [])

  const barChartConfig = useMemo<ChartConfig>(() => ({ revenue: { label: 'Revenue' } }), [])
  const areaChartConfig = useMemo<ChartConfig>(() => ({ revenue: { label: 'Revenue' } }), [])
  const radarChartConfig = useMemo<ChartConfig>(
    () => ({
      rrevenue: { label: 'Revenue' },
      rwinrate: { label: 'Win Rate' },
      rrevopp: { label: 'Rev/Opp' },
      rrevlead: { label: 'Rev/Lead' }
    }),
    []
  )

  const radarSeriesConfig = [
    { name: 'Revenue', dataKey: 'rrevenue' as const },
    { name: 'Win Rate', dataKey: 'rwinrate' as const },
    { name: 'Rev/Opp', dataKey: 'rrevopp' as const },
    { name: 'Rev/Lead', dataKey: 'rrevlead' as const }
  ] as const

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
      revenuePerOpportunity: campaign.opportunitiesCount > 0 ? campaign.totalRevenue / campaign.opportunitiesCount : 0,
      revenuePerLead: campaign.leadsCount > 0 ? campaign.totalRevenue / campaign.leadsCount : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0)

  const pieChartData = useMemo(
    () =>
      revenueData.map((c, i) => ({
        [SLICE_KEY]: `c-${c.id}`,
        name: c.name,
        fullName: c.fullName,
        revenue: c.revenue,
        fill: nwChartColorAt(i)
      })),
    [revenueData]
  )

  const pieChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    pieChartData.forEach((row, i) => {
      config[String(row[SLICE_KEY])] = { label: row.fullName, color: nwChartColorAt(i) }
    })
    return config
  }, [pieChartData])

  const radarData = useMemo(() => {
    if (revenueData.length === 0) return []
    return revenueData.slice(0, 6).map(campaign => {
      const maxRevenue = Math.max(...revenueData.map(c => c.revenue))
      const maxRevenuePerOpp = Math.max(...revenueData.map(c => c.revenuePerOpportunity))
      const maxRevenuePerLead = Math.max(...revenueData.map(c => c.revenuePerLead))
      return {
        campaign: campaign.name,
        fullName: campaign.fullName,
        rrevenue: maxRevenue > 0 ? (campaign.revenue / maxRevenue) * 100 : 0,
        rwinrate: campaign.winRate,
        rrevopp: maxRevenuePerOpp > 0 ? (campaign.revenuePerOpportunity / maxRevenuePerOpp) * 100 : 0,
        rrevlead: maxRevenuePerLead > 0 ? (campaign.revenuePerLead / maxRevenuePerLead) * 100 : 0
      }
    })
  }, [revenueData])

  const renderChart = () => {
    switch (chartType) {
      case 'revenue-bar':
        return (
          <ChartContainer config={barChartConfig} className="gba:h-[500px] gba:w-full">
            <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tickFormatter={val => formatCurrencyCompact(val, 'USD')} />
              <ChartTooltip content={<RevenueBarTooltip />} />
              <Bar dataKey="revenue" fill="var(--color-revenue)" name="Revenue" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )

      case 'revenue-pie':
        return (
          <ChartContainer config={pieChartConfig} className="gba:h-[500px] gba:w-full">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                innerRadius={40}
                paddingAngle={2}
                dataKey="revenue"
                nameKey={SLICE_KEY}
                label={(props: { name?: string; percent?: number; payload?: { name?: string } }) => {
                  const shortName = props.payload?.name ?? props.name ?? ''
                  const percent = props.percent || 0
                  return `${shortName} ${(percent * 100).toFixed(0)}%`
                }}
                labelLine={false}
              />
              <ChartTooltip content={<RevenuePieTooltip totalRevenue={totalRevenue} />} />
            </PieChart>
          </ChartContainer>
        )

      case 'revenue-area':
        return (
          <ChartContainer config={areaChartConfig} className="gba:h-[500px] gba:w-full">
            <AreaChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={areaGradientStops.top} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={areaGradientStops.bottom} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
              <YAxis tickFormatter={val => formatCurrencyCompact(val, 'USD')} />
              <ChartTooltip content={<RevenueBarTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                fillOpacity={1}
                fill="url(#revenueGradient)"
                strokeWidth={3}
              />
            </AreaChart>
          </ChartContainer>
        )

      case 'revenue-radar':
        return (
          <ChartContainer config={radarChartConfig} className="gba:h-[500px] gba:w-full">
            <RadarChart data={radarData} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
              <PolarGrid />
              <PolarAngleAxis dataKey="campaign" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tickFormatter={value => `${value}%`} />
              {radarSeriesConfig.map(series => (
                <Radar
                  key={series.dataKey}
                  name={series.name}
                  dataKey={series.dataKey}
                  stroke={`var(--color-${series.dataKey})`}
                  fill={`var(--color-${series.dataKey})`}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
            </RadarChart>
          </ChartContainer>
        )

      default:
        return null
    }
  }

  const chartTypeOptions = [
    { value: 'revenue-bar' as const, label: 'Bar', icon: <ChartBarIcon /> },
    { value: 'revenue-pie' as const, label: 'Pie', icon: <ChartPieIcon /> },
    { value: 'revenue-area' as const, label: 'Area', icon: <ChartLineIcon /> },
    { value: 'revenue-radar' as const, label: 'Radar', icon: <ChartPolarIcon /> }
  ]

  return (
    <ChartCard
      title={
        <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-foreground">
          <CurrencyDollarIcon className="gba:text-[var(--nw-chart-2)]" size={22} aria-hidden />
          {getTranslationFromI18nKeyAndLabel('campaigns.analytics.revenueAnalysis.title', 'Won Revenue Analysis')}
        </span>
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
          <div className="gba:mb-3 gba:p-3 gba:rounded-lg gba:bg-muted">
            <div className="gba:flex gba:justify-between gba:items-center gba:text-sm gba:gap-4">
              <div className="gba:text-center gba:flex-1">
                <span className="gba:font-semibold gba:text-[var(--nw-chart-2)]">
                  {formatCurrencyCompact(
                    revenueData.reduce((sum, item) => sum + item.revenue, 0),
                    'USD'
                  )}
                </span>
                <span className="gba:ml-1 gba:text-muted-foreground">Total Won</span>
              </div>
              <div className="gba:text-center gba:flex-1">
                <span className="gba:font-semibold gba:text-[var(--nw-chart-1)]">
                  {formatCurrencyCompact(
                    revenueData.length > 0
                      ? revenueData.reduce((sum, item) => sum + item.revenue, 0) / revenueData.length
                      : 0,
                    'USD'
                  )}
                </span>
                <span className="gba:ml-1 gba:text-muted-foreground">Avg/Campaign</span>
              </div>
              <div className="gba:text-center gba:flex-1">
                <span className="gba:font-semibold gba:text-[var(--nw-chart-4)]">{revenueData[0]?.name || 'N/A'}</span>
                <span className="gba:ml-1 gba:text-muted-foreground">Top Campaign</span>
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
