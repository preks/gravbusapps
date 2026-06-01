import React, { useId } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  RadialBarChart,
  RadialBar,
  ScatterChart,
  Scatter,
  FunnelChart,
  Funnel,
  LabelList,
  Treemap,
  ComposedChart
} from 'recharts'

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface SingleChartConfig {
  chartType:
    | 'bar'
    | 'line'
    | 'pie'
    | 'area'
    | 'radar'
    | 'radial'
    | 'scatter'
    | 'funnel'
    | 'treemap'
    | 'sunburst'
    | 'composed'
  data: ChartDataPoint[]
  title?: string
  xAxisKey?: string
  yAxisKey?: string
  colors?: string[]
  dataKeys?: string[]
  yAxisUnit?: string
  gradientFill?: boolean
}

// Chart palette uses semantic design tokens from the NEWWORK design system.
// Tokens are oklch values defined as --nw-chart-* in nw-design-system/color.css.
export const DEFAULT_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)',
  'var(--nw-chart-7)',
  'var(--nw-chart-8)'
]

const PART_TO_WHOLE_CHART_TYPES = new Set(['pie', 'radar', 'radial', 'funnel', 'treemap', 'sunburst'])
const MAX_PART_TO_WHOLE_ITEMS = 6

const compactLongTail = (data: ChartDataPoint[], valueKey: string, labelKey: string): ChartDataPoint[] => {
  if (data.length <= MAX_PART_TO_WHOLE_ITEMS) return data

  const top = data.slice(0, MAX_PART_TO_WHOLE_ITEMS - 1)
  const otherValue = data.slice(MAX_PART_TO_WHOLE_ITEMS - 1).reduce((sum, row) => {
    const value = row[valueKey] ?? row.value
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
  const other: ChartDataPoint = { name: 'Other', value: otherValue }
  other[labelKey] = 'Other'
  other[valueKey] = otherValue
  return [...top, other]
}

const toChartAxisKey = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value)
  }
  return fallback
}

const toOptionalChartTitle = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

/** Unwrap Flowbot/provider chart payloads ({ kind, content: { chart_type, ... } }). */
export function unwrapProviderChartPayload(content: Record<string, unknown>): Record<string, unknown> {
  if (content.chartType || Array.isArray(content.sections)) {
    return content
  }
  const nested = content.content
  if (typeof nested !== 'object' || nested === null || Array.isArray(nested)) {
    return content
  }
  const inner = nested as Record<string, unknown>
  const chartType = (inner.chart_type ?? inner.chartType) as string | undefined
  if (!chartType) {
    return content
  }
  const data = inner.data as ChartDataPoint[] | undefined
  const xAxisKey = toChartAxisKey(inner.x_key ?? inner.xAxisKey, 'name')
  const yKey = inner.y_key ?? inner.yAxisKey
  let dataKeys = inner.dataKeys as string[] | undefined
  if (!Array.isArray(dataKeys) || dataKeys.length === 0) {
    if (yKey !== undefined && yKey !== null) {
      dataKeys = [toChartAxisKey(yKey, 'value')]
    } else if (Array.isArray(data) && data[0]) {
      const first = data[0]
      const inferred = Object.keys(first).filter(key => key !== xAxisKey && typeof first[key] === 'number')
      dataKeys = inferred.length > 0 ? inferred : ['value']
    } else {
      dataKeys = ['value']
    }
  }
  return {
    chartType,
    data,
    dataKeys,
    xAxisKey,
    title: toOptionalChartTitle(content.title ?? inner.title),
    yAxisUnit: inner.yAxisUnit,
    colors: inner.colors
  }
}

/** Convert FlowBot / provider chart JSON to Every Fabric SingleChartConfig shape. */
export function normalizeChartPayloadForRender(raw: Record<string, unknown>): Record<string, unknown> {
  const unwrapped = unwrapProviderChartPayload(raw)
  if (parseChartConfig(unwrapped)) {
    return unwrapped
  }

  const inner =
    unwrapped.content && typeof unwrapped.content === 'object' && !Array.isArray(unwrapped.content)
      ? (unwrapped.content as Record<string, unknown>)
      : unwrapped

  const chartTypeRaw = (inner.chart_type ?? inner.chartType) as string | undefined
  const chartType = chartTypeRaw?.toLowerCase()
  const rows = inner.data as Array<Record<string, unknown>> | undefined
  if (!chartType || !Array.isArray(rows) || rows.length === 0) {
    return unwrapped
  }

  const labelKey = String(inner.x_key ?? inner.xAxisKey ?? 'name')
  const valueKey = String(inner.y_key ?? inner.yKey ?? 'value')
  const series: ChartDataPoint[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const label = row[labelKey] ?? row.name ?? row.label ?? row.team_name
    const value = row[valueKey] ?? row.value ?? row.count
    if (label == null || value == null || typeof value !== 'number') continue
    series.push({ name: String(label), value })
  }
  if (series.length === 0) {
    return unwrapped
  }

  return {
    chartType,
    title: (raw.title ?? inner.title) as string | undefined,
    data: series,
    xAxisKey: 'name',
    dataKeys: ['value']
  }
}

