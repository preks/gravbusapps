// Centralized spreadsheet collaboration logic: emit, receive, echo suppression, operation queuing.

import type { DocumentOperation } from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import type { ApplyRemoteCellUpdateOptions, CellDimensionsPayload } from '../components/UniverSheetGrid'
import type { SpreadsheetColumn } from '../types'
import { createUniverConversionContext, parseA1Reference } from '../utils/univerAdapter'

type ViewerRow = Record<string, unknown>

const getCanonicalRowId = (row: ViewerRow): string => {
  const idField = row._id ?? row.id
  if (idField != null) {
    const s = typeof idField === 'number' ? String(idField) : (idField as string)
    if (s) return s
  }
  const rowUuid = row._rowUuid
  if (typeof rowUuid === 'string' && rowUuid) return rowUuid
  return ''
}

/**
 * True when `remoteRowId` from the wire (persisted / backend UUID from emit) identifies this row.
 * Emit uses the first UUID among _id, _rowUuid, id; canonical row id prefers _id ?? id. When _id is a
 * non-UUID client id and the backend UUID lives on id or _rowUuid, canonical-only matching would miss.
 */
const rowMatchesRemoteRowId = (row: ViewerRow, remoteRowId: string): boolean => {
  if (!remoteRowId) return false
  if (getCanonicalRowId(row) === remoteRowId) return true
  return [row._id, row.id, row._rowUuid].some(v => v != null && String(v) === remoteRowId)
}

export interface CellsChangedCell {
  rowId: string
  column: string
  value: unknown
  cellRef?: string
}

export interface CellsChangedPayload {
  sheetId: string
  cells: CellsChangedCell[]
}

export interface DeltaChange {
  operationType: string
  payload: Record<string, unknown>
  appliedVersion: number
}

export interface DeltaResponse {
  currentVersion: number
  changes: DeltaChange[]
  requiresSnapshot: boolean
}

export interface CollaborationCallbacks {
  getActiveSheetId: () => string
  getColumns: () => SpreadsheetColumn[]
  getLocalSheetData: () => ViewerRow[]
  /**
   * Resolve backend row ID from UI row ID.
   * @param uiRowId - The row ID from the UI/Univer context
   * @param univerRow - Optional row index from Univer grid (used as fallback when row ID lookup fails)
   */
  getBackendRowIdForUiRowId: (uiRowId: string, univerRow?: number) => string | undefined
  commitLocalSheetData: (data: ViewerRow[], options?: { persisted?: boolean }) => void
  applyRemoteCellUpdate: (
    rowIndex: number,
    colIndex: number,
    value: unknown,
    rowId?: string,
    options?: ApplyRemoteCellUpdateOptions
  ) => void
  applyRemoteDimensions?: (payload: CellDimensionsPayload) => void
  onVersionUpdate: (version: number) => void
  scheduleSheetVersionRefreshFromApi: () => void
  scheduleRemoteStructuralResync: () => void
  onRemoteColumnUpdate?: (data: Record<string, unknown>) => void
  fetchChangesSince?: (sheetId: string, sinceVersion: number) => Promise<DeltaResponse>
  /** When set, fast-path collaboration diagnostics (only runs if this returns true). */
  isCollabDiagEnabled?: () => boolean
  /** Safe diagnostics only (counts, ids, reasons) — never cell values or tokens. */
  onCollabDiagnostic?: (event: string, meta?: Record<string, number | string | boolean | undefined>) => void
  /** Called when offline pending op queue was trimmed (possible loss). */
  onPendingQueueTrimmed?: (droppedCount: number) => void
}

const MAX_PENDING_OPS = 200

export type CollaborationOperation = {
  userId: string
  userName: string
  operation: { type: string; data?: unknown; broadcastOnly?: boolean }
  version?: number
  timestamp: number
}

const STRUCTURAL_OPS = new Set(['row_add', 'row_delete', 'column_add', 'column_delete', 'columns_reorder'])

