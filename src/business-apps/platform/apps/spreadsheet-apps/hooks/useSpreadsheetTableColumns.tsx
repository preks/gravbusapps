/**
 * useSpreadsheetTableColumns
 *
 * Generates table column definitions for TanStack Table with inline editing support.
 * Handles entity data source columns (read-only) and custom columns (editable).
 */

import { useMemo } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Button } from '@newwork/nw-design-system'
import { Plus, Trash2, Database, User } from 'lucide-react'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types'
import type { SelectedCell } from './useSpreadsheetCellSelection'
import type { FormulaSelectionMode } from './useSpreadsheetFormulas'
import { isTrackingColumn } from '../utils/trackingColumns'
import { normalizeImageSrc } from '../utils/normalizeImageSrc'
import { ColumnHeader, EditableCell } from '../views'

// Re-use DocumentParticipant type for cursor participants
export interface CursorParticipant {
  id?: string
  odtId?: string
  odtVersion?: number
  userId: string
  userName?: string
  avatarUrl?: string
  color?: string
  cursor?: { path?: string[]; line?: number; column?: number }
}

export interface UseSpreadsheetTableColumnsProps {
  activeSheet: SpreadsheetSheet | null
  visibleColumns: SpreadsheetColumn[]
  filteredData: Record<string, unknown>[]
  isEditing: boolean
  canEdit: boolean

  // Cell change handler
  handleCellChange: (rowId: string, columnName: string, value: unknown) => void
  handleDeleteRow: (rowId: string) => void

  // Formula support (use refs to avoid re-renders)
  handleFormulaCellSelect: (rowIndex: number, colIndex: number, isRangeEnd?: boolean) => void
  formulaSelectionModeRef: React.MutableRefObject<FormulaSelectionMode | null>
  setFormulaSelectionMode: (mode: FormulaSelectionMode | null) => void
  formulaSelectedCellsRef: React.MutableRefObject<Array<{ rowIndex: number; colIndex: number }>>
  currentFormulaValueRef: React.MutableRefObject<string>
  setCurrentFormulaDisplay: (value: string | null) => void

  // Cell selection (use refs to avoid re-renders)
  selectedCellRef: React.MutableRefObject<SelectedCell | null>
  setSelectedCell: (cell: SelectedCell | null) => void

  // Collaboration (use refs to avoid re-renders)
  cursorParticipantsRef: React.MutableRefObject<CursorParticipant[]>
  emitCursorImmediate: (rowId: string, colId: string, rowIndex: number, colIndex: number) => void

  // Column editing
  editingColumnIdRef: React.MutableRefObject<string | null>
  editingColumnLabelRef: React.MutableRefObject<string>
  setEditingColumnId: (id: string | null) => void
  setEditingColumnLabel: (label: string) => void
  handleRenameColumnRef: React.MutableRefObject<(columnId: string, newLabel: string) => void>
  handleDeleteColumn: (columnId: string) => void
  handleReorderColumnsRef: React.MutableRefObject<(draggedId: string, targetId: string) => void>
  handleAddColumnRef: React.MutableRefObject<() => void>

  // For cell editing state
  isEditingRef: React.MutableRefObject<boolean>

  // Access token for EditableCell
  accessToken: string
}

