import type {
  SpreadsheetBulkRemoteApplyMeta,
  SpreadsheetBulkRemoteCellItem,
  SpreadsheetRemoteFeatureOperationPayload,
  SpreadsheetStylePatch,
  SpreadsheetUnifiedMutationBatchPayload
} from '../core'
import type { SpreadsheetColumn, SpreadsheetSheet } from '../types/spreadsheet'
import type {
  DocumentOperation,
  DocumentParticipant
} from '../../../../../platform/apps/shared/services/CollaborationClient'
import type {
  AuthoritativeGridRegion,
  ForceAuthoritativeGridReapplyOptions
} from '../utils/spreadsheetAuthoritativeRegion'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { NativeSheetStructureIntent } from '../utils/nativeSheetStructureIntent'
import type { SpreadsheetRowSlotIdentityRegistry } from '../utils/spreadsheetRowSlotIdentity'
import type { MutableRefObject } from 'react'

export type WorkbookSnapshotLifecycleOrigin = 'cell' | 'workbook'

export type WorkbookSnapshotLifecycleEvent =
  | { phase: 'checkpoint_scheduled'; origin: WorkbookSnapshotLifecycleOrigin }
  | { phase: 'checkpoint_settled'; ok: boolean; origin: WorkbookSnapshotLifecycleOrigin }

export type UniverSheetGridInitPhase =
  | 'host_waiting'
  | 'host_ready'
  | 'bootstrap_started'
  | 'bootstrap_succeeded'
  | 'bootstrap_failed'
  | 'canvas_ready'
  | 'canvas_timeout'
  | 'disposed'

export interface UniverSheetGridInitLifecycleEvent {
  phase: UniverSheetGridInitPhase
  sheetId: string
  workbookInstanceKey: string
  snapshotSeed?: string
  width?: number
  height?: number
  reason?: string
  message?: string
}

