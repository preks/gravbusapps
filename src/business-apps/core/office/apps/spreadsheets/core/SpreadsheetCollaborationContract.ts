import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetColumn } from '../types'
import type { SpreadsheetViewerRow } from './SpreadsheetSession'

import type {
  AuthoritativeGridReapplyTarget,
  AuthoritativeGridRegion,
  ForceAuthoritativeGridReapplyOptions,
  PendingLocalFilterPolicy
} from '../utils/spreadsheetAuthoritativeRegion'
import type { SpreadsheetRemoteTransactionPlan } from './spreadsheetRemoteTransaction'
import type { UniverRemoteTransactionRunResult } from './univerRemoteTransactionRunner'

export type {
  AuthoritativeGridReapplyTarget,
  AuthoritativeGridRegion,
  ForceAuthoritativeGridReapplyOptions,
  PendingLocalFilterPolicy
}

export interface SpreadsheetStylePatch {
  /** Style keys to set/overwrite on the receiver cell. */
  set?: Record<string, unknown>
  /** Style keys to remove from the receiver cell. */
  unset?: string[]
}

/**
 * Payload shape for `set_style` batch operations (`operation.type === 'set_style'`).
 * Backend stores `data` as an opaque object; optional fields are forward-compatible.
 */
export interface SpreadsheetSetStyleBatchPayload {
  sheetId?: string
  traceId?: string
  styles?: Record<string, unknown>
  cells?: Array<{
    row?: number
    col?: number
    cellRef?: string
    stylePatch?: SpreadsheetStylePatch
  }>
}

