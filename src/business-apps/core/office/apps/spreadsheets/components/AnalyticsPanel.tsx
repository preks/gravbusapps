import React, { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button, Checkbox, Tabs, TabsContent, TabsList, TabsTrigger, useTranslation } from '@newwork/nw-design-system'
import { BarChart3, X, Sparkles, Copy, RefreshCw, Download, Presentation } from 'lucide-react'
import { toPng } from 'html-to-image'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from 'recharts'
import type { SpreadsheetColumn } from '../types'
import {
  createAnalyticsMemo,
  getChartableValueColumns,
  isNumericColumn,
  type AnalyticsAggregation,
  type AnalyticsChartType
} from '../utils/analyticsEngine'
import { indexToExcelCol, parseChartRange } from '../utils/chartRangeUtils'
import { useSpreadsheetAnalyticsAI } from '../hooks/useSpreadsheetAnalyticsAI'
import { useSpreadsheetPromptManagerClient } from '../hooks/useSpreadsheetPromptManagerClient'
import { SendToSlidesDialog } from './SendToSlidesDialog'
import translations from '../_i18n'

const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)'
]

export interface AnalyticsPanelProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'charts' | 'insights' | 'summary' | 'pivot'
  columns: SpreadsheetColumn[]
  sheetData: Record<string, unknown>[]
  sheetName: string
  sheetId: string
  accessToken: string
  canEdit: boolean
  onInsertRows: (rows: Array<Record<string, unknown>>) => Promise<boolean>
  /** When provided, reads header names from the live grid's first row (column name -> display string) */
  getHeaderRowFromGrid?: () => Map<string, string> | null
  /** When provided, reads row data from the live grid (guarantees column-name keys for charting) */
  getSheetDataFromGrid?: () => Record<string, unknown>[] | null
  'data-testid'?: string
}

function isGenericColumnToken(value: string): boolean {
  return /^column(?:[_\s-]?[a-z0-9]+)?$/i.test(value.trim())
}

function extractDisplayValue(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'string') return raw.trim()
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    const value = obj.v ?? obj.m ?? obj.url ?? obj.src
    if (typeof value === 'string') return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return String(raw).trim()
}

function getRowCellValue(row: Record<string, unknown>, column: SpreadsheetColumn) {
  return row[column.name] ?? row[column.id] ?? row[column.label]
}

function detectHeaderInfo(
  columns: SpreadsheetColumn[],
  sheetData: Record<string, unknown>[],
  hasGenericColumnNames: boolean
): { headerMap: Map<string, string>; headerRowIndex: number } {
  if (sheetData.length === 0 || !hasGenericColumnNames) {
    return { headerMap: new Map<string, string>(), headerRowIndex: -1 }
  }

  const maxCandidates = Math.min(sheetData.length, 5)
  let bestHeaderRowIndex = -1
  let bestScore = -1
  let bestMap = new Map<string, string>()

  for (let rowIndex = 0; rowIndex < maxCandidates; rowIndex += 1) {
    const row = sheetData[rowIndex]
    const pairs = columns
      .map(column => {
        const raw = getRowCellValue(row, column)
        const headerText = extractDisplayValue(raw)
        return { key: column.name, headerText }
      })
      .filter(pair => pair.headerText.length > 0)

    if (pairs.length < Math.ceil(columns.length * 0.6)) continue
    const nonGenericCount = pairs.filter(pair => !isGenericColumnToken(pair.headerText)).length
    const score = nonGenericCount * 2 + pairs.length

    if (score > bestScore) {
      bestScore = score
      bestHeaderRowIndex = rowIndex
      bestMap = new Map<string, string>(pairs.map(pair => [pair.key, pair.headerText]))
    }
  }

  if (bestHeaderRowIndex < 0) {
    return { headerMap: new Map<string, string>(), headerRowIndex: -1 }
  }
  return { headerMap: bestMap, headerRowIndex: bestHeaderRowIndex }
}

function buildFallbackHeaderMap(
  columns: SpreadsheetColumn[],
  sheetData: Record<string, unknown>[]
): Map<string, string> {
  if (sheetData.length === 0) return new Map<string, string>()
  const first = sheetData[0]
  if (!first || typeof first !== 'object') return new Map<string, string>()

  const map = new Map<string, string>()
  for (const col of columns) {
    const raw = first[col.name] ?? first[col.id] ?? (col.label ? first[col.label] : undefined)
    const obj = raw != null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
    const value = obj ? (obj.v ?? obj.m ?? raw) : raw
    const label = value != null && value !== '' ? String(value).trim() : ''
    if (label) map.set(col.name, label)
  }
  return map
}

function toggleSelection(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter(name => name !== value) : [...values, value]
}

function getRatioBarClass(ratio: number): string {
  if (ratio >= 60) return 'gba:bg-success'
  if (ratio >= 30) return 'gba:bg-primary'
  return 'gba:bg-warning'
}

function resolveHeaderSource(
  gridHeaderMap: Map<string, string> | null,
  detectedHeaderMap: Map<string, string>,
  detectedHeaderRowIndex: number,
  fallbackHeaderMap: Map<string, string>
): { firstRowHeaderMap: Map<string, string>; headerRowIndex: number } {
  if (gridHeaderMap?.size) {
    return { firstRowHeaderMap: gridHeaderMap, headerRowIndex: 0 }
  }
  if (detectedHeaderMap.size) {
    return { firstRowHeaderMap: detectedHeaderMap, headerRowIndex: detectedHeaderRowIndex }
  }
  if (fallbackHeaderMap.size) {
    return { firstRowHeaderMap: fallbackHeaderMap, headerRowIndex: 0 }
  }
  return { firstRowHeaderMap: new Map<string, string>(), headerRowIndex: -1 }
}

