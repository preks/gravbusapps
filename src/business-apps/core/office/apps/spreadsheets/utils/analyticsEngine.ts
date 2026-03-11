import type { SpreadsheetColumn } from '../types'

export type AnalyticsAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max'
export type AnalyticsChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter'

export interface PivotRequest {
  rowField: string
  columnField?: string
  valueField?: string
  aggregation: AnalyticsAggregation
}

export interface PivotResult {
  rowField: string
  columnKeys: string[]
  rows: Array<Record<string, unknown>>
}

export interface ChartRequest {
  xAxis: string
  yAxes: string[]
  aggregation: AnalyticsAggregation
  chartType: AnalyticsChartType
}

export interface ChartResult {
  xAxis: string
  yAxes: string[]
  chartType: AnalyticsChartType
  rows: Array<Record<string, unknown>>
}

interface AggregationState {
  count: number
  sum: number
  min: number | null
  max: number | null
}

const EMPTY_DIMENSION = '(empty)'

const createAggregationState = (): AggregationState => ({
  count: 0,
  sum: 0,
  min: null,
  max: null
})

const numericColumnTypes = new Set(['number', 'currency', 'percentage', 'calculated'])
const nonValueColumnTypes = new Set(['image', 'url'])

export const isNumericColumn = (column: SpreadsheetColumn): boolean => numericColumnTypes.has(column.type)

/** Values that look like numbers (for inference when column type is missing) */
function looksNumeric(value: unknown): boolean {
  if (typeof value === 'number' && Number.isFinite(value)) return true
  if (value == null || value === '') return false
  const s = String(value).replace(/,/g, '').trim()
  if (!s) return false
  const n = Number(s)
  return Number.isFinite(n)
}

/**
 * Columns suitable for chart Y-axis (values). Includes:
 * - Explicit numeric types
 * - Columns inferred as numeric from sample data (when type is text/missing)
 * - Fallback: all columns except image/url when none of the above
 */
export function getChartableValueColumns(
  columns: SpreadsheetColumn[],
  rows: Array<Record<string, unknown>>
): SpreadsheetColumn[] {
  const explicitNumeric = columns.filter(c => numericColumnTypes.has(c.type))
  if (explicitNumeric.length > 0) return explicitNumeric

  const sampleSize = Math.min(50, Math.max(5, rows.length))
  const sample = rows.slice(0, sampleSize)
  const inferred = columns.filter(col => {
    if (nonValueColumnTypes.has(col.type)) return false
    const keys = [col.name, col.id, (col as { label?: string }).label].filter(Boolean)
    let numericCount = 0
    for (const row of sample) {
      const v = keys.map(k => row[k]).find(val => val !== undefined)
      if (looksNumeric(v)) numericCount += 1
    }
    return sampleSize > 0 && numericCount / sampleSize >= 0.2
  })
  if (inferred.length > 0) return inferred

  return columns.filter(c => !nonValueColumnTypes.has(c.type))
}

/** Extract raw value from Univer cell objects { v, m, ... } or plain values */
function extractValue(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    const v = obj.v ?? obj.m ?? obj.url ?? obj.src
    return v !== undefined ? v : value
  }
  return value
}

const normalizeDimension = (value: unknown): string => {
  const v = extractValue(value)
  if (v == null || v === '') return EMPTY_DIMENSION
  const text = String(v).trim()
  return text.length > 0 ? text : EMPTY_DIMENSION
}

const toNumber = (value: unknown): number | null => {
  const v = extractValue(value)
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const normalized = v.replace(/,/g, '').trim()
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const updateAggregationState = (state: AggregationState, value: unknown, aggregation: AnalyticsAggregation) => {
  state.count += 1
  if (aggregation === 'count') return

  const numeric = toNumber(value)
  if (numeric == null) return
  state.sum += numeric
  state.min = state.min == null ? numeric : Math.min(state.min, numeric)
  state.max = state.max == null ? numeric : Math.max(state.max, numeric)
}

const getAggregatedValue = (state: AggregationState, aggregation: AnalyticsAggregation): number => {
  switch (aggregation) {
    case 'count':
      return state.count
    case 'sum':
      return state.sum
    case 'avg':
      return state.count > 0 ? state.sum / state.count : 0
    case 'min':
      return state.min ?? 0
    case 'max':
      return state.max ?? 0
    default:
      return 0
  }
}

const sortDimensionValues = (values: Iterable<string>) =>
  [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))

