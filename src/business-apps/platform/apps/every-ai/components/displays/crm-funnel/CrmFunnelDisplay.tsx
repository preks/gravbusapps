import React, { useLayoutEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from 'recharts'
import type { CrmFunnelData, CrmFunnelBuckets } from './types'

/** Shared chart palette so bar and pie use the same colors (chart-1..5). */
const CHART_COLOR_TOKENS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))'
] as const
const FUNNEL_BAR_KEYS = ['open', 'inQualification', 'won', 'lost'] as const
/** Funnel bars use first four palette colors (same as pie indices 0–3). */
const FUNNEL_BAR_PALETTE_INDEX: Record<(typeof FUNNEL_BAR_KEYS)[number], number> = {
  open: 0,
  inQualification: 1,
  won: 2,
  lost: 3
}
const FALLBACK_CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b']

function resolveCssColor(token: string, fallback: string): string {
  if (typeof document === 'undefined' || typeof window === 'undefined') return fallback
  try {
    const el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.setProperty('background-color', token)
    el.style.setProperty('position', 'absolute')
    el.style.setProperty('visibility', 'hidden')
    el.style.setProperty('pointer-events', 'none')
    document.body.appendChild(el)
    const resolved = window.getComputedStyle(el).backgroundColor
    document.body.removeChild(el)
    return resolved && resolved !== 'rgba(0, 0, 0, 0)' && resolved !== 'transparent' ? resolved : fallback
  } catch {
    return fallback
  }
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

function funnelBucketsToBarData(
  buckets: CrmFunnelBuckets,
  palette: string[]
): { name: string; label: string; amount: number; count: number; fill: string }[] {
  return FUNNEL_BAR_KEYS.map(key => ({
    name: key,
    label: key === 'open' ? 'Open' : key === 'inQualification' ? 'In qualification' : key === 'won' ? 'Won' : 'Lost',
    amount: buckets[key].totalAmount,
    count: buckets[key].count,
    fill: palette[FUNNEL_BAR_PALETTE_INDEX[key]] ?? palette[0]
  }))
}

export const CrmFunnelDisplay: React.FC<{ data: CrmFunnelData }> = ({ data }) => {
  const [chartColors, setChartColors] = useState<string[]>(FALLBACK_CHART_COLORS)

  useLayoutEffect(() => {
    setChartColors(CHART_COLOR_TOKENS.map((t, i) => resolveCssColor(t, FALLBACK_CHART_COLORS[i])))
  }, [])

  const dateRange = data.dateFrom && data.dateTo ? `${data.dateFrom} – ${data.dateTo}` : null
  const hasFunnelBuckets = data.funnelBuckets != null
  const hasByOwner = data.byOwner != null && data.byOwner.length > 0
  const showStagesList = !hasFunnelBuckets && data.stages?.length
  const isEmpty = !data.stages?.length && !hasFunnelBuckets

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="crm-funnel-display">
      {(data.title || dateRange) && (
        <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          {data.title && (
            <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:bg-clip-text gba:text-transparent">
              {data.title}
            </CardTitle>
          )}
          {(data.description || dateRange) && (
            <div className="gba:mt-1 gba:space-y-0.5">
              {data.description && <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>}
              {dateRange && <p className="gba:text-xs gba:text-muted-foreground">{dateRange}</p>}
            </div>
          )}
        </CardHeader>
      )}
      <CardContent className="gba:p-6">
        {isEmpty ? (
          <p className="gba:text-sm gba:text-muted-foreground">No opportunity data for this period.</p>
        ) : (
          <div className="gba:space-y-8">
            {hasFunnelBuckets && (
              <section className="gba:space-y-4" data-testid="crm-funnel-chart">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Pipeline by stage</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={funnelBucketsToBarData(data.funnelBuckets, chartColors)}
                    layout="vertical"
                    margin={{ top: 8, right: 24, left: 80, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={v => formatAmount(v)} />
                    <YAxis type="category" dataKey="label" width={72} />
                    <Tooltip
                      formatter={(
                        value: number,
                        _name: string,
                        props: { payload: { label: string; count: number } }
                      ) => [
                        `${formatAmount(value)} (${props.payload.count} ${props.payload.count === 1 ? 'opportunity' : 'opportunities'})`,
                        props.payload.label
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="amount"
                      name="Amount"
                      radius={[0, 4, 4, 0]}
                      fill={chartColors[0]}
                      label={{ position: 'right' }}
                    >
                      {funnelBucketsToBarData(data.funnelBuckets, chartColors).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </section>
            )}

            {hasByOwner && (
              <section className="gba:space-y-4" data-testid="crm-funnel-pie">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Contribution by team member</h3>
                <div className="gba:flex gba:flex-wrap gba:items-start gba:gap-6">
                  <div className="gba:min-h-[240px] gba:min-w-[280px] gba:flex-1">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={data.byOwner!.map(o => ({ name: o.ownerName, value: o.totalAmount }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {data.byOwner!.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatAmount(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="gba:flex-1 gba:min-w-[12rem] gba:space-y-2">
                    {data.byOwner!.map((owner, idx) => (
                      <div
                        key={owner.ownerId}
                        className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:py-1.5 gba:border-b gba:border-border gba:last:border-b-0"
                        data-testid={`crm-funnel-owner-${owner.ownerId}`}
                      >
                        <span
                          className="gba:w-3 gba:h-3 gba:rounded-full gba:shrink-0"
                          style={{ backgroundColor: chartColors[idx % chartColors.length] }}
                        />
                        <span className="gba:text-sm gba:text-foreground gba:truncate gba:flex-1">
                          {owner.ownerName}
                        </span>
                        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:shrink-0">
                          {formatAmount(owner.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {!hasByOwner &&
              data.byOwner !== undefined &&
              data.byOwner !== null &&
              data.byOwner.length === 0 &&
              hasFunnelBuckets && (
                <p className="gba:text-sm gba:text-muted-foreground">No per-owner breakdown available.</p>
              )}

            {showStagesList && (
              <div className="gba:space-y-3">
                {data.stages!.map((stage, idx) => (
                  <div
                    key={`${stage.stage}-${idx}`}
                    className="gba:flex gba:items-center gba:gap-4 gba:p-3 gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border"
                  >
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:min-w-[10rem]">
                      {stage.stageLabel}
                    </span>
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {stage.count} {stage.count === 1 ? 'opportunity' : 'opportunities'}
                    </span>
                    <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:ml-auto">
                      {formatAmount(stage.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
