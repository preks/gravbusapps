/**
 * TableBodyRows - renders table body rows with inline editing, context menus,
 * and row-page icons. Extracted from BoardTableView to keep file sizes manageable.
 */

import React from 'react'
import { toast } from '@newwork/nw-design-system'
import { Plus, FileText, FilePlus } from 'lucide-react'
import type { BoardRow, BoardColumn } from '../../types'
import { RelationPicker } from '../RelationPicker'
import { CellRenderer } from './CellRenderer'
import { CellEditor } from './CellEditor'
import { CellContextMenu } from './CellContextMenu'

export interface TableBodyRowsProps {
  boardId: string
  sheetId: string
  displayRows: BoardRow[]
  totalRows: number
  columns: BoardColumn[]
  activeHighlight: string | null
  selectedCell: { rowId: string; colName: string } | null
  editingCell: { rowId: string; colName: string } | null
  editInitialKey?: string
  onCellClick: (rowIndex: number, colIndex: number) => void
  onStartEdit: (rowId: string, colName: string, currentValue: unknown, initial?: string) => void
  onUpdateCell?: (
    rowId: string,
    columnName: string,
    value: unknown,
    extraData?: Record<string, unknown>
  ) => Promise<void>
  onDeleteRow?: (rowId: string) => void
  onRowClick?: (row: BoardRow) => void
  onSaveEdit: (rowId: string, colName: string, newValue: unknown) => void
  onCancelEdit: () => void
  onMoveNext: () => void
  onAddRow?: () => void
  testId: string
}

export const TableBodyRows: React.FC<TableBodyRowsProps> = ({
  boardId,
  sheetId,
  displayRows,
  totalRows,
  columns,
  activeHighlight,
  selectedCell,
  editingCell,
  editInitialKey,
  onCellClick,
  onStartEdit,
  onUpdateCell,
  onDeleteRow,
  onRowClick,
  onSaveEdit,
  onCancelEdit,
  onMoveNext,
  onAddRow,
  testId
}) => {
  return (
    <tbody>
      {displayRows.map((row, rowIndex) => (
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
                onEdit={() => onStartEdit(row.id, col.name, row.data[col.name])}
                onClear={onUpdateCell ? () => void onUpdateCell(row.id, col.name, null) : () => {}}
                onOpenRowPage={onRowClick ? () => onRowClick(row) : undefined}
                onDeleteRow={onDeleteRow ? () => onDeleteRow(row.id) : undefined}
                data-testid={`${testId}-ctx-${row.id}-${col.name}`}
              >
                <td
                  className={`gba:px-2.5 gba:py-1.5 gba:border-b gba:border-r gba:truncate gba:w-40 ${
                    isSelected ? 'gba:ring-2 gba:ring-primary gba:ring-inset gba:bg-primary/5' : ''
                  } ${onUpdateCell ? 'gba:cursor-cell' : ''}`}
                  onClick={() => onCellClick(rowIndex, colIndex)}
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
                        onChange={async (ids, labels) => {
                          try {
                            await onUpdateCell(row.id, col.name, ids, { [`_rel_${col.name}`]: labels })
                          } catch {
                            toast.error('Failed to save')
                          }
                          onCancelEdit()
                        }}
                        data-testid={`${testId}-relation-${row.id}-${col.name}`}
                      />
                    ) : (
                      <CellEditor
                        column={col}
                        value={row.data[col.name]}
                        initialKey={editInitialKey}
                        boardId={boardId}
                        sheetId={sheetId}
                        onSave={async newValue => {
                          onSaveEdit(row.id, col.name, newValue)
                        }}
                        onCancel={onCancelEdit}
                        onMoveNext={onMoveNext}
                      />
                    )
                  ) : (
                    <div className="gba:flex gba:items-center gba:gap-1">
                      <span className={`gba:flex-1 gba:truncate ${colIndex === 0 ? 'gba:font-medium' : ''}`}>
                        <CellRenderer
                          value={row.data[col.name]}
                          type={col.type}
                          columnName={col.name}
                          options={col.selectOptions}
                          isPrimary={!!col.isPrimary}
                          rowData={row.data}
                        />
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

      {onAddRow && (
        <tr>
          <td colSpan={columns.length} className="gba:px-2.5 gba:py-1 gba:border-b">
            <button
              onClick={onAddRow}
              className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:py-0.5"
              data-testid={`${testId}-quick-add`}
            >
              <Plus className="gba:w-3 gba:h-3" /> New row
            </button>
          </td>
        </tr>
      )}

      {displayRows.length === 0 && (
        <tr>
          <td colSpan={columns.length} className="gba:px-4 gba:py-8 gba:text-center gba:text-muted-foreground">
            {totalRows > 0 ? 'No rows match the current filters.' : 'No rows yet.'}
          </td>
        </tr>
      )}
    </tbody>
  )
}
