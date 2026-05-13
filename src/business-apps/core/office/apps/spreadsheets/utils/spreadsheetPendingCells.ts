import { getViewerRowIdentityCandidates, type ViewerRow } from './spreadsheetRowIdentity'

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
  createdRows: ViewerRow[],
  persistedIdByClientRowId: Map<string, string>
): T[] => {
  if (queuedCells.length === 0 || persistedIdByClientRowId.size === 0) {
    return queuedCells
  }

  const createdRowById = new Map<string, ViewerRow>()
  createdRows.forEach(row => {
    getViewerRowIdentityCandidates(row).forEach(candidateId => {
      createdRowById.set(candidateId, row)
    })
  })

  const nextQueuedCells: T[] = []
  for (const cell of queuedCells) {
    const clientRowId = String(cell.rowId)
    const persistedId = persistedIdByClientRowId.get(clientRowId)
    if (!persistedId) {
      nextQueuedCells.push(cell)
      continue
    }

    const createdRow = createdRowById.get(clientRowId) ?? createdRowById.get(persistedId)
    const baselineValue = createdRow?.[cell.columnName]
    if (shouldSkipFreshRowCellReplay(baselineValue, cell.value)) {
      continue
    }

    nextQueuedCells.push({
      ...cell,
      rowId: persistedId
    })
  }

  return nextQueuedCells
}
