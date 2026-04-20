/**
 * useWidgetLegacyState - manages state for legacy widget types (KPI, Chart, Table).
 * Extracted from AddWidgetDialog to keep it under 300 lines.
 */

import { useState, useCallback } from 'react'
import type { DashboardWidget, KpiWidgetConfig, ChartWidgetConfig, TableWidgetConfig } from '../types'

export function useWidgetLegacyState() {
  const [kpiColumn, setKpiColumn] = useState('')
  const [aggregation, setAggregation] = useState<'count' | 'sum' | 'avg' | 'min' | 'max'>('count')
  const [format, setFormat] = useState<'number' | 'currency' | 'percentage'>('number')

  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'donut' | 'area'>('bar')
  const [xAxis, setXAxis] = useState('')
  const [yAxis, setYAxis] = useState('')
  const [chartAgg, setChartAgg] = useState<'sum' | 'avg' | 'count' | 'min' | 'max'>('count')
  const [chartSortDir, setChartSortDir] = useState('')
  const [chartLimit, setChartLimit] = useState<number | ''>('')

  const [tableColumns, setTableColumns] = useState<string[]>([])
  const [tableLimit, setTableLimit] = useState(10)
  const [tableSortBy, setTableSortBy] = useState('')
  const [tableSortDir, setTableSortDir] = useState('asc')

  const reset = useCallback(() => {
    setKpiColumn('')
    setAggregation('count')
    setFormat('number')
    setChartType('bar')
    setXAxis('')
    setYAxis('')
    setChartAgg('count')
    setChartSortDir('')
    setChartLimit('')
    setTableColumns([])
    setTableLimit(10)
    setTableSortBy('')
    setTableSortDir('asc')
  }, [])

  const populateFromWidget = useCallback((widget: DashboardWidget) => {
    if (widget.config.type === 'kpi') {
      const c = widget.config as KpiWidgetConfig
      setKpiColumn(c.column)
      setAggregation(c.aggregation)
      setFormat(c.format || 'number')
    } else if (widget.config.type === 'chart') {
      const c = widget.config as ChartWidgetConfig
      setChartType(c.chartType)
      setXAxis(c.xAxis)
      setYAxis(c.yAxis)
      setChartAgg(c.aggregation || 'count')
      setChartSortDir(c.sortDirection || '')
      setChartLimit(c.limit || '')
    } else if (widget.config.type === 'table') {
      const c = widget.config as TableWidgetConfig
      setTableColumns(c.columns)
      setTableLimit(c.limit || 10)
      setTableSortBy(c.sortBy || '')
      setTableSortDir(c.sortDirection || 'asc')
    }
  }, [])

  const buildConfig = useCallback(
    (widgetType: string): DashboardWidget['config'] | null => {
      switch (widgetType) {
        case 'kpi':
          return { type: 'kpi', column: kpiColumn, aggregation, format }
        case 'chart':
          return {
            type: 'chart',
            chartType,
            xAxis,
            yAxis,
            aggregation: chartAgg,
            sortBy: chartSortDir ? ('value' as const) : undefined,
            sortDirection: (chartSortDir || undefined) as any,
            limit: chartLimit || undefined
          }
        case 'table':
          return {
            type: 'table',
            columns: tableColumns,
            limit: tableLimit,
            sortBy: tableSortBy || undefined,
            sortDirection: (tableSortDir || undefined) as any
          }
        default:
          return null
      }
    },
    [
      kpiColumn,
      aggregation,
      format,
      chartType,
      xAxis,
      yAxis,
      chartAgg,
      chartSortDir,
      chartLimit,
      tableColumns,
      tableLimit,
      tableSortBy,
      tableSortDir
    ]
  )

  const canCreate = useCallback(
    (widgetType: string): boolean | null => {
      switch (widgetType) {
        case 'kpi':
          return Boolean(kpiColumn)
        case 'chart':
          return Boolean(xAxis && yAxis)
        case 'table':
          return tableColumns.length > 0
        default:
          return null
      }
    },
    [kpiColumn, xAxis, yAxis, tableColumns]
  )

  const toggleTableColumn = useCallback((colName: string) => {
    setTableColumns(prev => (prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]))
  }, [])

  return {
    kpi: { column: kpiColumn, setColumn: setKpiColumn, aggregation, setAggregation, format, setFormat },
    chart: {
      type: chartType,
      setType: setChartType,
      xAxis,
      setXAxis,
      yAxis,
      setYAxis,
      agg: chartAgg,
      setAgg: setChartAgg,
      sortDir: chartSortDir,
      setSortDir: setChartSortDir,
      limit: chartLimit,
      setLimit: setChartLimit
    },
    table: {
      columns: tableColumns,
      toggleColumn: toggleTableColumn,
      limit: tableLimit,
      setLimit: setTableLimit,
      sortBy: tableSortBy,
      setSortBy: setTableSortBy,
      sortDir: tableSortDir,
      setSortDir: setTableSortDir
    },
    reset,
    populateFromWidget,
    buildConfig,
    canCreate
  }
}
