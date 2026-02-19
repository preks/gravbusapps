/**
 * BoardTableView - compact, dense table with sticky headers and inline interactions.
 */

import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { toast } from '@newwork/nw-design-system'
import { Plus, FileText, FilePlus } from 'lucide-react'
import type { BoardRow, BoardColumn } from '../types'
import { RelationPicker } from '../components/RelationPicker'
import { AddColumnPopover } from '../components/columns/AddColumnPopover'
import { CellRenderer } from '../components/table/CellRenderer'
import { CellEditor } from '../components/table/CellEditor'
import { ColumnHeaderMenu } from '../components/table/ColumnHeaderMenu'
import { CellContextMenu } from '../components/table/CellContextMenu'
import { ColumnSettingsSheet } from '../components/columns/ColumnSettingsSheet'

export interface BoardTableViewProps {
  columns: BoardColumn[]
  rows: BoardRow[]
  boardId: string
  sheetId: string
  highlightedRowId?: string | null
  onClearHighlight?: () => void
  onAddRow?: (data: Record<string, unknown>) => Promise<void>
  onUpdateCell?: (rowId: string, columnName: string, value: unknown) => Promise<void>
  onRowClick?: (row: BoardRow) => void
  onAddColumn?: (column: BoardColumn) => void
  onUpdateColumn?: (updated: BoardColumn) => void
  onDeleteColumn?: (columnId: string) => void
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
  onRowClick,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  testId
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [settingsColumn, setSettingsColumn] = useState<BoardColumn | null>(null)

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
        const nextRow = Math.max(0, Math.min(rows.length - 1, prev.rowIndex + dr))
        const nextCol = Math.max(0, Math.min(columns.length - 1, prev.colIndex + dc))
        const nextRowId = rows[nextRow]?.id
        const nextColName = columnKeys[nextCol]
        if (!nextRowId || !nextColName) return prev
        return { rowIndex: nextRow, colIndex: nextCol, rowId: nextRowId, colName: nextColName }
      })
    },
    [rows, columns.length, columnKeys]
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
        const row = rows[selectedCell.rowIndex]
        const col = columns[selectedCell.colIndex]
        if (row && col && col.isEditable) handleStartEdit(row.id, col.name, row.data[col.name])
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedCell(null)
      }

      const isTextInput = e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey
      if (isTextInput) {
        const row = rows[selectedCell.rowIndex]
        const col = columns[selectedCell.colIndex]
        if (row && col && col.isEditable) {
          e.preventDefault()
          handleStartEdit(row.id, col.name, row.data[col.name], e.key)
        }
      }
    },
    [selectedCell, editingCell, moveSelection, rows, columns, handleStartEdit]
  )

  const CLICK_TO_EDIT_TYPES = new Set(['status', 'select', 'multiselect', 'boolean', 'date', 'datetime'])

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number) => {
      const row = rows[rowIndex]
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
    [rows, columns, editingCell, onUpdateCell]
  )

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
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleGridKeyDown}
      className="gba:w-full gba:max-w-full gba:min-w-0 gba:h-full gba:overflow-auto gba:outline-none"
      data-testid={testId}
    >
      <table className="gba:w-max gba:min-w-full gba:border-collapse gba:text-xs gba:table-fixed">
        <thead className="gba:sticky gba:top-0 gba:z-10">
          <tr className="gba:bg-muted/60">
            {columns.map(col => (
              <th
                key={col.id || col.name}
                className="gba:px-2.5 gba:py-1.5 gba:text-left gba:font-medium gba:text-muted-foreground gba:border-b gba:border-r gba:whitespace-nowrap gba:w-40"
              >
                {onUpdateColumn && onDeleteColumn ? (
                  <ColumnHeaderMenu
                    column={col}
                    onRename={(colId, newLabel) => {
                      const updated = columns.find(c => c.id === colId)
                      if (updated) onUpdateColumn({ ...updated, label: newLabel })
                    }}
                    onOpenSettings={c => {
                      setSettingsColumn(c)
                      setSelectedCell(null)
                      setEditingCell(null)
                    }}
                    onHide={colId => {
                      const updated = columns.find(c => c.id === colId)
                      if (updated) onUpdateColumn({ ...updated, isVisible: false })
                    }}
                    onDelete={onDeleteColumn}
                    data-testid={`${testId}-col-menu-${col.id}`}
                  />
                ) : (
                  <span className="gba:flex gba:items-center gba:gap-1.5">{col.label}</span>
                )}
              </th>
            ))}
            {onAddColumn && (
              <th className="gba:px-1 gba:py-1.5 gba:border-b gba:w-10">
                <AddColumnPopover
                  existingColumns={columns}
                  onAdd={onAddColumn}
                  data-testid={`${testId}-add-col-popover`}
                >
                  <button
                    className="gba:w-7 gba:h-7 gba:flex gba:items-center gba:justify-center gba:rounded gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                    data-testid={`${testId}-add-col`}
                  >
                    <Plus className="gba:w-3.5 gba:h-3.5" />
                  </button>
                </AddColumnPopover>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              className={`gba:transition-colors gba:group ${
                activeHighlight === row.id ? 'gba:bg-primary/10 gba:animate-pulse' : 'gba:hover:bg-muted/20'
              }`}
              data-testid={`${testId}-row-${row.id}`}
            >
              {columns.map((col, colIndex) => {
                const isEditing = editingCell?.rowId === row.id && editingCell?.colName === col.name
                const isSelected = selectedCell?.rowId === row.id && selectedCell?.colName === col.name && !isEditing

                return (
                  <CellContextMenu
                    key={col.id || col.name}
                    value={row.data[col.name]}
                    onEdit={() => handleStartEdit(row.id, col.name, row.data[col.name])}
                    onClear={onUpdateCell ? () => void onUpdateCell(row.id, col.name, null) : () => {}}
                    onOpenRowPage={onRowClick ? () => onRowClick(row) : undefined}
                    data-testid={`${testId}-ctx-${row.id}-${col.name}`}
                  >
                    <td
                      className={`gba:px-2.5 gba:py-1.5 gba:border-b gba:border-r gba:truncate gba:w-40 ${
                        isSelected ? 'gba:ring-2 gba:ring-primary gba:ring-inset gba:bg-primary/5' : ''
                      } ${onUpdateCell ? 'gba:cursor-cell' : ''}`}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      data-testid={`${testId}-cell-${row.id}-${col.name}`}
                    >
                      {isEditing ? (
                        col.type === 'relation' && col.relationConfig && onUpdateCell ? (
                          <RelationPicker
                            config={col.relationConfig}
                            selectedIds={
                              Array.isArray(row.data[col.name])
                                ? ((row.data[col.name] as unknown[]).filter(x => typeof x === 'string') as string[])
                                : []
                            }
                            onChange={async ids => {
                              try {
                                await onUpdateCell(row.id, col.name, ids)
                              } catch {
                                toast.error('Failed to save')
                              }
                              setEditingCell(null)
                            }}
                            data-testid={`${testId}-relation-${row.id}-${col.name}`}
                          />
                        ) : (
                          <CellEditor
                            column={col}
                            value={row.data[col.name]}
                            initialKey={editInitialKey}
                            onSave={async newValue => {
                              if (!onUpdateCell) return
                              try {
                                await onUpdateCell(row.id, col.name, newValue)
                              } catch {
                                toast.error('Failed to save')
                              }
                              setEditingCell(null)
                              setEditInitialKey(undefined)
                              requestAnimationFrame(() => containerRef.current?.focus())
                            }}
                            onCancel={() => {
                              setEditingCell(null)
                              setEditInitialKey(undefined)
                              requestAnimationFrame(() => containerRef.current?.focus())
                            }}
                            onMoveNext={() => moveSelection(1, 0)}
                          />
                        )
                      ) : (
                        <div className="gba:flex gba:items-center gba:gap-1">
                          <span className={`gba:flex-1 gba:truncate ${colIndex === 0 ? 'gba:font-medium' : ''}`}>
                            <CellRenderer value={row.data[col.name]} type={col.type} options={col.selectOptions} />
                          </span>
                          {colIndex === 0 && onRowClick && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation()
                                onRowClick(row)
                              }}
                              className="gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:hover:bg-muted/60 gba:transition-colors"
                              data-testid={`${testId}-open-row-${row.id}`}
                            >
                              {(row.data as Record<string, unknown>)._rowPage ? (
                                <FileText className="gba:w-3.5 gba:h-3.5 gba:text-primary/60 gba:hover:text-primary" />
                              ) : (
                                <FilePlus className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/30 gba:hover:text-primary" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </CellContextMenu>
                )
              })}
            </tr>
          ))}

          {/* Quick-add row at bottom */}
          {onAddRow && (
            <tr>
              <td colSpan={columns.length} className="gba:px-2.5 gba:py-1 gba:border-b">
                <button
                  onClick={handleQuickAddRow}
                  className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:py-0.5"
                  data-testid={`${testId}-quick-add`}
                >
                  <Plus className="gba:w-3 gba:h-3" /> New row
                </button>
              </td>
            </tr>
          )}

          {rows.length === 0 && !onAddRow && (
            <tr>
              <td colSpan={columns.length} className="gba:px-4 gba:py-8 gba:text-center gba:text-muted-foreground">
                No rows yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

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
