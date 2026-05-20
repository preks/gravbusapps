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

  // Support nested {chart: {chartType, data, ...}} wrapper from dashboard.json
  const source = (content.chartType ? content : (content.chart as Record<string, unknown>)) ?? content
  const chartType = source.chartType as string | undefined
  const data = source.data as ChartDataPoint[] | undefined

  if (!chartType || !Array.isArray(data) || data.length === 0) return null
  if (!validTypes.includes(chartType)) return null

  return {
    chartType: chartType as SingleChartConfig['chartType'],
    data,
    title: (content.title ?? source.title) as string | undefined,
    xAxisKey: (source.xAxisKey as string) ?? 'name',
    yAxisKey: (source.yAxisKey as string) ?? 'value',
    colors: (source.colors as string[]) ?? DEFAULT_COLORS,
    dataKeys: (source.dataKeys as string[]) ?? ['value'],
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

export const AreaChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  // useId ensures unique SVG <linearGradient> ids per rendered chart, so
  // multiple AreaCharts on the same page don't collide on `url(#gradient-0)`.
  const gradientBase = useId()
  const gradientIds = (config.dataKeys ?? ['value']).map((_, i) => `${gradientBase}-gradient-${i}`)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={config.data}>
        <defs>
          {gradientIds.map((id, idx) => {
            const color = config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]
            return (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => formatAxisTick(v, config.yAxisUnit)} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        {config.dataKeys?.map((key, idx) => {
          const color = config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]
          return (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={color}
              strokeWidth={1.5}
              fill={config.gradientFill !== false ? `url(#${gradientIds[idx]})` : color}
              fillOpacity={config.gradientFill !== false ? 1 : 0.15}
            />
          )
        })}
        <Legend wrapperStyle={{ fontSize: 9 }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const BarChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => {
  const singleSeries = (config.dataKeys?.length ?? 1) <= 1
  const colors = config.colors ?? DEFAULT_COLORS

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={config.data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 9 }} />
        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => formatAxisTick(v, config.yAxisUnit)} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {config.dataKeys?.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            fill={singleSeries ? undefined : (colors[idx % colors.length] ?? DEFAULT_COLORS[idx])}
            radius={[2, 2, 0, 0]}
          >
            {singleSeries &&
              config.data.map((entry, i) => <Cell key={`cell-${entry.name ?? i}`} fill={colors[i % colors.length]} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export const LineChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height={180}>
    <LineChart data={config.data}>
      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
      <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 9 }} />
      <YAxis tick={{ fontSize: 9 }} tickFormatter={v => formatAxisTick(v, config.yAxisUnit)} />
      <Tooltip contentStyle={{ fontSize: 11 }} />
      <Legend wrapperStyle={{ fontSize: 9 }} />
      {config.dataKeys?.map((key, idx) => (
        <Line
          key={key}
          type="monotone"
          dataKey={key}
          stroke={config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]}
          strokeWidth={2}
          dot={{ r: 2.5 }}
        />
      ))}
    </LineChart>
  </ResponsiveContainer>
)

export const PieChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => (
  <ResponsiveContainer width="100%" height={200}>
    <PieChart>
      <Pie
        data={config.data}
        dataKey={config.yAxisKey ?? 'value'}
        nameKey={config.xAxisKey ?? 'name'}
        cx="50%"
        cy="50%"
        outerRadius={55}
        innerRadius={25}
        label={({ name, percent }: { name?: string; percent?: number }) => {
          const pct = ((percent ?? 0) * 100).toFixed(0)
          const txt = `${name ?? ''} ${pct}%`
          if (txt.length > 12) return `${pct}%`
          return txt
        }}
        labelLine={{ stroke: 'var(--border)', strokeWidth: 1 }}
        fontSize={9}
      >
        {config.data.map((_entry, idx) => (
          <Cell
            key={`cell-${_entry.name}-${idx}`}
            fill={config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]}
          />
        ))}
      </Pie>
      <Tooltip contentStyle={{ fontSize: 11 }} />
      <Legend wrapperStyle={{ fontSize: 9 }} />
    </PieChart>
  </ResponsiveContainer>
)

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
          if (width < 40 || height < 20) return null
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
