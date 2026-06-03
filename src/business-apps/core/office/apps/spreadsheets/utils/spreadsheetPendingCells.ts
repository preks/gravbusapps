import type { ViewerRow } from './spreadsheetRowIdentity'

export type PendingCellChangeLike = {
  rowId: string
  columnName: string
  value: unknown
  sheetId?: string
}

const pendingCellChangeKey = (cell: PendingCellChangeLike): string =>
  `${String(cell.sheetId ?? '')}\u0000${String(cell.rowId)}\u0000${String(cell.columnName)}`

/**
 * Latest queued edit wins for a logical cell. We intentionally preserve the
 * relative order of the final surviving edits so batch payloads remain stable.
 */
export const coalesceQueuedCellChanges = <T extends PendingCellChangeLike>(queuedCells: T[]): T[] => {
  const latestByKey = new Map<string, T>()
  for (const cell of queuedCells) {
    const key = pendingCellChangeKey(cell)
    latestByKey.delete(key)
    latestByKey.set(key, cell)
  }
  return Array.from(latestByKey.values())
}

const toComparableCellSignature = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? '')
  } catch {
    return String(value ?? '')
  }
}

/**
 * Unwraps the Univer `{ v, t }` cell envelope so a raw scalar (e.g. `1`) compares
 * equal to its envelope form (e.g. `{ v: 1, t: 2 }`). Used by persistence dedup
 * paths where one side stores the envelope (post-`add_rows` row snapshot) and
 * the other side stores the planned scalar (set_range cell value).
 */
const unwrapCellEnvelopeForComparison = (value: unknown): unknown => {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return value
  const obj = value as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(obj, 'v')) return obj.v ?? ''
  if (Object.prototype.hasOwnProperty.call(obj, 'm')) return obj.m ?? ''
  return value
}

/**
 * True when two cell values should be considered semantically identical for
 * persistence dedup. Unlike `shouldSkipFreshRowCellReplay`, this is symmetric
 * (no blank-like asymmetry) and intended for "did add_rows already write this
 * exact value?" checks within a single emit dispatch.
 */
export const cellValuesAreEquivalentForPersist = (a: unknown, b: unknown): boolean => {
  const left = unwrapCellEnvelopeForComparison(a)
  const right = unwrapCellEnvelopeForComparison(b)
  return toComparableCellSignature(left) === toComparableCellSignature(right)
}

const isBlankLikeCellValue = (value: unknown): boolean => {
  if (value == null) return true
  if (typeof value === 'string') return value.length === 0
  if (typeof value !== 'object' || Array.isArray(value)) return false
  const obj = value as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(obj, 'v')) {
    const cellValue = obj.v
    return cellValue == null || cellValue === ''
  }
  if (Object.prototype.hasOwnProperty.call(obj, 'm')) {
    const displayValue = obj.m
    return displayValue == null || displayValue === ''
  }
  return false
}

export const shouldSkipFreshRowCellReplay = (baselineValue: unknown, queuedValue: unknown): boolean => {
  if (toComparableCellSignature(baselineValue) === toComparableCellSignature(queuedValue)) {
    return true
  }
  return isBlankLikeCellValue(queuedValue) && !isBlankLikeCellValue(baselineValue)
}

export interface ReconcileQueuedDraftCellsForCreatedRowsResult<T extends PendingCellChangeLike> {
  queuedCells: T[]
  droppedCellKeys: string[]
  retainedCellKeys: string[]
}

export const reconcileQueuedDraftCellsForCreatedRows = <T extends PendingCellChangeLike>(
  queuedCells: T[],
  // Kept for signature compatibility with existing callers; baseline lookup no longer used (Fix F).
  _createdRows: ViewerRow[],
  persistedIdByClientRowId: Map<string, string>,
  addRowsValuesByClientRowId: Map<string, Record<string, unknown>> = new Map()
): ReconcileQueuedDraftCellsForCreatedRowsResult<T> => {
  if (queuedCells.length === 0 || persistedIdByClientRowId.size === 0) {
    return {
      queuedCells,
      droppedCellKeys: [],
      retainedCellKeys: []
    }
  }

  const nextQueuedCells: T[] = []
  const droppedCellKeys: string[] = []
  const retainedCellKeys: string[] = []
  for (const cell of queuedCells) {
    const clientRowId = String(cell.rowId)
    const persistedId = persistedIdByClientRowId.get(clientRowId)
    if (!persistedId) {
      nextQueuedCells.push(cell)
      continue
    }

    const addRowsValues = addRowsValuesByClientRowId.get(clientRowId)
    if (
      addRowsValues &&
      Object.prototype.hasOwnProperty.call(addRowsValues, cell.columnName) &&
      cellValuesAreEquivalentForPersist(addRowsValues[cell.columnName], cell.value)
    ) {
      droppedCellKeys.push(`${persistedId}\u0000${cell.columnName}`)
      continue
    }

    // Fix F still applies for columns the row-create payload did NOT explicitly carry. We only
    // suppress a queued cell when add_rows itself transmitted the same (row, column, value).
    nextQueuedCells.push({
      ...cell,
      rowId: persistedId
    })
    retainedCellKeys.push(`${persistedId}\u0000${cell.columnName}`)
  }

  return {
    queuedCells: nextQueuedCells,
    droppedCellKeys,
    retainedCellKeys
  }
}
