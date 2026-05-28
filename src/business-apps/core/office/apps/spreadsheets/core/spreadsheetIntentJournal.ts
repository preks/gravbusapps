export type SpreadsheetIntentJournalState = 'staged' | 'ready' | 'submitted' | 'acknowledged' | 'rejected' | 'failed'

export type SpreadsheetCellIntentRecord = {
  sheetId: string
  logicalRowHandle: string
  columnName: string
  value: unknown
  intentRevision: number
  baseVersion: number
  state: SpreadsheetIntentJournalState
  batchId?: string
  operationId?: string
}

type IntentKey = string

const buildIntentKey = (
  record: Pick<SpreadsheetCellIntentRecord, 'sheetId' | 'logicalRowHandle' | 'columnName'>
): IntentKey => `${record.sheetId}\0${record.logicalRowHandle}\0${record.columnName}`

export class SpreadsheetIntentJournal {
  private readonly entries = new Map<IntentKey, SpreadsheetCellIntentRecord>()
  private revisionCounter = 0

  captureIntent(params: {
    sheetId: string
    logicalRowHandle: string
    columnName: string
    value: unknown
    baseVersion: number
  }): SpreadsheetCellIntentRecord {
    const key = buildIntentKey(params)
    const nextRevision = (this.entries.get(key)?.intentRevision ?? 0) + 1
    this.revisionCounter += 1
    const record: SpreadsheetCellIntentRecord = {
      sheetId: params.sheetId,
      logicalRowHandle: params.logicalRowHandle,
      columnName: params.columnName,
      value: params.value,
      intentRevision: nextRevision,
      baseVersion: params.baseVersion,
      state: 'staged'
    }
    this.entries.set(key, record)
    return record
  }

  promoteLogicalRowHandle(clientRowId: string, rowUuid: string): void {
    for (const [key, record] of this.entries.entries()) {
      if (record.logicalRowHandle !== clientRowId) {
        continue
      }
      const promoted: SpreadsheetCellIntentRecord = {
        ...record,
        logicalRowHandle: rowUuid,
        state: record.state === 'staged' ? 'ready' : record.state
      }
      this.entries.delete(key)
      this.entries.set(buildIntentKey(promoted), promoted)
    }
  }

  markSubmitted(params: {
    sheetId: string
    logicalRowHandle: string
    columnName: string
    batchId?: string
    operationId?: string
  }): void {
    const record = this.entries.get(buildIntentKey(params))
    if (!record) return
    record.state = 'submitted'
    record.batchId = params.batchId
    record.operationId = params.operationId
  }

  markAcknowledged(params: {
    sheetId: string
    logicalRowHandle: string
    columnName: string
    appliedVersion: number
  }): void {
    const record = this.entries.get(buildIntentKey(params))
    if (!record) return
    record.state = 'acknowledged'
    record.baseVersion = params.appliedVersion
  }

  markRejected(params: { sheetId: string; logicalRowHandle: string; columnName: string }): void {
    const record = this.entries.get(buildIntentKey(params))
    if (!record) return
    record.state = 'rejected'
  }

  markFailed(params: { sheetId: string; logicalRowHandle: string; columnName: string }): void {
    const record = this.entries.get(buildIntentKey(params))
    if (!record) return
    record.state = 'failed'
  }

  markSheetIntentsFailed(sheetId: string): number {
    let failedCount = 0
    for (const record of this.entries.values()) {
      if (record.sheetId !== sheetId) continue
      if (record.state !== 'staged' && record.state !== 'ready' && record.state !== 'submitted') {
        continue
      }
      record.state = 'failed'
      failedCount += 1
    }
    return failedCount
  }

  hasUnresolvedIntents(sheetId?: string): boolean {
    for (const record of this.entries.values()) {
      if (sheetId && record.sheetId !== sheetId) continue
      if (record.state === 'staged' || record.state === 'ready' || record.state === 'submitted') {
        return true
      }
    }
    return false
  }

  listIntents(sheetId?: string): SpreadsheetCellIntentRecord[] {
    return [...this.entries.values()].filter(record => !sheetId || record.sheetId === sheetId)
  }
}
