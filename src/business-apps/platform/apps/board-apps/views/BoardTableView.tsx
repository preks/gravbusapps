/**
 * BoardTableView – virtualized, dense table with sticky headers, inline
 * editing, @dnd-kit/sortable row reorder, and infinite scroll.
 *
 * Uses react-virtuoso's TableVirtuoso so only ~25 visible rows exist in the
 * DOM regardless of total row count.  With virtualization, useSortable only
 * runs on the ~25 mounted rows (not all 7 000+), keeping drag smooth.
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Spinner, toast } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { TableVirtuoso } from 'react-virtuoso'
import type { TableVirtuosoHandle } from 'react-virtuoso'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { BoardRow, BoardColumn, BoardQuickFilter, ViewFilter, ViewSort, FilterConnector } from '../types'
import { ColumnSettingsSheet } from '../components/columns/ColumnSettingsSheet'
import { FilterSortToolbar } from '../components/table/FilterSortToolbar'
import { TableHeader, COL_PREFIX } from '../components/table/TableHeader'
import { renderRowCells, VirtuosoTableRow } from '../components/table/TableBodyRows'
import type { VirtuosoContext } from '../components/table/TableBodyRows'
import { useTableFilterSort } from '../hooks/useTableFilterSort'
import type { ServerFilterParams } from '../hooks/useTableFilterSort'
import { useFlowExpandableRows } from '../hooks/useFlowExpandableRows'

export interface BoardTableViewProps {
  columns: BoardColumn[]
  rows: BoardRow[]
  boardId: string
  sheetId: string
  highlightedRowId?: string | null
  onClearHighlight?: () => void
  onAddRow?: (data: Record<string, unknown>) => Promise<void>
  onUpdateCell?: (
    rowId: string,
    columnName: string,
    value: unknown,
    extraData?: Record<string, unknown>
  ) => Promise<void>
  onDeleteRow?: (rowId: string) => void
  onRowClick?: (row: BoardRow) => void
  onAddColumn?: (column: BoardColumn) => void
  onUpdateColumn?: (updated: BoardColumn) => void
  onDeleteColumn?: (columnId: string) => void
  initialFilters?: ViewFilter[]
  initialSorts?: ViewSort[]
  initialConnector?: FilterConnector
  onServerFilterChange?: (params: ServerFilterParams) => void
  rowsTotal?: number
  onLoadMore?: () => void
  rowsLoading?: boolean
  quickFilters?: BoardQuickFilter[]
  onAddQuickFilter?: (qf: BoardQuickFilter) => void
  onRenameQuickFilter?: (id: string, name: string) => void
  onDeleteQuickFilter?: (id: string) => void
  onReorderRow?: (rowId: string, afterRowId: string | null, beforeRowId: string | null) => Promise<void>
  onReorderColumns?: (reordered: BoardColumn[]) => void
  peopleLookup?: Map<string, import('../types/columns').SelectOption>
  focusedCells?: Map<string, import('../hooks/useBoardPresence').CellPresenceEntry>
  onCellFocus?: (rowId: string, columnId: string) => void
  onCellBlur?: () => void
  testId: string
}

export const BoardTableView: React.FC<BoardTableViewProps> = ({
  columns,
  rows,
  boardId,
  sheetId,
  highlightedRowId,
  onClearHighlight,
  onAddRow,
  onUpdateCell,
  onDeleteRow,
  onRowClick,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  initialFilters,
  initialSorts,
  initialConnector,
  onServerFilterChange,
  rowsTotal: rowsTotalProp,
  onLoadMore,
  rowsLoading,
  quickFilters,
  onAddQuickFilter,
  onRenameQuickFilter,
  onDeleteQuickFilter,
  onReorderRow,
  onReorderColumns,
  peopleLookup,
  focusedCells,
  onCellFocus,
  onCellBlur,
  testId
}) => {
  const virtuosoRef = useRef<TableVirtuosoHandle>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [settingsColumn, setSettingsColumn] = useState<BoardColumn | null>(null)

  const hasFlowRows = rows.some(r => r.data.flowId && typeof r.data.flowId === 'string')
  const flowExpand = useFlowExpandableRows()

  const fs = useTableFilterSort(rows, columns, {
    initialFilters,
    initialSorts,
    initialConnector,
    quickFilters,
    onServerParamsChange: onServerFilterChange
  })
  const displayRows = fs.filteredRows

  const hasSortsOrFilters = fs.sorts.length > 0 || fs.filters.length > 0
  const reorderEnabled = Boolean(onReorderRow) && !hasSortsOrFilters
  const hasAddColumnSlot = Boolean(onAddColumn)

  const VirtuosoTable = useMemo(() => {
    type TableProps = React.HTMLAttributes<HTMLTableElement> & { context?: unknown }
    const TableWithColgroup = React.forwardRef<HTMLTableElement, TableProps>(function TableWithColgroup(props, ref) {
      const { children, className, style, context, ...tableProps } = props
      void context
      return (
        <table
          ref={ref}
          {...tableProps}
          style={style}
          className={['gba:table-fixed gba:w-full gba:min-w-full gba:border-collapse gba:text-xs', className]
            .filter(Boolean)
            .join(' ')}
        >
          <colgroup>
            {/* Under fixed layout + w-full, slack width is shared across columns. Lock grip (+ add) fixed; pin all but the last data col to w-40 so only the last data column grows. */}
            {reorderEnabled && <col className="gba:w-7 gba:min-w-7 gba:max-w-7" />}
            {columns.map((col, idx) => {
              const lastData = idx === columns.length - 1
              return <col key={col.id} className={lastData ? 'gba:min-w-40' : 'gba:w-40'} />
            })}
            {hasAddColumnSlot && <col className="gba:w-10 gba:min-w-10 gba:max-w-10" />}
          </colgroup>
          {children}
        </table>
      )
    })
    TableWithColgroup.displayName = 'TableWithColgroup'
    return TableWithColgroup
  }, [reorderEnabled, columns, hasAddColumnSlot])

  // ── @dnd-kit sensors & sortable IDs ────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const sortableIds = useMemo(() => displayRows.map(r => r.id), [displayRows])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const activeId = String(active.id)
      const overId = String(over.id)

      if (activeId.startsWith(COL_PREFIX) && overId.startsWith(COL_PREFIX) && onReorderColumns) {
        const fromColId = activeId.slice(COL_PREFIX.length)
        const toColId = overId.slice(COL_PREFIX.length)
        const fromIdx = columns.findIndex(c => c.id === fromColId)
        const toIdx = columns.findIndex(c => c.id === toColId)
        if (fromIdx === -1 || toIdx === -1) return
        const next = [...columns]
        const [moved] = next.splice(fromIdx, 1)
        next.splice(toIdx, 0, moved)
        onReorderColumns(next)
        return
      }

      if (!onReorderRow) return
      const oldIdx = displayRows.findIndex(r => r.id === activeId)
      const overIdx = displayRows.findIndex(r => r.id === overId)
      if (oldIdx === -1 || overIdx === -1) return

      const withoutDragged = displayRows.filter(r => r.id !== activeId)
      const targetIdx = withoutDragged.findIndex(r => r.id === overId)
      if (targetIdx === -1) return

      let afterRowId: string | null
      let beforeRowId: string | null

      if (overIdx < oldIdx) {
        afterRowId = targetIdx > 0 ? withoutDragged[targetIdx - 1].id : null
        beforeRowId = overId
      } else {
        afterRowId = overId
        beforeRowId = targetIdx < withoutDragged.length - 1 ? withoutDragged[targetIdx + 1].id : null
      }

      onReorderRow(activeId, afterRowId, beforeRowId)
    },
    [displayRows, columns, onReorderRow, onReorderColumns]
  )

  // ── Sort map ──────────────────────────────────────────────────────────

  const sortMap = useMemo(() => {
    const m = new Map<string, { direction: 'asc' | 'desc'; priority: number }>()
    fs.sorts.forEach((s, i) => m.set(s.column, { direction: s.direction, priority: i }))
    return m
  }, [fs.sorts])

  // ── Cell selection / editing state ──────────────────────────────────────

  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number
    colIndex: number
    rowId: string
    colName: string
  } | null>(null)
  const [editingCell, setEditingCell] = useState<{ rowId: string; colName: string } | null>(null)
  const [editInitialKey, setEditInitialKey] = useState<string | undefined>(undefined)
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null)

  // ── Row highlighting with scroll-to ─────────────────────────────────────

  useEffect(() => {
    if (!highlightedRowId) {
      setActiveHighlight(null)
      return
    }
    if (!rows.some(r => r.id === highlightedRowId)) return
    if (activeHighlight === highlightedRowId) return
    setActiveHighlight(highlightedRowId)
    const idx = displayRows.findIndex(r => r.id === highlightedRowId)
    if (idx >= 0) virtuosoRef.current?.scrollToIndex({ index: idx, behavior: 'smooth', align: 'center' })
    const timer = setTimeout(() => {
      setActiveHighlight(null)
      onClearHighlight?.()
    }, 3000)
    return () => clearTimeout(timer)
  }, [highlightedRowId, rows, displayRows, onClearHighlight, activeHighlight])

  // ── Keyboard grid navigation ────────────────────────────────────────────

  const columnKeys = useMemo(() => columns.map(c => c.name), [columns])

  const handleStartEdit = useCallback(
    (rowId: string, colName: string, _currentValue: unknown, initial?: string) => {
      if (!onUpdateCell) return
      setEditingCell({ rowId, colName })
      setEditInitialKey(initial)
    },
    [onUpdateCell]
  )

  const moveSelection = useCallback(
    (dr: number, dc: number) => {
      setSelectedCell(prev => {
        if (!prev) return prev
        const nextRow = Math.max(0, Math.min(displayRows.length - 1, prev.rowIndex + dr))
        const nextCol = Math.max(0, Math.min(columns.length - 1, prev.colIndex + dc))
        const nextRowId = displayRows[nextRow]?.id
        const nextColName = columnKeys[nextCol]
        if (!nextRowId || !nextColName) return prev
        return { rowIndex: nextRow, colIndex: nextCol, rowId: nextRowId, colName: nextColName }
      })
    },
    [displayRows, columns.length, columnKeys]
  )

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!selectedCell || editingCell) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveSelection(1, 0)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveSelection(-1, 0)
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        moveSelection(0, 1)
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        moveSelection(0, -1)
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const row = displayRows[selectedCell.rowIndex]
        const col = columns[selectedCell.colIndex]
        if (row && col && col.isEditable) handleStartEdit(row.id, col.name, row.data[col.name])
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedCell(null)
      }

      const isTextInput = e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey
      if (isTextInput) {
        const row = displayRows[selectedCell.rowIndex]
        const col = columns[selectedCell.colIndex]
        if (row && col && col.isEditable) {
          e.preventDefault()
          handleStartEdit(row.id, col.name, row.data[col.name], e.key)
        }
      }
    },
    [selectedCell, editingCell, moveSelection, displayRows, columns, handleStartEdit]
  )

  const CLICK_TO_EDIT_TYPES = new Set([
    'status',
    'priority',
    'select',
    'multiselect',
    'boolean',
    'date',
    'datetime',
    'relation',
    'rating',
    'tags',
    'people'
  ])

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number) => {
      const row = displayRows[rowIndex]
      const col = columns[colIndex]
      if (!row || !col) return
      setSelectedCell({ rowIndex, colIndex, rowId: row.id, colName: col.name })
      if (editingCell) {
        setEditingCell(null)
        setEditInitialKey(undefined)
      }
      if (col.isEditable && CLICK_TO_EDIT_TYPES.has(col.type) && onUpdateCell) {
        setEditingCell({ rowId: row.id, colName: col.name })
        setEditInitialKey(undefined)
      } else {
        wrapperRef.current?.focus()
      }
    },
    [displayRows, columns, editingCell, onUpdateCell]
  )

  const handleSaveEdit = useCallback(
    async (_rowId: string, colName: string, newValue: unknown, extraData?: Record<string, unknown>) => {
      if (!onUpdateCell || !editingCell) return
      try {
        await onUpdateCell(editingCell.rowId, colName, newValue, extraData)
      } catch {
        toast.error('Failed to save')
      }
      setEditingCell(null)
      setEditInitialKey(undefined)
      requestAnimationFrame(() => wrapperRef.current?.focus())
    },
    [onUpdateCell, editingCell]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditInitialKey(undefined)
    requestAnimationFrame(() => wrapperRef.current?.focus())
  }, [])

  const handleQuickAddRow = useCallback(async () => {
    if (!onAddRow) return
    const data: Record<string, unknown> = {}
    columns.forEach(col => {
      data[col.name] = col.defaultValue ?? ''
    })
    await onAddRow(data)
  }, [onAddRow, columns])

  const handleEndReached = useCallback(() => {
    if (!onLoadMore || rowsLoading) return
    if (rowsTotalProp == null || rows.length >= rowsTotalProp) return
    onLoadMore()
  }, [onLoadMore, rowsLoading, rows.length, rowsTotalProp])

  // ── Cell presence emission ──────────────────────────────────────────────

  useEffect(() => {
    if (selectedCell && onCellFocus) {
      onCellFocus(selectedCell.rowId, selectedCell.colName)
    } else if (!selectedCell && onCellBlur) {
      onCellBlur()
    }
  }, [selectedCell, onCellFocus, onCellBlur])

  // ── Virtuoso context ────────────────────────────────────────────────────

  const virtuosoContext: VirtuosoContext = useMemo(
    () => ({
      columns,
      boardId,
      sheetId,
      reorderEnabled,
      activeHighlight,
      selectedCell,
      editingCell,
      editInitialKey,
      onCellClick: handleCellClick,
      onStartEdit: handleStartEdit,
      onUpdateCell,
      onDeleteRow,
      onRowClick,
      onSaveEdit: handleSaveEdit,
      onCancelEdit: handleCancelEdit,
      onMoveNext: () => moveSelection(1, 0),
      onMoveRow: onReorderRow,
      displayRows,
      hasFlowRows,
      isFlowExpanded: hasFlowRows ? flowExpand.isExpanded : undefined,
      getFlowSubRows: hasFlowRows ? flowExpand.getSubRows : undefined,
      onToggleFlowExpand: hasFlowRows ? row => void flowExpand.toggleExpand(row) : undefined,
      peopleLookup,
      focusedCells,
      testId,
      onAddRow: onAddRow ? handleQuickAddRow : undefined
    }),

    [
      columns,
      boardId,
      sheetId,
      reorderEnabled,
      activeHighlight,
      selectedCell,
      editingCell,
      editInitialKey,
      handleCellClick,
      handleStartEdit,
      onUpdateCell,
      onDeleteRow,
      onRowClick,
      handleSaveEdit,
      handleCancelEdit,
      moveSelection,
      onReorderRow,
      displayRows,
      hasFlowRows,
      flowExpand,
      peopleLookup,
      focusedCells,
      testId,
      onAddRow,
      handleQuickAddRow
    ]
  )

  // ── Empty state ─────────────────────────────────────────────────────────

  if (columns.length === 0)
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-muted-foreground gba:text-sm gba:gap-2">
        <p>No columns yet.</p>
        <p className="gba:text-xs">Add columns to start building your board.</p>
      </div>
    )

  const colSpan = columns.length + (reorderEnabled ? 1 : 0)

  const tableContent = (
    <TableVirtuoso
      ref={virtuosoRef}
      style={{ height: '100%', width: '100%' }}
      data={displayRows}
      context={virtuosoContext}
      overscan={200}
      endReached={handleEndReached}
      increaseViewportBy={400}
      fixedHeaderContent={() => (
        <TableHeader
          columns={columns}
          boardId={boardId}
          sheetId={sheetId}
          sortMap={sortMap}
          sortCount={fs.sorts.length}
          onToggleSort={fs.toggleColumnSort}
          onUpdateColumn={onUpdateColumn}
          onDeleteColumn={onDeleteColumn}
          onAddColumn={onAddColumn}
          reorderEnabled={reorderEnabled}
          columnReorderEnabled={Boolean(onReorderColumns)}
          onOpenSettings={c => {
            setSettingsColumn(c)
            setSelectedCell(null)
            setEditingCell(null)
          }}
          testId={testId}
        />
      )}
      fixedFooterContent={
        onAddRow || (rowsLoading && onLoadMore)
          ? () => (
              <tr>
                <td colSpan={colSpan + (onAddColumn ? 1 : 0)} className="gba:px-2.5 gba:py-1 gba:border-b">
                  {rowsLoading && onLoadMore && rowsTotalProp != null && rows.length < rowsTotalProp && (
                    <div
                      className="gba:flex gba:items-center gba:justify-center gba:py-1"
                      data-testid={`${testId}-load-more-sentinel`}
                    >
                      <Spinner size="sm" />
                    </div>
                  )}
                  {onAddRow && (
                    <button
                      onClick={handleQuickAddRow}
                      className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:py-0.5"
                      data-testid={`${testId}-quick-add`}
                    >
                      <Plus className="gba:w-3 gba:h-3" /> New row
                    </button>
                  )}
                </td>
              </tr>
            )
          : undefined
      }
      computeItemKey={(_index, row) => row.id}
      itemContent={renderRowCells}
      components={{
        Table: VirtuosoTable as any,
        TableRow: VirtuosoTableRow as any
      }}
    />
  )

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0" data-testid={testId}>
      <FilterSortToolbar
        columns={columns}
        filters={fs.filters}
        sorts={fs.sorts}
        connector={fs.connector}
        filteredCount={displayRows.length}
        totalCount={rowsTotalProp ?? rows.length}
        onAddFilter={fs.addFilter}
        onUpdateFilter={fs.updateFilter}
        onRemoveFilter={fs.removeFilter}
        onAddSort={fs.addSort}
        onUpdateSort={fs.updateSort}
        onRemoveSort={fs.removeSort}
        onSetConnector={fs.setConnector}
        onClearAll={fs.clearAll}
        quickSearch={fs.quickSearch}
        onQuickSearchChange={fs.setQuickSearch}
        isSearching={Boolean(rowsLoading && fs.serverParams.search?.trim())}
        quickFilters={quickFilters}
        activeQuickFilterIds={fs.activeQuickFilterIds}
        onToggleQuickFilter={fs.toggleQuickFilter}
        onAddQuickFilter={onAddQuickFilter}
        onRenameQuickFilter={onRenameQuickFilter}
        onDeleteQuickFilter={onDeleteQuickFilter}
        data-testid={`${testId}-toolbar`}
      />

      <div
        ref={wrapperRef}
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        className="gba:w-full gba:max-w-full gba:min-w-0 gba:flex-1 gba:overflow-hidden gba:outline-none"
      >
        {displayRows.length === 0 ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-muted-foreground gba:text-sm gba:gap-2">
            <p>{rows.length > 0 ? 'No rows match the current filters.' : 'No rows yet.'}</p>
            {onAddRow && (
              <button
                onClick={handleQuickAddRow}
                className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
                data-testid={`${testId}-quick-add`}
              >
                <Plus className="gba:w-3 gba:h-3" /> New row
              </button>
            )}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={reorderEnabled ? sortableIds : []} strategy={verticalListSortingStrategy}>
              {tableContent}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {settingsColumn && onUpdateColumn && (
        <ColumnSettingsSheet
          open={Boolean(settingsColumn)}
          onOpenChange={open => {
            if (!open) setSettingsColumn(null)
          }}
          column={settingsColumn}
          allColumns={columns}
          currentBoardId={boardId}
          currentSheetId={sheetId}
          onSave={updated => {
            onUpdateColumn(updated)
            setSettingsColumn(null)
          }}
          data-testid={`${testId}-col-settings`}
        />
      )}
    </div>
  )
}