export interface UniverSheetGridProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  initialSnapshot?: Record<string, unknown> | null
  snapshotSeed?: string
  authoritativeDataSyncToken?: number
  workbookInstanceKey: string
  multiSheetWorkbookMode?: boolean
  /**
   * When true with {@link multiSheetWorkbookMode}, native sheet insert/copy/rename/delete
   * commands are cancelled and routed through {@link onNativeSheetStructureIntent} (REST-first).
   * Default: true.
   */
  apiFirstSheetStructure?: boolean
  onNativeSheetStructureIntent?: (intent: NativeSheetStructureIntent) => void
  onActiveWorksheetChange?: (sheetId: string, sheetName: string) => void
  /**
   * Multi-sheet context resolver. In `multiSheetWorkbookMode`, cell mutations
   * can target any worksheet Univer holds in memory, not just `sheet`.
   * When Univer reports a change on sheet X, this resolver supplies columns and rows
   * for conversion (rowIndex → rowId, column index → columnName).
   * Return `null` for unknown sheet ids; the grid falls back to single-sheet props.
   */
  getSheetContext?: (sheetId: string) => {
    columns: SpreadsheetColumn[]
    data: Record<string, unknown>[]
  } | null
  /**
   * Fires after Univer inserts a worksheet via its native sheet bar. The host should
   * persist a matching backend `SpreadsheetSheet` with the same id.
   */
  onUniverSheetInserted?: (payload: {
    kind: 'blank' | 'duplicate'
    sheetId: string
    sheetName: string
    index: number
    visualWorksheetSnapshot?: Record<string, unknown>
    sourceSheetId?: string
  }) => void
  /** Fires after Univer removes a worksheet via its native sheet bar. */
  onUniverSheetRemoved?: (payload: { sheetId: string }) => void
  /** Fires after Univer renames a worksheet (`SetWorksheetNameCommand`). */
  onUniverSheetRenamed?: (payload: { sheetId: string; sheetName: string }) => void
  /** Fires after Univer hides or shows a worksheet tab. */
  onUniverSheetVisibilityChanged?: (payload: { sheetId: string; hidden: boolean }) => void
  columns: SpreadsheetColumn[]
  isReadOnly: boolean
  onCellChange: (rowId: string, columnId: string, value: unknown, sheetId?: string) => void
  onCellsChange?: (
    cells: Array<{ rowId: string; columnName: string; value: unknown; sheetId?: string; traceId?: string }>
  ) => void
  onDiagnosticsTraceEvent?: (event: SpreadsheetTraceEventInput) => void
  onInitLifecycle?: (event: UniverSheetGridInitLifecycleEvent) => void
  onSnapshotRequested?: () => Promise<void> | void
  /** Throttled workbook snapshot scheduling and settlement (success or failure). */
  onWorkbookSnapshotLifecycle?: (event: WorkbookSnapshotLifecycleEvent) => void
  onDataChange: (data: Record<string, unknown>[], sheetId?: string) => void
  onOpenCommentRequest?: () => void
  commentedCells?: Array<{
    cellReference: string
    content: string
    createdByName?: string
    createdByAvatar?: string
    createdAt?: string
  }>
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  onColumnsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  onColumnsDelete?: (startIndex: number, endIndex: number) => void
  onColumnsMove?: (sourceStartIndex: number, count: number, destinationIndex: number) => void
  onRowsInsert?: (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => void
  onRowsDelete?: (startIndex: number, count: number) => void
  onRowsMove?: (sourceStartIndex: number, count: number, destinationIndex: number) => void
  /**
   * Fires for Univer's cell-range move (sheet.command.move-range / sheet.mutation.move-range /
   * sheet.mutation.move-cell). Emits the absolute source and destination rectangles (zero-based,
   * end-inclusive) so the embedding viewer can persist a single `move_cell_range` batch op.
   */
  onCellRangeMove?: (
    fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
    toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  ) => void
  onFormulaEvaluated?: (rowId: string, columnId: string, result: unknown) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: DocumentOperation) => void
  /**
   * Authoritative `set_style` batch op emitter. When provided, style-only cell
   * mutations route through this callback instead of legacy P2P relay.
   */
  onStyleBatchOp?: (data: {
    sheetId: string
    traceId?: string
    styles?: Record<string, unknown>
    cells: Array<{ row: number; col: number; cellRef?: string; stylePatch: SpreadsheetStylePatch }>
  }) => void
  /** Unified mutation callback for local waves that include value and/or style changes. */
  onMutationBatchOp?: (data: SpreadsheetUnifiedMutationBatchPayload) => void
  /**
   * Runs before unified HTTP batch when new rows must be materialized (`add_rows`) so `set_range` uses server ids.
   * Invoked on the spreadsheet operation queue; set from SpreadsheetAppViewer.
   *
   * Optional `finalize` callback runs INSIDE the same operation-queue task as the flush, immediately
   * after the flush completes. Callers (emit dispatch) use this to execute the post-flush
   * remap + HTTP submit atomically with respect to other queue tasks (other emits, debounced
   * data-change processing, snapshot checkpoints). Without this, the post-flush snapshot read can
   * race with a concurrent processUniverDataChange and drop or mis-map cell writes.
   */
  flushUnmaterializedRowsBeforePersistRef?: MutableRefObject<
    ((sheetId: string, finalize?: () => Promise<void>) => Promise<void>) | null
  >
  /** Session-backed row snapshot for remapping `client_*` ids after {@link flushUnmaterializedRowsBeforePersistRef}. */
  getPersistSheetRowsSnapshot?: (sheetId: string) => Record<string, unknown>[]
  /**
   * 2a: Single authoritative predicate for backend row UUIDs; should match pending-cell batch
   * logic. Hosts must wire this; the legacy `isUuidForRowRemap` slot is honored for one release.
   */
  isBackendRowUuid?: (value: string) => boolean
  /**
   * @deprecated 2a: Use {@link isBackendRowUuid}. The old name is honored for one release via
   * `resolveBackendRowUuidPredicate`, then removed.
   */
  isUuidForRowRemap?: (value: string) => boolean
  rowSlotIdentityRegistryRef?: MutableRefObject<SpreadsheetRowSlotIdentityRegistry | null>
  columnStructureStateRef?: MutableRefObject<{
    healthy: boolean
    pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
    expectedColumnsSignature: string | null
  }>
  onSpreadsheetFeatureBatchOp?: (data: SpreadsheetUnifiedMutationBatchPayload) => void
  onCursorEmit?: (position: { path: string[] }) => void
  getCanonicalSheetId?: (sheetId: string) => string
  collaborationEnabled?: boolean
  onDimensionsChange?: (payload: CellDimensionsPayload) => void
  height?: string | number
  width?: string | number
}

