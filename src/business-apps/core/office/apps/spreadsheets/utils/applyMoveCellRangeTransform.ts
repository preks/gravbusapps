import { getViewerRowVisualIndex, sortRowsByCanonicalVisualOrder } from './spreadsheetPeerRowHydration'
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

const buildSortedIndexByGridRow = <T extends ViewerRow>(sorted: T[]): Map<number, number> => {
  const map = new Map<number, number>()
  sorted.forEach((row, index) => {
    const gridRow = getViewerRowVisualIndex(row as Record<string, unknown>, index)
    if (!map.has(gridRow)) {
      map.set(gridRow, index)
    }
  })
  return map
}

/**
 * Relocates client-side `ViewerRow` cell values for a rectangular cell-range move, mirroring the
 * backend `applyMoveCellRangeOperation` semantics: copy each (srcRow, srcCol) value to the
 * corresponding (dstRow, dstCol), then clear the source when it does not overlap the target.
 *
 * Column values are stored on each `ViewerRow` as top-level keys indexed by `column.name`.
 * Row indices in `fromRange` / `toRange` are **visible grid row indices** (`_gridRowIndex`), not
 * necessarily contiguous array positions in `rows`.
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
  const sortedIndexByGridRow = buildSortedIndexByGridRow(sorted)
  const resolveSortedIndex = (gridRow: number): number | null => sortedIndexByGridRow.get(gridRow) ?? null

  const draftBySortedIndex = new Map<number, Record<string, unknown>>()
  const getDraftForGridRow = (gridRow: number): Record<string, unknown> | null => {
    const sortedIndex = resolveSortedIndex(gridRow)
    if (sortedIndex == null) return null
    const existing = draftBySortedIndex.get(sortedIndex)
    if (existing) return existing
    const cloned = { ...(sorted[sortedIndex] as Record<string, unknown>) }
    draftBySortedIndex.set(sortedIndex, cloned)
    return cloned
  }

  const reads: Array<{ gridRow: number; col: number; columnName: string; value: unknown; hasValue: boolean }> = []
  for (let gridRow = fromRange.startRow; gridRow <= fromRange.endRow; gridRow += 1) {
    const sortedIndex = resolveSortedIndex(gridRow)
    if (sortedIndex == null) continue
    const srcRow = sorted[sortedIndex] as Record<string, unknown>
    for (let col = fromRange.startColumn; col <= fromRange.endColumn; col += 1) {
      const columnName = columnNamesByGridIndex[col]
      if (!columnName) continue
      const hasValue = Object.prototype.hasOwnProperty.call(srcRow, columnName)
      const value = hasValue ? srcRow[columnName] : undefined
      reads.push({ gridRow, col, columnName, value, hasValue })
    }
  }

  const targetKey = (gridRow: number, columnName: string): string => `${gridRow}::${columnName}`
  const targetCells = new Set<string>()
  for (const read of reads) {
    const targetGridRow = read.gridRow + deltaRow
    const targetCol = read.col + deltaCol
    const targetColumnName = columnNamesByGridIndex[targetCol]
    if (!targetColumnName) continue
    targetCells.add(targetKey(targetGridRow, targetColumnName))
  }

  for (const read of reads) {
    const targetGridRow = read.gridRow + deltaRow
    const targetCol = read.col + deltaCol
    const targetColumnName = columnNamesByGridIndex[targetCol]
    if (!targetColumnName) continue
    const draft = getDraftForGridRow(targetGridRow)
    if (!draft) continue
    if (read.hasValue) {
      draft[targetColumnName] = read.value
    } else {
      delete draft[targetColumnName]
    }
  }

  for (const read of reads) {
    if (targetCells.has(targetKey(read.gridRow, read.columnName))) continue
    const draft = getDraftForGridRow(read.gridRow)
    if (!draft) continue
    delete draft[read.columnName]
  }

  if (draftBySortedIndex.size === 0) {
    return rows
  }

  return sorted.map((row, index) => {
    const draft = draftBySortedIndex.get(index)
    if (!draft) return row
    return draft as T
  })
}
