/**
 * BoardKanbanView - Kanban board with drag-and-drop between lanes.
 */

import React, { useMemo, useState, useCallback, useRef } from 'react'
import {
  Card,
  Badge,
  Button,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
  Popover,
  PopoverTrigger,
  PopoverContent
} from '@newwork/nw-design-system'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { GripVertical, FileText, Columns3 } from 'lucide-react'
import type { BoardRow, BoardColumn, KanbanViewConfig } from '../types'

export interface BoardKanbanViewProps {
  columns: BoardColumn[]
  rows: BoardRow[]
  viewConfig: KanbanViewConfig
  onRowClick?: (row: BoardRow) => void
  onStatusChange?: (rowId: string, columnName: string, newValue: string) => void
  onStatusColumnChange?: (columnName: string) => void
  onCardFieldsChange?: (fields: string[]) => void
  cardFields?: string[]
  'data-testid'?: string
}

const TOKEN_BG: Record<string, string> = {
  primary: 'gba:bg-primary',
  success: 'gba:bg-success',
  info: 'gba:bg-info',
  warning: 'gba:bg-warning',
  destructive: 'gba:bg-destructive',
  muted: 'gba:bg-muted-foreground',
  offline: 'gba:bg-offline'
}

const TOKEN_LANE_BG: Record<string, string> = {
  primary: 'gba:bg-primary/5 gba:border-primary/20',
  success: 'gba:bg-success/5 gba:border-success/20',
  info: 'gba:bg-info/5 gba:border-info/20',
  warning: 'gba:bg-warning/5 gba:border-warning/20',
  destructive: 'gba:bg-destructive/5 gba:border-destructive/20',
  muted: 'gba:bg-muted/30 gba:border-muted',
  offline: 'gba:bg-offline/5 gba:border-offline/20'
}

