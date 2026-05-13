import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'

export interface SpreadsheetPendingCellChange {
  rowId: string
  columnName: string
  value: unknown
  sheetId?: string
  traceId?: string
}

export interface SpreadsheetPendingCellBatch {
  batchId: string
  traceId?: string
  sourceTraceIds?: string[]
  targetSheetId: string
  operations: SpreadsheetBatchOperation[]
}

export interface SpreadsheetPendingCellJournal {
  draftCells: SpreadsheetPendingCellChange[]
  pendingBatches: SpreadsheetPendingCellBatch[]
}

export const PENDING_CELL_JOURNAL_STORAGE_PREFIX = 'spreadsheet-pending-cell-journal:'

const isRecord = (value: unknown): value is Record<string, unknown> => value != null && typeof value === 'object'

export const isSpreadsheetPendingCellChange = (value: unknown): value is SpreadsheetPendingCellChange => {
  if (!isRecord(value)) return false
  return typeof value.rowId === 'string' && typeof value.columnName === 'string'
}

export const isSpreadsheetBatchOperation = (value: unknown): value is SpreadsheetBatchOperation => {
  if (!isRecord(value)) return false
  return typeof value.operationId === 'string' && typeof value.type === 'string' && isRecord(value.data)
}

export const isSpreadsheetPendingCellBatch = (value: unknown): value is SpreadsheetPendingCellBatch => {
  if (!isRecord(value)) return false
  return (
    typeof value.batchId === 'string' &&
    (value.traceId == null || typeof value.traceId === 'string') &&
    (value.sourceTraceIds == null ||
      (Array.isArray(value.sourceTraceIds) && value.sourceTraceIds.every(entry => typeof entry === 'string'))) &&
    typeof value.targetSheetId === 'string' &&
    Array.isArray(value.operations) &&
    value.operations.every(isSpreadsheetBatchOperation)
  )
}

export const buildSpreadsheetPendingCellJournalStorageKey = (appId: string): string =>
  `${PENDING_CELL_JOURNAL_STORAGE_PREFIX}${appId}`

export const readSpreadsheetPendingCellJournal = (
  storageKey: string,
  storage: Pick<Storage, 'getItem'> | null | undefined = globalThis.sessionStorage
): SpreadsheetPendingCellJournal | null => {
  try {
    const raw = storage?.getItem(storageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { draftCells?: unknown; pendingBatches?: unknown }
    const draftCells = Array.isArray(parsed.draftCells) ? parsed.draftCells.filter(isSpreadsheetPendingCellChange) : []
    const pendingBatches = Array.isArray(parsed.pendingBatches)
      ? parsed.pendingBatches.filter(isSpreadsheetPendingCellBatch)
      : []
    if (draftCells.length === 0 && pendingBatches.length === 0) return null
    return { draftCells, pendingBatches }
  } catch {
    return null
  }
}

export const writeSpreadsheetPendingCellJournal = (
  storageKey: string,
  journal: SpreadsheetPendingCellJournal,
  storage: Pick<Storage, 'setItem' | 'removeItem'> | null | undefined = globalThis.sessionStorage
): void => {
  if (!storage) return
  if (journal.draftCells.length === 0 && journal.pendingBatches.length === 0) {
    storage.removeItem(storageKey)
    return
  }
  storage.setItem(storageKey, JSON.stringify(journal))
}
