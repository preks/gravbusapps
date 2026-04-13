// Centralized spreadsheet collaboration logic: emit, receive, echo suppression, operation queuing.

import type { DocumentOperation } from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import type { CellDimensionsPayload } from '../components/UniverSheetGrid'
import type { SpreadsheetColumn } from '../types'
import { createUniverConversionContext, parseA1Reference, toA1Reference } from '../utils/univerAdapter'

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
  getBackendRowIdForUiRowId: (uiRowId: string) => string | undefined
  commitLocalSheetData: (data: ViewerRow[], options?: { persisted?: boolean }) => void
  applyRemoteCellUpdate: (rowIndex: number, colIndex: number, value: unknown, rowId?: string) => void
  applyRemoteDimensions?: (payload: CellDimensionsPayload) => void
  onVersionUpdate: (version: number) => void
  scheduleSheetVersionRefreshFromApi: () => void
  scheduleRemoteStructuralResync: () => void
  onRemoteColumnUpdate?: (data: Record<string, unknown>) => void
  fetchChangesSince?: (sheetId: string, sinceVersion: number) => Promise<DeltaResponse>
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

export type PersistCellsToServerResult = {
  success: boolean
  version?: number
  error?: string
}

export class SpreadsheetCollaborationManager {
  private callbacks: CollaborationCallbacks
  private emitFn: ((op: DocumentOperation) => void) | null = null
  private emitCursorFn: ((pos: { path?: string[] }) => void) | null = null
  private documentOpAsync:
    | ((op: DocumentOperation) => Promise<{ success: boolean; version?: number; error?: string }>)
    | null = null
  private currentUserId: string | null = null
  private connected = false
  private joined = false
  private pendingOps: DocumentOperation[] = []
  private pendingCursor: { path?: string[] } | null = null
  private lastKnownVersion = 0
  private reconciling = false

  constructor(callbacks: CollaborationCallbacks) {
    this.callbacks = callbacks
  }

  updateCallbacks(callbacks: CollaborationCallbacks): void {
    this.callbacks = callbacks
  }

  setEmitFunctions(emitOp: (op: DocumentOperation) => void, emitCursor: (pos: { path?: string[] }) => void): void {
    this.emitFn = emitOp
    this.emitCursorFn = emitCursor
  }

  setDocumentOperationAsync(
    fn: ((op: DocumentOperation) => Promise<{ success: boolean; version?: number; error?: string }>) | null
  ): void {
    this.documentOpAsync = fn
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId
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

  // --- Sender ---

  emitCellsChanged(
    cells: Array<{ rowId: string; columnName: string; value: unknown; univerRow?: number; univerCol?: number }>
  ): void {
    const sheetId = this.callbacks.getActiveSheetId()
    const collabCells: CellsChangedCell[] = []
    for (const cell of cells) {
      const backendRowId = this.callbacks.getBackendRowIdForUiRowId(String(cell.rowId))
      if (!backendRowId) {
        console.warn('[CollabManager] Skipped emit: no backend row ID for', cell.rowId)
        continue
      }
      const entry: CellsChangedCell = { rowId: backendRowId, column: cell.columnName, value: cell.value }
      if (cell.univerRow != null && cell.univerCol != null) {
        entry.cellRef = toA1Reference(cell.univerRow, cell.univerCol)
      } else {
        const { rowIndex, colIndex } = this.resolveCoordinates(cell.columnName, backendRowId)
        if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
          entry.cellRef = toA1Reference(rowIndex, colIndex)
        }
      }
      collabCells.push(entry)
    }
    if (collabCells.length === 0) {
      console.warn('[CollabManager] emitCellsChanged: all', cells.length, 'cells dropped (no backend row IDs)')
      return
    }
    this.enqueueOrSend({
      type: 'cells_changed',
      data: { sheetId, cells: collabCells } satisfies CellsChangedPayload
    })
  }

  async persistCellsChangedToServer(
    cells: Array<{ rowId: string; columnName: string; value: unknown; univerRow?: number; univerCol?: number }>
  ): Promise<PersistCellsToServerResult> {
    const sheetId = this.callbacks.getActiveSheetId()
    const collabCells: CellsChangedCell[] = []

    for (const cell of cells) {
      const backendRowId = this.callbacks.getBackendRowIdForUiRowId(String(cell.rowId))
      if (!backendRowId) continue
      const entry: CellsChangedCell = { rowId: backendRowId, column: cell.columnName, value: cell.value }
      if (cell.univerRow != null && cell.univerCol != null) {
        entry.cellRef = toA1Reference(cell.univerRow, cell.univerCol)
      } else {
        const { rowIndex, colIndex } = this.resolveCoordinates(cell.columnName, backendRowId)
        if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
          entry.cellRef = toA1Reference(rowIndex, colIndex)
        }
      }
      collabCells.push(entry)
    }

