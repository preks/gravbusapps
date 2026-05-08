import React, { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, PieChart, Pie } from 'recharts'
import {
  Card,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  Checkbox,
  type ChartConfig
} from '@newwork/nw-design-system'
import { CampaignAnalyticsMetrics, CampaignTimelineAnalysis } from '../../queries/CampaignAnalyticsQueries'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { NW_CHART_COLOR_VARS, nwChartColorAt } from '@/business-apps/crm/campaigns/utils/campaignChartTokens'

interface CampaignRevenueChartsProps {
  metrics: CampaignAnalyticsMetrics | null
  timelineData: CampaignTimelineAnalysis | null
}

const SLICE_NAME_KEY = 'sliceKey' as const
const SLICE_VALUE_KEY = 'value' as const

const CampaignRevenueCharts: React.FC<CampaignRevenueChartsProps> = ({ metrics, timelineData }) => {
  const [visibleLines, setVisibleLines] = useState({
    leads: true,
    accounts: true,
    contacts: true,
    opportunities: true
  })

  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines(prev => ({
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

  const timelineChartData =
    timelineData?.entityCreationTimeline.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: item.date,
      cumulativeLeads: item.cumulativeLeads,
      cumulativeAccounts: item.cumulativeAccounts,
      cumulativeContacts: item.cumulativeContacts,
      cumulativeOpportunities: item.cumulativeOpportunities,
      cumulativeRevenue: item.cumulativeRevenue
    })) || []

  const cumulativeGrowthChartConfig = useMemo<ChartConfig>(
    () => ({
      cumulativeleads: { label: 'Cumulative Leads' },
      cumulativeaccounts: { label: 'Cumulative Accounts' },
      cumulativecontacts: { label: 'Cumulative Contacts' },
      cumulativeopportunities: { label: 'Cumulative Opportunities' }
    }),
    []
  )

  const revenueTimelineConfig = useMemo<ChartConfig>(() => ({ cumulativerevenue: { label: 'Revenue' } }), [])

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
      className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6"
      data-testid="campaign-revenue-charts-container"
    >
      <Card className="gba:p-6" data-testid="revenue-breakdown-chart">
        <h4 className="gba:text-md gba:font-semibold gba:mb-4 gba:text-foreground">Revenue Breakdown</h4>

        {revenueBreakdownSlices.length > 0 ? (
          <div className="gba:h-64">
            <ChartContainer config={revenueBreakdownChartConfig} className="gba:h-64 gba:w-full">
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
              </PieChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="gba:h-64 gba:flex gba:items-center gba:justify-center">
            <p className="gba:text-muted-foreground">No revenue data available</p>
          </div>
        )}

        <div className="gba:mt-4 gba:space-y-2">
          {revenueLegendData.map(item => (
            <div key={item.id} className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: item.color }} />
                <span className={`gba:text-sm gba:text-foreground ${item.isTotal ? 'gba:font-semibold' : ''}`}>
                  {item.name}
                </span>
              </div>
              <span className={`gba:text-sm gba:text-foreground ${item.isTotal ? 'gba:font-bold' : 'gba:font-medium'}`}>
                {formatCurrencyCompact(item.value)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="gba:p-6" data-testid="entity-distribution-chart">
        <h4 className="gba:text-md gba:font-semibold gba:mb-4 gba:text-foreground">Entity Distribution</h4>

        {entityDistributionSlices.length > 0 ? (
          <div className="gba:h-64">
            <ChartContainer config={entityDistributionChartConfig} className="gba:h-64 gba:w-full">
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
                <div className="gba:flex gba:items-center gba:gap-2">
                  <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="gba:text-sm gba:text-foreground">{label}</span>
                </div>
                <span className="gba:text-sm gba:font-medium gba:text-foreground">
                  {Number(item[SLICE_VALUE_KEY]).toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {timelineChartData.length > 0 ? (
        <Card className="gba:p-6" data-testid="cumulative-growth-chart">
          <div className="gba:mb-4">
            <h4 className="gba:text-md gba:font-semibold gba:text-foreground">Cumulative Entity Growth</h4>
          </div>

          <div className="gba:h-80 gba:mb-4">
            <ChartContainer config={cumulativeGrowthChartConfig} className="gba:h-80 gba:w-full">
              <LineChart data={timelineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                {visibleLines.leads && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeLeads"
                    stroke="var(--color-cumulativeleads)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Cumulative Leads"
                  />
                )}
                {visibleLines.accounts && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeAccounts"
                    stroke="var(--color-cumulativeaccounts)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Cumulative Accounts"
                  />
                )}
                {visibleLines.contacts && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeContacts"
                    stroke="var(--color-cumulativecontacts)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Cumulative Contacts"
                  />
                )}
                {visibleLines.opportunities && (
                  <Line
                    type="monotone"
                    dataKey="cumulativeOpportunities"
                    stroke="var(--color-cumulativeopportunities)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Cumulative Opportunities"
                  />
                )}
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </div>

          <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:pt-4 gba:border-t gba:border-border">
            {lineToggleStyle.map(({ key, label, color }) => (
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
                <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: color }} />
                <span className="gba:text-xs gba:text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="gba:p-6" data-testid="cumulative-growth-chart-empty">
          <h4 className="gba:text-md gba:font-semibold gba:mb-4 gba:text-foreground">Cumulative Entity Growth</h4>
          <div className="gba:h-80 gba:flex gba:items-center gba:justify-center">
            <p className="gba:text-muted-foreground">No timeline data available</p>
          </div>
        </Card>
      )}

      <Card className="gba:p-6" data-testid="revenue-performance-chart">
        <h4 className="gba:text-md gba:font-semibold gba:mb-4 gba:text-foreground">Revenue Performance Over Time</h4>
        {timelineChartData.length > 0 ? (
          <div className="gba:h-80">
            <ChartContainer config={revenueTimelineConfig} className="gba:h-80 gba:w-full">
              <LineChart data={timelineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                      formatter={value => [formatCurrencyCompact(Number(value)), 'Revenue']}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeRevenue"
                  stroke="var(--color-cumulativerevenue)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--color-cumulativerevenue)' }}
                  name="Revenue"
                />
              </LineChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="gba:h-80 gba:flex gba:items-center gba:justify-center">
            <p className="gba:text-muted-foreground">No timeline data available</p>
          </div>
        )}
      </Card>
    </div>
  )
}

export default CampaignRevenueCharts