export const computePivotTable = (rows: Array<Record<string, unknown>>, request: PivotRequest): PivotResult => {
  if (!request.rowField) {
    return { rowField: '', columnKeys: [], rows: [] }
  }

  const matrix = new Map<string, Map<string, AggregationState>>()
  const columnKeys = new Set<string>()

  for (const row of rows) {
    const rowKey = normalizeDimension(row[request.rowField])
    const colKey = request.columnField ? normalizeDimension(row[request.columnField]) : 'value'
    columnKeys.add(colKey)

    const rowBucket = matrix.get(rowKey) ?? new Map<string, AggregationState>()
    const cell = rowBucket.get(colKey) ?? createAggregationState()
    updateAggregationState(cell, request.valueField ? row[request.valueField] : undefined, request.aggregation)
    rowBucket.set(colKey, cell)
    matrix.set(rowKey, rowBucket)
  }

  const orderedColumnKeys = sortDimensionValues(columnKeys)
  const resultRows: Array<Record<string, unknown>> = []

  for (const rowKey of sortDimensionValues(matrix.keys())) {
    const buckets = matrix.get(rowKey)
    const nextRow: Record<string, unknown> = { [request.rowField]: rowKey }
    for (const colKey of orderedColumnKeys) {
      const cell = buckets?.get(colKey)
      nextRow[colKey] = cell ? getAggregatedValue(cell, request.aggregation) : 0
    }
    resultRows.push(nextRow)
  }

  return {
    rowField: request.rowField,
    columnKeys: orderedColumnKeys,
    rows: resultRows
  }
}

export const computeChartData = (rows: Array<Record<string, unknown>>, request: ChartRequest): ChartResult => {
  if (!request.xAxis || request.yAxes.length === 0) {
    return { xAxis: request.xAxis, yAxes: request.yAxes, chartType: request.chartType, rows: [] }
  }

  const grouped = new Map<string, Map<string, AggregationState>>()

  const yAxesFiltered = request.yAxes.filter(y => y !== request.xAxis)

  for (const row of rows) {
    const xKey = normalizeDimension(row[request.xAxis])
    const seriesBucket = grouped.get(xKey) ?? new Map<string, AggregationState>()
    for (const yAxis of yAxesFiltered) {
      const state = seriesBucket.get(yAxis) ?? createAggregationState()
      updateAggregationState(state, row[yAxis], request.aggregation)
      seriesBucket.set(yAxis, state)
    }
    grouped.set(xKey, seriesBucket)
  }

  const chartRows = sortDimensionValues(grouped.keys()).map(xKey => {
    const values: Record<string, unknown> = { [request.xAxis]: xKey }
    const yBucket = grouped.get(xKey)
    for (const yAxis of yAxesFiltered) {
      const state = yBucket?.get(yAxis)
      values[yAxis] = state ? getAggregatedValue(state, request.aggregation) : 0
    }
    return values
  })

  return {
    xAxis: request.xAxis,
    yAxes: yAxesFiltered,
    chartType: request.chartType,
    rows: chartRows
  }
}

export interface ColumnSummary {
  columnName: string
  count: number
  unique: number
  mode: string
  topValues: Array<{ label: string; count: number }>
}

export const summarizeColumn = (rows: Array<Record<string, unknown>>, columnName: string, limit = 5): ColumnSummary => {
  const frequencies = new Map<string, number>()
  let count = 0
  for (const row of rows) {
    const value = normalizeDimension(row[columnName])
    if (value === EMPTY_DIMENSION) continue
    count += 1
    frequencies.set(value, (frequencies.get(value) ?? 0) + 1)
  }
  const sorted = [...frequencies.entries()].sort((a, b) => b[1] - a[1])
  return {
    columnName,
    count,
    unique: frequencies.size,
    mode: sorted[0]?.[0] ?? EMPTY_DIMENSION,
    topValues: sorted.slice(0, limit).map(([label, count]) => ({ label, count }))
  }
}

export const createAnalyticsMemo = () => {
  const pivotCache = new Map<string, PivotResult>()
  const chartCache = new Map<string, ChartResult>()

  return {
    computePivot(cacheKey: string, rows: Array<Record<string, unknown>>, request: PivotRequest): PivotResult {
      if (pivotCache.has(cacheKey)) return pivotCache.get(cacheKey)!
      const result = computePivotTable(rows, request)
      pivotCache.set(cacheKey, result)
      return result
    },
    computeChart(cacheKey: string, rows: Array<Record<string, unknown>>, request: ChartRequest): ChartResult {
      if (chartCache.has(cacheKey)) return chartCache.get(cacheKey)!
      const result = computeChartData(rows, request)
      chartCache.set(cacheKey, result)
      return result
    },
    clear() {
      pivotCache.clear()
      chartCache.clear()
    }
  }
}
