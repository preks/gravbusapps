/**
 * BoardDashboardView - KPI widgets and chart summaries.
 */

import React, { useMemo, useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import type { BoardRow, BoardColumn, DashboardViewConfig, KpiWidgetConfig, DashboardWidget } from '../types'
import { AddWidgetDialog } from '../components/dashboard/AddWidgetDialog'

export interface BoardDashboardViewProps {
  columns: BoardColumn[]
  rows: BoardRow[]
  viewConfig: DashboardViewConfig
  onUpdateWidgets?: (widgets: DashboardWidget[]) => void
  'data-testid'?: string
}

export const BoardDashboardView: React.FC<BoardDashboardViewProps> = ({
  columns,
  rows,
  viewConfig,
  onUpdateWidgets,
  'data-testid': testId = 'board-dashboard'
}) => {
  const widgets = viewConfig.widgets || []
  const [isAddOpen, setIsAddOpen] = useState(false)

  const handleAddWidget = (widget: DashboardWidget) => {
    onUpdateWidgets?.([...widgets, widget])
  }

  if (widgets.length === 0) {
    return (
      <div className="gba:p-8 gba:flex gba:flex-col gba:items-center gba:gap-3 gba:text-center" data-testid={testId}>
        <p className="gba:text-muted-foreground gba:text-sm">No widgets yet.</p>
        <Button
          size="sm"
          variant="outline"
          className="gba:gap-1.5"
          onClick={() => setIsAddOpen(true)}
          data-testid={`${testId}-add-widget`}
        >
          <Plus className="gba:w-3.5 gba:h-3.5" /> Add widget
        </Button>
        <AddWidgetDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          columns={columns}
          onAdd={handleAddWidget}
          data-testid={`${testId}-add-widget-dialog`}
        />
      </div>
    )
  }

  return (
    <div className="gba:p-4" data-testid={testId}>
      <div className="gba:flex gba:justify-end gba:mb-3">
        <Button
          size="sm"
          variant="outline"
          className="gba:gap-1.5 gba:h-7 gba:text-xs"
          onClick={() => setIsAddOpen(true)}
          data-testid={`${testId}-add-widget`}
        >
          <Plus className="gba:w-3 gba:h-3" /> Add widget
        </Button>
      </div>
      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:lg:grid-cols-4 gba:gap-3">
        {widgets.map(widget => (
          <DashboardWidgetCard
            key={widget.id}
            widget={widget}
            columns={columns}
            rows={rows}
            testId={`${testId}-widget-${widget.id}`}
          />
        ))}
      </div>
      <AddWidgetDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        columns={columns}
        onAdd={handleAddWidget}
        data-testid={`${testId}-add-widget-dialog`}
      />
    </div>
  )
}

interface DashboardWidgetCardProps {
  widget: DashboardWidget
  columns: BoardColumn[]
  rows: BoardRow[]
  testId: string
}

const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({ widget, columns, rows, testId }) => {
  const value = useMemo(() => {
    if (widget.config.type !== 'kpi') return null
    const kpiConfig = widget.config as KpiWidgetConfig

    const col = columns.find(c => c.name === kpiConfig.column || c.id === kpiConfig.column)
    if (!col) return null

    const values = rows.map(r => Number(r.data[col.name])).filter(v => !isNaN(v))
    if (values.length === 0) return null

    switch (kpiConfig.aggregation) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0)
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length
      case 'count':
        return values.length
      case 'min':
        return Math.min(...values)
      case 'max':
        return Math.max(...values)
      default:
        return values.reduce((a, b) => a + b, 0)
    }
  }, [widget, columns, rows])

  const formatValue = (v: number | null, config: KpiWidgetConfig): string => {
    if (v === null) return '--'
    switch (config.format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v)
      case 'percentage':
        return `${v.toFixed(1)}%`
      default:
        return v.toLocaleString(undefined, { maximumFractionDigits: 1 })
    }
  }

  if (widget.config.type === 'kpi') {
    const kpiConfig = widget.config as KpiWidgetConfig
    return (
      <Card data-testid={testId}>
        <CardHeader className="gba:pb-1">
          <CardTitle className="gba:text-xs gba:font-normal gba:text-muted-foreground">{widget.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="gba:text-2xl gba:font-semibold gba:text-foreground">{formatValue(value, kpiConfig)}</p>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">
            {kpiConfig.aggregation} of {kpiConfig.column}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={testId}>
      <CardHeader>
        <CardTitle className="gba:text-xs">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="gba:text-xs gba:text-muted-foreground">{widget.config.type} widget</p>
      </CardContent>
    </Card>
  )
}