function deriveAnalyticsRows(
  baseDataForAnalytics: Record<string, unknown>[],
  shouldUseFirstRowAsHeaders: boolean,
  headerRowIndex: number,
  gridSheetData: Record<string, unknown>[] | null
): Record<string, unknown>[] {
  let rows = shouldUseFirstRowAsHeaders ? baseDataForAnalytics.slice(headerRowIndex + 1) : baseDataForAnalytics
  if (rows.length === 0) {
    return shouldUseFirstRowAsHeaders ? [] : baseDataForAnalytics
  }
  if (gridSheetData) {
    rows = rows.filter(row => {
      const vals = Object.values(row)
      return vals.some(v => v != null && v !== '')
    })
  }
  if (rows.length > 0) return rows
  return shouldUseFirstRowAsHeaders ? [] : baseDataForAnalytics
}

function applySingleChartRange(
  parsed: ReturnType<typeof parseChartRange> | null,
  analyticsRows: Record<string, unknown>[],
  headerRowIndex: number
): Record<string, unknown>[] {
  if (!parsed) return analyticsRows
  const { startRow, endRow } = parsed
  const startIdx = Math.max(0, startRow - headerRowIndex - 1)
  const endIdxExclusive = endRow - headerRowIndex
  if (startIdx >= analyticsRows.length || endIdxExclusive <= 0) return analyticsRows
  return analyticsRows.slice(startIdx, Math.min(endIdxExclusive, analyticsRows.length))
}

function deriveChartAnalyticsRows(
  analyticsRows: Record<string, unknown>[],
  headerRowIndex: number,
  parsedXRange: ReturnType<typeof parseChartRange> | null,
  parsedYRange: ReturnType<typeof parseChartRange> | null
): Record<string, unknown>[] {
  if (parsedXRange && parsedYRange) {
    const xStart = Math.max(0, parsedXRange.startRow - headerRowIndex - 1)
    const xEnd = parsedXRange.endRow - headerRowIndex
    const yStart = Math.max(0, parsedYRange.startRow - headerRowIndex - 1)
    const yEnd = parsedYRange.endRow - headerRowIndex
    const startIdx = Math.max(xStart, yStart)
    const endIdxExclusive = Math.min(analyticsRows.length, Math.min(xEnd, yEnd))
    if (startIdx >= endIdxExclusive) return analyticsRows
    return analyticsRows.slice(startIdx, endIdxExclusive)
  }
  if (parsedXRange) return applySingleChartRange(parsedXRange, analyticsRows, headerRowIndex)
  if (parsedYRange) return applySingleChartRange(parsedYRange, analyticsRows, headerRowIndex)
  return analyticsRows
}

function extractChartCellValue(raw: unknown): unknown {
  if (raw == null) return raw
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>
    const value = obj.v ?? obj.m ?? obj.url ?? obj.src
    return value !== undefined ? value : raw
  }
  return raw
}

function getCellValueForChartFromRow(
  row: Record<string, unknown>,
  col: SpreadsheetColumn,
  firstRowHeaderMap: Map<string, string>
): unknown {
  const keysToTry = [col.name, col.id, col.label, firstRowHeaderMap.get(col.name)].filter(Boolean) as string[]
  for (const key of keysToTry) {
    const raw = row[key]
    if (raw !== undefined) return extractChartCellValue(raw)
  }
  const rowKeys = Object.keys(row).filter(k => !k.startsWith('_'))
  const match = rowKeys.find(
    k =>
      k === col.name ||
      k === col.id ||
      k.toLowerCase() === (col.name || '').toLowerCase() ||
      k.toLowerCase() === (col.id || '').toLowerCase() ||
      k === firstRowHeaderMap.get(col.name)
  )
  if (match) return extractChartCellValue(row[match])
  return undefined
}

function buildYRangePlaceholder(
  chartYAxis: string[],
  columns: SpreadsheetColumn[],
  analyticsRowsLength: number
): string {
  const firstYAxis = chartYAxis[0]
  if (!firstYAxis) return 'e.g. G2:G100'
  const yIdx = columns.findIndex(c => c.name === firstYAxis)
  if (yIdx < 0) return 'e.g. G2:G100'
  const colLetter = indexToExcelCol(yIdx)
  return `${colLetter}2:${colLetter}${Math.max(100, analyticsRowsLength + 10)}`
}

interface ChartPreviewProps {
  chartData: Record<string, unknown>[]
  chartXAxis: string
  chartYAxis: string[]
  chartXRange: string
  chartYRange: string
  normalizedChartRows: Record<string, unknown>[]
  chartableValueColumnNames: Set<string>
  columns: SpreadsheetColumn[]
  chartType: AnalyticsChartType
  showGrid: boolean
  showLegend: boolean
  getColumnHeader: (column: SpreadsheetColumn) => string
  t: (key: string, vars?: Record<string, unknown>) => string
}