export function parseChartConfig(content: Record<string, unknown>): SingleChartConfig | null {
  const validTypes = [
    'bar',
    'line',
    'pie',
    'area',
    'radar',
    'radial',
    'scatter',
    'funnel',
    'treemap',
    'sunburst',
    'composed'
  ]

  const unwrapped = unwrapProviderChartPayload(content)
  // Support nested {chart: {chartType, data, ...}} wrapper from dashboard.json
  const source = (unwrapped.chartType ? unwrapped : (unwrapped.chart as Record<string, unknown>)) ?? unwrapped
  const chartTypeRaw = source.chartType as string | undefined
  const chartType = chartTypeRaw?.toLowerCase()
  const data = source.data as ChartDataPoint[] | undefined

  if (!chartType || !Array.isArray(data) || data.length === 0) return null
  if (!validTypes.includes(chartType)) return null

  const providedKeys = source.dataKeys as string[] | undefined
  let dataKeys = Array.isArray(providedKeys) && providedKeys.length > 0 ? [...providedKeys] : ['value']
  const firstRow = data[0]
  if (firstRow && !dataKeys.some(key => key in firstRow)) {
    const inferred = Object.keys(firstRow).filter(key => key !== 'name' && typeof firstRow[key] === 'number')
    if (inferred.length > 0) dataKeys = inferred
  }

  const xAxisKey = (source.xAxisKey as string) ?? 'name'
  const yAxisKey = (source.yAxisKey as string) ?? dataKeys[0] ?? 'value'
  const normalizedData = PART_TO_WHOLE_CHART_TYPES.has(chartType) ? compactLongTail(data, yAxisKey, xAxisKey) : data

  return {
    chartType: chartType as SingleChartConfig['chartType'],
    data: normalizedData,
    title: (unwrapped.title ?? source.title) as string | undefined,
    xAxisKey: (source.xAxisKey as string) ?? 'name',
    yAxisKey: (source.yAxisKey as string) ?? dataKeys[0] ?? 'value',
    colors: (source.colors as string[]) ?? DEFAULT_COLORS,
    dataKeys,
    yAxisUnit: source.yAxisUnit as string | undefined,
    gradientFill: source.gradientFill as boolean | undefined
  }
}

