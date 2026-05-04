/**
 * TableView Component
 *
 * Table view with inline editing using Univer grid
 */

import React, { useCallback, memo, useEffect, useMemo, useRef, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from '@newwork/nw-design-system'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types'
import type {
  DocumentParticipant,
  DocumentOperation
} from '../../../../../platform/apps/shared/services/CollaborationClient'
import {
  UniverSheetGrid,
  type UniverSheetGridHandle,
  type CellDimensionsPayload,
  type WorkbookSnapshotLifecycleEvent
} from '../components/UniverSheetGrid'
import translations from '../_i18n'

export interface TableViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  initialSnapshot?: Record<string, unknown> | null
  snapshotSeed?: string
  authoritativeDataSyncToken?: number
  workbookRemountKey?: string
  multiSheetWorkbookMode?: boolean
  onActiveWorksheetChange?: (sheetId: string, sheetName: string) => void
  onUniverSheetInserted?: (payload: { sheetId: string; sheetName: string; index: number }) => void
  onUniverSheetRemoved?: (payload: { sheetId: string }) => void
  onUniverSheetRenamed?: (payload: { sheetId: string; sheetName: string }) => void
  /**
   * Multi-sheet context resolver forwarded to `UniverSheetGrid`. When Univer
   * reports a cell mutation on a non-active sheet this tells the grid which
   * columns/rows to use to build its rowIndex→rowId mapping.
   */
  getSheetContext?: (sheetId: string) => {
    columns: SpreadsheetColumn[]
    data: Record<string, unknown>[]
  } | null
  columns: ColumnDef<Record<string, unknown>>[]
  spreadsheetColumns: SpreadsheetColumn[]
  testId: string
  onCellChange?: (rowId: string, columnName: string, value: unknown, sheetId?: string) => void
  onCellsChange?: (cells: Array<{ rowId: string; columnName: string; value: unknown; sheetId?: string }>) => void
  onSnapshotRequested?: () => Promise<void> | void
  onWorkbookSnapshotLifecycle?: (event: WorkbookSnapshotLifecycleEvent) => void
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
  onDataChange?: (data: Record<string, unknown>[], sheetId?: string) => void
  /** Callback when a new column needs to be auto-created */
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  isReadOnly?: boolean
  onDimensionsChange?: (payload: CellDimensionsPayload) => void
  /** Ref to access UniverSheetGrid imperative methods */
  gridRef?: React.Ref<UniverSheetGridHandle>
}

/**
 * TableView - Grid-based table view using Univer
 */