export const BoardKanbanView: React.FC<BoardKanbanViewProps> = ({
  columns,
  rows,
  viewConfig,
  onRowClick,
  onStatusChange,
  onStatusColumnChange,
  onCardFieldsChange,
  cardFields = [],
  'data-testid': testId = 'board-kanban'
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticMoves, setOptimisticMoves] = useState<Map<string, string>>(new Map())

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const statusCol = useMemo(() => {
    const configured = columns.find(c => c.name === viewConfig.statusColumn || c.id === viewConfig.statusColumn)
    if (configured) return configured
    return columns.find(c => c.type === 'status' || c.type === 'select') || columns[0] || null
  }, [columns, viewConfig.statusColumn])

  const laneOrderRef = useRef<string[]>([])

  const lanes = useMemo(() => {
    if (!statusCol) return []
    const options = statusCol.selectOptions || []
    if (options.length > 0) {
      laneOrderRef.current = options.map(o => o.value)
      return options
    }
    const unique = [...new Set(rows.map(r => String(r.data[statusCol.name] ?? '')))]
    if (unique.length === 0) return [{ value: '', label: 'All items', colorToken: 'muted' }]

    const prev = laneOrderRef.current
    const sorted = unique.sort((a, b) => {
      const ai = prev.indexOf(a)
      const bi = prev.indexOf(b)
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
    laneOrderRef.current = sorted
    return sorted.map(v => ({ value: v, label: v || 'No value', colorToken: 'muted' }))
  }, [statusCol, rows])

  const groupedRows = useMemo(() => {
    if (!statusCol) return new Map<string, BoardRow[]>()
    const map = new Map<string, BoardRow[]>()
    for (const lane of lanes) map.set(lane.value, [])
    for (const row of rows) {
      const override = optimisticMoves.get(row.id)
      const val = override !== undefined ? override : String(row.data[statusCol.name] ?? '')
      if (map.has(val)) {
        map.get(val)!.push(row)
      } else {
        const fb = map.get('') || []
        fb.push(row)
        map.set('', fb)
      }
    }
    return map
  }, [statusCol, lanes, rows, optimisticMoves])

  const titleColumn = useMemo(() => {
    if (viewConfig.titleColumn) {
      const exists = columns.find(c => c.name === viewConfig.titleColumn)
      if (exists) return exists.name
    }
    const primary = columns.find(c => c.isPrimary)
    if (primary) return primary.name
    const TITLE_HINTS = ['displayName', 'name', 'title', 'fullName', 'label', 'subject']
    const hinted = columns.find(c => TITLE_HINTS.includes(c.name))
    if (hinted) return hinted.name
    return columns.find(c => c.type === 'text')?.name || columns[0]?.name || ''
  }, [viewConfig.titleColumn, columns])
  const descColumn = viewConfig.descriptionColumn

  const activeRow = useMemo(() => rows.find(r => r.id === activeId), [rows, activeId])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || !statusCol || !onStatusChange) return
      const rowId = String(active.id)
      const targetLane = String(over.id)
      const currentRow = rows.find(r => r.id === rowId)
      if (!currentRow) return
      const currentVal = String(currentRow.data[statusCol.name] ?? '')
      if (currentVal !== targetLane) {
        setOptimisticMoves(prev => new Map(prev).set(rowId, targetLane))
        onStatusChange(rowId, statusCol.name, targetLane)
        setTimeout(
          () =>
            setOptimisticMoves(prev => {
              const n = new Map(prev)
              n.delete(rowId)
              return n
            }),
          2000
        )
      }
    },
    [statusCol, rows, onStatusChange]
  )

  const groupCandidates = useMemo(
    () =>
      columns.filter(c => c.type === 'status' || c.type === 'select' || c.type === 'text' || c.type === 'multiselect'),
    [columns]
  )

  const toggleCardField = useCallback(
    (name: string) => {
      if (!onCardFieldsChange) return
      onCardFieldsChange(cardFields.includes(name) ? cardFields.filter(f => f !== name) : [...cardFields, name])
    },
    [cardFields, onCardFieldsChange]
  )

  const columnPicker = (
    <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-muted/30">
      {onStatusColumnChange && groupCandidates.length > 1 && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Label className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">Group by</Label>
          <Select value={statusCol?.name ?? ''} onValueChange={onStatusColumnChange}>
            <SelectTrigger className="gba:h-7 gba:text-xs gba:w-44" data-testid={`${testId}-group-by`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupCandidates.map(c => (
                <SelectItem key={c.name} value={c.name}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {onCardFieldsChange && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gba:h-7 gba:text-xs gba:gap-1"
              data-testid={`${testId}-card-fields-btn`}
            >
              <Columns3 className="gba:w-3.5 gba:h-3.5" />
              Card fields {cardFields.length > 0 && `(${cardFields.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="gba:w-56 gba:p-2">
            <p className="gba:text-xs gba:font-medium gba:mb-2 gba:px-1">Show on cards</p>
            {columns
              .filter(c => c.name !== titleColumn && c.name !== statusCol?.name)
              .map(col => (
                <div
                  key={col.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleCardField(col.name)}
                  onKeyDown={e => {
                    if (e.key === ' ' || e.key === 'Enter') toggleCardField(col.name)
                  }}
                  className="gba:flex gba:items-center gba:gap-2 gba:px-1 gba:py-1 gba:rounded gba:hover:bg-accent gba:cursor-pointer gba:text-xs gba:select-none"
                  data-testid={`${testId}-card-field-${col.name}`}
                >
                  <Checkbox checked={cardFields.includes(col.name)} tabIndex={-1} />
                  <span className="gba:truncate">{col.label}</span>
                </div>
              ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )

  if (!statusCol) {
    return (
      <div className="gba:p-8 gba:text-center gba:text-muted-foreground gba:text-sm">
        No columns available for Kanban view.
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div>
        {columnPicker}
        <div className="gba:p-8 gba:text-center gba:text-muted-foreground gba:text-sm">
          No rows yet. Add rows in Table view to see them here.
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {columnPicker}
      <div className="gba:flex gba:gap-4 gba:overflow-x-auto gba:p-4 gba:h-full gba:items-start" data-testid={testId}>
        {lanes.map(lane => {
          const laneRows = groupedRows.get(lane.value) || []
          const dotClass = lane.colorToken ? TOKEN_BG[lane.colorToken] || TOKEN_BG.muted : TOKEN_BG.muted
          const laneBg = lane.colorToken ? TOKEN_LANE_BG[lane.colorToken] || TOKEN_LANE_BG.muted : TOKEN_LANE_BG.muted

          return (
            <KanbanLane
              key={lane.value}
              laneId={lane.value}
              label={lane.label}
              dotClass={dotClass}
              laneBg={laneBg}
              count={laneRows.length}
              rows={laneRows}
              titleColumn={titleColumn}
              descColumn={descColumn}
              cardFields={cardFields}
              allColumns={columns}
              onRowClick={onRowClick}
              testId={testId}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeRow && (
          <div className="gba:w-72 gba:opacity-90">
            <KanbanCard
              row={activeRow}
              titleColumn={titleColumn}
              descColumn={descColumn}
              cardFields={cardFields}
              allColumns={columns}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

import { useDroppable, useDraggable } from '@dnd-kit/core'

interface KanbanLaneProps {
  laneId: string
  label: string
  dotClass: string
  laneBg: string
  count: number
  rows: BoardRow[]
  titleColumn: string
  descColumn?: string
  cardFields?: string[]
  allColumns?: BoardColumn[]
  onRowClick?: (row: BoardRow) => void
  testId: string
}

const KanbanLane: React.FC<KanbanLaneProps> = ({
  laneId,
  label,
  dotClass,
  laneBg,
  count,
  rows,
  titleColumn,
  descColumn,
  cardFields,
  allColumns,
  onRowClick,
  testId
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: laneId })

  return (
    <div
      ref={setNodeRef}
      className={`gba:flex-shrink-0 gba:w-72 gba:rounded-xl gba:border gba:flex gba:flex-col gba:min-h-32 gba:transition-colors ${laneBg} ${isOver ? 'gba:ring-2 gba:ring-primary/40' : ''}`}
      data-testid={`${testId}-lane-${laneId}`}
    >
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3">
        <div className={`gba:w-2.5 gba:h-2.5 gba:rounded-full ${dotClass}`} />
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">
          {label}
        </span>
        <Badge variant="secondary" className="gba:text-xs gba:px-1.5 gba:py-0 gba:h-5 gba:ml-auto gba:font-mono">
          {count}
        </Badge>
      </div>
      <div className="gba:flex-1 gba:px-2 gba:pb-2 gba:space-y-2">
        {rows.map(row => (
          <DraggableCard
            key={row.id}
            row={row}
            titleColumn={titleColumn}
            descColumn={descColumn}
            cardFields={cardFields}
            allColumns={allColumns}
            onRowClick={onRowClick}
            testId={testId}
          />
        ))}
        {rows.length === 0 && (
          <div className="gba:py-6 gba:text-center gba:text-xs gba:text-muted-foreground/50">Drop items here</div>
        )}
      </div>
    </div>
  )
}

interface DraggableCardProps {
  row: BoardRow
  titleColumn: string
  descColumn?: string
  cardFields?: string[]
  allColumns?: BoardColumn[]
  onRowClick?: (row: BoardRow) => void
  testId: string
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  row,
  titleColumn,
  descColumn,
  cardFields,
  allColumns,
  onRowClick,
  testId
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: row.id })

  return (
    <div ref={setNodeRef} className={isDragging ? 'gba:opacity-30' : ''}>
      <KanbanCard
        row={row}
        titleColumn={titleColumn}
        descColumn={descColumn}
        cardFields={cardFields}
        allColumns={allColumns}
        onRowClick={onRowClick}
        dragListeners={listeners}
        dragAttributes={attributes}
        testId={testId}
      />
    </div>
  )
}

interface KanbanCardProps {
  row: BoardRow
  titleColumn: string
  descColumn?: string
  cardFields?: string[]
  allColumns?: BoardColumn[]
  onRowClick?: (row: BoardRow) => void
  isDragging?: boolean
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
  testId?: string
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  row,
  titleColumn,
  descColumn,
  cardFields,
  allColumns,
  onRowClick,
  isDragging,
  dragListeners,
  dragAttributes,
  testId
}) => {
  const hasPage = Boolean((row.data as Record<string, unknown>)?._rowPage)

  return (
    <Card
      className={`gba:p-3 gba:cursor-pointer gba:hover:ring-1 gba:hover:ring-primary/30 gba:transition-all gba:bg-card ${isDragging ? 'gba:ring-2 gba:ring-primary' : ''}`}
      onClick={() => onRowClick?.(row)}
      data-testid={testId ? `${testId}-card-${row.id}` : undefined}
    >
      <div className="gba:flex gba:items-start gba:gap-2">
        <button
          className="gba:mt-0.5 gba:cursor-grab gba:text-muted-foreground/40 gba:hover:text-muted-foreground gba:transition-colors gba:flex-shrink-0"
          {...(dragListeners || {})}
          {...(dragAttributes || {})}
          data-testid={testId ? `${testId}-grip-${row.id}` : undefined}
        >
          <GripVertical className="gba:w-3.5 gba:h-3.5" />
        </button>
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate gba:flex-1">
              {resolveTitle(row.data, titleColumn)}
            </p>
            {hasPage && <FileText className="gba:w-3 gba:h-3 gba:text-primary/40 gba:flex-shrink-0" />}
          </div>
          {descColumn && row.data[descColumn] && (
            <p className="gba:text-xs gba:text-muted-foreground gba:line-clamp-2 gba:mt-1">
              {String(row.data[descColumn])}
            </p>
          )}
          {cardFields && cardFields.length > 0 && (
            <div className="gba:mt-1.5 gba:space-y-0.5">
              {cardFields.map(fieldName => {
                const val = row.data[fieldName]
                if (val == null || val === '') return null
                const col = allColumns?.find(c => c.name === fieldName)
                return (
                  <div key={fieldName} className="gba:flex gba:items-baseline gba:gap-1 gba:text-xs">
                    <span className="gba:text-muted-foreground gba:shrink-0">{col?.label || fieldName}:</span>
                    <span className="gba:text-foreground gba:truncate">{String(val)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

const TITLE_FALLBACKS = ['displayName', 'name', 'fullName', 'title', 'label', 'subject', 'firstName']

function resolveTitle(data: Record<string, unknown>, titleColumn: string): string {
  const primary = data[titleColumn]
  if (primary != null && primary !== '') return String(primary)
  for (const key of TITLE_FALLBACKS) {
    const val = data[key]
    if (val != null && val !== '') return String(val)
  }
  const firstNonEmpty = Object.values(data).find(v => v != null && v !== '' && typeof v === 'string')
  return firstNonEmpty ? String(firstNonEmpty) : 'Untitled'
}