const formatAxisTick = (value: unknown, unit?: string): string => {
  if (typeof value !== 'number') return String(value)
  if (unit === '%') return `${value}%`
  if (unit === 'ms') return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`
  if (unit === 'KB' || unit === 'MB') {
    if (value >= 1000 && unit === 'KB') return `${(value / 1000).toFixed(1)}MB`
    return `${value}${unit}`
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return String(value)
}

/** Compact value label shown directly on bars/points (e.g. 1500 -> "1.5K"). */
export const formatValueLabel = (value: unknown, unit?: string): string => formatAxisTick(value, unit)

/** Sum a numeric data key across rows — used for the donut center total. */
export const sumSeries = (data: ChartDataPoint[], key = 'value'): number =>
  data.reduce((acc, row) => {
    const v = row[key] ?? row.value
    return acc + (typeof v === 'number' ? v : 0)
  }, 0)

interface TooltipEntry {
  name?: string
  value?: number | string
  color?: string
}

/** Shared rounded tooltip with a soft shadow, replacing Recharts' default box. */
const ChartTooltip: React.FC<{
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  unit?: string
}> = ({ active, payload, label, unit }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: 'var(--card, #fff)',
        border: '1px solid var(--border, #e5e5e5)',
        borderRadius: 10,
        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
        padding: '8px 10px',
        fontSize: 11
      }}
    >
      {label != null && (
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--foreground, #0a0a0a)' }}>{label}</div>
      )}
      {payload.map((entry, idx) => (
        <div
          key={idx}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground, #737373)' }}
        >
          {entry.color && (
            <span
              style={{ width: 8, height: 8, borderRadius: 9999, background: entry.color, display: 'inline-block' }}
            />
          )}
          <span>{entry.name}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--foreground, #0a0a0a)' }}>
            {formatValueLabel(entry.value, unit)}
          </span>
        </div>
      ))}
    </div>
  )
}

const CHART_HEIGHT = 240

export const AreaChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  // useId ensures unique SVG <linearGradient> ids per rendered chart, so
  // multiple AreaCharts on the same page don't collide on `url(#gradient-0)`.
  const gradientBase = useId()
  const gradientIds = (config.dataKeys ?? ['value']).map((_, i) => `${gradientBase}-gradient-${i}`)

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={config.data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {gradientIds.map((id, idx) => {
            const color = config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]
            return (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
        <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => formatAxisTick(v, config.yAxisUnit)}
        />
        <Tooltip content={<ChartTooltip unit={config.yAxisUnit} />} />
        {config.dataKeys?.map((key, idx) => {
          const color = config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={2.5}
              fill={config.gradientFill !== false ? `url(#${gradientIds[idx]})` : color}
              fillOpacity={config.gradientFill !== false ? 1 : 0.15}
            />
          )
        })}
        {(config.dataKeys?.length ?? 1) > 1 && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const BarChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const singleSeries = (config.dataKeys?.length ?? 1) <= 1
  const colors = config.colors ?? DEFAULT_COLORS
  const gradientBase = useId()
  const gradientId = `${gradientBase}-bar`

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={config.data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors[0]} stopOpacity={0.95} />
            <stop offset="100%" stopColor={colors[0]} stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
        <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => formatAxisTick(v, config.yAxisUnit)}
        />
        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} content={<ChartTooltip unit={config.yAxisUnit} />} />
        {!singleSeries && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
        {config.dataKeys?.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            fill={singleSeries ? `url(#${gradientId})` : (colors[idx % colors.length] ?? DEFAULT_COLORS[idx])}
            radius={[6, 6, 0, 0]}
            maxBarSize={64}
          >
            {singleSeries && (
              <LabelList
                dataKey={key}
                position="top"
                fontSize={11}
                fill="var(--foreground)"
                formatter={(v: unknown) => formatValueLabel(v, config.yAxisUnit)}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export const LineChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const multiSeries = (config.dataKeys?.length ?? 1) > 1
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={config.data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.12} vertical={false} />
        <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => formatAxisTick(v, config.yAxisUnit)}
        />
        <Tooltip content={<ChartTooltip unit={config.yAxisUnit} />} />
        {multiSeries && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
        {config.dataKeys?.map((key, idx) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]}
            strokeWidth={2.5}
            dot={{ r: 3, strokeWidth: 2, fill: 'var(--card, #fff)' }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

export const PieChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const valueKey = config.yAxisKey ?? 'value'
  const total = sumSeries(config.data, valueKey)
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <PieChart>
        <Pie
          data={config.data}
          dataKey={valueKey}
          nameKey={config.xAxisKey ?? 'name'}
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={52}
          paddingAngle={2}
          label={({ name, percent }: { name?: string; percent?: number }) => {
            const pct = ((percent ?? 0) * 100).toFixed(0)
            const txt = `${name ?? ''} ${pct}%`
            if (txt.length > 12) return `${pct}%`
            return txt
          }}
          labelLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
          fontSize={11}
        >
          {config.data.map((_entry, idx) => (
            <Cell
              key={`cell-${_entry.name}-${idx}`}
              stroke="var(--card, #fff)"
              strokeWidth={2}
              fill={config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]}
            />
          ))}
        </Pie>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--foreground)"
          style={{ fontSize: 20, fontWeight: 600 }}
        >
          {formatValueLabel(total, config.yAxisUnit)}
        </text>
        <text
          x="50%"
          y="50%"
          dy={18}
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--muted-foreground)"
          style={{ fontSize: 10 }}
        >
          Total
        </text>
        <Tooltip content={<ChartTooltip unit={config.yAxisUnit} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  )
}

export const RadarChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const colors = config.colors ?? DEFAULT_COLORS
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={config.data} cx="50%" cy="50%" outerRadius="70%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey={config.xAxisKey ?? 'name'} tick={{ fontSize: 9 }} />
        <PolarRadiusAxis tick={{ fontSize: 8 }} />
        {(config.dataKeys ?? ['value']).map((key, idx) => (
          <Radar
            key={key}
            dataKey={key}
            stroke={colors[idx % colors.length]}
            fill={colors[idx % colors.length]}
            fillOpacity={0.2}
          />
        ))}
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 9 }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

export const RadialBarChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const colors = config.colors ?? DEFAULT_COLORS
  const colored = config.data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }))
  return (
    <ResponsiveContainer width="100%" height={250}>
      <RadialBarChart
        data={colored}
        cx="35%"
        cy="50%"
        innerRadius="20%"
        outerRadius="90%"
        startAngle={180}
        endAngle={0}
      >
        <RadialBar dataKey={config.dataKeys?.[0] ?? 'value'} background={{ fill: 'var(--muted)' }}>
          {colored.map((d, i) => (
            <Cell key={`cell-${i}`} fill={d.fill} />
          ))}
        </RadialBar>
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend
          wrapperStyle={{ fontSize: 9, paddingLeft: 16 }}
          layout="vertical"
          align="right"
          verticalAlign="middle"
        />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}