export const TableView = memo<TableViewProps>(function TableView({
  sheet,
  data,
  initialSnapshot,
  snapshotSeed,
  authoritativeDataSyncToken,
  workbookRemountKey,
  multiSheetWorkbookMode,
  onActiveWorksheetChange,
  onUniverSheetInserted,
  onUniverSheetRemoved,
  onUniverSheetRenamed,
  getSheetContext,
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
  onWorkbookSnapshotLifecycle,
  onOpenCommentRequest,
  commentedCells,
  onDataChange,
  onColumnAdd,
  participants,
  onOperationEmit,
  onCursorEmit,
  collaborationEnabled,
  isReadOnly,
  onDimensionsChange,
  gridRef
}) {
  const { t } = useTranslation(translations)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const gridReadyRef = useRef(false)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    gridReadyRef.current = false
    setShowFallback(false)

    const pollId = globalThis.setInterval(() => {
      const host = wrapperRef.current
      const hasCanvas = Boolean(host?.querySelector('[data-testid="univer-sheet-grid-container"] canvas'))
      if (!hasCanvas) return
      gridReadyRef.current = true
      setShowFallback(false)
      clearInterval(pollId)
      clearTimeout(fallbackTimeoutId)
    }, 250)

    const fallbackTimeoutId = globalThis.setTimeout(() => {
      if (gridReadyRef.current) return
      setShowFallback(true)
    }, 3500)

    return () => {
      clearInterval(pollId)
      clearTimeout(fallbackTimeoutId)
    }
  }, [sheet.id, snapshotSeed])

  const fallbackColumns = useMemo(() => {
    const visible = spreadsheetColumns.filter(c => c.isVisible !== false)
    if (visible.length > 0) return visible
    if (data.length === 0) return []
    return Object.keys(data[0]).map((key, idx) => ({
      id: key,
      name: key,
      label: key,
      type: 'text' as const,
      isVisible: true,
      isEditable: false,
      isRequired: false,
      isUnique: false,
      order: idx
    }))
  }, [spreadsheetColumns, data])

  const fallbackRows = useMemo(() => data.slice(0, 100), [data])

  useEffect(() => {
    if (!showFallback) return
    console.warn('[TableView] Univer canvas missing; showing fallback table', {
      sheetId: sheet.id,
      columns: spreadsheetColumns.length,
      rows: data.length
    })
  }, [showFallback, sheet.id, spreadsheetColumns.length, data.length])

  // Handle cell change from Univer
  const handleCellChange = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (onCellChange) {
        onCellChange(rowId, columnId, value, sheet.id)
      }
    },
    [onCellChange, sheet.id]
  )

  const handleCellsChange = useCallback(
    (cells: Array<{ rowId: string; columnName: string; value: unknown; sheetId?: string }>) => {
      if (onCellsChange) {
        // UniverSheetGrid now stamps each cell with the Univer-active sheet id
        // when multi-sheet mode is enabled. Respect that value; only fall back
        // to the TableView's active-sheet prop when the grid didn't provide one
        // (single-sheet callers).
        onCellsChange(cells.map(cell => ({ ...cell, sheetId: cell.sheetId ?? sheet.id })))
      }
    },
    [onCellsChange, sheet.id]
  )

  const handleSnapshotRequested = useCallback(() => {
    return onSnapshotRequested?.()
  }, [onSnapshotRequested])

  // Handle data change from Univer
  const handleDataChange = useCallback(
    (newData: Record<string, unknown>[], sourceSheetId?: string) => {
      if (onDataChange) {
        onDataChange(newData, sourceSheetId ?? sheet.id)
      }
    },
    [onDataChange, sheet.id]
  )

  return (
    <div
      ref={wrapperRef}
      className="gba:relative gba:w-full gba:h-full gba:min-w-0 gba:absolute gba:inset-0"
      data-testid={testId}
    >
      <UniverSheetGrid
        // In multi-sheet mode the workbook contains every sheet and switching
        // tabs is handled inside Univer; remounting on `sheet.id` would throw
        // away the in-memory workbook and cause a white flash on every switch.
        // Key off the stable `workbookRemountKey` instead (only changes when
        // sheets are added/removed) so the single Univer instance persists.
        key={workbookRemountKey ?? sheet.id}
        ref={gridRef}
        sheet={sheet}
        data={data}
        initialSnapshot={initialSnapshot}
        snapshotSeed={snapshotSeed}
        authoritativeDataSyncToken={authoritativeDataSyncToken}
        workbookRemountKey={workbookRemountKey}
        multiSheetWorkbookMode={multiSheetWorkbookMode}
        onActiveWorksheetChange={onActiveWorksheetChange}
        onUniverSheetInserted={onUniverSheetInserted}
        onUniverSheetRemoved={onUniverSheetRemoved}
        onUniverSheetRenamed={onUniverSheetRenamed}
        getSheetContext={getSheetContext}
        columns={spreadsheetColumns}
        isReadOnly={isReadOnly || false}
        onCellChange={handleCellChange}
        onCellsChange={handleCellsChange}
        onSnapshotRequested={handleSnapshotRequested}
        onWorkbookSnapshotLifecycle={onWorkbookSnapshotLifecycle}
        onOpenCommentRequest={onOpenCommentRequest}
        commentedCells={commentedCells}
        onDataChange={handleDataChange}
        onColumnAdd={onColumnAdd}
        participants={participants}
        onOperationEmit={onOperationEmit}
        onCursorEmit={onCursorEmit}
        collaborationEnabled={collaborationEnabled}
        onDimensionsChange={onDimensionsChange}
        height="100%"
        width="100%"
      />
      {showFallback && (
        <div className="gba:absolute gba:inset-0 gba:z-40 gba:bg-background gba:p-4 gba:overflow-auto">
          <div className="gba:mb-3 gba:text-sm gba:text-muted-foreground">{t('view-table-fallback-loading')}</div>
          <div className="gba:overflow-auto gba:border gba:rounded-md">
            <table className="gba:min-w-full gba:text-sm">
              <thead className="gba:bg-muted/40">
                <tr>
                  {fallbackColumns.map(col => (
                    <th key={col.id} className="gba:px-3 gba:py-2 gba:text-left gba:font-medium">
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fallbackRows.map((row, rowIdx) => (
                  <tr key={String(row._rowUuid || row._id || row.id || `row-${rowIdx}`)} className="gba:border-t">
                    {fallbackColumns.map(col => (
                      <td key={col.id} className="gba:px-3 gba:py-2">
                        {String(row[col.name] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
})

export default TableView
