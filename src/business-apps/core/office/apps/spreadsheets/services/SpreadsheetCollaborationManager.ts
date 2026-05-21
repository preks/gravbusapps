// Centralized spreadsheet collaboration logic: emit, receive, echo suppression, operation queuing.

import type { DocumentOperation } from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import type {
  SpreadsheetBulkRemoteCellItem,
  SpreadsheetCollaborationCallbacks,
  SpreadsheetFeatureOperationPayload,
  SpreadsheetFeatureOperationType,
  SpreadsheetRemoteCellUpdateOptions as ApplyRemoteCellUpdateOptions,
  SpreadsheetRemoteDimensionsPayload as CellDimensionsPayload,
  SpreadsheetReplayDelta as DeltaChange,
  SpreadsheetStylePatch
} from '../core'
import { parseA1Reference, sheetDeltaRequiresFullSnapshot } from '../core'
import type { SpreadsheetColumn } from '../types'
import { createUniverConversionContext } from '../utils/univerAdapter'
import type { AuthoritativeGridRegion } from '../utils/spreadsheetAuthoritativeRegion'
import { SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH } from '../utils/spreadsheetBulkRemoteConstants'
import { applyMoveCellRangeTransform } from '../utils/applyMoveCellRangeTransform'
import { mergeInsertedRowsAtIndex } from '../utils/spreadsheetInsertRowsAt'
import { findViewerRowVisualIndex, sortRowsByCanonicalVisualOrder } from '../utils/spreadsheetPeerRowHydration'
import {
  applyDeleteRowSlotsTransform,
  applyInsertRowSlotsTransform,
  applyMoveRowSlotsTransform
} from '../utils/spreadsheetRowSlotTransforms'
import { getCanonicalRowId, rowMatchesRemoteId, type ViewerRow } from '../utils/spreadsheetRowIdentity'
import type { SpreadsheetTraceEventInput } from './spreadsheetDiagnostics'

/**
 * True when `remoteRowId` from the wire (persisted / backend UUID from emit) identifies this row.
 * Emit uses the first UUID among _id, _rowUuid, id; canonical row id prefers _id ?? id. When _id is a
 * non-UUID client id and the backend UUID lives on id or _rowUuid, canonical-only matching would miss.
 */
const rowMatchesRemoteRowId = rowMatchesRemoteId

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
  operation: { type: string; data?: unknown; broadcastOnly?: boolean; _clientOpId?: string }
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
}

type DeferredSetStyleOperation = {
  data: unknown
  traceMeta?: DiagnosticsTraceMeta
  fallbackSheetId?: string
}

type DataModelApplyResult = {
  changedKeys: Set<string>
  matchedRowCount: number
  materializedRowCount: number
  requestedRowCount: number
}

