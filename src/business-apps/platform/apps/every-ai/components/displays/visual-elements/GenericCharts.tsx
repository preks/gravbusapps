import React, { useLayoutEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import type {
  AreaChartData,
  DataQuerySpec,
  LineChartData,
  PieChartData,
  StackedBarChartData
} from '../../../types/models'
import { ChartDrilldown } from '../shared/ChartDrilldown'
import { chartColorAt } from './chartPalette'

const CHART_DOT_COLOR = 'var(--nw-foreground)'

interface DrilldownState {
  active: string | null
  setActive: (value: string | null) => void
  has: (value: string) => boolean
  enabled: boolean
  /** Recharts cartesian onClick handler (LineChart/AreaChart). */
  handleAxisClick: (state: { activeLabel?: string | number } | undefined) => void
  /** Recharts Pie onClick handler. */
  handleSliceClick: (slice: { name?: string | number }) => void
}

function useDrilldownState(querySpec?: DataQuerySpec | null, accessToken?: string): DrilldownState {
  const [active, setActive] = useState<string | null>(null)
  const values = useMemo(() => new Set((querySpec?.drilldowns ?? []).map(entry => entry.matchValue)), [querySpec])
  const enabled = Boolean(querySpec && accessToken && values.size > 0)
  const trigger = (raw: string | number | undefined) => {
    if (!enabled || raw === undefined) {
      return
    }
    const label = String(raw)
    if (values.has(label)) {
      setActive(label)
    }
  }
  return {
    active,
    setActive,
    has: (value: string) => values.has(value),
    enabled,
    handleAxisClick: state => trigger(state?.activeLabel),
    handleSliceClick: slice => trigger(slice?.name)
  }
}

function mergeLineSeriesForRecharts(series: LineChartData['series']) {
  const byX = new Map<string, Record<string, number | string>>()
  for (const s of series) {
    for (const p of s.data) {
      const k = String(p.x)
      if (!byX.has(k)) {
        byX.set(k, { x: k })
      }
      const row = byX.get(k)!
      row[s.name] = p.y
    }
  }
  return Array.from(byX.values())
}

function formatTooltipValue(v: number, fmt?: string) {
  if (fmt === 'currency') {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format(v)
  }
  if (fmt === 'percent') {
    return `${v.toFixed(1)}%`
  }
  return String(v)
}

export const LineChartDisplay: React.FC<{ data: LineChartData; accessToken?: string }> = ({ data, accessToken }) => {
  const chartData = useMemo(() => mergeLineSeriesForRecharts(data.series), [data.series])
  const [colors, setColors] = useState<string[]>([])
  const drilldown = useDrilldownState(data.querySpec, accessToken)

  useLayoutEffect(() => {
    setColors(data.series.map((s, i) => chartColorAt(i, s.color ?? null)))
  }, [data.series])

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="line-chart-display">
      <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
        <CardTitle className="gba:text-lg gba:font-bold">{data.title}</CardTitle>
        {data.subtitle && <p className="gba:text-xs gba:text-muted-foreground">{data.subtitle}</p>}
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent className="gba:p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            onClick={drilldown.handleAxisClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-border)" />
            <XAxis dataKey="x" name={data.xAxis?.label ?? ''} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number, name: string) => [formatTooltipValue(v, data.yAxis?.valueFormat), name]} />
            {data.showLegend !== false && <Legend />}
            {data.series.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                connectNulls={true}
                stroke={colors[i] ?? chartColorAt(i, s.color ?? null)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 3, fill: CHART_DOT_COLOR, stroke: CHART_DOT_COLOR }}
                activeDot={{ r: 5, fill: CHART_DOT_COLOR, stroke: CHART_DOT_COLOR }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {drilldown.enabled && drilldown.active && data.querySpec && accessToken ? (
          <ChartDrilldown
            accessToken={accessToken}
            querySpec={data.querySpec}
            matchValue={drilldown.active}
            onClose={() => drilldown.setActive(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

export const AreaChartDisplay: React.FC<{ data: AreaChartData; accessToken?: string }> = ({ data, accessToken }) => {
  const chartData = useMemo(() => mergeLineSeriesForRecharts(data.series), [data.series])
  const [colors, setColors] = useState<string[]>([])
  const drilldown = useDrilldownState(data.querySpec, accessToken)

  useLayoutEffect(() => {
    setColors(data.series.map((s, i) => chartColorAt(i, s.color ?? null)))
  }, [data.series])

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="area-chart-display">
      <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
        <CardTitle className="gba:text-lg gba:font-bold">{data.title}</CardTitle>
        {data.subtitle && <p className="gba:text-xs gba:text-muted-foreground">{data.subtitle}</p>}
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent className="gba:p-4">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
            onClick={drilldown.handleAxisClick}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-border)" />
            <XAxis dataKey="x" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number, name: string) => [formatTooltipValue(v, data.yAxis?.valueFormat), name]} />
            {data.showLegend !== false && <Legend />}
            {data.series.map((s, i) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stackId={data.stacked ? '1' : undefined}
                stroke={colors[i] ?? chartColorAt(i, s.color ?? null)}
                fill={colors[i] ?? chartColorAt(i, s.color ?? null)}
                fillOpacity={0.35}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        {drilldown.enabled && drilldown.active && data.querySpec && accessToken ? (
          <ChartDrilldown
            accessToken={accessToken}
            querySpec={data.querySpec}
            matchValue={drilldown.active}
            onClose={() => drilldown.setActive(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}

function stackedBarRows(d: StackedBarChartData): { rows: Record<string, string | number>[]; keys: string[] } {
  const keys = new Set<string>()
  d.categories.forEach(c => c.segments.forEach(s => keys.add(s.name)))
  const keyList = Array.from(keys)
  const rows = d.categories.map(cat => {
    const row: Record<string, string | number> = { category: cat.category }
    keyList.forEach(k => {
      row[k] = 0
    })
    cat.segments.forEach(s => {
      row[s.name] = s.value
    })
    return row
  })
  return { rows, keys: keyList }
}

export const StackedBarChartDisplay: React.FC<{ data: StackedBarChartData }> = ({ data }) => {
  const { rows, keys } = useMemo(() => stackedBarRows(data), [data])
  const layout = data.horizontal ? 'vertical' : 'horizontal'

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="stacked-bar-chart-display">
      <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
        <CardTitle className="gba:text-lg gba:font-bold">{data.title}</CardTitle>
        {data.subtitle && <p className="gba:text-xs gba:text-muted-foreground">{data.subtitle}</p>}
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent className="gba:p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            layout={layout}
            data={rows}
            margin={{ top: 8, right: 16, left: layout === 'vertical' ? 48 : 8, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--nw-border)" />
            {layout === 'horizontal' ? (
              <>
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis />
              </>
            ) : (
              <>
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={96} tick={{ fontSize: 12 }} />
              </>
            )}
            <Tooltip formatter={(v: number) => formatTooltipValue(v, data.yAxis?.valueFormat)} />
            {data.showLegend !== false && <Legend />}
            {keys.map((k, i) => {
              const seg = data.categories.flatMap(c => c.segments).find(s => s.name === k)
              return (
                <Bar key={k} dataKey={k} stackId="a" fill={chartColorAt(i, seg?.color ?? null)} radius={[0, 0, 0, 0]} />
              )
            })}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const PieChartDisplay: React.FC<{ data: PieChartData; accessToken?: string }> = ({ data, accessToken }) => {
  const pieData = useMemo(
    () => data.segments.map(s => ({ name: s.name, value: s.value, tooltip: s.tooltip })),
    [data.segments]
  )
  const [colors, setColors] = useState<string[]>([])
  const drilldown = useDrilldownState(data.querySpec, accessToken)

  useLayoutEffect(() => {
    setColors(data.segments.map((s, i) => chartColorAt(i, s.color ?? null)))
  }, [data.segments])

  return (
    <Card className="gba:border-2 gba:shadow-lg gba:overflow-hidden" data-testid="pie-chart-display">
      <CardHeader className="gba:bg-gradient-to-r gba:from-muted/50 gba:to-muted/30 gba:border-b-2">
        <CardTitle className="gba:text-lg gba:font-bold">{data.title}</CardTitle>
        {data.subtitle && <p className="gba:text-xs gba:text-muted-foreground">{data.subtitle}</p>}
        <p className="gba:text-sm gba:text-muted-foreground">{data.description}</p>
      </CardHeader>
      <CardContent className="gba:p-4">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={data.donut ? 56 : 0}
              outerRadius={96}
              paddingAngle={2}
              onClick={drilldown.handleSliceClick}
              label={({ name, percent }: { name: string; percent?: number }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
            >
              {pieData.map((_, i) => (
                <Cell key={`c-${i}`} fill={colors[i] ?? chartColorAt(i, null)} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatTooltipValue(v, data.valueFormat ?? undefined)} />
          </PieChart>
        </ResponsiveContainer>
        {drilldown.enabled && drilldown.active && data.querySpec && accessToken ? (
          <ChartDrilldown
            accessToken={accessToken}
            querySpec={data.querySpec}
            matchValue={drilldown.active}
            onClose={() => drilldown.setActive(null)}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
