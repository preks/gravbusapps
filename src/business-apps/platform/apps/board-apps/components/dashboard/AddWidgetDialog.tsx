/**
 * AddWidgetDialog - create or edit KPI, chart, and table widgets.
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
  SelectItem,
  Checkbox
} from '@newwork/nw-design-system'
import type { BoardColumn, DashboardWidget, KpiWidgetConfig, ChartWidgetConfig, TableWidgetConfig } from '../../types'

export interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: BoardColumn[]
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

type WidgetType = 'kpi' | 'chart' | 'table'

export const AddWidgetDialog: React.FC<AddWidgetDialogProps> = ({
  open,
  onOpenChange,
  columns,
  onAdd,
  editWidget,
  'data-testid': testId = 'add-widget-dialog'
}) => {
  const [widgetType, setWidgetType] = useState<WidgetType>('kpi')
  const [title, setTitle] = useState('')

  // KPI fields
  const [kpiColumn, setKpiColumn] = useState('')
  const [aggregation, setAggregation] = useState<'count' | 'sum' | 'avg' | 'min' | 'max'>('count')
  const [format, setFormat] = useState<'number' | 'currency' | 'percentage'>('number')

  // Chart fields
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'donut' | 'area'>('bar')
  const [xAxis, setXAxis] = useState('')
  const [yAxis, setYAxis] = useState('')
  const [chartAgg, setChartAgg] = useState<'sum' | 'avg' | 'count'>('count')

  // Table fields
  const [tableColumns, setTableColumns] = useState<string[]>([])
  const [tableLimit, setTableLimit] = useState(10)

  // Size
  const [widgetWidth, setWidgetWidth] = useState(1)

  useEffect(() => {
    if (!open) return
    if (editWidget) {
      setTitle(editWidget.title)
      setWidgetType(editWidget.config.type as WidgetType)
      setWidgetWidth(editWidget.position.w)

      if (editWidget.config.type === 'kpi') {
        const c = editWidget.config as KpiWidgetConfig
        setKpiColumn(c.column)
        setAggregation(c.aggregation)
        setFormat(c.format || 'number')
      } else if (editWidget.config.type === 'chart') {
        const c = editWidget.config as ChartWidgetConfig
        setChartType(c.chartType)
        setXAxis(c.xAxis)
        setYAxis(c.yAxis)
        setChartAgg(c.aggregation || 'count')
      } else if (editWidget.config.type === 'table') {
        const c = editWidget.config as TableWidgetConfig
        setTableColumns(c.columns)
        setTableLimit(c.limit || 10)
      }
    } else {
      resetForm()
    }
  }, [open, editWidget])

  const resetForm = () => {
    setTitle('')
    setWidgetType('kpi')
    setKpiColumn('')
    setAggregation('count')
    setFormat('number')
    setChartType('bar')
    setXAxis('')
    setYAxis('')
    setChartAgg('count')
    setTableColumns([])
    setTableLimit(10)
    setWidgetWidth(1)
  }

  const numericColumns = useMemo(
    () => columns.filter(c => c.type === 'number' || c.type === 'currency' || c.type === 'percentage'),
    [columns]
  )
  const kpiTargetColumns = aggregation === 'count' ? columns : numericColumns

  const canCreate = useMemo(() => {
    if (!title.trim()) return false
    switch (widgetType) {
      case 'kpi':
        return Boolean(kpiColumn)
      case 'chart':
        return Boolean(xAxis && yAxis)
      case 'table':
        return tableColumns.length > 0
      default:
        return false
    }
  }, [title, widgetType, kpiColumn, xAxis, yAxis, tableColumns])

  const handleCreate = useCallback(() => {
    if (!canCreate) return

    let config: KpiWidgetConfig | ChartWidgetConfig | TableWidgetConfig
    switch (widgetType) {
      case 'kpi':
        config = { type: 'kpi', column: kpiColumn, aggregation, format }
        break
      case 'chart':
        config = { type: 'chart', chartType, xAxis, yAxis, aggregation: chartAgg }
        break
      case 'table':
        config = { type: 'table', columns: tableColumns, limit: tableLimit }
        break
    }

    const widget: DashboardWidget = {
      id: editWidget?.id || createId(),
      type: widgetType,
      title: title.trim(),
      config,
      position: { x: 0, y: 0, w: widgetWidth, h: 1 }
    }

    onAdd(widget)
    resetForm()
    onOpenChange(false)
  }, [
    canCreate,
    widgetType,
    title,
    kpiColumn,
    aggregation,
    format,
    chartType,
    xAxis,
    yAxis,
    chartAgg,
    tableColumns,
    tableLimit,
    widgetWidth,
    editWidget,
    onAdd,
    onOpenChange
  ])

  const toggleTableColumn = (colName: string) => {
    setTableColumns(prev => (prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName]))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-md" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{editWidget ? 'Edit widget' : 'Add widget'}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-3">
          {/* Widget type selector */}
          <div>
            <Label className="gba:text-xs">Widget type</Label>
            <Select value={widgetType} onValueChange={v => setWidgetType(v as WidgetType)}>
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kpi">KPI / Number</SelectItem>
                <SelectItem value="chart">Chart</SelectItem>
                <SelectItem value="table">Table</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
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
          </div>

          {/* KPI-specific fields */}
          {widgetType === 'kpi' && (
            <>
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                <div>
                  <Label className="gba:text-xs">Aggregation</Label>
                  <Select value={aggregation} onValueChange={v => setAggregation(v as any)}>
                    <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-aggregation`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="gba:text-xs">Format</Label>
                  <Select value={format} onValueChange={v => setFormat(v as any)}>
                    <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-format`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="currency">Currency</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="gba:text-xs">Column</Label>
                <Select value={kpiColumn} onValueChange={setKpiColumn}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-column`}>
                    <SelectValue placeholder="Pick column" />
                  </SelectTrigger>
                  <SelectContent>
                    {kpiTargetColumns.map(c => (
                      <SelectItem key={c.id || c.name} value={c.name}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Chart-specific fields */}
          {widgetType === 'chart' && (
            <>
              <div>
                <Label className="gba:text-xs">Chart type</Label>
                <Select value={chartType} onValueChange={v => setChartType(v as any)}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-chart-type`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="pie">Pie</SelectItem>
                    <SelectItem value="donut">Donut</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                <div>
                  <Label className="gba:text-xs">Group by (X axis)</Label>
                  <Select value={xAxis} onValueChange={setXAxis}>
                    <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-x-axis`}>
                      <SelectValue placeholder="Pick column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(c => (
                        <SelectItem key={c.id || c.name} value={c.name}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="gba:text-xs">Value (Y axis)</Label>
                  <Select value={yAxis} onValueChange={setYAxis}>
                    <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-y-axis`}>
                      <SelectValue placeholder="Pick column" />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map(c => (
                        <SelectItem key={c.id || c.name} value={c.name}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="gba:text-xs">Aggregation</Label>
                <Select value={chartAgg} onValueChange={v => setChartAgg(v as any)}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-chart-agg`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="count">Count</SelectItem>
                    <SelectItem value="sum">Sum</SelectItem>
                    <SelectItem value="avg">Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Table-specific fields */}
          {widgetType === 'table' && (
            <>
              <div>
                <Label className="gba:text-xs gba:mb-1 gba:block">Columns to show</Label>
                <div className="gba:max-h-32 gba:overflow-auto gba:space-y-1 gba:border gba:rounded gba:p-2 gba:border-border">
                  {columns.map(c => (
                    <label
                      key={c.id || c.name}
                      className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:cursor-pointer"
                    >
                      <Checkbox
                        checked={tableColumns.includes(c.name)}
                        onCheckedChange={() => toggleTableColumn(c.name)}
                        data-testid={`${testId}-table-col-${c.name}`}
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="gba:text-xs">Max rows</Label>
                <Input
                  type="number"
                  value={tableLimit}
                  onChange={e => setTableLimit(Math.max(1, Number(e.target.value) || 10))}
                  className="gba:h-8 gba:text-xs gba:w-20"
                  min={1}
                  max={100}
                  data-testid={`${testId}-table-limit`}
                />
              </div>
            </>
          )}

          {/* Width selector */}
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
