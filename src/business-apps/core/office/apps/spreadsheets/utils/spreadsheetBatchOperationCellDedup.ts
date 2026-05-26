import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import { cellValuesAreEquivalentForPersist } from './spreadsheetPendingCells'
import {
  getViewerRowIdentityCandidates,
  resolveBackendRowIdForViewerRow,
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
    return { operations, droppedCellCount: 0, droppedSetRangeOpCount: 0, droppedCellKeys: [] }
  }

  const rowLookup = buildRowLookupByBackendId(rowsPostFlush, isUuid)
  const nextOperations: SpreadsheetBatchOperation[] = []
  const droppedCellKeys: string[] = []
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
    droppedCellKeys
  }
}
