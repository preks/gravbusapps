/**
 * TableView Component
 *
 * Table view with inline editing using FortuneSheet grid
 */

import React, { useCallback, memo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types'
import type { DocumentParticipant, DocumentOperation } from '../../shared/services/CollaborationClient'
import { FortuneSheetGrid, type FortuneSheetGridHandle } from '../components/FortuneSheetGrid'

export interface TableViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  columns: ColumnDef<Record<string, unknown>>[]
  spreadsheetColumns: SpreadsheetColumn[]
  testId: string
  onCellChange?: (rowId: string, columnName: string, value: unknown, options?: { fromRemote?: boolean }) => void
  isEditable?: boolean
  onAddRow?: () => void
  showAddRow?: boolean
  onDataChange?: (data: Record<string, unknown>[]) => void
  /** Callback when a new column needs to be auto-created */
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  /** Callback when columns are inserted via context menu */
  onColumnsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  /** Callback when columns are deleted via context menu */
  onColumnsDelete?: (startIndex: number, endIndex: number) => void
  /** Callback when rows are inserted via context menu */
  onRowsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  /** Callback when rows are deleted via context menu */
  onRowsDelete?: (startIndex: number, endIndex: number) => void
  /** Callback when columns are hidden/shown via context menu */
  onColumnVisibilityChange?: (columnIndices: number[], visible: boolean) => void
  /** Callback when a column header is renamed */
  onColumnRename?: (columnId: string, newLabel: string) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  isReadOnly?: boolean
  /** Ref to access FortuneSheetGrid imperative methods */
  gridRef?: React.RefObject<FortuneSheetGridHandle | null>
  /** Called when a remote cell update was applied */
  onRemoteChangeApplied?: () => void
  /** Key to force grid refresh when remote data arrives */
  remoteUpdateKey?: number
  /** Remote operation to apply (from viewer's WebSocket) */
  receivedOperation?: { operation: any; timestamp: number } | null
}

/**
 * TableView - Grid-based table view using FortuneSheet
 */
export const TableView = memo<TableViewProps>(function TableView({
  sheet,
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  columns,
  spreadsheetColumns,
  testId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddRow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showAddRow,
  onCellChange,
  onDataChange,
  onColumnAdd,
  onColumnsInsert,
  onColumnsDelete,
  onRowsInsert,
  onRowsDelete,
  onColumnVisibilityChange,
  onColumnRename,
  participants,
  onOperationEmit,
  onCursorEmit,
  collaborationEnabled,
  isReadOnly,
  gridRef,
  onRemoteChangeApplied,
  remoteUpdateKey,
  receivedOperation
}) {
  const handleCellChange = useCallback(
    (rowId: string, columnId: string, value: unknown, options?: { fromRemote?: boolean }) => {
      if (onCellChange) {
        onCellChange(rowId, columnId, value, options)
      }
    },
    [onCellChange]
  )

  // Handle data change from FortuneSheet
  const handleDataChange = useCallback(
    (newData: Record<string, unknown>[]) => {
      if (onDataChange) {
        onDataChange(newData)
      }
    },
    [onDataChange]
  )

  return (
    <div className="gba:relative gba:w-full gba:h-full gba:min-w-0 gba:absolute gba:inset-0" data-testid={testId}>
      <FortuneSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={spreadsheetColumns}
        isReadOnly={isReadOnly || false}
        onCellChange={handleCellChange}
        onDataChange={handleDataChange}
        onColumnAdd={onColumnAdd}
        onColumnsInsert={onColumnsInsert}
        onColumnsDelete={onColumnsDelete}
        onRowsInsert={onRowsInsert}
        onRowsDelete={onRowsDelete}
        onColumnVisibilityChange={onColumnVisibilityChange}
        onColumnRename={onColumnRename}
        participants={participants}
        onOperationEmit={onOperationEmit}
        onCursorEmit={onCursorEmit}
        collaborationEnabled={collaborationEnabled}
        onRemoteChangeApplied={onRemoteChangeApplied}
        remoteUpdateKey={remoteUpdateKey}
        receivedOperation={receivedOperation}
        height="100%"
        width="100%"
      />
    </div>
  )
})

export default TableView