export const ScatterChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const colors = config.colors ?? DEFAULT_COLORS
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey={config.xAxisKey ?? 'x'} tick={{ fontSize: 9 }} />
        <YAxis dataKey={config.dataKeys?.[0] ?? 'y'} tick={{ fontSize: 9 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={config.data} fill={colors[0]} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

export const FunnelChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const colors = config.colors ?? DEFAULT_COLORS
  const colored = config.data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <FunnelChart>
        <Funnel data={colored} dataKey={config.dataKeys?.[0] ?? 'value'} nameKey={config.xAxisKey ?? 'name'}>
          {colored.map((d, i) => (
            <Cell key={`cell-${i}`} fill={d.fill} />
          ))}
          <LabelList position="right" fill="var(--foreground)" fontSize={10} />
        </Funnel>
        <Tooltip contentStyle={{ fontSize: 11 }} />
      </FunnelChart>
    </ResponsiveContainer>
  )
}

export const TreemapRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const colors = config.colors ?? DEFAULT_COLORS
  const colored = config.data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <Treemap
        data={colored}
        dataKey={config.dataKeys?.[0] ?? 'value'}
        nameKey={config.xAxisKey ?? 'name'}
        stroke="var(--nw-background, #fff)"
        content={({
          x,
          y,
          width,
          height,
          name,
          fill,
          index
        }: {
          x: number
          y: number
          width: number
          height: number
          name?: string
          fill?: string
          index?: number
        }) => {
          const showLabel = width >= 40 && height >= 20
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={fill ?? colors[(index ?? 0) % colors.length]}
                stroke="var(--nw-background, #fff)"
                strokeWidth={2}
                rx={4}
              />
              {showLabel ? (
                <text
                  x={x + width / 2}
                  y={y + height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="var(--nw-background, #fff)"
                  fontSize={width < 80 ? 9 : 11}
                  fontWeight={600}
                >
                  {(name ?? '').length > 12 ? `${(name ?? '').slice(0, 11)}…` : name}
                </text>
              ) : null}
            </g>
          )
        }}
      />
    </ResponsiveContainer>
  )
}

export const SunburstRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height={250}>
    <PieChart>
      <Pie
        data={config.data}
        dataKey={config.dataKeys?.[0] ?? 'value'}
        nameKey={config.xAxisKey ?? 'name'}
        cx="50%"
        cy="50%"
        outerRadius={90}
        innerRadius={40}
        label={({ name }: { name?: string }) => name ?? ''}
        labelLine={false}
      >
        {config.data.map((_, idx) => (
          <Cell
            key={`cell-${idx}`}
            fill={(config.colors ?? DEFAULT_COLORS)[idx % (config.colors ?? DEFAULT_COLORS).length]}
          />
        ))}
      </Pie>
      <Tooltip contentStyle={{ fontSize: 11 }} />
    </PieChart>
  </ResponsiveContainer>
)

export const ComposedChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const colors = config.colors ?? DEFAULT_COLORS
  return (
    <ResponsiveContainer width="100%" height={180}>
      <ComposedChart data={config.data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey={config.xAxisKey ?? 'name'} tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        {(config.dataKeys ?? ['value']).map((key, idx) => (
          <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} radius={[3, 3, 0, 0]} />
        ))}
        <Legend wrapperStyle={{ fontSize: 9 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export const chartRenderers: Record<string, React.FC<{ config: SingleChartConfig }>> = {
  bar: BarChartRenderer,
  line: LineChartRenderer,
  pie: PieChartRenderer,
  area: AreaChartRenderer,
  radar: RadarChartRenderer,
  radial: RadialBarChartRenderer,
  scatter: ScatterChartRenderer,
  funnel: FunnelChartRenderer,
  treemap: TreemapRenderer,
  sunburst: SunburstRenderer,
  composed: ComposedChartRenderer
}
