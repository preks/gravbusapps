import { isSpreadsheetTemporaryClientRowId } from '../utils/spreadsheetRowIdentity'

export type SpreadsheetVersionCausalOwnershipState = 'staged' | 'submitted' | 'acknowledged' | 'rejected'

export type SpreadsheetVersionCausalCellRecord = {
  sheetId: string
  logicalRowHandle: string
  columnName: string
  baseVersion: number
  state: SpreadsheetVersionCausalOwnershipState
  rowEscalated: boolean
}

type CellKey = string

const buildCellKey = (sheetId: string, logicalRowHandle: string, columnName: string): CellKey =>
  `${sheetId}\u0000${logicalRowHandle}\u0000${columnName}`

const buildRowKey = (sheetId: string, logicalRowHandle: string): string => `${sheetId}\u0000${logicalRowHandle}`

/**
 * Version-causal paint ownership: a pending local intent supersedes remote applies at
 * `appliedVersion <= intent.baseVersion` until ack/reject. Row-level escalation protects
 * all cells for unresolved `client_*` handles.
 */
export class SpreadsheetVersionCausalOwnershipRegistry {
  private readonly cells = new Map<CellKey, SpreadsheetVersionCausalCellRecord>()
  private readonly escalatedRows = new Set<string>()

  registerIntent(params: {
    sheetId: string
    logicalRowHandle: string
    columnName: string
    baseVersion: number
  }): SpreadsheetVersionCausalCellRecord {
    const rowEscalated = isSpreadsheetTemporaryClientRowId(params.logicalRowHandle)
    const record: SpreadsheetVersionCausalCellRecord = {
      sheetId: params.sheetId,
      logicalRowHandle: params.logicalRowHandle,
      columnName: params.columnName,
      baseVersion: Math.max(0, Math.trunc(params.baseVersion)),
      state: 'staged',
      rowEscalated
    }
    this.cells.set(buildCellKey(params.sheetId, params.logicalRowHandle, params.columnName), record)
    if (rowEscalated) {
      this.escalatedRows.add(buildRowKey(params.sheetId, params.logicalRowHandle))
    }
    return record
  }

  promoteLogicalRowHandle(sheetId: string, clientRowId: string, rowUuid: string): void {
    const rowKey = buildRowKey(sheetId, clientRowId)
    this.escalatedRows.delete(rowKey)
    for (const [key, record] of this.cells.entries()) {
      if (record.sheetId !== sheetId || record.logicalRowHandle !== clientRowId) {
        continue
      }
      const promoted: SpreadsheetVersionCausalCellRecord = {
        ...record,
        logicalRowHandle: rowUuid,
        rowEscalated: false,
        state: record.state === 'staged' ? 'submitted' : record.state
      }
      this.cells.delete(key)
      this.cells.set(buildCellKey(sheetId, rowUuid, promoted.columnName), promoted)
    }
  }

  markSubmitted(sheetId: string, logicalRowHandle: string, columnName: string): void {
    const record = this.cells.get(buildCellKey(sheetId, logicalRowHandle, columnName))
    if (!record) return
    record.state = 'submitted'
  }

  markAcknowledged(sheetId: string, logicalRowHandle: string, columnName: string, appliedVersion: number): void {
    const record = this.cells.get(buildCellKey(sheetId, logicalRowHandle, columnName))
    if (!record) return
    record.state = 'acknowledged'
    record.baseVersion = Math.max(record.baseVersion, Math.trunc(appliedVersion))
    if (record.rowEscalated) {
      this.escalatedRows.delete(buildRowKey(sheetId, logicalRowHandle))
    }
    record.rowEscalated = false
  }

  markRejected(sheetId: string, logicalRowHandle: string, columnName: string): void {
    const record = this.cells.get(buildCellKey(sheetId, logicalRowHandle, columnName))
    if (!record) return
    record.state = 'rejected'
    if (record.rowEscalated) {
      this.escalatedRows.delete(buildRowKey(sheetId, logicalRowHandle))
    }
    record.rowEscalated = false
  }

  shouldSuppressRemotePaint(params: {
    sheetId: string
    rowId: string
    columnName: string
    remoteAppliedVersion: number
  }): boolean {
    const remoteVersion = Math.trunc(params.remoteAppliedVersion)
    const cell = this.cells.get(buildCellKey(params.sheetId, params.rowId, params.columnName))
    if (cell && this.isActive(cell) && remoteVersion <= cell.baseVersion) {
      return true
    }
    // Unresolved `client_*` handle: suppress remote paint for that handle on any column until
    // `promoteLogicalRowHandle` clears the row-level escalation entry.
    if (this.escalatedRows.has(buildRowKey(params.sheetId, params.rowId))) {
      return true
    }
    // Per-cell escalated intents only suppress their own column — not peer edits on other
    // columns of the same materialized row (concurrent B vs D typing).
    for (const record of this.cells.values()) {
      if (record.sheetId !== params.sheetId) continue
      if (record.logicalRowHandle !== params.rowId) continue
      if (!record.rowEscalated) continue
      if (record.columnName !== params.columnName) continue
      if (this.isActive(record)) {
        return true
      }
    }
    return false
  }

  hasUnresolvedIntents(sheetId?: string): boolean {
    for (const record of this.cells.values()) {
      if (sheetId && record.sheetId !== sheetId) continue
      if (this.isActive(record)) {
        return true
      }
    }
    return false
  }

  private isActive(record: SpreadsheetVersionCausalCellRecord): boolean {
    return record.state === 'staged' || record.state === 'submitted'
  }
}

export type SpreadsheetLiveRemoteApplyVersionScope = {
  sheetId: string
  appliedVersion: number
}
