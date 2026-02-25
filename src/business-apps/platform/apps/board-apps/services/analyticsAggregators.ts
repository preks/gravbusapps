/**
 * Pure aggregation functions used by the BoardAnalyticsEngine.
 * Operates on in-memory row arrays; no API calls here.
 */

import type { BoardRow, BoardColumn } from '../types'
import type {
  AggregateQuery,
  AggregateRow,
  TimeSeriesQuery,
  TimeSeriesRow,
  ScatterQuery,
  ScatterPoint,
  HistogramQuery,
  HistogramBin,
  MetricDef,
  TimeBucket
} from '../types/analytics'

function numericVal(raw: unknown): number | null {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return isNaN(n) ? null : n
}

function computeMetric(values: number[], agg: MetricDef['aggregation']): number {
  if (values.length === 0) return 0
  switch (agg) {
    case 'count':
      return values.length
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    default:
      return values.length
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function aggregateRows(rows: BoardRow[], query: AggregateQuery): AggregateRow[] {
  const groups = new Map<string, Map<string, number[]>>()

  for (const row of rows) {
    const groupVal = String(row.data[query.groupBy] ?? 'Unknown')
    const breakdownVal = query.breakdown ? String(row.data[query.breakdown] ?? 'Other') : undefined

    const key = breakdownVal ? `${groupVal}|||${breakdownVal}` : groupVal

    if (!groups.has(key)) {
      groups.set(key, new Map())
      for (const m of query.metrics) {
        groups.get(key)!.set(m.column, [])
      }
    }

    for (const m of query.metrics) {
      const val = m.aggregation === 'count' ? 1 : numericVal(row.data[m.column])
      if (val !== null) groups.get(key)!.get(m.column)!.push(val)
    }
  }

  let result: AggregateRow[] = [...groups.entries()].map(([key, metrics]) => {
    const parts = key.split('|||')
    const entry: AggregateRow = { group: parts[0] }
    if (parts[1]) entry._breakdown = parts[1]

    for (const m of query.metrics) {
      const metricKey = m.label || `${m.aggregation}_${m.column}`
      entry[metricKey] = round2(computeMetric(metrics.get(m.column) || [], m.aggregation))
    }
    return entry
  })

  if (query.sortBy) {
    const dir = query.sortDirection === 'desc' ? -1 : 1
    result.sort((a, b) => {
      const va = a[query.sortBy!]
      const vb = b[query.sortBy!]
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
      return String(va).localeCompare(String(vb)) * dir
    })
  }

  if (query.limit && query.limit > 0) {
    result = result.slice(0, query.limit)
  }

  return result
}

function bucketDate(dateStr: string, bucket: TimeBucket): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 'Invalid'
  const y = d.getFullYear()
  const m = d.getMonth()

  switch (bucket) {
    case 'day':
      return d.toISOString().slice(0, 10)
    case 'week': {
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d)
      monday.setDate(diff)
      return monday.toISOString().slice(0, 10)
    }
    case 'month':
      return `${y}-${String(m + 1).padStart(2, '0')}`
    case 'quarter':
      return `${y}-Q${Math.floor(m / 3) + 1}`
    case 'year':
      return String(y)
    default:
      return d.toISOString().slice(0, 10)
  }
}

export function computeTimeSeries(rows: BoardRow[], query: TimeSeriesQuery): TimeSeriesRow[] {
  const buckets = new Map<string, Map<string, number[]>>()

  for (const row of rows) {
    const dateVal = row.data[query.dateColumn]
    if (!dateVal) continue
    const bucket = bucketDate(String(dateVal), query.bucket)
    if (bucket === 'Invalid') continue

    const breakdownVal = query.breakdown ? String(row.data[query.breakdown] ?? 'Other') : undefined
    const key = breakdownVal ? `${bucket}|||${breakdownVal}` : bucket

    if (!buckets.has(key)) {
      buckets.set(key, new Map())
      for (const m of query.metrics) buckets.get(key)!.set(m.column, [])
    }
    for (const m of query.metrics) {
      const val = m.aggregation === 'count' ? 1 : numericVal(row.data[m.column])
      if (val !== null) buckets.get(key)!.get(m.column)!.push(val)
    }
  }

  const result: TimeSeriesRow[] = [...buckets.entries()].map(([key, metrics]) => {
    const parts = key.split('|||')
    const entry: TimeSeriesRow = { date: parts[0] }
    if (parts[1]) entry._breakdown = parts[1]
    for (const m of query.metrics) {
      const metricKey = m.label || `${m.aggregation}_${m.column}`
      entry[metricKey] = round2(computeMetric(metrics.get(m.column) || [], m.aggregation))
    }
    return entry
  })

  result.sort((a, b) => a.date.localeCompare(b.date))
  return result
}

