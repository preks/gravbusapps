import React, { memo, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button, Checkbox, Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { BarChart3, X, Sparkles, Copy, RefreshCw, Download, Presentation } from 'lucide-react'
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
import { SendToSlidesDialog } from './SendToSlidesDialog'

const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)'
]

/** Resolve CSS variable to hex/rgb for PNG export (canvas can't use CSS vars) */
function resolveChartColor(index: number): string {
  if (typeof document === 'undefined') return `hsl(${(index * 72) % 360}, 70%, 50%)`
  const varName = `--nw-chart-${(index % 5) + 1}`
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  if (value) return value
  const fallbacks = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
  return fallbacks[index % fallbacks.length]
}

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
  const memoizedEngineRef = useRef(createAnalyticsMemo())
  const [activeTab, setActiveTab] = useState('charts')
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
  const [chartColorPalette, setChartColorPalette] = useState<'newwork-brand'>('newwork-brand')
  const [chartAggregation, setChartAggregation] = useState<AnalyticsAggregation>('sum')
  const [showLegend, setShowLegend] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [chartXRange, setChartXRange] = useState<string>('')
  const [chartYRange, setChartYRange] = useState<string>('')
  const [chartRefreshKey, setChartRefreshKey] = useState(0)
  const [sendToSlidesDialogOpen, setSendToSlidesDialogOpen] = useState(false)
  const chartContainerRef = useRef<HTMLDivElement | null>(null)

  const numericColumns = useMemo(() => columns.filter(isNumericColumn), [columns])
  const isGenericColumnToken = (value: string) => /^column(?:[_\s-]?[a-z0-9]+)?$/i.test(value.trim())
  const hasGenericColumnNames = useMemo(() => {
    if (columns.length === 0) return false
    const genericCount = columns.filter(column => isGenericColumnToken(column.name)).length
    return genericCount / columns.length >= 0.5
  }, [columns])

  const extractDisplayValue = (raw: unknown): string => {
    if (raw == null || raw === '') return ''
    if (typeof raw === 'string') return raw.trim()
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>
      const v = obj.v ?? obj.m ?? obj.url ?? obj.src
      if (typeof v === 'string') return v.trim()
      if (typeof v === 'number' && Number.isFinite(v)) return String(v)
    }
    return String(raw).trim()
  }

  const getRowCellValue = (row: Record<string, unknown>, column: SpreadsheetColumn) =>
    row[column.name] ?? row[column.id] ?? row[column.label]

  const detectedHeaderInfo = useMemo(() => {
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
  }, [columns, hasGenericColumnNames, sheetData])

  const gridHeaderMap = isOpen && getHeaderRowFromGrid ? getHeaderRowFromGrid() : null
  const gridSheetData = isOpen && getSheetDataFromGrid ? getSheetDataFromGrid() : null
  const detectedHeaderMap = detectedHeaderInfo.headerMap
  const fallbackHeaderMap = useMemo(() => {
    if (sheetData.length === 0) return new Map<string, string>()
    const first = sheetData[0]
    if (!first || typeof first !== 'object') return new Map<string, string>()
    const map = new Map<string, string>()
    for (const col of columns) {
      const raw =
        first[col.name] ?? first[col.id] ?? (first as Record<string, unknown>)[(col as { label?: string }).label]
      const v =
        raw != null && typeof raw === 'object' && !Array.isArray(raw)
          ? ((raw as Record<string, unknown>).v ?? (raw as Record<string, unknown>).m ?? raw)
          : raw
      const label = v != null && v !== '' ? String(v).trim() : ''
      if (label) map.set(col.name, label)
    }
    return map
  }, [columns, sheetData])
  const firstRowHeaderMap =
    (gridHeaderMap?.size ? gridHeaderMap : null) ??
    (detectedHeaderMap.size ? detectedHeaderMap : null) ??
    (fallbackHeaderMap.size ? fallbackHeaderMap : new Map<string, string>())
  const headerRowIndex = gridHeaderMap?.size
    ? 0
    : detectedHeaderMap.size
      ? detectedHeaderInfo.headerRowIndex
      : fallbackHeaderMap.size
        ? 0
        : -1
  const shouldUseFirstRowAsHeaders = firstRowHeaderMap.size > 0 && headerRowIndex >= 0

  const baseDataForAnalytics = gridSheetData ?? sheetData
  const analyticsRows = useMemo(() => {
    let rows = shouldUseFirstRowAsHeaders ? baseDataForAnalytics.slice((headerRowIndex ?? 0) + 1) : baseDataForAnalytics
    if (rows.length === 0 && shouldUseFirstRowAsHeaders) return []
    if (rows.length === 0) return baseDataForAnalytics
    if (gridSheetData) {
      rows = rows.filter(row => {
        const vals = Object.values(row)
        return vals.some(v => v != null && v !== '')
      })
    }
    return rows.length > 0 ? rows : shouldUseFirstRowAsHeaders ? [] : baseDataForAnalytics
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
    const headerRow = headerRowIndex ?? 0

    const applyRange = (parsed: ReturnType<typeof parseChartRange>) => {
      if (!parsed) return analyticsRows
      const { startRow, endRow } = parsed
      const startIdx = Math.max(0, startRow - headerRow - 1)
      const endIdxExclusive = endRow - headerRow
      if (startIdx >= analyticsRows.length || endIdxExclusive <= 0) return analyticsRows
      return analyticsRows.slice(startIdx, Math.min(endIdxExclusive, analyticsRows.length))
    }

    if (parsedXRange && parsedYRange) {
      const xStart = Math.max(0, parsedXRange.startRow - headerRow - 1)
      const xEnd = parsedXRange.endRow - headerRow
      const yStart = Math.max(0, parsedYRange.startRow - headerRow - 1)
      const yEnd = parsedYRange.endRow - headerRow
      const startIdx = Math.max(xStart, yStart)
      const endIdxExclusive = Math.min(analyticsRows.length, Math.min(xEnd, yEnd))
      if (startIdx >= endIdxExclusive) return analyticsRows
      return analyticsRows.slice(startIdx, endIdxExclusive)
    }
    if (parsedXRange) return applyRange(parsedXRange)
    if (parsedYRange) return applyRange(parsedYRange)
    return analyticsRows
  }, [analyticsRows, headerRowIndex, parsedXRange, parsedYRange])

  const chartableValueColumns = useMemo(
    () => getChartableValueColumns(columns, analyticsRows),
    [columns, analyticsRows]
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

  useEffect(() => {
    memoizedEngineRef.current.clear()
    setPivotRows([])
    setIsPivotReady(false)
  }, [sheetId, analyticsRows.length])

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
    return yLabels.length > 0 ? `${yLabels.join(', ')} by ${xLabel}` : `Values by ${xLabel}`
  }, [chartXAxis, chartYAxis, columns, firstRowHeaderMap])

  const getChartAsPngDataUrl = useCallback(async (): Promise<string | null> => {
    const container = chartContainerRef.current
    if (!container) return null
    const chartEl = container.querySelector('[data-chart-export-target]') ?? container
    const allSvg = Array.from(chartEl.querySelectorAll('svg')).filter(
      (el): el is SVGElement => el instanceof SVGElement
    )
    let svg = allSvg.reduce<SVGElement | null>((best, el) => {
      const n = el.querySelectorAll('path, line, rect, circle, text').length
      const r = el.getBoundingClientRect()
      if (r.width < 50 || r.height < 50) return best
      if (!best) return el
      const bestN = best.querySelectorAll('path, line, rect, circle, text').length
      return n >= bestN ? el : best
    }, null)
    if (!svg && allSvg.length > 0) svg = allSvg[0]
    if (!svg) return null
    try {
      const clonedSvg = svg.cloneNode(true) as SVGElement
      const rect = svg.getBoundingClientRect()
      const w = Math.max(800, Math.round(rect.width))
      const h = Math.max(400, Math.round(rect.height))
      const viewBox = clonedSvg.getAttribute('viewBox')
      clonedSvg.setAttribute('width', String(w))
      clonedSvg.setAttribute('height', String(h))
      if (!viewBox) clonedSvg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`)
      if (!clonedSvg.getAttribute('xmlns')) clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      let svgData = new XMLSerializer().serializeToString(clonedSvg)
      svgData = svgData.replace(/var\(--nw-chart-(\d+)\)/g, (_, n) => resolveChartColor(Number(n) - 1))
      svgData = svgData.replace(/var\(--[^)]+\)/g, '#333333')
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      canvas.width = w
      canvas.height = h
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      const img = new Image()
      const svgDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`
      return await new Promise<string | null>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = () => reject(new Error('Failed to load SVG'))
        img.src = svgDataUri
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

  const extractCellValue = (raw: unknown): unknown => {
    if (raw == null) return raw
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      const obj = raw as Record<string, unknown>
      const v = obj.v ?? obj.m ?? obj.url ?? obj.src
      return v !== undefined ? v : raw
    }
    return raw
  }

  const getCellValueForChart = useCallback(
    (row: Record<string, unknown>, col: SpreadsheetColumn): unknown => {
      const keysToTry = [col.name, col.id, (col as { label?: string }).label, firstRowHeaderMap.get(col.name)].filter(
        Boolean
      ) as string[]
      for (const key of keysToTry) {
        const raw = row[key]
        if (raw !== undefined) return extractCellValue(raw)
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
      if (match) return extractCellValue(row[match])
      return undefined
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
    accessToken,
    sheetName,
    columns: columnsForAnalytics,
    sheetData: analyticsRows
  })

  const pivotPreviewColumns = useMemo(() => {
    if (pivotRows.length === 0) return []
    const first = pivotRows[0]
    return Object.keys(first)
  }, [pivotRows])

  if (!isOpen) return null

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

  const renderChartPreview = () => {
    if (chartData.length === 0) {
      const hasAxes = chartXAxis && chartYAxis.length > 0
      const hasData = normalizedChartRows.length > 0
      return (
        <div className="gba:text-xs gba:text-muted-foreground" data-testid="chart-preview-empty">
          {!hasAxes && 'Select X and Y fields to render a chart preview.'}
          {hasAxes &&
            !hasData &&
            (chartXRange || chartYRange
              ? 'No data in the specified range. Try a different range or clear the range fields to use all data.'
              : 'No data rows available. Add data to your sheet.')}
          {hasAxes && hasData && 'Could not extract chart data. Ensure your columns contain the selected fields.'}
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
              {(chartData as any[]).map((_, index) => (
                <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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

  return createPortal(
    <div className="gba:fixed gba:inset-0" style={{ zIndex: 999999 }} data-testid={testId}>
      <div
        className="gba:absolute gba:inset-0 gba:bg-black/30 gba:backdrop-blur-[2px] gba:transition-opacity"
        onClick={onClose}
        style={{ zIndex: 999999 }}
      />
      <div
        className="gba:absolute gba:top-0 gba:right-0 gba:bottom-0 gba:w-[560px] gba:max-w-[90vw] gba:bg-background gba:border-l gba:border-border/50 gba:overflow-hidden gba:flex gba:flex-col"
        style={{ zIndex: 1000000, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-3.5 gba:border-b gba:border-border/50 gba:bg-gradient-to-r gba:from-muted/30 gba:to-transparent">
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary/20 gba:to-primary/5 gba:flex gba:items-center gba:justify-center gba:border gba:border-primary/20">
              <BarChart3 className="gba:w-4.5 gba:h-4.5 gba:text-primary" />
            </div>
            <div>
              <h2 className="gba:text-base gba:font-semibold gba:text-foreground">AI Analytics</h2>
              <p className="gba:text-xs gba:text-muted-foreground">
                {analyticsRows.length} rows x {columns.length} cols
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-muted"
          >
            <X className="gba:w-4 gba:h-4" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:flex-1 gba:flex gba:flex-col gba:min-h-0">
          <div className="gba:px-5 gba:pt-4 gba:pb-2 gba:border-b gba:border-border/40">
            <TabsList className="gba:w-full">
              <TabsTrigger value="charts" className="gba:flex-1">
                Charts
              </TabsTrigger>
              <TabsTrigger value="insights" className="gba:flex-1">
                Insights
              </TabsTrigger>
              <TabsTrigger value="summary" className="gba:flex-1">
                Summary
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="gba:flex-1 gba:overflow-auto gba:p-5">
            <TabsContent value="pivot" className="gba:space-y-4">
              <div className="gba:grid gba:grid-cols-1 gba:gap-3">
                <label className="gba:text-xs gba:text-muted-foreground">
                  Row Fields
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={pivotRowField}
                    onChange={e => setPivotRowField(e.target.value)}
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.name}>
                        {getColumnHeader(col)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  Column Fields
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={pivotColumnField}
                    onChange={e => setPivotColumnField(e.target.value)}
                  >
                    <option value="">None</option>
                    {columns.map(col => (
                      <option key={col.id} value={col.name}>
                        {getColumnHeader(col)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  Value Fields
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={pivotValueField}
                    onChange={e => setPivotValueField(e.target.value)}
                    disabled={aggregation === 'count'}
                  >
                    <option value="">None</option>
                    {numericColumns.map(col => (
                      <option key={col.id} value={col.name}>
                        {getColumnHeader(col)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  Aggregation
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={aggregation}
                    onChange={e => setAggregation(e.target.value as AnalyticsAggregation)}
                  >
                    <option value="count">COUNT</option>
                    <option value="sum">SUM</option>
                    <option value="avg">AVG</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                  </select>
                </label>
              </div>

              <Button className="gba:w-full" onClick={handleComputePivot} disabled={!canComputePivot}>
                Compute Pivot Table
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
                      {pivotRows.slice(0, 40).map((row, index) => (
                        <tr key={index} className="gba:border-t gba:border-border/40">
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

            <TabsContent value="charts" className="gba:space-y-4">
              <div className="gba:border gba:border-primary/20 gba:bg-primary/5 gba:rounded-md gba:p-3">
                <p className="gba:text-sm gba:text-primary">
                  Visualize your data and optionally send the chart to a Slides presentation.
                </p>
              </div>

              <div className="gba:grid gba:grid-cols-1 gba:gap-3">
                <label className="gba:text-xs gba:text-muted-foreground">
                  Chart Type
                  <div className="gba:mt-1 gba:grid gba:grid-cols-5 gba:gap-1">
                    {(['bar', 'line', 'pie', 'area', 'scatter'] as const).map(type => (
                      <Button
                        key={type}
                        variant={chartType === type ? 'default' : 'secondary'}
                        size="sm"
                        onClick={() => setChartType(type)}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Button>
                    ))}
                  </div>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  X-Axis (Categories)
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
                    <span className="gba:text-xs gba:text-muted-foreground/80">Range:</span>
                    <input
                      type="text"
                      placeholder={getDefaultRangeForColumn(chartXAxis) || 'e.g. A2:A100'}
                      className="gba:flex-1 gba:min-w-0 gba:h-8 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-2.5 gba:text-sm gba:font-mono"
                      value={chartXRange}
                      onChange={e => setChartXRange(e.target.value)}
                      data-testid="chart-x-range"
                    />
                  </div>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  Y-Axis (Values)
                  <div className="gba:mt-1 gba:flex gba:flex-wrap gba:gap-1">
                    {chartableValueColumns.length === 0 ? (
                      <span className="gba:text-xs gba:text-muted-foreground">No value columns detected.</span>
                    ) : (
                      chartableValueColumns
                        .filter(col => col.name !== chartXAxis)
                        .map(col => {
                          const active = chartYAxis.includes(col.name)
                          return (
                            <Button
                              key={col.id}
                              variant={active ? 'default' : 'secondary'}
                              size="sm"
                              onClick={() =>
                                setChartYAxis(prev =>
                                  prev.includes(col.name) ? prev.filter(name => name !== col.name) : [...prev, col.name]
                                )
                              }
                            >
                              {getColumnHeader(col)}
                            </Button>
                          )
                        })
                    )}
                  </div>
                  <div className="gba:mt-1 gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-xs gba:text-muted-foreground/80">Range:</span>
                    <input
                      type="text"
                      placeholder={
                        chartYAxis[0]
                          ? (() => {
                              const idx = columns.findIndex(c => c.name === chartYAxis[0])
                              if (idx < 0) return 'e.g. G2:G100'
                              const colLetter = indexToExcelCol(idx)
                              return `${colLetter}2:${colLetter}${Math.max(100, analyticsRows.length + 10)}`
                            })()
                          : 'e.g. G2:G100'
                      }
                      className="gba:flex-1 gba:min-w-0 gba:h-8 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-2.5 gba:text-sm gba:font-mono"
                      value={chartYRange}
                      onChange={e => setChartYRange(e.target.value)}
                      data-testid="chart-y-range"
                    />
                  </div>
                </label>

                <label className="gba:text-xs gba:text-muted-foreground">
                  Aggregation
                  <select
                    className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                    value={chartAggregation}
                    onChange={e => setChartAggregation(e.target.value as AnalyticsAggregation)}
                  >
                    <option value="sum">SUM</option>
                    <option value="avg">AVG</option>
                    <option value="count">COUNT</option>
                    <option value="min">MIN</option>
                    <option value="max">MAX</option>
                  </select>
                </label>

                <div className="gba:space-y-2">
                  <label className="gba:text-xs gba:text-muted-foreground">
                    Colors
                    <select
                      className="gba:mt-1 gba:w-full gba:h-9 gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm"
                      value={chartColorPalette}
                      onChange={e => setChartColorPalette(e.target.value as 'newwork-brand')}
                    >
                      <option value="newwork-brand">NEWWORK Brand</option>
                    </select>
                  </label>
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:cursor-pointer">
                      <Checkbox checked={showLegend} onCheckedChange={v => setShowLegend(v === true)} />
                      Legend
                    </label>
                    <label className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:cursor-pointer">
                      <Checkbox checked={showGrid} onCheckedChange={v => setShowGrid(v === true)} />
                      Grid
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
                  aria-label="Refresh chart"
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
                    {renderChartPreview()}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button onClick={() => void generateInsights()} disabled={isLoadingInsights} className="gba:flex-1">
                  <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                  {isLoadingInsights ? 'Generating...' : 'AI insights'}
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
                  Using local fallback: {insightsError}
                </p>
              )}
              <div className="gba:space-y-2">
                {insights.length === 0 ? (
                  <div className="gba:border gba:border-secondary/30 gba:bg-secondary/5 gba:rounded-md gba:p-3">
                    <p className="gba:text-xs gba:text-muted-foreground">
                      Run AI insights to analyze trends and anomalies.
                    </p>
                  </div>
                ) : (
                  insights.map((item, index) => (
                    <div
                      key={index}
                      className="gba:text-sm gba:p-3 gba:rounded-md gba:bg-success/5 gba:border gba:border-success/20"
                    >
                      {item}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button onClick={() => void generateSummary()} disabled={isLoadingSummary} className="gba:flex-1">
                  <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
                  {isLoadingSummary ? 'Generating...' : 'AI Summary'}
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
                  Using local fallback: {summaryError}
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
                          Count {card.count} · Unique {card.unique}
                        </span>
                      </div>
                      <p className="gba:text-xs gba:text-muted-foreground">Mode: {card.mode}</p>
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
                                  className={`gba:h-1.5 gba:rounded ${ratio >= 60 ? 'gba:bg-success' : ratio >= 30 ? 'gba:bg-primary' : 'gba:bg-warning'}`}
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
                <p className="gba:text-xs gba:text-muted-foreground">
                  Generate AI summary to see per-column statistics.
                </p>
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
              {isInsertingPivot ? 'Inserting...' : 'Insert into Sheet'}
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
                PNG
              </Button>
              <Button
                size="sm"
                className="gba:flex-1"
                onClick={() => setSendToSlidesDialogOpen(true)}
                disabled={chartData.length === 0}
              >
                <Presentation className="gba:w-4 gba:h-4 gba:mr-2" />
                Send to Slides
              </Button>
            </div>
          )}
          {activeTab !== 'pivot' && activeTab !== 'charts' && null}
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
