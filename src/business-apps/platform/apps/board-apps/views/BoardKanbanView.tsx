/**
 * BoardKanbanView - Kanban board with drag-and-drop between lanes.
 */

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { Virtuoso } from 'react-virtuoso'
import {
  Card,
  CardContent,
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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { GripVertical, FileText, Columns3 } from 'lucide-react'
import type { BoardRow, BoardColumn, KanbanViewConfig } from '../types'

const VIRTUOSO_THRESHOLD = 50

export interface BoardKanbanViewProps {
  scrollParent?: HTMLDivElement | null
  columns: BoardColumn[]
  rows: BoardRow[]
  viewConfig: KanbanViewConfig
  onRowClick?: (row: BoardRow) => void
  onStatusChange?: (rowId: string, columnName: string, newValue: string) => void
  onStatusColumnChange?: (columnName: string) => void
  onCardFieldsChange?: (fields: string[]) => void
  cardFields?: string[]
  highlightedRowId?: string | null
  onClearHighlight?: () => void
  'data-testid'?: string
}

/** Blue-toned palette for lanes (matches chart/graph styling in design system) */
const LANE_BLUE_PALETTE: Array<{ dot: string; headerBg: string; contentBg: string }> = [
  { dot: 'gba:bg-primary', headerBg: 'gba:bg-primary/10', contentBg: 'gba:bg-primary/5' },
  { dot: 'gba:bg-info', headerBg: 'gba:bg-info/10', contentBg: 'gba:bg-info/5' },
  { dot: 'gba:bg-primary', headerBg: 'gba:bg-primary/15', contentBg: 'gba:bg-primary/8' },
  { dot: 'gba:bg-info', headerBg: 'gba:bg-info/15', contentBg: 'gba:bg-info/8' },
  { dot: 'gba:bg-primary', headerBg: 'gba:bg-primary/20', contentBg: 'gba:bg-primary/10' },
  { dot: 'gba:bg-info', headerBg: 'gba:bg-info/20', contentBg: 'gba:bg-info/10' }
]

const UNASSIGNED_LANE = {
  dot: 'gba:bg-muted-foreground',
  headerBg: 'gba:bg-muted/30',
  contentBg: 'gba:bg-muted/10'
}

export const BoardKanbanView: React.FC<BoardKanbanViewProps> = ({
  scrollParent,
  columns,
  rows,
  viewConfig,
  onRowClick,
  onStatusChange,
  onStatusColumnChange,
  onCardFieldsChange,
  cardFields = [],
  highlightedRowId,
  onClearHighlight,
  'data-testid': testId = 'board-kanban'
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [optimisticMoves, setOptimisticMoves] = useState<Map<string, string>>(new Map())
  const highlightedCardRef = useRef<HTMLDivElement | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    if (!highlightedRowId || !highlightedCardRef.current) return
    highlightedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [highlightedRowId])

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
      laneOrderRef.current = ['', ...options.map(o => o.value)]
      return [{ value: '', label: 'Unassigned', colorToken: 'muted' }, ...options]
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
    return sorted.map(v => ({ value: v, label: v || 'Unassigned', colorToken: 'muted' }))
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

  const groupCandidates = useMemo(() => columns.filter(c => c.type !== 'formula'), [columns])

  const toggleCardField = useCallback(
    (name: string) => {
      if (!onCardFieldsChange) return
      onCardFieldsChange(cardFields.includes(name) ? cardFields.filter(f => f !== name) : [...cardFields, name])
    },
    [cardFields, onCardFieldsChange]
  )

  const columnPicker = (
    <div className="gba:flex gba:items-center gba:gap-4 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:bg-card">
      {onStatusColumnChange && groupCandidates.length > 1 && (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Label className="gba:text-sm gba:text-muted-foreground gba:whitespace-nowrap gba:font-medium">
            Group by
          </Label>
          <Select value={statusCol?.name ?? ''} onValueChange={onStatusColumnChange}>
            <SelectTrigger className="gba:h-8 gba:text-sm gba:w-48" data-testid={`${testId}-group-by`}>
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
              className="gba:h-8 gba:text-sm gba:gap-2"
              data-testid={`${testId}-card-fields-btn`}
            >
              <Columns3 className="gba:w-4 gba:h-4" />
              Card fields {cardFields.length > 0 && `(${cardFields.length})`}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="gba:w-56 gba:p-3">
            <p className="gba:text-sm gba:font-semibold gba:mb-3 gba:px-1 gba:text-foreground">Show on cards</p>
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
                  className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-2 gba:rounded-md gba:hover:bg-accent gba:cursor-pointer gba:text-sm gba:select-none"
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
      <div className="gba:flex gba:items-center gba:justify-center gba:min-h-48 gba:p-8">
        <p className="gba:text-sm gba:text-muted-foreground gba:font-medium">No columns available for Kanban view.</p>
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="gba:flex gba:flex-col gba:h-full">
        {columnPicker}
        <div className="gba:flex gba:flex-1 gba:items-center gba:justify-center gba:p-8">
          <div className="gba:text-center gba:space-y-2">
            <p className="gba:text-sm gba:text-muted-foreground gba:font-medium">No rows yet.</p>
            <p className="gba:text-xs gba:text-muted-foreground">Add rows in Table view to see them here.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={args => {
        const byPointer = pointerWithin(args)
        if (byPointer.length > 0) return byPointer
        return rectIntersection(args)
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="gba:flex gba:flex-col gba:min-h-full">
        {columnPicker}
        <div
          className="gba:sticky gba:-top-2 gba:z-10 gba:flex gba:gap-5 gba:px-5 gba:pt-5 gba:pb-2 gba:bg-muted/20 gba:min-w-max gba:shrink-0"
          data-testid={`${testId}-sticky-headers`}
        >
          {lanes.map((lane, i) => {
            const isUnassigned = lane.value === ''
            const nonUnassignedIndex = lanes.slice(0, i).filter(l => l.value !== '').length
            const palette = isUnassigned
              ? UNASSIGNED_LANE
              : LANE_BLUE_PALETTE[nonUnassignedIndex % LANE_BLUE_PALETTE.length]
            const count = (groupedRows.get(lane.value) || []).length
            return (
              <div
                key={lane.value}
                className={`gba:w-72 gba:flex-shrink-0 gba:py-3.5 gba:px-4 gba:rounded-t-xl gba:border-b gba:border-border/50 ${palette.headerBg} gba:bg-card`}
              >
                <div className="gba:flex gba:items-center gba:gap-2.5 gba:w-full">
                  <div className={`gba:w-2.5 gba:h-2.5 gba:rounded-full gba:flex-shrink-0 ${palette.dot}`} />
                  <span className="gba:text-sm gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wider gba:grow gba:truncate">
                    {lane.label}
                  </span>
                  <Badge variant="secondary" size="sm" className="gba:shrink-0 gba:font-medium">
                    {count}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
        <div
          className="gba:flex gba:gap-5 gba:px-5 gba:pb-5 gba:pt-0 gba:bg-muted/20 gba:flex-none gba:min-w-max gba:items-stretch"
          data-testid={testId}
        >
          {lanes.map((lane, i) => {
            const laneRows = groupedRows.get(lane.value) || []
            const isUnassigned = lane.value === ''
            const nonUnassignedIndex = lanes.slice(0, i).filter(l => l.value !== '').length
            const palette = isUnassigned
              ? UNASSIGNED_LANE
              : LANE_BLUE_PALETTE[nonUnassignedIndex % LANE_BLUE_PALETTE.length]

            return (
              <KanbanLane
                key={lane.value}
                laneId={lane.value}
                palette={palette}
                rows={laneRows}
                scrollParent={scrollParent}
                titleColumn={titleColumn}
                descColumn={descColumn}
                cardFields={cardFields}
                allColumns={columns}
                onRowClick={onRowClick}
                highlightedRowId={highlightedRowId}
                highlightedCardRef={highlightedCardRef}
                onClearHighlight={onClearHighlight}
                testId={testId}
              />
            )
          })}
        </div>
      </div>

      <DragOverlay>
        {activeRow && (
          <div className="gba:w-72 gba:opacity-95">
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
  palette: { dot: string; headerBg: string; contentBg: string }
  rows: BoardRow[]
  scrollParent?: HTMLDivElement | null
  titleColumn: string
  descColumn?: string
  cardFields?: string[]
  allColumns?: BoardColumn[]
  onRowClick?: (row: BoardRow) => void
  highlightedRowId?: string | null
  highlightedCardRef?: React.RefObject<HTMLDivElement | null>
  onClearHighlight?: () => void
  testId: string
}

const KanbanLane: React.FC<KanbanLaneProps> = ({
  laneId,
  palette,
  rows,
  scrollParent,
  titleColumn,
  descColumn,
  cardFields,
  allColumns,
  onRowClick,
  highlightedRowId,
  highlightedCardRef,
  onClearHighlight,
  testId
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: laneId })

  return (
    <div ref={setNodeRef} className="gba:flex-shrink-0 gba:h-full gba:min-h-0" data-testid={`${testId}-lane-${laneId}`}>
      <Card
        variant="outlined"
        className={`gba:w-72 gba:min-h-32 gba:flex gba:flex-col gba:overflow-visible gba:transition-all gba:duration-200 gba:h-full gba:rounded-xl gba:rounded-t-none gba:border-0 gba:border-t gba:border-border/50 ${isOver ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background' : ''}`}
      >
        <CardContent
          className={`gba:flex-1 gba:p-4 gba:space-y-4 gba:min-h-24 gba:overflow-visible ${palette.contentBg}`}
        >
          {scrollParent && rows.length > VIRTUOSO_THRESHOLD ? (
            <Virtuoso
              customScrollParent={scrollParent}
              data={rows}
              defaultItemHeight={100}
              itemContent={(_, row) => (
                <div className="gba:[content-visibility:auto] gba:pb-4">
                  <DraggableCard
                    row={row}
                    titleColumn={titleColumn}
                    descColumn={descColumn}
                    cardFields={cardFields}
                    allColumns={allColumns}
                    onRowClick={onRowClick}
                    highlightedRowId={highlightedRowId}
                    highlightedCardRef={row.id === highlightedRowId ? highlightedCardRef : undefined}
                    onClearHighlight={onClearHighlight}
                    testId={testId}
                  />
                </div>
              )}
              computeItemKey={(_, row) => row.id}
            />
          ) : (
            <>
              {rows.map(row => (
                <div key={row.id} className="gba:[content-visibility:auto]">
                  <DraggableCard
                    row={row}
                    titleColumn={titleColumn}
                    descColumn={descColumn}
                    cardFields={cardFields}
                    allColumns={allColumns}
                    onRowClick={onRowClick}
                    highlightedRowId={highlightedRowId}
                    highlightedCardRef={row.id === highlightedRowId ? highlightedCardRef : undefined}
                    onClearHighlight={onClearHighlight}
                    testId={testId}
                  />
                </div>
              ))}
            </>
          )}
          {rows.length === 0 && (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8 gba:grow gba:border-2 gba:border-dashed gba:border-muted-foreground/30 gba:rounded-lg gba:bg-muted/20">
              <span className="gba:text-sm gba:text-muted-foreground gba:font-medium">Drop items here</span>
            </div>
          )}
        </CardContent>
      </Card>
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
  highlightedRowId?: string | null
  highlightedCardRef?: React.RefObject<HTMLDivElement | null>
  onClearHighlight?: () => void
  testId: string
}

const DraggableCard: React.FC<DraggableCardProps> = ({
  row,
  titleColumn,
  descColumn,
  cardFields,
  allColumns,
  onRowClick,
  highlightedRowId,
  highlightedCardRef,
  onClearHighlight,
  testId
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: row.id })

  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      if (highlightedCardRef) (highlightedCardRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    },
    [setNodeRef, highlightedCardRef]
  )

  return (
    <div ref={mergedRef} className={isDragging ? 'gba:opacity-30' : ''}>
      <KanbanCard
        row={row}
        titleColumn={titleColumn}
        descColumn={descColumn}
        cardFields={cardFields}
        allColumns={allColumns}
        onRowClick={onRowClick}
        dragListeners={listeners}
        dragAttributes={attributes}
        isHighlighted={row.id === highlightedRowId}
        onClearHighlight={onClearHighlight}
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
  isHighlighted?: boolean
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
  onClearHighlight?: () => void
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
  isHighlighted,
  dragListeners,
  dragAttributes,
  testId
}) => {
  const hasPage = Boolean((row.data as Record<string, unknown>)?._rowPage)

  return (
    <Card
      variant="outlined"
      className={`gba:group gba:relative gba:p-4 gba:cursor-grab gba:active:gba:cursor-grabbing gba:transition-all gba:duration-300 gba:bg-card-decorative gba:border-0 gba:rounded-xl gba:hover:scale-[1.02] ${isDragging ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background gba:scale-[1.02]' : ''} ${isHighlighted ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background' : ''}`}
      onClick={() => onRowClick?.(row)}
      {...(dragListeners || {})}
      {...(dragAttributes || {})}
      data-testid={testId ? `${testId}-card-${row.id}` : undefined}
    >
      <div className="gba:flex gba:items-start gba:gap-3">
        <div className="gba:mt-0.5 gba:flex-shrink-0 gba:h-8 gba:w-8 gba:rounded-lg gba:bg-decorative-foreground/15 gba:flex gba:items-center gba:justify-center gba:group-hover:gba:bg-decorative-foreground/20 gba:transition-colors">
          <GripVertical className="gba:w-4 gba:h-4 gba:text-decorative-foreground" />
        </div>
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <p className="gba:text-sm gba:font-semibold gba:text-decorative-foreground gba:truncate gba:flex-1 gba:leading-tight">
              {resolveTitle(row.data, titleColumn)}
            </p>
            {hasPage && <FileText className="gba:w-4 gba:h-4 gba:text-decorative-foreground/80 gba:flex-shrink-0" />}
          </div>
          {descColumn && row.data[descColumn] && (
            <p className="gba:text-xs gba:text-decorative-foreground/70 gba:line-clamp-2 gba:mt-1.5 gba:leading-relaxed">
              {String(row.data[descColumn])}
            </p>
          )}
          {cardFields && cardFields.length > 0 && (
            <div className="gba:mt-2 gba:space-y-1 gba:pt-2 gba:border-t gba:border-decorative-foreground/10">
              {cardFields.map(fieldName => {
                const val = row.data[fieldName]
                if (val == null || val === '') return null
                const col = allColumns?.find(c => c.name === fieldName)
                return (
                  <div key={fieldName} className="gba:flex gba:items-baseline gba:gap-2 gba:text-xs">
                    <span className="gba:text-decorative-foreground/60 gba:shrink-0 gba:font-medium">
                      {col?.label || fieldName}:
                    </span>
                    <span className="gba:text-decorative-foreground gba:truncate">{String(val)}</span>
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
