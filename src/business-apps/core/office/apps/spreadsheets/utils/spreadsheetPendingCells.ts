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

export const reconcileQueuedDraftCellsForCreatedRows = <T extends PendingCellChangeLike>(
  queuedCells: T[],
  // Kept for signature compatibility with existing callers; baseline lookup no longer used (Fix F).
  _createdRows: ViewerRow[],
  persistedIdByClientRowId: Map<string, string>
): T[] => {
  if (queuedCells.length === 0 || persistedIdByClientRowId.size === 0) {
    return queuedCells
  }

  const nextQueuedCells: T[] = []
  for (const cell of queuedCells) {
    const clientRowId = String(cell.rowId)
    const persistedId = persistedIdByClientRowId.get(clientRowId)
    if (!persistedId) {
      nextQueuedCells.push(cell)
      continue
    }

    // Fix F: never drop a queued cell just because its value happens to match the freshly-created
    // row's baseline. The user's queued write is intentional and must reach the server so audit /
    // collaboration logs see the explicit edit. The baseline is just the column default; relying
    // on equality silently swallows legitimate writes (e.g. typing "0" into a numeric column with
    // default 0, or typing the same value into 20 new rows in the same column).
    nextQueuedCells.push({
      ...cell,
      rowId: persistedId
    })
  }

  return nextQueuedCells
}