function ChartPreview({
  chartData,
  chartXAxis,
  chartYAxis,
  chartXRange,
  chartYRange,
  normalizedChartRows,
  chartableValueColumnNames,
  columns,
  chartType,
  showGrid,
  showLegend,
  getColumnHeader,
  t
}: ChartPreviewProps): React.ReactNode {
  if (chartData.length === 0) {
    const hasAxes = chartXAxis && chartYAxis.length > 0
    const hasData = normalizedChartRows.length > 0
    return (
      <div className="gba:text-xs gba:text-muted-foreground" data-testid="chart-preview-empty">
        {!hasAxes && t('analytics-chart-preview-select-axes')}
        {hasAxes &&
          !hasData &&
          (chartXRange || chartYRange
            ? t('analytics-chart-preview-no-data-range')
            : t('analytics-chart-preview-no-data-rows'))}
        {hasAxes && hasData && t('analytics-chart-preview-extract-failed')}
      </div>
    )
  }

  const yAxesForRender = chartYAxis.filter(y => y !== chartXAxis && chartableValueColumnNames.has(y))
  const primaryY = yAxesForRender[0] ?? chartYAxis[0]

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Tooltip />
          <Pie data={chartData as any[]} dataKey={primaryY} nameKey={chartXAxis} innerRadius={50} outerRadius={82}>
            {(chartData as any[]).map((entry, index) => (
              <Cell
                key={`pie-${String(entry[chartXAxis] ?? index)}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData as any[]}>
          {showGrid && <CartesianGrid vertical={false} />}
          <XAxis dataKey={chartXAxis} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          {showLegend && <Legend />}
          {yAxesForRender.map((y, index) => {
            const col = columns.find(c => c.name === y)
            const displayName = col ? getColumnHeader(col) : y
            return (
              <Line
                key={y}
                type="monotone"
                dataKey={y}
                name={displayName}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
              />
            )
          })}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData as any[]}>
          {showGrid && <CartesianGrid vertical={false} />}
          <XAxis dataKey={chartXAxis} tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          {showLegend && <Legend />}
          {yAxesForRender.map((y, index) => {
            const col = columns.find(c => c.name === y)
            const displayName = col ? getColumnHeader(col) : y
            return (
              <Area
                key={y}
                type="monotone"
                dataKey={y}
                name={displayName}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
                fillOpacity={0.2}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'scatter') {
    const xCol = columns.find(c => c.name === chartXAxis)
    const yCol = columns.find(c => c.name === primaryY)
    const xDisplay = xCol ? getColumnHeader(xCol) : chartXAxis
    const yDisplay = yCol ? getColumnHeader(yCol) : primaryY
    return (
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart>
          {showGrid && <CartesianGrid />}
          <XAxis dataKey={chartXAxis} name={xDisplay} />
          <YAxis dataKey={primaryY} name={yDisplay} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          {showLegend && <Legend />}
          <Scatter data={chartData as any[]} fill={CHART_COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData as any[]}>
        {showGrid && <CartesianGrid vertical={false} />}
        <XAxis dataKey={chartXAxis} tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} />
        <Tooltip />
        {showLegend && <Legend />}
        {yAxesForRender.map((y, index) => {
          const col = columns.find(c => c.name === y)
          const displayName = col ? getColumnHeader(col) : y
          return (
            <Bar
              key={y}
              dataKey={y}
              name={displayName}
              fill={CHART_COLORS[index % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          )
        })}
      </BarChart>
    </ResponsiveContainer>
  )
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = memo(function AnalyticsPanel({
  isOpen,
  onClose,
  initialTab = 'charts',
  columns,
  sheetData,
  sheetName,
  sheetId,
  accessToken,
  canEdit,
  onInsertRows,
  getHeaderRowFromGrid,
  getSheetDataFromGrid,
  'data-testid': testId = 'analytics-panel'
}) {
  const { t, locale } = useTranslation(translations)
  const spreadsheetPromptClient = useSpreadsheetPromptManagerClient(accessToken)
  const memoizedEngineRef = useRef(createAnalyticsMemo())
  const [activeTab, setActiveTab] = useState('charts')
  const panelTitle = useMemo(() => {
    switch (activeTab) {
      case 'charts':
        return t('analytics-panel-title-generate-charts')
      case 'insights':
        return t('analytics-panel-title-ai-insights')
      case 'summary':
        return t('analytics-panel-title-ai-summary')
      case 'pivot':
        return t('analytics-panel-title-pivot-table')
      default:
        return t('menu-ai-analytics')
    }
  }, [activeTab, t])
  const showTabs = initialTab !== 'charts'
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [initialTab, isOpen])

  const [aggregation, setAggregation] = useState<AnalyticsAggregation>('count')

  const [pivotRowField, setPivotRowField] = useState<string>(columns[0]?.name ?? '')
  const [pivotColumnField, setPivotColumnField] = useState<string>('')
  const [pivotValueField, setPivotValueField] = useState<string>('')
  const [pivotRows, setPivotRows] = useState<Array<Record<string, unknown>>>([])
  const [isPivotReady, setIsPivotReady] = useState(false)
  const [isInsertingPivot, setIsInsertingPivot] = useState(false)

  const [chartType, setChartType] = useState<AnalyticsChartType>('line')
  const [chartXAxis, setChartXAxis] = useState<string>(columns[0]?.name ?? '')
  const [chartYAxis, setChartYAxis] = useState<string[]>([])
  const [chartAggregation, setChartAggregation] = useState<AnalyticsAggregation>('sum')
  const [showLegend, setShowLegend] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [chartXRange, setChartXRange] = useState<string>('')
  const [chartYRange, setChartYRange] = useState<string>('')
  const [chartRefreshKey, setChartRefreshKey] = useState(0)
  const [sendToSlidesDialogOpen, setSendToSlidesDialogOpen] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement | null>(null)

  const numericColumns = useMemo(() => columns.filter(isNumericColumn), [columns])
  const hasGenericColumnNames = useMemo(() => {
    if (columns.length === 0) return false
    const genericCount = columns.filter(column => isGenericColumnToken(column.name)).length
    return genericCount / columns.length >= 0.5
  }, [columns])

  const detectedHeaderInfo = useMemo(() => {
    return detectHeaderInfo(columns, sheetData, hasGenericColumnNames)
  }, [columns, hasGenericColumnNames, sheetData])

  const gridHeaderMap = isOpen ? (getHeaderRowFromGrid?.() ?? null) : null
  const gridSheetData = isOpen ? (getSheetDataFromGrid?.() ?? null) : null
  const detectedHeaderMap = detectedHeaderInfo.headerMap
  const fallbackHeaderMap = useMemo(() => {
    return buildFallbackHeaderMap(columns, sheetData)
  }, [columns, sheetData])
  const { firstRowHeaderMap, headerRowIndex } = resolveHeaderSource(
    gridHeaderMap,
    detectedHeaderMap,
    detectedHeaderInfo.headerRowIndex,
    fallbackHeaderMap
  )
  const shouldUseFirstRowAsHeaders = firstRowHeaderMap.size > 0 && headerRowIndex >= 0

  const baseDataForAnalytics = gridSheetData ?? sheetData
  const analyticsRows = useMemo(() => {
    return deriveAnalyticsRows(baseDataForAnalytics, shouldUseFirstRowAsHeaders, headerRowIndex, gridSheetData)
  }, [baseDataForAnalytics, headerRowIndex, shouldUseFirstRowAsHeaders, gridSheetData])

  const getDefaultRangeForColumn = useCallback(
    (colName: string): string => {
      const idx = columns.findIndex(c => c.name === colName)
      if (idx < 0) return ''
      const colLetter = indexToExcelCol(idx)
      const maxRow = Math.max(500, analyticsRows.length + 10)
      return `${colLetter}2:${colLetter}${maxRow}`
    },
    [columns, analyticsRows.length]
  )

  const parsedXRange = useMemo(() => parseChartRange(chartXRange), [chartXRange])
  const parsedYRange = useMemo(() => parseChartRange(chartYRange), [chartYRange])

  const chartAnalyticsRows = useMemo(() => {
    return deriveChartAnalyticsRows(analyticsRows, headerRowIndex, parsedXRange, parsedYRange)
  }, [analyticsRows, headerRowIndex, parsedXRange, parsedYRange])

  const chartableValueColumns = useMemo(
    () => getChartableValueColumns(columns, analyticsRows),
    [columns, analyticsRows]
  )
  const chartAxisColumns = useMemo(
    () =>
      columns.filter(column =>
        analyticsRows.some(row => {
          const value = getCellValueForChartFromRow(row, column, firstRowHeaderMap)
          return extractDisplayValue(value).length > 0
        })
      ),
    [analyticsRows, columns, firstRowHeaderMap]
  )
  const chartableValueColumnNames = useMemo(
    () => new Set(chartableValueColumns.map(column => column.name)),
    [chartableValueColumns]
  )

  const columnsForAnalytics = useMemo(
    () =>
      columns.map(column => ({
        ...column,
        label: firstRowHeaderMap.get(column.name) || column.label
      })),
    [columns, firstRowHeaderMap]
  )

  const getColumnHeader = (column: SpreadsheetColumn) =>
    firstRowHeaderMap.get(column.name) || column.label || column.name || column.id

  const handleToggleChartYAxis = useCallback(
    (columnName: string) => {
      setChartYAxis(current => toggleSelection(current, columnName))
    },
    [setChartYAxis]
  )

  useEffect(() => {
    memoizedEngineRef.current.clear()
    setPivotRows([])
    setIsPivotReady(false)
  }, [sheetId, analyticsRows.length])

  useEffect(() => {
    if (!chartAxisColumns.length) {
      if (chartXAxis) setChartXAxis('')
      return
    }
    if (!chartAxisColumns.some(column => column.name === chartXAxis)) {
      setChartXAxis(chartAxisColumns[0].name)
    }
  }, [chartAxisColumns, chartXAxis])

  useEffect(() => {
    if (chartableValueColumns.length > 0 && chartYAxis.length === 0) {
      const firstNonXAxis = chartableValueColumns.find(column => column.name !== chartXAxis)
      if (firstNonXAxis) {
        setChartYAxis([firstNonXAxis.name])
      }
    }
    if (numericColumns.length > 0 && !pivotValueField) {
      setPivotValueField(numericColumns[0].name)
    }
  }, [chartXAxis, chartYAxis.length, chartableValueColumns, numericColumns, pivotValueField])

  useEffect(() => {
    if (chartXAxis && chartYAxis.includes(chartXAxis)) {
      setChartYAxis(prev => prev.filter(y => y !== chartXAxis))
    }
  }, [chartXAxis, chartYAxis])

  useEffect(() => {
    setChartYAxis(prev => {
      const normalized = prev.filter(y => y !== chartXAxis && chartableValueColumnNames.has(y))
      return normalized.length === prev.length ? prev : normalized
    })
  }, [chartXAxis, chartableValueColumnNames])

  useEffect(() => {
    if (chartXAxis) {
      const def = getDefaultRangeForColumn(chartXAxis)
      setChartXRange(prev => prev || def)
    }
  }, [chartXAxis, getDefaultRangeForColumn])

  useEffect(() => {
    if (chartYAxis.length > 0) {
      const firstY = chartYAxis[0]
      const idx = columns.findIndex(c => c.name === firstY)
      if (idx >= 0) {
        const colLetter = indexToExcelCol(idx)
        const maxRow = Math.max(500, analyticsRows.length + 10)
        const def = `${colLetter}2:${colLetter}${maxRow}`
        setChartYRange(prev => prev || def)
      }
    }
  }, [chartYAxis, columns, analyticsRows.length])

  const canComputePivot = Boolean(pivotRowField && (aggregation === 'count' || pivotValueField))
  const canInsertPivot = isPivotReady && pivotRows.length > 0 && canEdit

  const chartTitle = useMemo(() => {
    if (!chartXAxis || chartYAxis.length === 0) return ''
    const yForTitle = chartYAxis.filter(y => y !== chartXAxis)
    const yLabels = yForTitle.map(y => {
      const col = columns.find(c => c.name === y)
      return col ? firstRowHeaderMap.get(col.name) || col.label || col.name : y
    })
    const xCol = columns.find(c => c.name === chartXAxis)
    const xLabel = xCol ? firstRowHeaderMap.get(xCol.name) || xCol.label || xCol.name : chartXAxis
    return yLabels.length > 0
      ? t('analytics-chart-title-by-axis', { yLabels: yLabels.join(', '), xLabel })
      : t('analytics-chart-title-values-by-axis', { xLabel })
  }, [chartXAxis, chartYAxis, columns, firstRowHeaderMap, t])

  const getChartAsPngDataUrl = useCallback(async (): Promise<string | null> => {
    const container = chartContainerRef.current
    if (!container) return null
    const chartEl = container
    try {
      const rect = chartEl.getBoundingClientRect()
      const exportWidth = Math.max(1, Math.ceil(rect.width))
      const exportHeight = Math.max(1, Math.ceil(rect.height))

      return await toPng(chartEl, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        width: exportWidth,
        height: exportHeight,
        filter: node => {
          if (!(node instanceof HTMLElement)) return true
          return !node.classList.contains('recharts-tooltip-wrapper')
        }
      })
    } catch (err) {
      console.error('[AnalyticsPanel] PNG export failed:', err)
      return null
    }
  }, [])

  const handleDownloadChartPng = useCallback(async () => {
    const pngUrl = await getChartAsPngDataUrl()
    if (!pngUrl) return
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = `chart-${Date.now()}.png`
    a.click()
  }, [getChartAsPngDataUrl])

  const getCellValueForChart = useCallback(
    (row: Record<string, unknown>, col: SpreadsheetColumn): unknown => {
      return getCellValueForChartFromRow(row, col, firstRowHeaderMap)
    },
    [firstRowHeaderMap]
  )

  const normalizedChartRows = useMemo(() => {
    return chartAnalyticsRows.map(row => {
      const out: Record<string, unknown> = {}
      for (const col of columns) {
        const v = getCellValueForChart(row, col)
        if (v !== undefined) out[col.name] = v
      }
      return out
    })
  }, [chartAnalyticsRows, columns, getCellValueForChart])

  const chartData = useMemo(() => {
    if (!chartXAxis || chartYAxis.length === 0) return []
    const yAxes = chartYAxis.filter(y => y !== chartXAxis && chartableValueColumnNames.has(y))
    if (yAxes.length === 0) return []
    const request = { xAxis: chartXAxis, yAxes, aggregation: chartAggregation, chartType }

    const cacheKey = JSON.stringify({
      sheetId,
      chartType,
      chartXAxis,
      yAxes,
      chartAggregation,
      chartXRange,
      chartYRange,
      dataSize: normalizedChartRows.length,
      chartRefreshKey
    })
    return memoizedEngineRef.current.computeChart(cacheKey, normalizedChartRows, request).rows
  }, [
    chartAggregation,
    chartRefreshKey,
    chartType,
    chartXAxis,
    chartXRange,
    chartYAxis,
    chartYRange,
    chartableValueColumnNames,
    normalizedChartRows,
    sheetId,
    gridSheetData
  ])

  const {
    insights,
    summary,
    insightsError,
    summaryError,
    isLoadingInsights,
    isLoadingSummary,
    generateInsights,
    generateSummary
  } = useSpreadsheetAnalyticsAI({
    promptClient: spreadsheetPromptClient,
    sheetName,
    columns: columnsForAnalytics,
    sheetData: analyticsRows,
    locale
  })

  const pivotPreviewColumns = useMemo(() => {
    if (pivotRows.length === 0) return []
    const first = pivotRows[0]
    return Object.keys(first)
  }, [pivotRows])

  if (!isOpen) return null

  const yRangePlaceholder = buildYRangePlaceholder(chartYAxis, columns, analyticsRows.length)

  const handleComputePivot = () => {
    if (!canComputePivot) return
    const cacheKey = JSON.stringify({
      sheetId,
      pivotRowField,
      pivotColumnField,
      pivotValueField,
      aggregation,
      dataSize: analyticsRows.length
    })
    const result = memoizedEngineRef.current.computePivot(cacheKey, analyticsRows, {
      rowField: pivotRowField,
      columnField: pivotColumnField || undefined,
      valueField: pivotValueField || undefined,
      aggregation
    })
    setPivotRows(result.rows)
    setIsPivotReady(true)
  }

  const handleInsertPivotRows = async () => {
    if (!canInsertPivot) return
    setIsInsertingPivot(true)
    try {
      await onInsertRows(pivotRows)
    } finally {
      setIsInsertingPivot(false)
    }
  }

  const copyText = async (text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return
    await navigator.clipboard.writeText(text)
  }

  return createPortal(
    <div className="gba:fixed gba:inset-0" style={{ zIndex: 999999 }} data-testid={testId}>
      <div
        className="gba:absolute gba:inset-0 gba:bg-transparent"
        role="button"
        tabIndex={0}
        aria-label={t('analytics-close-panel-aria')}
        onClick={onClose}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') onClose()
        }}
        style={{ zIndex: 999999 }}
      />
      <div
        className="gba:fixed gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:overflow-hidden gba:flex gba:flex-col"
        style={{
          top: 100,
          right: 16,
          bottom: 32,
          width: 380,
          maxWidth: '95vw',
          zIndex: 1000000,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)'
        }}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:w-7 gba:h-7 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <BarChart3 className="gba:h-4 gba:w-4 gba:text-primary" />
            </div>
            <div>
              <h2 className="gba:font-semibold gba:text-sm">{panelTitle}</h2>
              <p className="gba:text-xs gba:text-muted-foreground">
                {t('analytics-rows-cols', { rows: analyticsRows.length, cols: columns.length })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full hover:gba:bg-muted"
          >
            <X className="gba:w-4 gba:h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0">
          {showTabs && (
            <div className="gba:flex gba:gap-1 gba:p-1 gba:bg-muted/30">
              <TabsList className="gba:w-full gba:h-auto gba:bg-transparent gba:p-0 gba:gap-1">
                <TabsTrigger
                  value="charts"
                  className="gba:flex-1 gba:rounded-lg gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:transition-all data-[state=active]:gba:bg-background data-[state=active]:gba:text-foreground data-[state=active]:gba:shadow-sm data-[state=inactive]:gba:text-muted-foreground data-[state=inactive]:hover:gba:text-foreground data-[state=inactive]:hover:gba:bg-background/50"
                >
                  {t('analytics-tab-charts')}
                </TabsTrigger>
                <TabsTrigger
                  value="insights"
                  className="gba:flex-1 gba:rounded-lg gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:transition-all data-[state=active]:gba:bg-background data-[state=active]:gba:text-foreground data-[state=active]:gba:shadow-sm data-[state=inactive]:gba:text-muted-foreground data-[state=inactive]:hover:gba:text-foreground data-[state=inactive]:hover:gba:bg-background/50"
                >
                  {t('analytics-tab-insights')}
                </TabsTrigger>
                <TabsTrigger
                  value="summary"
                  className="gba:flex-1 gba:rounded-lg gba:px-3 gba:py-1.5 gba:text-sm gba:font-medium gba:transition-all data-[state=active]:gba:bg-background data-[state=active]:gba:text-foreground data-[state=active]:gba:shadow-sm data-[state=inactive]:gba:text-muted-foreground data-[state=inactive]:hover:gba:text-foreground data-[state=inactive]:hover:gba:bg-background/50"
                >
                  {t('analytics-tab-summary')}
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          <div className="gba:flex-1 gba:overflow-auto gba:p-3">
            <TabsContent value="pivot" className="gba:space-y-4">
              <div className="gba:grid gba:grid-cols-1 gba:gap-3">
                <label className="gba:text-xs gba:text-muted-foreground">
                  {t('analytics-pivot-row-fields')}
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={pivotRowField}
                    onChange={e => setPivotRowField(e.target.value)}
                  >
                    {chartAxisColumns.map(col => (
                      <option key={col.id} value={col.name}>
                        {getColumnHeader(col)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  {t('analytics-pivot-column-fields')}
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={pivotColumnField}
                    onChange={e => setPivotColumnField(e.target.value)}
                  >
                    <option value="">{t('analytics-option-none')}</option>
                    {columns.map(col => (
                      <option key={col.id} value={col.name}>
                        {getColumnHeader(col)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  {t('analytics-pivot-value-fields')}
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={pivotValueField}
                    onChange={e => setPivotValueField(e.target.value)}
                    disabled={aggregation === 'count'}
                  >
                    <option value="">{t('analytics-option-none')}</option>
                    {numericColumns.map(col => (
                      <option key={col.id} value={col.name}>
                        {getColumnHeader(col)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  {t('analytics-aggregation')}
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={aggregation}
                    onChange={e => setAggregation(e.target.value as AnalyticsAggregation)}
                  >
                    <option value="count">{t('analytics-aggregation-count')}</option>
                    <option value="sum">{t('analytics-aggregation-sum')}</option>
                    <option value="avg">{t('analytics-aggregation-avg')}</option>
                    <option value="min">{t('analytics-aggregation-min')}</option>
                    <option value="max">{t('analytics-aggregation-max')}</option>
                  </select>
                </label>
              </div>

              <Button className="gba:w-full" onClick={handleComputePivot} disabled={!canComputePivot}>
                {t('analytics-compute-pivot')}
              </Button>

              {pivotRows.length > 0 && (
                <div className="gba:border gba:border-border/50 gba:rounded-md gba:overflow-auto">
                  <table className="gba:w-full gba:text-xs">
                    <thead className="gba:bg-muted/40">
                      <tr>
                        {pivotPreviewColumns.map(column => (
                          <th key={column} className="gba:text-left gba:px-2.5 gba:py-2 gba:font-medium">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pivotRows.slice(0, 40).map((row, rowIdx) => (
                        <tr
                          key={`pivot-${String(row[pivotPreviewColumns[0]] ?? rowIdx)}`}
                          className="gba:border-t gba:border-border/40"
                        >
                          {pivotPreviewColumns.map(column => (
                            <td key={column} className="gba:px-2.5 gba:py-1.5">
                              {String(row[column] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="charts" className="gba:space-y-5">
              <div className="gba:border gba:border-primary/20 gba:bg-primary/5 gba:rounded-md gba:p-3.5">
                <p className="gba:text-xs gba:leading-relaxed gba:text-primary">{t('analytics-chart-description')}</p>
              </div>

              <div className="gba:grid gba:grid-cols-1 gba:gap-4">
                <label className="gba:text-[11px] gba:leading-relaxed gba:text-muted-foreground">
                  {t('analytics-chart-type')}
                  <div className="gba:mt-1 gba:grid gba:grid-cols-5 gba:gap-1">
                    {(['bar', 'line', 'pie', 'area', 'scatter'] as const).map(type => (
                      <Button
                        key={type}
                        variant={chartType === type ? 'default' : 'secondary'}
                        size="sm"
                        className="gba:h-8 gba:px-2 gba:text-[11px]"
                        onClick={() => setChartType(type)}
                      >
                        {t(`analytics-chart-type-${type}`)}
                      </Button>
                    ))}
                  </div>
                </label>

                <label className="gba:text-[11px] gba:leading-relaxed gba:text-muted-foreground">
                  {t('analytics-x-axis-categories')}
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={chartXAxis}
                    onChange={e => setChartXAxis(e.target.value)}
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.name}>
                        {getColumnHeader(col)}
                      </option>
                    ))}
                  </select>
                  <div className="gba:mt-1 gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-xs gba:text-muted-foreground/80">{t('analytics-range-label')}</span>
                    <input
                      type="text"
                      placeholder={getDefaultRangeForColumn(chartXAxis) || t('analytics-range-placeholder-x')}
                      className="gba:flex-1 gba:min-w-0 gba:h-8 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-2.5 gba:text-sm gba:font-mono"
                      value={chartXRange}
                      onChange={e => setChartXRange(e.target.value)}
                      data-testid="chart-x-range"
                    />
                  </div>
                </label>

                <label className="gba:text-[11px] gba:leading-relaxed gba:text-muted-foreground">
                  {t('analytics-y-axis-values')}
                  <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-1">
                    {chartableValueColumns.length > 0 ? (
                      chartableValueColumns
                        .filter(col => col.name !== chartXAxis)
                        .map(col => {
                          const active = chartYAxis.includes(col.name)
                          return (
                            <Button
                              key={col.id}
                              variant={active ? 'default' : 'secondary'}
                              size="sm"
                              className="gba:h-8 gba:px-2 gba:text-[11px]"
                              onClick={() => handleToggleChartYAxis(col.name)}
                            >
                              {getColumnHeader(col)}
                            </Button>
                          )
                        })
                    ) : (
                      <span className="gba:text-xs gba:text-muted-foreground">{t('analytics-no-value-columns')}</span>
                    )}
                  </div>
                  <div className="gba:mt-1 gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-xs gba:text-muted-foreground/80">{t('analytics-range-label')}</span>
                    <input
                      type="text"
                      placeholder={yRangePlaceholder}
                      className="gba:flex-1 gba:min-w-0 gba:h-8 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-2.5 gba:text-sm gba:font-mono"
                      value={chartYRange}
                      onChange={e => setChartYRange(e.target.value)}
                      data-testid="chart-y-range"
                    />
                  </div>
                </label>

                <label className="gba:text-[11px] gba:leading-relaxed gba:text-muted-foreground">
                  {t('analytics-aggregation')}
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={chartAggregation}
                    onChange={e => setChartAggregation(e.target.value as AnalyticsAggregation)}
                  >
                    <option value="sum">{t('analytics-aggregation-sum')}</option>
                    <option value="avg">{t('analytics-aggregation-avg')}</option>
                    <option value="count">{t('analytics-aggregation-count')}</option>
                    <option value="min">{t('analytics-aggregation-min')}</option>
                    <option value="max">{t('analytics-aggregation-max')}</option>
                  </select>
                </label>

                <div className="gba:space-y-2">
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:cursor-pointer">
                      <Checkbox checked={showLegend} onCheckedChange={v => setShowLegend(v === true)} />
                      {t('analytics-legend')}
                    </label>
                    <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:cursor-pointer">
                      <Checkbox checked={showGrid} onCheckedChange={v => setShowGrid(v === true)} />
                      {t('analytics-grid')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="gba:relative">
                <Button
                  variant="secondary"
                  size="icon"
                  className="gba:absolute gba:top-2 gba:right-2 gba:z-10 gba:rounded-full"
                  onClick={() => {
                    memoizedEngineRef.current.clear()
                    setChartRefreshKey(k => k + 1)
                  }}
                  aria-label={t('analytics-refresh-chart-aria')}
                >
                  <RefreshCw className="gba:w-4 gba:h-4" />
                </Button>
                <div
                  ref={chartContainerRef}
                  className="gba:border gba:border-primary/20 gba:bg-primary/5 gba:rounded-md gba:p-3"
                >
                  {chartTitle && (
                    <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3 gba:text-center">
                      {chartTitle}
                    </h3>
                  )}
                  <div data-chart-export-target className="gba:w-full">
                    <ChartPreview
                      chartData={chartData}
                      chartXAxis={chartXAxis}
                      chartYAxis={chartYAxis}
                      chartXRange={chartXRange}
                      chartYRange={chartYRange}
                      normalizedChartRows={normalizedChartRows}
                      chartableValueColumnNames={chartableValueColumnNames}
                      columns={columns}
                      chartType={chartType}
                      showGrid={showGrid}
                      showLegend={showLegend}
                      getColumnHeader={getColumnHeader}
                      t={t}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button onClick={() => void generateInsights()} disabled={isLoadingInsights} className="gba:flex-1">
                  <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                  {isLoadingInsights ? t('analytics-generating') : t('analytics-panel-title-ai-insights')}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => void copyText(insights.join('\n'))}
                  disabled={insights.length === 0}
                >
                  <Copy className="gba:w-4 gba:h-4" />
                </Button>
              </div>

              {insightsError && (
                <p className="gba:text-xs gba:text-warning-foreground gba:bg-warning/10 gba:border gba:border-warning/30 gba:rounded-md gba:p-2">
                  {t('analytics-using-local-fallback', { error: insightsError })}
                </p>
              )}
              <div className="gba:space-y-2">
                {insights.length > 0 ? (
                  insights.map(item => (
                    <div
                      key={item.slice(0, 60)}
                      className="gba:text-sm gba:p-3 gba:rounded-md gba:bg-success/5 gba:border gba:border-success/20"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="gba:border gba:border-secondary/30 gba:bg-secondary/5 gba:rounded-md gba:p-3">
                    <p className="gba:text-xs gba:text-muted-foreground">{t('analytics-insights-empty')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button onClick={() => void generateSummary()} disabled={isLoadingSummary} className="gba:flex-1">
                  <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                  {isLoadingSummary ? t('analytics-generating') : t('analytics-summary-button')}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={() => void copyText(summary?.overview ?? '')}
                  disabled={!summary}
                >
                  <Copy className="gba:w-4 gba:h-4" />
                </Button>
              </div>

              {summaryError && (
                <p className="gba:text-xs gba:text-warning-foreground gba:bg-warning/10 gba:border gba:border-warning/30 gba:rounded-md gba:p-2">
                  {t('analytics-using-local-fallback', { error: summaryError })}
                </p>
              )}
              {summary ? (
                <div className="gba:space-y-3">
                  <div className="gba:border gba:border-primary/20 gba:bg-primary/5 gba:rounded-md gba:p-3">
                    <p className="gba:text-sm gba:text-foreground">{summary.overview}</p>
                  </div>
                  {summary.cards.map(card => (
                    <div
                      key={card.columnName}
                      className="gba:border gba:border-secondary/30 gba:bg-secondary/5 gba:rounded-md gba:p-3 gba:space-y-2"
                    >
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <h4 className="gba:text-sm gba:font-medium">{card.columnName}</h4>
                        <span className="gba:text-xs gba:text-muted-foreground">
                          {t('analytics-card-count-unique', { count: card.count, unique: card.unique })}
                        </span>
                      </div>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {t('analytics-card-mode', { mode: card.mode })}
                      </p>
                      <div className="gba:space-y-1">
                        {card.topValues.slice(0, 4).map(item => {
                          const ratio = card.count > 0 ? (item.count / card.count) * 100 : 0
                          return (
                            <div key={`${card.columnName}-${item.label}`} className="gba:space-y-1">
                              <div className="gba:flex gba:items-center gba:justify-between gba:text-xs">
                                <span className="gba:truncate">{item.label}</span>
                                <span>{item.count}</span>
                              </div>
                              <div className="gba:h-1.5 gba:bg-muted gba:rounded">
                                <div
                                  className={`gba:h-1.5 gba:rounded ${getRatioBarClass(ratio)}`}
                                  style={{ width: `${Math.min(100, ratio)}%` }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="gba:text-xs gba:text-muted-foreground">{t('analytics-summary-empty')}</p>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="gba:px-5 gba:py-3 gba:border-t gba:border-border/40 gba:bg-background/95">
          {activeTab === 'pivot' && (
            <Button
              className="gba:w-full"
              onClick={() => void handleInsertPivotRows()}
              disabled={!canInsertPivot || isInsertingPivot}
            >
              {isInsertingPivot ? t('analytics-inserting') : t('analytics-insert-into-sheet')}
            </Button>
          )}
          {activeTab === 'charts' && (
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="gba:flex-1"
                onClick={() => void handleDownloadChartPng()}
                disabled={chartData.length === 0}
              >
                <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('analytics-download-png')}
              </Button>
              <Button
                size="sm"
                className="gba:flex-1"
                onClick={() => setSendToSlidesDialogOpen(true)}
                disabled={chartData.length === 0}
              >
                <Presentation className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('analytics-send-to-slides')}
              </Button>
            </div>
          )}
        </div>
      </div>
      <SendToSlidesDialog
        open={sendToSlidesDialogOpen}
        onOpenChange={setSendToSlidesDialogOpen}
        accessToken={accessToken}
        getChartPngDataUrl={getChartAsPngDataUrl}
      />
    </div>,
    document.body
  )
})
