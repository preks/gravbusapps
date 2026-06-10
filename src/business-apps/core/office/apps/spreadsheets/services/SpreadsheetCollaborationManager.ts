// Centralized spreadsheet collaboration logic: emit, receive, echo suppression, operation queuing.

import type { DocumentOperation } from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import type {
  SpreadsheetBulkRemoteApplyResult,
  SpreadsheetBulkRemoteApplyMeta,
  SpreadsheetBulkRemoteCellItem,
  SpreadsheetCollaborationCallbacks,
  SpreadsheetFeatureOperationPayload,
  SpreadsheetFeatureOperationType,
  SpreadsheetRemoteCellUpdateOptions as ApplyRemoteCellUpdateOptions,
  SpreadsheetRemoteDimensionsPayload as CellDimensionsPayload,
  SpreadsheetReplayDelta as DeltaChange,
  SpreadsheetStylePatch
} from '../core'
import {
  buildCommittedBatchDedupeKey,
  getSpreadsheetDeltaReplayMode,
  normalizeCellValueForBatchPersistence,
  replayDeltasAsCommittedBatches,
  SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION,
  normalizeCommittedBatchEnvelope,
  parseA1Reference,
  planCommittedSpreadsheetRemoteTransaction,
  SpreadsheetSnapshotFallbackController,
  isVersionRelatedSnapshotFallbackReason,
  sheetDeltaRequiresFullSnapshot,
  type SpreadsheetCommittedBatchEnvelope,
  type SpreadsheetCommittedOperation,
  type SpreadsheetSnapshotFallbackReason,
  validateCommittedBatchForLiveApply,
  isDeprecatedWsStructuralRelayOperation,
  isLegacyWsRelayOperation,
  resolveWireOperationAppliedVersion,
  synthesizeCommittedBatchFromWireOperation,
  planCommittedBatchDirtyRegions
} from '../core'
import { SpreadsheetCollaborationBlockedRecoveryTracker } from '../core/spreadsheetCollaborationBlockedRecovery'
import type { SpreadsheetColumn, SpreadsheetMergeRange } from '../types'
import {
  coalesceAdjacentColumnSlotInserts,
  extractContiguousColumnSlotInsert,
  coalesceAdjacentColumnSlotDeletes,
  extractContiguousColumnSlotDelete,
  mergeRemoteColumnAdd,
  visibleGridColumnIndexFromColumn
} from '../utils/spreadsheetColumnGridIndex'
import {
  classifyNativeColumnReorderWithMerges,
  normalizeColumnMoveDestinationIndex,
  visibleColumnsInGridOrder,
  type ColumnReorderMove
} from '../utils/spreadsheetColumnReorderMoves'
import { applyColumnVisibilityRangesToSpreadsheetColumns } from '../utils/spreadsheetColumnVisibilityMetadata'
import { prefersCanonicalReloadForMaterializationReason } from '../utils/spreadsheetGridMaterialization'
import { createUniverConversionContext, snapshotTrackingHeaderMatchesColumnLabels } from '../utils/univerAdapter'
import type {
  AuthoritativeGridRegion,
  AuthoritativeGridReapplyTarget,
  PendingLocalFilterPolicy
} from '../utils/spreadsheetAuthoritativeRegion'
import {
  resolveBackendDirtyRegionsToAuthoritativeRegions,
  type SpreadsheetDirtyRegion
} from '../utils/spreadsheetDirtyRegions'
import { classifyBackendDirtyRegionReapply } from '../utils/spreadsheetBackendRepairReapply'
import type { SpreadsheetDeltaDirtyRegion } from '../core/spreadsheetDeltaRegionPlanner'
import { SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH } from '../utils/spreadsheetBulkRemoteConstants'
import {
  clampClearAllRangeToBounds,
  dedupeClearAllRanges,
  type ClearAllGridBounds
} from '../components/univerGridRangeSelection'
import { applyMoveCellRangeToViewerRows, parseMoveCellRangeWirePayload } from '../utils/spreadsheetMoveCellRangeGrid'
import { mergeInsertedRowsAtIndex } from '../utils/spreadsheetInsertRowsAt'
import {
  buildViewerRowVisualIndexByIdentity,
  findViewerRowVisualIndex,
  getViewerRowVisualIndex,
  lookupViewerRowVisualIndex,
  sortRowsByCanonicalVisualOrder
} from '../utils/spreadsheetPeerRowHydration'
import {
  applyDeleteRowSlotsTransform,
  applyInsertRowSlotsTransform,
  applyMoveRowSlotsTransform
} from '../utils/spreadsheetRowSlotTransforms'
import { getCanonicalRowId, rowMatchesRemoteId, type ViewerRow } from '../utils/spreadsheetRowIdentity'
import { resolveViewerRowIndexForRemoteId } from '../utils/spreadsheetRowProjection'
import { applyCommittedGridRowPlacements } from '../utils/spreadsheetCommittedGridRowPlacements'
import type { SpreadsheetTraceEventInput } from './spreadsheetDiagnostics'

/**
 * True when `remoteRowId` from the wire (persisted / backend UUID from emit) identifies this row.
 * Emit uses the first UUID among _id, _rowUuid, id; canonical row id prefers _id ?? id. When _id is a
 * non-UUID client id and the backend UUID lives on id or _rowUuid, canonical-only matching would miss.
 */
const rowMatchesRemoteRowId = rowMatchesRemoteId

const toNumberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

const hasInsertRowSlotsOperation = (operations: readonly Pick<SpreadsheetCommittedOperation, 'type'>[]): boolean =>
  operations.some(operation => operation.type === 'insert_row_slots')

const hasColumnReorderStructuralOperation = (
  operations: readonly Pick<SpreadsheetCommittedOperation, 'type'>[]
): boolean => operations.some(operation => operation.type === 'columns_reorder' || operation.type === 'column_reorder')

const hasColumnSlotStructuralOperation = (
  operations: readonly Pick<SpreadsheetCommittedOperation, 'type'>[]
): boolean => operations.some(operation => operation.type === 'column_add' || operation.type === 'column_delete')

const hasColumnStructuralOperation = (operations: readonly Pick<SpreadsheetCommittedOperation, 'type'>[]): boolean =>
  hasColumnSlotStructuralOperation(operations) || hasColumnReorderStructuralOperation(operations)

const MAX_INACTIVE_STRUCTURAL_BATCH_OPERATIONS = 24
const MAX_INACTIVE_STRUCTURAL_BATCH_UNITS = 128

const explicitColumnReorderMovesReachTarget = (params: {
  previousColumns: SpreadsheetColumn[]
  nextColumns: SpreadsheetColumn[]
  explicitMoves?: ColumnReorderMove[]
}): boolean => {
  const explicitMoves = Array.isArray(params.explicitMoves) ? params.explicitMoves.filter(move => move.count > 0) : []
  if (explicitMoves.length === 0) return false
  const workingVisibleIds = visibleColumnsInGridOrder(params.previousColumns).map(column => column.id)
  const nextVisibleIds = visibleColumnsInGridOrder(params.nextColumns).map(column => column.id)
  for (const move of explicitMoves) {
    const clampedSourceStart = Math.max(0, Math.min(move.sourceStartColumn, workingVisibleIds.length))
    const clampedCount = Math.max(0, Math.min(move.count, Math.max(0, workingVisibleIds.length - clampedSourceStart)))
    if (clampedCount === 0) continue
    const destinationIndex = normalizeColumnMoveDestinationIndex(
      clampedSourceStart,
      clampedCount,
      move.destinationStartColumn
    )
    if (destinationIndex == null) return false
    const movedIds = workingVisibleIds.splice(clampedSourceStart, clampedCount)
    workingVisibleIds.splice(destinationIndex, 0, ...movedIds)
  }
  return workingVisibleIds.join('|') === nextVisibleIds.join('|')
}

type SpreadsheetStaleRecoveryLifecycleStage =
  | 'catchup_started'
  | 'catchup_noop'
  | 'catchup_applied'
  | 'catchup_failed'
  | 'snapshot_fallback_scheduled'
  | 'snapshot_reload_started'
  | 'snapshot_reload_succeeded'
  | 'snapshot_reload_failed'
  | 'snapshot_reload_skipped'

interface SpreadsheetStaleRecoveryState {
  active: boolean
  watermarkVersion: number
}

interface DeferredSnapshotFallbackEntry {
  timer: ReturnType<typeof setTimeout>
  sheetId: string
  reason: SpreadsheetSnapshotFallbackReason
  immediate?: boolean
  detail?: string
  version?: number | null
  traceSessionId?: string
  traceId?: string
  batchId?: string
  operationType?: string
}

type StaleDataOpCatchUpDecision = 'scheduled' | 'covered_skip' | 'recovery_active' | 'coalesced'

