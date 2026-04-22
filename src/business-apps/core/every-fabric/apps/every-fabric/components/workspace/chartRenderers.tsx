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
  Legend
} from 'recharts'

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface SingleChartConfig {
  chartType: 'bar' | 'line' | 'pie' | 'area'
  data: ChartDataPoint[]
  title?: string
  xAxisKey?: string
  yAxisKey?: string
  colors?: string[]
  dataKeys?: string[]
  yAxisUnit?: string
  gradientFill?: boolean
}

// Chart palette uses semantic design tokens. Values map to CSS custom properties
// defined in the NEWWORK theme (see chartPalette.ts for the canonical list).
export const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--destructive))'
]

export function parseChartConfig(content: Record<string, unknown>): SingleChartConfig | null {
  const chartType = content.chartType as string | undefined
  const data = content.data as ChartDataPoint[] | undefined

  if (!chartType || !Array.isArray(data) || data.length === 0) return null

  const validTypes = ['bar', 'line', 'pie', 'area']
  if (!validTypes.includes(chartType)) return null

  return {
    chartType: chartType as SingleChartConfig['chartType'],
    data,
    title: content.title as string | undefined,
    xAxisKey: (content.xAxisKey as string) ?? 'name',
    yAxisKey: (content.yAxisKey as string) ?? 'value',
    colors: (content.colors as string[]) ?? DEFAULT_COLORS,
    dataKeys: (content.dataKeys as string[]) ?? ['value'],
    yAxisUnit: content.yAxisUnit as string | undefined,
    gradientFill: content.gradientFill as boolean | undefined
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

export const BarChartRenderer: React.FC<{ config: SingleChartConfig }> = ({ config }) => (
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
          fill={config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]}
          radius={[2, 2, 0, 0]}
        />
      ))}
    </BarChart>
  </ResponsiveContainer>
)

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
  <ResponsiveContainer width="100%" height={180}>
    <PieChart>
      <Pie
        data={config.data}
        dataKey={config.yAxisKey ?? 'value'}
        nameKey={config.xAxisKey ?? 'name'}
        cx="50%"
        cy="50%"
        outerRadius={65}
        label={({ name, percent }: { name?: string; percent?: number }) =>
          `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
        }
        labelLine={false}
      >
        {config.data.map((_entry, idx) => (
          <Cell
            key={`cell-${_entry.name}-${idx}`}
            fill={config.colors?.[idx % (config.colors?.length ?? 1)] ?? DEFAULT_COLORS[idx]}
          />
        ))}
      </Pie>
      <Tooltip contentStyle={{ fontSize: 11 }} />
    </PieChart>
  </ResponsiveContainer>
)

export const chartRenderers: Record<string, React.FC<{ config: SingleChartConfig }>> = {
  bar: BarChartRenderer,
  line: LineChartRenderer,
  pie: PieChartRenderer,
  area: AreaChartRenderer
}