export interface SpreadsheetCollaborationRange {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

export interface SpreadsheetFeatureOperationBasePayload {
  sheetId: string
  commandId?: string
  params?: Record<string, unknown>
}

export interface SpreadsheetMergeRangesPayload extends SpreadsheetFeatureOperationBasePayload {
  ranges: SpreadsheetCollaborationRange[]
}

export interface SpreadsheetUnmergeRangesPayload extends SpreadsheetFeatureOperationBasePayload {
  ranges: SpreadsheetCollaborationRange[]
}

export interface SpreadsheetFreezePanesPayload extends SpreadsheetFeatureOperationBasePayload {
  startRow?: number
  startColumn?: number
  ySplit?: number
  xSplit?: number
}

export interface SpreadsheetFilterUpdatePayload extends SpreadsheetFeatureOperationBasePayload {
  filter?: Record<string, unknown> | null
  range?: SpreadsheetCollaborationRange | null
}

export interface SpreadsheetFilterClearPayload extends SpreadsheetFeatureOperationBasePayload {
  range?: SpreadsheetCollaborationRange | null
}

export interface SpreadsheetVisibilityUpdatePayload extends SpreadsheetFeatureOperationBasePayload {
  axis: 'row' | 'column'
  ranges: Array<{ start: number; end: number }>
  hidden: boolean
}

export interface SpreadsheetProtectRangesUpdatePayload extends SpreadsheetFeatureOperationBasePayload {
  ranges: SpreadsheetCollaborationRange[]
  rules?: Record<string, unknown>[]
}

export interface SpreadsheetSheetProtectionUpdatePayload extends SpreadsheetFeatureOperationBasePayload {
  protection?: Record<string, unknown> | null
}

export type SpreadsheetFeatureOperationType =
  | 'merge_ranges'
  | 'unmerge_ranges'
  | 'freeze_panes'
  | 'filter_update'
  | 'filter_clear'
  | 'visibility_update'
  | 'protect_ranges_update'
  | 'sheet_protection_update'

export type SpreadsheetFeatureOperationPayload =
  | SpreadsheetMergeRangesPayload
  | SpreadsheetUnmergeRangesPayload
  | SpreadsheetFreezePanesPayload
  | SpreadsheetFilterUpdatePayload
  | SpreadsheetFilterClearPayload
  | SpreadsheetVisibilityUpdatePayload
  | SpreadsheetProtectRangesUpdatePayload
  | SpreadsheetSheetProtectionUpdatePayload

export interface SpreadsheetFeatureOperation {
  type: SpreadsheetFeatureOperationType
  data: SpreadsheetFeatureOperationPayload
}

export type SpreadsheetUnifiedMutationBatchOperationType =
  | 'add_rows'
  | 'set_range'
  | 'clear_cell'
  | 'set_style'
  | 'clear_all'
  | 'clear_format'
  | SpreadsheetFeatureOperationType

export interface SpreadsheetUnifiedMutationBatchOperation {
  type: SpreadsheetUnifiedMutationBatchOperationType
  data: Record<string, unknown>
}

/** Unified local mutation batch emitted by the grid for a single Univer mutation wave. */
export interface SpreadsheetUnifiedMutationBatchPayload {
  sheetId: string
  traceId?: string
  operations: SpreadsheetUnifiedMutationBatchOperation[]
}

export interface SpreadsheetRemoteDimensionsPayload {
  sheetId: string
  defaultColWidth: number
  defaultRowHeight: number
  columnData: Record<string | number, { w?: number; hd?: number }>
  rowData: Record<string | number, { h?: number; hd?: number }>
  rowHeaderWidth: number
  columnHeaderHeight: number
  zoomRatio: number
}

export interface SpreadsheetRemoteCellUpdateOptions {
  useSenderA1Row?: boolean
  targetSheetId?: string
  skipRemoteEchoRegistration?: boolean
  acknowledgedCellKeys?: readonly string[]
  stylePatch?: SpreadsheetStylePatch | null
  univerCell?: Record<string, unknown> | null
  univerStyles?: Record<string, unknown> | null
  /**
   * When true, fully delete the cell entry on the receiver instead of
   * preserving any existing style ref on the underlying Univer cell. Used by
   * the `clear_all` collaboration op to drop value + style + inline formatting
   * for every coordinate in the cleared range.
   */
  removeCellEntry?: boolean
  diagnosticTraceSessionId?: string | null
  diagnosticTraceId?: string | null
  diagnosticBatchId?: string | null
  diagnosticOperationType?: string | null
}

export interface SpreadsheetBulkRemoteCellItem {
  rowIndex: number
  colIndex: number
  value?: unknown
  rowId?: string
  options?: SpreadsheetRemoteCellUpdateOptions
}

export type SpreadsheetBulkRemoteApplyResultStatus = 'painted' | 'filtered_to_zero' | 'deferred_buffered'

export interface SpreadsheetBulkRemoteApplyResult {
  status: SpreadsheetBulkRemoteApplyResultStatus
  requestedCellCount: number
  paintedCellCount: number
  skippedCellCount: number
}

export interface SpreadsheetBulkRemoteApplyMeta {
  traceSessionId?: string | null
  traceId?: string | null
  batchId?: string | null
  operationType?: string | null
  /**
   * Exact semantic `rowId\u0000columnName` cells already accepted by the backend.
   * These may bypass stale local overlay/protection filters for the first
   * visible ack/local-echo paint only.
   */
  acknowledgedCellKeys?: readonly string[]
  /**
   * Skip registering remote-echo suppression for bulk paints that re-project
   * viewer data already visible in the grid.
   */
  skipRemoteEchoRegistration?: boolean
  /**
   * Invoked once after this bulk apply finishes (including serial fallback and early exits).
   * Used to chain dependent grid work (e.g. apply `set_style` after paste `set_range` values).
   */
  onApplyComplete?: () => void
}

export type SpreadsheetSessionDiffProjectionMode = 'allow' | 'skip'

export interface SpreadsheetRemoteClearFormatRangePayload {
  sheetId: string
  ranges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
}

export interface SpreadsheetRemoteClearAllRangePayload {
  sheetId: string
  ranges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
}

export interface SpreadsheetRemoteFeatureOperationPayload {
  type: SpreadsheetFeatureOperationType
  data: SpreadsheetFeatureOperationPayload
}

export interface SpreadsheetReplayDelta {
  operationType: string
  payload: Record<string, unknown>
  result?: Record<string, unknown>
  operationId?: string
  operationLogId?: string
  baseVersion?: number
  appliedVersion: number
}

export interface SpreadsheetReplayResponse {
  currentVersion: number
  changes: SpreadsheetReplayDelta[]
  requiresSnapshot: boolean
}

export interface SpreadsheetWorkbookStructureEvent {
  type: 'sheet_created' | 'sheet_renamed' | 'sheet_updated' | 'sheet_deleted'
  sheetId?: string
  sheet?: Record<string, unknown>
}

export interface SpreadsheetCollaborationCallbacks {
  getActiveSheetId: () => string
  getColumns: () => SpreadsheetColumn[]
  getColumnsForSheet?: (sheetId: string) => SpreadsheetColumn[]
  getSheetVersion?: (sheetId: string) => number
  getLocalSheetData: () => SpreadsheetViewerRow[]
  getSheetData?: (sheetId: string) => SpreadsheetViewerRow[]
  /** Live Univer workbook snapshot for committed-batch feature-matrix planning (Step 3). */
  getWorkbookSnapshot?: () => Record<string, unknown> | null
  getBackendRowIdForUiRowId: (uiRowId: string, univerRow?: number) => string | undefined
  commitLocalSheetData: (
    data: SpreadsheetViewerRow[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      suppressAuthoritativeDataSyncToken?: boolean
      sessionDiffProjectionMode?: SpreadsheetSessionDiffProjectionMode
      publishParent?: boolean
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
      authoritativeApplyMeta?: SpreadsheetBulkRemoteApplyMeta | null
    }
  ) => void
  commitSheetData?: (
    sheetId: string,
    data: SpreadsheetViewerRow[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      suppressAuthoritativeDataSyncToken?: boolean
      sessionDiffProjectionMode?: SpreadsheetSessionDiffProjectionMode
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
      authoritativeApplyMeta?: SpreadsheetBulkRemoteApplyMeta | null
    }
  ) => void
  applyRemoteCellUpdate: (
    rowIndex: number,
    colIndex: number,
    value: unknown,
    rowId?: string,
    options?: SpreadsheetRemoteCellUpdateOptions
  ) => void
  applyRemoteCellUpdatesBulk?: (
    items: SpreadsheetBulkRemoteCellItem[],
    meta?: SpreadsheetBulkRemoteApplyMeta
  ) => SpreadsheetBulkRemoteApplyResult
  /**
   * Apply a server-broadcast `clear_all` op on the receiver. Dispatches
   * Univer's `sheet.mutation.set-range-values` for the provided ranges while
   * remote-update suppression is active. Removes cell values and style refs
   * for each addressed coordinate.
   */
  applyRemoteClearAllRange?: (
    payload: SpreadsheetRemoteClearAllRangePayload,
    meta?: SpreadsheetBulkRemoteApplyMeta
  ) => void
  /**
   * Apply a server-broadcast `clear_format` op on the receiver. Dispatches
   * Univer's `sheet.command.clear-selection-format` for each range while
   * remote-update suppression is active so we don't echo the op back. Drops
   * the style ref + inline formatting (`bg`, `cl`, `bd`, `bl`, `it`, `ul`, …)
   * for every cell in the range while preserving cell values, formulas, and
   * rich text payload — matching Univer's "Clear Format" semantics.
   */
  applyRemoteClearFormatRange?: (
    payload: SpreadsheetRemoteClearFormatRangePayload,
    meta?: SpreadsheetBulkRemoteApplyMeta
  ) => void
  applyRemoteSpreadsheetFeatureOperation?: (
    payload: SpreadsheetRemoteFeatureOperationPayload,
    meta?: SpreadsheetBulkRemoteApplyMeta
  ) => void
  applyRemoteDimensions?: (payload: SpreadsheetRemoteDimensionsPayload) => void
  runRemoteTransaction?: (
    plan: Extract<SpreadsheetRemoteTransactionPlan, { ok: true }>
  ) => UniverRemoteTransactionRunResult
  forceGridReapply?: (
    sheetId: string,
    region?: AuthoritativeGridReapplyTarget,
    options?: ForceAuthoritativeGridReapplyOptions
  ) => void
  onVersionUpdate: (version: number) => void
  onSheetVersionUpdate?: (sheetId: string, version: number) => void
  onWorkbookStructureChange?: (event: SpreadsheetWorkbookStructureEvent) => void
  markSheetNeedsGridMaterialization?: (sheetId: string, reason: string) => void
  requestSheetCatchUp?: (
    sheetId: string,
    reason: 'version_gap' | 'row_identity_mismatch' | 'stale_version_data_op',
    options: { sinceVersion: number; incomingVersion: number }
  ) => void
  scheduleSheetVersionRefreshFromApi: () => void
  scheduleRemoteStructuralResync: (sheetId?: string, options?: { immediate?: boolean }) => void
  onRemoteColumnUpdate?: (data: Record<string, unknown>) => void
  applyRemoteColumnReorder?: (params: {
    sheetId: string
    previousColumns: SpreadsheetColumn[]
    nextColumns: SpreadsheetColumn[]
  }) => boolean
  applyRemoteRowSlotsMove?: (params: {
    sheetId: string
    sourceStartGridRowIndex: number
    count: number
    destinationGridRowIndex: number
  }) => boolean
  applyRemoteInsertRowSlots?: (params: { sheetId: string; startGridRowIndex: number; count: number }) => boolean
  applyRemoteDeleteRowSlots?: (params: { sheetId: string; startGridRowIndex: number; count: number }) => boolean
  applyRemoteInsertColumnSlots?: (params: { sheetId: string; startGridColumnIndex: number; count: number }) => boolean
  applyRemoteDeleteColumnSlots?: (params: { sheetId: string; startGridColumnIndex: number; count: number }) => boolean
  applyRemoteMoveCellRange?: (params: {
    sheetId: string
    fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  }) => boolean
  isRecentLocalBatchId?: (batchId: string | undefined, tabId?: string | undefined) => boolean
  /** True while local/remote sheet queue work is still settling; used to defer version-related snapshot reloads. */
  isSheetPersistenceBusy?: (sheetId: string) => boolean
  fetchChangesSince?: (sheetId: string, sinceVersion: number) => Promise<SpreadsheetReplayResponse>
  isCollabDiagEnabled?: () => boolean
  onCollabDiagnostic?: (event: string, meta?: Record<string, number | string | boolean | undefined>) => void
  onDiagnosticsTraceEvent?: (event: SpreadsheetTraceEventInput) => void
  onPendingQueueTrimmed?: (droppedCount: number) => void
}

export interface SpreadsheetCollaborationContract {
  fetchChangesSince(sheetId: string, sinceVersion: number): Promise<SpreadsheetReplayResponse>
  requestSheetCatchUp(
    sheetId: string,
    reason: 'version_gap' | 'row_identity_mismatch' | 'stale_version_data_op',
    options: { sinceVersion: number; incomingVersion: number }
  ): void
  scheduleRemoteStructuralResync(sheetId?: string, options?: { immediate?: boolean }): void
}