const mapCreatedRowsFromWireRows = (rows: unknown): ViewerRow[] => {
  if (!Array.isArray(rows)) return []
  const mappedRows: ViewerRow[] = []
  for (const entry of rows) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const rowData = record.data && typeof record.data === 'object' ? (record.data as ViewerRow) : record
    const backendId = record.id != null ? String(record.id) : ''
    const clientRowId = typeof rowData._clientRowId === 'string' && rowData._clientRowId ? rowData._clientRowId : ''
    if (clientRowId) {
      const fallbackId =
        backendId ||
        (rowData._rowUuid != null ? String(rowData._rowUuid) : '') ||
        (rowData.id != null ? String(rowData.id) : '') ||
        clientRowId
      mappedRows.push({
        ...rowData,
        _id: fallbackId,
        _clientRowId: clientRowId,
        _rowUuid: fallbackId
      })
      continue
    }
    const resolvedId = backendId || getCanonicalRowId(rowData)
    mappedRows.push({
      ...rowData,
      _id: resolvedId || `row_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      ...(backendId ? { _rowUuid: backendId } : {})
    })
  }
  return mappedRows
}

const mergeCreatedRows = (existingRows: ViewerRow[], createdRows: ViewerRow[]): ViewerRow[] => {
  if (createdRows.length === 0) return existingRows
  const createdById = new Map<string, ViewerRow>()
  for (const row of createdRows) {
    const rowId = getCanonicalRowId(row)
    if (rowId) createdById.set(rowId, row)
    for (const altId of [row._rowUuid, row.id, row._clientRowId]) {
      if (altId != null) createdById.set(String(altId), row)
    }
  }

  const replaced = new Set<ViewerRow>()
  const nextRows = existingRows.map(row => {
    const replacement = [row._id, row.id, row._rowUuid, row._clientRowId]
      .map(value => (value == null ? '' : String(value)))
      .filter(Boolean)
      .map(id => createdById.get(id))
      .find(Boolean)
    if (!replacement) return row
    replaced.add(replacement)
    return replacement
  })

  for (const row of createdRows) {
    if (replaced.has(row)) continue
    if (nextRows.some(existing => rowMatchesRemoteRowId(existing, getCanonicalRowId(row)))) continue
    nextRows.push(row)
  }
  return nextRows
}

const rowPlaceholdersFromIds = (rowIds: unknown): ViewerRow[] => {
  if (!Array.isArray(rowIds)) return []
  return rowIds
    .map(rowId => String(rowId || '').trim())
    .filter(Boolean)
    .map(rowId => ({ _id: rowId, _rowUuid: rowId }))
}

export interface CellsChangedCell {
  rowId: string
  column: string
  /** When omitted, this payload is formatting-only (still applies {@link univerCell} on the grid). */
  value?: unknown
  cellRef?: string
  /** Serialized Univer {@link ICellData} for the cell (may include inline or ref style). */
  univerCell?: Record<string, unknown>
  /** Style definitions keyed by id when {@link univerCell} uses string style refs. Remotes call `addStyles` before `setValue`. */
  univerStyles?: Record<string, unknown>
}

export interface CellsChangedPayload {
  sheetId: string
  cells: CellsChangedCell[]
}

export type CollaborationCallbacks = SpreadsheetCollaborationCallbacks

const MAX_PENDING_OPS = 200

export type CollaborationOperation = {
  userId: string
  userName: string
  operation: {
    type: string
    data?: unknown
    broadcastOnly?: boolean
    _clientOpId?: string
    baseVersion?: number
    version?: number
  }
  version?: number
  timestamp: number
}

function normalizeCellRangeRect(value: unknown): {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
} | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const startRow = Number(candidate.startRow)
  const endRow = Number(candidate.endRow)
  const startColumn = Number(candidate.startColumn)
  const endColumn = Number(candidate.endColumn)
  if (!Number.isFinite(startRow) || startRow < 0) return null
  if (!Number.isFinite(startColumn) || startColumn < 0) return null
  if (!Number.isFinite(endRow) || endRow < startRow) return null
  if (!Number.isFinite(endColumn) || endColumn < startColumn) return null
  return { startRow, endRow, startColumn, endColumn }
}

const STRUCTURAL_OPS = new Set([
  'row_add',
  'row_delete',
  'add_rows',
  'insert_rows_at',
  'insert_row_slots',
  'delete_row_slots',
  'move_row_slots',
  'move_cell_range',
  'column_add',
  'column_delete',
  'columns_reorder'
])

const CELL_OP_TYPES = new Set(['set_cell', 'set_range', 'clear_cell', 'cells_changed'])
const LIVE_PERSISTED_CELL_OP_TYPES = new Set(['set_cell', 'set_range', 'clear_cell'])
const LIVE_STRUCTURAL_OP_TYPES = new Set([
  'row_add',
  'row_delete',
  'add_rows',
  'insert_rows_at',
  'insert_row_slots',
  'delete_rows',
  'delete_row_slots',
  'move_row_slots',
  'move_cell_range'
])
const LIVE_ROW_STRUCTURAL_OP_TYPES = new Set([
  'row_add',
  'row_delete',
  'add_rows',
  'insert_rows_at',
  'insert_row_slots',
  'delete_rows',
  'delete_row_slots',
  'move_row_slots',
  'move_cell_range'
])
const SPREADSHEET_FEATURE_OP_TYPES = new Set<SpreadsheetFeatureOperationType>([
  'merge_ranges',
  'unmerge_ranges',
  'freeze_panes',
  'filter_update',
  'filter_clear',
  'visibility_update',
  'protect_ranges_update',
  'sheet_protection_update'
])
/**
 * Per §4.5 of the collab rework plan: structural column ops arrive as
 * authoritative batch ops broadcast from the server. We don't have enough
 * local state in the manager to mutate `app.sheets[].columns` precisely
 * here, so we trigger a canonical-snapshot resync via the existing
 * structural reconciliation path. Peers see the change within one
 * round-trip to the server.
 */
const COLUMN_STRUCTURAL_OP_TYPES = new Set(['column_add', 'column_delete', 'columns_reorder', 'column_reorder'])
/** Per-op types applied directly to the Univer snapshot on the receiver. */
const SNAPSHOT_DIMENSION_OP_TYPES = new Set(['set_row_height', 'set_col_width'])
/** Diagnostics-only: large live cell apply counts from batch_operations. */
const MAX_LIVE_REMOTE_CELL_APPLY = 500
const CLIENT_OP_ECHO_TTL_MS = 15000

type TaggedDocumentOperation = DocumentOperation & {
  _retried?: boolean
  _clientOpId?: string
}

type DiagnosticsTraceMeta = {
  traceSessionId?: string
  traceId?: string
  batchId?: string
  tabId?: string
}

type DeferredSetStyleOperation = {
  data: unknown
  traceMeta?: DiagnosticsTraceMeta
  fallbackSheetId?: string
}

type DataModelApplyResult = {
  changedKeys: Set<string>
  matchedRowCount: number
  requestedRowCount: number
}

const getDiagnosticsTraceMeta = (data: unknown): DiagnosticsTraceMeta => {
  if (!data || typeof data !== 'object') return {}
  const record = data as Record<string, unknown>
  return {
    traceSessionId: typeof record.traceSessionId === 'string' ? record.traceSessionId : undefined,
    traceId: typeof record.traceId === 'string' ? record.traceId : undefined,
    batchId: typeof record.batchId === 'string' ? record.batchId : undefined,
    tabId: typeof record.tabId === 'string' ? record.tabId : undefined
  }
}

const hasFullColumnObjectsForRemoteReorder = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false
  const columns = (data as { columns?: unknown }).columns
  return (
    Array.isArray(columns) &&
    columns.length > 0 &&
    columns.every(
      column =>
        column &&
        typeof column === 'object' &&
        !Array.isArray(column) &&
        typeof (column as { id?: unknown }).id === 'string'
    )
  )
}

const normalizeStylePatch = (value: unknown): SpreadsheetStylePatch | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const set =
    record.set && typeof record.set === 'object' && !Array.isArray(record.set)
      ? ({ ...(record.set as Record<string, unknown>) } as Record<string, unknown>)
      : undefined
  const unset = Array.isArray(record.unset)
    ? record.unset.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    : undefined
  if ((!set || Object.keys(set).length === 0) && (!unset || unset.length === 0)) return null
  return {
    ...(set && Object.keys(set).length > 0 ? { set } : {}),
    ...(unset && unset.length > 0 ? { unset } : {})
  }
}

export class SpreadsheetCollaborationManager {
  private callbacks: CollaborationCallbacks
  private emitFn: ((op: DocumentOperation) => void) | null = null
  private emitCursorFn: ((pos: { path?: string[] }) => void) | null = null
  private connected = false
  private joined = false
  private pendingOps: TaggedDocumentOperation[] = []
  private pendingCursor: { path?: string[] } | null = null
  private currentUserId: string | null = null
  private lastKnownVersion = 0
  private reconciling = false
  private collabDiagSeq = 0
  private deferredCellsChangedBySheet = new Map<string, CellsChangedPayload[]>()
  private deferredSetStyleBySheet = new Map<string, DeferredSetStyleOperation[]>()
  private recentOutgoingClientOpIds = new Map<string, number>()
  private appliedCommittedBatchKeys = new Set<string>()
  private readonly snapshotFallbackController: SpreadsheetSnapshotFallbackController
  private readonly blockedRecoveryTracker = new SpreadsheetCollaborationBlockedRecoveryTracker()
  private readonly deferredSnapshotFallbackTimers = new Map<string, DeferredSnapshotFallbackEntry>()
  private readonly coalescedCatchUpSinceVersionByKey = new Map<string, number>()
  private readonly staleRecoveryStateBySheet = new Map<string, SpreadsheetStaleRecoveryState>()
  private readonly inactiveSheetsAwaitingCanonicalMaterialization = new Set<string>()
  private readonly confirmedPhysicalColumnOrderBySheetId = new Map<string, string[]>()

  constructor(callbacks: CollaborationCallbacks) {
    this.callbacks = callbacks
    this.snapshotFallbackController = new SpreadsheetSnapshotFallbackController(request => {
      const options = request.immediate === undefined ? undefined : { immediate: request.immediate }
      if (request.sheetId === undefined && options === undefined) {
        this.callbacks.scheduleRemoteStructuralResync()
        return
      }
      if (options === undefined) {
        this.callbacks.scheduleRemoteStructuralResync(request.sheetId)
        return
      }
      this.callbacks.scheduleRemoteStructuralResync(request.sheetId, options)
    })
  }

  /** Debug-only: counts / reasons only (gated by {@link CollaborationCallbacks.isCollabDiagEnabled}). */
  private collabDiag(event: string, meta?: Record<string, number | string | boolean | undefined>): void {
    const gate = this.callbacks.isCollabDiagEnabled
    if (typeof gate !== 'function' || !gate()) return
    this.collabDiagSeq += 1
    this.callbacks.onCollabDiagnostic?.(event, { seq: this.collabDiagSeq, ...meta })
  }

  private clearCoalescedCatchUpRequests(): void {
    this.coalescedCatchUpSinceVersionByKey.clear()
  }

  private getStaleRecoveryState(sheetId: string): SpreadsheetStaleRecoveryState {
    return this.staleRecoveryStateBySheet.get(sheetId) ?? { active: false, watermarkVersion: -1 }
  }

  private patchStaleRecoveryState(
    sheetId: string,
    updater: (current: SpreadsheetStaleRecoveryState) => SpreadsheetStaleRecoveryState
  ): SpreadsheetStaleRecoveryState {
    const next = updater(this.getStaleRecoveryState(sheetId))
    this.staleRecoveryStateBySheet.set(sheetId, next)
    return next
  }

  private clearDeferredVersionSnapshotFallbacks(sheetId: string, resolution: 'catchup_applied' | 'catchup_noop'): void {
    for (const [deferKey, entry] of this.deferredSnapshotFallbackTimers) {
      if (entry.sheetId !== sheetId || !isVersionRelatedSnapshotFallbackReason(entry.reason)) {
        continue
      }
      globalThis.clearTimeout(entry.timer)
      this.deferredSnapshotFallbackTimers.delete(deferKey)
      this.collabDiag('snapshot_fallback_resolved_by_delta', {
        sheetId: entry.sheetId,
        reason: entry.reason,
        detail: resolution
      })
      this.traceEvent({
        source: 'client',
        stage: 'client_snapshot_fallback_resolved_by_delta',
        severity: 'info',
        traceSessionId: entry.traceSessionId,
        traceId: entry.traceId,
        batchId: entry.batchId,
        operationType: entry.operationType,
        version: entry.version ?? null,
        payload: {
          sheetId: entry.sheetId,
          reason: entry.reason,
          resolution
        }
      })
    }
  }

  private shouldSuppressStaleRecovery(
    sheetId: string,
    incomingVersion: number,
    options?: { replayCritical?: boolean; stateCovered?: boolean }
  ): 'covered_by_recovery_watermark' | 'recovery_active' | null {
    const state = this.getStaleRecoveryState(sheetId)
    if (incomingVersion <= state.watermarkVersion) {
      if (options?.replayCritical && options.stateCovered !== true) {
        return null
      }
      this.collabDiag('collab_stale_data_op_suppressed', {
        sheetId,
        incomingVersion,
        reason: 'covered_by_recovery_watermark',
        watermarkVersion: state.watermarkVersion
      })
      return 'covered_by_recovery_watermark'
    }
    if (state.active) {
      this.collabDiag('collab_stale_data_op_suppressed', {
        sheetId,
        incomingVersion,
        reason: 'recovery_active',
        watermarkVersion: state.watermarkVersion
      })
      return 'recovery_active'
    }
    return null
  }

  private requestSheetCatchUpCoalesced(
    sheetId: string,
    reason: 'version_gap' | 'row_identity_mismatch' | 'stale_version_data_op',
    options: { sinceVersion: number; incomingVersion: number }
  ): boolean {
    const requestCatchUp = this.callbacks.requestSheetCatchUp
    if (!requestCatchUp) return false
    if (reason === 'row_identity_mismatch') {
      requestCatchUp(sheetId, reason, options)
      return true
    }
    const coalesceKey = `${sheetId}:${reason}`
    const existingSinceVersion = this.coalescedCatchUpSinceVersionByKey.get(coalesceKey)
    if (existingSinceVersion != null && options.sinceVersion >= existingSinceVersion) {
      this.collabDiag('collab_catchup_request_coalesced', {
        sheetId,
        reason,
        sinceVersion: options.sinceVersion,
        incomingVersion: options.incomingVersion,
        existingSinceVersion
      })
      return false
    }
    this.coalescedCatchUpSinceVersionByKey.set(coalesceKey, options.sinceVersion)
    requestCatchUp(sheetId, reason, options)
    return true
  }

  private findViewerRowByRemoteId(sheetId: string, remoteRowId: string): ViewerRow | undefined {
    if (!remoteRowId) return undefined
    return this.getSheetData(sheetId).find(row => rowMatchesRemoteRowId(row, remoteRowId))
  }

  private areViewerRowValuesCovered(sheetId: string, row: ViewerRow, expected: Record<string, unknown>): boolean {
    const columns = this.getColumnsForSheet(sheetId)
    const columnsByKey = new Map(
      columns.flatMap(column =>
        [column.id, column.name, column.label]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .map(key => [key, column] as const)
      )
    )
    for (const [key, value] of Object.entries(expected)) {
      if (key === '_updatedAt' || key === '_id' || key === '_rowUuid' || key === '_clientRowId' || key === 'id') {
        continue
      }
      const targetColumnName = this.resolveColumnName(key, sheetId)
      const targetColumn = columnsByKey.get(key) ?? columnsByKey.get(targetColumnName)
      const normalizedExpected = normalizeCellValueForBatchPersistence(value, targetColumn)
      if (!Object.is(row[targetColumnName], normalizedExpected)) {
        return false
      }
    }
    return true
  }

  private buildStateCoverageUpdatesByRowId(
    operationType: string,
    data: unknown,
    sheetId: string
  ): Map<string, Record<string, unknown>> | null {
    if (!data || typeof data !== 'object') return null
    const payload = data as Record<string, unknown>
    if (operationType === 'set_cell') {
      const rowId = String(payload.rowId ?? '')
      const column = String(payload.columnName ?? payload.column ?? '')
      if (!rowId || !column) return null
      const targetColumnName = this.resolveColumnName(column, sheetId)
      const targetColumn = this.getColumnsForSheet(sheetId).find(
        existing => existing.id === column || existing.name === targetColumnName || existing.label === column
      )
      return new Map([
        [
          rowId,
          {
            [targetColumnName]: normalizeCellValueForBatchPersistence(payload.value, targetColumn)
          }
        ]
      ])
    }
    if (operationType === 'clear_cell') {
      const rowId = String(payload.rowId ?? '')
      const column = String(payload.columnName ?? payload.column ?? '')
      if (!rowId || !column) return null
      return new Map([[rowId, { [this.resolveColumnName(column, sheetId)]: null }]])
    }
    if (operationType === 'set_range' || operationType === 'cells_changed') {
      const cells = payload.cells
      if (!Array.isArray(cells)) return null
      const updatesByRowId = new Map<string, Record<string, unknown>>()
      for (const cell of cells) {
        if (!cell || typeof cell !== 'object') continue
        const record = cell as Record<string, unknown>
        const rowId = String(record.rowId ?? '')
        const column = String(record.columnName ?? record.column ?? '')
        if (!rowId || !column) continue
        if (operationType === 'cells_changed' && !Object.prototype.hasOwnProperty.call(record, 'value')) {
          continue
        }
        const targetColumnName = this.resolveColumnName(column, sheetId)
        const targetColumn = this.getColumnsForSheet(sheetId).find(
          existing => existing.id === column || existing.name === targetColumnName || existing.label === column
        )
        const normalizedValue =
          operationType === 'set_range' && !Object.prototype.hasOwnProperty.call(record, 'value')
            ? null
            : normalizeCellValueForBatchPersistence(record.value, targetColumn)
        const existing = updatesByRowId.get(rowId) ?? {}
        existing[targetColumnName] = normalizedValue
        updatesByRowId.set(rowId, existing)
      }
      return updatesByRowId.size > 0 ? updatesByRowId : null
    }
    if (operationType === 'row_update') {
      const rowId = String(payload.rowId ?? '')
      const rowData = payload.rowData
      if (!rowId || !rowData || typeof rowData !== 'object') return null
      const normalizedUpdates: Record<string, unknown> = {}
      for (const [columnKey, value] of Object.entries(rowData as Record<string, unknown>)) {
        if (columnKey === '_updatedAt') continue
        normalizedUpdates[this.resolveColumnName(columnKey, sheetId)] = value
      }
      return Object.keys(normalizedUpdates).length > 0 ? new Map([[rowId, normalizedUpdates]]) : null
    }
    return null
  }

  private isReplayCriticalOperationStateCovered(
    sheetId: string,
    operation: CollaborationOperation['operation']
  ): boolean {
    const type = typeof operation.type === 'string' ? operation.type : ''
    if (!type) return false
    if (type === 'batch_operations') {
      const operations = (operation.data as { operations?: Array<CollaborationOperation['operation']> } | undefined)
        ?.operations
      return Array.isArray(operations) && operations.length > 0
        ? operations.every(inner => this.isReplayCriticalOperationStateCovered(sheetId, inner))
        : false
    }
    const updatesByRowId = this.buildStateCoverageUpdatesByRowId(type, operation.data, sheetId)
    if (updatesByRowId) {
      return Array.from(updatesByRowId.entries()).every(([rowId, updates]) => {
        const row = this.findViewerRowByRemoteId(sheetId, rowId)
        return row ? this.areViewerRowValuesCovered(sheetId, row, updates) : false
      })
    }
    if (type === 'add_rows' || type === 'insert_rows_at' || type === 'insert_row_slots') {
      const createdRows = mapCreatedRowsFromWireRows((operation.data as Record<string, unknown> | undefined)?.rows)
      return createdRows.length > 0
        ? createdRows.every(createdRow => {
            const rowId = getCanonicalRowId(createdRow)
            const row = rowId ? this.findViewerRowByRemoteId(sheetId, rowId) : undefined
            return row ? this.areViewerRowValuesCovered(sheetId, row, createdRow) : false
          })
        : false
    }
    if (type === 'row_add') {
      const placeholderRows = rowPlaceholdersFromIds((operation.data as Record<string, unknown> | undefined)?.rowIds)
      return placeholderRows.length > 0
        ? placeholderRows.every(row => {
            const rowId = getCanonicalRowId(row)
            return rowId ? Boolean(this.findViewerRowByRemoteId(sheetId, rowId)) : false
          })
        : false
    }
    if (type === 'delete_rows' || type === 'row_delete') {
      const rowIds = Array.isArray((operation.data as Record<string, unknown> | undefined)?.rowIds)
        ? ((operation.data as Record<string, unknown>).rowIds as unknown[])
            .map(rowId => String(rowId ?? ''))
            .filter(Boolean)
        : []
      return rowIds.length > 0 ? rowIds.every(rowId => this.findViewerRowByRemoteId(sheetId, rowId) == null) : false
    }
    return false
  }

  private traceReplayCriticalCoveredSkip(params: {
    sheetId: string
    incomingVersion: number
    knownVersion: number | null
    operationType: string
    traceMeta?: {
      traceSessionId?: string
      traceId?: string
      batchId?: string
    }
  }): void {
    this.collabDiag('collab_stale_data_op_covered_skip', {
      sheetId: params.sheetId,
      incomingVersion: params.incomingVersion,
      knownVersion: params.knownVersion ?? -1,
      opType: params.operationType
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_receive_skipped',
      severity: 'info',
      traceSessionId: params.traceMeta?.traceSessionId,
      traceId: params.traceMeta?.traceId,
      batchId: params.traceMeta?.batchId,
      operationType: params.operationType,
      version: params.incomingVersion,
      payload: {
        reason: 'stale_version_data_op_covered',
        knownVersion: params.knownVersion
      }
    })
  }

  private requestStaleDataOpCatchUp(params: {
    sheetId: string
    sinceVersion: number
    incomingVersion: number
    knownVersion: number | null
    operationType: string
    stateCovered: boolean
    traceMeta?: {
      traceSessionId?: string
      traceId?: string
      batchId?: string
    }
    diagnosticsStage?:
      | 'client_collab_stale_data_op_catchup_requested'
      | 'client_committed_batch_version_ahead_catchup_requested'
  }): StaleDataOpCatchUpDecision {
    const suppressionReason = this.shouldSuppressStaleRecovery(params.sheetId, params.incomingVersion, {
      replayCritical: true,
      stateCovered: params.stateCovered
    })
    if (suppressionReason) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'info',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        operationType: params.operationType,
        version: params.incomingVersion,
        payload: {
          reason:
            suppressionReason === 'recovery_active'
              ? 'stale_version_data_op_recovery_active'
              : 'stale_version_data_op_covered',
          sheetId: params.sheetId,
          knownVersion: params.knownVersion,
          sinceVersion: params.sinceVersion,
          incomingVersion: params.incomingVersion
        }
      })
      return suppressionReason === 'recovery_active' ? 'recovery_active' : 'covered_skip'
    }

    const scheduled = this.requestSheetCatchUpCoalesced(params.sheetId, 'stale_version_data_op', {
      sinceVersion: params.sinceVersion,
      incomingVersion: params.incomingVersion
    })
    if (!scheduled) {
      return 'coalesced'
    }

    this.patchStaleRecoveryState(params.sheetId, current => ({
      active: true,
      watermarkVersion: current.watermarkVersion
    }))
    this.collabDiag('collab_receive_stale_data_op_catchup_requested', {
      opType: params.operationType,
      sheetId: params.sheetId,
      incomingVersion: params.incomingVersion,
      knownVersion: params.knownVersion ?? -1,
      sinceVersion: params.sinceVersion
    })
    this.traceEvent({
      source: 'client',
      stage: params.diagnosticsStage ?? 'client_collab_stale_data_op_catchup_requested',
      severity: 'warning',
      traceSessionId: params.traceMeta?.traceSessionId,
      traceId: params.traceMeta?.traceId,
      batchId: params.traceMeta?.batchId,
      operationType: params.operationType,
      version: params.incomingVersion,
      payload: {
        reason: 'stale_version_data_op',
        knownVersion: params.knownVersion,
        sinceVersion: params.sinceVersion,
        incomingVersion: params.incomingVersion
      }
    })
    return 'scheduled'
  }

  private traceEvent(event: SpreadsheetTraceEventInput): void {
    this.callbacks.onDiagnosticsTraceEvent?.(event)
  }

  reportStaleRecoveryLifecycle(params: {
    sheetId: string
    stage: SpreadsheetStaleRecoveryLifecycleStage
    version?: number | null
  }): void {
    const normalizedVersion =
      typeof params.version === 'number' && Number.isFinite(params.version) && params.version >= 0
        ? Math.trunc(params.version)
        : null
    this.patchStaleRecoveryState(params.sheetId, current => {
      switch (params.stage) {
        case 'catchup_started':
        case 'snapshot_fallback_scheduled':
        case 'snapshot_reload_started':
          return {
            active: true,
            watermarkVersion: current.watermarkVersion
          }
        case 'catchup_noop':
        case 'catchup_applied':
        case 'snapshot_reload_succeeded':
          if (params.stage === 'snapshot_reload_succeeded') {
            this.inactiveSheetsAwaitingCanonicalMaterialization.delete(params.sheetId)
          }
          if (params.stage === 'catchup_noop' || params.stage === 'catchup_applied') {
            this.clearDeferredVersionSnapshotFallbacks(params.sheetId, params.stage)
          }
          return {
            active: false,
            watermarkVersion:
              normalizedVersion != null
                ? Math.max(current.watermarkVersion, normalizedVersion)
                : current.watermarkVersion
          }
        case 'catchup_failed':
        case 'snapshot_reload_failed':
        case 'snapshot_reload_skipped':
          return {
            active: false,
            watermarkVersion: current.watermarkVersion
          }
      }
    })
  }

  private requestSnapshotFallback(params: {
    sheetId?: string
    reason: SpreadsheetSnapshotFallbackReason
    immediate?: boolean
    detail?: string
    version?: number | null
    traceSessionId?: string
    traceId?: string
    batchId?: string
    operationType?: string
  }): boolean {
    const resolvedSheetId = params.sheetId ?? this.callbacks.getActiveSheetId()
    if (
      isVersionRelatedSnapshotFallbackReason(params.reason) &&
      this.callbacks.isSheetPersistenceBusy?.(resolvedSheetId)
    ) {
      return this.scheduleDeferredSnapshotFallback({ ...params, sheetId: resolvedSheetId })
    }
    return this.executeSnapshotFallbackRequest({ ...params, sheetId: resolvedSheetId })
  }

  private scheduleDeferredSnapshotFallback(params: {
    sheetId: string
    reason: SpreadsheetSnapshotFallbackReason
    immediate?: boolean
    detail?: string
    version?: number | null
    traceSessionId?: string
    traceId?: string
    batchId?: string
    operationType?: string
  }): boolean {
    const deferKey = `${params.sheetId}:${params.reason}:${params.batchId ?? 'none'}`
    if (this.deferredSnapshotFallbackTimers.has(deferKey)) {
      this.collabDiag('snapshot_fallback_deferred_for_catchup', {
        sheetId: params.sheetId,
        reason: params.reason,
        detail: params.detail,
        duplicateDefer: true
      })
      return false
    }
    this.collabDiag('snapshot_fallback_deferred_for_catchup', {
      sheetId: params.sheetId,
      reason: params.reason,
      detail: params.detail
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_snapshot_fallback_deferred_for_catchup',
      severity: 'info',
      traceSessionId: params.traceSessionId,
      traceId: params.traceId,
      batchId: params.batchId,
      operationType: params.operationType,
      version: params.version ?? null,
      payload: {
        sheetId: params.sheetId,
        reason: params.reason,
        detail: params.detail ?? null
      }
    })
    const entry: DeferredSnapshotFallbackEntry = {
      timer: globalThis.setTimeout(() => {
        this.deferredSnapshotFallbackTimers.delete(deferKey)
        if (this.callbacks.isSheetPersistenceBusy?.(params.sheetId)) {
          this.collabDiag('snapshot_fallback_deferred_still_busy', {
            sheetId: params.sheetId,
            reason: params.reason
          })
          this.executeSnapshotFallbackRequest(params)
          return
        }
        this.collabDiag('snapshot_fallback_resolved_by_delta', {
          sheetId: params.sheetId,
          reason: params.reason
        })
        this.traceEvent({
          source: 'client',
          stage: 'client_snapshot_fallback_resolved_by_delta',
          severity: 'info',
          traceSessionId: params.traceSessionId,
          traceId: params.traceId,
          batchId: params.batchId,
          operationType: params.operationType,
          version: params.version ?? null,
          payload: {
            sheetId: params.sheetId,
            reason: params.reason
          }
        })
      }, 350),
      sheetId: params.sheetId,
      reason: params.reason,
      immediate: params.immediate,
      detail: params.detail,
      version: params.version ?? null,
      traceSessionId: params.traceSessionId,
      traceId: params.traceId,
      batchId: params.batchId,
      operationType: params.operationType
    }
    this.deferredSnapshotFallbackTimers.set(deferKey, entry)
    return true
  }

  private executeSnapshotFallbackRequest(params: {
    sheetId: string
    reason: SpreadsheetSnapshotFallbackReason
    immediate?: boolean
    detail?: string
    version?: number | null
    traceSessionId?: string
    traceId?: string
    batchId?: string
    operationType?: string
  }): boolean {
    const scheduled = this.snapshotFallbackController.requestFallback({
      sheetId: params.sheetId,
      reason: params.reason,
      immediate: params.immediate,
      detail: params.detail
    })
    this.collabDiag(scheduled ? 'snapshot_fallback_scheduled' : 'snapshot_fallback_deduplicated', {
      sheetId: params.sheetId,
      reason: params.reason,
      immediate: params.immediate,
      detail: params.detail
    })
    this.traceEvent({
      source: 'client',
      stage: scheduled ? 'client_snapshot_fallback_scheduled' : 'client_snapshot_fallback_deduplicated',
      severity: scheduled ? 'warning' : 'info',
      traceSessionId: params.traceSessionId,
      traceId: params.traceId,
      batchId: params.batchId,
      operationType: params.operationType,
      version: params.version ?? null,
      payload: {
        sheetId: params.sheetId ?? null,
        reason: params.reason,
        immediate: params.immediate ?? null,
        detail: params.detail ?? null
      }
    })
    if (scheduled) {
      if (isVersionRelatedSnapshotFallbackReason(params.reason)) {
        this.reportStaleRecoveryLifecycle({
          sheetId: params.sheetId,
          stage: 'snapshot_fallback_scheduled',
          version: params.version ?? null
        })
      }
      this.collabDiag('snapshot_fallback_reload_allowed', {
        sheetId: params.sheetId,
        reason: params.reason,
        detail: params.detail
      })
    }
    return scheduled
  }

  /** Paint cell ops from a blocked WS batch while catch-up runs (version gap / session merge lag). */
  private tryApplyCommittedBatchCellOpsToGrid(batch: SpreadsheetCommittedBatchEnvelope): void {
    if (batch.sheetId !== this.callbacks.getActiveSheetId()) return
    const cellChanges = this.collectIdentityBasedCellChanges(batch)
    if (cellChanges.length === 0) return
    this.collabDiag('blocked_recovery_direct_cell_apply', {
      sheetId: batch.sheetId,
      changeCount: cellChanges.length,
      appliedVersion: batch.appliedVersion
    })
    this.applyLivePersistedChanges(cellChanges, 'batch_ops', 'direct_apply', batch.sheetId)
  }

  private handleBlockedCommittedBatchRecovery(params: {
    batch: SpreadsheetCommittedBatchEnvelope
    reason:
      | 'invalid_envelope'
      | 'unsupported_payload_schema'
      | 'requires_snapshot'
      | 'missing_version'
      | 'version_gap'
      | 'stale_version'
      | 'duplicate'
    knownVersion: number | null
    alreadyApplied: boolean
    isSameUser: boolean
    traceMeta: DiagnosticsTraceMeta
  }): boolean {
    const action = this.blockedRecoveryTracker.resolveBlockedCommittedBatch({
      batch: params.batch,
      reason: params.reason,
      knownVersion: params.knownVersion,
      alreadyApplied: params.alreadyApplied,
      isRecentLocalBatch: this.callbacks.isRecentLocalBatchId?.(params.batch.batchId, params.batch.tabId) === true
    })
    this.collabDiag('blocked_recovery_started', {
      sheetId: params.batch.sheetId,
      reason: params.reason,
      action: action.kind,
      batchId: params.batch.batchId
    })
    if (action.kind === 'skip') {
      if (params.reason !== 'duplicate') {
        this.tryApplyCommittedBatchCellOpsToGrid(params.batch)
      }
      this.collabDiag('blocked_recovery_resolved', {
        sheetId: params.batch.sheetId,
        reason: params.reason,
        resolution: 'skip'
      })
      return true
    }
    if (action.kind === 'catchup') {
      this.collabDiag('blocked_recovery_retrying', {
        sheetId: params.batch.sheetId,
        reason: params.reason,
        catchUpReason: action.catchUpReason,
        recoveryPath: 'ops_catchup'
      })
      this.requestSheetCatchUpCoalesced(params.batch.sheetId, action.catchUpReason, {
        sinceVersion: action.sinceVersion,
        incomingVersion: action.incomingVersion
      })
      this.tryApplyCommittedBatchCellOpsToGrid(params.batch)
      return true
    }
    if (action.kind === 'refresh_and_catchup') {
      this.collabDiag('blocked_recovery_retrying', {
        sheetId: params.batch.sheetId,
        reason: params.reason,
        catchUpReason: 'version_refresh',
        recoveryPath: 'ops_catchup'
      })
      this.callbacks.scheduleSheetVersionRefreshFromApi()
      this.requestSheetCatchUpCoalesced(params.batch.sheetId, 'version_gap', {
        sinceVersion: Math.max(0, params.batch.baseVersion),
        incomingVersion: params.batch.appliedVersion
      })
      this.tryApplyCommittedBatchCellOpsToGrid(params.batch)
      return true
    }
    this.collabDiag('blocked_recovery_escalated_to_snapshot', {
      sheetId: params.batch.sheetId,
      reason: params.reason,
      fallbackReason: action.reason,
      recoveryPath: params.reason === 'requires_snapshot' ? 'explicit_snapshot_required' : 'ops_gap_unrecoverable'
    })
    this.requestSnapshotFallback({
      sheetId: params.batch.sheetId,
      reason: action.reason,
      immediate: params.batch.sheetId === this.callbacks.getActiveSheetId(),
      detail: params.reason,
      traceSessionId: params.batch.traceSessionId ?? params.traceMeta.traceSessionId,
      traceId: params.batch.traceId ?? params.traceMeta.traceId,
      batchId: params.batch.batchId ?? params.traceMeta.batchId,
      operationType: 'batch_operations',
      version: params.batch.appliedVersion
    })
    return true
  }

  /**
   * Returns replay-critical stale op category. We must catch up for both stale
   * data and stale style ops; skipping stale style ops can leave peers visually
   * diverged until full refresh/snapshot reload.
   */
  private getStaleVersionReplayCriticalCategory(
    operation: CollaborationOperation['operation']
  ): 'data' | 'style' | 'feature' | null {
    const type = typeof operation.type === 'string' ? operation.type : ''
    if (type === 'set_style') return 'style'
    if (type === 'cells_changed' || type === 'row_update') return 'data'
    if (LIVE_PERSISTED_CELL_OP_TYPES.has(type)) return 'data'
    if (LIVE_ROW_STRUCTURAL_OP_TYPES.has(type)) return 'data'
    if (SPREADSHEET_FEATURE_OP_TYPES.has(type as SpreadsheetFeatureOperationType)) return 'feature'
    if (COLUMN_STRUCTURAL_OP_TYPES.has(type)) return 'feature'
    if (type !== 'batch_operations') return null
    const d = operation.data as { operations?: Array<{ type?: string }> } | undefined
    if (!d?.operations || !Array.isArray(d.operations)) return null
    for (const inner of d.operations) {
      const innerType = typeof inner.type === 'string' ? inner.type : ''
      if (!innerType) continue
      if (innerType === 'set_style') return 'style'
      if (innerType === 'cells_changed' || innerType === 'row_update') return 'data'
      if (LIVE_PERSISTED_CELL_OP_TYPES.has(innerType)) return 'data'
      if (LIVE_ROW_STRUCTURAL_OP_TYPES.has(innerType)) return 'data'
      if (SPREADSHEET_FEATURE_OP_TYPES.has(innerType as SpreadsheetFeatureOperationType)) return 'feature'
      if (COLUMN_STRUCTURAL_OP_TYPES.has(innerType)) return 'feature'
    }
    return null
  }

  private markGridMaterializationNeeded(sheetId: string, reason: string): void {
    if (!sheetId || sheetId === this.callbacks.getActiveSheetId()) return
    if (prefersCanonicalReloadForMaterializationReason(reason)) {
      this.inactiveSheetsAwaitingCanonicalMaterialization.add(sheetId)
    }
    this.callbacks.markSheetNeedsGridMaterialization?.(sheetId, reason)
    this.callbacks.scheduleRemoteStructuralResync?.(sheetId, { immediate: false })
  }

  private shouldDeferInactiveGridApplyUntilCanonicalMaterialization(sheetId: string): boolean {
    return (
      sheetId !== this.callbacks.getActiveSheetId() && this.inactiveSheetsAwaitingCanonicalMaterialization.has(sheetId)
    )
  }

  private shouldApplyInactiveStructuralGridUpdate(params: {
    sheetId: string
    operationCount: number
    structuralUnitCount: number
    reason: string
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string }
  }): boolean {
    if (params.sheetId === this.callbacks.getActiveSheetId()) return true
    const overBudget =
      params.operationCount > MAX_INACTIVE_STRUCTURAL_BATCH_OPERATIONS ||
      params.structuralUnitCount > MAX_INACTIVE_STRUCTURAL_BATCH_UNITS
    if (!overBudget) return true
    this.markGridMaterializationNeeded(params.sheetId, params.reason)
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_inactive_structural_apply_deferred',
      severity: 'warning',
      traceSessionId: params.traceMeta?.traceSessionId,
      traceId: params.traceMeta?.traceId,
      batchId: params.traceMeta?.batchId,
      payload: {
        sheetId: params.sheetId,
        reason: params.reason,
        operationCount: params.operationCount,
        structuralUnitCount: params.structuralUnitCount
      }
    })
    return false
  }

  private getWorkbookSnapshotSheet(sheetId: string): Record<string, unknown> | null {
    const snapshot = this.callbacks.getWorkbookSnapshot?.()
    if (!snapshot || typeof snapshot !== 'object') return null
    const sheets =
      snapshot.sheets && typeof snapshot.sheets === 'object' && !Array.isArray(snapshot.sheets)
        ? (snapshot.sheets as Record<string, unknown>)
        : null
    const sheetSnapshot = sheets?.[sheetId]
    return sheetSnapshot && typeof sheetSnapshot === 'object' && !Array.isArray(sheetSnapshot)
      ? (sheetSnapshot as Record<string, unknown>)
      : null
  }

  private getWorkbookSnapshotVisibleColumnCount(sheetId: string): number | null {
    const sheetSnapshot = this.getWorkbookSnapshotSheet(sheetId)
    const rawColumnCount = Number(sheetSnapshot?.columnCount)
    if (!Number.isFinite(rawColumnCount) || rawColumnCount < 0) return null
    return Math.trunc(rawColumnCount)
  }

  private getWorkbookSnapshotMergeRanges(sheetId: string): SpreadsheetMergeRange[] {
    const sheetSnapshot = this.getWorkbookSnapshotSheet(sheetId)
    const mergeData = sheetSnapshot?.mergeData
    if (!Array.isArray(mergeData)) return []
    return mergeData.filter(
      (range): range is SpreadsheetMergeRange =>
        Boolean(range) &&
        typeof range === 'object' &&
        Number.isFinite((range as SpreadsheetMergeRange).startRow) &&
        Number.isFinite((range as SpreadsheetMergeRange).endRow) &&
        Number.isFinite((range as SpreadsheetMergeRange).startColumn) &&
        Number.isFinite((range as SpreadsheetMergeRange).endColumn)
    )
  }

  private getSheetRowsForVerification(sheetId: string): Record<string, unknown>[] {
    return (
      this.callbacks.getSheetData?.(sheetId) ??
      (sheetId === this.callbacks.getActiveSheetId() ? this.callbacks.getLocalSheetData() : [])
    )
  }

  private getWorkbookSnapshotTrackingHeaderValues(sheetId: string): string[] | null {
    const headerRowIndex = this.getSheetRowsForVerification(sheetId).findIndex(row => row._isTrackingHeader === true)
    if (headerRowIndex < 0) return null
    const sheetSnapshot = this.getWorkbookSnapshotSheet(sheetId)
    const cellData =
      sheetSnapshot?.cellData && typeof sheetSnapshot.cellData === 'object' && !Array.isArray(sheetSnapshot.cellData)
        ? (sheetSnapshot.cellData as Record<string, unknown>)
        : null
    const rowCells = cellData?.[String(headerRowIndex)]
    if (!rowCells || typeof rowCells !== 'object' || Array.isArray(rowCells)) return null
    const values: string[] = []
    for (const [rawColumnIndex, rawCell] of Object.entries(rowCells as Record<string, unknown>)) {
      const columnIndex = Number(rawColumnIndex)
      if (!Number.isFinite(columnIndex) || columnIndex < 0) continue
      if (!rawCell || typeof rawCell !== 'object' || Array.isArray(rawCell)) continue
      const cell = rawCell as { v?: unknown; m?: unknown }
      const text = typeof cell.v === 'string' ? cell.v.trim() : typeof cell.m === 'string' ? cell.m.trim() : ''
      if (!text) continue
      values[Math.trunc(columnIndex)] = text
    }
    return values.length > 0 ? values : null
  }

  private getVisibleColumnIds(columns: SpreadsheetColumn[]): string[] {
    return visibleColumnsInGridOrder(columns).map(column => column.id)
  }

  private setConfirmedPhysicalColumnOrder(sheetId: string, columnsOrIds: SpreadsheetColumn[] | string[]): void {
    if (!sheetId) return
    const rawIds =
      columnsOrIds.length > 0 && typeof columnsOrIds[0] === 'string'
        ? (columnsOrIds as string[])
        : this.getVisibleColumnIds(columnsOrIds as SpreadsheetColumn[])
    const columnIds = rawIds.map(columnId => String(columnId || '').trim()).filter(Boolean)
    if (columnIds.length === 0) {
      this.confirmedPhysicalColumnOrderBySheetId.delete(sheetId)
      return
    }
    this.confirmedPhysicalColumnOrderBySheetId.set(sheetId, [...columnIds])
  }

  private clearConfirmedPhysicalColumnOrder(sheetId: string): void {
    if (!sheetId) return
    this.confirmedPhysicalColumnOrderBySheetId.delete(sheetId)
  }

  private getConfirmedPhysicalColumnOrder(sheetId: string): string[] | null {
    const columnIds = this.confirmedPhysicalColumnOrderBySheetId.get(sheetId)
    return Array.isArray(columnIds) && columnIds.length > 0 ? [...columnIds] : null
  }

  private hasMatchingVisibleColumnOrder(left: SpreadsheetColumn[], right: SpreadsheetColumn[]): boolean {
    const leftIds = this.getVisibleColumnIds(left)
    const rightIds = this.getVisibleColumnIds(right)
    return leftIds.length === rightIds.length && leftIds.every((columnId, index) => columnId === rightIds[index])
  }

  private rebuildColumnsWithVisibleOrder(
    columns: SpreadsheetColumn[],
    orderedVisibleColumnIds: string[]
  ): SpreadsheetColumn[] | null {
    if (orderedVisibleColumnIds.length === 0) return null
    const sortedColumns = [...columns].sort((left, right) => left.order - right.order)
    const visibleColumns = sortedColumns.filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0 || visibleColumns.length !== orderedVisibleColumnIds.length) {
      return null
    }
    const visibleColumnIds = new Set(visibleColumns.map(column => column.id))
    if (!orderedVisibleColumnIds.every(columnId => visibleColumnIds.has(columnId))) {
      return null
    }
    const visibleColumnsById = new Map(visibleColumns.map(column => [column.id, column]))
    let nextVisibleColumnIndex = 0
    return sortedColumns
      .map(column => {
        if (column.isVisible === false) {
          return column
        }
        const nextVisibleColumnId = orderedVisibleColumnIds[nextVisibleColumnIndex]
        nextVisibleColumnIndex += 1
        return visibleColumnsById.get(nextVisibleColumnId) ?? column
      })
      .map((column, order) => ({ ...column, order }))
  }

  private buildColumnsUsingConfirmedPhysicalOrder(params: {
    sheetId: string
    columns: SpreadsheetColumn[]
    seedIfMissing?: boolean
  }): SpreadsheetColumn[] | null {
    const confirmedVisibleOrder = this.getConfirmedPhysicalColumnOrder(params.sheetId)
    if (!confirmedVisibleOrder) {
      if (params.seedIfMissing) {
        this.setConfirmedPhysicalColumnOrder(params.sheetId, params.columns)
        return params.columns
      }
      return null
    }
    return this.rebuildColumnsWithVisibleOrder(params.columns, confirmedVisibleOrder)
  }

  private buildSnapshotOrderedPreviousColumns(
    sheetId: string,
    nextColumns: SpreadsheetColumn[]
  ): SpreadsheetColumn[] | null {
    const headerValues = this.getWorkbookSnapshotTrackingHeaderValues(sheetId)
    if (!headerValues) return null
    const visibleNextColumns = visibleColumnsInGridOrder(nextColumns)
    if (visibleNextColumns.length === 0) return null
    const usedColumnIds = new Set<string>()
    const snapshotOrderedVisibleColumns: SpreadsheetColumn[] = []
    for (const headerValue of headerValues) {
      if (typeof headerValue !== 'string' || headerValue.trim() === '') continue
      const normalizedHeaderValue = headerValue.trim().toLowerCase()
      const matches = visibleNextColumns.filter(column => {
        if (usedColumnIds.has(column.id)) return false
        const candidates = [column.label, column.name, column.id]
        return candidates.some(candidate => candidate?.trim().toLowerCase() === normalizedHeaderValue)
      })
      if (matches.length !== 1) {
        return null
      }
      snapshotOrderedVisibleColumns.push(matches[0])
      usedColumnIds.add(matches[0].id)
    }
    if (snapshotOrderedVisibleColumns.length !== visibleNextColumns.length) return null
    const snapshotVisibleOrder = snapshotOrderedVisibleColumns.map(column => column.id).join('|')
    const targetVisibleOrder = visibleNextColumns.map(column => column.id).join('|')
    if (snapshotVisibleOrder === targetVisibleOrder) return null
    const visibleOrderById = new Map(snapshotOrderedVisibleColumns.map((column, index) => [column.id, index] as const))
    let hiddenOrder = snapshotOrderedVisibleColumns.length
    return nextColumns.map(column => ({
      ...column,
      order: column.isVisible === false ? hiddenOrder++ : (visibleOrderById.get(column.id) ?? column.order)
    }))
  }

  private verifyActiveSheetColumnStructure(sheetId: string, expectedColumns: SpreadsheetColumn[]): boolean {
    const snapshot = this.callbacks.getWorkbookSnapshot?.()
    if (
      snapshot &&
      snapshotTrackingHeaderMatchesColumnLabels(
        snapshot,
        sheetId,
        this.getSheetRowsForVerification(sheetId),
        expectedColumns
      ) === false
    ) {
      return false
    }
    const expectedVisibleColumnCount = expectedColumns.filter(column => column.isVisible !== false).length
    const snapshotVisibleColumnCount = this.getWorkbookSnapshotVisibleColumnCount(sheetId)
    if (snapshotVisibleColumnCount == null) {
      return true
    }
    return snapshotVisibleColumnCount === expectedVisibleColumnCount
  }

  private repairColumnStructure(params: {
    sheetId: string
    nextColumns: SpreadsheetColumn[]
    reason: string
    confirmedPhysicalOrderStrategy?: 'set-next' | 'clear'
    allowValueOnlyGridRepair?: boolean
    preserveStagedDirectPaint?: boolean
    pendingLocalFilterPolicy?: PendingLocalFilterPolicy
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
  }): void {
    this.callbacks.onRemoteColumnUpdate?.({
      sheetId: params.sheetId,
      columns: params.nextColumns
    })
    const isActiveTargetSheet = params.sheetId === this.callbacks.getActiveSheetId()
    const canScheduleRepair = typeof this.callbacks.forceGridReapply === 'function'
    if (isActiveTargetSheet && canScheduleRepair && params.allowValueOnlyGridRepair !== false) {
      this.callbacks.forceGridReapply?.(params.sheetId, null, {
        allowFullGridReapply: true,
        clearAllSignatures: true,
        preferBulk: true,
        reason: params.reason,
        preserveStagedDirectPaint: params.preserveStagedDirectPaint,
        pendingLocalFilterPolicy: params.pendingLocalFilterPolicy
      })
    } else if (isActiveTargetSheet && params.allowValueOnlyGridRepair === false) {
      this.clearConfirmedPhysicalColumnOrder(params.sheetId)
      this.markGridMaterializationNeeded(params.sheetId, params.reason)
      this.requestSnapshotFallback({
        sheetId: params.sheetId,
        reason: 'planning_failure',
        immediate: true,
        detail: 'column_structure'
      })
    }
    if (!isActiveTargetSheet) {
      if (params.confirmedPhysicalOrderStrategy === 'clear') {
        this.clearConfirmedPhysicalColumnOrder(params.sheetId)
      }
      this.markGridMaterializationNeeded(params.sheetId, params.reason)
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_inactive_column_repair_deferred',
        severity: 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          reason: params.reason
        }
      })
      return
    }
    if (params.confirmedPhysicalOrderStrategy === 'clear') {
      if (canScheduleRepair) {
        this.clearConfirmedPhysicalColumnOrder(params.sheetId)
      }
    } else {
      this.setConfirmedPhysicalColumnOrder(params.sheetId, params.nextColumns)
    }
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_column_structure_repair_requested',
      severity: 'warning',
      traceSessionId: params.traceMeta?.traceSessionId,
      traceId: params.traceMeta?.traceId,
      batchId: params.traceMeta?.batchId,
      payload: {
        sheetId: params.sheetId,
        reason: params.reason,
        visibleColumnCount: params.nextColumns.filter(column => column.isVisible !== false).length,
        repairHandoffScheduled: params.allowValueOnlyGridRepair === false ? false : canScheduleRepair
      }
    })
  }

  private queueDeferredSetStyleForSheet(sheetId: string, operation: DeferredSetStyleOperation): void {
    if (!sheetId) return
    const queued = this.deferredSetStyleBySheet.get(sheetId) ?? []
    queued.push(operation)
    this.deferredSetStyleBySheet.set(sheetId, queued)
  }

  private withTargetSheetApplyOptions(
    sheetId: string,
    options?: ApplyRemoteCellUpdateOptions
  ): ApplyRemoteCellUpdateOptions | undefined {
    if (!sheetId || sheetId === this.callbacks.getActiveSheetId()) {
      return options
    }
    return { ...options, targetSheetId: sheetId }
  }

  updateCallbacks(callbacks: CollaborationCallbacks): void {
    this.callbacks = callbacks
  }

  setEmitFunctions(emitOp: (op: DocumentOperation) => void, emitCursor: (pos: { path?: string[] }) => void): void {
    this.emitFn = emitOp
    this.emitCursorFn = emitCursor
  }

  setConnectionState(connected: boolean, joined: boolean): void {
    const wasDisconnected = !this.connected || !this.joined
    this.connected = connected
    this.joined = joined
    if (connected && joined && wasDisconnected) {
      this.flushPendingOps()
      this.reconcileOnReconnect()
    }
  }

  setLastKnownVersion(version: number): void {
    if (typeof version !== 'number' || !Number.isFinite(version) || version < 0) return
    const nextVersion = Math.trunc(version)
    if (nextVersion > this.lastKnownVersion) {
      this.clearCoalescedCatchUpRequests()
    }
    this.lastKnownVersion = nextVersion
  }

  getLastKnownVersion(): number {
    return this.lastKnownVersion
  }

  applyLocalCommittedBatch(params: {
    committedBatch: SpreadsheetCommittedBatchEnvelope
    isSameUser?: boolean
    traceMeta?: DiagnosticsTraceMeta
  }): boolean {
    const { committedBatch, isSameUser = true, traceMeta } = params
    return this.applyCommittedBatchEnvelope({
      committedBatch,
      traceMeta: traceMeta ?? {},
      isSameUser,
      operation: { type: 'batch_operations', data: { sheetId: committedBatch.sheetId } },
      activeSheetId: this.callbacks.getActiveSheetId(),
      dedupeKey: buildCommittedBatchDedupeKey(committedBatch),
      replayMode: getSpreadsheetDeltaReplayMode()
    })
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId ? String(userId) : null
  }

  // --- Sender ---

  /** Compatibility no-op: spreadsheet cell writes must stay on HTTP batch paths. */
  tryFlushDeferredCellEmits(): void {}

  flushDeferredCellsChangedForSheet(sheetId: string): void {
    if (!sheetId) return
    const queued = this.deferredCellsChangedBySheet.get(sheetId)
    if (queued && queued.length > 0) {
      this.deferredCellsChangedBySheet.delete(sheetId)
    }
    for (const payload of queued ?? []) {
      this.handleCellsChanged(payload)
    }
    this.flushDeferredSetStyleForSheet(sheetId)
  }

  emitCursor(path: string[]): void {
    const pos = { path }
    if (!this.connected || !this.joined) {
      this.pendingCursor = pos
      this.collabDiag('collab_cursor_queued', { connected: this.connected, joined: this.joined })
      return
    }
    this.emitCursorFn?.(pos)
  }

  emitOperation(op: DocumentOperation): void {
    if (op.type === 'cells_changed') {
      this.collabDiag('collab_emit_cells_changed_suppressed', {
        detail: 'authoritative_batch_only'
      })
      return
    }
    this.enqueueOrSend(op)
  }

  replayDeltaChanges(
    changes: DeltaChange[] | undefined,
    currentVersion: number | undefined,
    targetSheetId: string,
    traceMeta?: DiagnosticsTraceMeta
  ): void {
    if (!targetSheetId || !Array.isArray(changes) || changes.length === 0) return
    const normalizedVersion =
      typeof currentVersion === 'number' && Number.isFinite(currentVersion) && currentVersion >= 0
        ? Math.trunc(currentVersion)
        : undefined

    const replayMode = getSpreadsheetDeltaReplayMode()
    if (replayMode !== 'off') {
      const envelopes = replayDeltasAsCommittedBatches({ changes, sheetId: targetSheetId })
      for (const batch of envelopes) {
        this.handleOperation({
          userId: 'delta-replay',
          userName: 'Delta Replay',
          operation: {
            type: 'batch_operations',
            data: {
              sheetId: batch.sheetId,
              baseVersion: batch.baseVersion,
              appliedVersion: batch.appliedVersion,
              payloadSchemaVersion: batch.payloadSchemaVersion,
              batchId: batch.batchId,
              traceSessionId: traceMeta?.traceSessionId,
              traceId: traceMeta?.traceId,
              ...(Array.isArray(batch.columns) && batch.columns.length > 0 ? { columns: batch.columns } : {}),
              ...(Array.isArray(batch.visibleColumnIds) && batch.visibleColumnIds.length > 0
                ? { visibleColumnIds: batch.visibleColumnIds }
                : {}),
              ...(batch.gridColumnIndexByColumnId
                ? { gridColumnIndexByColumnId: batch.gridColumnIndexByColumnId }
                : {}),
              operations: batch.operations.map(op => ({
                type: op.type,
                data: op.data,
                operationId: op.operationId,
                operationLogId: op.operationLogId,
                result: op.result,
                baseVersion: op.baseVersion,
                appliedVersion: op.appliedVersion
              }))
            },
            baseVersion: batch.baseVersion
          },
          timestamp: Date.now(),
          version: batch.appliedVersion
        })
      }
    } else {
      this.collabDiag('replay_delta_changes_legacy_path', {
        sheetId: targetSheetId,
        changeCount: changes.length,
        replayMode
      })
      this.traceEvent({
        source: 'client',
        stage: 'client_replay_delta_changes_legacy_path',
        severity: 'info',
        traceSessionId: traceMeta?.traceSessionId ?? null,
        traceId: traceMeta?.traceId ?? null,
        batchId: traceMeta?.batchId ?? null,
        payload: {
          sheetId: targetSheetId,
          changeCount: changes.length,
          replayMode
        }
      })
      this.handleBatchOperations(
        changes.map(change => this.operationFromDeltaChange(change, targetSheetId)),
        normalizedVersion,
        targetSheetId,
        traceMeta
      )
    }

    if (normalizedVersion == null) return
    if (targetSheetId === this.callbacks.getActiveSheetId()) {
      this.setLastKnownVersion(Math.max(this.lastKnownVersion, normalizedVersion))
      this.callbacks.onVersionUpdate(normalizedVersion)
      return
    }
    this.callbacks.onSheetVersionUpdate?.(targetSheetId, normalizedVersion)
  }

  handleAckFailure(op: DocumentOperation): void {
    if ((op as TaggedDocumentOperation)._retried) return
    const tagged = { ...(op as TaggedDocumentOperation), _retried: true } as TaggedDocumentOperation
    this.pendingOps.push(tagged)
    if (this.connected && this.joined) {
      this.flushPendingOps()
    }
  }

  // --- Receiver ---

  handleOperation(payload: CollaborationOperation): void {
    const { operation, version } = payload
    const activeSheetId = this.callbacks.getActiveSheetId()
    const opSheetId = this.getSheetIdFromData(operation.data)
    const traceMeta = getDiagnosticsTraceMeta(operation.data)
    this.traceEvent({
      source: 'client',
      stage: 'socket_operation_received',
      traceSessionId: traceMeta.traceSessionId,
      traceId: traceMeta.traceId,
      batchId: traceMeta.batchId,
      operationType: operation.type,
      version: typeof version === 'number' ? version : null,
      actorUserId: typeof payload.userId === 'string' ? payload.userId : null,
      payload: {
        operation,
        activeSheetId,
        opSheetId: opSheetId ?? null
      }
    })

    const clientOpId = typeof operation._clientOpId === 'string' ? operation._clientOpId : ''
    if (clientOpId && this.hasRecentOutgoingClientOpId(clientOpId)) {
      this.updateVersion(operation.data, version)
      this.collabDiag('collab_receive_client_echo_skipped', {
        opType: operation.type,
        hasVersion: typeof version === 'number'
      })
      return
    }

    // The room can have multiple tabs for the same authenticated user. Dropping
    // events by user id would suppress legitimate cross-tab updates; true local
    // socket echoes are filtered by `_clientOpId` above and stale versions below.
    const senderUserId = typeof payload.userId === 'string' ? payload.userId : ''
    const hasVersion = typeof version === 'number' && Number.isFinite(version)
    const normalizedIncomingVersion = hasVersion ? Math.trunc(version) : undefined
    const isSameUser = Boolean(senderUserId && this.currentUserId && senderUserId === this.currentUserId)
    if (!hasVersion) {
      this.collabDiag('collab_receive_missing_version', {
        opType: operation.type,
        sameUser: isSameUser,
        hasSheetId: Boolean(opSheetId),
        activeSheetMismatch: Boolean(opSheetId && opSheetId !== activeSheetId)
      })
    }
    if (isSameUser) {
      this.collabDiag('collab_receive_same_user', {
        opType: operation.type,
        senderUserId,
        hasVersion
      })
    }

    if (
      operation.type === 'sheet_created' ||
      operation.type === 'sheet_renamed' ||
      operation.type === 'sheet_updated' ||
      operation.type === 'sheet_deleted'
    ) {
      this.updateVersion(operation.data, version)
      const data =
        operation.data && typeof operation.data === 'object' ? (operation.data as Record<string, unknown>) : {}
      this.callbacks.onWorkbookStructureChange?.({
        type: operation.type,
        sheetId: typeof data.sheetId === 'string' ? data.sheetId : undefined,
        sheet: data.sheet && typeof data.sheet === 'object' ? (data.sheet as Record<string, unknown>) : undefined
      })
      return
    }

    if (hasVersion && opSheetId) {
      const normalizedVersion = Math.trunc(version)
      const knownVersion = this.getKnownSheetVersion(opSheetId)
      if (operation.type !== 'batch_operations' && knownVersion != null && normalizedVersion > knownVersion + 1) {
        this.collabDiag('collab_receive_version_gap_detected', {
          opType: operation.type,
          sheetId: opSheetId,
          incomingVersion: normalizedVersion,
          knownVersion
        })
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_version_gap_detected',
          severity: 'warning',
          traceSessionId: traceMeta.traceSessionId,
          traceId: traceMeta.traceId,
          batchId: traceMeta.batchId,
          operationType: operation.type,
          version: normalizedVersion,
          payload: { sheetId: opSheetId, knownVersion, incomingVersion: normalizedVersion }
        })
        if (this.callbacks.requestSheetCatchUp) {
          this.requestSheetCatchUpCoalesced(opSheetId, 'version_gap', {
            sinceVersion: knownVersion,
            incomingVersion: normalizedVersion
          })
          // Do not apply the gap operation immediately. The catch-up fetch replays
          // the missing log range, including this operation, in appliedVersion order.
          return
        }
      }
      if (knownVersion != null && normalizedVersion < knownVersion) {
        const requestCatchUp = this.callbacks.requestSheetCatchUp
        const staleCriticalCategory = this.getStaleVersionReplayCriticalCategory(operation)
        const staleOpStateCovered =
          staleCriticalCategory != null ? this.isReplayCriticalOperationStateCovered(opSheetId, operation) : false
        if (staleCriticalCategory && staleOpStateCovered) {
          this.traceReplayCriticalCoveredSkip({
            sheetId: opSheetId,
            incomingVersion: normalizedVersion,
            knownVersion,
            operationType: operation.type,
            traceMeta
          })
          return
        }
        if (requestCatchUp && staleCriticalCategory) {
          const sinceVersion = Math.max(0, normalizedVersion - 1)
          const catchUpDecision = this.requestStaleDataOpCatchUp({
            sheetId: opSheetId,
            sinceVersion,
            incomingVersion: normalizedVersion,
            knownVersion,
            operationType: operation.type,
            stateCovered: staleOpStateCovered,
            traceMeta,
            diagnosticsStage: 'client_collab_stale_data_op_catchup_requested'
          })
          if (catchUpDecision) return
        }
        this.collabDiag('collab_receive_stale_version_skipped', {
          opType: operation.type,
          sheetId: opSheetId,
          incomingVersion: normalizedVersion,
          knownVersion
        })
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_receive_skipped',
          severity: 'warning',
          traceSessionId: traceMeta.traceSessionId,
          traceId: traceMeta.traceId,
          batchId: traceMeta.batchId,
          operationType: operation.type,
          version: normalizedVersion,
          payload: { reason: 'stale_version', knownVersion }
        })
        return
      }
      if (knownVersion != null && normalizedVersion === knownVersion && operation.type !== 'batch_operations') {
        const staleCriticalCategory = this.getStaleVersionReplayCriticalCategory(operation)
        const staleOpStateCovered =
          staleCriticalCategory != null ? this.isReplayCriticalOperationStateCovered(opSheetId, operation) : false
        if (staleCriticalCategory && staleOpStateCovered) {
          this.traceReplayCriticalCoveredSkip({
            sheetId: opSheetId,
            incomingVersion: normalizedVersion,
            knownVersion,
            operationType: operation.type,
            traceMeta
          })
          return
        }
        if (this.callbacks.requestSheetCatchUp && staleCriticalCategory) {
          const catchUpDecision = this.requestStaleDataOpCatchUp({
            sheetId: opSheetId,
            sinceVersion: Math.max(0, normalizedVersion - 1),
            incomingVersion: normalizedVersion,
            knownVersion,
            operationType: operation.type,
            stateCovered: staleOpStateCovered,
            traceMeta,
            diagnosticsStage: 'client_collab_stale_data_op_catchup_requested'
          })
          if (catchUpDecision) return
        }
        this.collabDiag('collab_receive_stale_version_skipped', {
          opType: operation.type,
          sheetId: opSheetId,
          incomingVersion: normalizedVersion,
          knownVersion
        })
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_receive_skipped',
          severity: 'warning',
          traceSessionId: traceMeta.traceSessionId,
          traceId: traceMeta.traceId,
          batchId: traceMeta.batchId,
          operationType: operation.type,
          version: normalizedVersion,
          payload: { reason: 'stale_version', knownVersion }
        })
        return
      }
    }

    if (operation.type === 'dimension_sync') {
      this.collabDiag('collab_receive_dimension_sync_ignored', {
        sheetId: (operation.data as CellDimensionsPayload | undefined)?.sheetId,
        detail: 'authoritative_batch_only'
      })
      return
    }

    if (operation.type === 'column_update') {
      const columnUpdateData = operation.data as Record<string, unknown>
      this.collabDiag('column_update_received', {
        sheetId: typeof columnUpdateData?.sheetId === 'string' ? columnUpdateData.sheetId : undefined,
        hasColumnsArray: Array.isArray(columnUpdateData?.columns),
        columnCount: Array.isArray(columnUpdateData?.columns) ? columnUpdateData.columns.length : undefined
      })
      this.updateVersion(operation.data, version)
      this.callbacks.onRemoteColumnUpdate?.(columnUpdateData)
      return
    }

    if (
      (operation.type === 'columns_reorder' || operation.type === 'column_reorder') &&
      hasFullColumnObjectsForRemoteReorder(operation.data)
    ) {
      const nextColumns = this.extractColumnsFromReorderData(operation.data)
      const moves = this.extractExplicitColumnReorderMoves(operation.data)
      const targetSheetId = opSheetId ?? activeSheetId
      if (nextColumns && targetSheetId) {
        this.applyRemoteColumnReorderLive({
          sheetId: targetSheetId,
          previousColumns: this.getColumnsForSheet(targetSheetId),
          nextColumns,
          ...(moves ? { moves } : {}),
          traceMeta,
          isLocalEcho: isSameUser
        })
        this.updateVersion(operation.data, version)
        return
      }
    }

    if (SPREADSHEET_FEATURE_OP_TYPES.has(operation.type as SpreadsheetFeatureOperationType)) {
      this.updateVersion(operation.data, version)
      this.applyRemoteSpreadsheetFeatureOperation(
        operation.type as SpreadsheetFeatureOperationType,
        operation.data,
        traceMeta,
        opSheetId ?? activeSheetId
      )
      return
    }

    if (operation.type !== 'batch_operations') {
      this.updateVersion(operation.data, version)
    }
    if (opSheetId && STRUCTURAL_OPS.has(operation.type) && !LIVE_STRUCTURAL_OP_TYPES.has(operation.type)) {
      if (opSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: opSheetId,
          activeSheetId
        })
        this.markGridMaterializationNeeded(opSheetId, operation.type)
      }
      this.requestSnapshotFallback({
        sheetId: opSheetId,
        reason: 'planning_failure',
        immediate: true,
        detail: operation.type,
        operationType: operation.type,
        version: normalizedIncomingVersion ?? null
      })
    }

    if (operation.type === 'batch_operations') {
      const committedBatch = normalizeCommittedBatchEnvelope({
        operation,
        incomingVersion: typeof version === 'number' ? version : undefined,
        actorId: payload.userId
      })
      if (!committedBatch) {
        const legacyData = operation.data as
          | {
              sheetId?: string
              operations?: Array<{ type?: string; data?: unknown }>
            }
          | undefined
        if (legacyData?.sheetId && Array.isArray(legacyData.operations) && legacyData.operations.length > 0) {
          const committedLegacyData = {
            sheetId: legacyData.sheetId,
            operations: legacyData.operations
          }
          if (this.redispatchLegacyBatchOperationsAsCommittedEnvelope(payload, committedLegacyData, version)) {
            return
          }
          this.collabDiag('legacy_batch_operations_unenveloped_fallback', {
            sheetId: legacyData.sheetId,
            operationCount: legacyData.operations.length,
            replayMode: getSpreadsheetDeltaReplayMode()
          })
          this.handleBatchOperations(legacyData.operations, version, legacyData.sheetId, traceMeta, {
            isLocalEcho: isSameUser
          })
          return
        }
        this.collabDiag('collab_receive_skipped', { reason: 'invalid_batch_ops' })
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_receive_skipped',
          severity: 'warning',
          traceSessionId: traceMeta.traceSessionId,
          traceId: traceMeta.traceId,
          batchId: traceMeta.batchId,
          operationType: operation.type,
          payload: { reason: 'invalid_batch_ops' }
        })
        return
      }
      const dedupeKey = buildCommittedBatchDedupeKey(committedBatch)
      const knownVersion = this.getKnownSheetVersion(committedBatch.sheetId)
      if (hasColumnStructuralOperation(committedBatch.operations)) {
        this.collabDiag('column_committed_batch_received', {
          sheetId: committedBatch.sheetId,
          incomingVersion: committedBatch.appliedVersion,
          knownVersion: knownVersion ?? undefined,
          operationTypes: committedBatch.operations.map(operation => operation.type).join(','),
          hasBatchColumns: Boolean(this.getCommittedBatchColumns(committedBatch)),
          alreadyApplied: this.appliedCommittedBatchKeys.has(dedupeKey)
        })
      }
      const rawBatchData =
        operation.data && typeof operation.data === 'object' && !Array.isArray(operation.data)
          ? (operation.data as Record<string, unknown>)
          : {}
      const hasExplicitCommittedEnvelope =
        Object.prototype.hasOwnProperty.call(rawBatchData, 'baseVersion') ||
        Object.prototype.hasOwnProperty.call(rawBatchData, 'appliedVersion') ||
        Object.prototype.hasOwnProperty.call(rawBatchData, 'payloadSchemaVersion')
      if (
        hasExplicitCommittedEnvelope &&
        knownVersion != null &&
        knownVersion === committedBatch.appliedVersion &&
        this.appliedCommittedBatchKeys.has(dedupeKey)
      ) {
        this.tryApplyCommittedBatchCellOpsToGrid(committedBatch)
        if (hasColumnStructuralOperation(committedBatch.operations)) {
          this.reconcileDuplicateColumnStructuralBatch({
            committedBatch,
            traceMeta,
            activeSheetId
          })
          return
        }
        if (hasInsertRowSlotsOperation(committedBatch.operations)) {
          this.collabDiag('duplicate_structural_insert_skipped', {
            sheetId: committedBatch.sheetId,
            incomingVersion: committedBatch.appliedVersion,
            knownVersion,
            dedupeKey
          })
          this.traceEvent({
            source: 'client',
            stage: 'client_duplicate_structural_insert_skipped',
            traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
            traceId: committedBatch.traceId ?? traceMeta.traceId,
            batchId: committedBatch.batchId ?? traceMeta.batchId,
            operationType: operation.type,
            version: committedBatch.appliedVersion,
            payload: {
              sheetId: committedBatch.sheetId,
              knownVersion,
              dedupeKey
            }
          })
        }
        this.collabDiag('committed_batch_already_reflected_skipped', {
          sheetId: committedBatch.sheetId,
          incomingVersion: committedBatch.appliedVersion,
          knownVersion,
          sameUser: isSameUser
        })
        this.traceEvent({
          source: 'client',
          stage: 'client_committed_batch_already_reflected_skipped',
          traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
          traceId: committedBatch.traceId ?? traceMeta.traceId,
          batchId: committedBatch.batchId ?? traceMeta.batchId,
          operationType: operation.type,
          version: committedBatch.appliedVersion,
          payload: {
            sheetId: committedBatch.sheetId,
            knownVersion,
            sameUser: isSameUser
          }
        })
        return
      }
      if (
        hasExplicitCommittedEnvelope &&
        knownVersion != null &&
        knownVersion > committedBatch.appliedVersion &&
        !this.appliedCommittedBatchKeys.has(dedupeKey) &&
        this.callbacks.requestSheetCatchUp
      ) {
        const scheduled = this.requestStaleDataOpCatchUp({
          sheetId: committedBatch.sheetId,
          sinceVersion: Math.max(0, committedBatch.baseVersion),
          incomingVersion: committedBatch.appliedVersion,
          knownVersion,
          operationType: operation.type,
          stateCovered: false,
          traceMeta: {
            traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
            traceId: committedBatch.traceId ?? traceMeta.traceId,
            batchId: committedBatch.batchId ?? traceMeta.batchId
          },
          diagnosticsStage: 'client_committed_batch_version_ahead_catchup_requested'
        })
        if (scheduled) {
          this.collabDiag('committed_batch_version_ahead_catchup_requested', {
            sheetId: committedBatch.sheetId,
            incomingVersion: committedBatch.appliedVersion,
            knownVersion,
            sameUser: isSameUser
          })
          return
        }
      }
      const replayMode = getSpreadsheetDeltaReplayMode()
      const validation = hasExplicitCommittedEnvelope
        ? validateCommittedBatchForLiveApply({
            batch: committedBatch,
            localAppliedVersion: knownVersion,
            alreadyApplied: this.appliedCommittedBatchKeys.has(dedupeKey)
          })
        : ({ ok: true } as const)
      if (!validation.ok) {
        this.collabDiag('committed_batch_live_apply_blocked', {
          reason: validation.reason,
          sheetId: committedBatch.sheetId,
          incomingVersion: committedBatch.appliedVersion,
          knownVersion: knownVersion ?? -1,
          replayMode
        })
        this.traceEvent({
          source: 'client',
          stage: 'client_committed_batch_live_apply_blocked',
          severity: validation.reason === 'duplicate' ? 'info' : 'warning',
          traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
          traceId: committedBatch.traceId ?? traceMeta.traceId,
          batchId: committedBatch.batchId ?? traceMeta.batchId,
          operationType: operation.type,
          version: committedBatch.appliedVersion,
          payload: {
            reason: validation.reason,
            sheetId: committedBatch.sheetId,
            baseVersion: committedBatch.baseVersion,
            localAppliedVersion: knownVersion ?? null,
            replayMode
          }
        })
        if (
          this.handleBlockedCommittedBatchRecovery({
            batch: committedBatch,
            reason: validation.reason,
            knownVersion: knownVersion ?? null,
            alreadyApplied: this.appliedCommittedBatchKeys.has(dedupeKey),
            isSameUser,
            traceMeta
          })
        ) {
          return
        }
        return
      }
      if (committedBatch.sheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: committedBatch.sheetId,
          activeSheetId
        })
        this.markGridMaterializationNeeded(committedBatch.sheetId, 'batch_operations')
      }
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_batch_received',
        traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
        traceId: committedBatch.traceId ?? traceMeta.traceId,
        batchId: committedBatch.batchId ?? traceMeta.batchId,
        operationType: operation.type,
        version: committedBatch.appliedVersion,
        payload: {
          sheetId: committedBatch.sheetId,
          baseVersion: committedBatch.baseVersion,
          appliedVersion: committedBatch.appliedVersion,
          payloadSchemaVersion: committedBatch.payloadSchemaVersion,
          operationCount: committedBatch.operations.length,
          replayMode
        }
      })
      if (
        this.applyCommittedBatchEnvelope({
          committedBatch,
          traceMeta,
          isSameUser,
          operation,
          activeSheetId,
          dedupeKey,
          replayMode
        })
      ) {
        return
      }
      this.collabDiag('committed_batch_legacy_fallback', {
        sheetId: committedBatch.sheetId,
        incomingVersion: committedBatch.appliedVersion,
        replayMode,
        operationCount: committedBatch.operations.length
      })
      this.traceEvent({
        source: 'client',
        stage: 'client_committed_batch_legacy_fallback',
        severity: 'warning',
        traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
        traceId: committedBatch.traceId ?? traceMeta.traceId,
        batchId: committedBatch.batchId ?? traceMeta.batchId,
        operationType: operation.type,
        version: committedBatch.appliedVersion,
        payload: {
          sheetId: committedBatch.sheetId,
          replayMode,
          operationCount: committedBatch.operations.length
        }
      })
      this.handleBatchOperations(
        committedBatch.operations,
        committedBatch.appliedVersion,
        committedBatch.sheetId,
        traceMeta,
        {
          isLocalEcho: isSameUser
        }
      )
      this.appliedCommittedBatchKeys.add(dedupeKey)
      this.updateVersion(operation.data, version)
      return
    }

    if (isLegacyWsRelayOperation(operation.type)) {
      this.handleLegacyWsRelayOperation({
        operation,
        version,
        opSheetId,
        activeSheetId,
        traceMeta,
        isSameUser,
        normalizedIncomingVersion
      })
      return
    }

    if (opSheetId && isDeprecatedWsStructuralRelayOperation(operation.type)) {
      this.handleDeprecatedWsStructuralRelay({
        operationType: operation.type,
        opSheetId,
        activeSheetId,
        traceMeta,
        normalizedIncomingVersion
      })
      return
    }

    if (opSheetId && LIVE_STRUCTURAL_OP_TYPES.has(operation.type)) {
      if (opSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: opSheetId,
          activeSheetId
        })
      }
      this.requestSnapshotFallback({
        sheetId: opSheetId,
        reason: 'planning_failure',
        immediate: opSheetId === activeSheetId ? true : undefined,
        detail: operation.type,
        operationType: operation.type,
        version: normalizedIncomingVersion ?? null
      })
      return
    }
  }

  // --- Private: Receiver Handlers ---

  /**
   * Re-wraps legacy `batch_operations` payloads (operations array without committed envelope fields)
   * and re-enters `handleOperation` so they use the committed-batch receive path when possible.
   */
  private redispatchLegacyBatchOperationsAsCommittedEnvelope(
    payload: CollaborationOperation,
    legacyData: { sheetId: string; operations: Array<{ type?: string; data?: unknown }> },
    version: number | undefined
  ): boolean {
    const appliedVersion =
      typeof version === 'number' && Number.isFinite(version) && version >= 0 ? Math.trunc(version) : null
    if (appliedVersion == null) return false

    this.collabDiag('legacy_batch_operations_rewrapped_as_committed', {
      sheetId: legacyData.sheetId,
      operationCount: legacyData.operations.length,
      appliedVersion
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_legacy_batch_operations_rewrapped_as_committed',
      severity: 'info',
      traceSessionId: getDiagnosticsTraceMeta(payload.operation.data).traceSessionId,
      traceId: getDiagnosticsTraceMeta(payload.operation.data).traceId,
      batchId: getDiagnosticsTraceMeta(payload.operation.data).batchId,
      operationType: 'batch_operations',
      version: appliedVersion,
      payload: {
        sheetId: legacyData.sheetId,
        operationCount: legacyData.operations.length
      }
    })

    this.handleOperation({
      ...payload,
      operation: {
        type: 'batch_operations',
        data: {
          sheetId: legacyData.sheetId,
          operations: legacyData.operations,
          baseVersion: Math.max(0, appliedVersion - 1),
          appliedVersion,
          payloadSchemaVersion: SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION
        },
        baseVersion: Math.max(0, appliedVersion - 1),
        version: appliedVersion
      },
      version: appliedVersion
    })
    return true
  }

  private adaptLegacyBatchOperationsToCommittedEnvelope(params: {
    operations: Array<{ type?: string; data?: unknown }>
    version: number | undefined
    targetSheetId: string
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string }
    isSameUser?: boolean
  }): boolean {
    const appliedVersion =
      typeof params.version === 'number' && Number.isFinite(params.version) && params.version >= 0
        ? Math.trunc(params.version)
        : null
    if (appliedVersion == null || params.operations.length === 0) {
      return false
    }
    const replayMode = getSpreadsheetDeltaReplayMode()
    if (replayMode === 'off') {
      return false
    }
    const committedBatch: SpreadsheetCommittedBatchEnvelope = {
      sheetId: params.targetSheetId,
      baseVersion: Math.max(0, appliedVersion - 1),
      appliedVersion,
      operations: params.operations
        .filter(operation => typeof operation.type === 'string' && operation.type.length > 0)
        .map(operation => ({
          type: String(operation.type),
          data:
            operation.data && typeof operation.data === 'object' && !Array.isArray(operation.data)
              ? (operation.data as Record<string, unknown>)
              : {},
          baseVersion: Math.max(0, appliedVersion - 1),
          appliedVersion
        })),
      payloadSchemaVersion: SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION
    }
    if (committedBatch.operations.length === 0) {
      return false
    }
    return this.applyCommittedBatchEnvelope({
      committedBatch,
      traceMeta: params.traceMeta ?? {},
      isSameUser: params.isSameUser ?? false,
      operation: { type: 'batch_operations', data: { sheetId: params.targetSheetId } },
      activeSheetId: this.callbacks.getActiveSheetId(),
      dedupeKey: buildCommittedBatchDedupeKey(committedBatch),
      replayMode
    })
  }

  private handleLegacyWsRelayOperation(params: {
    operation: CollaborationOperation['operation']
    version: number | undefined
    opSheetId: string | undefined
    activeSheetId: string
    traceMeta: DiagnosticsTraceMeta
    isSameUser: boolean
    normalizedIncomingVersion: number | undefined
  }): void {
    const { operation, version, opSheetId, activeSheetId, traceMeta, isSameUser, normalizedIncomingVersion } = params
    const targetSheetId = opSheetId ?? activeSheetId
    const appliedVersion = resolveWireOperationAppliedVersion(normalizedIncomingVersion, operation)

    this.collabDiag('legacy_wire_operation_received', {
      opType: operation.type,
      sheetId: targetSheetId,
      appliedVersion: appliedVersion ?? -1,
      replayMode: getSpreadsheetDeltaReplayMode()
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_legacy_wire_operation_received',
      severity: 'warning',
      traceSessionId: traceMeta.traceSessionId,
      traceId: traceMeta.traceId,
      batchId: traceMeta.batchId,
      operationType: operation.type,
      version: appliedVersion,
      payload: {
        sheetId: targetSheetId,
        replayMode: getSpreadsheetDeltaReplayMode()
      }
    })

    if (opSheetId && opSheetId !== activeSheetId) {
      this.collabDiag('collab_receive_active_sheet_mismatch', {
        opType: operation.type,
        sheetId: opSheetId,
        activeSheetId
      })
    }

    const replayMode = getSpreadsheetDeltaReplayMode()
    if (replayMode !== 'off' && appliedVersion != null) {
      const envelope = synthesizeCommittedBatchFromWireOperation({
        operationType: operation.type,
        data: operation.data,
        sheetId: targetSheetId,
        appliedVersion
      })
      if (envelope) {
        const dedupeKey = buildCommittedBatchDedupeKey(envelope)
        if (
          this.applyCommittedBatchEnvelope({
            committedBatch: envelope,
            traceMeta,
            isSameUser,
            operation,
            activeSheetId,
            dedupeKey,
            replayMode
          })
        ) {
          this.updateVersion(operation.data, version)
          return
        }
      }
      if (this.callbacks.requestSheetCatchUp && targetSheetId) {
        const knownVersion = this.getKnownSheetVersion(targetSheetId)
        const scheduled = this.requestStaleDataOpCatchUp({
          sheetId: targetSheetId,
          sinceVersion: knownVersion ?? Math.max(0, appliedVersion - 1),
          incomingVersion: appliedVersion,
          knownVersion,
          operationType: operation.type,
          stateCovered: false,
          traceMeta
        })
        if (scheduled) return
      }
    }

    if (operation.type === 'row_update') {
      this.handleRowUpdate(operation.data, targetSheetId)
      this.updateVersion(operation.data, version)
      return
    }

    if (operation.type === 'cells_changed') {
      const payload = operation.data as CellsChangedPayload | undefined
      const wireCells = Array.isArray(payload?.cells) ? payload.cells : []
      const hasValueCell = wireCells.some(
        cell => cell?.rowId && cell.column != null && Object.prototype.hasOwnProperty.call(cell, 'value')
      )
      const styleOnly =
        wireCells.length > 0 && !hasValueCell && wireCells.some(cell => Boolean(cell?.univerCell || cell?.univerStyles))

      if (hasValueCell) {
        // When delta replay is enabled, a versioned value `cells_changed` is
        // already handled by the committed-envelope block above (which returns).
        // Reaching here with value cells means replay is **off**, so fall back
        // to the legacy live apply so peer values still paint (bulk) and commit
        // to the session — the single source of truth for the grid projection.
        if (replayMode === 'off') {
          this.applyLivePersistedChanges(
            [
              {
                operationType: 'cells_changed',
                payload: (operation.data as Record<string, unknown>) ?? {},
                appliedVersion: appliedVersion ?? this.lastKnownVersion
              }
            ],
            'single_op',
            'direct_apply',
            targetSheetId
          )
          this.updateVersion(operation.data, version)
          return
        }
        // Replay enabled but no applied version to anchor a committed envelope:
        // resync deterministically via catch-up instead of a P2P value apply.
        if (this.callbacks.requestSheetCatchUp && targetSheetId) {
          const knownVersion = this.getKnownSheetVersion(targetSheetId)
          const scheduled = this.requestStaleDataOpCatchUp({
            sheetId: targetSheetId,
            sinceVersion: knownVersion ?? Math.max(0, (appliedVersion ?? 1) - 1),
            incomingVersion: appliedVersion ?? knownVersion ?? 0,
            knownVersion,
            operationType: operation.type,
            stateCovered: false,
            traceMeta
          })
          if (scheduled) return
        }
        this.collabDiag('legacy_cells_changed_value_p2p_dropped', {
          sheetId: targetSheetId,
          appliedVersion: appliedVersion ?? -1
        })
        return
      }

      if (styleOnly) {
        this.handleCellsChanged(operation.data, 'direct_apply')
        this.updateVersion(operation.data, version)
        return
      }

      if (this.callbacks.requestSheetCatchUp && targetSheetId) {
        const knownVersion = this.getKnownSheetVersion(targetSheetId)
        this.requestStaleDataOpCatchUp({
          sheetId: targetSheetId,
          sinceVersion: knownVersion ?? Math.max(0, (appliedVersion ?? 1) - 1),
          incomingVersion: appliedVersion ?? knownVersion ?? 0,
          knownVersion,
          operationType: operation.type,
          stateCovered: false,
          traceMeta
        })
      }
      return
    }

    if (LIVE_PERSISTED_CELL_OP_TYPES.has(operation.type)) {
      this.applyLivePersistedChanges(
        [
          {
            operationType: operation.type,
            payload: (operation.data as Record<string, unknown>) ?? {},
            appliedVersion: appliedVersion ?? this.lastKnownVersion
          }
        ],
        'single_op',
        'direct_apply',
        targetSheetId
      )
      this.updateVersion(operation.data, version)
    }
  }

  private handleDeprecatedWsStructuralRelay(params: {
    operationType: string
    opSheetId: string
    activeSheetId: string
    traceMeta: DiagnosticsTraceMeta
    normalizedIncomingVersion: number | undefined
  }): void {
    const { operationType, opSheetId, activeSheetId, traceMeta, normalizedIncomingVersion } = params

    this.collabDiag('deprecated_ws_structural_relay_received', {
      opType: operationType,
      sheetId: opSheetId,
      activeSheetId
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_deprecated_ws_structural_relay_received',
      severity: 'warning',
      traceSessionId: traceMeta.traceSessionId,
      traceId: traceMeta.traceId,
      batchId: traceMeta.batchId,
      operationType,
      version: normalizedIncomingVersion ?? null,
      payload: { sheetId: opSheetId, activeSheetId }
    })

    if (opSheetId !== activeSheetId) {
      this.collabDiag('collab_receive_active_sheet_mismatch', {
        opType: operationType,
        sheetId: opSheetId,
        activeSheetId
      })
      this.markGridMaterializationNeeded(opSheetId, operationType)
    }

    const knownVersion = this.getKnownSheetVersion(opSheetId)
    if (
      this.callbacks.requestSheetCatchUp &&
      normalizedIncomingVersion != null &&
      knownVersion != null &&
      normalizedIncomingVersion > knownVersion + 1
    ) {
      this.requestSheetCatchUpCoalesced(opSheetId, 'version_gap', {
        sinceVersion: knownVersion,
        incomingVersion: normalizedIncomingVersion
      })
      return
    }

    if (this.callbacks.requestSheetCatchUp && normalizedIncomingVersion != null) {
      this.requestStaleDataOpCatchUp({
        sheetId: opSheetId,
        sinceVersion: knownVersion ?? Math.max(0, normalizedIncomingVersion - 1),
        incomingVersion: normalizedIncomingVersion,
        knownVersion,
        operationType,
        stateCovered: false,
        traceMeta
      })
      return
    }

    this.requestSnapshotFallback({
      sheetId: opSheetId,
      reason: 'planning_failure',
      immediate: opSheetId === activeSheetId,
      detail: `deprecated_ws_structural:${operationType}`,
      operationType,
      version: normalizedIncomingVersion ?? null
    })
  }

  private handleCellsChanged(data: unknown, mode: 'direct_apply' | 'sync_grid_only' = 'direct_apply'): void {
    const d = data as CellsChangedPayload | undefined
    const traceMeta = getDiagnosticsTraceMeta(data)
    if (!d?.sheetId) {
      this.collabDiag('collab_receive_skipped', { reason: 'no_sheet_id' })
      return
    }
    if (!Array.isArray(d.cells) || d.cells.length === 0) {
      this.collabDiag('collab_receive_skipped', { reason: 'empty_cells' })
      return
    }
    this.markGridMaterializationNeeded(d.sheetId, 'cells_changed')

    const updatesByRowId = new Map<string, Record<string, unknown>>()

    for (const cell of d.cells) {
      if (!cell?.rowId) continue
      if (cell.column == null) continue
      if (!Object.prototype.hasOwnProperty.call(cell, 'value')) continue
      const remoteRowId = String(cell.rowId)
      const targetColumnName = this.resolveColumnName(cell.column, d.sheetId)
      const rowUpdates = updatesByRowId.get(remoteRowId) ?? {}
      rowUpdates[targetColumnName] = cell.value
      updatesByRowId.set(remoteRowId, rowUpdates)
    }

    const cellQualifiesForGridApply = (cell: CellsChangedCell | undefined): boolean => {
      if (!cell?.rowId || cell.column == null) return false
      const hasValue = Object.prototype.hasOwnProperty.call(cell, 'value')
      const hasRich = Boolean(cell.univerCell && typeof cell.univerCell === 'object')
      return hasValue || hasRich
    }

    if (updatesByRowId.size === 0 && !d.cells.some(cellQualifiesForGridApply)) {
      this.collabDiag('collab_receive_skipped', { reason: 'no_valid_cell_payloads', wireCellCount: d.cells.length })
      return
    }
    const isActiveSheet = d.sheetId === this.callbacks.getActiveSheetId()
    if (updatesByRowId.size > 0) {
      this.applyDataModelUpdates(updatesByRowId, d.sheetId, {
        syncGrid: isActiveSheet,
        authoritativeApplyMeta:
          mode === 'direct_apply' && isActiveSheet
            ? {
                traceSessionId: traceMeta.traceSessionId,
                traceId: traceMeta.traceId,
                batchId: traceMeta.batchId,
                operationType: 'cells_changed'
              }
            : null
      })
    }

    if (mode === 'sync_grid_only') {
      this.collabDiag('collab_receive_cells_changed', {
        wireCellCount: d.cells.length,
        distinctRowIds: updatesByRowId.size,
        gridApplySkipped: true
      })
      return
    }

    let withA1Applied = 0
    let withCoordsApplied = 0
    let skippedApply = 0
    let invalidA1Ref = 0

    const richOptions = (cell: CellsChangedCell): ApplyRemoteCellUpdateOptions | undefined => {
      if (!cell.univerCell && !cell.univerStyles) return undefined
      return {
        univerCell: cell.univerCell,
        univerStyles: cell.univerStyles,
        diagnosticTraceSessionId: traceMeta.traceSessionId,
        diagnosticTraceId: traceMeta.traceId,
        diagnosticBatchId: traceMeta.batchId,
        diagnosticOperationType: 'cells_changed'
      }
    }

    const gridCellsByPosition = new Map<string, SpreadsheetBulkRemoteCellItem>()

    for (const cell of d.cells) {
      if (!cell?.rowId) continue
      if (cell.column == null) continue
      const hasValue = Object.prototype.hasOwnProperty.call(cell, 'value')
      const hasRich = Boolean(cell.univerCell && typeof cell.univerCell === 'object')
      if (!hasValue && !hasRich) continue
      const remoteRowId = String(cell.rowId)
      const wireValue = hasValue ? undefined : cell.value
      const trimmedRef = typeof cell.cellRef === 'string' ? cell.cellRef.trim() : ''
      const hadInvalidA1 = Boolean(trimmedRef && !parseA1Reference(trimmedRef))
      const coordinateCell = cell as CellsChangedCell & { row?: number; col?: number }
      const target = this.resolveGridApplyTarget({
        sheetId: d.sheetId,
        rowId: remoteRowId,
        columnKey: String(cell.column),
        cellRef: cell.cellRef,
        row: coordinateCell.row,
        col: coordinateCell.col,
        extraOptions: richOptions(cell)
      })
      if (!target) {
        if (hadInvalidA1) invalidA1Ref += 1
        skippedApply += 1
        continue
      }
      if (trimmedRef && parseA1Reference(trimmedRef)) {
        withA1Applied += 1
      } else {
        withCoordsApplied += 1
      }
      if (!hasRich) continue
      gridCellsByPosition.set(`${target.rowIndex}:${target.colIndex}`, {
        rowIndex: target.rowIndex,
        colIndex: target.colIndex,
        value: wireValue,
        rowId: remoteRowId,
        ...(target.options ? { options: target.options } : {})
      })
    }

    const gridCellsOrdered = Array.from(gridCellsByPosition.values())
    if (
      gridCellsOrdered.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH &&
      this.callbacks.applyRemoteCellUpdatesBulk
    ) {
      this.callbacks.applyRemoteCellUpdatesBulk(gridCellsOrdered, {
        traceSessionId: traceMeta.traceSessionId,
        traceId: traceMeta.traceId,
        batchId: traceMeta.batchId,
        operationType: 'cells_changed'
      })
    } else {
      for (const it of gridCellsOrdered) {
        if (it.options) {
          this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId, it.options)
        } else {
          this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId)
        }
      }
    }

    const refsOnWire: string[] = []
    for (const cell of d.cells) {
      if (typeof cell?.cellRef === 'string') {
        const t = cell.cellRef.trim()
        if (t) refsOnWire.push(t)
      }
    }
    const cellRefsCsv =
      refsOnWire.length === 0
        ? 'none'
        : `${refsOnWire.slice(0, 32).join(',')}${refsOnWire.length > 32 ? ',…' : ''}`.slice(0, 220)

    this.collabDiag('collab_receive_cells_changed', {
      wireCellCount: d.cells.length,
      distinctRowIds: updatesByRowId.size,
      withA1Applied,
      withCoordsApplied,
      skippedApply,
      invalidA1Ref,
      cellRefsOnWireCount: refsOnWire.length,
      cellRefsCsv
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_cells_applied',
      traceSessionId: traceMeta.traceSessionId,
      traceId: traceMeta.traceId,
      batchId: traceMeta.batchId,
      operationType: 'cells_changed',
      payload: {
        wireCellCount: d.cells.length,
        distinctRowIds: updatesByRowId.size,
        withA1Applied,
        withCoordsApplied,
        skippedApply,
        invalidA1Ref
      }
    })
  }

  private applyAggregatedRemoteDimensionsFromOperations(
    operations: Array<{ type?: string; data?: unknown }>,
    fallbackSheetId: string
  ): void {
    const aggregatedColumnData: Record<string, { w?: number; hd?: number }> = {}
    const aggregatedRowData: Record<string, { h?: number; hd?: number }> = {}
    let aggregatedDimensionSheetId: string | null = null
    let hasDimensionUpdates = false

    for (const operation of operations) {
      const type = typeof operation.type === 'string' ? operation.type : ''
      if (!SNAPSHOT_DIMENSION_OP_TYPES.has(type)) continue
      const d =
        (operation.data as {
          sheetId?: string
          colIndex?: number
          rowIndex?: number
          width?: number
          height?: number
        }) ?? {}
      if (typeof d.sheetId === 'string') {
        aggregatedDimensionSheetId = d.sheetId
      }
      if (type === 'set_col_width' && typeof d.colIndex === 'number' && typeof d.width === 'number') {
        aggregatedColumnData[String(d.colIndex)] = { w: d.width }
        hasDimensionUpdates = true
      } else if (type === 'set_row_height' && typeof d.rowIndex === 'number' && typeof d.height === 'number') {
        aggregatedRowData[String(d.rowIndex)] = { h: d.height }
        hasDimensionUpdates = true
      }
    }

    if (!hasDimensionUpdates) return
    const sheetId = aggregatedDimensionSheetId ?? fallbackSheetId
    this.markGridMaterializationNeeded(sheetId, 'dimensions')
    this.callbacks.applyRemoteDimensions?.({
      sheetId,
      defaultColWidth: 0,
      defaultRowHeight: 0,
      columnData: aggregatedColumnData,
      rowData: aggregatedRowData,
      rowHeaderWidth: 0,
      columnHeaderHeight: 0,
      zoomRatio: 0
    })
  }

  /**
   * Plans and applies a validated committed batch when delta replay is enabled.
   * @returns true when the batch was fully handled without legacy fallthrough.
   */
  private applyCommittedBatchEnvelope(params: {
    committedBatch: SpreadsheetCommittedBatchEnvelope
    traceMeta: DiagnosticsTraceMeta
    isSameUser: boolean
    operation: { type: string; data?: unknown }
    activeSheetId: string
    dedupeKey: string
    replayMode: ReturnType<typeof getSpreadsheetDeltaReplayMode>
  }): boolean {
    const { committedBatch, traceMeta, isSameUser, operation, activeSheetId, dedupeKey, replayMode } = params
    if (replayMode === 'off') {
      return false
    }
    const baseRows =
      this.callbacks.getSheetData?.(committedBatch.sheetId) ??
      (committedBatch.sheetId === activeSheetId ? this.callbacks.getLocalSheetData() : [])
    const transactionPlan = planCommittedSpreadsheetRemoteTransaction({
      batch: committedBatch,
      baseRows,
      columns: this.getColumnsForSheet(committedBatch.sheetId),
      workbookSnapshot: this.callbacks.getWorkbookSnapshot?.() ?? null
    })
    this.collabDiag('committed_batch_transaction_plan_result', {
      sheetId: committedBatch.sheetId,
      incomingVersion: committedBatch.appliedVersion,
      replayMode,
      ok: transactionPlan.ok,
      reason: transactionPlan.ok ? undefined : transactionPlan.reason,
      detail: transactionPlan.ok ? undefined : transactionPlan.detail
    })
    this.traceEvent({
      source: 'client',
      stage: transactionPlan.ok
        ? 'client_committed_batch_transaction_planned'
        : 'client_committed_batch_transaction_rejected',
      severity: transactionPlan.ok ? 'info' : 'warning',
      traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
      traceId: committedBatch.traceId ?? traceMeta.traceId,
      batchId: committedBatch.batchId ?? traceMeta.batchId,
      operationType: operation.type,
      version: committedBatch.appliedVersion,
      payload: transactionPlan.ok
        ? {
            sheetId: committedBatch.sheetId,
            replayMode,
            dirtyRegions: transactionPlan.dirtyRegions,
            rowCount: transactionPlan.sessionPatch.rows.length
          }
        : {
            sheetId: committedBatch.sheetId,
            replayMode,
            reason: transactionPlan.reason,
            detail: transactionPlan.detail
          }
    })
    if (!transactionPlan.ok && replayMode === 'enabled') {
      this.requestSnapshotFallback({
        sheetId: committedBatch.sheetId,
        reason: transactionPlan.reason,
        immediate: committedBatch.sheetId === activeSheetId,
        detail: transactionPlan.detail,
        traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
        traceId: committedBatch.traceId ?? traceMeta.traceId,
        batchId: committedBatch.batchId ?? traceMeta.batchId,
        operationType: operation.type,
        version: committedBatch.appliedVersion
      })
      return true
    }
    if (replayMode === 'shadow') {
      return false
    }
    this.collabDiag('committed_batch_remote_transaction_gate', {
      sheetId: committedBatch.sheetId,
      incomingVersion: committedBatch.appliedVersion,
      replayMode,
      transactionPlanOk: transactionPlan.ok,
      hasRunRemoteTransaction: Boolean(this.callbacks.runRemoteTransaction)
    })
    if (transactionPlan.ok && replayMode === 'enabled' && this.callbacks.runRemoteTransaction) {
      const committedBatchColumns = this.getCommittedBatchColumns(committedBatch)
      const preTransactionColumnReorderContexts = this.buildColumnReorderContexts(committedBatch, committedBatchColumns)
      const gridReadyBatch = this.enrichCommittedBatchWithGridCoordinates(
        committedBatch,
        transactionPlan.sessionPatch.rows
      )
      const hasPersistedCellOps = gridReadyBatch.operations.some(operation =>
        LIVE_PERSISTED_CELL_OP_TYPES.has(operation.type)
      )
      const skipInactiveGridTransaction =
        (committedBatch.sheetId !== activeSheetId && hasColumnStructuralOperation(gridReadyBatch.operations)) ||
        this.shouldDeferInactiveGridApplyUntilCanonicalMaterialization(committedBatch.sheetId)
      const runResult = skipInactiveGridTransaction
        ? ({ ok: true, appliedCellCount: 0, appliedOperationCount: 0 } as const)
        : this.callbacks.runRemoteTransaction({
            ...transactionPlan,
            batch: gridReadyBatch
          })
      this.traceEvent({
        source: 'client',
        stage: runResult.ok
          ? skipInactiveGridTransaction
            ? 'client_committed_batch_inactive_grid_transaction_deferred'
            : 'client_committed_batch_transaction_applied'
          : 'client_committed_batch_transaction_apply_failed',
        severity: runResult.ok ? 'info' : 'warning',
        traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
        traceId: committedBatch.traceId ?? traceMeta.traceId,
        batchId: committedBatch.batchId ?? traceMeta.batchId,
        operationType: operation.type,
        version: committedBatch.appliedVersion,
        payload: runResult.ok
          ? {
              sheetId: committedBatch.sheetId,
              replayMode,
              appliedCellCount: runResult.appliedCellCount,
              appliedOperationCount: runResult.appliedOperationCount
            }
          : {
              sheetId: committedBatch.sheetId,
              replayMode,
              reason: runResult.reason,
              detail: runResult.detail
            }
      })
      if (!runResult.ok) {
        this.requestSnapshotFallback({
          sheetId: committedBatch.sheetId,
          reason: 'live_apply_failure',
          immediate: committedBatch.sheetId === activeSheetId,
          detail: `${runResult.reason}:${runResult.detail}`,
          traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
          traceId: committedBatch.traceId ?? traceMeta.traceId,
          batchId: committedBatch.batchId ?? traceMeta.batchId,
          operationType: operation.type,
          version: committedBatch.appliedVersion
        })
        return true
      }
      const insertRowSlotsInserts = gridReadyBatch.operations
        .map(operation =>
          operation.type === 'insert_row_slots' ? this.extractInsertRowSlotsFromData(operation.data) : null
        )
        .filter((insert): insert is NonNullable<typeof insert> => insert != null)
      const needsStructuralGridSync = this.batchNeedsStructuralGridSync(gridReadyBatch)
      let deferredCommittedApply =
        runResult.ok && 'deferredApply' in runResult && typeof runResult.deferredApply === 'function'
          ? runResult.deferredApply
          : null
      const shouldDeferCommittedApplyUntilInsertStructure =
        Boolean(deferredCommittedApply) &&
        committedBatch.sheetId === activeSheetId &&
        insertRowSlotsInserts.length > 0 &&
        !isSameUser
      const runDeferredCommittedApply = (): void => {
        if (!deferredCommittedApply) return
        const applyDeferred = deferredCommittedApply
        deferredCommittedApply = null
        const deferredResult = applyDeferred()
        if (!deferredResult || deferredResult.ok) {
          return
        }
        this.requestSnapshotFallback({
          sheetId: committedBatch.sheetId,
          reason: 'live_apply_failure',
          immediate: committedBatch.sheetId === activeSheetId,
          detail: `${deferredResult.reason}:${deferredResult.detail}`,
          traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
          traceId: committedBatch.traceId ?? traceMeta.traceId,
          batchId: committedBatch.batchId ?? traceMeta.batchId,
          operationType: operation.type,
          version: committedBatch.appliedVersion
        })
      }
      const sessionRowsWithPlacements = applyCommittedGridRowPlacements(
        transactionPlan.sessionPatch.rows,
        committedBatch.gridRowIndexByRowUuid
      )
      const sessionDiffProjectionMode =
        committedBatch.sheetId === activeSheetId && needsStructuralGridSync ? ('skip' as const) : undefined
      const shouldSkipLocalStructuralGridSync =
        isSameUser &&
        committedBatch.sheetId === activeSheetId &&
        sessionDiffProjectionMode === 'skip' &&
        !hasPersistedCellOps
      this.commitSheetData(committedBatch.sheetId, sessionRowsWithPlacements, {
        persisted: true,
        syncGrid:
          committedBatch.sheetId === activeSheetId &&
          !shouldDeferCommittedApplyUntilInsertStructure &&
          (hasPersistedCellOps || (needsStructuralGridSync && !shouldSkipLocalStructuralGridSync)),
        ...(sessionDiffProjectionMode === 'skip' && !hasPersistedCellOps
          ? { suppressAuthoritativeDataSyncToken: true }
          : {}),
        ...(sessionDiffProjectionMode ? { sessionDiffProjectionMode } : {}),
        ...(committedBatch.sheetId === activeSheetId &&
        hasPersistedCellOps &&
        deferredCommittedApply &&
        !shouldDeferCommittedApplyUntilInsertStructure
          ? {
              authoritativeApplyMeta: {
                operationType: 'authoritative_reapply',
                onApplyComplete: runDeferredCommittedApply
              }
            }
          : {})
      })
      if (
        (committedBatch.sheetId !== activeSheetId || !hasPersistedCellOps) &&
        !shouldDeferCommittedApplyUntilInsertStructure
      ) {
        runDeferredCommittedApply()
      }
      this.applyCommittedBatchStructuralLiveOperations({
        batch: gridReadyBatch,
        activeSheetId,
        rows: sessionRowsWithPlacements,
        dirtyRegions: transactionPlan.dirtyRegions,
        traceMeta,
        isLocalEcho: isSameUser,
        onAfterInsertStructureSettled: shouldDeferCommittedApplyUntilInsertStructure
          ? runDeferredCommittedApply
          : undefined,
        preTransactionColumnReorderContexts
      })
      try {
        this.applyCommittedBatchAuthoritativePatches(gridReadyBatch)
      } catch (error) {
        this.requestSnapshotFallback({
          sheetId: committedBatch.sheetId,
          reason: 'live_apply_failure',
          immediate: committedBatch.sheetId === activeSheetId,
          detail: error instanceof Error ? error.message : String(error),
          traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
          traceId: committedBatch.traceId ?? traceMeta.traceId,
          batchId: committedBatch.batchId ?? traceMeta.batchId,
          operationType: operation.type,
          version: committedBatch.appliedVersion
        })
        return true
      }
      const hasRemoteMergeRanges = gridReadyBatch.operations.some(operation => operation.type === 'merge_ranges')
      if (committedBatch.sheetId === activeSheetId && hasRemoteMergeRanges && transactionPlan.dirtyRegions.length > 0) {
        const mergeCatchupRegion = this.authoritativeRegionFromDirtyRegions(
          transactionPlan.dirtyRegions,
          sessionRowsWithPlacements,
          committedBatch.sheetId
        )
        if (mergeCatchupRegion != null) {
          this.callbacks.forceGridReapply?.(committedBatch.sheetId, mergeCatchupRegion, {
            clearAllSignatures: false,
            preferBulk: true,
            reason: 'merge_ranges_session_catchup'
          })
        }
      }
      if (needsStructuralGridSync && committedBatch.sheetId === activeSheetId) {
        queueMicrotask(() => {
          this.applyStructuralTransactionGridSync({
            sheetId: committedBatch.sheetId,
            rows: transactionPlan.sessionPatch.rows,
            dirtyRegions: transactionPlan.dirtyRegions,
            batch: gridReadyBatch,
            traceMeta
          })
        })
      }
      if (runResult.appliedCellCount === 0) {
        const identityCellChanges = this.collectIdentityBasedCellChanges(gridReadyBatch)
        if (identityCellChanges.length > 0 && !skipInactiveGridTransaction) {
          this.collabDiag('committed_batch_runner_zero_cells_fallback', {
            sheetId: committedBatch.sheetId,
            changeCount: identityCellChanges.length,
            incomingVersion: committedBatch.appliedVersion
          })
          this.traceEvent({
            source: 'client',
            stage: 'client_committed_batch_runner_zero_cells_fallback',
            severity: 'warning',
            traceSessionId: committedBatch.traceSessionId ?? traceMeta.traceSessionId,
            traceId: committedBatch.traceId ?? traceMeta.traceId,
            batchId: committedBatch.batchId ?? traceMeta.batchId,
            operationType: operation.type,
            version: committedBatch.appliedVersion,
            payload: {
              sheetId: committedBatch.sheetId,
              changeCount: identityCellChanges.length
            }
          })
          this.applyLivePersistedChanges(identityCellChanges, 'batch_ops', 'direct_apply', committedBatch.sheetId)
        }
      }
      this.appliedCommittedBatchKeys.add(dedupeKey)
      if (committedBatch.sheetId === activeSheetId) {
        this.setLastKnownVersion(Math.max(this.lastKnownVersion, committedBatch.appliedVersion))
        this.callbacks.onVersionUpdate(committedBatch.appliedVersion)
      } else {
        this.callbacks.onSheetVersionUpdate?.(committedBatch.sheetId, committedBatch.appliedVersion)
      }
      return true
    }
    return false
  }

  private handleBatchOperations(
    operations: Array<{ type?: string; data?: unknown }>,
    version: number | undefined,
    targetSheetId: string,
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string },
    applyOptions?: { isLocalEcho?: boolean }
  ): void {
    if (
      this.adaptLegacyBatchOperationsToCommittedEnvelope({
        operations,
        version,
        targetSheetId,
        traceMeta,
        isSameUser: applyOptions?.isLocalEcho
      })
    ) {
      return
    }
    const batchIncludesPersistedCellOps = operations.some(op => {
      const opType = typeof op.type === 'string' ? op.type : ''
      if (!LIVE_PERSISTED_CELL_OP_TYPES.has(opType)) return false
      return Boolean(op.data && typeof op.data === 'object')
    })
    const batchIncludesColumnReorder = operations.some(op => {
      const opType = typeof op.type === 'string' ? op.type : ''
      return opType === 'columns_reorder' || opType === 'column_reorder'
    })
    const batchIncludesSetStyle = operations.some(op => {
      const opType = typeof op.type === 'string' ? op.type : ''
      return opType === 'set_style'
    })
    const deferredSetStyleAfterCellBulk: DeferredSetStyleOperation[] = []

    const deltaChanges: DeltaChange[] = []
    let requiresStructuralResync = false
    let requiresColumnResync = false
    let requiresInactiveSheetSnapshotReload = false
    let resyncSheetId: string | null = null
    let liveCellApplyCount = 0
    const columnAddOperations = operations.filter(operation => operation.type === 'column_add')
    const columnDeleteOperations = operations.filter(operation => operation.type === 'column_delete')
    const columnInserts = this.extractInsertColumnSlotsFromOperations(targetSheetId, operations)
    const columnDeletes = this.extractDeleteColumnSlotsFromOperations(targetSheetId, operations)
    const nextColumnsAfterAdds = this.buildNextColumnsFromColumnAddOperations(targetSheetId, operations)
    const nextColumnsAfterDeletes = this.buildNextColumnsFromColumnDeleteOperations(targetSheetId, operations)
    const activeSheetId = this.callbacks.getActiveSheetId()
    const shouldApplyColumnAddMetadata = columnAddOperations.length > 0 && targetSheetId !== activeSheetId
    const shouldApplyColumnDeleteMetadata = columnDeleteOperations.length > 0 && targetSheetId !== activeSheetId
    if (shouldApplyColumnAddMetadata) {
      this.applyRemoteColumnAddsFromOperations(targetSheetId, columnAddOperations, {
        skipActiveGridSync: false
      })
    }
    if (shouldApplyColumnDeleteMetadata) {
      this.applyRemoteColumnDeletesFromOperations(targetSheetId, columnDeleteOperations, {
        skipActiveGridSync: false
      })
    }

    for (const operation of operations) {
      const type = typeof operation.type === 'string' ? operation.type : ''
      if (!type) continue

      if (type === 'row_update') {
        this.handleRowUpdate(operation.data, this.getSheetIdFromData(operation.data) ?? targetSheetId)
        continue
      }

      if (LIVE_ROW_STRUCTURAL_OP_TYPES.has(type)) {
        const operationSheetId = this.getSheetIdFromData(operation.data) ?? targetSheetId
        if (
          this.applyLiveRowStructuralOperation(type, operation.data, operationSheetId, traceMeta, version, applyOptions)
        ) {
          continue
        }
      }

      if (LIVE_STRUCTURAL_OP_TYPES.has(type)) {
        const operationSheetId = this.getSheetIdFromData(operation.data) ?? targetSheetId
        resyncSheetId = operationSheetId
        if (operationSheetId === this.callbacks.getActiveSheetId()) {
          requiresStructuralResync = true
        } else {
          requiresInactiveSheetSnapshotReload = true
        }
        continue
      }

      if (COLUMN_STRUCTURAL_OP_TYPES.has(type)) {
        const operationSheetId = this.getSheetIdFromData(operation.data) ?? targetSheetId
        const isColumnReorder = type === 'columns_reorder' || type === 'column_reorder'
        const hasFullColumnReorderPayload = isColumnReorder && hasFullColumnObjectsForRemoteReorder(operation.data)
        if (hasFullColumnReorderPayload) {
          const nextColumns = this.extractColumnsFromReorderData(operation.data)
          const moves = this.extractExplicitColumnReorderMoves(operation.data)
          if (nextColumns) {
            this.applyRemoteColumnReorderLive({
              sheetId: operationSheetId,
              previousColumns: this.getColumnsForSheet(operationSheetId),
              nextColumns,
              ...(moves ? { moves } : {}),
              expectDeferredStyleReplay: batchIncludesColumnReorder && batchIncludesSetStyle,
              traceMeta,
              isLocalEcho: applyOptions?.isLocalEcho
            })
            this.markGridMaterializationNeeded(operationSheetId, type)
            this.collabDiag('collab_receive_column_reorder_live_applied', {
              targetSheetId: operationSheetId,
              columnCount: nextColumns.length
            })
            this.traceEvent({
              source: 'client',
              stage: 'client_collab_column_reorder_live_applied',
              traceSessionId: traceMeta?.traceSessionId,
              traceId: traceMeta?.traceId,
              batchId: traceMeta?.batchId,
              operationType: type,
              payload: { targetSheetId: operationSheetId }
            })
            continue
          }
        }
        if (type === 'column_add') {
          this.markGridMaterializationNeeded(operationSheetId, type)
          continue
        }
        if (type === 'column_delete') {
          this.markGridMaterializationNeeded(operationSheetId, type)
          continue
        }
        resyncSheetId = operationSheetId
        if (operationSheetId === this.callbacks.getActiveSheetId()) {
          requiresColumnResync = true
        } else {
          requiresInactiveSheetSnapshotReload = true
        }
        continue
      }

      if (type === 'column_update') {
        this.callbacks.onRemoteColumnUpdate?.((operation.data as Record<string, unknown>) ?? {})
        continue
      }

      if (SPREADSHEET_FEATURE_OP_TYPES.has(type as SpreadsheetFeatureOperationType)) {
        const operationSheetId = this.getSheetIdFromData(operation.data) ?? targetSheetId
        this.applyRemoteSpreadsheetFeatureOperation(
          type as SpreadsheetFeatureOperationType,
          operation.data,
          traceMeta,
          operationSheetId
        )
        continue
      }

      if (SNAPSHOT_DIMENSION_OP_TYPES.has(type)) {
        continue
      }

      if (type === 'set_style') {
        const operationSheetId = this.getSheetIdFromData(operation.data) ?? targetSheetId
        if (batchIncludesPersistedCellOps) {
          deferredSetStyleAfterCellBulk.push({
            data: operation.data,
            traceMeta,
            fallbackSheetId: operationSheetId
          })
          continue
        }
        if (batchIncludesColumnReorder && batchIncludesSetStyle) {
          this.queueDeferredSetStyleForSheet(operationSheetId, {
            data: operation.data,
            traceMeta,
            fallbackSheetId: operationSheetId
          })
          continue
        }
        this.applyRemoteSetStyle(operation.data, traceMeta, operationSheetId)
        continue
      }

      if (type === 'clear_all') {
        const operationSheetId = this.getSheetIdFromData(operation.data) ?? targetSheetId
        this.applyRemoteClearAllRange(operation.data, traceMeta, operationSheetId)
        continue
      }

      if (type === 'clear_format') {
        const operationSheetId = this.getSheetIdFromData(operation.data) ?? targetSheetId
        this.applyRemoteClearFormatRange(operation.data, traceMeta, operationSheetId)
        continue
      }

      if (!LIVE_PERSISTED_CELL_OP_TYPES.has(type)) continue
      if (!operation.data || typeof operation.data !== 'object') continue

      if (type === 'set_range') {
        const cells = (operation.data as { cells?: unknown }).cells
        liveCellApplyCount += Array.isArray(cells) ? cells.length : 0
      } else {
        liveCellApplyCount += 1
      }

      deltaChanges.push({
        operationType: type,
        payload: operation.data as Record<string, unknown>,
        appliedVersion: typeof version === 'number' ? version : this.lastKnownVersion
      })
    }

    const flushDeferredSetStylesFromPasteBatch = () => {
      for (const op of deferredSetStyleAfterCellBulk) {
        this.applyRemoteSetStyle(op.data, op.traceMeta, op.fallbackSheetId)
      }
    }

    if (deltaChanges.length > 0) {
      const afterPersistedGridApply =
        deferredSetStyleAfterCellBulk.length > 0 ? flushDeferredSetStylesFromPasteBatch : undefined
      if (targetSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_sync_grid_large_batch_ops', {
          changeCount: deltaChanges.length,
          liveCellApplyCount,
          targetSheetId,
          inactiveSheet: true
        })
        this.applyLivePersistedChanges(deltaChanges, 'batch_ops', 'direct_apply', targetSheetId, {
          onPersistedGridApplyComplete: afterPersistedGridApply
        })
      } else {
        if (liveCellApplyCount > MAX_LIVE_REMOTE_CELL_APPLY) {
          this.collabDiag('collab_receive_large_direct_apply', {
            changeCount: deltaChanges.length,
            liveCellApplyCount,
            targetSheetId,
            inactiveSheet: false
          })
        }
        this.applyLivePersistedChanges(deltaChanges, 'batch_ops', 'direct_apply', targetSheetId, {
          onPersistedGridApplyComplete: afterPersistedGridApply
        })
      }
    } else if (deferredSetStyleAfterCellBulk.length > 0) {
      flushDeferredSetStylesFromPasteBatch()
    }

    if (columnAddOperations.length > 0) {
      if (columnInserts.length > 0) {
        this.applyRemoteInsertColumnSlotsLive({
          sheetId: targetSheetId,
          inserts: columnInserts,
          nextColumns: nextColumnsAfterAdds ?? undefined,
          traceMeta,
          isLocalEcho: applyOptions?.isLocalEcho
        })
      }
    }
    if (columnDeleteOperations.length > 0) {
      if (columnDeletes.length > 0) {
        this.applyRemoteDeleteColumnSlotsLive({
          sheetId: targetSheetId,
          deletes: columnDeletes,
          nextColumns: nextColumnsAfterDeletes ?? undefined,
          traceMeta,
          isLocalEcho: applyOptions?.isLocalEcho
        })
      }
    }

    this.applyAggregatedRemoteDimensionsFromOperations(operations, targetSheetId)

    if (requiresStructuralResync || requiresColumnResync || requiresInactiveSheetSnapshotReload) {
      let fallbackDetail = 'inactive_sheet_snapshot_reload'
      if (requiresColumnResync) {
        fallbackDetail = 'column_structure'
      } else if (requiresStructuralResync) {
        fallbackDetail = 'structural_operation'
      }
      this.requestSnapshotFallback({
        sheetId: resyncSheetId ?? targetSheetId,
        reason: 'planning_failure',
        immediate: requiresStructuralResync || requiresColumnResync,
        detail: fallbackDetail,
        version: version ?? null
      })
    }
  }

  private flushDeferredSetStyleForSheet(sheetId: string): void {
    const queued = this.deferredSetStyleBySheet.get(sheetId)
    if (!queued || queued.length === 0) return
    this.deferredSetStyleBySheet.delete(sheetId)
    for (const operation of queued) {
      this.applyRemoteSetStyle(operation.data, operation.traceMeta, operation.fallbackSheetId ?? sheetId)
    }
    this.collabDiag('collab_receive_set_style_deferred_flushed', {
      sheetId,
      queuedCount: queued.length
    })
  }

  /**
   * Apply a server-broadcast `set_style` op on the receiver. Registers any
   * inline style defs (so the grid can resolve style ids referenced from
   * style patch `set.s`) and then dispatches each cell through
   * `applyRemoteCellUpdate`.
   */
  private applyRemoteSetStyle(data: unknown, traceMeta?: DiagnosticsTraceMeta, fallbackSheetId?: string): void {
    const d = data as
      | {
          sheetId?: string
          styles?: Record<string, unknown>
          cells?: Array<{
            row?: number
            col?: number
            cellRef?: string
            stylePatch?: SpreadsheetStylePatch
          }>
        }
      | undefined
    const targetSheetId = d?.sheetId ?? fallbackSheetId
    if (!targetSheetId) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'set_style',
        payload: {
          reason: 'set_style_missing_sheet',
          targetSheetId: targetSheetId ?? null
        }
      })
      return
    }
    this.markGridMaterializationNeeded(targetSheetId, 'set_style')
    if (!Array.isArray(d?.cells) || d.cells.length === 0) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'set_style',
        payload: { reason: 'set_style_empty_cells', targetSheetId }
      })
      return
    }

    const incomingStyles = d.styles && typeof d.styles === 'object' && !Array.isArray(d.styles) ? d.styles : undefined

    const styleBulkItems: {
      rowIndex: number
      colIndex: number
      options: ApplyRemoteCellUpdateOptions
    }[] = []
    for (const cell of d.cells) {
      let rowIndex = typeof cell.row === 'number' ? cell.row : undefined
      let colIndex = typeof cell.col === 'number' ? cell.col : undefined
      if ((rowIndex == null || colIndex == null) && typeof cell.cellRef === 'string') {
        const a1 = parseA1Reference(cell.cellRef.trim())
        if (a1) {
          rowIndex = rowIndex ?? a1.row
          colIndex = colIndex ?? a1.col
        }
      }
      if (typeof rowIndex !== 'number' || typeof colIndex !== 'number') continue
      if (rowIndex < 0 || colIndex < 0) continue

      const stylePatch = normalizeStylePatch(cell.stylePatch)
      if (!stylePatch) continue
      const styleIdFromPatch =
        stylePatch.set &&
        typeof stylePatch.set === 'object' &&
        typeof (stylePatch.set as Record<string, unknown>).s === 'string'
          ? String((stylePatch.set as Record<string, unknown>).s)
          : null
      const univerStyles: Record<string, unknown> | null =
        styleIdFromPatch && incomingStyles && incomingStyles[styleIdFromPatch]
          ? { [styleIdFromPatch]: incomingStyles[styleIdFromPatch] }
          : null

      const applyOptions = this.withTargetSheetApplyOptions(targetSheetId, { useSenderA1Row: true })
      styleBulkItems.push({
        rowIndex,
        colIndex,
        options: {
          ...applyOptions,
          stylePatch,
          univerStyles,
          diagnosticTraceSessionId: traceMeta?.traceSessionId,
          diagnosticTraceId: traceMeta?.traceId,
          diagnosticBatchId: traceMeta?.batchId,
          diagnosticOperationType: 'set_style'
        }
      })
    }

    if (
      styleBulkItems.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH &&
      this.callbacks.applyRemoteCellUpdatesBulk
    ) {
      this.callbacks.applyRemoteCellUpdatesBulk(
        styleBulkItems.map(entry => ({
          rowIndex: entry.rowIndex,
          colIndex: entry.colIndex,
          value: undefined,
          options: entry.options
        })),
        {
          traceSessionId: traceMeta?.traceSessionId,
          traceId: traceMeta?.traceId,
          batchId: traceMeta?.batchId,
          operationType: 'set_style'
        }
      )
    } else {
      for (const entry of styleBulkItems) {
        this.callbacks.applyRemoteCellUpdate(entry.rowIndex, entry.colIndex, undefined, undefined, entry.options)
      }
    }

    this.collabDiag('collab_receive_set_style', {
      cellCount: d.cells.length,
      hasStyles: incomingStyles ? Object.keys(incomingStyles).length : 0
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_set_style_applied',
      traceSessionId: traceMeta?.traceSessionId,
      traceId: traceMeta?.traceId,
      batchId: traceMeta?.batchId,
      operationType: 'set_style',
      payload: {
        cellCount: d.cells.length,
        styleCount: incomingStyles ? Object.keys(incomingStyles).length : 0
      }
    })
  }

  /**
   * Apply a server-broadcast `clear_all` op on the receiver. Prefer the
   * grid-level range callback so we mirror Univer's native clear-all mutation
   * semantics without expanding to per-cell writes. Keep a per-cell fallback
   * for mounts that do not expose the range callback yet.
   */
  private applyRemoteClearAllRange(data: unknown, traceMeta?: DiagnosticsTraceMeta, fallbackSheetId?: string): void {
    const d = data as
      | {
          sheetId?: string
          ranges?: Array<{
            startRow?: number
            endRow?: number
            startColumn?: number
            endColumn?: number
          }>
        }
      | undefined
    const targetSheetId = d?.sheetId ?? fallbackSheetId
    if (!targetSheetId) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'clear_all',
        payload: { reason: 'clear_all_missing_sheet' }
      })
      return
    }
    const rawRanges = Array.isArray(d?.ranges) ? d!.ranges! : []
    const normalizedRanges: Array<{
      startRow: number
      endRow: number
      startColumn: number
      endColumn: number
    }> = []
    for (const range of rawRanges) {
      if (!range || typeof range !== 'object') continue
      const startRow = Number(range.startRow)
      const endRow = Number(range.endRow)
      const startColumn = Number(range.startColumn)
      const endColumn = Number(range.endColumn)
      if (
        !Number.isFinite(startRow) ||
        !Number.isFinite(endRow) ||
        !Number.isFinite(startColumn) ||
        !Number.isFinite(endColumn)
      ) {
        continue
      }
      normalizedRanges.push({
        startRow: Math.max(0, Math.trunc(startRow)),
        endRow: Math.max(Math.max(0, Math.trunc(startRow)), Math.trunc(endRow)),
        startColumn: Math.max(0, Math.trunc(startColumn)),
        endColumn: Math.max(Math.max(0, Math.trunc(startColumn)), Math.trunc(endColumn))
      })
    }
    if (normalizedRanges.length === 0) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'clear_all',
        payload: { reason: 'clear_all_empty_ranges', targetSheetId }
      })
      return
    }
    const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
    const dataRowCount = this.getSheetData(targetSheetId).length
    const dataBounds: ClearAllGridBounds = {
      maxRowIndex: Math.max(0, dataRowCount - 1),
      maxColIndex: Math.max(0, visibleColumns.length - 1)
    }
    const clampedRanges = dedupeClearAllRanges(
      normalizedRanges.map(range => clampClearAllRangeToBounds(range, dataBounds))
    )
    this.markGridMaterializationNeeded(targetSheetId, 'clear_all')

    const cellCount = clampedRanges.reduce((sum, range) => {
      const rowCount = range.endRow - range.startRow + 1
      const colCount = range.endColumn - range.startColumn + 1
      return sum + rowCount * colCount
    }, 0)

    const applyClearAll = this.callbacks.applyRemoteClearAllRange
    if (applyClearAll) {
      applyClearAll(
        { sheetId: targetSheetId, ranges: clampedRanges },
        {
          traceSessionId: traceMeta?.traceSessionId,
          traceId: traceMeta?.traceId,
          batchId: traceMeta?.batchId,
          operationType: 'clear_all'
        }
      )
    } else {
      for (const range of clampedRanges) {
        for (let r = range.startRow; r <= range.endRow; r += 1) {
          for (let c = range.startColumn; c <= range.endColumn; c += 1) {
            const applyOptions: ApplyRemoteCellUpdateOptions = {
              ...this.withTargetSheetApplyOptions(targetSheetId, { useSenderA1Row: true }),
              removeCellEntry: true,
              univerCell: null,
              univerStyles: null,
              diagnosticTraceSessionId: traceMeta?.traceSessionId,
              diagnosticTraceId: traceMeta?.traceId,
              diagnosticBatchId: traceMeta?.batchId,
              diagnosticOperationType: 'clear_all'
            }
            this.callbacks.applyRemoteCellUpdate(r, c, null, undefined, applyOptions)
          }
        }
      }
    }

    this.collabDiag('collab_receive_clear_all', {
      targetSheetId,
      rangeCount: clampedRanges.length,
      cellCount
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_clear_all_applied',
      traceSessionId: traceMeta?.traceSessionId,
      traceId: traceMeta?.traceId,
      batchId: traceMeta?.batchId,
      operationType: 'clear_all',
      payload: {
        targetSheetId,
        rangeCount: clampedRanges.length,
        cellCount
      }
    })
  }

  /**
   * Apply a server-broadcast `clear_format` op on the receiver: hand the
   * normalized ranges to the grid's `applyRemoteClearFormatRange` handle,
   * which dispatches Univer's `set-range-values` MUTATION with `{ s: null }`
   * per cell while remote-update suppression is active. That uses Univer's
   * authoritative formatting-clear pipeline (style ref + inline `bg`/`cl`/
   * `bd`/… are wiped) without resurfacing as another collab op.
   */
  private applyRemoteClearFormatRange(data: unknown, traceMeta?: DiagnosticsTraceMeta, fallbackSheetId?: string): void {
    const d = data as
      | {
          sheetId?: string
          ranges?: Array<{
            startRow?: number
            endRow?: number
            startColumn?: number
            endColumn?: number
          }>
        }
      | undefined
    const targetSheetId = d?.sheetId ?? fallbackSheetId
    if (!targetSheetId) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'clear_format',
        payload: { reason: 'clear_format_missing_sheet' }
      })
      return
    }
    const rawRanges = Array.isArray(d?.ranges) ? d!.ranges! : []
    const normalizedRanges: Array<{
      startRow: number
      endRow: number
      startColumn: number
      endColumn: number
    }> = []
    for (const range of rawRanges) {
      if (!range || typeof range !== 'object') continue
      const startRow = Number(range.startRow)
      const endRow = Number(range.endRow)
      const startColumn = Number(range.startColumn)
      const endColumn = Number(range.endColumn)
      if (
        !Number.isFinite(startRow) ||
        !Number.isFinite(endRow) ||
        !Number.isFinite(startColumn) ||
        !Number.isFinite(endColumn)
      ) {
        continue
      }
      normalizedRanges.push({
        startRow: Math.max(0, Math.trunc(startRow)),
        endRow: Math.max(Math.max(0, Math.trunc(startRow)), Math.trunc(endRow)),
        startColumn: Math.max(0, Math.trunc(startColumn)),
        endColumn: Math.max(Math.max(0, Math.trunc(startColumn)), Math.trunc(endColumn))
      })
    }
    if (normalizedRanges.length === 0) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'clear_format',
        payload: { reason: 'clear_format_empty_ranges', targetSheetId }
      })
      return
    }
    const apply = this.callbacks.applyRemoteClearFormatRange
    if (!apply) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'clear_format',
        payload: { reason: 'clear_format_no_callback', targetSheetId }
      })
      return
    }
    this.markGridMaterializationNeeded(targetSheetId, 'clear_format')
    apply(
      { sheetId: targetSheetId, ranges: normalizedRanges },
      {
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: 'clear_format'
      }
    )

    this.collabDiag('collab_receive_clear_format', {
      targetSheetId,
      rangeCount: normalizedRanges.length
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_clear_format_applied',
      traceSessionId: traceMeta?.traceSessionId,
      traceId: traceMeta?.traceId,
      batchId: traceMeta?.batchId,
      operationType: 'clear_format',
      payload: {
        targetSheetId,
        rangeCount: normalizedRanges.length
      }
    })
  }

  private applyRemoteSpreadsheetFeatureOperation(
    type: SpreadsheetFeatureOperationType,
    data: unknown,
    traceMeta?: DiagnosticsTraceMeta,
    fallbackSheetId?: string
  ): void {
    const payload =
      data && typeof data === 'object' ? ({ ...(data as Record<string, unknown>) } as Record<string, unknown>) : {}
    const targetSheetId =
      typeof payload.sheetId === 'string' && payload.sheetId.trim()
        ? payload.sheetId.trim()
        : (fallbackSheetId ?? this.callbacks.getActiveSheetId())
    if (!targetSheetId) {
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_receive_skipped',
        severity: 'warning',
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: type,
        payload: { reason: 'feature_op_missing_sheet' }
      })
      return
    }

    const dataWithSheetId = { ...payload, sheetId: targetSheetId } as Record<string, unknown>
    if (type === 'visibility_update') {
      this.syncRemoteColumnVisibilityMetadata(targetSheetId, dataWithSheetId)
    }
    this.markGridMaterializationNeeded(targetSheetId, type)
    this.callbacks.applyRemoteSpreadsheetFeatureOperation?.(
      {
        type,
        data: dataWithSheetId as unknown as SpreadsheetFeatureOperationPayload
      },
      {
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: type
      }
    )
    if (!this.callbacks.applyRemoteSpreadsheetFeatureOperation) {
      this.requestSnapshotFallback({
        sheetId: targetSheetId,
        reason: 'live_apply_failure',
        immediate: targetSheetId === this.callbacks.getActiveSheetId(),
        detail: type,
        traceSessionId: traceMeta?.traceSessionId,
        traceId: traceMeta?.traceId,
        batchId: traceMeta?.batchId,
        operationType: type
      })
    }
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_feature_operation_applied',
      traceSessionId: traceMeta?.traceSessionId,
      traceId: traceMeta?.traceId,
      batchId: traceMeta?.batchId,
      operationType: type,
      payload: {
        targetSheetId,
        hasApplyCallback: Boolean(this.callbacks.applyRemoteSpreadsheetFeatureOperation)
      }
    })
  }

  private handleRowUpdate(data: unknown, targetSheetId: string): void {
    const d = data as
      | {
          sheetId?: string
          rowId?: string
          rowData?: Record<string, unknown>
        }
      | undefined
    const sheetId = d?.sheetId ?? targetSheetId
    const activeSheetId = this.callbacks.getActiveSheetId()
    if (!sheetId || !d?.rowId || !d.rowData || typeof d.rowData !== 'object') {
      this.collabDiag('collab_receive_skipped', { reason: 'invalid_row_update' })
      return
    }

    const remoteRowId = String(d.rowId)
    const normalizedUpdates: Record<string, unknown> = {}
    for (const [columnKey, value] of Object.entries(d.rowData)) {
      if (columnKey === '_updatedAt') continue
      normalizedUpdates[this.resolveColumnName(columnKey, sheetId)] = value
    }
    if (Object.keys(normalizedUpdates).length === 0) return

    this.applyDataModelUpdates(new Map([[remoteRowId, normalizedUpdates]]), sheetId, {
      syncGrid: sheetId === activeSheetId,
      authoritativeApplyMeta:
        sheetId === activeSheetId
          ? {
              operationType: 'row_update'
            }
          : null
    })
  }

  private applyLivePersistedChanges(
    changes: DeltaChange[],
    source: 'batch_ops' | 'single_op',
    mode: 'direct_apply' | 'sync_grid_only' = 'direct_apply',
    targetSheetId = this.callbacks.getActiveSheetId(),
    hooks?: { onPersistedGridApplyComplete?: () => void }
  ): void {
    if (changes.length === 0) return
    this.markGridMaterializationNeeded(targetSheetId, source)
    this.applyDeltaChanges(changes, targetSheetId, mode, hooks)
    this.collabDiag('collab_receive_persisted_ops', {
      source,
      changeCount: changes.length,
      syncGridOnly: mode === 'sync_grid_only',
      targetSheetId
    })
  }

  private applyLiveRowStructuralOperation(
    operationType: string,
    data: unknown,
    targetSheetId: string,
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string },
    version?: number,
    applyOptions?: { isLocalEcho?: boolean }
  ): boolean {
    if (!targetSheetId || !data || typeof data !== 'object') return false
    const payload = data as Record<string, unknown>
    const activeSheetId = this.callbacks.getActiveSheetId()
    const currentRows = this.getSheetData(targetSheetId)
    let nextRows: ViewerRow[] | null = null
    let rowsToApplyToGrid: ViewerRow[] = []
    let dirtyRegion: AuthoritativeGridRegion | null = null

    if (operationType === 'add_rows') {
      const createdRows = mapCreatedRowsFromWireRows(payload.rows)
      if (createdRows.length === 0) return false
      nextRows = mergeCreatedRows(currentRows, createdRows)
      rowsToApplyToGrid = createdRows
    } else if (operationType === 'insert_rows_at') {
      const createdRows = mapCreatedRowsFromWireRows(payload.rows)
      const insertAt = Number(payload.insertAt)
      if (createdRows.length === 0) return false
      const canonicalCurrentRows = sortRowsByCanonicalVisualOrder(currentRows)
      nextRows = mergeInsertedRowsAtIndex(
        canonicalCurrentRows,
        createdRows,
        Number.isFinite(insertAt) ? insertAt : canonicalCurrentRows.length
      )
      rowsToApplyToGrid = createdRows
      dirtyRegion = this.buildDirtyRegionForInsertedRows(
        targetSheetId,
        nextRows,
        Number.isFinite(insertAt) ? insertAt : canonicalCurrentRows.length
      )
    } else if (operationType === 'insert_row_slots') {
      const createdRows = mapCreatedRowsFromWireRows(payload.rows)
      const startGridRowIndex = Number(payload.startGridRowIndex)
      const count = Number(payload.count)
      nextRows = applyInsertRowSlotsTransform(
        currentRows,
        Number.isFinite(startGridRowIndex) ? startGridRowIndex : currentRows.length,
        Number.isFinite(count) ? count : createdRows.length,
        createdRows
      )
      rowsToApplyToGrid = createdRows
      dirtyRegion = this.buildDirtyRegionForInsertedRows(
        targetSheetId,
        nextRows,
        Number.isFinite(startGridRowIndex) ? startGridRowIndex : currentRows.length
      )
    } else if (operationType === 'row_add') {
      const placeholderRows = rowPlaceholdersFromIds(payload.rowIds)
      if (placeholderRows.length === 0) return false
      nextRows = mergeCreatedRows(currentRows, placeholderRows)
      this.scheduleRowAddHydrationFromDelta(targetSheetId, version, traceMeta)
    } else if (operationType === 'delete_rows' || operationType === 'row_delete') {
      const rowIds = Array.isArray(payload.rowIds)
        ? payload.rowIds.map(rowId => String(rowId || '')).filter(Boolean)
        : []
      if (rowIds.length === 0) return false
      nextRows = currentRows.filter(row => !rowIds.some(rowId => rowMatchesRemoteRowId(row, rowId)))
    } else if (operationType === 'delete_row_slots') {
      const startGridRowIndex = Number(payload.startGridRowIndex)
      const count = Number(payload.count)
      nextRows = applyDeleteRowSlotsTransform(
        currentRows,
        Number.isFinite(startGridRowIndex) ? startGridRowIndex : 0,
        Number.isFinite(count) ? count : 0
      )
    } else if (operationType === 'move_row_slots') {
      const sourceStartGridRowIndex = Number(payload.sourceStartGridRowIndex)
      const destinationGridRowIndex = Number(payload.destinationGridRowIndex)
      const count = Number(payload.count)
      nextRows = applyMoveRowSlotsTransform(
        currentRows,
        Number.isFinite(sourceStartGridRowIndex) ? sourceStartGridRowIndex : 0,
        Number.isFinite(count) ? count : 0,
        Number.isFinite(destinationGridRowIndex) ? destinationGridRowIndex : 0
      )
      dirtyRegion = this.buildDirtyRegionForMoveRowSlots(
        targetSheetId,
        Number.isFinite(sourceStartGridRowIndex) ? sourceStartGridRowIndex : 0,
        Number.isFinite(count) ? count : 0,
        Number.isFinite(destinationGridRowIndex) ? destinationGridRowIndex : 0
      )
    } else if (operationType === 'move_cell_range') {
      const parsed = parseMoveCellRangeWirePayload({
        fromRange: payload.fromRange,
        toRange: payload.toRange
      })
      if (parsed) {
        nextRows = applyMoveCellRangeToViewerRows({
          rows: currentRows,
          columns: this.getColumnsForSheet(targetSheetId),
          fromRange: parsed.fromRange,
          toRange: parsed.toRange
        })
        dirtyRegion = this.buildDirtyRegionForCellRangeMove(parsed.fromRange, parsed.toRange)
      }
    }

    if (!nextRows) return false
    const isInsertRowSlots = operationType === 'insert_row_slots'
    const isDeleteRowSlots = operationType === 'delete_row_slots'
    const isMoveCellRange = operationType === 'move_cell_range'
    const isOwnRecentBatch = this.isOwnRecentStructuralBatch(traceMeta)
    this.markGridMaterializationNeeded(targetSheetId, operationType)
    this.commitSheetData(targetSheetId, nextRows, {
      persisted: true,
      syncGrid: isMoveCellRange || isInsertRowSlots || isDeleteRowSlots ? false : targetSheetId === activeSheetId
    })
    const projectorOwnsCreatedRowValues =
      targetSheetId === activeSheetId && (operationType === 'add_rows' || operationType === 'insert_rows_at')
    const structuralInsertOwnsCreatedRowValues =
      targetSheetId === activeSheetId && operationType === 'insert_row_slots' && !isOwnRecentBatch
    const createdRowsApplyResult =
      rowsToApplyToGrid.length > 0 && !projectorOwnsCreatedRowValues && !structuralInsertOwnsCreatedRowValues
        ? this.applyCreatedRowsToGrid(targetSheetId, nextRows, rowsToApplyToGrid)
        : null
    if (targetSheetId === activeSheetId && operationType === 'move_cell_range') {
      const fromRange = normalizeCellRangeRect(payload.fromRange)
      const toRange = normalizeCellRangeRect(payload.toRange)
      if (fromRange && toRange) {
        this.applyRemoteMoveCellRangeLive({
          sheetId: targetSheetId,
          moves: [{ fromRange, toRange }],
          rows: nextRows,
          fallbackRegion: dirtyRegion,
          traceMeta,
          isLocalEcho: applyOptions?.isLocalEcho
        })
      }
    } else if (!isOwnRecentBatch) {
      if (operationType === 'insert_row_slots') {
        const startGridRowIndex = Number(payload.startGridRowIndex)
        const count = Number(payload.count)
        this.applyRemoteInsertRowSlotsLive({
          sheetId: targetSheetId,
          inserts: [
            {
              startGridRowIndex: Number.isFinite(startGridRowIndex) ? startGridRowIndex : 0,
              count: Number.isFinite(count) ? count : 0
            }
          ],
          rows: nextRows,
          createdRows: rowsToApplyToGrid,
          fallbackRegion: dirtyRegion,
          traceMeta,
          isLocalEcho: applyOptions?.isLocalEcho
        })
      } else if (operationType === 'move_row_slots') {
        const sourceStartGridRowIndex = Number(payload.sourceStartGridRowIndex)
        const destinationGridRowIndex = Number(payload.destinationGridRowIndex)
        const count = Number(payload.count)
        this.applyRemoteRowSlotsMovesLive({
          sheetId: targetSheetId,
          moves: [
            {
              sourceStartGridRowIndex: Number.isFinite(sourceStartGridRowIndex) ? sourceStartGridRowIndex : 0,
              count: Number.isFinite(count) ? count : 0,
              destinationGridRowIndex: Number.isFinite(destinationGridRowIndex) ? destinationGridRowIndex : 0
            }
          ],
          rows: nextRows,
          fallbackRegion: dirtyRegion,
          traceMeta,
          isLocalEcho: applyOptions?.isLocalEcho
        })
      } else if (operationType === 'delete_row_slots') {
        const startGridRowIndex = Number(payload.startGridRowIndex)
        const count = Number(payload.count)
        this.applyRemoteDeleteRowSlotsLive({
          sheetId: targetSheetId,
          deletes: [
            {
              startGridRowIndex: Number.isFinite(startGridRowIndex) ? startGridRowIndex : 0,
              count: Number.isFinite(count) ? count : 0
            }
          ],
          rows: nextRows,
          fallbackRegion: dirtyRegion,
          traceMeta,
          isLocalEcho: applyOptions?.isLocalEcho
        })
      } else if (targetSheetId === activeSheetId) {
        // Projector-owned add_rows values already repaint through `syncGrid: true`; keep
        // `forceGridReapply` for insert-at / structural-shift cases, but do not duplicate the
        // plain append path with another bounded reapply.
        const skipForcedReapply =
          operationType === 'add_rows' &&
          createdRowsApplyResult != null &&
          createdRowsApplyResult.visiblePaintConfirmed &&
          createdRowsApplyResult.paintedRegion != null
        if (!skipForcedReapply) {
          const dirty =
            dirtyRegion ??
            (rowsToApplyToGrid.length > 0
              ? this.buildDirtyRegionForCreatedRows(targetSheetId, nextRows, rowsToApplyToGrid)
              : null)
          if (dirty != null) {
            this.callbacks.forceGridReapply?.(targetSheetId, dirty, {
              clearAllSignatures: false,
              preferBulk: true,
              reason: 'row_structure_catchup'
            })
          }
          if (operationType === 'add_rows' && createdRowsApplyResult?.paintStatus === 'filtered_to_zero') {
            this.traceEvent({
              source: 'client',
              stage: 'client_collab_add_rows_bounded_repair_after_zero_visible_paint',
              traceSessionId: traceMeta?.traceSessionId,
              traceId: traceMeta?.traceId,
              batchId: traceMeta?.batchId,
              operationType,
              payload: {
                targetSheetId,
                attemptedCellCount: createdRowsApplyResult.cellsAttempted,
                skippedCellCount: createdRowsApplyResult.skippedCellCount,
                region: createdRowsApplyResult.paintedRegion
              }
            })
          }
        } else {
          this.traceEvent({
            source: 'client',
            stage: 'client_collab_add_rows_skip_forced_reapply',
            traceSessionId: traceMeta?.traceSessionId,
            traceId: traceMeta?.traceId,
            batchId: traceMeta?.batchId,
            operationType,
            payload: {
              targetSheetId,
              cellsPainted: createdRowsApplyResult?.cellsAttempted ?? 0,
              region: createdRowsApplyResult?.paintedRegion ?? null,
              projectorOwnedValues: projectorOwnsCreatedRowValues,
              paintStatus: createdRowsApplyResult?.paintStatus ?? null,
              visiblePaintConfirmed: createdRowsApplyResult?.visiblePaintConfirmed ?? false
            }
          })
        }
      }
    }
    this.collabDiag('collab_receive_row_structure_applied', {
      opType: operationType,
      targetSheetId,
      activeSheet: targetSheetId === activeSheetId,
      rowCount: nextRows.length
    })
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_row_structure_applied',
      traceSessionId: traceMeta?.traceSessionId,
      traceId: traceMeta?.traceId,
      batchId: traceMeta?.batchId,
      operationType,
      payload: {
        targetSheetId,
        activeSheetId,
        rowCount: nextRows.length
      }
    })
    return true
  }

  private scheduleRowAddHydrationFromDelta(
    targetSheetId: string,
    version: number | undefined,
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string }
  ): void {
    const fetcher = this.callbacks.fetchChangesSince
    if (!fetcher || typeof version !== 'number' || !Number.isFinite(version) || version <= 0) return
    const sinceVersion = Math.max(0, Math.trunc(version) - 1)
    void (async () => {
      try {
        const delta = await fetcher(targetSheetId, sinceVersion)
        const addRowChanges = delta.changes.filter(
          change =>
            change.operationType === 'add_rows' ||
            change.operationType === 'insert_rows_at' ||
            change.operationType === 'insert_row_slots'
        )
        if (addRowChanges.length === 0) return
        for (const change of addRowChanges) {
          const createdRows = mapCreatedRowsFromWireRows(change.result?.rows)
          if (createdRows.length === 0) continue
          const currentRows = this.getSheetData(targetSheetId)
          const rawInsertAt = Number(
            change.payload?.insertAt ??
              change.result?.insertAt ??
              change.payload?.startGridRowIndex ??
              change.result?.startGridRowIndex
          )
          const rawCount = Number(change.payload?.count ?? change.result?.count)
          const isInsertAtOp =
            (change.operationType === 'insert_rows_at' || change.operationType === 'insert_row_slots') &&
            Number.isFinite(rawInsertAt)
          const canonicalCurrentRows = isInsertAtOp ? sortRowsByCanonicalVisualOrder(currentRows) : currentRows
          const insertAt = isInsertAtOp ? rawInsertAt : canonicalCurrentRows.length
          const nextRows =
            change.operationType === 'insert_row_slots'
              ? applyInsertRowSlotsTransform(
                  canonicalCurrentRows,
                  insertAt,
                  Number.isFinite(rawCount) ? rawCount : createdRows.length,
                  createdRows
                )
              : isInsertAtOp
                ? mergeInsertedRowsAtIndex(canonicalCurrentRows, createdRows, insertAt)
                : mergeCreatedRows(canonicalCurrentRows, createdRows)
          this.commitSheetData(targetSheetId, nextRows, {
            persisted: true,
            syncGrid: targetSheetId === this.callbacks.getActiveSheetId()
          })
          const hydrationApplyResult = this.applyCreatedRowsToGrid(targetSheetId, nextRows, createdRows)
          if (targetSheetId === this.callbacks.getActiveSheetId()) {
            // Phase 1: same skip-forced-reapply policy for the row_add hydration path when the
            // bulk paint already covered the created rows. `insert_rows_at` keeps the forced
            // reapply because its dirty region also shifts existing rows below the insert point.
            const skipForcedReapply =
              !isInsertAtOp && hydrationApplyResult.visiblePaintConfirmed && hydrationApplyResult.paintedRegion != null
            if (!skipForcedReapply) {
              const dirty = isInsertAtOp
                ? this.buildDirtyRegionForInsertedRows(targetSheetId, nextRows, insertAt)
                : this.buildDirtyRegionForCreatedRows(targetSheetId, nextRows, createdRows)
              if (dirty != null) {
                this.callbacks.forceGridReapply?.(targetSheetId, dirty, {
                  clearAllSignatures: false,
                  preferBulk: true,
                  reason: 'row_add_hydration_catchup'
                })
              }
              if (!isInsertAtOp && hydrationApplyResult.paintStatus === 'filtered_to_zero') {
                this.traceEvent({
                  source: 'client',
                  stage: 'client_collab_row_add_hydration_bounded_repair_after_zero_visible_paint',
                  traceSessionId: traceMeta?.traceSessionId,
                  traceId: traceMeta?.traceId,
                  batchId: traceMeta?.batchId,
                  operationType: 'row_add',
                  payload: {
                    targetSheetId,
                    attemptedCellCount: hydrationApplyResult.cellsAttempted,
                    skippedCellCount: hydrationApplyResult.skippedCellCount,
                    region: hydrationApplyResult.paintedRegion
                  }
                })
              }
            }
          }
        }
        if (delta.currentVersion > 0) {
          if (targetSheetId === this.callbacks.getActiveSheetId()) {
            this.setLastKnownVersion(Math.max(this.lastKnownVersion, delta.currentVersion))
            this.callbacks.onVersionUpdate(delta.currentVersion)
          } else {
            this.callbacks.onSheetVersionUpdate?.(targetSheetId, delta.currentVersion)
          }
        }
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_row_add_hydrated',
          traceSessionId: traceMeta?.traceSessionId,
          traceId: traceMeta?.traceId,
          batchId: traceMeta?.batchId,
          operationType: 'row_add',
          version: delta.currentVersion,
          payload: {
            targetSheetId,
            hydratedChangeCount: addRowChanges.length
          }
        })
      } catch (error) {
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_row_add_hydration_failed',
          severity: 'warning',
          traceSessionId: traceMeta?.traceSessionId,
          traceId: traceMeta?.traceId,
          batchId: traceMeta?.batchId,
          operationType: 'row_add',
          payload: {
            targetSheetId,
            message: error instanceof Error ? error.message : String(error)
          }
        })
      }
    })()
  }

  /**
   * Materialize created-row cell values into Univer via a single bulk paint when possible.
   * Returns `bulkPainted: true` when the fast `applyRemoteCellUpdatesBulk` path ran so callers
   * can skip a redundant `forceGridReapply` over the same region (which would otherwise re-write
   * every cell the bulk already painted because forced reapply ignores signature equality).
   *
   * `paintedRegion` is narrowed to the columns that actually carried a value across `createdRows`
   * (not `0..visibleColumns.length-1`); structure-only `add_rows` therefore degrade to
   * `bulkPainted: false, paintedRegion: null` and the caller can choose its own strategy.
   */
  private applyCreatedRowsToGrid(
    targetSheetId: string,
    allRows: ViewerRow[],
    createdRows: ViewerRow[]
  ): {
    paintStatus: SpreadsheetBulkRemoteApplyResult['status'] | null
    visiblePaintConfirmed: boolean
    paintedRegion: AuthoritativeGridRegion | null
    cellsAttempted: number
    skippedCellCount: number
  } {
    const emptyResult = {
      paintStatus: null,
      visiblePaintConfirmed: false,
      paintedRegion: null,
      cellsAttempted: 0,
      skippedCellCount: 0
    }
    if (createdRows.length === 0) return emptyResult
    const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0) return emptyResult

    // O(n) prepass: one identity index for the whole row set, then O(1) per created row.
    const rowIndexByIdentity = buildViewerRowVisualIndexByIdentity(allRows)
    const items: SpreadsheetBulkRemoteCellItem[] = []
    let minR = Number.POSITIVE_INFINITY
    let maxR = -1
    let minC = Number.POSITIVE_INFINITY
    let maxC = -1
    for (const row of createdRows) {
      const rowIndex = lookupViewerRowVisualIndex(rowIndexByIdentity, row) ?? findViewerRowVisualIndex(allRows, row)
      if (rowIndex == null || rowIndex < 0) continue
      const rowId = getCanonicalRowId(row)
      const applyOptions = this.withTargetSheetApplyOptions(targetSheetId, { useSenderA1Row: true })
      for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
        const column = visibleColumns[colIndex]
        const hasNameValue = Object.prototype.hasOwnProperty.call(row, column.name)
        const hasIdValue = Object.prototype.hasOwnProperty.call(row, column.id)
        if (!hasNameValue && !hasIdValue) continue
        const value = hasNameValue ? row[column.name] : row[column.id]
        items.push({ rowIndex, colIndex, value, rowId, options: applyOptions })
        if (rowIndex < minR) minR = rowIndex
        if (rowIndex > maxR) maxR = rowIndex
        if (colIndex < minC) minC = colIndex
        if (colIndex > maxC) maxC = colIndex
      }
    }
    if (items.length === 0) return emptyResult
    const paintedRegion: AuthoritativeGridRegion | null =
      Number.isFinite(minR) && maxR >= 0 && Number.isFinite(minC) && maxC >= 0
        ? { minRow: minR, maxRow: maxR, minCol: minC, maxCol: maxC }
        : null
    if (items.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH && this.callbacks.applyRemoteCellUpdatesBulk) {
      const bulkApplyResult = this.callbacks.applyRemoteCellUpdatesBulk(items, { operationType: 'add_rows_replay' })
      return {
        paintStatus: bulkApplyResult.status,
        visiblePaintConfirmed: bulkApplyResult.status === 'painted' && bulkApplyResult.paintedCellCount > 0,
        paintedRegion,
        cellsAttempted: items.length,
        skippedCellCount: bulkApplyResult.skippedCellCount
      }
    }
    for (const it of items) {
      if (it.options) {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId, it.options)
      } else {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId)
      }
    }
    return {
      paintStatus: null,
      visiblePaintConfirmed: false,
      paintedRegion,
      cellsAttempted: items.length,
      skippedCellCount: 0
    }
  }

  /**
   * Compute the bounding box for a set of created rows, restricted to columns that actually
   * carry a value on at least one of those rows. Falls back to all visible columns only when
   * none of the created rows have any column payload (true structure-only add_rows).
   */
  private buildDirtyRegionForCreatedRows(
    targetSheetId: string,
    allRows: ViewerRow[],
    createdRows: ViewerRow[]
  ): AuthoritativeGridRegion | null {
    const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0) return null
    const rowIndexByIdentity = buildViewerRowVisualIndexByIdentity(allRows)
    let minR = Number.POSITIVE_INFINITY
    let maxR = -1
    let minC = Number.POSITIVE_INFINITY
    let maxC = -1
    for (const row of createdRows) {
      const rowIndex = lookupViewerRowVisualIndex(rowIndexByIdentity, row) ?? findViewerRowVisualIndex(allRows, row)
      if (rowIndex == null || rowIndex < 0) continue
      if (rowIndex < minR) minR = rowIndex
      if (rowIndex > maxR) maxR = rowIndex
      for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
        const column = visibleColumns[colIndex]
        if (
          !Object.prototype.hasOwnProperty.call(row, column.name) &&
          !Object.prototype.hasOwnProperty.call(row, column.id)
        ) {
          continue
        }
        if (colIndex < minC) minC = colIndex
        if (colIndex > maxC) maxC = colIndex
      }
    }
    if (!Number.isFinite(minR) || maxR < 0) return null
    // Structure-only add_rows: no column carried a value. Caller decides whether to do a
    // full-row authoritative reapply (Phase 2 option A keeps it for now) or skip it.
    const resolvedMinCol = Number.isFinite(minC) && minC >= 0 ? minC : 0
    const resolvedMaxCol = Number.isFinite(maxC) && maxC >= 0 ? maxC : visibleColumns.length - 1
    return {
      minRow: minR,
      maxRow: maxR,
      minCol: resolvedMinCol,
      maxCol: resolvedMaxCol
    }
  }

  private buildDirtyRegionForCellRangeMove(
    fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
    toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  ): AuthoritativeGridRegion {
    return {
      minRow: Math.min(fromRange.startRow, toRange.startRow),
      maxRow: Math.max(fromRange.endRow, toRange.endRow),
      minCol: Math.min(fromRange.startColumn, toRange.startColumn),
      maxCol: Math.max(fromRange.endColumn, toRange.endColumn)
    }
  }

  private buildDirtyRegionForInsertedRows(
    targetSheetId: string,
    allRows: ViewerRow[],
    insertAt: number
  ): AuthoritativeGridRegion | null {
    const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0 || allRows.length === 0) return null
    const minRow = Math.min(Math.max(0, Math.trunc(insertAt)), allRows.length - 1)
    return {
      minRow,
      maxRow: allRows.length - 1,
      minCol: 0,
      maxCol: visibleColumns.length - 1
    }
  }

  // --- Private: Helpers ---

  private nextClientOpId(): string {
    return `collab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }

  private cleanupRecentOutgoingClientOpIds(now = Date.now()): void {
    for (const [clientOpId, expiresAt] of this.recentOutgoingClientOpIds) {
      if (expiresAt <= now) {
        this.recentOutgoingClientOpIds.delete(clientOpId)
      }
    }
  }

  private hasRecentOutgoingClientOpId(clientOpId: string): boolean {
    this.cleanupRecentOutgoingClientOpIds()
    return this.recentOutgoingClientOpIds.has(clientOpId)
  }

  private withClientOpId(op: DocumentOperation): TaggedDocumentOperation {
    const tagged = op as TaggedDocumentOperation
    const shouldTag = tagged.broadcastOnly === true || tagged.type === 'cells_changed'
    if (!shouldTag) return tagged
    const clientOpId = tagged._clientOpId || this.nextClientOpId()
    this.cleanupRecentOutgoingClientOpIds()
    this.recentOutgoingClientOpIds.set(clientOpId, Date.now() + CLIENT_OP_ECHO_TTL_MS)
    return { ...tagged, _clientOpId: clientOpId }
  }

  private enqueueOrSend(op: DocumentOperation): void {
    const taggedOp = this.withClientOpId(op)
    const traceMeta = getDiagnosticsTraceMeta(taggedOp.data)
    if (!this.connected || !this.joined || !this.emitFn) {
      this.pendingOps.push(taggedOp)
      const broadcastOnly = Boolean(taggedOp.broadcastOnly)
      const cellCount =
        taggedOp.type === 'cells_changed' &&
        taggedOp.data &&
        typeof taggedOp.data === 'object' &&
        Array.isArray((taggedOp.data as CellsChangedPayload).cells)
          ? (taggedOp.data as CellsChangedPayload).cells.length
          : undefined
      this.collabDiag('collab_op_queued_offline', {
        opType: taggedOp.type,
        pendingLen: this.pendingOps.length,
        broadcastOnly,
        connected: this.connected,
        joined: this.joined,
        cellCount
      })
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_op_queued',
        traceSessionId: traceMeta.traceSessionId,
        traceId: traceMeta.traceId,
        batchId: traceMeta.batchId,
        operationType: op.type,
        payload: {
          pendingLen: this.pendingOps.length,
          connected: this.connected,
          joined: this.joined
        }
      })
      if (this.pendingOps.length > MAX_PENDING_OPS) {
        const dropped = this.pendingOps.length - MAX_PENDING_OPS
        this.pendingOps = this.pendingOps.slice(-MAX_PENDING_OPS)
        this.callbacks.onPendingQueueTrimmed?.(dropped)
        this.callbacks.onCollabDiagnostic?.('pending_ops_trim', { dropped })
      }
      return
    }
    if (taggedOp.type === 'cells_changed' && taggedOp.data && typeof taggedOp.data === 'object') {
      const cells = (taggedOp.data as CellsChangedPayload).cells
      const cellCount = Array.isArray(cells) ? cells.length : 0
      const withA1Ref = Array.isArray(cells)
        ? cells.filter(c => typeof c?.cellRef === 'string' && String(c.cellRef).trim().length > 0).length
        : 0
      this.collabDiag('collab_op_send_immediate', {
        opType: taggedOp.type,
        broadcastOnly: Boolean(taggedOp.broadcastOnly),
        cellCount,
        withA1Ref
      })
    } else {
      this.collabDiag('collab_op_send_immediate', { opType: taggedOp.type })
    }
    this.traceEvent({
      source: 'client',
      stage: 'client_collab_op_sent',
      traceSessionId: traceMeta.traceSessionId,
      traceId: traceMeta.traceId,
      batchId: traceMeta.batchId,
      operationType: taggedOp.type,
      payload: {
        connected: this.connected,
        joined: this.joined
      }
    })
    this.emitFn(taggedOp)
  }

  private flushPendingOps(): void {
    if (!this.emitFn) return
    const ops = this.pendingOps
    this.pendingOps = []
    if (ops.length > 0) {
      this.collabDiag('collab_pending_flush', { opCount: ops.length })
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_pending_flush',
        payload: {
          opCount: ops.length
        }
      })
    }
    ops.forEach(op => this.emitFn!(op))

    if (this.pendingCursor && this.emitCursorFn) {
      const cursor = this.pendingCursor
      this.pendingCursor = null
      this.emitCursorFn(cursor)
    }
  }

  private getSheetIdFromData(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined
    const d = data as Record<string, unknown>
    return typeof d.sheetId === 'string' ? d.sheetId : undefined
  }

  private getKnownSheetVersion(sheetId: string): number | null {
    const callbackVersion = this.callbacks.getSheetVersion?.(sheetId)
    const normalizedCallbackVersion =
      typeof callbackVersion === 'number' && Number.isFinite(callbackVersion) ? Math.trunc(callbackVersion) : null
    if (sheetId === this.callbacks.getActiveSheetId()) {
      return normalizedCallbackVersion ?? this.lastKnownVersion
    }
    return normalizedCallbackVersion
  }

  private updateVersion(data: unknown, version: number | undefined): void {
    const activeSheetId = this.callbacks.getActiveSheetId()
    const opSheetId = this.getSheetIdFromData(data)
    if (!opSheetId) return
    if (typeof version === 'number' && Number.isFinite(version) && version >= 0) {
      const normalizedVersion = Math.trunc(version)
      if (opSheetId === activeSheetId) {
        this.setLastKnownVersion(Math.max(this.lastKnownVersion, normalizedVersion))
        this.callbacks.onVersionUpdate(normalizedVersion)
        return
      }
      this.callbacks.onSheetVersionUpdate?.(opSheetId, normalizedVersion)
    } else {
      if (opSheetId === activeSheetId) {
        this.callbacks.scheduleSheetVersionRefreshFromApi()
      }
    }
  }

  // Delta reconciliation: on reconnect, fetch missed operations and apply or full-resync.
  private async reconcileOnReconnect(): Promise<void> {
    const fetcher = this.callbacks.fetchChangesSince
    if (!fetcher || this.lastKnownVersion <= 0 || this.reconciling) return

    const sheetId = this.callbacks.getActiveSheetId()
    if (!sheetId) return

    this.reconciling = true
    try {
      const delta = await fetcher(sheetId, this.lastKnownVersion)

      if (delta.currentVersion <= this.lastKnownVersion) return

      if (sheetDeltaRequiresFullSnapshot(this.lastKnownVersion, delta)) {
        console.warn('[CollabManager] Delta gap too large or log compacted, triggering full resync')
        this.callbacks.onCollabDiagnostic?.('delta_requires_snapshot', {
          requiresSnapshot: delta.requiresSnapshot,
          changeCount: delta.changes.length
        })
        this.requestSnapshotFallback({
          reason: delta.requiresSnapshot ? 'requires_snapshot' : 'version_gap',
          immediate: true,
          detail: 'reconnect_replay_requires_snapshot',
          version: delta.currentVersion
        })
        this.setLastKnownVersion(delta.currentVersion)
        this.callbacks.onVersionUpdate(delta.currentVersion)
        return
      }

      this.replayDeltaChanges(delta.changes, delta.currentVersion, sheetId)
      console.debug('[CollabManager] Reconciled', delta.changes.length, 'ops, version now', delta.currentVersion)
    } catch (error) {
      console.warn('[CollabManager] Delta reconciliation failed, falling back to full resync', error)
      this.requestSnapshotFallback({
        sheetId,
        reason: 'live_apply_failure',
        detail: error instanceof Error ? error.message : String(error)
      })
    } finally {
      this.reconciling = false
    }
  }

  private operationFromDeltaChange(
    change: DeltaChange,
    sheetId: string
  ): { type: string; data: Record<string, unknown> } {
    const payload = { sheetId, ...(change.payload ?? {}) }
    if (change.operationType === 'add_rows') {
      const rows = Array.isArray(change.result?.rows) ? change.result.rows : []
      return {
        type: 'add_rows',
        data: {
          sheetId,
          rows,
          rowIds: rows
            .map(row => (row && typeof row === 'object' ? String((row as { id?: unknown }).id ?? '') : ''))
            .filter(Boolean)
        }
      }
    }
    if (change.operationType === 'insert_rows_at') {
      const rows = Array.isArray(change.result?.rows) ? change.result.rows : []
      const insertAt = Number(change.payload?.insertAt ?? change.result?.insertAt ?? rows.length)
      return {
        type: 'insert_rows_at',
        data: {
          sheetId,
          insertAt: Number.isFinite(insertAt) ? insertAt : rows.length,
          rows,
          rowIds: rows
            .map(row => (row && typeof row === 'object' ? String((row as { id?: unknown }).id ?? '') : ''))
            .filter(Boolean)
        }
      }
    }
    if (change.operationType === 'insert_row_slots') {
      const rows = Array.isArray(change.result?.rows) ? change.result.rows : []
      const startGridRowIndex = Number(
        change.payload?.startGridRowIndex ?? change.result?.startGridRowIndex ?? rows.length
      )
      const count = Number(change.payload?.count ?? change.result?.count ?? rows.length)
      return {
        type: 'insert_row_slots',
        data: {
          sheetId,
          startGridRowIndex: Number.isFinite(startGridRowIndex) ? startGridRowIndex : rows.length,
          count: Number.isFinite(count) ? count : rows.length,
          rows,
          rowIds: rows
            .map(row => (row && typeof row === 'object' ? String((row as { id?: unknown }).id ?? '') : ''))
            .filter(Boolean)
        }
      }
    }
    if (change.operationType === 'delete_rows') {
      return {
        type: 'row_delete',
        data: {
          sheetId,
          rowIds: Array.isArray(change.payload?.rowIds) ? change.payload.rowIds : []
        }
      }
    }
    if (change.operationType === 'delete_row_slots') {
      return {
        type: 'delete_row_slots',
        data: {
          sheetId,
          startGridRowIndex: Number(change.payload?.startGridRowIndex ?? 0),
          count: Number(change.payload?.count ?? 0),
          rowIds: Array.isArray(change.result?.deletedRowIds) ? change.result?.deletedRowIds : []
        }
      }
    }
    if (change.operationType === 'move_row_slots') {
      return {
        type: 'move_row_slots',
        data: {
          sheetId,
          sourceStartGridRowIndex: Number(change.payload?.sourceStartGridRowIndex ?? 0),
          destinationGridRowIndex: Number(change.payload?.destinationGridRowIndex ?? 0),
          count: Number(change.payload?.count ?? 0),
          rowIds: Array.isArray(change.result?.movedRowIds) ? change.result?.movedRowIds : []
        }
      }
    }
    return {
      type: change.operationType,
      data: payload
    }
  }

  /**
   * Translates persisted cell ops into the collaboration manager’s data model and optional grid sync.
   * Not related to {@link SpreadsheetSession.applyDeltaChanges} (session core); naming overlap is historical.
   */
  private applyDeltaChanges(
    changes: DeltaChange[],
    targetSheetId: string,
    mode: 'direct_apply' | 'sync_grid_only' = 'direct_apply',
    hooks?: { onPersistedGridApplyComplete?: () => void }
  ): void {
    const finishPersistedGridApply = () => {
      hooks?.onPersistedGridApplyComplete?.()
    }

    const updatesByRowId = new Map<string, Record<string, unknown>>()
    const columnsByName = new Map(
      this.getColumnsForSheet(targetSheetId).flatMap(column =>
        [column.name, column.id, column.label]
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
          .map(key => [key, column] as const)
      )
    )

    for (const change of changes) {
      if (!CELL_OP_TYPES.has(change.operationType)) continue
      const payload = change.payload

      if (change.operationType === 'set_cell') {
        const rowId = String(payload.rowId ?? '')
        const column = String(payload.columnName ?? payload.column ?? '')
        if (!rowId || !column) continue
        const targetColumnName = this.resolveColumnName(column, targetSheetId)
        const targetColumn = columnsByName.get(column) ?? columnsByName.get(targetColumnName)
        const existing = updatesByRowId.get(rowId) ?? {}
        existing[targetColumnName] = normalizeCellValueForBatchPersistence(payload.value, targetColumn)
        updatesByRowId.set(rowId, existing)
      } else if (change.operationType === 'clear_cell') {
        const rowId = String(payload.rowId ?? '')
        const column = String(payload.columnName ?? payload.column ?? '')
        if (!rowId || !column) continue
        const targetColumnName = this.resolveColumnName(column, targetSheetId)
        const existing = updatesByRowId.get(rowId) ?? {}
        existing[targetColumnName] = null
        updatesByRowId.set(rowId, existing)
      } else if (change.operationType === 'set_range' || change.operationType === 'cells_changed') {
        const cells = payload.cells as
          | Array<{
              rowId?: string
              columnName?: string
              column?: string
              value?: unknown
              cellRef?: string
              row?: number
              col?: number
              rowIndex?: number
              colIndex?: number
            }>
          | undefined
        if (!Array.isArray(cells)) continue
        for (const cell of cells) {
          const rowId = String(cell.rowId ?? '')
          const column = String(cell.columnName ?? cell.column ?? '')
          if (!rowId || !column) continue
          const targetColumnName = this.resolveColumnName(column, targetSheetId)
          const targetColumn = columnsByName.get(column) ?? columnsByName.get(targetColumnName)
          const existing = updatesByRowId.get(rowId) ?? {}
          let wireValue: unknown
          if (change.operationType === 'set_range') {
            wireValue = Object.prototype.hasOwnProperty.call(cell, 'value') ? cell.value : null
            existing[targetColumnName] = normalizeCellValueForBatchPersistence(wireValue, targetColumn)
          } else if (Object.prototype.hasOwnProperty.call(cell, 'value')) {
            wireValue = cell.value
            existing[targetColumnName] = normalizeCellValueForBatchPersistence(cell.value, targetColumn)
          } else {
            continue
          }
          updatesByRowId.set(rowId, existing)
        }
      }
    }

    if (updatesByRowId.size === 0) {
      finishPersistedGridApply()
      return
    }
    this.markGridMaterializationNeeded(targetSheetId, 'cell_delta')

    const shouldSyncGridFromCommit = targetSheetId === this.callbacks.getActiveSheetId()
    const acknowledgedCellKeys = this.collectAcknowledgedCellKeysFromPersistedChanges(changes)
    const authoritativeApplyMeta: SpreadsheetBulkRemoteApplyMeta | null =
      shouldSyncGridFromCommit && mode === 'direct_apply'
        ? {
            operationType: changes[0]?.operationType ?? 'cell_delta',
            ...(acknowledgedCellKeys.length > 0 ? { acknowledgedCellKeys } : {}),
            onApplyComplete: finishPersistedGridApply
          }
        : null
    const applyResult = this.applyDataModelUpdates(updatesByRowId, targetSheetId, {
      syncGrid: shouldSyncGridFromCommit,
      authoritativeApplyMeta
    })
    if (applyResult.matchedRowCount < applyResult.requestedRowCount) {
      const appliedVersions = changes.map(change => change.appliedVersion).filter(Number.isFinite)
      const incomingVersion = appliedVersions.length > 0 ? Math.max(...appliedVersions) : null
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_value_apply_incomplete',
        severity: 'warning',
        operationType: changes[0]?.operationType,
        version: incomingVersion,
        payload: {
          targetSheetId,
          mode,
          requestedRowCount: applyResult.requestedRowCount,
          matchedRowCount: applyResult.matchedRowCount,
          changedKeyCount: applyResult.changedKeys.size,
          reason: 'row_identity_mismatch'
        }
      })
      const isActiveSheet = targetSheetId === this.callbacks.getActiveSheetId()
      if (!isActiveSheet && this.callbacks.requestSheetCatchUp && incomingVersion != null) {
        this.callbacks.requestSheetCatchUp(targetSheetId, 'row_identity_mismatch', {
          sinceVersion: 0,
          incomingVersion
        })
      } else {
        this.requestSnapshotFallback({
          sheetId: targetSheetId,
          reason: 'live_apply_failure',
          immediate: isActiveSheet,
          detail: 'row_identity_mismatch',
          operationType: changes[0]?.operationType,
          version: incomingVersion
        })
      }
    }

    if (shouldSyncGridFromCommit) {
      if (mode === 'sync_grid_only' || applyResult.changedKeys.size === 0) {
        finishPersistedGridApply()
      }
      return
    }
    finishPersistedGridApply()
  }

  private getColumnsForSheet(sheetId: string): SpreadsheetColumn[] {
    return this.callbacks.getColumnsForSheet?.(sheetId) ?? this.callbacks.getColumns()
  }

  private getSheetData(sheetId: string): ViewerRow[] {
    return this.callbacks.getSheetData?.(sheetId) ?? this.callbacks.getLocalSheetData()
  }

  private commitSheetData(
    sheetId: string,
    data: ViewerRow[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      suppressAuthoritativeDataSyncToken?: boolean
      sessionDiffProjectionMode?: 'allow' | 'skip'
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
      authoritativeApplyMeta?: SpreadsheetBulkRemoteApplyMeta | null
    }
  ): void {
    if (this.callbacks.commitSheetData) {
      this.callbacks.commitSheetData(sheetId, data, options)
      return
    }
    if (sheetId === this.callbacks.getActiveSheetId()) {
      this.callbacks.commitLocalSheetData(data, options)
    }
  }

  private resolveColumnName(columnKey: string, sheetId = this.callbacks.getActiveSheetId()): string {
    const columns = this.getColumnsForSheet(sheetId)
    return columns.find(c => c.id === columnKey)?.name ?? columns.find(c => c.name === columnKey)?.name ?? columnKey
  }

  private normalizeRowColumnValue(
    row: ViewerRow,
    columnKey: string,
    value: unknown,
    sheetId = this.callbacks.getActiveSheetId()
  ): { nextRow: ViewerRow; changed: boolean } {
    const columns = this.getColumnsForSheet(sheetId)
    const matchedColumn = columns.find(column => column.id === columnKey || column.name === columnKey)
    const targetColumnName = matchedColumn?.name ?? this.resolveColumnName(columnKey, sheetId)
    const aliasKeys = new Set(
      [columnKey, matchedColumn?.id, matchedColumn?.name, targetColumnName]
        .map(entry => (entry == null ? '' : String(entry).trim().toLowerCase()))
        .filter(Boolean)
    )

    let nextRow = row
    let changed = false
    for (const existingKey of Object.keys(nextRow)) {
      if (!aliasKeys.has(existingKey.toLowerCase())) continue
      if (nextRow === row) nextRow = { ...row }
      delete nextRow[existingKey]
      changed = true
    }

    if (nextRow[targetColumnName] !== value) {
      if (nextRow === row) nextRow = { ...row }
      nextRow[targetColumnName] = value
      changed = true
    } else if (!(targetColumnName in nextRow)) {
      if (nextRow === row) nextRow = { ...row }
      nextRow[targetColumnName] = value
      changed = true
    }

    return { nextRow, changed }
  }

  private batchNeedsStructuralGridSync(batch: SpreadsheetCommittedBatchEnvelope): boolean {
    return batch.operations.some(operation => {
      if (operation.type === 'move_cell_range') return false
      if (operation.type === 'columns_reorder' || operation.type === 'column_reorder') return false
      if (operation.type === 'move_row_slots') return false
      if (operation.type === 'insert_row_slots') return false
      if (operation.type === 'delete_row_slots') return false
      if (operation.type === 'column_add') return false
      if (operation.type === 'column_delete') return false
      if (LIVE_ROW_STRUCTURAL_OP_TYPES.has(operation.type)) return true
      if (COLUMN_STRUCTURAL_OP_TYPES.has(operation.type)) return true
      return operation.type === 'clear_all' || operation.type === 'clear_format'
    })
  }

  private extractColumnsFromReorderData(data: unknown): SpreadsheetColumn[] | null {
    if (!hasFullColumnObjectsForRemoteReorder(data)) return null
    const columns = (data as { columns: SpreadsheetColumn[] }).columns
    return [...columns].sort((left, right) => left.order - right.order)
  }

  private extractExplicitColumnReorderMoves(data: unknown): ColumnReorderMove[] | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined
    const payload = data as {
      sourceStartIndex?: unknown
      count?: unknown
      normalizedDestinationIndex?: unknown
      destinationIndex?: unknown
    }
    const sourceStartIndex = Number(payload.sourceStartIndex)
    const count = Number(payload.count)
    const normalizedDestinationIndex = Number(payload.normalizedDestinationIndex)
    const destinationIndex = Number(payload.destinationIndex)
    if (!Number.isFinite(sourceStartIndex) || !Number.isFinite(count)) {
      return undefined
    }
    const destinationStartColumn = Number.isFinite(normalizedDestinationIndex)
      ? normalizedDestinationIndex
      : normalizeColumnMoveDestinationIndex(sourceStartIndex, count, destinationIndex)
    if (!Number.isFinite(destinationStartColumn) || destinationStartColumn == null) {
      return undefined
    }
    return [
      {
        sourceStartColumn: Math.max(0, Math.trunc(sourceStartIndex)),
        count: Math.max(1, Math.trunc(count)),
        destinationStartColumn: Math.max(0, Math.trunc(destinationStartColumn)),
        ...(Number.isFinite(destinationIndex)
          ? { rawDestinationStartColumn: Math.max(0, Math.trunc(destinationIndex)) }
          : {})
      }
    ]
  }

  private extractCommittedBatchVisibleColumnIds(batch: SpreadsheetCommittedBatchEnvelope): string[] {
    if (!Array.isArray(batch.visibleColumnIds)) return []
    return batch.visibleColumnIds.map(columnId => (typeof columnId === 'string' ? columnId.trim() : '')).filter(Boolean)
  }

  private buildColumnsFromCommittedBatchPlacements(
    batch: SpreadsheetCommittedBatchEnvelope,
    previousColumns: SpreadsheetColumn[]
  ): SpreadsheetColumn[] | null {
    const visibleColumnIds = this.extractCommittedBatchVisibleColumnIds(batch)
    const orderedVisibleColumnIds =
      visibleColumnIds.length > 0
        ? visibleColumnIds
        : Object.entries(batch.gridColumnIndexByColumnId ?? {})
            .filter((entry): entry is [string, number] => {
              const [columnId, index] = entry
              return Boolean(columnId) && Number.isFinite(index) && index >= 0
            })
            .sort((left, right) => left[1] - right[1])
            .map(([columnId]) => columnId)

    if (orderedVisibleColumnIds.length === 0) {
      return null
    }

    const sortedPreviousColumns = [...previousColumns].sort((left, right) => left.order - right.order)
    const visiblePreviousColumns = sortedPreviousColumns.filter(column => column.isVisible !== false)
    if (visiblePreviousColumns.length === 0 || visiblePreviousColumns.length !== orderedVisibleColumnIds.length) {
      return null
    }

    const previousVisibleColumnIds = new Set(visiblePreviousColumns.map(column => column.id))
    if (!orderedVisibleColumnIds.every(columnId => previousVisibleColumnIds.has(columnId))) {
      return null
    }

    const visibleColumnsById = new Map(visiblePreviousColumns.map(column => [column.id, column]))
    let nextVisibleColumnIndex = 0
    return sortedPreviousColumns
      .map(column => {
        if (column.isVisible === false) {
          return column
        }
        const nextVisibleColumnId = orderedVisibleColumnIds[nextVisibleColumnIndex]
        nextVisibleColumnIndex += 1
        const nextVisibleColumn = visibleColumnsById.get(nextVisibleColumnId)
        return nextVisibleColumn ?? column
      })
      .map((column, order) => ({ ...column, order }))
  }

  /**
   * Build the native column-reorder contexts for a committed batch.
   *
   * The authoritative batch-level `columns` (derived from the server delta's
   * `result.columns`) are preferred, but they are NOT always present — the
   * server may omit `result.columns` from a catch-up delta. In that case the
   * full column objects still live on the `columns_reorder` operation payload
   * (`operation.data.columns`), so we fall back to those. Without this fallback
   * a peer receiving a reorder through the catch-up path never physically moves
   * the columns, because the reorder context comes back empty.
   */
  private buildColumnReorderContexts(
    batch: SpreadsheetCommittedBatchEnvelope,
    committedBatchColumns: SpreadsheetColumn[] | null
  ): Array<{
    sheetId: string
    previousColumns: SpreadsheetColumn[]
    nextColumns: SpreadsheetColumn[]
    moves?: ColumnReorderMove[]
  }> {
    return batch.operations.flatMap(committedOperation => {
      if (committedOperation.type !== 'columns_reorder' && committedOperation.type !== 'column_reorder') {
        return []
      }
      const operationSheetId = this.getSheetIdFromData(committedOperation.data) ?? batch.sheetId
      const previousColumns = this.getColumnsForSheet(operationSheetId)
      const operationPayloadColumns = this.extractColumnsFromReorderData(committedOperation.data)
      const explicitMoves = this.extractExplicitColumnReorderMoves(committedOperation.data)
      const placementDerivedColumns = this.buildColumnsFromCommittedBatchPlacements(batch, previousColumns)
      const nextColumns = committedBatchColumns ?? operationPayloadColumns ?? placementDerivedColumns
      if (!nextColumns) {
        this.collabDiag('column_reorder_context_missing', {
          sheetId: operationSheetId,
          batchSheetId: batch.sheetId,
          batchId: batch.batchId,
          operationType: committedOperation.type,
          previousColumnCount: previousColumns.length,
          hasBatchColumns: Boolean(committedBatchColumns),
          hasOperationPayloadColumns: Boolean(operationPayloadColumns),
          hasVisibleColumnIds: this.extractCommittedBatchVisibleColumnIds(batch).length > 0,
          hasGridColumnIndexByColumnId: Boolean(batch.gridColumnIndexByColumnId)
        })
        return []
      }
      this.collabDiag('column_reorder_context_built', {
        sheetId: operationSheetId,
        batchSheetId: batch.sheetId,
        batchId: batch.batchId,
        operationType: committedOperation.type,
        previousColumnCount: previousColumns.length,
        nextColumnCount: nextColumns.length,
        usedBatchColumns: Boolean(committedBatchColumns),
        usedOperationPayloadColumns: !committedBatchColumns && Boolean(operationPayloadColumns),
        usedPlacementDerivedColumns:
          !committedBatchColumns && !operationPayloadColumns && Boolean(placementDerivedColumns)
      })
      return [
        {
          sheetId: operationSheetId,
          previousColumns,
          nextColumns,
          ...(explicitMoves ? { moves: explicitMoves } : {})
        }
      ]
    })
  }

  private getCommittedBatchColumns(batch: SpreadsheetCommittedBatchEnvelope): SpreadsheetColumn[] | null {
    if (!Array.isArray(batch.columns) || batch.columns.length === 0) return null
    return [...batch.columns].sort((left, right) => left.order - right.order)
  }

  private isOwnRecentStructuralBatch(traceMeta?: { batchId?: string; tabId?: string }): boolean {
    return (
      Boolean(traceMeta?.batchId) &&
      (this.callbacks.isRecentLocalBatchId?.(traceMeta?.batchId, traceMeta?.tabId) ?? false)
    )
  }

  private buildCommittedBatchApplyTraceMeta(
    batch: SpreadsheetCommittedBatchEnvelope,
    traceMeta?: DiagnosticsTraceMeta
  ): { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string } {
    return {
      traceSessionId: batch.traceSessionId ?? traceMeta?.traceSessionId,
      traceId: batch.traceId ?? traceMeta?.traceId,
      batchId: batch.batchId ?? traceMeta?.batchId,
      tabId: batch.tabId
    }
  }

  private applyCommittedBatchColumnStructure(
    sheetId: string,
    columns: SpreadsheetColumn[],
    options?: { skipGridConversionContextSync?: boolean }
  ): void {
    this.collabDiag('column_authoritative_metadata_applied', {
      sheetId,
      columnCount: columns.length,
      skipGridConversionContextSync: options?.skipGridConversionContextSync ?? false
    })
    this.callbacks.onRemoteColumnUpdate?.({
      sheetId,
      columns,
      ...(options?.skipGridConversionContextSync ? { skipGridConversionContextSync: true } : {})
    })
  }

  private reconcileDuplicateColumnStructuralBatch(params: {
    committedBatch: SpreadsheetCommittedBatchEnvelope
    traceMeta: DiagnosticsTraceMeta
    activeSheetId: string
  }): void {
    const { committedBatch, traceMeta, activeSheetId } = params
    const batchTraceMeta = this.buildCommittedBatchApplyTraceMeta(committedBatch, traceMeta)
    const hasColumnReorder = hasColumnReorderStructuralOperation(committedBatch.operations)
    if (committedBatch.sheetId !== activeSheetId) {
      const committedBatchColumns = this.getCommittedBatchColumns(committedBatch)
      if (committedBatchColumns) {
        this.applyCommittedBatchColumnStructure(committedBatch.sheetId, committedBatchColumns)
      }
      this.traceEvent({
        source: 'client',
        stage: 'client_duplicate_column_structure_reconciled',
        traceSessionId: batchTraceMeta.traceSessionId,
        traceId: batchTraceMeta.traceId,
        batchId: batchTraceMeta.batchId,
        version: committedBatch.appliedVersion,
        payload: {
          sheetId: committedBatch.sheetId,
          strategy: 'inactive_sheet_metadata_only',
          operationTypes: committedBatch.operations.map(operation => operation.type)
        }
      })
      return
    }
    if (hasColumnReorder) {
      const committedBatchColumns = this.getCommittedBatchColumns(committedBatch)
      // Prefer authoritative batch columns; fall back to the reorder operation
      // payload columns so a peer still moves columns when the server delta
      // omitted result.columns.
      const reorderContexts = this.buildColumnReorderContexts(committedBatch, committedBatchColumns)
      if (reorderContexts.length > 0) {
        // Capture the current physical column order BEFORE touching metadata so
        // the native move-cols command can compute the correct slot movement.
        // A bare metadata update + forceGridReapply only repaints cell values
        // (cellCount: 0 for a pure reorder) and never physically moves the
        // columns on a peer, which is why peers saw no visible change. Route
        // through the same native reorder pipeline as the live path so the grid
        // actually moves the columns; applyRemoteColumnReorderLive applies the
        // authoritative metadata after the move and falls back to a full grid
        // reapply when no native handler is available or the move fails.
        for (const reorderContext of reorderContexts) {
          this.applyRemoteColumnReorderLive({
            ...reorderContext,
            traceMeta: batchTraceMeta,
            isLocalEcho: false
          })
        }
        this.traceEvent({
          source: 'client',
          stage: 'client_duplicate_column_structure_reconciled',
          traceSessionId: batchTraceMeta.traceSessionId,
          traceId: batchTraceMeta.traceId,
          batchId: batchTraceMeta.batchId,
          version: committedBatch.appliedVersion,
          payload: {
            sheetId: committedBatch.sheetId,
            strategy: 'native_column_reorder',
            operationTypes: committedBatch.operations.map(operation => operation.type)
          }
        })
        return
      }
      this.clearConfirmedPhysicalColumnOrder(committedBatch.sheetId)
      this.callbacks.forceGridReapply?.(committedBatch.sheetId, null, {
        allowFullGridReapply: true,
        clearAllSignatures: true,
        preferBulk: true,
        reason: 'duplicate_column_reorder_reconcile'
      })
      this.traceEvent({
        source: 'client',
        stage: 'client_duplicate_column_structure_reconciled',
        traceSessionId: batchTraceMeta.traceSessionId,
        traceId: batchTraceMeta.traceId,
        batchId: batchTraceMeta.batchId,
        version: committedBatch.appliedVersion,
        payload: {
          sheetId: committedBatch.sheetId,
          strategy: 'full_grid_reapply',
          operationTypes: committedBatch.operations.map(operation => operation.type)
        }
      })
      return
    }
    const committedBatchColumns = this.getCommittedBatchColumns(committedBatch)
    if (committedBatchColumns) {
      this.applyCommittedBatchColumnStructure(committedBatch.sheetId, committedBatchColumns, {
        skipGridConversionContextSync: true
      })
    }
    this.traceEvent({
      source: 'client',
      stage: 'client_duplicate_column_structure_reconciled',
      traceSessionId: batchTraceMeta.traceSessionId,
      traceId: batchTraceMeta.traceId,
      batchId: batchTraceMeta.batchId,
      version: committedBatch.appliedVersion,
      payload: {
        sheetId: committedBatch.sheetId,
        strategy: committedBatchColumns ? 'active_sheet_metadata_only' : 'active_sheet_noop',
        operationTypes: committedBatch.operations.map(operation => operation.type)
      }
    })
  }

  private applyCommittedBatchStructuralLiveOperations(params: {
    batch: SpreadsheetCommittedBatchEnvelope
    activeSheetId: string
    rows: ViewerRow[]
    dirtyRegions: SpreadsheetDeltaDirtyRegion[]
    traceMeta: DiagnosticsTraceMeta
    isLocalEcho: boolean
    onAfterInsertStructureSettled?: () => void
    preTransactionColumnReorderContexts?: Array<{
      sheetId: string
      previousColumns: SpreadsheetColumn[]
      nextColumns: SpreadsheetColumn[]
    }>
  }): void {
    const batchTraceMeta = this.buildCommittedBatchApplyTraceMeta(params.batch, params.traceMeta)
    const committedBatchColumns = this.getCommittedBatchColumns(params.batch)
    const previousColumnsForStructuralDiff = this.getColumnsForSheet(params.batch.sheetId)
    const authoritativeColumnStructureDiff =
      committedBatchColumns != null
        ? this.deriveAuthoritativeColumnStructureDiff(previousColumnsForStructuralDiff, committedBatchColumns)
        : null
    let preTransactionColumnReorderContexts =
      params.preTransactionColumnReorderContexts ?? this.buildColumnReorderContexts(params.batch, committedBatchColumns)
    if (
      committedBatchColumns &&
      preTransactionColumnReorderContexts.length === 0 &&
      authoritativeColumnStructureDiff?.shouldApplyReorder === true
    ) {
      preTransactionColumnReorderContexts = [
        {
          sheetId: params.batch.sheetId,
          previousColumns: previousColumnsForStructuralDiff,
          nextColumns: committedBatchColumns
        }
      ]
    }
    const insertColumnSlotsFromResults = this.extractInsertColumnSlotsFromBatch(params.batch)
    const deleteColumnSlotsFromResults = this.extractDeleteColumnSlotsFromBatch(params.batch)
    let insertColumnSlotsInserts =
      insertColumnSlotsFromResults.length > 0
        ? insertColumnSlotsFromResults
        : this.extractInsertColumnSlotsFromOperations(params.batch.sheetId, params.batch.operations)
    let deleteColumnSlotsDeletes =
      deleteColumnSlotsFromResults.length > 0
        ? deleteColumnSlotsFromResults
        : this.extractDeleteColumnSlotsFromOperations(params.batch.sheetId, params.batch.operations)
    if (insertColumnSlotsFromResults.length === 0 && insertColumnSlotsInserts.length === 0) {
      insertColumnSlotsInserts = authoritativeColumnStructureDiff?.inserts ?? []
    }
    if (deleteColumnSlotsFromResults.length === 0 && deleteColumnSlotsDeletes.length === 0) {
      deleteColumnSlotsDeletes = authoritativeColumnStructureDiff?.deletes ?? []
    }
    if (
      insertColumnSlotsFromResults.length === 0 &&
      insertColumnSlotsInserts.length > 0 &&
      (params.batch.operations.some(operation => operation.type === 'column_add') ||
        (authoritativeColumnStructureDiff?.inserts.length ?? 0) > 0)
    ) {
      this.collabDiag('column_slot_positions_derived_from_metadata', {
        sheetId: params.batch.sheetId,
        operationType: 'column_add',
        count: insertColumnSlotsInserts.length
      })
    }
    if (
      deleteColumnSlotsFromResults.length === 0 &&
      deleteColumnSlotsDeletes.length > 0 &&
      (params.batch.operations.some(operation => operation.type === 'column_delete') ||
        (authoritativeColumnStructureDiff?.deletes.length ?? 0) > 0)
    ) {
      this.collabDiag('column_slot_positions_derived_from_metadata', {
        sheetId: params.batch.sheetId,
        operationType: 'column_delete',
        count: deleteColumnSlotsDeletes.length
      })
    }
    const moveRowSlotsMoves = params.batch.operations
      .map(operation => (operation.type === 'move_row_slots' ? this.extractMoveRowSlotsFromData(operation.data) : null))
      .filter((move): move is NonNullable<typeof move> => move != null)
    const insertRowSlotsInserts = params.batch.operations
      .map(operation =>
        operation.type === 'insert_row_slots' ? this.extractInsertRowSlotsFromData(operation.data) : null
      )
      .filter((insert): insert is NonNullable<typeof insert> => insert != null)
    const deleteRowSlotsDeletes = params.batch.operations
      .map(operation =>
        operation.type === 'delete_row_slots' ? this.extractDeleteRowSlotsFromData(operation.data) : null
      )
      .filter((deleteSlots): deleteSlots is NonNullable<typeof deleteSlots> => deleteSlots != null)
      .sort((left, right) => right.startGridRowIndex - left.startGridRowIndex)
    const moveCellRangeMoves = params.batch.operations
      .map(operation =>
        operation.type === 'move_cell_range' ? this.extractMoveCellRangeFromData(operation.data) : null
      )
      .filter((move): move is NonNullable<typeof move> => move != null)
    if (committedBatchColumns && preTransactionColumnReorderContexts.length === 0) {
      this.applyCommittedBatchColumnStructure(params.batch.sheetId, committedBatchColumns, {
        skipGridConversionContextSync: params.batch.sheetId === params.activeSheetId
      })
    }
    this.collabDiag('column_reorder_contexts_ready_for_live_apply', {
      sheetId: params.batch.sheetId,
      batchId: params.batch.batchId,
      activeSheetId: params.activeSheetId,
      isActiveSheet: params.batch.sheetId === params.activeSheetId,
      contextCount: preTransactionColumnReorderContexts.length,
      hasCommittedBatchColumns: Boolean(committedBatchColumns),
      operationTypes: params.batch.operations.map(operation => operation.type).join(',')
    })
    for (const reorderContext of preTransactionColumnReorderContexts) {
      this.applyRemoteColumnReorderLive({
        ...reorderContext,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
    this.applyAggregatedRemoteDimensionsFromOperations(params.batch.operations, params.batch.sheetId)
    if (params.batch.sheetId === params.activeSheetId && insertRowSlotsInserts.length > 0) {
      this.applyRemoteInsertRowSlotsLive({
        sheetId: params.batch.sheetId,
        inserts: insertRowSlotsInserts,
        rows: params.rows,
        dirtyRegions: params.dirtyRegions,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho,
        onAfterGridSettled: params.onAfterInsertStructureSettled
      })
    }
    if (params.batch.sheetId === params.activeSheetId && deleteRowSlotsDeletes.length > 0) {
      this.applyRemoteDeleteRowSlotsLive({
        sheetId: params.batch.sheetId,
        deletes: deleteRowSlotsDeletes,
        rows: params.rows,
        dirtyRegions: params.dirtyRegions,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
    if (params.batch.sheetId === params.activeSheetId && moveRowSlotsMoves.length > 0) {
      this.applyRemoteRowSlotsMovesLive({
        sheetId: params.batch.sheetId,
        moves: moveRowSlotsMoves,
        rows: params.rows,
        dirtyRegions: params.dirtyRegions,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
    if (params.batch.sheetId === params.activeSheetId && insertColumnSlotsInserts.length > 0) {
      this.applyRemoteInsertColumnSlotsLive({
        sheetId: params.batch.sheetId,
        inserts: insertColumnSlotsInserts,
        nextColumns: committedBatchColumns ?? undefined,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
    if (params.batch.sheetId === params.activeSheetId && deleteColumnSlotsDeletes.length > 0) {
      this.applyRemoteDeleteColumnSlotsLive({
        sheetId: params.batch.sheetId,
        deletes: deleteColumnSlotsDeletes,
        nextColumns: committedBatchColumns ?? undefined,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
    if (params.batch.sheetId === params.activeSheetId && moveCellRangeMoves.length > 0) {
      this.applyRemoteMoveCellRangeLive({
        sheetId: params.batch.sheetId,
        moves: moveCellRangeMoves,
        rows: params.rows,
        dirtyRegions: params.dirtyRegions,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
    const visibilityUpdates = this.extractVisibilityUpdatesFromOperations(params.batch.operations)
    if (visibilityUpdates.length > 0) {
      this.applyRemoteVisibilityUpdatesLive({
        sheetId: params.batch.sheetId,
        updates: visibilityUpdates,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
    const freezePanesUpdates = this.extractFreezePanesFromOperations(params.batch.operations)
    if (freezePanesUpdates.length > 0) {
      this.applyRemoteFreezePanesLive({
        sheetId: params.batch.sheetId,
        updates: freezePanesUpdates,
        traceMeta: batchTraceMeta,
        isLocalEcho: params.isLocalEcho
      })
    }
  }

  private deriveAuthoritativeColumnStructureDiff(
    previousColumns: SpreadsheetColumn[],
    nextColumns: SpreadsheetColumn[]
  ): {
    inserts: Array<{ startGridColumnIndex: number; count: number }>
    deletes: Array<{ startGridColumnIndex: number; count: number }>
    shouldApplyReorder: boolean
  } {
    const previousIds = new Set(previousColumns.map(column => column.id))
    const nextIds = new Set(nextColumns.map(column => column.id))
    const insertedColumns = nextColumns.filter(column => !previousIds.has(column.id))
    const deletedColumnIds = previousColumns.filter(column => !nextIds.has(column.id)).map(column => column.id)
    const inserts = this.deriveInsertColumnSlotsFromColumnDiff(previousColumns, insertedColumns)
    const deletes = this.deriveDeleteColumnSlotsFromColumnDiff(previousColumns, deletedColumnIds)
    return {
      inserts,
      deletes,
      shouldApplyReorder:
        inserts.length === 0 && deletes.length === 0 && this.haveVisibleColumnsChanged(previousColumns, nextColumns)
    }
  }

  private deriveInsertColumnSlotsFromColumnDiff(
    previousColumns: SpreadsheetColumn[],
    insertedColumns: SpreadsheetColumn[]
  ): Array<{ startGridColumnIndex: number; count: number }> {
    if (insertedColumns.length === 0) return []
    const sortedInsertedColumns = [...insertedColumns].sort((left, right) => left.order - right.order)
    const contiguousInsert = extractContiguousColumnSlotInsert(previousColumns, sortedInsertedColumns)
    if (contiguousInsert) {
      return coalesceAdjacentColumnSlotInserts([contiguousInsert])
    }
    let workingColumns = previousColumns
    const inserts: Array<{ startGridColumnIndex: number; count: number }> = []
    for (const column of sortedInsertedColumns) {
      const nextWorkingColumns = mergeRemoteColumnAdd(workingColumns, column)
      inserts.push({
        startGridColumnIndex: visibleGridColumnIndexFromColumn(nextWorkingColumns, column),
        count: 1
      })
      workingColumns = nextWorkingColumns
    }
    return coalesceAdjacentColumnSlotInserts(inserts)
  }

  private deriveDeleteColumnSlotsFromColumnDiff(
    previousColumns: SpreadsheetColumn[],
    deletedColumnIds: string[]
  ): Array<{ startGridColumnIndex: number; count: number }> {
    if (deletedColumnIds.length === 0) return []
    const contiguousDelete = extractContiguousColumnSlotDelete(previousColumns, deletedColumnIds)
    if (contiguousDelete) {
      return coalesceAdjacentColumnSlotDeletes([contiguousDelete])
    }
    let workingColumns = previousColumns
    const deletes: Array<{ startGridColumnIndex: number; count: number }> = []
    for (const columnId of deletedColumnIds) {
      const column = workingColumns.find(entry => entry.id === columnId)
      if (!column) continue
      deletes.push({
        startGridColumnIndex: visibleGridColumnIndexFromColumn(workingColumns, column),
        count: 1
      })
      workingColumns = workingColumns.filter(entry => entry.id !== columnId)
    }
    return coalesceAdjacentColumnSlotDeletes(deletes).sort(
      (left, right) => right.startGridColumnIndex - left.startGridColumnIndex
    )
  }

  private haveVisibleColumnsChanged(previousColumns: SpreadsheetColumn[], nextColumns: SpreadsheetColumn[]): boolean {
    const previousVisibleIds = visibleColumnsInGridOrder(previousColumns).map(column => column.id)
    const nextVisibleIds = visibleColumnsInGridOrder(nextColumns).map(column => column.id)
    if (previousVisibleIds.length !== nextVisibleIds.length) return true
    return previousVisibleIds.some((columnId, index) => columnId !== nextVisibleIds[index])
  }

  private extractInsertColumnSlotFromData(
    data: unknown,
    columns: SpreadsheetColumn[]
  ): { startGridColumnIndex: number; count: number } | null {
    if (!data || typeof data !== 'object') return null
    const payload = data as { column?: SpreadsheetColumn }
    const column = payload.column
    if (!column || typeof column.id !== 'string') return null
    return {
      startGridColumnIndex: visibleGridColumnIndexFromColumn(columns, column),
      count: 1
    }
  }

  private extractInsertColumnSlotsFromBatch(
    batch: SpreadsheetCommittedBatchEnvelope
  ): Array<{ startGridColumnIndex: number; count: number }> {
    const inserts = batch.operations
      .filter(operation => operation.type === 'column_add')
      .flatMap(operation => {
        const result =
          operation.result && typeof operation.result === 'object'
            ? (operation.result as Record<string, unknown>)
            : null
        const visibleGridIndex = Number(result?.visibleGridIndex)
        if (!Number.isFinite(visibleGridIndex) || visibleGridIndex < 0) return []
        return [{ startGridColumnIndex: Math.trunc(visibleGridIndex), count: 1 }]
      })
    return coalesceAdjacentColumnSlotInserts(inserts)
  }

  private extractInsertColumnSlotsFromOperations(
    sheetId: string,
    operations: Array<{ type?: string; data?: unknown }>
  ): Array<{ startGridColumnIndex: number; count: number }> {
    const columnAdds = operations
      .filter(operation => operation.type === 'column_add')
      .map(operation => operation.data)
      .filter((data): data is Record<string, unknown> => Boolean(data) && typeof data === 'object')
      .flatMap(data => {
        const column = data.column as SpreadsheetColumn | undefined
        if (!column || typeof column.id !== 'string') return []
        return [column]
      })
      .sort((left, right) => left.order - right.order)

    if (columnAdds.length === 0) return []

    for (const operation of operations) {
      if (operation.type !== 'column_add') continue
      const data = operation.data as Record<string, unknown> | undefined
      if (!data || typeof data !== 'object') break
      const visibleInsertIndex = Number(data.visibleInsertIndex)
      const insertCount = Number(data.insertCount)
      if (Number.isFinite(visibleInsertIndex) && Number.isFinite(insertCount) && insertCount > 0) {
        return coalesceAdjacentColumnSlotInserts([
          {
            startGridColumnIndex: Math.max(0, Math.trunc(visibleInsertIndex)),
            count: Math.max(1, Math.trunc(insertCount))
          }
        ])
      }
      break
    }

    const addedIds = new Set(columnAdds.map(column => column.id))
    const metadataColumns = this.getColumnsForSheet(sheetId)
    const existingColumns =
      this.buildColumnsUsingConfirmedPhysicalOrder({
        sheetId,
        columns: metadataColumns.filter(column => !addedIds.has(column.id)),
        seedIfMissing: sheetId === this.callbacks.getActiveSheetId()
      }) ?? metadataColumns.filter(column => !addedIds.has(column.id))
    const contiguousInsert = extractContiguousColumnSlotInsert(existingColumns, columnAdds)
    if (contiguousInsert) {
      return coalesceAdjacentColumnSlotInserts([contiguousInsert])
    }

    let workingColumns = existingColumns
    const inserts: Array<{ startGridColumnIndex: number; count: number }> = []
    for (const column of columnAdds) {
      const insert = this.extractInsertColumnSlotFromData({ column }, workingColumns)
      if (insert) {
        inserts.push(insert)
      }
      workingColumns = mergeRemoteColumnAdd(workingColumns, column)
    }

    return coalesceAdjacentColumnSlotInserts(inserts)
  }

  private applyRemoteColumnAddsFromOperations(
    sheetId: string,
    operations: Array<{ type?: string; data?: unknown }>,
    options?: { skipActiveGridSync?: boolean }
  ): void {
    const columnAddCount = operations.filter(operation => operation.type === 'column_add').length
    const nextColumns = this.buildNextColumnsFromColumnAddOperations(sheetId, operations)
    if (!nextColumns) return
    this.collabDiag('column_metadata_only_applied', {
      sheetId,
      operationType: 'column_add',
      columnCount: columnAddCount,
      skipActiveGridSync: options?.skipActiveGridSync ?? false
    })
    this.callbacks.onRemoteColumnUpdate?.({
      sheetId,
      columns: nextColumns,
      ...(options?.skipActiveGridSync ? { skipGridConversionContextSync: true } : {})
    })
  }

  private applyRemoteColumnDeletesFromOperations(
    sheetId: string,
    operations: Array<{ type?: string; data?: unknown }>,
    options?: { skipActiveGridSync?: boolean }
  ): void {
    const columnDeleteCount = operations.filter(operation => operation.type === 'column_delete').length
    const nextColumns = this.buildNextColumnsFromColumnDeleteOperations(sheetId, operations)
    if (!nextColumns) return
    this.collabDiag('column_metadata_only_applied', {
      sheetId,
      operationType: 'column_delete',
      columnCount: columnDeleteCount,
      skipActiveGridSync: options?.skipActiveGridSync ?? false
    })
    this.callbacks.onRemoteColumnUpdate?.({
      sheetId,
      columns: nextColumns,
      ...(options?.skipActiveGridSync ? { skipGridConversionContextSync: true } : {})
    })
  }

  private buildNextColumnsFromColumnAddOperations(
    sheetId: string,
    operations: Array<{ type?: string; data?: unknown }>
  ): SpreadsheetColumn[] | null {
    const columnAdds = operations
      .filter(operation => operation.type === 'column_add')
      .map(operation => operation.data)
      .filter((data): data is Record<string, unknown> => Boolean(data) && typeof data === 'object')
      .map(data => data.column as SpreadsheetColumn | undefined)
      .filter((column): column is SpreadsheetColumn => Boolean(column?.id))
      .sort((left, right) => left.order - right.order)
    if (columnAdds.length === 0) return null
    let nextColumns = this.getColumnsForSheet(sheetId)
    for (const column of columnAdds) {
      nextColumns = mergeRemoteColumnAdd(nextColumns, column)
    }
    return nextColumns
  }

  private buildNextColumnsFromColumnDeleteOperations(
    sheetId: string,
    operations: Array<{ type?: string; data?: unknown }>
  ): SpreadsheetColumn[] | null {
    const columnDeletes = operations
      .filter(operation => operation.type === 'column_delete')
      .map(operation => operation.data)
      .filter((data): data is Record<string, unknown> => Boolean(data) && typeof data === 'object')
      .map(data => String(data.columnId ?? ''))
      .filter(Boolean)
    if (columnDeletes.length === 0) return null
    let nextColumns = this.getColumnsForSheet(sheetId)
    for (const columnId of columnDeletes) {
      nextColumns = nextColumns.filter(column => column.id !== columnId).map((column, order) => ({ ...column, order }))
    }
    return nextColumns
  }

  private extractDeleteColumnSlotsFromBatch(
    batch: SpreadsheetCommittedBatchEnvelope
  ): Array<{ startGridColumnIndex: number; count: number }> {
    const deletes = batch.operations
      .filter(operation => operation.type === 'column_delete')
      .flatMap(operation => {
        const result =
          operation.result && typeof operation.result === 'object'
            ? (operation.result as Record<string, unknown>)
            : null
        const deletedVisibleGridIndex = Number(result?.deletedVisibleGridIndex)
        if (!Number.isFinite(deletedVisibleGridIndex) || deletedVisibleGridIndex < 0) return []
        return [{ startGridColumnIndex: Math.trunc(deletedVisibleGridIndex), count: 1 }]
      })
    return coalesceAdjacentColumnSlotDeletes(deletes)
  }

  private extractDeleteColumnSlotsFromOperations(
    sheetId: string,
    operations: Array<{ type?: string; data?: unknown }>
  ): Array<{ startGridColumnIndex: number; count: number }> {
    const columnDeletes = operations
      .filter(operation => operation.type === 'column_delete')
      .map(operation => operation.data)
      .filter((data): data is Record<string, unknown> => Boolean(data) && typeof data === 'object')

    if (columnDeletes.length === 0) return []

    for (const operation of operations) {
      if (operation.type !== 'column_delete') continue
      const data = operation.data as Record<string, unknown> | undefined
      if (!data || typeof data !== 'object') break
      const visibleDeleteIndex = Number(data.visibleDeleteIndex)
      const deleteCount = Number(data.deleteCount)
      if (Number.isFinite(visibleDeleteIndex) && Number.isFinite(deleteCount) && deleteCount > 0) {
        return coalesceAdjacentColumnSlotDeletes([
          {
            startGridColumnIndex: Math.max(0, Math.trunc(visibleDeleteIndex)),
            count: Math.max(1, Math.trunc(deleteCount))
          }
        ])
      }
      break
    }

    const deletedIds = columnDeletes.map(data => String(data.columnId ?? '')).filter(Boolean)
    const metadataColumns = this.getColumnsForSheet(sheetId)
    const existingColumns =
      this.buildColumnsUsingConfirmedPhysicalOrder({
        sheetId,
        columns: metadataColumns,
        seedIfMissing: sheetId === this.callbacks.getActiveSheetId()
      }) ?? metadataColumns
    const contiguousDelete = extractContiguousColumnSlotDelete(existingColumns, deletedIds)
    if (contiguousDelete) {
      return coalesceAdjacentColumnSlotDeletes([contiguousDelete])
    }

    let workingColumns = existingColumns
    const deletes: Array<{ startGridColumnIndex: number; count: number }> = []
    for (const data of columnDeletes) {
      const columnId = String(data.columnId ?? '')
      if (!columnId) continue
      const column = workingColumns.find(entry => entry.id === columnId)
      if (!column) continue
      const startGridColumnIndex = visibleGridColumnIndexFromColumn(workingColumns, column)
      deletes.push({ startGridColumnIndex, count: 1 })
      workingColumns = workingColumns.filter(entry => entry.id !== columnId)
    }

    return coalesceAdjacentColumnSlotDeletes(deletes).sort(
      (left, right) => right.startGridColumnIndex - left.startGridColumnIndex
    )
  }

  private applyCommittedBatchAuthoritativePatches(batch: SpreadsheetCommittedBatchEnvelope): void {
    if (batch.worksheetMetadataPatch) {
      this.callbacks.applyCommittedWorksheetMetadataPatch?.(batch.worksheetMetadataPatch)
    }
    if (batch.commentAnchorPatches && batch.commentAnchorPatches.length > 0) {
      this.callbacks.applyCommittedCommentAnchorPatches?.(batch.commentAnchorPatches)
    }
  }

  private applyRemoteInsertColumnSlotsLive(params: {
    sheetId: string
    inserts: Array<{ startGridColumnIndex: number; count: number }>
    nextColumns?: SpreadsheetColumn[]
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const isOwnRecentBatch = this.isOwnRecentStructuralBatch(params.traceMeta)
    if (isOwnRecentBatch || params.inserts.length === 0) {
      if (isOwnRecentBatch && params.nextColumns) {
        this.setConfirmedPhysicalColumnOrder(params.sheetId, params.nextColumns)
      }
      return
    }
    const structuralUnitCount = params.inserts.reduce((total, insert) => total + Math.max(0, insert.count), 0)
    if (
      !this.shouldApplyInactiveStructuralGridUpdate({
        sheetId: params.sheetId,
        operationCount: params.inserts.length,
        structuralUnitCount,
        reason: 'column_structure',
        traceMeta: params.traceMeta
      })
    ) {
      return
    }
    queueMicrotask(() => {
      const isActiveTargetSheet = params.sheetId === this.callbacks.getActiveSheetId()
      let gridApplied = Boolean(this.callbacks.applyRemoteInsertColumnSlots)
      if (gridApplied) {
        for (const insert of params.inserts) {
          const insertApplied =
            this.callbacks.applyRemoteInsertColumnSlots?.({
              sheetId: params.sheetId,
              startGridColumnIndex: insert.startGridColumnIndex,
              count: insert.count
            }) ?? false
          if (!insertApplied) {
            gridApplied = false
          }
        }
      }
      if (gridApplied && params.nextColumns) {
        gridApplied = this.verifyActiveSheetColumnStructure(params.sheetId, params.nextColumns)
      }
      if (gridApplied && params.nextColumns) {
        this.setConfirmedPhysicalColumnOrder(params.sheetId, params.nextColumns)
      } else if (!gridApplied && params.nextColumns) {
        this.repairColumnStructure({
          sheetId: params.sheetId,
          nextColumns: params.nextColumns,
          reason: 'column_insert_structural_repair',
          traceMeta: params.traceMeta
        })
      } else if (!gridApplied && isActiveTargetSheet) {
        this.callbacks.forceGridReapply?.(params.sheetId, null, {
          allowFullGridReapply: true,
          clearAllSignatures: true,
          preferBulk: true,
          reason: 'column_slots_insert_fallback'
        })
      } else if (!gridApplied) {
        this.markGridMaterializationNeeded(params.sheetId, 'column_slots_insert_fallback')
      }
      this.collabDiag('column_slot_live_applied', {
        sheetId: params.sheetId,
        operationType: 'column_add',
        gridApplied,
        insertCount: params.inserts.length
      })
      this.traceEvent({
        source: 'client',
        stage: gridApplied
          ? 'client_collab_column_slots_insert_grid_applied'
          : 'client_collab_column_slots_insert_grid_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          insertCount: params.inserts.length,
          inserts: params.inserts
        }
      })
    })
  }

  private applyRemoteDeleteColumnSlotsLive(params: {
    sheetId: string
    deletes: Array<{ startGridColumnIndex: number; count: number }>
    nextColumns?: SpreadsheetColumn[]
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const isOwnRecentBatch = this.isOwnRecentStructuralBatch(params.traceMeta)
    if (isOwnRecentBatch || params.deletes.length === 0) {
      if (isOwnRecentBatch && params.nextColumns) {
        this.setConfirmedPhysicalColumnOrder(params.sheetId, params.nextColumns)
      }
      return
    }
    const structuralUnitCount = params.deletes.reduce((total, deleteSlots) => total + Math.max(0, deleteSlots.count), 0)
    if (
      !this.shouldApplyInactiveStructuralGridUpdate({
        sheetId: params.sheetId,
        operationCount: params.deletes.length,
        structuralUnitCount,
        reason: 'column_structure',
        traceMeta: params.traceMeta
      })
    ) {
      return
    }
    queueMicrotask(() => {
      const isActiveTargetSheet = params.sheetId === this.callbacks.getActiveSheetId()
      let gridApplied = Boolean(this.callbacks.applyRemoteDeleteColumnSlots)
      if (gridApplied) {
        for (const deleteSlots of params.deletes) {
          const deleteApplied =
            this.callbacks.applyRemoteDeleteColumnSlots?.({
              sheetId: params.sheetId,
              startGridColumnIndex: deleteSlots.startGridColumnIndex,
              count: deleteSlots.count
            }) ?? false
          if (!deleteApplied) {
            gridApplied = false
          }
        }
      }
      if (gridApplied && params.nextColumns) {
        gridApplied = this.verifyActiveSheetColumnStructure(params.sheetId, params.nextColumns)
      }
      if (gridApplied && params.nextColumns) {
        this.setConfirmedPhysicalColumnOrder(params.sheetId, params.nextColumns)
      } else if (!gridApplied && params.nextColumns) {
        this.repairColumnStructure({
          sheetId: params.sheetId,
          nextColumns: params.nextColumns,
          reason: 'column_delete_structural_repair',
          traceMeta: params.traceMeta
        })
      } else if (!gridApplied && isActiveTargetSheet) {
        this.callbacks.forceGridReapply?.(params.sheetId, null, {
          allowFullGridReapply: true,
          clearAllSignatures: true,
          preferBulk: true,
          reason: 'column_slots_delete_fallback'
        })
      } else if (!gridApplied) {
        this.markGridMaterializationNeeded(params.sheetId, 'column_slots_delete_fallback')
      }
      this.collabDiag('column_slot_live_applied', {
        sheetId: params.sheetId,
        operationType: 'column_delete',
        gridApplied,
        deleteCount: params.deletes.length
      })
      this.traceEvent({
        source: 'client',
        stage: gridApplied
          ? 'client_collab_column_slots_delete_grid_applied'
          : 'client_collab_column_slots_delete_grid_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          deleteCount: params.deletes.length,
          deletes: params.deletes
        }
      })
    })
  }

  private extractInsertRowSlotsFromData(data: unknown): { startGridRowIndex: number; count: number } | null {
    return this.extractDeleteRowSlotsFromData(data)
  }

  private extractDeleteRowSlotsFromData(data: unknown): { startGridRowIndex: number; count: number } | null {
    if (!data || typeof data !== 'object') return null
    const payload = data as Record<string, unknown>
    const startGridRowIndex = Number(payload.startGridRowIndex)
    const count = Number(payload.count)
    if (!Number.isFinite(startGridRowIndex) || !Number.isFinite(count)) {
      return null
    }
    return { startGridRowIndex, count }
  }

  private extractMoveCellRangeFromData(data: unknown): {
    fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
  } | null {
    if (!data || typeof data !== 'object') return null
    const payload = data as Record<string, unknown>
    return parseMoveCellRangeWirePayload({
      fromRange: payload.fromRange,
      toRange: payload.toRange
    })
  }

  private syncRemoteColumnVisibilityMetadata(sheetId: string, data: Record<string, unknown>): void {
    const parsed = this.extractVisibilityUpdateFromData(data)
    if (!parsed || parsed.axis !== 'column') return
    const currentColumns = this.getColumnsForSheet(sheetId)
    if (currentColumns.length === 0) return
    const nextColumns = applyColumnVisibilityRangesToSpreadsheetColumns(currentColumns, parsed.hidden, parsed.ranges)
    const visibilityChanged = nextColumns.some(column => {
      const current = currentColumns.find(entry => entry.id === column.id)
      return current?.isVisible !== column.isVisible
    })
    if (!visibilityChanged) return
    this.callbacks.onRemoteColumnUpdate?.({ sheetId, columns: nextColumns })
  }

  private extractVisibilityUpdateFromData(data: unknown): {
    axis: 'row' | 'column'
    hidden: boolean
    ranges: Array<{ start: number; end: number }>
    commandId?: string
    params?: Record<string, unknown>
  } | null {
    if (!data || typeof data !== 'object') return null
    const payload = data as Record<string, unknown>
    const axis = payload.axis === 'row' ? 'row' : payload.axis === 'column' ? 'column' : null
    if (!axis) return null
    const rangesRaw = Array.isArray(payload.ranges) ? payload.ranges : []
    const ranges = rangesRaw
      .map(range => {
        if (!range || typeof range !== 'object') return null
        const candidate = range as Record<string, unknown>
        const start = Number(candidate.start)
        const end = Number(candidate.end)
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null
        const normalizedStart = Math.max(0, Math.trunc(start))
        const normalizedEnd = Math.max(normalizedStart, Math.trunc(end))
        return { start: normalizedStart, end: normalizedEnd }
      })
      .filter((range): range is { start: number; end: number } => range != null)
    if (ranges.length === 0) return null
    const commandId = typeof payload.commandId === 'string' ? payload.commandId : undefined
    const params =
      payload.params && typeof payload.params === 'object' && !Array.isArray(payload.params)
        ? (payload.params as Record<string, unknown>)
        : undefined
    return {
      axis,
      hidden: payload.hidden === true,
      ranges,
      commandId,
      params
    }
  }

  private extractVisibilityUpdatesFromOperations(operations: Array<{ type?: string; data?: unknown }>): Array<{
    sheetId: string
    axis: 'row' | 'column'
    hidden: boolean
    ranges: Array<{ start: number; end: number }>
    commandId?: string
    params?: Record<string, unknown>
  }> {
    const updates: Array<{
      sheetId: string
      axis: 'row' | 'column'
      hidden: boolean
      ranges: Array<{ start: number; end: number }>
      commandId?: string
      params?: Record<string, unknown>
    }> = []
    for (const operation of operations) {
      if (operation.type !== 'visibility_update') continue
      const parsed = this.extractVisibilityUpdateFromData(operation.data)
      if (!parsed) continue
      const sheetId = this.getSheetIdFromData(operation.data)
      if (!sheetId) continue
      updates.push({ sheetId, ...parsed })
    }
    return updates
  }

  private applyRemoteVisibilityUpdatesLive(params: {
    sheetId: string
    updates: Array<{
      sheetId: string
      axis: 'row' | 'column'
      hidden: boolean
      ranges: Array<{ start: number; end: number }>
      commandId?: string
      params?: Record<string, unknown>
    }>
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const isOwnRecentBatch =
      Boolean(params.traceMeta?.batchId) &&
      (this.callbacks.isRecentLocalBatchId?.(params.traceMeta?.batchId, params.traceMeta?.tabId) ?? false)
    if (params.isLocalEcho || isOwnRecentBatch || params.updates.length === 0) {
      return
    }
    const activeSheetId = this.callbacks.getActiveSheetId()
    queueMicrotask(() => {
      let gridApplied = Boolean(this.callbacks.applyRemoteSpreadsheetFeatureOperation)
      const appliedUpdates: typeof params.updates = []
      if (gridApplied) {
        for (const update of params.updates) {
          if (update.sheetId !== activeSheetId) {
            this.markGridMaterializationNeeded(update.sheetId, 'visibility_update')
            continue
          }
          const data: Record<string, unknown> = {
            sheetId: update.sheetId,
            axis: update.axis,
            hidden: update.hidden,
            ranges: update.ranges
          }
          if (update.commandId) {
            data.commandId = update.commandId
          }
          if (update.params) {
            data.params = update.params
          }
          this.applyRemoteSpreadsheetFeatureOperation('visibility_update', data, params.traceMeta, update.sheetId)
          appliedUpdates.push(update)
        }
        gridApplied = appliedUpdates.length > 0
      }
      this.traceEvent({
        source: 'client',
        stage: gridApplied
          ? 'client_collab_visibility_update_grid_applied'
          : 'client_collab_visibility_update_grid_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          updateCount: params.updates.length,
          appliedCount: appliedUpdates.length,
          updates: appliedUpdates
        }
      })
    })
  }

  private extractFreezePanesFromOperations(operations: Array<{ type?: string; data?: unknown }>): Array<{
    sheetId: string
    data: Record<string, unknown>
  }> {
    const updates: Array<{ sheetId: string; data: Record<string, unknown> }> = []
    for (const operation of operations) {
      if (operation.type !== 'freeze_panes') continue
      if (!operation.data || typeof operation.data !== 'object' || Array.isArray(operation.data)) continue
      const sheetId = this.getSheetIdFromData(operation.data)
      if (!sheetId) continue
      updates.push({ sheetId, data: { ...(operation.data as Record<string, unknown>), sheetId } })
    }
    return updates
  }

  private applyRemoteFreezePanesLive(params: {
    sheetId: string
    updates: Array<{ sheetId: string; data: Record<string, unknown> }>
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const isOwnRecentBatch =
      Boolean(params.traceMeta?.batchId) &&
      (this.callbacks.isRecentLocalBatchId?.(params.traceMeta?.batchId, params.traceMeta?.tabId) ?? false)
    if (params.isLocalEcho || isOwnRecentBatch || params.updates.length === 0) {
      return
    }
    const activeSheetId = this.callbacks.getActiveSheetId()
    queueMicrotask(() => {
      let gridApplied = Boolean(this.callbacks.applyRemoteSpreadsheetFeatureOperation)
      const appliedUpdates: typeof params.updates = []
      if (gridApplied) {
        for (const update of params.updates) {
          if (update.sheetId !== activeSheetId) {
            this.markGridMaterializationNeeded(update.sheetId, 'freeze_panes')
            continue
          }
          this.applyRemoteSpreadsheetFeatureOperation('freeze_panes', update.data, params.traceMeta, update.sheetId)
          appliedUpdates.push(update)
        }
        gridApplied = appliedUpdates.length > 0
      }
      this.traceEvent({
        source: 'client',
        stage: gridApplied ? 'client_collab_freeze_panes_grid_applied' : 'client_collab_freeze_panes_grid_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          updateCount: params.updates.length,
          appliedCount: appliedUpdates.length
        }
      })
    })
  }

  private extractMoveRowSlotsFromData(data: unknown): {
    sourceStartGridRowIndex: number
    count: number
    destinationGridRowIndex: number
  } | null {
    if (!data || typeof data !== 'object') return null
    const payload = data as Record<string, unknown>
    const sourceStartGridRowIndex = Number(payload.sourceStartGridRowIndex)
    const count = Number(payload.count)
    const destinationGridRowIndex = Number(payload.destinationGridRowIndex)
    if (
      !Number.isFinite(sourceStartGridRowIndex) ||
      !Number.isFinite(count) ||
      !Number.isFinite(destinationGridRowIndex)
    ) {
      return null
    }
    return {
      sourceStartGridRowIndex,
      count,
      destinationGridRowIndex
    }
  }

  private applyRemoteInsertRowSlotsLive(params: {
    sheetId: string
    inserts: Array<{ startGridRowIndex: number; count: number }>
    rows: ViewerRow[]
    createdRows?: ViewerRow[]
    dirtyRegions?: SpreadsheetDeltaDirtyRegion[]
    fallbackRegion?: AuthoritativeGridRegion | null
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
    onAfterGridSettled?: () => void
  }): void {
    const isOwnRecentBatch = this.isOwnRecentStructuralBatch(params.traceMeta)
    if (isOwnRecentBatch || params.inserts.length === 0) {
      return
    }
    const structuralUnitCount = params.inserts.reduce((total, insert) => total + Math.max(0, insert.count), 0)
    if (
      !this.shouldApplyInactiveStructuralGridUpdate({
        sheetId: params.sheetId,
        operationCount: params.inserts.length,
        structuralUnitCount,
        reason: 'row_structure',
        traceMeta: params.traceMeta
      })
    ) {
      return
    }
    queueMicrotask(() => {
      const isActiveTargetSheet = params.sheetId === this.callbacks.getActiveSheetId()
      let gridApplied = Boolean(this.callbacks.applyRemoteInsertRowSlots)
      if (gridApplied) {
        for (const insert of params.inserts) {
          const insertApplied =
            this.callbacks.applyRemoteInsertRowSlots?.({
              sheetId: params.sheetId,
              startGridRowIndex: insert.startGridRowIndex,
              count: insert.count
            }) ?? false
          if (!insertApplied) {
            gridApplied = false
          }
        }
      }
      if (gridApplied && Array.isArray(params.createdRows) && params.createdRows.length > 0) {
        this.applyCreatedRowsToGrid(params.sheetId, params.rows, params.createdRows)
      }
      if (!gridApplied && isActiveTargetSheet) {
        const region =
          params.fallbackRegion ??
          (params.dirtyRegions
            ? this.authoritativeRegionFromDirtyRegions(params.dirtyRegions, params.rows, params.sheetId)
            : null)
        if (region != null) {
          this.callbacks.forceGridReapply?.(params.sheetId, region, {
            clearAllSignatures: false,
            preferBulk: true,
            reason: 'row_slots_insert_fallback'
          })
        }
      } else if (!gridApplied) {
        this.markGridMaterializationNeeded(params.sheetId, 'row_slots_insert_fallback')
      }
      params.onAfterGridSettled?.()
      this.traceEvent({
        source: 'client',
        stage: gridApplied
          ? 'client_collab_row_slots_insert_grid_applied'
          : 'client_collab_row_slots_insert_grid_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          insertCount: params.inserts.length,
          inserts: params.inserts
        }
      })
    })
  }

  private applyRemoteDeleteRowSlotsLive(params: {
    sheetId: string
    deletes: Array<{ startGridRowIndex: number; count: number }>
    rows: ViewerRow[]
    dirtyRegions?: SpreadsheetDeltaDirtyRegion[]
    fallbackRegion?: AuthoritativeGridRegion | null
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const isOwnRecentBatch = this.isOwnRecentStructuralBatch(params.traceMeta)
    if (isOwnRecentBatch || params.deletes.length === 0) {
      return
    }
    const structuralUnitCount = params.deletes.reduce((total, deleteSlots) => total + Math.max(0, deleteSlots.count), 0)
    if (
      !this.shouldApplyInactiveStructuralGridUpdate({
        sheetId: params.sheetId,
        operationCount: params.deletes.length,
        structuralUnitCount,
        reason: 'row_structure',
        traceMeta: params.traceMeta
      })
    ) {
      return
    }
    queueMicrotask(() => {
      const isActiveTargetSheet = params.sheetId === this.callbacks.getActiveSheetId()
      let gridApplied = Boolean(this.callbacks.applyRemoteDeleteRowSlots)
      if (gridApplied) {
        for (const deleteSlots of params.deletes) {
          const deleteApplied =
            this.callbacks.applyRemoteDeleteRowSlots?.({
              sheetId: params.sheetId,
              startGridRowIndex: deleteSlots.startGridRowIndex,
              count: deleteSlots.count
            }) ?? false
          if (!deleteApplied) {
            gridApplied = false
          }
        }
      }
      if (!gridApplied && isActiveTargetSheet) {
        const region =
          params.fallbackRegion ??
          (params.dirtyRegions
            ? this.authoritativeRegionFromDirtyRegions(params.dirtyRegions, params.rows, params.sheetId)
            : null)
        if (region != null) {
          this.callbacks.forceGridReapply?.(params.sheetId, region, {
            clearAllSignatures: true,
            preferBulk: true,
            reason: 'row_slots_delete_fallback_bounded'
          })
        } else {
          this.callbacks.forceGridReapply?.(params.sheetId, null, {
            allowFullGridReapply: true,
            clearAllSignatures: true,
            preferBulk: true,
            reason: 'row_slots_delete_fallback_full'
          })
        }
      } else if (!gridApplied) {
        this.markGridMaterializationNeeded(params.sheetId, 'row_slots_delete_fallback')
      }
      this.traceEvent({
        source: 'client',
        stage: gridApplied
          ? 'client_collab_row_slots_delete_grid_applied'
          : 'client_collab_row_slots_delete_grid_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          deleteCount: params.deletes.length,
          deletes: params.deletes
        }
      })
    })
  }

  private resolveMoveCellRangeAuthoritativeRegion(params: {
    moves: Array<{
      fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
      toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    }>
    rows: ViewerRow[]
    dirtyRegions?: SpreadsheetDeltaDirtyRegion[]
    fallbackRegion?: AuthoritativeGridRegion | null
    sheetId: string
  }): AuthoritativeGridRegion | null {
    return (
      params.fallbackRegion ??
      params.moves.reduce<AuthoritativeGridRegion | null>((merged, move) => {
        const next = this.buildDirtyRegionForCellRangeMove(move.fromRange, move.toRange)
        if (!merged) return next
        return {
          minRow: Math.min(merged.minRow, next.minRow),
          maxRow: Math.max(merged.maxRow, next.maxRow),
          minCol: Math.min(merged.minCol, next.minCol),
          maxCol: Math.max(merged.maxCol, next.maxCol)
        }
      }, null) ??
      (params.dirtyRegions
        ? this.authoritativeRegionFromDirtyRegions(params.dirtyRegions, params.rows, params.sheetId)
        : null)
    )
  }

  private applyRemoteMoveCellRangeLive(params: {
    sheetId: string
    moves: Array<{
      fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
      toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    }>
    rows: ViewerRow[]
    dirtyRegions?: SpreadsheetDeltaDirtyRegion[]
    fallbackRegion?: AuthoritativeGridRegion | null
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const isOwnRecentBatch = this.isOwnRecentStructuralBatch(params.traceMeta)
    const skipNativeMove = isOwnRecentBatch
    if (params.moves.length === 0) {
      return
    }
    queueMicrotask(() => {
      let nativeMoveApplied = false
      if (!skipNativeMove && this.callbacks.applyRemoteMoveCellRange) {
        nativeMoveApplied = true
        for (const move of params.moves) {
          const moveApplied =
            this.callbacks.applyRemoteMoveCellRange?.({
              sheetId: params.sheetId,
              fromRange: move.fromRange,
              toRange: move.toRange
            }) ?? false
          if (!moveApplied) {
            nativeMoveApplied = false
          }
        }
      }
      const region = this.resolveMoveCellRangeAuthoritativeRegion(params)
      if (region != null) {
        this.callbacks.forceGridReapply?.(params.sheetId, region, {
          clearAllSignatures: skipNativeMove,
          preferBulk: true,
          reason: 'cell_range_move_reconcile'
        })
      }
      const gridApplied = nativeMoveApplied || skipNativeMove || region != null
      this.traceEvent({
        source: 'client',
        stage: gridApplied ? 'client_collab_cell_range_move_grid_applied' : 'client_collab_cell_range_move_grid_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          nativeMoveApplied,
          authoritativeReconcile: true,
          skipNativeMove,
          moveCount: params.moves.length,
          moves: params.moves
        }
      })
    })
  }

  private applyRemoteRowSlotsMovesLive(params: {
    sheetId: string
    moves: Array<{
      sourceStartGridRowIndex: number
      count: number
      destinationGridRowIndex: number
    }>
    rows: ViewerRow[]
    dirtyRegions?: SpreadsheetDeltaDirtyRegion[]
    fallbackRegion?: AuthoritativeGridRegion | null
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const isOwnRecentBatch = this.isOwnRecentStructuralBatch(params.traceMeta)
    if (isOwnRecentBatch || params.moves.length === 0) {
      return
    }
    const structuralUnitCount = params.moves.reduce((total, move) => total + Math.max(0, move.count), 0)
    if (
      !this.shouldApplyInactiveStructuralGridUpdate({
        sheetId: params.sheetId,
        operationCount: params.moves.length,
        structuralUnitCount,
        reason: 'row_structure',
        traceMeta: params.traceMeta
      })
    ) {
      return
    }
    queueMicrotask(() => {
      const isActiveTargetSheet = params.sheetId === this.callbacks.getActiveSheetId()
      let gridApplied = Boolean(this.callbacks.applyRemoteRowSlotsMove)
      if (gridApplied) {
        for (const move of params.moves) {
          const moveApplied =
            this.callbacks.applyRemoteRowSlotsMove?.({
              sheetId: params.sheetId,
              sourceStartGridRowIndex: move.sourceStartGridRowIndex,
              count: move.count,
              destinationGridRowIndex: move.destinationGridRowIndex
            }) ?? false
          if (!moveApplied) {
            gridApplied = false
          }
        }
      }
      if (!gridApplied && isActiveTargetSheet) {
        const region =
          params.fallbackRegion ??
          (params.dirtyRegions
            ? this.authoritativeRegionFromDirtyRegions(params.dirtyRegions, params.rows, params.sheetId)
            : null)
        if (region != null) {
          this.callbacks.forceGridReapply?.(params.sheetId, region, {
            clearAllSignatures: false,
            preferBulk: true,
            reason: 'row_slots_move_fallback'
          })
        }
      } else if (!gridApplied) {
        this.markGridMaterializationNeeded(params.sheetId, 'row_slots_move_fallback')
      }
      this.traceEvent({
        source: 'client',
        stage: gridApplied
          ? 'client_collab_row_slots_move_grid_moves_applied'
          : 'client_collab_row_slots_move_grid_moves_failed',
        severity: gridApplied ? 'info' : 'warning',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          gridApplied,
          moveCount: params.moves.length,
          moves: params.moves
        }
      })
    })
  }

  private applyRemoteColumnReorderLive(params: {
    sheetId: string
    previousColumns: SpreadsheetColumn[]
    nextColumns: SpreadsheetColumn[]
    moves?: ColumnReorderMove[]
    expectDeferredStyleReplay?: boolean
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string; tabId?: string }
    isLocalEcho?: boolean
  }): void {
    const confirmedPreviousColumnsForGrid =
      this.buildColumnsUsingConfirmedPhysicalOrder({
        sheetId: params.sheetId,
        columns: params.previousColumns,
        seedIfMissing: params.sheetId === this.callbacks.getActiveSheetId()
      }) ?? params.previousColumns
    const snapshotOrderedPreviousColumns = this.buildSnapshotOrderedPreviousColumns(params.sheetId, params.nextColumns)
    const explicitMoves = params.moves?.filter(move => move.count > 0) ?? []
    const replayBaseCandidates = [
      { strategy: 'confirmed_physical_order', columns: confirmedPreviousColumnsForGrid },
      { strategy: 'committed_previous_columns', columns: params.previousColumns },
      { strategy: 'snapshot_physical_order', columns: snapshotOrderedPreviousColumns ?? null }
    ]
    const matchingReplayBase =
      explicitMoves.length > 0
        ? replayBaseCandidates.find(
            candidate =>
              Array.isArray(candidate.columns) &&
              explicitColumnReorderMovesReachTarget({
                previousColumns: candidate.columns,
                nextColumns: params.nextColumns,
                explicitMoves
              })
          )
        : null
    const previousColumnsForGrid = matchingReplayBase?.columns ?? confirmedPreviousColumnsForGrid
    const replayBaseStrategy = matchingReplayBase?.strategy ?? 'confirmed_physical_order'
    const isOwnRecentBatch =
      Boolean(params.traceMeta?.batchId) &&
      (this.callbacks.isRecentLocalBatchId?.(params.traceMeta?.batchId, params.traceMeta?.tabId) ?? false)
    const nativeMergeSupport = classifyNativeColumnReorderWithMerges({
      previousColumns: previousColumnsForGrid,
      nextColumns: params.nextColumns,
      mergeRanges: this.getWorkbookSnapshotMergeRanges(params.sheetId),
      explicitMoves: params.moves
    })
    this.collabDiag('column_reorder_live_entry', {
      sheetId: params.sheetId,
      isActiveSheet: params.sheetId === this.callbacks.getActiveSheetId(),
      isOwnRecentBatch,
      mergeSupportOk: nativeMergeSupport.ok,
      mergeSupportReason: nativeMergeSupport.ok ? undefined : nativeMergeSupport.reason,
      hasNativeHandler: Boolean(this.callbacks.applyRemoteColumnReorder),
      replayBaseStrategy,
      previousOrder: visibleColumnsInGridOrder(previousColumnsForGrid)
        .map(column => column.id)
        .join(','),
      nextOrder: visibleColumnsInGridOrder(params.nextColumns)
        .map(column => column.id)
        .join(',')
    })
    const applyColumnMetadata = (skipGridConversionContextSync: boolean): void => {
      this.callbacks.onRemoteColumnUpdate?.({
        sheetId: params.sheetId,
        columns: params.nextColumns,
        ...(skipGridConversionContextSync ? { skipGridConversionContextSync: true } : {})
      })
    }
    const isActiveTargetSheet = params.sheetId === this.callbacks.getActiveSheetId()
    if (!nativeMergeSupport.ok && nativeMergeSupport.reason !== 'unplannable_reorder') {
      applyColumnMetadata(false)
      if (isActiveTargetSheet) {
        this.callbacks.scheduleRemoteStructuralResync?.(params.sheetId, { immediate: true })
      } else {
        this.markGridMaterializationNeeded(params.sheetId, 'column_structure')
      }
      queueMicrotask(() => {
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_column_reorder_merge_blocked',
          severity: 'warning',
          traceSessionId: params.traceMeta?.traceSessionId,
          traceId: params.traceMeta?.traceId,
          batchId: params.traceMeta?.batchId,
          payload: {
            sheetId: params.sheetId,
            reason: nativeMergeSupport.reason,
            previousVisibleOrder: visibleColumnsInGridOrder(previousColumnsForGrid).map(column => column.id),
            nextVisibleOrder: visibleColumnsInGridOrder(params.nextColumns).map(column => column.id)
          }
        })
      })
      return
    }
    if (isOwnRecentBatch) {
      this.setConfirmedPhysicalColumnOrder(params.sheetId, params.nextColumns)
      applyColumnMetadata(true)
      queueMicrotask(() => {
        this.traceEvent({
          source: 'client',
          stage: 'client_collab_column_reorder_local_echo_preserved',
          severity: 'info',
          traceSessionId: params.traceMeta?.traceSessionId,
          traceId: params.traceMeta?.traceId,
          batchId: params.traceMeta?.batchId,
          payload: {
            sheetId: params.sheetId,
            gridApplied: true,
            strategy: 'native_local_move_owned',
            previousVisibleOrder: visibleColumnsInGridOrder(previousColumnsForGrid).map(column => column.id),
            nextVisibleOrder: visibleColumnsInGridOrder(params.nextColumns).map(column => column.id)
          }
        })
      })
      return
    }
    if (!this.callbacks.applyRemoteColumnReorder) {
      this.repairColumnStructure({
        sheetId: params.sheetId,
        nextColumns: params.nextColumns,
        reason: 'column_reorder_no_native_handler',
        traceMeta: params.traceMeta
      })
      return
    }
    const replayMoves =
      params.moves && params.moves.length > 0
        ? params.moves
        : nativeMergeSupport.ok
          ? nativeMergeSupport.moves
          : params.moves
    const structuralUnitCount =
      replayMoves?.reduce((total, move) => total + Math.max(0, move.count), 0) ?? replayMoves?.length ?? 0
    if (
      !this.shouldApplyInactiveStructuralGridUpdate({
        sheetId: params.sheetId,
        operationCount: replayMoves?.length ?? 0,
        structuralUnitCount,
        reason: 'column_structure',
        traceMeta: params.traceMeta
      })
    ) {
      applyColumnMetadata(false)
      return
    }
    this.collabDiag('column_reorder_native_replay_queued', {
      sheetId: params.sheetId,
      replayMoveCount: replayMoves?.length ?? 0,
      previousMatchesNext: this.hasMatchingVisibleColumnOrder(previousColumnsForGrid, params.nextColumns),
      hasExplicitMoves: Boolean(params.moves?.length),
      replayBaseStrategy
    })
    queueMicrotask(() => {
      try {
        this.collabDiag('column_reorder_native_replay_start', {
          sheetId: params.sheetId,
          replayMoveCount: replayMoves?.length ?? 0,
          previousMatchesNext: this.hasMatchingVisibleColumnOrder(previousColumnsForGrid, params.nextColumns),
          hasExplicitMoves: Boolean(params.moves?.length),
          replayBaseStrategy
        })
        const gridApplied =
          this.callbacks.applyRemoteColumnReorder?.({
            sheetId: params.sheetId,
            previousColumns: previousColumnsForGrid,
            nextColumns: params.nextColumns,
            moves: replayMoves
          }) ?? false
        let verifiedGridApplied =
          gridApplied && this.verifyActiveSheetColumnStructure(params.sheetId, params.nextColumns)
        let snapshotRetryAttempted = false
        let snapshotRetryGridApplied = false
        const shouldRetryFromSnapshot =
          verifiedGridApplied !== true &&
          snapshotOrderedPreviousColumns != null &&
          !this.hasMatchingVisibleColumnOrder(snapshotOrderedPreviousColumns, previousColumnsForGrid) &&
          !this.hasMatchingVisibleColumnOrder(snapshotOrderedPreviousColumns, params.nextColumns)
        if (!verifiedGridApplied && shouldRetryFromSnapshot) {
          snapshotRetryAttempted = true
          snapshotRetryGridApplied =
            this.callbacks.applyRemoteColumnReorder?.({
              sheetId: params.sheetId,
              previousColumns: snapshotOrderedPreviousColumns,
              nextColumns: params.nextColumns,
              moves: replayMoves
            }) ?? false
          verifiedGridApplied =
            snapshotRetryGridApplied && this.verifyActiveSheetColumnStructure(params.sheetId, params.nextColumns)
        }
        this.collabDiag('column_reorder_native_replay_result', {
          sheetId: params.sheetId,
          gridApplied,
          verifiedGridApplied,
          replayMoveCount: replayMoves?.length ?? 0,
          snapshotRetryAttempted,
          snapshotRetryGridApplied,
          replayBaseStrategy
        })
        if (verifiedGridApplied) {
          this.setConfirmedPhysicalColumnOrder(params.sheetId, params.nextColumns)
          // Native grid move already refreshed the active-sheet conversion context.
          applyColumnMetadata(true)
        } else {
          this.repairColumnStructure({
            sheetId: params.sheetId,
            nextColumns: params.nextColumns,
            reason: 'column_reorder_structural_repair',
            confirmedPhysicalOrderStrategy: 'clear',
            allowValueOnlyGridRepair: params.expectDeferredStyleReplay === true,
            preserveStagedDirectPaint: params.expectDeferredStyleReplay === true,
            pendingLocalFilterPolicy: 'server_authoritative_repair',
            traceMeta: params.traceMeta
          })
        }
        this.traceEvent({
          source: 'client',
          stage: verifiedGridApplied
            ? 'client_collab_column_reorder_grid_moves_applied'
            : 'client_collab_column_reorder_grid_moves_failed',
          severity: verifiedGridApplied ? 'info' : 'warning',
          traceSessionId: params.traceMeta?.traceSessionId,
          traceId: params.traceMeta?.traceId,
          batchId: params.traceMeta?.batchId,
          payload: {
            sheetId: params.sheetId,
            gridApplied: verifiedGridApplied,
            nativeGridApplied: gridApplied,
            replayMoveCount: replayMoves?.length ?? 0,
            snapshotRetryAttempted,
            snapshotRetryGridApplied,
            previousVisibleOrder: visibleColumnsInGridOrder(previousColumnsForGrid).map(column => column.id),
            nextVisibleOrder: visibleColumnsInGridOrder(params.nextColumns).map(column => column.id)
          }
        })
      } catch (error) {
        this.collabDiag('column_reorder_native_replay_error', {
          sheetId: params.sheetId,
          replayMoveCount: replayMoves?.length ?? 0,
          errorMessage: error instanceof Error ? error.message.slice(0, 160) : String(error ?? 'unknown').slice(0, 160)
        })
        throw error
      } finally {
        if (params.expectDeferredStyleReplay) {
          this.flushDeferredSetStyleForSheet(params.sheetId)
        }
      }
    })
  }

  private applyStructuralTransactionGridSync(params: {
    sheetId: string
    rows: ViewerRow[]
    dirtyRegions: SpreadsheetDeltaDirtyRegion[]
    batch: SpreadsheetCommittedBatchEnvelope
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string }
  }): void {
    const gridNativeClearOpTypes = new Set(['clear_all', 'clear_format'])
    const isGridNativeClearOnlyBatch =
      params.batch.operations.length > 0 &&
      params.batch.operations.every(operation => gridNativeClearOpTypes.has(operation.type))
    if (isGridNativeClearOnlyBatch) {
      this.collabDiag('structural_grid_sync_skip_grid_native_clear', {
        sheetId: params.sheetId,
        operationTypes: params.batch.operations.map(operation => operation.type).join(',')
      })
      this.traceEvent({
        source: 'client',
        stage: 'client_committed_batch_structural_grid_sync_skipped',
        traceSessionId: params.traceMeta?.traceSessionId,
        traceId: params.traceMeta?.traceId,
        batchId: params.traceMeta?.batchId,
        payload: {
          sheetId: params.sheetId,
          reason: 'grid_native_clear_already_applied',
          operationTypes: params.batch.operations.map(operation => operation.type)
        }
      })
      return
    }

    const backendRegions =
      params.batch.dirtyRegions && params.batch.dirtyRegions.length > 0
        ? this.authoritativeRegionsFromBackendDirtyRegions(params.batch.dirtyRegions, params.rows, params.sheetId)
        : []
    const plannedDeltaRegions =
      params.dirtyRegions.length > 0 ? params.dirtyRegions : planCommittedBatchDirtyRegions(params.batch)
    const fallbackRegion = this.authoritativeRegionFromDirtyRegions(plannedDeltaRegions, params.rows, params.sheetId)
    let regions = backendRegions.length > 0 ? backendRegions : fallbackRegion ? [fallbackRegion] : []
    const hasRowStructuralOp = params.batch.operations.some(operation =>
      LIVE_ROW_STRUCTURAL_OP_TYPES.has(operation.type)
    )
    const supportedNormalOpsOnly = params.batch.operations.every(operation =>
      ['set_cell', 'clear_cell', 'set_range', 'set_style', 'add_rows', 'insert_rows_at'].includes(operation.type)
    )
    if (regions.length === 0 && supportedNormalOpsOnly) {
      const operationFallbackRegion = this.resolveAuthoritativeSheetRegionFromBatchOperations(
        params.sheetId,
        params.batch,
        params.rows
      )
      if (operationFallbackRegion) {
        regions = [operationFallbackRegion]
      }
    }
    const backendRepairClassification =
      backendRegions.length > 0
        ? classifyBackendDirtyRegionReapply({
            sheetId: params.sheetId,
            regions: backendRegions,
            rows: params.rows
          })
        : null
    if (regions.length > 0) {
      const target = regions.length === 1 ? regions[0] : regions
      this.callbacks.forceGridReapply?.(params.sheetId, target, {
        clearAllSignatures: false,
        preferBulk: true,
        reason:
          backendRepairClassification?.reason ??
          (regions.length > 1 ? 'multi_region_authoritative_reapply' : 'dirty_regions_fallback_planned'),
        pendingLocalFilterPolicy: backendRepairClassification?.pendingLocalFilterPolicy
      })
    } else if (supportedNormalOpsOnly) {
      this.collabDiag('dirty_regions_missing_for_supported_op', {
        sheetId: params.sheetId,
        operationTypes: params.batch.operations.map(operation => operation.type).join(',')
      })
      this.requestStaleDataOpCatchUp({
        sheetId: params.sheetId,
        sinceVersion: Math.max(0, params.batch.baseVersion),
        incomingVersion: params.batch.appliedVersion,
        knownVersion: this.getKnownSheetVersion(params.sheetId),
        operationType: 'batch_operations',
        stateCovered: false,
        traceMeta: params.traceMeta
      })
      return
    } else {
      const clearAllSignatures = hasRowStructuralOp
      this.callbacks.forceGridReapply?.(params.sheetId, null, {
        clearAllSignatures,
        preferBulk: true,
        ...(clearAllSignatures
          ? { allowFullGridReapply: true, reason: 'structural_transaction_sync_full' }
          : { reason: 'structural_transaction_sync_bounded' })
      })
    }
    this.traceEvent({
      source: 'client',
      stage: 'client_committed_batch_structural_grid_sync',
      traceSessionId: params.traceMeta?.traceSessionId,
      traceId: params.traceMeta?.traceId,
      batchId: params.traceMeta?.batchId,
      payload: {
        sheetId: params.sheetId,
        regions,
        backendRegionCount: backendRegions.length,
        operationTypes: params.batch.operations.map(operation => operation.type)
      }
    })
  }

  private resolveAuthoritativeSheetRegionFromBatchOperations(
    sheetId: string,
    batch: SpreadsheetCommittedBatchEnvelope,
    rows: ViewerRow[]
  ): AuthoritativeGridRegion | null {
    const extraRowIndexes: number[] = []
    for (const operation of batch.operations) {
      if (operation.type === 'add_rows' || operation.type === 'insert_rows_at') {
        const payload = operation.data
        const createdRows = Array.isArray(payload.rows) ? (payload.rows as Array<Record<string, unknown>>) : []
        for (const row of createdRows) {
          const gridRowIndex = Number(row._gridRowIndex)
          if (Number.isFinite(gridRowIndex) && gridRowIndex >= 0) {
            extraRowIndexes.push(Math.trunc(gridRowIndex))
          }
        }
        if (operation.type === 'insert_rows_at') {
          const insertAt = Number(payload.insertAt)
          const count = Math.max(createdRows.length, 1)
          if (Number.isFinite(insertAt) && insertAt >= 0) {
            for (let offset = 0; offset < count; offset += 1) {
              extraRowIndexes.push(Math.trunc(insertAt) + offset)
            }
          }
        }
      }
    }
    return this.resolveAuthoritativeSheetRegion(sheetId, rows, extraRowIndexes)
  }

  private resolveAuthoritativeRowIndexBounds(rows: ViewerRow[]): { minRow: number; maxRow: number } | null {
    if (rows.length === 0) return null
    let minRow = Number.POSITIVE_INFINITY
    let maxRow = -1
    for (let index = 0; index < rows.length; index += 1) {
      const slot = getViewerRowVisualIndex(rows[index], index)
      minRow = Math.min(minRow, slot)
      maxRow = Math.max(maxRow, slot)
    }
    if (!Number.isFinite(minRow) || maxRow < 0) return null
    return { minRow, maxRow }
  }

  private resolveAuthoritativeSheetRegion(
    sheetId: string,
    rows: ViewerRow[],
    extraRowIndexes: number[] = []
  ): AuthoritativeGridRegion | null {
    const visibleColumns = this.getColumnsForSheet(sheetId).filter(column => column.isVisible !== false)
    const rowBounds = this.resolveAuthoritativeRowIndexBounds(rows)
    if (!rowBounds || visibleColumns.length === 0) return null
    let maxRow = rowBounds.maxRow
    for (const rowIndex of extraRowIndexes) {
      if (!Number.isFinite(rowIndex)) continue
      maxRow = Math.max(maxRow, Math.trunc(rowIndex))
    }
    return {
      minRow: 0,
      maxRow,
      minCol: 0,
      maxCol: visibleColumns.length - 1
    }
  }

  private clampAuthoritativeRegion(sheetId: string, region: AuthoritativeGridRegion): AuthoritativeGridRegion | null {
    const visibleColumns = this.getColumnsForSheet(sheetId).filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0) return null
    const lastCol = visibleColumns.length - 1
    const maxColExceedsVisible = region.maxCol >= lastCol || region.maxCol >= Number.MAX_SAFE_INTEGER / 2
    return {
      minRow: Math.max(0, region.minRow),
      maxRow: Math.max(region.minRow, region.maxRow),
      minCol: Math.max(0, Math.min(region.minCol, lastCol)),
      maxCol: maxColExceedsVisible ? lastCol : Math.max(region.minCol, Math.min(region.maxCol, lastCol))
    }
  }

  private authoritativeRegionsFromBackendDirtyRegions(
    dirtyRegions: SpreadsheetDirtyRegion[],
    rows: ViewerRow[],
    sheetId: string
  ): AuthoritativeGridRegion[] {
    return resolveBackendDirtyRegionsToAuthoritativeRegions({
      dirtyRegions,
      columns: this.getColumnsForSheet(sheetId),
      rows,
      clampRegion: region => this.clampAuthoritativeRegion(sheetId, region)
    })
  }

  private authoritativeRegionFromDirtyRegions(
    dirtyRegions: SpreadsheetDeltaDirtyRegion[],
    rows: ViewerRow[],
    sheetId: string
  ): AuthoritativeGridRegion | null {
    if (dirtyRegions.length === 0) return null
    const visibleColumns = this.getColumnsForSheet(sheetId).filter(column => column.isVisible !== false)
    const rowBounds = this.resolveAuthoritativeRowIndexBounds(rows)
    if (!rowBounds || visibleColumns.length === 0) return null

    if (dirtyRegions.some(region => region.type === 'entireUsedRange' || region.type === 'entireSheetStructure')) {
      return this.resolveAuthoritativeSheetRegion(sheetId, rows)
    }

    const rectOnly = dirtyRegions.every(region => region.type === 'rect')
    if (!rectOnly) {
      let minRow = rowBounds.minRow
      let maxRow = rowBounds.maxRow
      let minCol = visibleColumns.length - 1
      let maxCol = 0
      for (const dirty of dirtyRegions) {
        if (dirty.type === 'rowsFrom') {
          minRow = Math.min(minRow, dirty.startRow)
          maxRow = Math.max(maxRow, rowBounds.maxRow)
        }
        if (dirty.type === 'colsFrom') {
          minCol = Math.min(minCol, dirty.startCol)
          maxCol = visibleColumns.length - 1
        }
      }
      return this.clampAuthoritativeRegion(sheetId, {
        minRow,
        maxRow,
        minCol,
        maxCol
      })
    }
    let region: AuthoritativeGridRegion | null = null
    for (const dirty of dirtyRegions) {
      if (dirty.type !== 'rect') continue
      region = region
        ? {
            minRow: Math.min(region.minRow, dirty.minRow),
            maxRow: Math.max(region.maxRow, dirty.maxRow),
            minCol: Math.min(region.minCol, dirty.minCol),
            maxCol: Math.max(region.maxCol, dirty.maxCol)
          }
        : { minRow: dirty.minRow, maxRow: dirty.maxRow, minCol: dirty.minCol, maxCol: dirty.maxCol }
    }
    return region ? this.clampAuthoritativeRegion(sheetId, region) : null
  }

  private buildDirtyRegionForMoveRowSlots(
    targetSheetId: string,
    sourceStartGridRowIndex: number,
    count: number,
    destinationGridRowIndex: number
  ): AuthoritativeGridRegion | null {
    const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0) return null
    const safeCount = Math.max(0, Math.trunc(count))
    if (safeCount <= 0) return null
    const sourceEnd = sourceStartGridRowIndex + safeCount - 1
    const destinationEnd = destinationGridRowIndex + safeCount - 1
    const minRow = Math.min(sourceStartGridRowIndex, destinationGridRowIndex)
    let maxRow = Math.max(sourceEnd, destinationEnd)
    if (destinationGridRowIndex > sourceEnd) {
      maxRow = Math.max(maxRow, destinationGridRowIndex - 1)
    }
    return {
      minRow,
      maxRow,
      minCol: 0,
      maxCol: visibleColumns.length - 1
    }
  }

  private enrichCommittedBatchWithGridCoordinates(
    batch: SpreadsheetCommittedBatchEnvelope,
    rowsForCoordinateResolution?: ViewerRow[]
  ): SpreadsheetCommittedBatchEnvelope {
    return {
      ...batch,
      operations: batch.operations.map(operation =>
        this.enrichCommittedOperationWithGridCoordinates(batch.sheetId, operation, rowsForCoordinateResolution)
      )
    }
  }

  private enrichCommittedOperationWithGridCoordinates(
    sheetId: string,
    operation: SpreadsheetCommittedOperation,
    rowsForCoordinateResolution?: ViewerRow[]
  ): SpreadsheetCommittedOperation {
    const data = { ...operation.data }
    const assignGridCoords = (target: Record<string, unknown>) => {
      const existingRow = toNumberOrNull(target.row) ?? toNumberOrNull(target.rowIndex)
      const existingCol = toNumberOrNull(target.col) ?? toNumberOrNull(target.colIndex)
      if (existingRow != null && existingCol != null) {
        return
      }
      const rowId = String(target.rowId ?? '')
      const column = String(target.columnName ?? target.column ?? '')
      if (!rowId || !column) return
      const { rowIndex, colIndex } = this.resolveCoordinates(column, rowId, sheetId, rowsForCoordinateResolution)
      if (rowIndex == null || colIndex == null) return
      target.row = rowIndex
      target.col = colIndex
    }

    if (operation.type === 'set_cell' || operation.type === 'clear_cell') {
      assignGridCoords(data)
      return { ...operation, data }
    }

    if (operation.type === 'set_range' || operation.type === 'set_style') {
      const cells = Array.isArray(data.cells) ? (data.cells as Array<Record<string, unknown>>) : []
      if (cells.length === 0) return operation
      return {
        ...operation,
        data: {
          ...data,
          cells: cells.map(cell => {
            const nextCell = { ...cell }
            assignGridCoords(nextCell)
            return nextCell
          })
        }
      }
    }

    return operation
  }

  private collectIdentityBasedCellChanges(batch: SpreadsheetCommittedBatchEnvelope): Array<{
    operationType: string
    payload: Record<string, unknown>
    appliedVersion: number
  }> {
    const changes: Array<{ operationType: string; payload: Record<string, unknown>; appliedVersion: number }> = []
    for (const operation of batch.operations) {
      if (!LIVE_PERSISTED_CELL_OP_TYPES.has(operation.type)) continue
      if (!operation.data || typeof operation.data !== 'object') continue
      changes.push({
        operationType: operation.type,
        payload: operation.data,
        appliedVersion: batch.appliedVersion
      })
    }
    return changes
  }

  private collectAcknowledgedCellKeysFromPersistedChanges(
    changes: Array<{ operationType: string; payload: Record<string, unknown>; appliedVersion: number }>
  ): string[] {
    const keys = new Set<string>()
    for (const change of changes) {
      if (change.operationType === 'set_cell' || change.operationType === 'clear_cell') {
        const rowId = String(change.payload.rowId ?? '')
        const columnName = String(change.payload.columnName ?? change.payload.column ?? '')
        if (rowId && columnName) {
          keys.add(`${rowId}\u0000${columnName}`)
        }
        continue
      }
      if (change.operationType !== 'set_range' && change.operationType !== 'cells_changed') continue
      const cells = Array.isArray(change.payload.cells) ? (change.payload.cells as Array<Record<string, unknown>>) : []
      for (const cell of cells) {
        const rowId = String(cell.rowId ?? '')
        const columnName = String(cell.columnName ?? cell.column ?? '')
        if (rowId && columnName) {
          keys.add(`${rowId}\u0000${columnName}`)
        }
      }
    }
    return Array.from(keys)
  }

  /**
   * Resolve where to paint a remote value on the Univer grid. Prefer wire A1 / explicit row+col
   * (immune to data-array drift); fall back to row identity mapped through `_gridRowIndex`.
   */
  private resolveGridApplyTarget(params: {
    sheetId: string
    rowId: string
    columnKey: string
    cellRef?: unknown
    row?: unknown
    col?: unknown
    dataOverride?: ViewerRow[]
    extraOptions?: ApplyRemoteCellUpdateOptions
  }): { rowIndex: number; colIndex: number; options: ApplyRemoteCellUpdateOptions | undefined } | null {
    const { sheetId, rowId, columnKey, cellRef, row, col, dataOverride, extraOptions } = params
    const targetColumnName = this.resolveColumnName(columnKey, sheetId)
    const identityResolved = this.resolveCoordinates(targetColumnName, rowId, sheetId, dataOverride)
    if (identityResolved.rowIndex != null && identityResolved.colIndex != null && identityResolved.colIndex >= 0) {
      return {
        rowIndex: identityResolved.rowIndex,
        colIndex: identityResolved.colIndex,
        options: this.withTargetSheetApplyOptions(sheetId, extraOptions)
      }
    }

    if (rowId) {
      return null
    }

    const trimmedRef = typeof cellRef === 'string' ? cellRef.trim() : ''
    if (trimmedRef) {
      const a1 = parseA1Reference(trimmedRef)
      if (a1 && a1.row >= 0 && a1.col >= 0) {
        return {
          rowIndex: a1.row,
          colIndex: a1.col,
          options: this.withTargetSheetApplyOptions(sheetId, {
            useSenderA1Row: true,
            ...extraOptions
          })
        }
      }
    }
    const explicitRow = toNumberOrNull(row)
    const explicitCol = toNumberOrNull(col)
    if (explicitRow != null && explicitCol != null) {
      return {
        rowIndex: explicitRow,
        colIndex: explicitCol,
        options: this.withTargetSheetApplyOptions(sheetId, {
          useSenderA1Row: true,
          ...extraOptions
        })
      }
    }

    return null
  }

  private resolveCoordinates(
    columnKey: string,
    remoteRowId: string,
    sheetId = this.callbacks.getActiveSheetId(),
    dataOverride?: ViewerRow[]
  ): { rowIndex: number | undefined; colIndex: number | undefined } {
    const columns = this.getColumnsForSheet(sheetId)
    const data = dataOverride ?? this.getSheetData(sheetId)
    const ctx = createUniverConversionContext(columns, data)
    const rowIndex = resolveViewerRowIndexForRemoteId(data, remoteRowId)
    let colIndex = ctx.columnIdToIndex.get(columnKey)
    if (colIndex === undefined) {
      const visibleColumns = columns.filter(c => c.isVisible !== false)
      const idx = visibleColumns.findIndex(c => c.id === columnKey || c.name === columnKey)
      colIndex = idx >= 0 ? idx : undefined
    }
    return { rowIndex, colIndex }
  }

  private applyDataModelUpdates(
    updatesByRowId: Map<string, Record<string, unknown>>,
    targetSheetId: string,
    options?: {
      syncGrid?: boolean
      suppressAuthoritativeDataSyncToken?: boolean
      sessionDiffProjectionMode?: 'allow' | 'skip'
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
      authoritativeApplyMeta?: SpreadsheetBulkRemoteApplyMeta | null
    }
  ): DataModelApplyResult {
    const changedKeys = new Set<string>()
    const matchedRowIds = new Set<string>()
    const currentData = this.getSheetData(targetSheetId)
    const findUpdatesForRow = (row: ViewerRow): { key: string; updates: Record<string, unknown> } | undefined => {
      const keysToTry: string[] = []
      const canonical = getCanonicalRowId(row)
      if (canonical) keysToTry.push(canonical)
      for (const v of [row._id, row.id, row._rowUuid]) {
        if (v == null) continue
        const s = String(v)
        if (s && !keysToTry.includes(s)) keysToTry.push(s)
      }
      for (const k of keysToTry) {
        const u = updatesByRowId.get(k)
        if (u) return { key: k, updates: u }
      }
      return undefined
    }
    const applyUpdatesToRow = (
      row: ViewerRow,
      matched: { key: string; updates: Record<string, unknown> }
    ): ViewerRow => {
      const canonical = getCanonicalRowId(row)
      matchedRowIds.add(matched.key)
      let nextRow = row
      let hasChange = false
      for (const [col, val] of Object.entries(matched.updates)) {
        const normalized = this.normalizeRowColumnValue(nextRow, col, val, targetSheetId)
        nextRow = normalized.nextRow
        if (normalized.changed) {
          changedKeys.add(`${canonical}:${this.resolveColumnName(col, targetSheetId)}`)
          hasChange = true
        }
      }
      if (!hasChange) return row
      return { ...nextRow, _updatedAt: new Date().toISOString() }
    }
    const nextLocal = currentData.map(row => {
      const matched = findUpdatesForRow(row)
      if (!matched) return row
      return applyUpdatesToRow(row, matched)
    })
    if (changedKeys.size > 0) {
      this.commitSheetData(targetSheetId, nextLocal, {
        persisted: true,
        syncGrid: options?.syncGrid,
        ...(options?.suppressAuthoritativeDataSyncToken ? { suppressAuthoritativeDataSyncToken: true } : {}),
        ...(options?.sessionDiffProjectionMode ? { sessionDiffProjectionMode: options.sessionDiffProjectionMode } : {}),
        ...(options?.authoritativeGridRegion ? { authoritativeGridRegion: options.authoritativeGridRegion } : {}),
        ...(options?.authoritativeApplyMeta ? { authoritativeApplyMeta: options.authoritativeApplyMeta } : {})
      })
    }
    return {
      changedKeys,
      matchedRowCount: matchedRowIds.size,
      requestedRowCount: updatesByRowId.size
    }
  }
}
