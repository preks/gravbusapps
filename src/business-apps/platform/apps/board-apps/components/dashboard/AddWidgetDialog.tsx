import React, { useCallback, useMemo, useState } from 'react'
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
import type { BoardColumn, DashboardWidget, KpiWidgetConfig } from '../../types'

export interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: BoardColumn[]
  onAdd: (widget: DashboardWidget) => void
  'data-testid'?: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `w_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `w_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

export const AddWidgetDialog: React.FC<AddWidgetDialogProps> = ({
  open,
  onOpenChange,
  columns,
  onAdd,
  'data-testid': testId = 'add-widget-dialog'
}) => {
  const [title, setTitle] = useState('')
  const [column, setColumn] = useState('')
  const [aggregation, setAggregation] = useState<'count' | 'sum' | 'avg' | 'min' | 'max'>('count')
  const [format, setFormat] = useState<'number' | 'currency' | 'percentage'>('number')

  const numericColumns = useMemo(() => columns.filter(c => c.type === 'number'), [columns])

  const allColumns = useMemo(() => columns, [columns])
  const targetColumns = aggregation === 'count' ? allColumns : numericColumns

  const canCreate = Boolean(title.trim() && column)

  const handleCreate = useCallback(() => {
    if (!canCreate) return
    const config: KpiWidgetConfig = {
      type: 'kpi',
      column,
      aggregation,
      format
    }
    const widget: DashboardWidget = {
      id: createId(),
      type: 'kpi',
      title: title.trim(),
      config,
      position: { x: 0, y: 0, w: 1, h: 1 }
    }
    onAdd(widget)
    setTitle('')
    setColumn('')
    setAggregation('count')
    setFormat('number')
    onOpenChange(false)
  }, [canCreate, title, column, aggregation, format, onAdd, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Add widget</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-3">
          <div>
            <Label className="gba:text-xs" htmlFor={`${testId}-title`}>
              Title
            </Label>
            <Input
              id={`${testId}-title`}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Total Revenue"
              className="gba:h-8 gba:text-xs"
              autoFocus
              data-testid={`${testId}-input-title`}
            />
          </div>

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
            <Select value={column} onValueChange={setColumn}>
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-column`}>
                <SelectValue placeholder="Pick column" />
              </SelectTrigger>
              <SelectContent>
                {targetColumns.map(c => (
                  <SelectItem key={c.id || c.name} value={c.name}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleCreate} disabled={!canCreate} data-testid={`${testId}-create`}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
