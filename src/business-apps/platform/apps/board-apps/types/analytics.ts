/**
 * Analytics types for board dashboard widgets.
 *
 * These types define the query/result contract for the BoardAnalyticsEngine,
 * which computes aggregations across all filtered rows (not just the loaded page).
 */

import type { ViewFilter, FilterConnector } from './views'

export type AggregationFn = 'count' | 'sum' | 'avg' | 'min' | 'max'
export type TimeBucket = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface MetricDef {
  column: string
  aggregation: AggregationFn
  label?: string
}

export interface AggregateQuery {
  groupBy: string
  metrics: MetricDef[]
  filters?: ViewFilter[]
  filterConnector?: FilterConnector
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  limit?: number
  breakdown?: string
}

export interface TimeSeriesQuery {
  dateColumn: string
  bucket: TimeBucket
  metrics: MetricDef[]
  filters?: ViewFilter[]
  filterConnector?: FilterConnector
  breakdown?: string
}

export interface ScatterQuery {
  xColumn: string
  yColumn: string
  labelColumn?: string
  sizeColumn?: string
  colorColumn?: string
  filters?: ViewFilter[]
  filterConnector?: FilterConnector
}

export interface HistogramQuery {
  column: string
  bins?: number
  filters?: ViewFilter[]
  filterConnector?: FilterConnector
}

export type AnalyticsQuery =
  | { type: 'aggregate'; query: AggregateQuery }
  | { type: 'timeseries'; query: TimeSeriesQuery }
  | { type: 'scatter'; query: ScatterQuery }
  | { type: 'histogram'; query: HistogramQuery }

export interface AggregateRow {
  group: string
  [metricKey: string]: string | number
}

export interface TimeSeriesRow {
  date: string
  [metricKey: string]: string | number
}

export interface ScatterPoint {
  x: number
  y: number
  label?: string
  size?: number
  color?: string
}

export interface HistogramBin {
  binStart: number
  binEnd: number
  label: string
  count: number
}

export interface AnalyticsResult {
  data: AggregateRow[] | TimeSeriesRow[] | ScatterPoint[] | HistogramBin[]
  totalRows: number
  isSampled: boolean
  sampleSize?: number
}

export interface ColumnProfile {
  column: string
  type: string
  label: string
  nonNullCount: number
  nullCount: number
  uniqueCount: number
  isNumeric: boolean
  isDate: boolean
  isCategorical: boolean
  numericStats?: { min: number; max: number; mean: number; median: number; stddev: number }
  dateRange?: { min: string; max: string }
  topValues?: Array<{ value: string; count: number }>
}

export interface DataProfile {
  totalRows: number
  columnProfiles: ColumnProfile[]
  suggestedDateColumn?: string
  suggestedCategoryColumns: string[]
  suggestedMetricColumns: string[]
  correlations?: Array<{ col1: string; col2: string; r: number }>
}
