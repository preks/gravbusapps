/**
 * useSpreadsheetTableColumns
 *
 * Generates table column definitions for TanStack Table with inline editing support.
 * Handles entity data source columns (read-only) and custom columns (editable).
 */

import { useMemo } from 'react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { Plus, Trash2, Database, User } from 'lucide-react'
import type { SpreadsheetSheet, SpreadsheetColumn, EntityFieldMapping } from '../types'
import type { SelectedCell } from './useSpreadsheetCellSelection'
import type { FormulaSelectionMode } from './useSpreadsheetFormulas'
import { isTrackingColumn } from '../utils/trackingColumns'
import { normalizeImageSrc } from '../utils/normalizeImageSrc'
import { ColumnHeader, EditableCell } from '../views'
import translations from '../_i18n'

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

type CustomColumnContext = Omit<
  UseSpreadsheetTableColumnsProps,
  'activeSheet' | 'visibleColumns' | 'handleDeleteRow' | 'handleAddColumnRef'
>

function renderEntityCellValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="gba:text-muted-foreground">-</span>
  }
  if (typeof value === 'boolean') {
    return value ? '✓' : '✗'
  }
  if (typeof value === 'object') {
    return <span className="gba:text-muted-foreground gba:text-xs">{JSON.stringify(value)}</span>
  }
  return String(value)
}

function getTrackingDisplayValue(value: unknown, colType: string): string {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  if (colType === 'datetime') {
    return new Date(String(value)).toLocaleString()
  }
  return String(value)
}

function buildEntityColumnDef(mapping: EntityFieldMapping): ColumnDef<Record<string, unknown>> {
  return {
    id: `entity_${mapping.entityField}`,
    accessorFn: (row: Record<string, unknown>) => row[mapping.entityField] ?? row[mapping.entityFieldLabel],
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
      return <div className="gba:px-2 gba:py-1 gba:bg-muted/30 gba:text-sm">{renderEntityCellValue(value)}</div>
    }
  }
}

function buildCustomColumnDef(
  col: SpreadsheetColumn,
  colIndex: number,
  activeSheet: SpreadsheetSheet,
  ctx: CustomColumnContext
): ColumnDef<Record<string, unknown>> {
  const isTrackingCol = col.isTracking || isTrackingColumn(col.name)

  return {
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
        isEditing={ctx.editingColumnIdRef.current === col.id}
        editingLabel={ctx.editingColumnIdRef.current === col.id ? ctx.editingColumnLabelRef.current : col.label}
        onStartEditing={() => {
          ctx.setEditingColumnId(col.id)
          ctx.setEditingColumnLabel(col.label)
        }}
        onLabelChange={ctx.setEditingColumnLabel}
        onFinishEditing={save => {
          if (!save) {
            ctx.setEditingColumnId(null)
            ctx.setEditingColumnLabel('')
          }
        }}
        onRenameColumn={(colId, newLabel) => ctx.handleRenameColumnRef.current(colId, newLabel)}
        canEdit={ctx.canEdit}
        hasEntityDataSource={!!activeSheet.entityDataSource?.enabled}
        columnsCount={activeSheet.columns.length}
        onDeleteColumn={ctx.handleDeleteColumn}
        onReorderColumn={(draggedId, targetId) => ctx.handleReorderColumnsRef.current(draggedId, targetId)}
      />
    ),
    cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
      const value = row.original[col.name]
      const rowId = String(row.original._id ?? row.original.id ?? row.id)

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

      if (isTrackingCol) {
        const displayValue = getTrackingDisplayValue(value, col.type)
        return <div className="gba:px-2 gba:py-1 gba:bg-muted/20 gba:text-sm">{displayValue}</div>
      }

      return (
        <EditableCell
          value={value}
          column={col}
          rowId={rowId}
          rowIndex={row.index}
          colIndex={colIndex}
          onSave={ctx.handleCellChange}
          isEditable={ctx.isEditing && activeSheet.settings.allowEdit && col.type !== 'calculated'}
          allRows={ctx.filteredData}
          columns={activeSheet.columns}
          onFormulaCellSelect={ctx.handleFormulaCellSelect}
          formulaSelectionMode={ctx.formulaSelectionModeRef.current}
          setFormulaSelectionMode={ctx.setFormulaSelectionMode}
          selectedCell={ctx.selectedCellRef.current}
          setSelectedCell={ctx.setSelectedCell}
          onFormulaValueChange={(val: string) => {
            ctx.currentFormulaValueRef.current = val
            ctx.setCurrentFormulaDisplay(val)
          }}
          formulaSelectedCells={ctx.formulaSelectedCellsRef.current}
          onEditingStateChange={editing => {
            ctx.isEditingRef.current = editing
          }}
          participants={ctx.cursorParticipantsRef.current}
          onCursorEmit={ctx.emitCursorImmediate}
          accessToken={ctx.accessToken}
        />
      )
    }
  }
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
  const { t } = useTranslation(translations)

  return useMemo(() => {
    if (!activeSheet) return []

    const cols: ColumnDef<Record<string, unknown>>[] = []

    const ctx: CustomColumnContext = {
      filteredData,
      isEditing,
      canEdit,
      handleCellChange,
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
      isEditingRef,
      accessToken
    }

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

    const entityDataSource = activeSheet.entityDataSource
    if (entityDataSource?.enabled && entityDataSource.fieldMappings.length > 0) {
      cols.push(...entityDataSource.fieldMappings.filter(m => m.include).map(buildEntityColumnDef))
    }

    visibleColumns.forEach((col, idx) => {
      cols.push(buildCustomColumnDef(col, idx, activeSheet, ctx))
    })

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
              title={t('add-column-title')}
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
                handleDeleteRow(String(row.original._id ?? row.original.id ?? row.id))
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
    accessToken,
    t
  ])
}
