import React, { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie } from 'recharts'
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardTitle,
  IconAvatar,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Checkbox,
  type ChartConfig
} from '@newwork/nw-design-system'
import { ChartPieSliceIcon, CurrencyCircleDollarIcon, ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import {
  CampaignAnalyticsMetrics,
  CampaignTimelineAnalysis,
  CampaignRevenueTrendAnalysis
} from '../../queries/CampaignAnalyticsQueries'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { NW_CHART_COLOR_VARS, nwChartColorAt } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'

interface CampaignRevenueChartsProps {
  metrics: CampaignAnalyticsMetrics | null
  entityTimelineData: CampaignTimelineAnalysis | null
  revenueTimelineData: CampaignRevenueTrendAnalysis | null
}

const SLICE_NAME_KEY = 'sliceKey' as const
const SLICE_VALUE_KEY = 'value' as const
const CARD_BACKGROUND_CLASS = 'gba:bg-muted'
const CHART_CANVAS_CLASS = 'gba:bg-muted gba:rounded-md gba:p-2'
const TIMELINE_CHART_MARGIN = { top: 20, right: 30, left: 20, bottom: 20 }
const TIMELINE_CARD_CLASS = `${CARD_BACKGROUND_CLASS} gba:flex gba:h-full gba:flex-col`
const TIMELINE_CARD_CONTENT_CLASS = 'gba:flex gba:flex-1 gba:flex-col gba:p-6 gba:pt-0'
const TIMELINE_CHART_WRAPPER_CLASS = 'gba:h-80 gba:shrink-0'
const TIMELINE_FILTER_ROW_CLASS =
  'gba:mt-auto gba:flex gba:items-center gba:justify-center gba:gap-3 gba:pt-4 gba:border-t gba:border-border'

const ENTITY_AREA_CONFIG = [
  {
    visibilityKey: 'leads' as const,
    dataKey: 'cumulativeLeads' as const,
    name: 'Leads',
    color: NW_CHART_COLOR_VARS[0]
  },
  {
    visibilityKey: 'accounts' as const,
    dataKey: 'cumulativeAccounts' as const,
    name: 'Accounts',
    color: NW_CHART_COLOR_VARS[1]
  },
  {
    visibilityKey: 'contacts' as const,
    dataKey: 'cumulativeContacts' as const,
    name: 'Contacts',
    color: NW_CHART_COLOR_VARS[2]
  },
  {
    visibilityKey: 'opportunities' as const,
    dataKey: 'cumulativeOpportunities' as const,
    name: 'Opportunities',
    color: NW_CHART_COLOR_VARS[3]
  }
] as const

const REVENUE_AREA_CONFIG = [
  {
    visibilityKey: 'dailyRevenue' as const,
    dataKey: 'dailyRevenue' as const,
    name: 'Daily Revenue',
    color: NW_CHART_COLOR_VARS[0]
  },
  {
    visibilityKey: 'cumulativeRevenue' as const,
    dataKey: 'cumulativeRevenue' as const,
    name: 'Cumulative Revenue',
    color: NW_CHART_COLOR_VARS[1]
  }
] as const

const CampaignRevenueCharts: React.FC<CampaignRevenueChartsProps> = ({
  metrics,
  entityTimelineData,
  revenueTimelineData
}) => {
  const [visibleLines, setVisibleLines] = useState({
    leads: true,
    accounts: true,
    contacts: true,
    opportunities: true
  })
  const [visibleRevenueLines, setVisibleRevenueLines] = useState({
    dailyRevenue: true,
    cumulativeRevenue: true
  })

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  const toggleRevenueLineVisibility = (lineKey: keyof typeof visibleRevenueLines) => {
    setVisibleRevenueLines(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  const wonRevenue = metrics?.revenueMetrics.wonRevenue || 0
  const totalPipeline = metrics?.revenueMetrics.totalPipeline || 0
  const remainingClaimable = Math.max(0, totalPipeline - wonRevenue)

  const revenueBreakdownSlices = useMemo(() => {
    const wonFill = NW_CHART_COLOR_VARS[1]
    const remainingFill = NW_CHART_COLOR_VARS[0]
    const slices = [
      { id: 'won-revenue' as const, name: 'Won Revenue', value: wonRevenue, fill: wonFill },
      {
        id: 'remaining-claimable' as const,
        name: 'Remaining Claimable',
        value: remainingClaimable,
        fill: remainingFill
      }
    ].filter(item => item.value > 0)
    return slices.map(item => ({
      [SLICE_NAME_KEY]: item.id,
      name: item.name,
      [SLICE_VALUE_KEY]: item.value,
      fill: item.fill
    }))
  }, [wonRevenue, remainingClaimable])

  const revenueBreakdownChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    revenueBreakdownSlices.forEach(slice => {
      const id = String(slice[SLICE_NAME_KEY])
      config[id] = {
        label: slice.name,
        color: slice.fill
      }
    })
    return config
  }, [revenueBreakdownSlices])

  const revenueLegendData = useMemo(
    () => [
      {
        id: 'claimable-revenue',
        name: 'Claimable Revenue',
        value: totalPipeline,
        color: NW_CHART_COLOR_VARS[3],
        isTotal: true
      },
      {
        id: 'won-revenue-legend',
        name: 'Won Revenue',
        value: wonRevenue,
        color: NW_CHART_COLOR_VARS[1],
        isTotal: false
      },
      ...(remainingClaimable > 0
        ? [
            {
              id: 'remaining-claimable-legend',
              name: 'Remaining Claimable',
              value: remainingClaimable,
              color: NW_CHART_COLOR_VARS[0],
              isTotal: false
            }
          ]
        : [])
    ],
    [totalPipeline, wonRevenue, remainingClaimable]
  )

  const entityDistributionSlices = useMemo(() => {
    const rows = [
      { id: 'leads' as const, name: 'Leads', value: metrics?.totalEntities.leads || 0 },
      { id: 'accounts' as const, name: 'Accounts', value: metrics?.totalEntities.accounts || 0 },
      { id: 'contacts' as const, name: 'Contacts', value: metrics?.totalEntities.contacts || 0 },
      { id: 'opportunities' as const, name: 'Opportunities', value: metrics?.totalEntities.opportunities || 0 }
    ].filter(item => item.value > 0)
    return rows.map((item, index) => ({
      [SLICE_NAME_KEY]: item.id,
      name: item.name,
      [SLICE_VALUE_KEY]: item.value,
      fill: nwChartColorAt(index)
    }))
  }, [metrics?.totalEntities])

  const entityDistributionChartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    entityDistributionSlices.forEach((slice, index) => {
      const id = String(slice[SLICE_NAME_KEY])
      config[id] = {
        label: slice.name,
        color: nwChartColorAt(index)
      }
    })
    return config
  }, [entityDistributionSlices])

  const entityTimelineChartData =
    entityTimelineData?.entityCreationTimeline.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: item.date,
      cumulativeLeads: item.cumulativeLeads,
      cumulativeAccounts: item.cumulativeAccounts,
      cumulativeContacts: item.cumulativeContacts,
      cumulativeOpportunities: item.cumulativeOpportunities
    })) || []

  const revenueTimelineChartData =
    revenueTimelineData?.revenueTimeline.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: item.date,
      dailyRevenue: item.dailyRevenue,
      cumulativeRevenue: item.cumulativeRevenue
    })) || []

  const cumulativeGrowthChartConfig = useMemo<ChartConfig>(
    () => ({
      cumulativeLeads: { label: 'Leads', color: NW_CHART_COLOR_VARS[0] },
      cumulativeAccounts: { label: 'Accounts', color: NW_CHART_COLOR_VARS[1] },
      cumulativeContacts: { label: 'Contacts', color: NW_CHART_COLOR_VARS[2] },
      cumulativeOpportunities: { label: 'Opportunities', color: NW_CHART_COLOR_VARS[3] }
    }),
    []
  )

  const revenueTimelineConfig = useMemo<ChartConfig>(
    () => ({
      dailyRevenue: { label: 'Daily Revenue', color: NW_CHART_COLOR_VARS[0] },
      cumulativeRevenue: { label: 'Cumulative Revenue', color: NW_CHART_COLOR_VARS[1] }
    }),
    []
  )

  const lineToggleStyle = useMemo(
    () => [
      { key: 'leads' as const, label: 'Total Leads', color: NW_CHART_COLOR_VARS[0] },
      { key: 'accounts' as const, label: 'Total Accounts', color: NW_CHART_COLOR_VARS[1] },
      { key: 'contacts' as const, label: 'Total Contacts', color: NW_CHART_COLOR_VARS[2] },
      { key: 'opportunities' as const, label: 'Total Opportunities', color: NW_CHART_COLOR_VARS[3] }
    ],
    []
  )

  return (
    <div
      className="gba:grid gba:grid-cols-1 gba:items-stretch gba:gap-6 gba:lg:grid-cols-2"
      data-testid="campaign-revenue-charts-container"
    >
      <Card className={CARD_BACKGROUND_CLASS} data-testid="revenue-breakdown-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={CurrencyCircleDollarIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle className="gba:text-md">Revenue Breakdown</CardTitle>
              <CardDescription>Aggregate revenue split for selected campaign range.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-6 gba:pt-0">
          {revenueBreakdownSlices.length > 0 ? (
            <div className="gba:h-64">
              <ChartContainer
                config={revenueBreakdownChartConfig}
                className={`gba:h-64 gba:w-full ${CHART_CANVAS_CLASS}`}
              >
                <PieChart>
                  <Pie
                    data={revenueBreakdownSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey={SLICE_VALUE_KEY}
                    nameKey={SLICE_NAME_KEY}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        labelKey={SLICE_VALUE_KEY}
                        nameKey={SLICE_NAME_KEY}
                        formatter={value => (typeof value === 'number' ? formatCurrencyCompact(value) : String(value))}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
              <p className="gba:text-muted-foreground">No revenue data available</p>
            </div>
          )}

          <div className="gba:mt-4 gba:space-y-1">
            {revenueLegendData.map(item => (
              <div key={item.id} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                <span className={`gba:text-foreground ${item.isTotal ? 'gba:font-semibold' : 'gba:font-normal'}`}>
                  {item.name}
                </span>
                <span className={`gba:text-foreground ${item.isTotal ? 'gba:font-bold' : 'gba:font-medium'}`}>
                  {formatCurrencyCompact(item.value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={CARD_BACKGROUND_CLASS} data-testid="entity-distribution-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle className="gba:text-md">Entity Distribution</CardTitle>
              <CardDescription>Aggregate entity share for selected campaign range.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="gba:p-6 gba:pt-0">
          {entityDistributionSlices.length > 0 ? (
            <div className="gba:h-64">
              <ChartContainer
                config={entityDistributionChartConfig}
                className={`gba:h-64 gba:w-full ${CHART_CANVAS_CLASS}`}
              >
                <PieChart>
                  <Pie
                    data={entityDistributionSlices}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey={SLICE_VALUE_KEY}
                    nameKey={SLICE_NAME_KEY}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        hideLabel
                        labelKey={SLICE_VALUE_KEY}
                        nameKey={SLICE_NAME_KEY}
                        formatter={value => (typeof value === 'number' ? value.toLocaleString() : String(value))}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            </div>
          ) : (
            <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
              <p className="gba:text-muted-foreground">No entity data available</p>
            </div>
          )}

          <div className="gba:mt-4 gba:space-y-2">
            {entityDistributionSlices.map(item => {
              const id = String(item[SLICE_NAME_KEY])
              const label = item.name
              return (
                <div key={id} className="gba:flex gba:items-center gba:justify-between">
                  <span className="gba:text-sm gba:text-foreground">{label}</span>
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">
                    {Number(item[SLICE_VALUE_KEY]).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {entityTimelineChartData.length > 0 ? (
        <Card className={TIMELINE_CARD_CLASS} data-testid="cumulative-growth-chart">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={TrendUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle className="gba:text-md">Cumulative Entity Growth</CardTitle>
                <CardDescription>Cumulative entity counts for the selected campaign range.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className={TIMELINE_CARD_CONTENT_CLASS}>
            <div className={TIMELINE_CHART_WRAPPER_CLASS}>
              <ChartContainer
                config={cumulativeGrowthChartConfig}
                className={`gba:h-80 gba:w-full ${CHART_CANVAS_CLASS}`}
              >
                <AreaChart data={entityTimelineChartData} margin={TIMELINE_CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-text-secondary)" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--color-text-secondary)"
                    tickFormatter={value => Math.floor(Number(value)).toString()}
                    domain={[0, 'dataMax']}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={label => `Date: ${label ?? ''}`} />} />
                  {ENTITY_AREA_CONFIG.map(
                    areaConfig =>
                      visibleLines[areaConfig.visibilityKey] && (
                        <Area
                          key={areaConfig.dataKey}
                          type="monotone"
                          dataKey={areaConfig.dataKey}
                          stroke={`var(--color-${areaConfig.dataKey})`}
                          fill={`var(--color-${areaConfig.dataKey})`}
                          fillOpacity={0.1}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6, stroke: areaConfig.color, strokeWidth: 2 }}
                          name={areaConfig.name}
                        />
                      )
                  )}
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>

            <div className={TIMELINE_FILTER_ROW_CLASS}>
              {lineToggleStyle.map(({ key, label }) => (
                <label
                  key={key}
                  className="gba:flex gba:items-center gba:gap-1 gba:cursor-pointer gba:select-none"
                  data-testid={`toggle-${key}-line`}
                >
                  <Checkbox
                    checked={visibleLines[key]}
                    onCheckedChange={() => toggleLineVisibility(key)}
                    className="gba:w-3 gba:h-3"
                  />
                  <span className="gba:text-xs gba:text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className={TIMELINE_CARD_CLASS} data-testid="cumulative-growth-chart-empty">
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={TrendUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle className="gba:text-md">Cumulative Entity Growth</CardTitle>
                <CardDescription>Cumulative entity counts for the selected campaign range.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className={TIMELINE_CARD_CONTENT_CLASS}>
            <div className={`${TIMELINE_CHART_WRAPPER_CLASS} gba:flex gba:items-center gba:justify-center`}>
              <p className="gba:text-muted-foreground">No timeline data available</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={TIMELINE_CARD_CLASS} data-testid="revenue-performance-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle className="gba:text-md">Revenue Performance Over Time</CardTitle>
              <CardDescription>Daily cumulative revenue for selected campaign range.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className={TIMELINE_CARD_CONTENT_CLASS}>
          {revenueTimelineChartData.length > 0 ? (
            <div className={TIMELINE_CHART_WRAPPER_CLASS}>
              <ChartContainer config={revenueTimelineConfig} className={`gba:h-80 gba:w-full ${CHART_CANVAS_CLASS}`}>
                <AreaChart data={revenueTimelineChartData} margin={TIMELINE_CHART_MARGIN}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-text-secondary)" />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    stroke="var(--color-text-secondary)"
                    tickFormatter={value => formatCurrencyCompact(Number(value))}
                    domain={[0, 'dataMax']}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={label => `Date: ${label ?? ''}`}
                        formatter={(value, _, entry) => [
                          formatCurrencyCompact(Number(value)),
                          entry?.dataKey === 'dailyRevenue' ? 'Daily Revenue' : 'Cumulative Revenue'
                        ]}
                      />
                    }
                  />
                  {REVENUE_AREA_CONFIG.map(
                    areaConfig =>
                      visibleRevenueLines[areaConfig.visibilityKey] && (
                        <Area
                          key={areaConfig.dataKey}
                          type="monotone"
                          dataKey={areaConfig.dataKey}
                          stroke={`var(--color-${areaConfig.dataKey})`}
                          fill={`var(--color-${areaConfig.dataKey})`}
                          fillOpacity={0.1}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6, stroke: areaConfig.color, strokeWidth: 2 }}
                          name={areaConfig.name}
                        />
                      )
                  )}
                  <ChartLegend content={<ChartLegendContent />} />
                </AreaChart>
              </ChartContainer>
            </div>
          ) : (
            <div className={`${TIMELINE_CHART_WRAPPER_CLASS} gba:flex gba:items-center gba:justify-center`}>
              <p className="gba:text-muted-foreground">No timeline data available</p>
            </div>
          )}
          {revenueTimelineChartData.length > 0 && (
            <div className={TIMELINE_FILTER_ROW_CLASS}>
              {REVENUE_AREA_CONFIG.map(({ visibilityKey, name }) => (
                <label
                  key={visibilityKey}
                  className="gba:flex gba:items-center gba:gap-1 gba:cursor-pointer gba:select-none"
                  data-testid={`toggle-${visibilityKey}-line`}
                >
                  <Checkbox
                    checked={visibleRevenueLines[visibilityKey]}
                    onCheckedChange={() => toggleRevenueLineVisibility(visibilityKey)}
                    className="gba:w-3 gba:h-3"
                  />
                  <span className="gba:text-xs gba:text-foreground">{name}</span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CampaignRevenueCharts
