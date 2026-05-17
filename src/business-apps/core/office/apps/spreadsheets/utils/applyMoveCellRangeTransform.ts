import { sortRowsByCanonicalVisualOrder } from './spreadsheetPeerRowHydration'
import type { ViewerRow } from './spreadsheetRowIdentity'

export interface CellRangeRect {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

interface ApplyMoveCellRangeArgs<T extends ViewerRow> {
  rows: T[]
  /** Column names indexed by grid column index, in visible (left-to-right) order. */
  columnNamesByGridIndex: ReadonlyArray<string | null | undefined>
  fromRange: CellRangeRect
  toRange: CellRangeRect
}

/**
 * Relocates client-side `ViewerRow` cell values for a rectangular cell-range move, mirroring the
 * backend `applyMoveCellRangeOperation` semantics: copy each (srcRow, srcCol) value to the
 * corresponding (dstRow, dstCol), then clear the source when it does not overlap the target.
 *
 * Column values are stored on each `ViewerRow` as top-level keys indexed by `column.name`.
 *
 * The caller must ensure ranges are equal-sized rectangles. Out-of-bounds rows/columns are
 * silently skipped — the workbook snapshot stays authoritative for those cells.
 */
export function applyMoveCellRangeTransform<T extends ViewerRow>(args: ApplyMoveCellRangeArgs<T>): T[] {
  const { rows, columnNamesByGridIndex, fromRange, toRange } = args
  const deltaRow = toRange.startRow - fromRange.startRow
  const deltaCol = toRange.startColumn - fromRange.startColumn
  if (deltaRow === 0 && deltaCol === 0) {
    return rows
  }

  const sorted = sortRowsByCanonicalVisualOrder(rows) as T[]
  const draftByIndex = new Map<number, Record<string, unknown>>()
  const getDraft = (index: number): Record<string, unknown> | null => {
    if (index < 0 || index >= sorted.length) return null
    const existing = draftByIndex.get(index)
    if (existing) return existing
    const cloned = { ...(sorted[index] as Record<string, unknown>) }
    draftByIndex.set(index, cloned)
    return cloned
  }

  const reads: Array<{ row: number; col: number; columnName: string; value: unknown; hasValue: boolean }> = []
  for (let row = fromRange.startRow; row <= fromRange.endRow; row += 1) {
    if (row < 0 || row >= sorted.length) continue
    const srcRow = sorted[row] as Record<string, unknown>
    for (let col = fromRange.startColumn; col <= fromRange.endColumn; col += 1) {
      const columnName = columnNamesByGridIndex[col]
      if (!columnName) continue
      const hasValue = Object.prototype.hasOwnProperty.call(srcRow, columnName)
      const value = hasValue ? srcRow[columnName] : undefined
      reads.push({ row, col, columnName, value, hasValue })
    }
  }

  const targetKey = (rowIndex: number, columnName: string): string => `${rowIndex}::${columnName}`
  const targetCells = new Set<string>()
  for (const read of reads) {
    const targetRow = read.row + deltaRow
    const targetCol = read.col + deltaCol
    const targetColumnName = columnNamesByGridIndex[targetCol]
    if (!targetColumnName) continue
    targetCells.add(targetKey(targetRow, targetColumnName))
  }

  for (const read of reads) {
    const targetRow = read.row + deltaRow
    const targetCol = read.col + deltaCol
    const targetColumnName = columnNamesByGridIndex[targetCol]
    if (!targetColumnName) continue
    const draft = getDraft(targetRow)
    if (!draft) continue
    if (read.hasValue) {
      draft[targetColumnName] = read.value
    } else {
      delete draft[targetColumnName]
    }
  }

  for (const read of reads) {
    if (targetCells.has(targetKey(read.row, read.columnName))) continue
    const draft = getDraft(read.row)
    if (!draft) continue
    delete draft[read.columnName]
  }

  if (draftByIndex.size === 0) {
    return rows
  }

  return sorted.map((row, index) => {
    const draft = draftByIndex.get(index)
    if (!draft) return row
    return draft as T
  })
}
