/**
 * TableView Component
 *
 * Table view with inline editing using Univer grid
 */

import React, { useCallback, memo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types'
import type { DocumentParticipant, DocumentOperation } from '../../shared/services/CollaborationClient'
import { UniverSheetGrid, type UniverSheetGridHandle } from '../components/UniverSheetGrid'

export interface TableViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  initialSnapshot?: Record<string, unknown> | null
  snapshotSeed?: string
  columns: ColumnDef<Record<string, unknown>>[]
  spreadsheetColumns: SpreadsheetColumn[]
  testId: string
  onCellChange?: (rowId: string, columnName: string, value: unknown) => void
  onCellsChange?: (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => void
  onSnapshotRequested?: () => Promise<void> | void
  onOpenCommentRequest?: () => void
  commentedCells?: Array<{
    cellReference: string
    content: string
    createdByName?: string
    createdByAvatar?: string
    createdAt?: string
  }>
  isEditable?: boolean
  onAddRow?: () => void
  showAddRow?: boolean
  onDataChange?: (data: Record<string, unknown>[]) => void
  /** Callback when a new column needs to be auto-created */
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  isReadOnly?: boolean
  /** Ref to access UniverSheetGrid imperative methods */
  gridRef?: React.RefObject<UniverSheetGridHandle | null>
}

/**
 * TableView - Grid-based table view using Univer
 */
export const TableView = memo<TableViewProps>(function TableView({
  sheet,
  data,
  initialSnapshot,
  snapshotSeed,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  columns,
  spreadsheetColumns,
  testId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddRow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showAddRow,
  onCellChange,
  onCellsChange,
  onSnapshotRequested,
  onOpenCommentRequest,
  commentedCells,
  onDataChange,
  onColumnAdd,
  participants,
  onOperationEmit,
  onCursorEmit,
  collaborationEnabled,
  isReadOnly,
  gridRef
}) {
  // Handle cell change from Univer
  const handleCellChange = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (onCellChange) {
        onCellChange(rowId, columnId, value)
      }
    },
    [onCellChange]
  )

  const handleCellsChange = useCallback(
    (cells: Array<{ rowId: string; columnName: string; value: unknown }>) => {
      if (onCellsChange) {
        onCellsChange(cells)
      }
    },
    [onCellsChange]
  )

  const handleSnapshotRequested = useCallback(() => {
    return onSnapshotRequested?.()
  }, [onSnapshotRequested])

  // Handle data change from Univer
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
      <UniverSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        initialSnapshot={initialSnapshot}
        snapshotSeed={snapshotSeed}
        columns={spreadsheetColumns}
        isReadOnly={isReadOnly || false}
        onCellChange={handleCellChange}
        onCellsChange={handleCellsChange}
        onSnapshotRequested={handleSnapshotRequested}
        onOpenCommentRequest={onOpenCommentRequest}
        commentedCells={commentedCells}
        onDataChange={handleDataChange}
        onColumnAdd={onColumnAdd}
        participants={participants}
        onOperationEmit={onOperationEmit}
        onCursorEmit={onCursorEmit}
        collaborationEnabled={collaborationEnabled}
        height="100%"
        width="100%"
      />
    </div>
  )
})

export default TableView
