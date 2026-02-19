import React, { useMemo, useState, useCallback } from 'react'
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
import type { BoardColumn, BoardView, BoardViewType, ViewConfig } from '../../types'
import { getPrimaryColumn } from '../../types'

export interface AddViewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: BoardColumn[]
  existingViews: BoardView[]
  onCreate: (view: BoardView) => Promise<void>
  'data-testid'?: string
}

function createId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() || `v_${Date.now()}_${Math.random().toString(36).slice(2)}`
  } catch {
    return `v_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

function defaultViewName(type: BoardViewType, existing: BoardView[]): string {
  const base =
    type === 'table'
      ? 'Table'
      : type === 'kanban'
        ? 'Kanban'
        : type === 'calendar'
          ? 'Calendar'
          : type === 'timeline'
            ? 'Timeline'
            : type === 'form'
              ? 'Form'
              : 'Dashboard'

  const used = new Set(existing.map(v => v.name))
  if (!used.has(base)) return base
  for (let i = 2; i < 50; i++) {
    const candidate = `${base} ${i}`
    if (!used.has(candidate)) return candidate
  }
  return `${base} ${Date.now()}`
}

function firstColumnName(cols: BoardColumn[], predicate: (c: BoardColumn) => boolean): string {
  const c = cols.find(predicate)
  return c?.name || cols[0]?.name || ''
}

export const AddViewDialog: React.FC<AddViewDialogProps> = ({
  open,
  onOpenChange,
  columns,
  existingViews,
  onCreate,
  'data-testid': testId = 'add-view-dialog'
}) => {
  const [type, setType] = useState<BoardViewType>('table')
  const [name, setName] = useState('')

  const statusCandidates = useMemo(() => {
    const preferred = columns.filter(c => c.type === 'status' || c.type === 'select')
    if (preferred.length > 0) return preferred
    return columns.filter(c => c.type === 'text' || c.type === 'multiselect')
  }, [columns])
  const dateCandidates = useMemo(() => columns.filter(c => c.type === 'date' || c.type === 'datetime'), [columns])

  const [kanbanStatus, setKanbanStatus] = useState('')
  const [kanbanTitle, setKanbanTitle] = useState('')

  const [calendarDate, setCalendarDate] = useState('')
  const [calendarTitle, setCalendarTitle] = useState('')

  const [timelineStart, setTimelineStart] = useState('')
  const [timelineEnd, setTimelineEnd] = useState('')
  const [timelineTitle, setTimelineTitle] = useState('')

  const canCreate = useMemo(() => {
    return Boolean(name.trim())
  }, [name])

  const reset = useCallback(() => {
    setType('table')
    setName('')
    setKanbanStatus('')
    setKanbanTitle('')
    setCalendarDate('')
    setCalendarTitle('')
    setTimelineStart('')
    setTimelineEnd('')
    setTimelineTitle('')
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next)
      if (!next) reset()
    },
    [onOpenChange, reset]
  )

  const ensureDefaultsForType = useCallback(
    (nextType: BoardViewType) => {
      const nextName = name.trim() ? name : defaultViewName(nextType, existingViews)
      setName(nextName)

      const primaryName = getPrimaryColumn(columns)?.name || columns[0]?.name || ''

      if (nextType === 'kanban') {
        setKanbanStatus(prev => prev || firstColumnName(statusCandidates, () => true) || primaryName)
        setKanbanTitle(prev => prev || primaryName)
      }
      if (nextType === 'calendar') {
        setCalendarDate(
          prev => prev || firstColumnName(dateCandidates, () => true) || firstColumnName(columns, () => true)
        )
        setCalendarTitle(prev => prev || primaryName)
      }
      if (nextType === 'timeline') {
        const firstDate = firstColumnName(dateCandidates, () => true) || firstColumnName(columns, () => true)
        setTimelineStart(prev => prev || firstDate)
        setTimelineEnd(prev => prev || firstDate)
        setTimelineTitle(prev => prev || primaryName)
      }
    },
    [name, existingViews, columns, statusCandidates, dateCandidates]
  )

  const handleTypeChange = useCallback(
    (nextType: BoardViewType) => {
      setType(nextType)
      ensureDefaultsForType(nextType)
    },
    [ensureDefaultsForType]
  )

  const handleCreate = useCallback(async () => {
    if (!canCreate) return

    const primaryName = getPrimaryColumn(columns)?.name || columns[0]?.name || ''

    let config: ViewConfig
    if (type === 'table') {
      config = { type: 'table', density: 'compact' }
    } else if (type === 'kanban') {
      config = {
        type: 'kanban',
        statusColumn: kanbanStatus || firstColumnName(statusCandidates, () => true) || primaryName,
        titleColumn: kanbanTitle || primaryName
      }
    } else if (type === 'calendar') {
      config = {
        type: 'calendar',
        dateColumn: calendarDate || firstColumnName(dateCandidates, () => true) || primaryName,
        titleColumn: calendarTitle || primaryName
      }
    } else if (type === 'timeline') {
      const fd = firstColumnName(dateCandidates, () => true) || primaryName
      config = {
        type: 'timeline',
        startDateColumn: timelineStart || fd,
        endDateColumn: timelineEnd || fd,
        titleColumn: timelineTitle || primaryName
      }
    } else if (type === 'form') {
      config = { type: 'form', fields: [], layout: 'single', submitLabel: 'Add row' }
    } else {
      config = { type: 'dashboard', widgets: [] }
    }

    const view: BoardView = {
      id: createId(),
      name: name.trim(),
      type,
      isDefault: existingViews.length === 0,
      config
    }

    await onCreate(view)
    handleOpenChange(false)
  }, [
    canCreate,
    type,
    name,
    existingViews.length,
    onCreate,
    handleOpenChange,
    kanbanStatus,
    kanbanTitle,
    calendarDate,
    calendarTitle,
    timelineStart,
    timelineEnd,
    timelineTitle
  ])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Add view</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-3">
          <div>
            <Label className="gba:text-xs" htmlFor={`${testId}-name`}>
              Name
            </Label>
            <Input
              id={`${testId}-name`}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={defaultViewName(type, existingViews)}
              className="gba:h-8 gba:text-xs"
              autoFocus
              data-testid={`${testId}-input-name`}
            />
          </div>

          <div>
            <Label className="gba:text-xs">Type</Label>
            <Select value={type} onValueChange={v => handleTypeChange(v as BoardViewType)}>
              <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-type`}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="kanban">Kanban</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="timeline">Timeline</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'kanban' && (
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              <div>
                <Label className="gba:text-xs">Status column</Label>
                <Select value={kanbanStatus} onValueChange={setKanbanStatus}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-kanban-status`}>
                    <SelectValue placeholder="Pick" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusCandidates.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="gba:text-xs">Title column</Label>
                <Select value={kanbanTitle} onValueChange={setKanbanTitle}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-kanban-title`}>
                    <SelectValue placeholder="Pick" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === 'calendar' && (
            <div className="gba:grid gba:grid-cols-2 gba:gap-2">
              <div>
                <Label className="gba:text-xs">Date column</Label>
                <Select value={calendarDate} onValueChange={setCalendarDate}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-calendar-date`}>
                    <SelectValue placeholder="Pick" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateCandidates.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="gba:text-xs">Title column</Label>
                <Select value={calendarTitle} onValueChange={setCalendarTitle}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-calendar-title`}>
                    <SelectValue placeholder="Pick" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {type === 'timeline' && (
            <div className="gba:space-y-2">
              <div className="gba:grid gba:grid-cols-2 gba:gap-2">
                <div>
                  <Label className="gba:text-xs">Start</Label>
                  <Select value={timelineStart} onValueChange={setTimelineStart}>
                    <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-timeline-start`}>
                      <SelectValue placeholder="Pick" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateCandidates.map(c => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="gba:text-xs">End</Label>
                  <Select value={timelineEnd} onValueChange={setTimelineEnd}>
                    <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-timeline-end`}>
                      <SelectValue placeholder="Pick" />
                    </SelectTrigger>
                    <SelectContent>
                      {dateCandidates.map(c => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="gba:text-xs">Title column</Label>
                <Select value={timelineTitle} onValueChange={setTimelineTitle}>
                  <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-timeline-title`}>
                    <SelectValue placeholder="Pick" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)} data-testid={`${testId}-cancel`}>
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
