/**
 * useWidgetFormState - manages state for the AddWidgetDialog form.
 * Extracted to keep AddWidgetDialog under 300 lines.
 */

import { useState, useCallback } from 'react'
import type {
  DashboardWidget,
  MultiSeriesChartWidgetConfig,
  TimeSeriesWidgetConfig,
  ScatterWidgetConfig,
  HistogramWidgetConfig
} from '../types'

type WidgetType = 'kpi' | 'chart' | 'table' | 'multi_chart' | 'timeseries' | 'scatter' | 'histogram'

interface SeriesDef {
  column: string
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
  label: string
}

export function useWidgetV2State() {
  const [mcGroupBy, setMcGroupBy] = useState('')
  const [mcChartType, setMcChartType] = useState('bar')
  const [mcSeries, setMcSeries] = useState<SeriesDef[]>([{ column: '', aggregation: 'count', label: '' }])
  const [mcBreakdown, setMcBreakdown] = useState('')
  const [mcTimeBucket, setMcTimeBucket] = useState('')
  const [mcSortDir, setMcSortDir] = useState('')
  const [mcLimit, setMcLimit] = useState<number | ''>('')

  const [tsDateCol, setTsDateCol] = useState('')
  const [tsBucket, setTsBucket] = useState('month')
  const [tsChartType, setTsChartType] = useState('line')
  const [tsSeries, setTsSeries] = useState<SeriesDef[]>([{ column: '', aggregation: 'count', label: '' }])

  const [scatterX, setScatterX] = useState('')
  const [scatterY, setScatterY] = useState('')
  const [scatterLabel, setScatterLabel] = useState('')
  const [scatterSize, setScatterSize] = useState('')
  const [scatterColor, setScatterColor] = useState('')

  const [histCol, setHistCol] = useState('')
  const [histBins, setHistBins] = useState(10)

  const resetV2 = useCallback(() => {
    setMcGroupBy('')
    setMcChartType('bar')
    setMcSeries([{ column: '', aggregation: 'count', label: '' }])
    setMcBreakdown('')
    setMcTimeBucket('')
    setMcSortDir('')
    setMcLimit('')
    setTsDateCol('')
    setTsBucket('month')
    setTsChartType('line')
    setTsSeries([{ column: '', aggregation: 'count', label: '' }])
    setScatterX('')
    setScatterY('')
    setScatterLabel('')
    setScatterSize('')
    setScatterColor('')
    setHistCol('')
    setHistBins(10)
  }, [])

  const populateFromWidget = useCallback((widget: DashboardWidget) => {
    const { config } = widget
    if (config.type === 'multi_chart') {
      const c = config as MultiSeriesChartWidgetConfig
      setMcGroupBy(c.groupBy)
      setMcChartType(c.chartType)
      setMcSeries(c.series.map(s => ({ column: s.column, aggregation: s.aggregation, label: s.label || '' })))
      setMcBreakdown(c.breakdown || '')
      setMcTimeBucket(c.timeBucket || '')
      setMcSortDir(c.sortDirection || '')
      setMcLimit(c.limit || '')
    } else if (config.type === 'timeseries') {
      const c = config as TimeSeriesWidgetConfig
      setTsDateCol(c.dateColumn)
      setTsBucket(c.bucket)
      setTsChartType(c.chartType || 'line')
      setTsSeries(c.series.map(s => ({ column: s.column, aggregation: s.aggregation, label: s.label || '' })))
    } else if (config.type === 'scatter') {
      const c = config as ScatterWidgetConfig
      setScatterX(c.xColumn)
      setScatterY(c.yColumn)
      setScatterLabel(c.labelColumn || '')
      setScatterSize(c.sizeColumn || '')
      setScatterColor(c.colorColumn || '')
    } else if (config.type === 'histogram') {
      const c = config as HistogramWidgetConfig
      setHistCol(c.column)
      setHistBins(c.bins ?? 10)
    }
  }, [])

  const canCreateV2 = useCallback(
    (widgetType: WidgetType): boolean | null => {
      switch (widgetType) {
        case 'multi_chart':
          return Boolean(mcGroupBy && mcSeries.some(s => s.column))
        case 'timeseries':
          return Boolean(tsDateCol && tsSeries.some(s => s.column))
        case 'scatter':
          return Boolean(scatterX && scatterY)
        case 'histogram':
          return Boolean(histCol)
        default:
          return null
      }
    },
    [mcGroupBy, mcSeries, tsDateCol, tsSeries, scatterX, scatterY, histCol]
  )

  const buildV2Config = useCallback(
    (widgetType: WidgetType): DashboardWidget['config'] | null => {
      switch (widgetType) {
        case 'multi_chart':
          return {
            type: 'multi_chart',
            chartType: mcChartType as any,
            groupBy: mcGroupBy,
            series: mcSeries.filter(s => s.column),
            breakdown: mcBreakdown || undefined,
            timeBucket: (mcTimeBucket || undefined) as any,
            sortDirection: (mcSortDir || undefined) as any,
            limit: mcLimit || undefined
          }
        case 'timeseries':
          return {
            type: 'timeseries',
            dateColumn: tsDateCol,
            bucket: tsBucket as any,
            series: tsSeries.filter(s => s.column),
            chartType: tsChartType as any
          }
        case 'scatter':
          return {
            type: 'scatter',
            xColumn: scatterX,
            yColumn: scatterY,
            labelColumn: scatterLabel || undefined,
            sizeColumn: scatterSize || undefined,
            colorColumn: scatterColor || undefined
          }
        case 'histogram':
          return { type: 'histogram', column: histCol, bins: histBins }
        default:
          return null
      }
    },
    [
      mcGroupBy,
      mcChartType,
      mcSeries,
      mcBreakdown,
      mcTimeBucket,
      mcSortDir,
      mcLimit,
      tsDateCol,
      tsBucket,
      tsChartType,
      tsSeries,
      scatterX,
      scatterY,
      scatterLabel,
      scatterSize,
      scatterColor,
      histCol,
      histBins
    ]
  )

  return {
    mc: {
      groupBy: mcGroupBy,
      setGroupBy: setMcGroupBy,
      chartType: mcChartType,
      setChartType: setMcChartType,
      series: mcSeries,
      setSeries: setMcSeries,
      breakdown: mcBreakdown,
      setBreakdown: setMcBreakdown,
      timeBucket: mcTimeBucket,
      setTimeBucket: setMcTimeBucket,
      sortDir: mcSortDir,
      setSortDir: setMcSortDir,
      limit: mcLimit,
      setLimit: setMcLimit
    },
    ts: {
      dateCol: tsDateCol,
      setDateCol: setTsDateCol,
      bucket: tsBucket,
      setBucket: setTsBucket,
      chartType: tsChartType,
      setChartType: setTsChartType,
      series: tsSeries,
      setSeries: setTsSeries
    },
    scatter: {
      x: scatterX,
      setX: setScatterX,
      y: scatterY,
      setY: setScatterY,
      label: scatterLabel,
      setLabel: setScatterLabel,
      size: scatterSize,
      setSize: setScatterSize,
      color: scatterColor,
      setColor: setScatterColor
    },
    hist: { col: histCol, setCol: setHistCol, bins: histBins, setBins: setHistBins },
    resetV2,
    populateFromWidget,
    canCreateV2,
    buildV2Config
  }
}
