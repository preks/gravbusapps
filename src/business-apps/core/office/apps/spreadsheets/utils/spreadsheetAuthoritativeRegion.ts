import type { SpreadsheetReplayDelta } from '../core'
import { parseA1Reference } from '../core'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import { createUniverConversionContext } from './univerAdapter'
import { rowMatchesRemoteId } from './spreadsheetRowIdentity'

export type AuthoritativeGridRegion = {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
}

/** Options for `forceAuthoritativeReapply` / `forceGridReapply` (bounded reapply vs full snapshot sync). */
export type ForceAuthoritativeGridReapplyOptions = {
  /** When false, do not clear signatures outside `region` (dirty-region reapply). Default true for full reapply. */
  clearAllSignatures?: boolean
  /** Prefer bulk `setValues` when the collected diff is large enough. */
  preferBulk?: boolean
}

function resolveColumnDisplayName(columns: SpreadsheetColumn[], columnKey: string): string {
  return columns.find(c => c.id === columnKey)?.name ?? columns.find(c => c.name === columnKey)?.name ?? columnKey
}

function resolveRowIndexForRemoteId(
  rowId: string,
  columns: SpreadsheetColumn[],
  rows: Record<string, unknown>[]
): number | undefined {
  const ctx = createUniverConversionContext(columns, rows)
  let rowIndex = ctx.rowIdToIndex.get(rowId)
  if (rowIndex === undefined) {
    const idx = rows.findIndex(row => rowMatchesRemoteId(row as Record<string, unknown>, rowId))
    if (idx >= 0) rowIndex = idx
  }
  return rowIndex
}

function resolveColIndexForColumnKey(
  columns: SpreadsheetColumn[],
  rows: Record<string, unknown>[],
  columnKey: string
): number | undefined {
  const colName = resolveColumnDisplayName(columns, columnKey)
  const ctx = createUniverConversionContext(columns, rows)
  let colIndex = ctx.columnIdToIndex.get(colName)
  if (colIndex === undefined) {
    const visible = columns.filter(c => c.isVisible !== false)
    const idx = visible.findIndex(c => c.id === colName || c.name === colName)
    colIndex = idx >= 0 ? idx : undefined
  }
  return colIndex
}

function expandRegion(region: AuthoritativeGridRegion | undefined, row: number, col: number): AuthoritativeGridRegion {
  if (!region) {
    return { minRow: row, maxRow: row, minCol: col, maxCol: col }
  }
  return {
    minRow: Math.min(region.minRow, row),
    maxRow: Math.max(region.maxRow, row),
    minCol: Math.min(region.minCol, col),
    maxCol: Math.max(region.maxCol, col)
  }
}

/**
 * Best-effort bounding box of grid coordinates touched by HTTP replay deltas.
 * Used to narrow authoritative Univer re-sync after conflict recovery / delta catch-up.
 */
export function tryComputeAuthoritativeRegionFromReplayDeltas(params: {
  changes: SpreadsheetReplayDelta[]
  columns: SpreadsheetColumn[]
  rows: Record<string, unknown>[]
}): AuthoritativeGridRegion | undefined {
  let region: AuthoritativeGridRegion | undefined
  const { changes, columns, rows } = params

  for (const change of changes) {
    const op = String(change.operationType || '')
    const payload =
      change.payload && typeof change.payload === 'object' ? (change.payload as Record<string, unknown>) : {}

    if (op === 'set_cell' || op === 'clear_cell') {
      const rowId = String(payload.rowId ?? '')
      const columnKey = String(payload.columnName ?? payload.column ?? '')
      if (!rowId || !columnKey) continue
      const r = resolveRowIndexForRemoteId(rowId, columns, rows)
      const c = resolveColIndexForColumnKey(columns, rows, columnKey)
      if (r == null || c == null || c < 0) continue
      region = expandRegion(region, r, c)
      continue
    }

    if (op === 'set_range' || op === 'cells_changed') {
      const cells = payload.cells
      if (!Array.isArray(cells)) continue
      for (const cell of cells) {
        if (!cell || typeof cell !== 'object') continue
        const rec = cell as Record<string, unknown>
        const rowId = String(rec.rowId ?? '')
        const columnKey = String(rec.columnName ?? rec.column ?? '')
        if (!rowId || !columnKey) continue
        const r = resolveRowIndexForRemoteId(rowId, columns, rows)
        const c = resolveColIndexForColumnKey(columns, rows, columnKey)
        if (r == null || c == null || c < 0) continue
        region = expandRegion(region, r, c)
      }
      continue
    }

    if (op === 'set_style') {
      const cells = payload.cells
      if (!Array.isArray(cells)) continue
      for (const cell of cells) {
        if (!cell || typeof cell !== 'object') continue
        const rec = cell as Record<string, unknown>
        const row = typeof rec.row === 'number' ? rec.row : undefined
        const col = typeof rec.col === 'number' ? rec.col : undefined
        if (row != null && col != null && row >= 0 && col >= 0) {
          region = expandRegion(region, row, col)
          continue
        }
        const cellRef = typeof rec.cellRef === 'string' ? rec.cellRef.trim() : ''
        if (cellRef) {
          const a1 = parseA1Reference(cellRef)
          if (a1) region = expandRegion(region, a1.row, a1.col)
        }
      }
    }
  }

  return region
}
