import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import { cellValuesAreEquivalentForPersist } from './spreadsheetPendingCells'
import {
  getViewerRowIdentityCandidates,
  getSpreadsheetRowRefIdentity,
  resolveBackendRowIdForViewerRow,
  resolveSpreadsheetRowRef,
  type ViewerRow
} from './spreadsheetRowIdentity'

interface SetRangeCellLike {
  rowId?: unknown
  columnName?: unknown
  value?: unknown
}

interface CellDedupResult {
  operations: SpreadsheetBatchOperation[]
  droppedCellCount: number
  droppedSetRangeOpCount: number
  droppedCellKeys: string[]
  retainedMismatchedCellKeys: string[]
}

const buildRowLookupByBackendId = (rows: ViewerRow[], isUuid: (value: string) => boolean): Map<string, ViewerRow> => {
  const map = new Map<string, ViewerRow>()
  for (const row of rows) {
    const backendId = resolveBackendRowIdForViewerRow(row, isUuid)
    if (backendId) {
      map.set(backendId, row)
    }
    for (const candidate of getViewerRowIdentityCandidates(row)) {
      if (!map.has(candidate)) map.set(candidate, row)
    }
  }
  return map
}

const isSetRangeLike = (op: SpreadsheetBatchOperation): boolean => op.type === 'set_range' || op.type === 'set_cell'

/**
 * Drops `set_range` / `set_cell` cells whose target row was JUST materialized
 * in this emit dispatch AND whose value already matches the persisted row's
 * current column value. This is the analogue of `shouldSkipFreshRowCellReplay`
 * for the unified emit path: without it, every cell typed into a new row hits
 * the wire twice (once via `add_rows` carrying the value in the row payload,
 * once via `set_range`).
 *
 * Scope guard: we only consider rows in `materializedBackendRowIds` — rows
 * that entered this dispatch as `client_*` temporary ids. For all other rows
 * we leave the cell alone, preserving Fix F semantics (user re-typing the
 * column default into an existing row must still reach the server).
 */
export const dropSetRangeCellsRedundantAfterMaterialization = (
  operations: SpreadsheetBatchOperation[],
  rowsPostFlush: ViewerRow[],
  materializedBackendRowIds: Set<string>,
  isUuid: (value: string) => boolean
): CellDedupResult => {
  if (operations.length === 0 || materializedBackendRowIds.size === 0) {
    return {
      operations,
      droppedCellCount: 0,
      droppedSetRangeOpCount: 0,
      droppedCellKeys: [],
      retainedMismatchedCellKeys: []
    }
  }

  const rowLookup = buildRowLookupByBackendId(rowsPostFlush, isUuid)
  const nextOperations: SpreadsheetBatchOperation[] = []
  const droppedCellKeys: string[] = []
  const retainedMismatchedCellKeys: string[] = []
  let droppedCellCount = 0
  let droppedSetRangeOpCount = 0

  for (const op of operations) {
    if (!isSetRangeLike(op)) {
      nextOperations.push(op)
      continue
    }

    const data = op.data as { cells?: unknown } | undefined
    const cells = Array.isArray(data?.cells) ? (data?.cells as SetRangeCellLike[]) : null
    if (!cells || cells.length === 0) {
      nextOperations.push(op)
      continue
    }

    const keptCells: SetRangeCellLike[] = []
    for (const cell of cells) {
      const rowId = typeof cell.rowId === 'string' ? cell.rowId : ''
      const columnName = typeof cell.columnName === 'string' ? cell.columnName : ''
      if (!rowId || !columnName || !materializedBackendRowIds.has(rowId)) {
        keptCells.push(cell)
        continue
      }
      const row = rowLookup.get(rowId)
      if (!row) {
        keptCells.push(cell)
        continue
      }
      const baseline = row[columnName]
      if (cellValuesAreEquivalentForPersist(baseline, cell.value)) {
        droppedCellCount += 1
        droppedCellKeys.push(`${rowId}\u0000${columnName}`)
        continue
      }
      retainedMismatchedCellKeys.push(`${rowId}\u0000${columnName}`)
      keptCells.push(cell)
    }

    if (keptCells.length === 0) {
      droppedSetRangeOpCount += 1
      continue
    }
    if (keptCells.length === cells.length) {
      nextOperations.push(op)
      continue
    }
    nextOperations.push({
      ...op,
      data: { ...(op.data as Record<string, unknown>), cells: keptCells }
    })
  }

  return {
    operations: nextOperations,
    droppedCellCount,
    droppedSetRangeOpCount,
    droppedCellKeys,
    retainedMismatchedCellKeys
  }
}

