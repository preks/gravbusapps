/**
 * AddWidgetDialog - create or edit dashboard widgets with a live preview.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import type { BoardColumn, BoardRow, DashboardWidget, ViewFilter, FilterConnector } from '../../types'
import { MultiChartFields, TimeSeriesFields, ScatterFields, HistogramFields } from './AddWidgetV2Fields'
import { KpiFields, ChartFields, TableFields } from './AddWidgetLegacyFields'
import { WidgetFilterFields } from './WidgetFilterFields'
import { useWidgetV2State } from '../../hooks/useWidgetFormState'
import { useWidgetLegacyState } from '../../hooks/useWidgetLegacyState'
import { WidgetPreviewPanel } from './WidgetPreviewPanel'
import { Hint, HINTS } from './widgetFieldHelpers'

export interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: BoardColumn[]
  rows?: BoardRow[]
  onAdd: (widget: DashboardWidget) => void
  editWidget?: DashboardWidget | null
  'data-testid'?: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `w_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `w_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

type WidgetType = 'kpi' | 'chart' | 'table' | 'multi_chart' | 'timeseries' | 'scatter' | 'histogram'

export const AddWidgetDialog: React.FC<AddWidgetDialogProps> = ({
  open,
  onOpenChange,
  columns,
  rows = [],
  onAdd,
  editWidget,
  'data-testid': testId = 'add-widget-dialog'
}) => {
  const [widgetType, setWidgetType] = useState<WidgetType>('kpi')
  const [title, setTitle] = useState('')
  const [widgetWidth, setWidgetWidth] = useState(1)
  const [widgetFilters, setWidgetFilters] = useState<ViewFilter[]>([])
  const [filterConnector, setFilterConnector] = useState<FilterConnector>('and')

  const legacy = useWidgetLegacyState()
  const v2 = useWidgetV2State()

  useEffect(() => {
    if (!open) return
    if (editWidget) {
      setTitle(editWidget.title)
      setWidgetType(editWidget.config.type as WidgetType)
      setWidgetWidth(editWidget.position.w)
      setWidgetFilters(editWidget.filters?.filters ?? [])
      setFilterConnector(editWidget.filters?.connector ?? 'and')
      legacy.populateFromWidget(editWidget)
      v2.populateFromWidget(editWidget)
    } else {
      setTitle('')
      setWidgetType('kpi')
      setWidgetWidth(1)
      setWidgetFilters([])
      setFilterConnector('and')
      legacy.reset()
      v2.resetV2()
    }
  }, [open, editWidget])

  const buildConfig = useCallback((): DashboardWidget['config'] | null => {
    return legacy.buildConfig(widgetType) ?? v2.buildV2Config(widgetType)
  }, [widgetType, legacy, v2])

  const canCreate = useMemo(() => {
    if (!title.trim()) return false
    const legacyResult = legacy.canCreate(widgetType)
    if (legacyResult !== null) return legacyResult
    return v2.canCreateV2(widgetType) ?? false
  }, [title, widgetType, legacy, v2])

  const activeFilterGroup = useMemo(() => {
    const valid = widgetFilters.filter(f => f.column)
    return valid.length > 0 ? { connector: filterConnector, filters: valid } : undefined
  }, [widgetFilters, filterConnector])

  const previewWidget = useMemo((): DashboardWidget | null => {
    const config = buildConfig()
    if (!config) return null
    return {
      id: 'preview',
      type: widgetType,
      title: title || '(untitled)',
      config,
      position: { x: 0, y: 0, w: widgetWidth, h: 1 },
      filters: activeFilterGroup
    }
  }, [buildConfig, widgetType, title, widgetWidth, activeFilterGroup])

  const handleCreate = useCallback(() => {
    if (!canCreate) return
    const config = buildConfig()
    if (!config) return
    const widget: DashboardWidget = {
      id: editWidget?.id || createId(),
      type: widgetType,
      title: title.trim(),
      config,
      position: { x: 0, y: 0, w: widgetWidth, h: 1 },
      filters: activeFilterGroup
    }
    onAdd(widget)
    setTitle('')
    setWidgetType('kpi')
    setWidgetWidth(1)
    setWidgetFilters([])
    setFilterConnector('and')
    legacy.reset()
    v2.resetV2()
    onOpenChange(false)
  }, [
    canCreate,
    buildConfig,
    widgetType,
    title,
    widgetWidth,
    activeFilterGroup,
    editWidget,
    onAdd,
    onOpenChange,
    legacy,
    v2
  ])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-3xl" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{editWidget ? 'Edit widget' : 'Add widget'}</DialogTitle>
        </DialogHeader>

        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:min-h-[360px]">
          <div className="gba:space-y-3 gba:overflow-y-auto gba:max-h-[460px] gba:pr-1">
            <div>
              <Label className="gba:text-xs">Widget type</Label>
              <Select value={widgetType} onValueChange={v => setWidgetType(v as WidgetType)}>
                <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-type`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kpi">KPI / Number</SelectItem>
                  <SelectItem value="chart">Chart</SelectItem>
                  <SelectItem value="multi_chart">Multi-Series Chart</SelectItem>
                  <SelectItem value="timeseries">Time Series</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                  <SelectItem value="histogram">Histogram</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
              <Hint>{HINTS.widgetType}</Hint>
            </div>

            <div>
              <Label className="gba:text-xs" htmlFor={`${testId}-title`}>
                Title
              </Label>
              <Input
                id={`${testId}-title`}
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  widgetType === 'kpi'
                    ? 'e.g. Total Revenue'
                    : widgetType === 'chart'
                      ? 'e.g. Sales by Region'
                      : 'e.g. Top 10 Items'
                }
                className="gba:h-8 gba:text-xs"
                autoFocus
                data-testid={`${testId}-input-title`}
              />
              <Hint>{HINTS.title}</Hint>
            </div>

            <WidgetFilterFields
              columns={columns}
              filters={widgetFilters}
              onFiltersChange={setWidgetFilters}
              connector={filterConnector}
              onConnectorChange={setFilterConnector}
              testId={testId}
            />

            {widgetType === 'kpi' && (
              <KpiFields
                columns={columns}
                aggregation={legacy.kpi.aggregation}
                onAggregationChange={v => legacy.kpi.setAggregation(v as any)}
                format={legacy.kpi.format}
                onFormatChange={v => legacy.kpi.setFormat(v as any)}
                kpiColumn={legacy.kpi.column}
                onKpiColumnChange={legacy.kpi.setColumn}
                testId={testId}
              />
            )}
            {widgetType === 'chart' && (
              <ChartFields
                columns={columns}
                chartType={legacy.chart.type}
                onChartTypeChange={v => legacy.chart.setType(v as any)}
                xAxis={legacy.chart.xAxis}
                onXAxisChange={legacy.chart.setXAxis}
                yAxis={legacy.chart.yAxis}
                onYAxisChange={legacy.chart.setYAxis}
                chartAgg={legacy.chart.agg}
                onChartAggChange={v => legacy.chart.setAgg(v as any)}
                sortDir={legacy.chart.sortDir}
                onSortDirChange={legacy.chart.setSortDir}
                limit={legacy.chart.limit}
                onLimitChange={legacy.chart.setLimit}
                testId={testId}
              />
            )}
            {widgetType === 'table' && (
              <TableFields
                columns={columns}
                tableColumns={legacy.table.columns}
                onToggleTableColumn={legacy.table.toggleColumn}
                tableLimit={legacy.table.limit}
                onTableLimitChange={legacy.table.setLimit}
                sortBy={legacy.table.sortBy}
                onSortByChange={legacy.table.setSortBy}
                sortDir={legacy.table.sortDir}
                onSortDirChange={legacy.table.setSortDir}
                testId={testId}
              />
            )}
            {widgetType === 'multi_chart' && (
              <MultiChartFields
                columns={columns}
                groupBy={v2.mc.groupBy}
                onGroupByChange={v2.mc.setGroupBy}
                chartType={v2.mc.chartType}
                onChartTypeChange={v2.mc.setChartType}
                series={v2.mc.series}
                onSeriesChange={v2.mc.setSeries}
                breakdown={v2.mc.breakdown}
                onBreakdownChange={v2.mc.setBreakdown}
                timeBucket={v2.mc.timeBucket}
                onTimeBucketChange={v2.mc.setTimeBucket}
                sortDir={v2.mc.sortDir}
                onSortDirChange={v2.mc.setSortDir}
                limit={v2.mc.limit}
                onLimitChange={v2.mc.setLimit}
                testId={testId}
              />
            )}
            {widgetType === 'timeseries' && (
              <TimeSeriesFields
                columns={columns}
                dateColumn={v2.ts.dateCol}
                onDateColumnChange={v2.ts.setDateCol}
                bucket={v2.ts.bucket}
                onBucketChange={v2.ts.setBucket}
                chartType={v2.ts.chartType}
                onChartTypeChange={v2.ts.setChartType}
                series={v2.ts.series}
                onSeriesChange={v2.ts.setSeries}
                testId={testId}
              />
            )}
            {widgetType === 'scatter' && (
              <ScatterFields
                columns={columns}
                xColumn={v2.scatter.x}
                onXColumnChange={v2.scatter.setX}
                yColumn={v2.scatter.y}
                onYColumnChange={v2.scatter.setY}
                labelColumn={v2.scatter.label}
                onLabelColumnChange={v2.scatter.setLabel}
                sizeColumn={v2.scatter.size}
                onSizeColumnChange={v2.scatter.setSize}
                colorColumn={v2.scatter.color}
                onColorColumnChange={v2.scatter.setColor}
                testId={testId}
              />
            )}
            {widgetType === 'histogram' && (
              <HistogramFields
                columns={columns}
                column={v2.hist.col}
                onColumnChange={v2.hist.setCol}
                bins={v2.hist.bins}
                onBinsChange={v2.hist.setBins}
                testId={testId}
              />
            )}

            <div>
              <Label className="gba:text-xs">Widget width</Label>
              <Select value={String(widgetWidth)} onValueChange={v => setWidgetWidth(Number(v))}>
                <SelectTrigger className="gba:h-8 gba:text-xs gba:w-24" data-testid={`${testId}-width`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 col</SelectItem>
                  <SelectItem value="2">2 cols</SelectItem>
                  <SelectItem value="3">3 cols</SelectItem>
                  <SelectItem value="4">4 cols</SelectItem>
                </SelectContent>
              </Select>
              <Hint>{HINTS.width}</Hint>
            </div>
          </div>

          <div className="gba:min-h-[280px] gba:hidden gba:md:block">
            <WidgetPreviewPanel widget={previewWidget} columns={columns} rows={rows} isReady={canCreate} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!canCreate} data-testid={`${testId}-create`}>
            {editWidget ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