const getDiagnosticsTraceMeta = (data: unknown): DiagnosticsTraceMeta => {
  if (!data || typeof data !== 'object') return {}
  const record = data as Record<string, unknown>
  return {
    traceSessionId: typeof record.traceSessionId === 'string' ? record.traceSessionId : undefined,
    traceId: typeof record.traceId === 'string' ? record.traceId : undefined,
    batchId: typeof record.batchId === 'string' ? record.batchId : undefined
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

  constructor(callbacks: CollaborationCallbacks) {
    this.callbacks = callbacks
  }

  /** Debug-only: counts / reasons only (gated by {@link CollaborationCallbacks.isCollabDiagEnabled}). */
  private collabDiag(event: string, meta?: Record<string, number | string | boolean | undefined>): void {
    const gate = this.callbacks.isCollabDiagEnabled
    if (typeof gate !== 'function' || !gate()) return
    this.collabDiagSeq += 1
    this.callbacks.onCollabDiagnostic?.(event, { seq: this.collabDiagSeq, ...meta })
  }

  private traceEvent(event: SpreadsheetTraceEventInput): void {
    this.callbacks.onDiagnosticsTraceEvent?.(event)
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
    this.callbacks.markSheetNeedsGridMaterialization?.(sheetId, reason)
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
    this.lastKnownVersion = Math.trunc(version)
  }

  getLastKnownVersion(): number {
    return this.lastKnownVersion
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

    this.handleBatchOperations(
      changes.map(change => this.operationFromDeltaChange(change, targetSheetId)),
      normalizedVersion,
      targetSheetId,
      traceMeta
    )

    if (normalizedVersion == null) return
    if (targetSheetId === this.callbacks.getActiveSheetId()) {
      this.lastKnownVersion = Math.max(this.lastKnownVersion, normalizedVersion)
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
      if (knownVersion != null && normalizedVersion > knownVersion + 1) {
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
          this.callbacks.requestSheetCatchUp(opSheetId, 'version_gap', {
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
        if (requestCatchUp && staleCriticalCategory) {
          const sinceVersion = Math.max(0, normalizedVersion - 1)
          this.collabDiag('collab_receive_stale_data_op_catchup_requested', {
            opType: operation.type,
            sheetId: opSheetId,
            incomingVersion: normalizedVersion,
            knownVersion,
            sinceVersion,
            staleCategory: staleCriticalCategory
          })
          this.traceEvent({
            source: 'client',
            stage: 'client_collab_stale_data_op_catchup_requested',
            severity: 'warning',
            traceSessionId: traceMeta.traceSessionId,
            traceId: traceMeta.traceId,
            batchId: traceMeta.batchId,
            operationType: operation.type,
            version: normalizedVersion,
            payload: {
              reason: 'stale_version_data_op',
              staleCategory: staleCriticalCategory,
              knownVersion,
              sinceVersion,
              incomingVersion: normalizedVersion
            }
          })
          requestCatchUp(opSheetId, 'stale_version_data_op', {
            sinceVersion,
            incomingVersion: normalizedVersion
          })
          return
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
      const d = operation.data as CellDimensionsPayload | undefined
      if (d?.sheetId && d.sheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: d.sheetId,
          activeSheetId
        })
        this.markGridMaterializationNeeded(d.sheetId, 'dimension_sync')
        this.callbacks.scheduleRemoteStructuralResync(d.sheetId)
        return
      }
      if (d?.sheetId === activeSheetId) {
        this.callbacks.applyRemoteDimensions?.(d)
      }
      return
    }

    if (operation.type === 'column_update') {
      this.updateVersion(operation.data, version)
      this.callbacks.onRemoteColumnUpdate?.(operation.data as Record<string, unknown>)
      return
    }

    if (
      (operation.type === 'columns_reorder' || operation.type === 'column_reorder') &&
      hasFullColumnObjectsForRemoteReorder(operation.data)
    ) {
      this.callbacks.onRemoteColumnUpdate?.((operation.data as Record<string, unknown>) ?? {})
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

    this.updateVersion(operation.data, version)
    if (opSheetId && STRUCTURAL_OPS.has(operation.type) && !LIVE_STRUCTURAL_OP_TYPES.has(operation.type)) {
      if (opSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: opSheetId,
          activeSheetId
        })
        this.markGridMaterializationNeeded(opSheetId, operation.type)
      }
      this.callbacks.scheduleRemoteStructuralResync(opSheetId, { immediate: true })
    }

    if (operation.type === 'batch_operations') {
      const d = operation.data as
        | {
            sheetId?: string
            operations?: Array<{ type?: string; data?: unknown }>
          }
        | undefined
      if (!d?.sheetId || !Array.isArray(d.operations) || d.operations.length === 0) {
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
      if (d.sheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: d.sheetId,
          activeSheetId
        })
        this.markGridMaterializationNeeded(d.sheetId, 'batch_operations')
      }
      this.traceEvent({
        source: 'client',
        stage: 'client_collab_batch_received',
        traceSessionId: traceMeta.traceSessionId,
        traceId: traceMeta.traceId,
        batchId: traceMeta.batchId,
        operationType: operation.type,
        version: typeof version === 'number' ? version : null,
        payload: {
          sheetId: d.sheetId,
          operationCount: d.operations.length,
          operations: d.operations
        }
      })
      this.handleBatchOperations(d.operations, version, d.sheetId, traceMeta, {
        isLocalEcho: isSameUser
      })
      return
    }

    if (operation.type === 'row_update') {
      if (opSheetId && opSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: opSheetId,
          activeSheetId
        })
      }
      this.handleRowUpdate(operation.data, opSheetId ?? activeSheetId)
      return
    }

    if (LIVE_PERSISTED_CELL_OP_TYPES.has(operation.type)) {
      const targetSheetId = opSheetId ?? activeSheetId
      if (opSheetId && opSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: opSheetId,
          activeSheetId
        })
      }
      this.applyLivePersistedChanges(
        [
          {
            operationType: operation.type,
            payload: (operation.data as Record<string, unknown>) ?? {},
            appliedVersion: typeof version === 'number' ? version : this.lastKnownVersion
          }
        ],
        'single_op',
        'direct_apply',
        targetSheetId
      )
      return
    }

    if (opSheetId && LIVE_ROW_STRUCTURAL_OP_TYPES.has(operation.type)) {
      if (
        this.applyLiveRowStructuralOperation(operation.type, operation.data, opSheetId, traceMeta, version, {
          isLocalEcho: isSameUser
        })
      ) {
        return
      }
    }

    if (opSheetId && LIVE_STRUCTURAL_OP_TYPES.has(operation.type)) {
      if (opSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: opSheetId,
          activeSheetId
        })
      }
      this.callbacks.scheduleRemoteStructuralResync(
        opSheetId,
        opSheetId === activeSheetId ? { immediate: true } : undefined
      )
      return
    }

    if (operation.type === 'cells_changed') {
      if (opSheetId && opSheetId !== activeSheetId) {
        this.collabDiag('collab_receive_active_sheet_mismatch', {
          opType: operation.type,
          sheetId: opSheetId,
          activeSheetId
        })
      }
      this.handleCellsChanged(operation.data as CellsChangedPayload, 'direct_apply')
      return
    }
  }

  // --- Private: Receiver Handlers ---

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
    if (updatesByRowId.size > 0) {
      const shouldSyncGridFromCommit = mode === 'sync_grid_only' && d.sheetId === this.callbacks.getActiveSheetId()
      this.applyDataModelUpdates(updatesByRowId, d.sheetId, shouldSyncGridFromCommit)
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

    // Prefer A1 cellRef from the sender's Univer grid (same as cursor). Data-array row indices can drift
    // after row insert/delete so resolveCoordinates(rowId, column) may target the wrong sheet cell.
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
      const targetColumnName = this.resolveColumnName(cell.column, d.sheetId)
      const wireValue = hasValue ? cell.value : undefined
      const opts = richOptions(cell)
      const trimmedRef = typeof cell.cellRef === 'string' ? cell.cellRef.trim() : ''
      if (trimmedRef) {
        const a1 = parseA1Reference(trimmedRef)
        if (a1 && a1.row >= 0 && a1.col >= 0) {
          const mergedOpts = this.withTargetSheetApplyOptions(d.sheetId, {
            useSenderA1Row: true,
            ...opts
          })
          gridCellsByPosition.set(`${a1.row}:${a1.col}`, {
            rowIndex: a1.row,
            colIndex: a1.col,
            value: wireValue,
            rowId: remoteRowId,
            options: mergedOpts
          })
          withA1Applied += 1
          continue
        }
        invalidA1Ref += 1
      }
      const { rowIndex, colIndex } = this.resolveCoordinates(targetColumnName, remoteRowId, d.sheetId)
      if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
        const applyOptions = opts
          ? this.withTargetSheetApplyOptions(d.sheetId, opts)
          : this.withTargetSheetApplyOptions(d.sheetId)
        gridCellsByPosition.set(`${rowIndex}:${colIndex}`, {
          rowIndex,
          colIndex,
          value: wireValue,
          rowId: remoteRowId,
          ...(applyOptions ? { options: applyOptions } : {})
        })
        withCoordsApplied += 1
      } else {
        skippedApply += 1
      }
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

  private handleBatchOperations(
    operations: Array<{ type?: string; data?: unknown }>,
    version: number | undefined,
    targetSheetId: string,
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string },
    applyOptions?: { isLocalEcho?: boolean }
  ): void {
    const batchIncludesPersistedCellOps = operations.some(op => {
      const opType = typeof op.type === 'string' ? op.type : ''
      if (!LIVE_PERSISTED_CELL_OP_TYPES.has(opType)) return false
      return Boolean(op.data && typeof op.data === 'object')
    })
    const deferredSetStyleAfterCellBulk: DeferredSetStyleOperation[] = []

    const deltaChanges: DeltaChange[] = []
    let requiresStructuralResync = false
    let requiresColumnResync = false
    let requiresInactiveSheetSnapshotReload = false
    let resyncSheetId: string | null = null
    let liveCellApplyCount = 0

    // Aggregate dimension ops across the batch so a single resize operation
    // that spans N rows/columns becomes one applyRemoteDimensions call
    // (avoids N grid repaints on the receiver).
    const aggregatedColumnData: Record<string, { w?: number; hd?: number }> = {}
    const aggregatedRowData: Record<string, { h?: number; hd?: number }> = {}
    let aggregatedDimensionSheetId: string | null = null
    let hasDimensionUpdates = false

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
        if (
          (type === 'columns_reorder' || type === 'column_reorder') &&
          hasFullColumnObjectsForRemoteReorder(operation.data)
        ) {
          this.callbacks.onRemoteColumnUpdate?.((operation.data as Record<string, unknown>) ?? {})
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
      const activeSheetId = this.callbacks.getActiveSheetId()
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

    if (hasDimensionUpdates && aggregatedDimensionSheetId) {
      this.markGridMaterializationNeeded(aggregatedDimensionSheetId, 'dimensions')
      // Synthesise a minimal CellDimensionsPayload; the grid's
      // applyRemoteDimensions merges with its existing dimension map so we
      // don't need to resend the unchanged keys.
      this.callbacks.applyRemoteDimensions?.({
        sheetId: aggregatedDimensionSheetId,
        defaultColWidth: 0,
        defaultRowHeight: 0,
        columnData: aggregatedColumnData,
        rowData: aggregatedRowData,
        rowHeaderWidth: 0,
        columnHeaderHeight: 0,
        zoomRatio: 0
      })
    }

    if (requiresStructuralResync || requiresColumnResync || requiresInactiveSheetSnapshotReload) {
      this.callbacks.scheduleRemoteStructuralResync(aggregatedDimensionSheetId ?? resyncSheetId ?? targetSheetId, {
        immediate: requiresStructuralResync || requiresColumnResync
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
    this.markGridMaterializationNeeded(targetSheetId, 'clear_all')

    const cellCount = normalizedRanges.reduce((sum, range) => {
      const rowCount = range.endRow - range.startRow + 1
      const colCount = range.endColumn - range.startColumn + 1
      return sum + rowCount * colCount
    }, 0)

    const applyClearAll = this.callbacks.applyRemoteClearAllRange
    if (applyClearAll) {
      applyClearAll(
        { sheetId: targetSheetId, ranges: normalizedRanges },
        {
          traceSessionId: traceMeta?.traceSessionId,
          traceId: traceMeta?.traceId,
          batchId: traceMeta?.batchId,
          operationType: 'clear_all'
        }
      )
    } else {
      for (const range of normalizedRanges) {
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
      rangeCount: normalizedRanges.length,
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
        rangeCount: normalizedRanges.length,
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
      this.callbacks.scheduleRemoteStructuralResync(targetSheetId, {
        immediate: targetSheetId === this.callbacks.getActiveSheetId()
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

    this.applyDataModelUpdates(new Map([[remoteRowId, normalizedUpdates]]), sheetId, sheetId === activeSheetId)

    if (sheetId !== activeSheetId) {
      return
    }

    const applyOpts = this.withTargetSheetApplyOptions(sheetId)
    const rowBulkItems: SpreadsheetBulkRemoteCellItem[] = []
    for (const [columnName, value] of Object.entries(normalizedUpdates)) {
      const { rowIndex, colIndex } = this.resolveCoordinates(columnName, remoteRowId, sheetId)
      if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
        rowBulkItems.push({
          rowIndex,
          colIndex,
          value,
          rowId: remoteRowId,
          ...(applyOpts ? { options: applyOpts } : {})
        })
      }
    }
    if (rowBulkItems.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH && this.callbacks.applyRemoteCellUpdatesBulk) {
      this.callbacks.applyRemoteCellUpdatesBulk(rowBulkItems, { operationType: 'row_update' })
      return
    }
    for (const it of rowBulkItems) {
      if (it.options) {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId, it.options)
      } else {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId)
      }
    }
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
    } else if (operationType === 'move_cell_range') {
      const fromRange = normalizeCellRangeRect(payload.fromRange)
      const toRange = normalizeCellRangeRect(payload.toRange)
      if (fromRange && toRange) {
        const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
        const columnNamesByGridIndex = visibleColumns.map(column =>
          typeof column?.name === 'string' ? column.name : null
        )
        nextRows = applyMoveCellRangeTransform({
          rows: currentRows,
          columnNamesByGridIndex,
          fromRange,
          toRange
        })
        dirtyRegion = this.buildDirtyRegionForCellRangeMove(fromRange, toRange)
      }
    }

    if (!nextRows) return false
    const isMoveCellRange = operationType === 'move_cell_range'
    const isLocalEcho = Boolean(applyOptions?.isLocalEcho)
    this.markGridMaterializationNeeded(targetSheetId, operationType)
    this.commitSheetData(targetSheetId, nextRows, {
      persisted: true,
      syncGrid: isMoveCellRange ? false : targetSheetId === activeSheetId
    })
    if (rowsToApplyToGrid.length > 0) {
      this.applyCreatedRowsToGrid(targetSheetId, nextRows, rowsToApplyToGrid)
    }
    if (targetSheetId === activeSheetId && !isLocalEcho) {
      const dirty =
        dirtyRegion ??
        (rowsToApplyToGrid.length > 0
          ? this.buildDirtyRegionForCreatedRows(targetSheetId, nextRows, rowsToApplyToGrid)
          : null)
      this.callbacks.forceGridReapply?.(targetSheetId, dirty, {
        clearAllSignatures: isMoveCellRange ? false : dirty == null,
        preferBulk: !isMoveCellRange
      })
    }
    if (
      operationType === 'move_row_slots' ||
      operationType === 'insert_row_slots' ||
      (operationType === 'move_cell_range' && !isLocalEcho)
    ) {
      this.callbacks.scheduleRemoteStructuralResync(targetSheetId, {
        immediate: targetSheetId === activeSheetId
      })
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
          this.applyCreatedRowsToGrid(targetSheetId, nextRows, createdRows)
          if (targetSheetId === this.callbacks.getActiveSheetId()) {
            const dirty = isInsertAtOp
              ? this.buildDirtyRegionForInsertedRows(targetSheetId, nextRows, insertAt)
              : this.buildDirtyRegionForCreatedRows(targetSheetId, nextRows, createdRows)
            this.callbacks.forceGridReapply?.(targetSheetId, dirty, {
              clearAllSignatures: dirty == null,
              preferBulk: true
            })
          }
        }
        if (delta.currentVersion > 0) {
          if (targetSheetId === this.callbacks.getActiveSheetId()) {
            this.lastKnownVersion = Math.max(this.lastKnownVersion, delta.currentVersion)
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

  private applyCreatedRowsToGrid(targetSheetId: string, allRows: ViewerRow[], createdRows: ViewerRow[]): void {
    if (createdRows.length === 0) return
    const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0) return

    const items: SpreadsheetBulkRemoteCellItem[] = []
    for (const row of createdRows) {
      const rowIndex = findViewerRowVisualIndex(allRows, row)
      if (rowIndex == null || rowIndex < 0) continue
      const rowId = getCanonicalRowId(row)
      const applyOptions = this.withTargetSheetApplyOptions(targetSheetId)
      for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
        const column = visibleColumns[colIndex]
        const hasNameValue = Object.prototype.hasOwnProperty.call(row, column.name)
        const hasIdValue = Object.prototype.hasOwnProperty.call(row, column.id)
        if (!hasNameValue && !hasIdValue) continue
        const value = hasNameValue ? row[column.name] : row[column.id]
        items.push({ rowIndex, colIndex, value, rowId, options: applyOptions })
      }
    }
    if (items.length === 0) return
    if (items.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH && this.callbacks.applyRemoteCellUpdatesBulk) {
      this.callbacks.applyRemoteCellUpdatesBulk(items, { operationType: 'add_rows_replay' })
      return
    }
    for (const it of items) {
      if (it.options) {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId, it.options)
      } else {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId)
      }
    }
  }

  private buildDirtyRegionForCreatedRows(
    targetSheetId: string,
    allRows: ViewerRow[],
    createdRows: ViewerRow[]
  ): AuthoritativeGridRegion | null {
    const visibleColumns = this.getColumnsForSheet(targetSheetId).filter(column => column.isVisible !== false)
    if (visibleColumns.length === 0) return null
    let minR = Number.POSITIVE_INFINITY
    let maxR = -1
    for (const row of createdRows) {
      const rowIndex = findViewerRowVisualIndex(allRows, row)
      if (rowIndex == null || rowIndex < 0) continue
      minR = Math.min(minR, rowIndex)
      maxR = Math.max(maxR, rowIndex)
    }
    if (!Number.isFinite(minR) || maxR < 0) return null
    return {
      minRow: minR,
      maxRow: maxR,
      minCol: 0,
      maxCol: visibleColumns.length - 1
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
        this.lastKnownVersion = Math.max(this.lastKnownVersion, normalizedVersion)
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
        this.callbacks.scheduleRemoteStructuralResync(undefined, { immediate: true })
        this.lastKnownVersion = delta.currentVersion
        this.callbacks.onVersionUpdate(delta.currentVersion)
        return
      }

      this.replayDeltaChanges(delta.changes, delta.currentVersion, sheetId)
      console.debug('[CollabManager] Reconciled', delta.changes.length, 'ops, version now', delta.currentVersion)
    } catch (error) {
      console.warn('[CollabManager] Delta reconciliation failed, falling back to full resync', error)
      this.callbacks.scheduleRemoteStructuralResync()
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

    for (const change of changes) {
      if (!CELL_OP_TYPES.has(change.operationType)) continue
      const payload = change.payload

      if (change.operationType === 'set_cell') {
        const rowId = String(payload.rowId ?? '')
        const column = String(payload.columnName ?? payload.column ?? '')
        if (!rowId || !column) continue
        const targetColumnName = this.resolveColumnName(column, targetSheetId)
        const existing = updatesByRowId.get(rowId) ?? {}
        existing[targetColumnName] = payload.value
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
          | Array<{ rowId?: string; columnName?: string; column?: string; value?: unknown }>
          | undefined
        if (!Array.isArray(cells)) continue
        for (const cell of cells) {
          const rowId = String(cell.rowId ?? '')
          const column = String(cell.columnName ?? cell.column ?? '')
          if (!rowId || !column) continue
          const targetColumnName = this.resolveColumnName(column, targetSheetId)
          const existing = updatesByRowId.get(rowId) ?? {}
          if (change.operationType === 'set_range') {
            existing[targetColumnName] = Object.prototype.hasOwnProperty.call(cell, 'value') ? cell.value : null
          } else if (Object.prototype.hasOwnProperty.call(cell, 'value')) {
            existing[targetColumnName] = cell.value
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

    const shouldSyncGridFromCommit = mode === 'sync_grid_only' && targetSheetId === this.callbacks.getActiveSheetId()
    const applyResult = this.applyDataModelUpdates(updatesByRowId, targetSheetId, shouldSyncGridFromCommit)
    if (applyResult.matchedRowCount + applyResult.materializedRowCount < applyResult.requestedRowCount) {
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
          materializedRowCount: applyResult.materializedRowCount,
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
        this.callbacks.scheduleRemoteStructuralResync(targetSheetId, {
          immediate: isActiveSheet
        })
      }
    }

    if (mode === 'sync_grid_only') {
      finishPersistedGridApply()
      return
    }

    const bulkItems: {
      rowIndex: number
      colIndex: number
      value: unknown
      rowId: string
      options?: ApplyRemoteCellUpdateOptions
    }[] = []
    for (const [rowId, updates] of updatesByRowId) {
      for (const [columnName, value] of Object.entries(updates)) {
        const { rowIndex, colIndex } = this.resolveCoordinates(columnName, rowId, targetSheetId)
        if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
          bulkItems.push({
            rowIndex,
            colIndex,
            value,
            rowId,
            options: this.withTargetSheetApplyOptions(targetSheetId)
          })
        }
      }
    }
    if (bulkItems.length >= SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH && this.callbacks.applyRemoteCellUpdatesBulk) {
      this.callbacks.applyRemoteCellUpdatesBulk(bulkItems, {
        operationType: changes[0]?.operationType ?? 'cell_delta',
        onApplyComplete: finishPersistedGridApply
      })
      return
    }
    for (const it of bulkItems) {
      if (it.options) {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId, it.options)
      } else {
        this.callbacks.applyRemoteCellUpdate(it.rowIndex, it.colIndex, it.value, it.rowId)
      }
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
    options?: { persisted?: boolean; syncGrid?: boolean }
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

  private resolveCoordinates(
    columnKey: string,
    remoteRowId: string,
    sheetId = this.callbacks.getActiveSheetId()
  ): { rowIndex: number | undefined; colIndex: number | undefined } {
    const columns = this.getColumnsForSheet(sheetId)
    const data = this.getSheetData(sheetId)
    const ctx = createUniverConversionContext(columns, data)
    let rowIndex = ctx.rowIdToIndex.get(remoteRowId)
    if (rowIndex === undefined) {
      const idx = data.findIndex(row => rowMatchesRemoteRowId(row, remoteRowId))
      if (idx >= 0) rowIndex = idx
    }
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
    syncGrid: boolean
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
    const nextLocal = currentData.map(row => {
      const canonical = getCanonicalRowId(row)
      const matched = findUpdatesForRow(row)
      if (!matched) return row
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
    })
    if (changedKeys.size > 0) {
      this.commitSheetData(targetSheetId, nextLocal, {
        persisted: true,
        syncGrid
      })
    }
    return {
      changedKeys,
      matchedRowCount: matchedRowIds.size,
      materializedRowCount: 0,
      requestedRowCount: updatesByRowId.size
    }
  }
}