const STRUCTURAL_OP_TYPES = new Set(['add_rows', 'delete_rows'])
const CELL_OP_TYPES = new Set(['set_cell', 'set_range', 'clear_cell', 'cells_changed'])
const LIVE_PERSISTED_CELL_OP_TYPES = new Set(['set_cell', 'set_range', 'clear_cell'])
const LIVE_STRUCTURAL_OP_TYPES = new Set(['row_add', 'row_delete', 'add_rows', 'delete_rows'])

export class SpreadsheetCollaborationManager {
  private callbacks: CollaborationCallbacks
  private emitFn: ((op: DocumentOperation) => void) | null = null
  private emitCursorFn: ((pos: { path?: string[] }) => void) | null = null
  private connected = false
  private joined = false
  private pendingOps: DocumentOperation[] = []
  private pendingCursor: { path?: string[] } | null = null
  private currentUserId: string | null = null
  private lastKnownVersion = 0
  private reconciling = false
  private collabDiagSeq = 0

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
    this.lastKnownVersion = Math.max(this.lastKnownVersion, version)
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId ? String(userId) : null
  }

  // --- Sender ---

  /** Compatibility no-op: spreadsheet cell writes must stay on HTTP batch paths. */
  tryFlushDeferredCellEmits(): void {}

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

  handleAckFailure(op: DocumentOperation): void {
    if ((op as DocumentOperation & { _retried?: boolean })._retried) return
    const tagged = { ...op, _retried: true } as DocumentOperation & { _retried: boolean }
    this.pendingOps.push(tagged)
    if (this.connected && this.joined) {
      this.flushPendingOps()
    }
  }

  // --- Receiver ---

  handleOperation(payload: CollaborationOperation): void {
    const { operation, version } = payload
    const activeSheetId = this.callbacks.getActiveSheetId()

    if (operation.type === 'dimension_sync') {
      const d = operation.data as CellDimensionsPayload | undefined
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

    const opSheetId = this.getSheetIdFromData(operation.data)
    this.updateVersion(operation.data, version)
    if (
      opSheetId === activeSheetId &&
      STRUCTURAL_OPS.has(operation.type) &&
      !LIVE_STRUCTURAL_OP_TYPES.has(operation.type)
    ) {
      this.callbacks.scheduleRemoteStructuralResync()
    }

    if (operation.type === 'batch_operations') {
      const d = operation.data as
        | {
            sheetId?: string
            operations?: Array<{ type?: string; data?: unknown }>
          }
        | undefined
      if (!d?.sheetId || d.sheetId !== activeSheetId || !Array.isArray(d.operations) || d.operations.length === 0) {
        this.collabDiag('collab_receive_skipped', { reason: 'invalid_batch_ops' })
        return
      }
      this.handleBatchOperations(d.operations, version)
      return
    }

    if (operation.type === 'row_update') {
      this.handleRowUpdate(operation.data)
      return
    }

    if (LIVE_PERSISTED_CELL_OP_TYPES.has(operation.type)) {
      this.applyLivePersistedChanges(
        [
          {
            operationType: operation.type,
            payload: (operation.data as Record<string, unknown>) ?? {},
            appliedVersion: typeof version === 'number' ? version : this.lastKnownVersion
          }
        ],
        'single_op'
      )
      return
    }

    if (opSheetId === activeSheetId && LIVE_STRUCTURAL_OP_TYPES.has(operation.type)) {
      this.callbacks.scheduleRemoteStructuralResync()
      return
    }

    if (operation.type === 'cells_changed') {
      this.handleCellsChanged(operation.data as CellsChangedPayload)
      return
    }
  }

  // --- Private: Receiver Handlers ---

  private handleCellsChanged(data: unknown): void {
    const d = data as CellsChangedPayload | undefined
    const activeSheetId = this.callbacks.getActiveSheetId()
    if (!d?.sheetId) {
      this.collabDiag('collab_receive_skipped', { reason: 'no_sheet_id' })
      return
    }
    if (d.sheetId !== activeSheetId) {
      this.collabDiag('collab_receive_skipped', { reason: 'other_sheet' })
      return
    }
    if (!Array.isArray(d.cells) || d.cells.length === 0) {
      this.collabDiag('collab_receive_skipped', { reason: 'empty_cells' })
      return
    }

    const updatesByRowId = new Map<string, Record<string, unknown>>()

    for (const cell of d.cells) {
      if (!cell?.rowId) continue
      if (!Object.prototype.hasOwnProperty.call(cell, 'value')) continue
      if (cell.column == null) continue
      const remoteRowId = String(cell.rowId)
      const targetColumnName = this.resolveColumnName(cell.column)
      const rowUpdates = updatesByRowId.get(remoteRowId) ?? {}
      rowUpdates[targetColumnName] = cell.value
      updatesByRowId.set(remoteRowId, rowUpdates)
    }

    if (updatesByRowId.size === 0) {
      this.collabDiag('collab_receive_skipped', { reason: 'no_valid_cell_payloads', wireCellCount: d.cells.length })
      return
    }
    this.applyDataModelUpdates(updatesByRowId)

    let withA1Applied = 0
    let withCoordsApplied = 0
    let skippedApply = 0
    let invalidA1Ref = 0

    // Prefer A1 cellRef from the sender's Univer grid (same as cursor). Data-array row indices can drift
    // after row insert/delete so resolveCoordinates(rowId, column) may target the wrong sheet cell.
    for (const cell of d.cells) {
      if (!cell?.rowId) continue
      if (!Object.prototype.hasOwnProperty.call(cell, 'value')) continue
      if (cell.column == null) continue
      const remoteRowId = String(cell.rowId)
      const targetColumnName = this.resolveColumnName(cell.column)
      const trimmedRef = typeof cell.cellRef === 'string' ? cell.cellRef.trim() : ''
      if (trimmedRef) {
        const a1 = parseA1Reference(trimmedRef)
        if (a1 && a1.row >= 0 && a1.col >= 0) {
          this.callbacks.applyRemoteCellUpdate(a1.row, a1.col, cell.value, remoteRowId, { useSenderA1Row: true })
          withA1Applied += 1
          continue
        }
        invalidA1Ref += 1
      }
      const { rowIndex, colIndex } = this.resolveCoordinates(targetColumnName, remoteRowId)
      if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
        this.callbacks.applyRemoteCellUpdate(rowIndex, colIndex, cell.value, remoteRowId)
        withCoordsApplied += 1
      } else {
        skippedApply += 1
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
  }

  private handleBatchOperations(
    operations: Array<{ type?: string; data?: unknown }>,
    version: number | undefined
  ): void {
    const deltaChanges: DeltaChange[] = []
    let requiresStructuralResync = false

    for (const operation of operations) {
      const type = typeof operation.type === 'string' ? operation.type : ''
      if (!type) continue

      if (type === 'row_update') {
        this.handleRowUpdate(operation.data)
        continue
      }

      if (LIVE_STRUCTURAL_OP_TYPES.has(type)) {
        requiresStructuralResync = true
        continue
      }

      if (!LIVE_PERSISTED_CELL_OP_TYPES.has(type)) continue
      if (!operation.data || typeof operation.data !== 'object') continue

      deltaChanges.push({
        operationType: type,
        payload: operation.data as Record<string, unknown>,
        appliedVersion: typeof version === 'number' ? version : this.lastKnownVersion
      })
    }

    if (deltaChanges.length > 0) {
      this.applyLivePersistedChanges(deltaChanges, 'batch_ops')
    }
    if (requiresStructuralResync) {
      this.callbacks.scheduleRemoteStructuralResync()
    }
  }

  private handleRowUpdate(data: unknown): void {
    const d = data as
      | {
          sheetId?: string
          rowId?: string
          rowData?: Record<string, unknown>
        }
      | undefined
    const activeSheetId = this.callbacks.getActiveSheetId()
    if (!d?.sheetId || d.sheetId !== activeSheetId || !d.rowId || !d.rowData || typeof d.rowData !== 'object') {
      this.collabDiag('collab_receive_skipped', { reason: 'invalid_row_update' })
      return
    }

    const remoteRowId = String(d.rowId)
    const normalizedUpdates: Record<string, unknown> = {}
    for (const [columnKey, value] of Object.entries(d.rowData)) {
      if (columnKey === '_updatedAt') continue
      normalizedUpdates[this.resolveColumnName(columnKey)] = value
    }
    if (Object.keys(normalizedUpdates).length === 0) return

    this.applyDataModelUpdates(new Map([[remoteRowId, normalizedUpdates]]))

    for (const [columnName, value] of Object.entries(normalizedUpdates)) {
      const { rowIndex, colIndex } = this.resolveCoordinates(columnName, remoteRowId)
      if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
        this.callbacks.applyRemoteCellUpdate(rowIndex, colIndex, value, remoteRowId)
      }
    }
  }

  private applyLivePersistedChanges(changes: DeltaChange[], source: 'batch_ops' | 'single_op'): void {
    if (changes.length === 0) return
    const activeSheetId = this.callbacks.getActiveSheetId()
    this.applyDeltaChanges(activeSheetId, changes)
    this.collabDiag('collab_receive_persisted_ops', {
      source,
      changeCount: changes.length
    })
  }

  // --- Private: Helpers ---

  private enqueueOrSend(op: DocumentOperation): void {
    if (!this.connected || !this.joined || !this.emitFn) {
      this.pendingOps.push(op)
      const broadcastOnly = Boolean((op as { broadcastOnly?: boolean }).broadcastOnly)
      const cellCount =
        op.type === 'cells_changed' &&
        op.data &&
        typeof op.data === 'object' &&
        Array.isArray((op.data as CellsChangedPayload).cells)
          ? (op.data as CellsChangedPayload).cells.length
          : undefined
      this.collabDiag('collab_op_queued_offline', {
        opType: op.type,
        pendingLen: this.pendingOps.length,
        broadcastOnly,
        connected: this.connected,
        joined: this.joined,
        cellCount
      })
      if (this.pendingOps.length > MAX_PENDING_OPS) {
        const dropped = this.pendingOps.length - MAX_PENDING_OPS
        this.pendingOps = this.pendingOps.slice(-MAX_PENDING_OPS)
        this.callbacks.onPendingQueueTrimmed?.(dropped)
        this.callbacks.onCollabDiagnostic?.('pending_ops_trim', { dropped })
      }
      return
    }
    if (op.type === 'cells_changed' && op.data && typeof op.data === 'object') {
      const cells = (op.data as CellsChangedPayload).cells
      const cellCount = Array.isArray(cells) ? cells.length : 0
      const withA1Ref = Array.isArray(cells)
        ? cells.filter(c => typeof c?.cellRef === 'string' && String(c.cellRef).trim().length > 0).length
        : 0
      this.collabDiag('collab_op_send_immediate', {
        opType: op.type,
        broadcastOnly: Boolean((op as { broadcastOnly?: boolean }).broadcastOnly),
        cellCount,
        withA1Ref
      })
    } else {
      this.collabDiag('collab_op_send_immediate', { opType: op.type })
    }
    this.emitFn(op)
  }

  private flushPendingOps(): void {
    if (!this.emitFn) return
    const ops = this.pendingOps
    this.pendingOps = []
    if (ops.length > 0) {
      this.collabDiag('collab_pending_flush', { opCount: ops.length })
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

  private updateVersion(data: unknown, version: number | undefined): void {
    const activeSheetId = this.callbacks.getActiveSheetId()
    const opSheetId = this.getSheetIdFromData(data)
    if (opSheetId !== activeSheetId) return
    if (typeof version === 'number' && Number.isFinite(version) && version >= 0) {
      this.lastKnownVersion = Math.max(this.lastKnownVersion, Math.trunc(version))
      this.callbacks.onVersionUpdate(version)
    } else {
      this.callbacks.scheduleSheetVersionRefreshFromApi()
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

      if (delta.requiresSnapshot || delta.changes.length === 0) {
        console.warn('[CollabManager] Delta gap too large or log compacted, triggering full resync')
        this.callbacks.onCollabDiagnostic?.('delta_requires_snapshot', {
          requiresSnapshot: delta.requiresSnapshot,
          changeCount: delta.changes.length
        })
        this.callbacks.scheduleRemoteStructuralResync()
        this.lastKnownVersion = delta.currentVersion
        this.callbacks.onVersionUpdate(delta.currentVersion)
        return
      }

      const hasStructural = delta.changes.some(c => STRUCTURAL_OP_TYPES.has(c.operationType))
      if (hasStructural) {
        console.warn('[CollabManager] Structural ops in delta, triggering full resync')
        this.callbacks.scheduleRemoteStructuralResync()
        this.lastKnownVersion = delta.currentVersion
        this.callbacks.onVersionUpdate(delta.currentVersion)
        return
      }

      this.applyDeltaChanges(sheetId, delta.changes)
      this.lastKnownVersion = delta.currentVersion
      this.callbacks.onVersionUpdate(delta.currentVersion)
      console.debug('[CollabManager] Reconciled', delta.changes.length, 'ops, version now', delta.currentVersion)
    } catch (error) {
      console.warn('[CollabManager] Delta reconciliation failed, falling back to full resync', error)
      this.callbacks.scheduleRemoteStructuralResync()
    } finally {
      this.reconciling = false
    }
  }

  // Translate persisted operations (set_cell, set_range, clear_cell) into data model + grid updates.
  private applyDeltaChanges(sheetId: string, changes: DeltaChange[]): void {
    const updatesByRowId = new Map<string, Record<string, unknown>>()

    for (const change of changes) {
      if (!CELL_OP_TYPES.has(change.operationType)) continue
      const payload = change.payload

      if (change.operationType === 'set_cell') {
        const rowId = String(payload.rowId ?? '')
        const column = String(payload.columnName ?? payload.column ?? '')
        if (!rowId || !column) continue
        const existing = updatesByRowId.get(rowId) ?? {}
        existing[this.resolveColumnName(column)] = payload.value
        updatesByRowId.set(rowId, existing)
      } else if (change.operationType === 'clear_cell') {
        const rowId = String(payload.rowId ?? '')
        const column = String(payload.columnName ?? payload.column ?? '')
        if (!rowId || !column) continue
        const existing = updatesByRowId.get(rowId) ?? {}
        existing[this.resolveColumnName(column)] = null
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
          const existing = updatesByRowId.get(rowId) ?? {}
          existing[this.resolveColumnName(column)] = cell.value
          updatesByRowId.set(rowId, existing)
        }
      }
    }

    if (updatesByRowId.size === 0) return

    this.applyDataModelUpdates(updatesByRowId)

    for (const [rowId, updates] of updatesByRowId) {
      for (const [columnName, value] of Object.entries(updates)) {
        const { rowIndex, colIndex } = this.resolveCoordinates(columnName, rowId)
        if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
          this.callbacks.applyRemoteCellUpdate(rowIndex, colIndex, value, rowId)
        }
      }
    }
  }

  private resolveColumnName(columnKey: string): string {
    const columns = this.callbacks.getColumns()
    return columns.find(c => c.id === columnKey)?.name ?? columns.find(c => c.name === columnKey)?.name ?? columnKey
  }

  private resolveCoordinates(
    columnKey: string,
    remoteRowId: string
  ): { rowIndex: number | undefined; colIndex: number | undefined } {
    const columns = this.callbacks.getColumns()
    const data = this.callbacks.getLocalSheetData()
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

  private applyDataModelUpdates(updatesByRowId: Map<string, Record<string, unknown>>): Set<string> {
    const changedKeys = new Set<string>()
    const currentData = this.callbacks.getLocalSheetData()
    const findUpdatesForRow = (row: ViewerRow): Record<string, unknown> | undefined => {
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
        if (u) return u
      }
      return undefined
    }
    const nextLocal = currentData.map(row => {
      const canonical = getCanonicalRowId(row)
      const updates = findUpdatesForRow(row)
      if (!updates) return row
      let hasChange = false
      for (const [col, val] of Object.entries(updates)) {
        if (row[col] !== val) {
          changedKeys.add(`${canonical}:${col}`)
          hasChange = true
        }
      }
      if (!hasChange) return row
      return { ...row, ...updates, _updatedAt: new Date().toISOString() }
    })
    if (changedKeys.size > 0) {
      this.callbacks.commitLocalSheetData(nextLocal, { persisted: true })
    }
    return changedKeys
  }
}
