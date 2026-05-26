import type { SpreadsheetReplayDelta } from '../core'
import { parseA1Reference } from '../core'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import { createUniverConversionContext } from './univerAdapter'
import { rowMatchesRemoteId } from './spreadsheetRowIdentity'
import { buildViewerRowVisualIndexByIdentity, lookupViewerRowVisualIndex } from './spreadsheetPeerRowHydration'

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

    if (op === 'add_rows' || op === 'insert_rows_at') {
      // Created rows arrive either in `payload.rows` (current schema) or `change.result.rows`
      // (post-persist hydration). Each entry exposes its identity through any of `_id`, `id`,
      // `_rowUuid`, `_clientRowId`. We resolve those identities against the **post-replay** row
      // set so the bounding box covers the new visual indices the manager just produced.
      const wireRowsSource = Array.isArray(payload.rows)
        ? (payload.rows as unknown[])
        : Array.isArray(((change as Record<string, unknown>).result as Record<string, unknown> | undefined)?.rows)
          ? (((change as Record<string, unknown>).result as Record<string, unknown>).rows as unknown[])
          : []
      if (wireRowsSource.length === 0) continue
      const rowIndexByIdentity = buildViewerRowVisualIndexByIdentity(rows)
      const visibleColumns = columns.filter(c => c.isVisible !== false)
      if (visibleColumns.length === 0) continue
      let minRow = Number.POSITIVE_INFINITY
      let maxRow = -1
      let minCol = Number.POSITIVE_INFINITY
      let maxCol = -1
      for (const entry of wireRowsSource) {
        if (!entry || typeof entry !== 'object') continue
        const record = entry as Record<string, unknown>
        const data = record.data && typeof record.data === 'object' ? (record.data as Record<string, unknown>) : record
        const identityProbe: Record<string, unknown> = {
          _id: record.id ?? data._id,
          id: record.id ?? data.id,
          _rowUuid: record._rowUuid ?? data._rowUuid,
          _clientRowId: data._clientRowId
        }
        const rowIndex = lookupViewerRowVisualIndex(rowIndexByIdentity, identityProbe)
        if (rowIndex == null || rowIndex < 0) continue
        if (rowIndex < minRow) minRow = rowIndex
        if (rowIndex > maxRow) maxRow = rowIndex
        for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
          const column = visibleColumns[colIndex]
          if (
            !Object.prototype.hasOwnProperty.call(data, column.name) &&
            !Object.prototype.hasOwnProperty.call(data, column.id)
          ) {
            continue
          }
          if (colIndex < minCol) minCol = colIndex
          if (colIndex > maxCol) maxCol = colIndex
        }
      }
      if (Number.isFinite(minRow) && maxRow >= 0 && Number.isFinite(minCol) && maxCol >= 0) {
        region = expandRegion(region, minRow, minCol)
        region = expandRegion(region, maxRow, maxCol)
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
