import React, { useLayoutEffect, useState } from 'react'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  LineChart,
  Line
} from 'recharts'
import type { AssetSummaryData, AssetStatusTrendSeries } from './types'

const PIE_COLOR_TOKENS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)',
  'var(--nw-chart-7)',
  'var(--nw-chart-8)',
  'var(--nw-chart-1)',
  'var(--nw-chart-2)'
]

const FALLBACK_PIE_COLORS = [...PIE_COLOR_TOKENS]

const TREND_COLOR_TOKENS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)'
]

const FALLBACK_TREND_COLORS = [...TREND_COLOR_TOKENS]

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

function getTrendRows(months: string[], series: AssetStatusTrendSeries[]) {
  return months.map(month => {
    const row: Record<string, string | number> = { month }
    series.forEach(s => {
      const point = s.points.find(p => p.month === month)
      row[s.status] = point?.count ?? 0
    })
    return row
  })
}

export const AssetSummaryDisplay: React.FC<{ data: AssetSummaryData }> = ({ data }) => {
  const [pieColors, setPieColors] = useState<string[]>(FALLBACK_PIE_COLORS)
  const [trendColors, setTrendColors] = useState<string[]>(FALLBACK_TREND_COLORS)

  useLayoutEffect(() => {
    setPieColors(
      PIE_COLOR_TOKENS.map((token, idx) => resolveCssColor(token, FALLBACK_PIE_COLORS[idx] ?? 'var(--nw-chart-1)'))
    )
    setTrendColors(
      TREND_COLOR_TOKENS.map((token, idx) => resolveCssColor(token, FALLBACK_TREND_COLORS[idx] ?? 'var(--nw-chart-1)'))
    )
  }, [])

  const hasCategories = data.categories.length > 0
  const hasStatuses = data.statuses.length > 0
  const hasTrend = data.statusTrend.length > 0 && data.months.length > 0
  const trendRows = getTrendRows(data.months, data.statusTrend)

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="asset-summary-display">
      {(data.title || data.description) && (
        <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
          {data.title && (
            <CardTitle className="gba:text-lg gba:font-bold gba:bg-gradient-to-r gba:from-ai gba:to-ai-secondary gba:bg-clip-text gba:text-transparent">
              {data.title}
            </CardTitle>
          )}
          {data.description && <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">{data.description}</p>}
        </CardHeader>
      )}
      <CardContent className="gba:p-6 gba:space-y-8">
        {!hasCategories && !hasStatuses && !hasTrend && (
          <p className="gba:text-sm gba:text-muted-foreground">No asset data available for summary.</p>
        )}

        {(hasCategories || hasStatuses) && (
          <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:lg:grid-cols-2">
            <section className="gba:space-y-3" data-testid="asset-summary-categories">
              <div className="gba:flex gba:items-center gba:justify-between">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">By category</h3>
                <Badge variant="secondary">{data.categories.reduce((acc, c) => acc + c.count, 0)} assets</Badge>
              </div>
              {hasCategories ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={data.categories} dataKey="count" nameKey="label" outerRadius={84}>
                        {data.categories.map((entry, index) => (
                          <Cell key={entry.key} fill={pieColors[index % pieColors.length] ?? pieColors[0]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, _name, props) => [`${value}`, props.payload.label]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-center gba:gap-2">
                    {data.categories.map((entry, index) => (
                      <div
                        key={`cat-legend-${entry.key}`}
                        className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground"
                      >
                        <span
                          className="gba:w-2.5 gba:h-2.5 gba:rounded-full gba:shrink-0"
                          style={{ backgroundColor: pieColors[index % pieColors.length] ?? pieColors[0] }}
                        />
                        <span>{entry.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground">No category data.</p>
              )}
            </section>

            <section className="gba:space-y-3" data-testid="asset-summary-statuses">
              <div className="gba:flex gba:items-center gba:justify-between">
                <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">By status</h3>
                <Badge variant="secondary">{data.statuses.reduce((acc, s) => acc + s.count, 0)} assets</Badge>
              </div>
              {hasStatuses ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={data.statuses} dataKey="count" nameKey="label" outerRadius={84}>
                        {data.statuses.map((entry, index) => (
                          <Cell key={entry.key} fill={pieColors[index % pieColors.length] ?? pieColors[0]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, _name, props) => [`${value}`, props.payload.label]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-center gba:gap-2">
                    {data.statuses.map((entry, index) => (
                      <div
                        key={`status-legend-${entry.key}`}
                        className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground"
                      >
                        <span
                          className="gba:w-2.5 gba:h-2.5 gba:rounded-full gba:shrink-0"
                          style={{ backgroundColor: pieColors[index % pieColors.length] ?? pieColors[0] }}
                        />
                        <span>{entry.label}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="gba:text-sm gba:text-muted-foreground">No status data.</p>
              )}
            </section>
          </div>
        )}

        <section className="gba:space-y-3" data-testid="asset-summary-trend">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground">Status trend over time</h3>
          {hasTrend ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendRows} margin={{ top: 8, right: 8, left: 8, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                {data.statusTrend.map((series, index) => (
                  <Line
                    key={series.status}
                    type="monotone"
                    dataKey={series.status}
                    name={series.status.replaceAll('_', ' ')}
                    stroke={trendColors[index % trendColors.length] ?? trendColors[0]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="gba:text-sm gba:text-muted-foreground">
              No dated asset records available for trend analysis.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