export function computeScatter(rows: BoardRow[], query: ScatterQuery): ScatterPoint[] {
  const points: ScatterPoint[] = []
  for (const row of rows) {
    const x = numericVal(row.data[query.xColumn])
    const y = numericVal(row.data[query.yColumn])
    if (x === null || y === null) continue
    points.push({
      x: round2(x),
      y: round2(y),
      label: query.labelColumn ? String(row.data[query.labelColumn] ?? '') : undefined,
      size: query.sizeColumn ? (numericVal(row.data[query.sizeColumn]) ?? undefined) : undefined,
      color: query.colorColumn ? String(row.data[query.colorColumn] ?? '') : undefined
    })
  }
  return points
}

export function computeHistogram(rows: BoardRow[], query: HistogramQuery): HistogramBin[] {
  const values: number[] = []
  for (const row of rows) {
    const v = numericVal(row.data[query.column])
    if (v !== null) values.push(v)
  }
  if (values.length === 0) return []

  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return [{ binStart: min, binEnd: max, label: String(min), count: values.length }]

  const binCount = query.bins || Math.min(20, Math.max(5, Math.ceil(Math.sqrt(values.length))))
  const binWidth = (max - min) / binCount
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => {
    const start = round2(min + i * binWidth)
    const end = round2(min + (i + 1) * binWidth)
    return { binStart: start, binEnd: end, label: `${start}–${end}`, count: 0 }
  })

  for (const v of values) {
    const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1)
    bins[idx].count++
  }

  return bins
}

/**
 * Normalize widget type strings that AI may return in varied formats
 * (different casing, hyphens, alternative names) into canonical form.
 */
export function normalizeWidgetType(raw: string): string {
  const t = (raw || '').toLowerCase().replace(/[-\s]/g, '_')

  if (
    t === 'multi_series_chart' ||
    t === 'multi_series' ||
    t === 'multi_bar' ||
    t === 'multi_line' ||
    t === 'stacked_bar' ||
    t === 'stacked_area' ||
    t === 'multi_chart'
  )
    return 'multi_chart'
  if (
    t === 'time_series' ||
    t === 'timeseries_chart' ||
    t === 'time_series_chart' ||
    t === 'trend' ||
    t === 'timeseries'
  )
    return 'timeseries'
  if (t === 'scatter_plot' || t === 'scatter_chart' || t === 'correlation' || t === 'scatter') return 'scatter'
  if (t === 'distribution' || t === 'histogram_chart' || t === 'histogram') return 'histogram'

  const CHART_SUBTYPES = new Set([
    'bar',
    'line',
    'pie',
    'donut',
    'area',
    'bar_chart',
    'line_chart',
    'pie_chart',
    'donut_chart',
    'area_chart',
    'sunburst',
    'treemap',
    'radar',
    'funnel',
    'waterfall',
    'gauge',
    'heatmap',
    'radial',
    'radial_bar',
    'polar',
    'sankey',
    'bubble_chart',
    'combo',
    'column',
    'column_chart',
    'horizontal_bar',
    'grouped_bar',
    'ring',
    'doughnut',
    'semi_donut'
  ])
  if (CHART_SUBTYPES.has(t)) return 'chart'

  if (
    t === 'kpi' ||
    t === 'number' ||
    t === 'metric' ||
    t === 'stat' ||
    t === 'statistic' ||
    t === 'counter' ||
    t === 'value' ||
    t === 'summary' ||
    t === 'scorecard'
  )
    return 'kpi'
  if (
    t === 'table' ||
    t === 'data_table' ||
    t === 'list' ||
    t === 'top_n' ||
    t === 'grid' ||
    t === 'leaderboard' ||
    t === 'ranking'
  )
    return 'table'
  if (t === 'chart') return 'chart'

  console.warn(`[normalizeWidgetType] Unknown type "${raw}" – falling back to "chart"`)
  return 'chart'
}

export function resolveColumnName(columns: BoardColumn[], ref: string): string {
  if (!ref) return ref
  const exact = columns.find(c => c.name === ref)
  if (exact) return exact.name
  const byLabel = columns.find(c => c.label.toLowerCase() === ref.toLowerCase())
  if (byLabel) return byLabel.name
  const byId = columns.find(c => c.id === ref)
  if (byId) return byId.name
  return ref
}
