import type { SpreadsheetBulkRemoteCellItem } from '../core'

export type SpreadsheetBulkRowStrip = {
  rowIndex: number
  startCol: number
  /** Cells in left-to-right column order. May contain `keepStyle: true` cells the caller routes
   * through the per-cell write path; "safe" strips (all cells without incoming or existing style)
   * are flagged via {@link SpreadsheetBulkRowStrip.styleSafe}. */
  cells: SpreadsheetBulkRemoteCellItem[]
  /** When true, the strip can be painted with a single `worksheet.getRange(...).setValues(...)`
   * call: no incoming style payload, no existing Univer cell style on any column in the strip. */
  styleSafe: boolean
}

/** A bulk cell item has no incoming style payload (univerCell / stylePatch / univerStyles). */
export function bulkCellHasNoIncomingStyle(item: SpreadsheetBulkRemoteCellItem): boolean {
  const options = item.options
  if (!options) return true
  const univerCell = options.univerCell
  if (univerCell && typeof univerCell === 'object' && !Array.isArray(univerCell)) {
    if (Object.keys(univerCell).length > 0) return false
  }
  const stylePatch = options.stylePatch as
    | { set?: Record<string, unknown> | null; unset?: unknown[] | null }
    | undefined
    | null
  if (stylePatch && typeof stylePatch === 'object') {
    if (
      stylePatch.set &&
      typeof stylePatch.set === 'object' &&
      Object.keys(stylePatch.set as Record<string, unknown>).length > 0
    ) {
      return false
    }
    if (Array.isArray(stylePatch.unset) && stylePatch.unset.length > 0) return false
  }
  const univerStyles = options.univerStyles
  if (univerStyles && typeof univerStyles === 'object' && Object.keys(univerStyles).length > 0) {
    return false
  }
  return true
}

/**
 * Groups a flat list of bulk cell items into per-row contiguous column strips.
 *
 * - Cells with the same `rowIndex` and column indices `c, c+1, c+2, ...` are merged into one
 *   strip; a gap (or duplicate column) starts a new strip.
 * - When multiple items target the exact same `(row, col)`, the **last** one wins (matches
 *   `applyRemoteCellUpdatesBulk`'s dedup-by-key semantics).
 *
 * The caller decides which strips are eligible for `setValues` based on:
 *   1. `styleSafe` (no incoming style payload AND no existing Univer cell style)
 *   2. Strip length (e.g. require >= 2 cells before paying the `setValues` overhead)
 *
 * @param items Flat list of bulk cell items (already row-resolved by the caller).
 * @returns Strips ordered by `rowIndex` ascending, then `startCol` ascending. `styleSafe` only
 *   reflects the *incoming* style payload; the caller must still probe existing Univer cell
 *   styles before painting via `setValues` and downgrade the strip if any column is `keepStyle`.
 */
export function planBulkRowStrips(items: SpreadsheetBulkRemoteCellItem[]): SpreadsheetBulkRowStrip[] {
  if (items.length === 0) return []

  // Dedup by (row, col) — last write wins per coordinate.
  const dedup = new Map<string, SpreadsheetBulkRemoteCellItem>()
  for (const item of items) {
    dedup.set(`${item.rowIndex}:${item.colIndex}`, item)
  }

  // Group by row.
  const byRow = new Map<number, SpreadsheetBulkRemoteCellItem[]>()
  for (const item of dedup.values()) {
    const list = byRow.get(item.rowIndex)
    if (list) list.push(item)
    else byRow.set(item.rowIndex, [item])
  }

  const strips: SpreadsheetBulkRowStrip[] = []
  const sortedRows = Array.from(byRow.keys()).sort((a, b) => a - b)
  for (const rowIndex of sortedRows) {
    const rowCells = byRow.get(rowIndex)!
    rowCells.sort((a, b) => a.colIndex - b.colIndex)
    let current: SpreadsheetBulkRowStrip | null = null
    for (const cell of rowCells) {
      if (current && cell.colIndex === current.startCol + current.cells.length) {
        current.cells.push(cell)
        if (current.styleSafe && !bulkCellHasNoIncomingStyle(cell)) current.styleSafe = false
        continue
      }
      if (current) strips.push(current)
      current = {
        rowIndex,
        startCol: cell.colIndex,
        cells: [cell],
        styleSafe: bulkCellHasNoIncomingStyle(cell)
      }
    }
    if (current) strips.push(current)
  }
  return strips
}
