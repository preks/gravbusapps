/**
 * TableView Component
 *
 * Table view with inline editing using Univer grid
 */

import React, { useCallback, memo, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from '@newwork/nw-design-system'
import type { SpreadsheetSheet, SpreadsheetColumn } from '../types'
import type {
  DocumentParticipant,
  DocumentOperation
} from '../../../../../platform/apps/shared/services/CollaborationClient'
import { UniverSheetGrid } from '../components/UniverSheetGrid'
import type {
  UniverSheetGridHandle,
  CellDimensionsPayload,
  WorkbookSnapshotLifecycleEvent,
  UniverSheetGridInitLifecycleEvent
} from '../components/UniverSheetGrid.types'
import translations from '../_i18n'
import type { SpreadsheetStylePatch, SpreadsheetUnifiedMutationBatchPayload } from '../core'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { NativeSheetStructureIntent } from '../utils/nativeSheetStructureIntent'
import type { SpreadsheetRowSlotIdentityRegistry } from '../utils/spreadsheetRowSlotIdentity'

export interface TableViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  initialSnapshot?: Record<string, unknown> | null
  snapshotSeed?: string
  authoritativeDataSyncToken?: number
  workbookInstanceKey: string
  multiSheetWorkbookMode?: boolean
  apiFirstSheetStructure?: boolean
  /** Background reconcile of remote workbook snapshot after cache-first bootstrap. */
  workbookSnapshotSyncing?: boolean
  /** Workbook layout could not be synced from server after retries (shown when syncing finishes). */
  workbookSnapshotSyncFailed?: boolean
  onNativeSheetStructureIntent?: (intent: NativeSheetStructureIntent) => void
  onActiveWorksheetChange?: (sheetId: string, sheetName: string) => void
  onUniverSheetInserted?: (payload: {
    kind: 'blank' | 'duplicate'
    sheetId: string
    sheetName: string
    index: number
    visualWorksheetSnapshot?: Record<string, unknown>
    sourceSheetId?: string
  }) => void
  onUniverSheetRemoved?: (payload: { sheetId: string }) => void
  onUniverSheetRenamed?: (payload: { sheetId: string; sheetName: string }) => void
  onUniverSheetVisibilityChanged?: (payload: { sheetId: string; hidden: boolean }) => void
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
  onCellsChange?: (
    cells: Array<{ rowId: string; columnName: string; value: unknown; sheetId?: string; traceId?: string }>
  ) => void
  onDiagnosticsTraceEvent?: (event: SpreadsheetTraceEventInput) => void
  onGridInitLifecycle?: (event: UniverSheetGridInitLifecycleEvent) => void
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
  onColumnsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  onColumnsDelete?: (startIndex: number, endIndex: number) => void
  onRowsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  /** Authoritative set_style batch op emitter (see collab rework plan §4.4). */
  onStyleBatchOp?: (data: {
    sheetId: string
    traceId?: string
    styles?: Record<string, unknown>
    cells: Array<{ row: number; col: number; cellRef?: string; stylePatch: SpreadsheetStylePatch }>
  }) => void
  /** Unified mutation batch emitter for value + style changes from a single local mutation wave. */
  onMutationBatchOp?: (data: SpreadsheetUnifiedMutationBatchPayload) => void | Promise<void>
  flushUnmaterializedRowsBeforePersistRef?: MutableRefObject<((sheetId: string) => Promise<void>) | null>
  getPersistSheetRowsSnapshot?: (sheetId: string) => Record<string, unknown>[]
  /** Preferred: host predicate for persisted backend row ids (UUIDs). */
  isBackendRowUuid?: (value: string) => boolean
  /** @deprecated Use {@link isBackendRowUuid}. */
  isUuidForRowRemap?: (value: string) => boolean
  rowSlotIdentityRegistryRef?: MutableRefObject<SpreadsheetRowSlotIdentityRegistry | null>
  columnStructureStateRef?: MutableRefObject<{
    healthy: boolean
    pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
    expectedColumnsSignature: string | null
  }>
  onCursorEmit?: (position: { path: string[] }) => void
  getCanonicalSheetId?: (sheetId: string) => string
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
  workbookInstanceKey,
  multiSheetWorkbookMode,
  apiFirstSheetStructure,
  workbookSnapshotSyncing = false,
  workbookSnapshotSyncFailed = false,
  onNativeSheetStructureIntent,
  onActiveWorksheetChange,
  onUniverSheetInserted,
  onUniverSheetRemoved,
  onUniverSheetRenamed,
  onUniverSheetVisibilityChanged,
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
  onDiagnosticsTraceEvent,
  onGridInitLifecycle,
  onSnapshotRequested,
  onWorkbookSnapshotLifecycle,
  onOpenCommentRequest,
  commentedCells,
  onDataChange,
  onColumnAdd,
  onColumnsInsert,
  onColumnsDelete,
  onRowsInsert,
  participants,
  onOperationEmit,
  onStyleBatchOp,
  onMutationBatchOp,
  flushUnmaterializedRowsBeforePersistRef,
  getPersistSheetRowsSnapshot,
  isBackendRowUuid,
  isUuidForRowRemap,
  rowSlotIdentityRegistryRef,
  columnStructureStateRef,
  onCursorEmit,
  getCanonicalSheetId,
  collaborationEnabled,
  isReadOnly,
  onDimensionsChange,
  gridRef
}) {
  const { t } = useTranslation(translations)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const gridReadyRef = useRef(false)
  const readyToMountUniverRef = useRef(false)
  const lastTableHostReadyRef = useRef<boolean | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [readyToMountUniver, setReadyToMountUniver] = useState(false)

  // Guard the UniverSheetGrid mount on a non-zero container size. If the
  // wrapper OR its parent is hidden (display: none) or has 0 width/height,
  // mounting Univer triggers its skeleton-recompute warning ("column width
  // is less than 0") for both the grid and its internal formula-bar editor.
  // We additionally wait one animation frame after the size resolves so that
  // descendant layout boxes (toolbar, formula bar host) have committed before
  // Univer initializes its DI-resolved children.
  useEffect(() => {
    const node = wrapperRef.current
    if (!node) return

    let rafId: number | null = null
    lastTableHostReadyRef.current = null

    const scheduleReady = (ready: boolean) => {
      if (rafId != null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      if (!ready) {
        if (lastTableHostReadyRef.current !== false) {
          lastTableHostReadyRef.current = false
          const own = node.getBoundingClientRect()
          onGridInitLifecycle?.({
            phase: 'host_waiting',
            sheetId: sheet.id,
            workbookInstanceKey,
            snapshotSeed,
            width: own.width,
            height: own.height,
            reason: 'table_wrapper_size_gate'
          })
        }
        readyToMountUniverRef.current = false
        setReadyToMountUniver(false)
        return
      }
      rafId = requestAnimationFrame(() => {
        rafId = null
        const own = node.getBoundingClientRect()
        if (lastTableHostReadyRef.current !== true) {
          lastTableHostReadyRef.current = true
          onGridInitLifecycle?.({
            phase: 'host_ready',
            sheetId: sheet.id,
            workbookInstanceKey,
            snapshotSeed,
            width: own.width,
            height: own.height,
            reason: 'table_wrapper_size_gate'
          })
        }
        readyToMountUniverRef.current = true
        setReadyToMountUniver(true)
      })
    }

    const measure = () => {
      const parent = node.parentElement
      const own = node.getBoundingClientRect()
      const parentBox = parent ? parent.getBoundingClientRect() : null
      const hasOwnSize = own.width > 0 && own.height > 0
      const hasParentSize = parentBox ? parentBox.width > 0 && parentBox.height > 0 : true
      scheduleReady(hasOwnSize && hasParentSize)
    }

    measure()

    if (typeof ResizeObserver === 'undefined') {
      scheduleReady(true)
      return () => {
        if (rafId != null) cancelAnimationFrame(rafId)
      }
    }

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (node.parentElement) observer.observe(node.parentElement)
    return () => {
      observer.disconnect()
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [onGridInitLifecycle, sheet.id, snapshotSeed, workbookInstanceKey])

  useEffect(() => {
    if (!readyToMountUniver) {
      gridReadyRef.current = false
      setShowFallback(false)
      return
    }
    gridReadyRef.current = false
    setShowFallback(false)

    const pollId = globalThis.setInterval(() => {
      const host = wrapperRef.current
      const hasCanvas = Boolean(host?.querySelector('[data-testid="univer-sheet-grid-container"] canvas'))
      if (!hasCanvas) return
      gridReadyRef.current = true
      onGridInitLifecycle?.({
        phase: 'canvas_ready',
        sheetId: sheet.id,
        workbookInstanceKey,
        snapshotSeed,
        reason: 'table_canvas_poll'
      })
      setShowFallback(false)
      clearInterval(pollId)
      clearTimeout(fallbackTimeoutId)
    }, 250)

    const fallbackTimeoutId = globalThis.setTimeout(() => {
      if (gridReadyRef.current) return
      onGridInitLifecycle?.({
        phase: 'canvas_timeout',
        sheetId: sheet.id,
        workbookInstanceKey,
        snapshotSeed,
        reason: 'table_canvas_poll'
      })
      setShowFallback(true)
    }, 3500)

    return () => {
      clearInterval(pollId)
      clearTimeout(fallbackTimeoutId)
    }
  }, [sheet.id, snapshotSeed, readyToMountUniver, onGridInitLifecycle, workbookInstanceKey])

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
      {workbookSnapshotSyncing ? (
        <div className="gba:pointer-events-none gba:absolute gba:left-0 gba:right-0 gba:top-0 gba:z-30 gba:flex gba:justify-center gba:px-3 gba:pt-2">
          <div className="gba:rounded-md gba:bg-muted/90 gba:px-3 gba:py-1 gba:shadow-sm">
            <span className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-workbook-sync-label`}>
              {t('workbook-bootstrap-syncing')}
            </span>
          </div>
        </div>
      ) : workbookSnapshotSyncFailed ? (
        <div className="gba:pointer-events-none gba:absolute gba:left-0 gba:right-0 gba:top-0 gba:z-30 gba:flex gba:justify-center gba:px-3 gba:pt-2">
          <div className="gba:rounded-md gba:bg-muted/90 gba:px-3 gba:py-1 gba:shadow-sm">
            <span className="gba:text-xs gba:text-destructive" data-testid={`${testId}-workbook-sync-failed-label`}>
              {t('workbook-bootstrap-sync-failed-banner')}
            </span>
          </div>
        </div>
      ) : null}
      {readyToMountUniver ? (
        <UniverSheetGrid
          // In multi-sheet mode the workbook contains every sheet and switching
          // tabs is handled inside Univer; remounting on `sheet.id` would throw
          // away the in-memory workbook and cause a white flash on every switch.
          // Key off the explicit workbook instance key so the remount boundary is
          // owned by the viewer instead of hidden behind a fallback in the grid.
          key={workbookInstanceKey}
          ref={gridRef}
          sheet={sheet}
          data={data}
          initialSnapshot={initialSnapshot}
          snapshotSeed={snapshotSeed}
          authoritativeDataSyncToken={authoritativeDataSyncToken}
          workbookInstanceKey={workbookInstanceKey}
          multiSheetWorkbookMode={multiSheetWorkbookMode}
          apiFirstSheetStructure={apiFirstSheetStructure}
          onNativeSheetStructureIntent={onNativeSheetStructureIntent}
          onActiveWorksheetChange={onActiveWorksheetChange}
          onUniverSheetInserted={onUniverSheetInserted}
          onUniverSheetRemoved={onUniverSheetRemoved}
          onUniverSheetRenamed={onUniverSheetRenamed}
          onUniverSheetVisibilityChanged={onUniverSheetVisibilityChanged}
          getSheetContext={getSheetContext}
          columns={spreadsheetColumns}
          isReadOnly={isReadOnly || false}
          onCellChange={handleCellChange}
          onCellsChange={handleCellsChange}
          onDiagnosticsTraceEvent={onDiagnosticsTraceEvent}
          onInitLifecycle={onGridInitLifecycle}
          onSnapshotRequested={handleSnapshotRequested}
          onWorkbookSnapshotLifecycle={onWorkbookSnapshotLifecycle}
          onOpenCommentRequest={onOpenCommentRequest}
          commentedCells={commentedCells}
          onDataChange={handleDataChange}
          onColumnAdd={onColumnAdd}
          onColumnsInsert={onColumnsInsert}
          onColumnsDelete={onColumnsDelete}
          onRowsInsert={onRowsInsert}
          participants={participants}
          onOperationEmit={onOperationEmit}
          onStyleBatchOp={onStyleBatchOp}
          onMutationBatchOp={onMutationBatchOp}
          flushUnmaterializedRowsBeforePersistRef={flushUnmaterializedRowsBeforePersistRef}
          getPersistSheetRowsSnapshot={getPersistSheetRowsSnapshot}
          isBackendRowUuid={isBackendRowUuid ?? isUuidForRowRemap}
          isUuidForRowRemap={isUuidForRowRemap}
          rowSlotIdentityRegistryRef={rowSlotIdentityRegistryRef}
          columnStructureStateRef={columnStructureStateRef}
          onCursorEmit={onCursorEmit}
          getCanonicalSheetId={getCanonicalSheetId}
          collaborationEnabled={collaborationEnabled}
          onDimensionsChange={onDimensionsChange}
          height="100%"
          width="100%"
        />
      ) : null}
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
