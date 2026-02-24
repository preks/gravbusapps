/**
 * WidgetContent - routes DashboardWidget to the correct renderer.
 * Supports legacy (kpi/chart/table) and v2 (multi_chart/timeseries/scatter/histogram) types.
 */

import React, { useMemo } from 'react'
import type {
  BoardRow,
  BoardColumn,
  KpiWidgetConfig,
  ChartWidgetConfig,
  TableWidgetConfig,
  MultiSeriesChartWidgetConfig,
  TimeSeriesWidgetConfig,
  ScatterWidgetConfig,
  HistogramWidgetConfig,
  DashboardWidget
} from '../../types'
import { ChartWidget } from './ChartWidget'
import { TableWidget } from './TableWidget'
import { MultiSeriesChartWidget } from './MultiSeriesChartWidget'
import { TimeSeriesWidget } from './TimeSeriesWidget'
import { ScatterWidget } from './ScatterWidget'
import { HistogramWidget } from './HistogramWidget'
import { normalizeWidgetType } from '../../services/analyticsAggregators'
import { applyWidgetFilters } from './widgetFieldHelpers'

export interface WidgetContentProps {
  widget: DashboardWidget
  columns: BoardColumn[]
  rows: BoardRow[]
  testId: string
}

const CHART_SUBTYPES = new Set(['bar', 'line', 'pie', 'donut', 'area'])

export const WidgetContent: React.FC<WidgetContentProps> = ({ widget, columns, rows, testId }) => {
  const filteredRows = useMemo(() => applyWidgetFilters(rows, widget.filters), [rows, widget.filters])

  const rawType = String(widget.config.type || widget.type || '')
  const widgetType = normalizeWidgetType(rawType)

  if (widgetType === 'kpi') {
    return (
      <KpiContent config={{ ...widget.config, type: 'kpi' } as KpiWidgetConfig} columns={columns} rows={filteredRows} />
    )
  }

  if (widgetType === 'chart') {
    const rawLower = rawType.toLowerCase().replace(/[-_\s]chart$/, '')
    const chartType = (widget.config as any).chartType || (CHART_SUBTYPES.has(rawLower) ? rawLower : 'bar')
    return (
      <ChartWidget
        config={{ ...widget.config, type: 'chart', chartType } as ChartWidgetConfig}
        columns={columns}
        rows={filteredRows}
        testId={testId}
      />
    )
  }

  if (widgetType === 'table') {
    return (
      <TableWidget
        config={{ ...widget.config, type: 'table' } as TableWidgetConfig}
        columns={columns}
        rows={filteredRows}
        testId={testId}
      />
    )
  }

  if (widgetType === 'multi_chart') {
    return (
      <MultiSeriesChartWidget
        config={widget.config as MultiSeriesChartWidgetConfig}
        columns={columns}
        rows={filteredRows}
        testId={testId}
      />
    )
  }

  if (widgetType === 'timeseries') {
    return (
      <TimeSeriesWidget
        config={widget.config as TimeSeriesWidgetConfig}
        columns={columns}
        rows={filteredRows}
        testId={testId}
      />
    )
  }

  if (widgetType === 'scatter') {
    return (
      <ScatterWidget
        config={widget.config as ScatterWidgetConfig}
        columns={columns}
        rows={filteredRows}
        testId={testId}
      />
    )
  }

  if (widgetType === 'histogram') {
    return (
      <HistogramWidget
        config={widget.config as HistogramWidgetConfig}
        columns={columns}
        rows={filteredRows}
        testId={testId}
      />
    )
  }

  console.warn(
    `[WidgetContent] Unrecognised widget type "${rawType}" (normalised: "${widgetType}"). Attempting chart fallback.`
  )

  const cfg = widget.config as any
  if (cfg.xAxis || cfg.yAxis || cfg.column) {
    return (
      <ChartWidget
        config={{ ...cfg, type: 'chart', chartType: cfg.chartType || 'bar' } as ChartWidgetConfig}
        columns={columns}
        rows={filteredRows}
        testId={testId}
      />
    )
  }

  return <p className="gba:text-xs gba:text-muted-foreground">Unsupported widget type: {widgetType}</p>
}

interface KpiContentProps {
  config: KpiWidgetConfig
  columns: BoardColumn[]
  rows: BoardRow[]
}

const KpiContent: React.FC<KpiContentProps> = ({ config, columns, rows }) => {
  const resolvedCol = useMemo(() => {
    const ref = config.column
    if (!ref) return null
    return (
      columns.find(c => c.name === ref) ||
      columns.find(c => c.id === ref) ||
      columns.find(c => c.label.toLowerCase() === ref.toLowerCase()) ||
      columns.find(
        c => c.name.toLowerCase().includes(ref.toLowerCase()) || c.label.toLowerCase().includes(ref.toLowerCase())
      ) ||
      null
    )
  }, [config.column, columns])

  const value = useMemo(() => {
    if (config.aggregation === 'count') return rows.length

    if (!resolvedCol) return null

    const values = rows.map(r => Number(r.data[resolvedCol.name])).filter(v => !isNaN(v))
    if (values.length === 0) return null

    switch (config.aggregation) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0)
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length
      case 'min':
        return Math.min(...values)
      case 'max':
        return Math.max(...values)
      default:
        return values.reduce((a, b) => a + b, 0)
    }
  }, [config.aggregation, resolvedCol, rows])

  const formatted = useMemo(() => {
    if (value === null) return '--'
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
    }
  }, [value, config.format])

  return (
    <>
      <p className="gba:text-2xl gba:font-semibold gba:text-foreground">{formatted}</p>
      <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
        {config.aggregation} of {resolvedCol?.label || config.column}
      </p>
    </>
  )
}
