/**
 * BoardTableView - compact, dense table with sticky headers and inline interactions.
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import { toast } from '@newwork/nw-design-system'
import type { BoardRow, BoardColumn, ViewFilter, ViewSort, FilterConnector } from '../types'
import { ColumnSettingsSheet } from '../components/columns/ColumnSettingsSheet'
import { FilterSortToolbar } from '../components/table/FilterSortToolbar'
import { TableHeader } from '../components/table/TableHeader'
import { TableBodyRows } from '../components/table/TableBodyRows'
import { useTableFilterSort } from '../hooks/useTableFilterSort'
import type { ServerFilterParams } from '../hooks/useTableFilterSort'

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
  testId
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const [settingsColumn, setSettingsColumn] = useState<BoardColumn | null>(null)

  useEffect(() => {
    if (!onLoadMore || rowsLoading || !rowsTotalProp) return
    const hasMore = rows.length < rowsTotalProp
    if (!hasMore) return
    const el = loadMoreSentinelRef.current
    if (!el) return
    const root = containerRef.current
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) onLoadMore()
      },
      { root: root ?? undefined, rootMargin: '200px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onLoadMore, rows.length, rowsTotalProp, rowsLoading])

  const fs = useTableFilterSort(rows, columns, {
    initialFilters,
    initialSorts,
    initialConnector,
    onServerParamsChange: onServerFilterChange
  })
  const displayRows = fs.filteredRows

  const sortMap = useMemo(() => {
    const m = new Map<string, { direction: 'asc' | 'desc'; priority: number }>()
    fs.sorts.forEach((s, i) => m.set(s.column, { direction: s.direction, priority: i }))
    return m
  }, [fs.sorts])

  const [selectedCell, setSelectedCell] = useState<{
    rowIndex: number
    colIndex: number
    rowId: string
    colName: string
  } | null>(null)
  const [editingCell, setEditingCell] = useState<{ rowId: string; colName: string } | null>(null)
  const [editInitialKey, setEditInitialKey] = useState<string | undefined>(undefined)
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null)

  useEffect(() => {
    if (!highlightedRowId) {
      setActiveHighlight(null)
      return
    }
    if (!rows.some(r => r.id === highlightedRowId)) return
    if (activeHighlight === highlightedRowId) return
    setActiveHighlight(highlightedRowId)
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector(`[data-testid="${testId}-row-${highlightedRowId}"]`) as HTMLElement
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    const timer = setTimeout(() => {
      setActiveHighlight(null)
      onClearHighlight?.()
    }, 3000)
    return () => clearTimeout(timer)
  }, [highlightedRowId, rows, testId, onClearHighlight, activeHighlight])

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
      if (!selectedCell) return
      if (editingCell) return
      if (e.target !== containerRef.current && !containerRef.current?.contains(e.target as Node)) return

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
    'select',
    'multiselect',
    'boolean',
    'date',
    'datetime',
    'relation',
    'rating',
    'tags'
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
        containerRef.current?.focus()
      }
    },
    [displayRows, columns, editingCell, onUpdateCell]
  )

  const handleSaveEdit = useCallback(
    async (_rowId: string, colName: string, newValue: unknown) => {
      if (!onUpdateCell || !editingCell) return
      try {
        await onUpdateCell(editingCell.rowId, colName, newValue)
      } catch {
        toast.error('Failed to save')
      }
      setEditingCell(null)
      setEditInitialKey(undefined)
      requestAnimationFrame(() => containerRef.current?.focus())
    },
    [onUpdateCell, editingCell]
  )

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null)
    setEditInitialKey(undefined)
    requestAnimationFrame(() => containerRef.current?.focus())
  }, [])

  const handleQuickAddRow = useCallback(async () => {
    if (!onAddRow) return
    const data: Record<string, unknown> = {}
    columns.forEach(col => {
      data[col.name] = col.defaultValue ?? ''
    })
    await onAddRow(data)
  }, [onAddRow, columns])

  if (columns.length === 0)
    return (
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-muted-foreground gba:text-sm gba:gap-2">
        <p>No columns yet.</p>
        <p className="gba:text-xs">Add columns to start building your board.</p>
      </div>
    )

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid={testId}>
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
        data-testid={`${testId}-toolbar`}
      />
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        className="gba:w-full gba:max-w-full gba:min-w-0 gba:flex-1 gba:overflow-auto gba:outline-none"
      >
        <table className="gba:w-max gba:min-w-full gba:border-collapse gba:text-xs gba:table-fixed">
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
            onOpenSettings={c => {
              setSettingsColumn(c)
              setSelectedCell(null)
              setEditingCell(null)
            }}
            testId={testId}
          />
          <TableBodyRows
            boardId={boardId}
            sheetId={sheetId}
            displayRows={displayRows}
            totalRows={rows.length}
            columns={columns}
            activeHighlight={activeHighlight}
            selectedCell={selectedCell}
            editingCell={editingCell}
            editInitialKey={editInitialKey}
            onCellClick={handleCellClick}
            onStartEdit={handleStartEdit}
            onUpdateCell={onUpdateCell}
            onDeleteRow={onDeleteRow}
            onRowClick={onRowClick}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onMoveNext={() => moveSelection(1, 0)}
            onAddRow={onAddRow ? handleQuickAddRow : undefined}
            testId={testId}
          />
        </table>
        {onLoadMore && rowsTotalProp != null && rows.length < rowsTotalProp && (
          <div
            ref={loadMoreSentinelRef}
            className="gba:flex gba:items-center gba:justify-center gba:py-4 gba:w-full"
            data-testid={`${testId}-load-more-sentinel`}
          >
            {rowsLoading ? (
              <Spinner size="sm" />
            ) : (
              <span className="gba:text-xs gba:text-muted-foreground">Scroll for more</span>
            )}
          </div>
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