export function useSpreadsheetTableColumns({
  activeSheet,
  visibleColumns,
  filteredData,
  isEditing,
  canEdit,
  handleCellChange,
  handleDeleteRow,
  handleFormulaCellSelect,
  formulaSelectionModeRef,
  setFormulaSelectionMode,
  formulaSelectedCellsRef,
  currentFormulaValueRef,
  setCurrentFormulaDisplay,
  selectedCellRef,
  setSelectedCell,
  cursorParticipantsRef,
  emitCursorImmediate,
  editingColumnIdRef,
  editingColumnLabelRef,
  setEditingColumnId,
  setEditingColumnLabel,
  handleRenameColumnRef,
  handleDeleteColumn,
  handleReorderColumnsRef,
  handleAddColumnRef,
  isEditingRef,
  accessToken
}: UseSpreadsheetTableColumnsProps): ColumnDef<Record<string, unknown>>[] {
  return useMemo(() => {
    if (!activeSheet) return []

    const cols: ColumnDef<Record<string, unknown>>[] = []

    // Add row number column (show row numbers)
    if (activeSheet.settings.showRowNumbers || (activeSheet.settings.allowAdd && canEdit)) {
      cols.push({
        id: 'row-number',
        header: () => (
          <div className="gba:px-3 gba:py-2.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground/70 gba:text-center gba:uppercase gba:tracking-wider">
            #
          </div>
        ),
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => (
          <div className="gba:px-3 gba:py-2 gba:text-xs gba:font-mono gba:text-muted-foreground/60 gba:text-center gba:select-none gba:tabular-nums">
            {row.index + 1}
          </div>
        ),
        enableSorting: false,
        enableResizing: true,
        enablePinning: false,
        size: 40,
        minSize: 30,
        maxSize: 80
      })
    }

    // If entity data source is enabled, add entity columns first (read-only)
    if (activeSheet.entityDataSource?.enabled && activeSheet.entityDataSource.fieldMappings?.length > 0) {
      const entityFieldMappings = activeSheet.entityDataSource.fieldMappings.filter(m => m.include)

      entityFieldMappings.forEach(mapping => {
        cols.push({
          id: `entity_${mapping.entityField}`,
          accessorFn: (row: Record<string, unknown>) => {
            return row[mapping.entityField] ?? row[mapping.entityFieldLabel]
          },
          header: () => (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2.5">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 gba:rounded-md gba:bg-info/15 gba:flex-shrink-0">
                <Database className="gba:w-3 gba:h-3 gba:text-info" />
              </div>
              <span className="gba:text-[13px] gba:font-medium gba:text-foreground/80 gba:truncate">
                {mapping.entityFieldLabel || mapping.entityField}
              </span>
            </div>
          ),
          cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
            const value = row.original[mapping.entityField] ?? row.original[mapping.entityFieldLabel]

            return (
              <div className="gba:px-2 gba:py-1 gba:bg-muted/30 gba:text-sm">
                {value === null || value === undefined ? (
                  <span className="gba:text-muted-foreground">-</span>
                ) : typeof value === 'boolean' ? (
                  value ? (
                    '✓'
                  ) : (
                    '✗'
                  )
                ) : typeof value === 'object' ? (
                  <span className="gba:text-muted-foreground gba:text-xs">{JSON.stringify(value)}</span>
                ) : (
                  String(value)
                )}
              </div>
            )
          }
        })
      })
    }

    // Add custom spreadsheet columns (editable)
    visibleColumns.forEach((col, idx) => {
      const colIndex = idx
      const isTrackingCol = col.isTracking || isTrackingColumn(col.name)

      cols.push({
        id: col.id,
        accessorFn: (row: Record<string, unknown>) => row[col.name],
        size: col.width || 150,
        minSize: 60,
        maxSize: 500,
        enableResizing: true,
        header: () => (
          <ColumnHeader
            col={col}
            isTrackingCol={isTrackingCol}
            isEditing={editingColumnIdRef.current === col.id}
            editingLabel={editingColumnIdRef.current === col.id ? editingColumnLabelRef.current : col.label}
            onStartEditing={() => {
              setEditingColumnId(col.id)
              setEditingColumnLabel(col.label)
            }}
            onLabelChange={setEditingColumnLabel}
            onFinishEditing={save => {
              if (!save) {
                setEditingColumnId(null)
                setEditingColumnLabel('')
              }
            }}
            onRenameColumn={(colId, newLabel) => handleRenameColumnRef.current(colId, newLabel)}
            canEdit={canEdit}
            hasEntityDataSource={!!activeSheet.entityDataSource?.enabled}
            columnsCount={activeSheet.columns.length}
            onDeleteColumn={handleDeleteColumn}
            onReorderColumn={(draggedId, targetId) => handleReorderColumnsRef.current(draggedId, targetId)}
          />
        ),
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
          const value = row.original[col.name]
          const rowId = (row.original._id ?? row.original.id ?? row.id) as string

          // Special rendering for avatar column (image type with tracking)
          if (col.type === 'image' && isTrackingCol) {
            const avatarUrl = normalizeImageSrc(value as string | undefined)
            return (
              <div
                className={`gba:px-2 gba:py-1 gba:flex gba:items-center gba:justify-center ${isTrackingCol ? 'gba:bg-muted/20' : ''}`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="gba:w-8 gba:h-8 gba:rounded-full gba:object-cover gba:border gba:border-border"
                  />
                ) : (
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                    <User className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          }

          // Tracking columns are read-only with subtle background
          if (isTrackingCol) {
            const displayValue =
              value !== undefined && value !== null && value !== ''
                ? col.type === 'datetime' && value
                  ? new Date(String(value)).toLocaleString()
                  : String(value)
                : '-'
            return <div className="gba:px-2 gba:py-1 gba:bg-muted/20 gba:text-sm">{displayValue}</div>
          }

          // Use EditableCell for inline editing like Excel
          // Access refs for values that change frequently to avoid column re-creation
          return (
            <EditableCell
              value={value}
              column={col}
              rowId={rowId}
              rowIndex={row.index}
              colIndex={colIndex}
              onSave={handleCellChange}
              isEditable={isEditing && activeSheet.settings.allowEdit && col.type !== 'calculated'}
              allRows={filteredData}
              columns={activeSheet.columns}
              onFormulaCellSelect={handleFormulaCellSelect}
              formulaSelectionMode={formulaSelectionModeRef.current}
              setFormulaSelectionMode={setFormulaSelectionMode}
              selectedCell={selectedCellRef.current}
              setSelectedCell={setSelectedCell}
              onFormulaValueChange={(value: string) => {
                currentFormulaValueRef.current = value
                setCurrentFormulaDisplay(value)
              }}
              formulaSelectedCells={formulaSelectedCellsRef.current}
              onEditingStateChange={editing => {
                isEditingRef.current = editing
              }}
              participants={cursorParticipantsRef.current}
              onCursorEmit={emitCursorImmediate}
              accessToken={accessToken}
            />
          )
        }
      })
    })

    // Add "Add Column" button column (only if user can edit)
    if (canEdit) {
      cols.push({
        id: 'add-column',
        header: () => (
          <div className="gba:px-2 gba:py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handleAddColumnRef.current()
              }}
              className="gba:h-7 gba:w-7 gba:p-0 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:duration-150 gba:border gba:border-dashed gba:border-border/50 hover:gba:border-primary/30"
              title="Add Column"
              data-testid="add-column-header-button"
            >
              <Plus className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            </Button>
          </div>
        ),
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enablePinning: false,
        size: 48,
        minSize: 48,
        maxSize: 48
      })
    }

    // Add actions column (minimal - just delete button)
    if (activeSheet.settings.allowDelete) {
      cols.push({
        id: 'actions',
        header: '',
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableResizing: false,
        enablePinning: false,
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => (
          <div className="gba:flex gba:items-center gba:justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-6 gba:w-6 gba:opacity-30 hover:gba:opacity-100"
              onClick={e => {
                e.stopPropagation()
                handleDeleteRow(row.original._id as string)
              }}
            >
              <Trash2 className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />
            </Button>
          </div>
        )
      })
    }

    return cols
  }, [
    activeSheet,
    visibleColumns,
    handleDeleteRow,
    handleCellChange,
    filteredData,
    handleFormulaCellSelect,
    // Removed frequently-changing values - they're now accessed via refs inside cell render functions:
    // - formulaSelectionMode (now formulaSelectionModeRef.current)
    // - selectedCell (now selectedCellRef.current)
    // - cursorParticipants (now cursorParticipantsRef.current)
    // - formulaSelectedCells (now formulaSelectedCellsRef.current)
    emitCursorImmediate,
    setEditingColumnId,
    setEditingColumnLabel,
    handleDeleteColumn,
    canEdit,
    isEditing,
    setFormulaSelectionMode,
    setCurrentFormulaDisplay,
    setSelectedCell,
    accessToken
  ])
}