    if (collabCells.length === 0) {
      return {
        success: false,
        error: cells.length > 0 ? 'no_backend_rows' : undefined
      }
    }

    const op: DocumentOperation = {
      type: 'cells_changed',
      data: { sheetId, cells: collabCells } satisfies CellsChangedPayload,
      broadcastOnly: false
    }

    const send = this.documentOpAsync
    if (!send) {
      return { success: false, error: 'no_async_channel' }
    }

    const result = await send(op)
    if (result.success && result.version != null) {
      this.lastKnownVersion = Math.max(this.lastKnownVersion, result.version)
      this.callbacks.onVersionUpdate(result.version)
    }
    return {
      success: result.success,
      version: result.version,
      error: result.error
    }
  }

  emitCursor(path: string[]): void {
    const pos = { path }
    if (!this.connected || !this.joined) {
      this.pendingCursor = pos
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
    if (this.currentUserId && payload.userId === this.currentUserId) return

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
    if (opSheetId === activeSheetId && STRUCTURAL_OPS.has(operation.type)) {
      this.callbacks.scheduleRemoteStructuralResync()
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
    if (!d?.sheetId || d.sheetId !== activeSheetId || !Array.isArray(d.cells) || d.cells.length === 0) return

    const updatesByRowId = new Map<string, Record<string, unknown>>()
    const gridUpdates: Array<{ rowIndex: number; colIndex: number; value: unknown }> = []

    for (const cell of d.cells) {
      if (!cell?.rowId || cell.value === undefined) continue
      if (cell.column == null) continue
      const remoteRowId = String(cell.rowId)
      const targetColumnName = this.resolveColumnName(cell.column)
      const rowUpdates = updatesByRowId.get(remoteRowId) ?? {}
      rowUpdates[targetColumnName] = cell.value
      updatesByRowId.set(remoteRowId, rowUpdates)
      const parsedRef = cell.cellRef ? parseA1Reference(cell.cellRef) : null
      if (parsedRef) {
        gridUpdates.push({ rowIndex: parsedRef.row, colIndex: parsedRef.col, value: cell.value })
      } else {
        // Fallback: resolve coordinates from rowId + column when cellRef is absent
        const { rowIndex, colIndex } = this.resolveCoordinates(cell.column, remoteRowId)
        if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
          gridUpdates.push({ rowIndex, colIndex, value: cell.value })
        }
      }
    }

    if (updatesByRowId.size === 0) return
    this.applyDataModelUpdates(updatesByRowId)
    gridUpdates.forEach(u => this.callbacks.applyRemoteCellUpdate(u.rowIndex, u.colIndex, u.value))
  }

  // --- Private: Helpers ---

  private enqueueOrSend(op: DocumentOperation): void {
    if (!this.connected || !this.joined || !this.emitFn) {
      this.pendingOps.push(op)
      if (this.pendingOps.length > MAX_PENDING_OPS) {
        this.pendingOps = this.pendingOps.slice(-MAX_PENDING_OPS)
      }
      return
    }
    this.emitFn(op)
  }

  private flushPendingOps(): void {
    if (!this.emitFn) return
    const ops = this.pendingOps
    this.pendingOps = []
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

    const changedKeys = this.applyDataModelUpdates(updatesByRowId)

    for (const [rowId, updates] of updatesByRowId) {
      for (const [columnName, value] of Object.entries(updates)) {
        if (!changedKeys.has(`${rowId}:${columnName}`)) continue
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
      const idx = data.findIndex(row => getCanonicalRowId(row) === remoteRowId)
      if (idx >= 0) rowIndex = idx
    }
    let colIndex = ctx.columnIdToIndex.get(columnKey)
    if (colIndex === undefined) {
      colIndex = columns.findIndex(c => c.id === columnKey || c.name === columnKey)
    }
    return { rowIndex, colIndex }
  }

  private applyDataModelUpdates(updatesByRowId: Map<string, Record<string, unknown>>): Set<string> {
    const changedKeys = new Set<string>()
    const currentData = this.callbacks.getLocalSheetData()
    const nextLocal = currentData.map(row => {
      const canonical = getCanonicalRowId(row)
      const updates = canonical ? updatesByRowId.get(canonical) : undefined
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