export const dropSetRangeCellsRedundantWithAddRows = (operations: SpreadsheetBatchOperation[]): CellDedupResult => {
  if (operations.length === 0) {
    return {
      operations,
      droppedCellCount: 0,
      droppedSetRangeOpCount: 0,
      droppedCellKeys: [],
      retainedMismatchedCellKeys: []
    }
  }

  const seededValuesByClientRowId = new Map<string, Record<string, unknown>>()
  for (const operation of operations) {
    if (operation.type !== 'add_rows') continue
    const rows = Array.isArray(operation.data?.rows) ? (operation.data.rows as Array<Record<string, unknown>>) : []
    for (const row of rows) {
      const clientRowId = typeof row._clientRowId === 'string' ? row._clientRowId : ''
      if (!clientRowId) continue
      const seededValues = seededValuesByClientRowId.get(clientRowId) ?? {}
      for (const [key, value] of Object.entries(row)) {
        if (key.startsWith('_') || value === undefined) continue
        seededValues[key] = value
      }
      seededValuesByClientRowId.set(clientRowId, seededValues)
    }
  }

  if (seededValuesByClientRowId.size === 0) {
    return {
      operations,
      droppedCellCount: 0,
      droppedSetRangeOpCount: 0,
      droppedCellKeys: [],
      retainedMismatchedCellKeys: []
    }
  }

  const nextOperations: SpreadsheetBatchOperation[] = []
  const droppedCellKeys: string[] = []
  const retainedMismatchedCellKeys: string[] = []
  let droppedCellCount = 0
  let droppedSetRangeOpCount = 0

  const shouldKeepCell = (rowIdentity: string, columnName: string, value: unknown): boolean => {
    const seededValues = seededValuesByClientRowId.get(rowIdentity)
    if (!seededValues || !Object.prototype.hasOwnProperty.call(seededValues, columnName)) {
      return true
    }
    if (cellValuesAreEquivalentForPersist(seededValues[columnName], value)) {
      droppedCellCount += 1
      droppedCellKeys.push(`${rowIdentity}\u0000${columnName}`)
      return false
    }
    retainedMismatchedCellKeys.push(`${rowIdentity}\u0000${columnName}`)
    return true
  }

  for (const operation of operations) {
    if (operation.type === 'set_range' && Array.isArray(operation.data?.cells)) {
      const keptCells = operation.data.cells.filter(cell => {
        if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return true
        const record = cell as Record<string, unknown>
        const rowRef = resolveSpreadsheetRowRef(record.rowRef)
        const rowIdentity =
          typeof record.rowId === 'string' && record.rowId
            ? record.rowId
            : rowRef
              ? getSpreadsheetRowRefIdentity(rowRef)
              : ''
        const columnName = typeof record.columnName === 'string' ? record.columnName : ''
        if (!rowIdentity || !columnName) return true
        return shouldKeepCell(rowIdentity, columnName, record.value)
      })
      if (keptCells.length === 0) {
        droppedSetRangeOpCount += 1
        continue
      }
      nextOperations.push(
        keptCells.length === operation.data.cells.length
          ? operation
          : {
              ...operation,
              data: {
                ...operation.data,
                cells: keptCells
              }
            }
      )
      continue
    }

    if (operation.type === 'set_cell' && operation.data && typeof operation.data === 'object') {
      const rowRef = resolveSpreadsheetRowRef(operation.data.rowRef)
      const rowIdentity =
        typeof operation.data.rowId === 'string' && operation.data.rowId
          ? operation.data.rowId
          : rowRef
            ? getSpreadsheetRowRefIdentity(rowRef)
            : ''
      const columnName = typeof operation.data.columnName === 'string' ? operation.data.columnName : ''
      if (!rowIdentity || !columnName || shouldKeepCell(rowIdentity, columnName, operation.data.value)) {
        nextOperations.push(operation)
      }
      continue
    }

    nextOperations.push(operation)
  }

  return {
    operations: nextOperations,
    droppedCellCount,
    droppedSetRangeOpCount,
    droppedCellKeys,
    retainedMismatchedCellKeys
  }
}
