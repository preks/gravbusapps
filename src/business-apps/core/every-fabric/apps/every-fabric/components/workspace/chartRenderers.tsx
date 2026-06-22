import React, { useCallback, useId } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
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
  layout?: 'vertical' | 'horizontal'
  displayData?: ChartDataPoint[]
  summarizedData?: ChartDataPoint[]
  denseCategoryChart?: boolean
  recommendedHeight?: number
  showValueLabels?: boolean
  categoryLimit?: number
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
const DENSE_CATEGORY_THRESHOLD = 12
const VERY_DENSE_CATEGORY_THRESHOLD = 18
const DENSE_LABEL_LENGTH_THRESHOLD = 11
const DEFAULT_DENSE_CATEGORY_LIMIT = 12
const HORIZONTAL_BAR_ROW_HEIGHT = 30
const HORIZONTAL_BAR_MIN_HEIGHT = 220
const HORIZONTAL_BAR_MAX_HEIGHT = 520
const CLEAN_BAR_FILL = 'var(--primary)'

/** Internal bucket label for aggregated categories — translate at display time via workspace-chart-other. */
export const CHART_OTHER_CATEGORY_LABEL = 'Other'

const compactLongTail = (data: ChartDataPoint[], valueKey: string, labelKey: string): ChartDataPoint[] => {
  if (data.length <= MAX_PART_TO_WHOLE_ITEMS) return data

  const top = data.slice(0, MAX_PART_TO_WHOLE_ITEMS - 1)
  const otherValue = data.slice(MAX_PART_TO_WHOLE_ITEMS - 1).reduce((sum, row) => {
    const value = row[valueKey] ?? row.value
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
  const other: ChartDataPoint = { name: CHART_OTHER_CATEGORY_LABEL, value: otherValue }
  other[labelKey] = CHART_OTHER_CATEGORY_LABEL
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

const toOptionalNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const toOptionalBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined)

const toOptionalLayout = (value: unknown): SingleChartConfig['layout'] | undefined =>
  value === 'horizontal' || value === 'vertical' ? value : undefined

const toChartDataPoints = (value: unknown): ChartDataPoint[] | undefined =>
  Array.isArray(value) ? (value.filter(row => row && typeof row === 'object') as ChartDataPoint[]) : undefined

const toLabelText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return ''
}

const truncateAxisLabel = (value: unknown, maxLength = 24): string => {
  const text = toLabelText(value)
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function useChartCategoryLabel() {
  const { t } = useTranslation(translations)
  return useCallback(
    (value: unknown, maxLength = 24) => {
      if (value === CHART_OTHER_CATEGORY_LABEL) return t('workspace-chart-other')
      return truncateAxisLabel(value, maxLength)
    },
    [t]
  )
}

function useChartDisplayName() {
  const { t } = useTranslation(translations)
  return useCallback(
    (name?: string) => (name === CHART_OTHER_CATEGORY_LABEL ? t('workspace-chart-other') : (name ?? '')),
    [t]
  )
}

const numericValueForKeys = (row: ChartDataPoint, keys: string[]): number =>
  keys.reduce((sum, key) => {
    const value = row[key]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)

const summarizeCategoryData = (
  data: ChartDataPoint[],
  labelKey: string,
  dataKeys: string[],
  limit = DEFAULT_DENSE_CATEGORY_LIMIT
): ChartDataPoint[] => {
  if (data.length <= limit) return data

  const safeLimit = Math.max(4, limit)
  const sorted = [...data].sort((a, b) => numericValueForKeys(b, dataKeys) - numericValueForKeys(a, dataKeys))
  const top = sorted.slice(0, safeLimit - 1)
  const rest = sorted.slice(safeLimit - 1)
  const other: ChartDataPoint = { name: CHART_OTHER_CATEGORY_LABEL, value: 0 }
  other[labelKey] = CHART_OTHER_CATEGORY_LABEL

  for (const key of dataKeys) {
    other[key] = rest.reduce((sum, row) => {
      const value = row[key]
      return sum + (typeof value === 'number' ? value : 0)
    }, 0)
  }

  const firstKey = dataKeys[0] ?? 'value'
  if (typeof other.value !== 'number' || other.value === 0) {
    const firstValue = other[firstKey]
    other.value = typeof firstValue === 'number' ? firstValue : 0
  }

  return [...top, other]
}

const labelStats = (data: ChartDataPoint[], labelKey: string) => {
  const lengths = data.map(row => toLabelText(row[labelKey] ?? row.name).length)
  const max = lengths.length > 0 ? Math.max(...lengths) : 0
  const avg = lengths.length > 0 ? lengths.reduce((sum, len) => sum + len, 0) / lengths.length : 0
  return { max, avg }
}

const shouldUseDenseCategoryLayout = (config: SingleChartConfig): boolean => {
  if (config.chartType !== 'bar') return false
  if (config.layout === 'horizontal' || config.denseCategoryChart) return true
  if (config.layout === 'vertical') return false

  const labelKey = config.xAxisKey ?? 'name'
  const { max, avg } = labelStats(config.data, labelKey)
  if (config.data.length >= VERY_DENSE_CATEGORY_THRESHOLD) return true
  return config.data.length > DENSE_CATEGORY_THRESHOLD && (max >= DENSE_LABEL_LENGTH_THRESHOLD || avg >= 8)
}

const chartDataForRender = (config: SingleChartConfig): ChartDataPoint[] => {
  if (config.displayData?.length) return config.displayData
  if (config.summarizedData?.length) return config.summarizedData
  if (!shouldUseDenseCategoryLayout(config)) return config.data

  const labelKey = config.xAxisKey ?? 'name'
  const dataKeys = config.dataKeys?.length ? config.dataKeys : [config.yAxisKey ?? 'value']
  return summarizeCategoryData(config.data, labelKey, dataKeys, config.categoryLimit ?? DEFAULT_DENSE_CATEGORY_LIMIT)
}

const barChartHeight = (config: SingleChartConfig, data: ChartDataPoint[], horizontal: boolean): number => {
  if (config.recommendedHeight) return config.recommendedHeight
  if (!horizontal) return CHART_HEIGHT
  return Math.min(
    HORIZONTAL_BAR_MAX_HEIGHT,
    Math.max(HORIZONTAL_BAR_MIN_HEIGHT, data.length * HORIZONTAL_BAR_ROW_HEIGHT + 56)
  )
}

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
    colors: inner.colors,
    layout: inner.layout,
    displayData: inner.displayData,
    summarizedData: inner.summarizedData,
    denseCategoryChart: inner.denseCategoryChart,
    recommendedHeight: inner.recommendedHeight,
    showValueLabels: inner.showValueLabels,
    categoryLimit: inner.categoryLimit
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
    dataKeys: ['value'],
    layout: toOptionalLayout(inner.layout),
    displayData: toChartDataPoints(inner.displayData),
    summarizedData: toChartDataPoints(inner.summarizedData),
    denseCategoryChart: toOptionalBoolean(inner.denseCategoryChart),
    recommendedHeight: toOptionalNumber(inner.recommendedHeight),
    showValueLabels: toOptionalBoolean(inner.showValueLabels),
    categoryLimit: toOptionalNumber(inner.categoryLimit)
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
    gradientFill: source.gradientFill as boolean | undefined,
    layout: toOptionalLayout(source.layout),
    displayData: toChartDataPoints(source.displayData),
    summarizedData: toChartDataPoints(source.summarizedData),
    denseCategoryChart: toOptionalBoolean(source.denseCategoryChart),
    recommendedHeight: toOptionalNumber(source.recommendedHeight),
    showValueLabels: toOptionalBoolean(source.showValueLabels),
    categoryLimit: toOptionalNumber(source.categoryLimit)
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
  const formatName = useChartDisplayName()
  if (!active || !payload || payload.length === 0) return null
  const displayLabel = label === CHART_OTHER_CATEGORY_LABEL ? formatName(String(label)) : label
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
      {displayLabel != null && (
        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--foreground, #0a0a0a)' }}>{displayLabel}</div>
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
          <span>{formatName(entry.name)}</span>
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
  const formatCategoryLabel = useChartCategoryLabel()
  const singleSeries = (config.dataKeys?.length ?? 1) <= 1
  const colors = config.colors ?? DEFAULT_COLORS
  const renderData = chartDataForRender(config)
  const horizontal = shouldUseDenseCategoryLayout(config)
  const height = barChartHeight(config, renderData, horizontal)
  const dataKeys = config.dataKeys?.length ? config.dataKeys : ['value']
  const showValueLabels =
    config.showValueLabels ?? (!horizontal && singleSeries && renderData.length <= DENSE_CATEGORY_THRESHOLD)
  const labelKey = config.xAxisKey ?? 'name'

  if (horizontal) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={renderData} layout="vertical" margin={{ top: 8, right: 28, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.08} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => formatAxisTick(v, config.yAxisUnit)}
          />
          <YAxis
            type="category"
            dataKey={labelKey}
            width={156}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => formatCategoryLabel(v, 22)}
          />
          <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} content={<ChartTooltip unit={config.yAxisUnit} />} />
          {!singleSeries && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
          {dataKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={singleSeries ? CLEAN_BAR_FILL : (colors[idx % colors.length] ?? DEFAULT_COLORS[idx])}
              radius={0}
              maxBarSize={18}
            >
              {showValueLabels && (
                <LabelList
                  dataKey={key}
                  position="right"
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={renderData} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.08} vertical={false} />
        <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => formatAxisTick(v, config.yAxisUnit)}
        />
        <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.3 }} content={<ChartTooltip unit={config.yAxisUnit} />} />
        {!singleSeries && <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />}
        {dataKeys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            fill={singleSeries ? CLEAN_BAR_FILL : (colors[idx % colors.length] ?? DEFAULT_COLORS[idx])}
            radius={0}
            maxBarSize={48}
          >
            {showValueLabels && (
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
  const { t } = useTranslation(translations)
  const formatDisplayName = useChartDisplayName()
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
            const displayName = formatDisplayName(name)
            const pct = ((percent ?? 0) * 100).toFixed(0)
            const txt = `${displayName} ${pct}%`
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
          {t('workspace-chart-total')}
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