export interface CellDimensionsPayload {
  sheetId: string
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number; hd?: number }>
  rowData: Record<string | number, { h?: number; hd?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

export type ApplyRemoteCellUpdateOptions = {
  useSenderA1Row?: boolean
  /** Target worksheet for multi-sheet workbook mode. Defaults to the active worksheet. */
  targetSheetId?: string
  /** Style patch for `set_style`: remove `unset`, then assign `set`. */
  stylePatch?: SpreadsheetStylePatch | null
  /** Full Univer cell payload (preferred over scalar `value` when present). */
  univerCell?: Record<string, unknown> | null
  /** Style definitions to register before applying a cell that references them by id. */
  univerStyles?: Record<string, unknown> | null
  /**
   * When true, fully delete the cell entry in Univer (`setValue(null)`) instead of
   * preserving an existing style ref while blanking the value (e.g. remote `clear_all`).
   */
  removeCellEntry?: boolean
  diagnosticTraceSessionId?: string | null
  diagnosticTraceId?: string | null
  diagnosticBatchId?: string | null
  diagnosticOperationType?: string | null
}

/** Remote cell / range / feature application from collaboration or authoritative replay. */
export interface UniverSheetGridRemoteApplyHandle {
  applyRemoteCellUpdate: (
    rowIndex: number,
    colIndex: number,
    value: unknown,
    rowId?: string,
    options?: ApplyRemoteCellUpdateOptions
  ) => void
  applyRemoteCellUpdatesBulk?: (items: SpreadsheetBulkRemoteCellItem[], meta?: SpreadsheetBulkRemoteApplyMeta) => void
  /**
   * Apply server `clear_all` locally: `set-range-values` with null entries while
   * remote-update suppression is active (drops values + style refs).
   */
  applyRemoteClearAllRange?: (payload: {
    sheetId: string
    ranges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
  }) => void
  /**
   * Apply server `clear_format` locally: clears formatting while preserving values/formulas.
   */
  applyRemoteClearFormatRange?: (payload: {
    sheetId: string
    ranges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
  }) => void
  applyRemoteSpreadsheetFeatureOperation?: (payload: SpreadsheetRemoteFeatureOperationPayload) => void
}

/** Viewer row signature sync and forced reapply after authoritative data changes. */
export interface UniverSheetGridAuthoritativeHandle {
  prepareAuthoritativeRegionSync?: (region: AuthoritativeGridRegion | null) => void
  forceAuthoritativeReapply: (
    region?: AuthoritativeGridRegion | null,
    options?: ForceAuthoritativeGridReapplyOptions
  ) => void
  /**
   * After a native column insert/delete, Univer can emit cell/style mutations in the same
   * synchronous turn. React `useEffect` runs too late for `contextRef`, so row/column index
   * mapping would still match the pre-structural-change sheet. Call this immediately after
   * optimistically updating columns (and row data when columns were removed) so follow-up
   * mutations persist styles/values under the correct field names.
   */
  syncGridConversionContext?: (columns: SpreadsheetColumn[], data?: Record<string, unknown>[]) => void
}

/** Workbook snapshot IO and checkpoint scheduling for persistence. */
export interface UniverSheetGridSnapshotHandle {
  getWorkbookSnapshot: () => Record<string, unknown> | null
  getVisibleRangeValues: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
  requestSnapshotCheckpoint: (force?: boolean) => void
}

/** Column/row dimension payloads from remote peers or saved state. */
export interface UniverSheetGridDimensionsHandle {
  applyRemoteDimensions: (payload: CellDimensionsPayload) => void
}

export interface UniverSheetGridSelectionHandle {
  getActiveCellReference: () => string | null
}

/** Native worksheet insert/rename/remove via Univer commands. */
export interface UniverSheetGridWorksheetAdminHandle {
  ensureWorksheetExists: (
    sheet: SpreadsheetSheet,
    data?: Record<string, unknown>[],
    columns?: SpreadsheetColumn[],
    options?: {
      index?: number
      activate?: boolean
      replaceExisting?: boolean
      worksheetSnapshot?: Record<string, unknown>
    }
  ) => boolean
  renameWorksheet: (sheetId: string, sheetName: string) => boolean
  removeWorksheet: (sheetId: string) => boolean
  setWorksheetVisibility: (sheetId: string, hidden: boolean) => boolean
}

/** Imperative surface exposed on `ref` for viewer, collaboration, and checkpoints. */
export interface UniverSheetGridHandle
  extends UniverSheetGridRemoteApplyHandle,
    UniverSheetGridAuthoritativeHandle,
    UniverSheetGridSnapshotHandle,
    UniverSheetGridDimensionsHandle,
    UniverSheetGridSelectionHandle,
    UniverSheetGridWorksheetAdminHandle {}

/** Subset of {@link UniverSheetGridHandle} used by collaboration remote replay wiring. */
export type UniverSheetGridCollaborationBridgeHandle = UniverSheetGridRemoteApplyHandle &
  UniverSheetGridAuthoritativeHandle &
  UniverSheetGridDimensionsHandle &
  Pick<UniverSheetGridWorksheetAdminHandle, 'setWorksheetVisibility'>
