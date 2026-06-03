import type { SpreadsheetReplayDelta } from '../core'
import { parseA1Reference, readSpreadsheetRowCellValue } from '../core'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import { toEchoSignature } from '../components/univerGridAuthoritativeHelpers'
import { normalizeBlankLikeEchoSignature } from '../components/univerGridWorkbookMutationModule'
import { createUniverConversionContext } from './univerAdapter'
import {
  buildViewerRowVisualIndexByIdentity,
  getViewerRowVisualIndex,
  lookupViewerRowVisualIndex
} from './spreadsheetPeerRowHydration'
import { resolveViewerRowIndexForRemoteId } from './spreadsheetRowProjection'

export type AuthoritativeGridRegion = {
  minRow: number
  maxRow: number
  minCol: number
  maxCol: number
}

/** Single bounded region or multiple disjoint regions for authoritative grid reapply. */
export type AuthoritativeGridReapplyTarget = AuthoritativeGridRegion | AuthoritativeGridRegion[] | null

export type PendingLocalFilterPolicy = 'protect_in_flight_local_edits' | 'server_authoritative_repair'

export const normalizeAuthoritativeGridReapplyTarget = (
  target: AuthoritativeGridReapplyTarget | undefined
): AuthoritativeGridRegion[] | null => {
  if (target == null) return null
  if (Array.isArray(target)) {
    return target.length > 0 ? target : null
  }
  return [target]
}

export const estimateAuthoritativeGridReapplyTargetCellCount = (
  target: AuthoritativeGridReapplyTarget | undefined
): number => {
  const regions = normalizeAuthoritativeGridReapplyTarget(target)
  if (!regions) return 0
  return regions.reduce(
    (total, region) => total + (region.maxRow - region.minRow + 1) * (region.maxCol - region.minCol + 1),
    0
  )
}

/** Options for `forceAuthoritativeReapply` / `forceGridReapply` (bounded reapply vs full snapshot sync). */
export type ForceAuthoritativeGridReapplyOptions = {
  /** When false, do not clear signatures outside `region` (dirty-region reapply). Default true for full reapply. */
  clearAllSignatures?: boolean
  /** Prefer bulk `setValues` when the collected diff is large enough. */
  preferBulk?: boolean
  /**
   * Required to schedule a full-grid reapply (`region == null`). Normal value/style/version
   * catch-up must stay region-bounded so a briefly stale session snapshot cannot repaint the sheet.
   */
  allowFullGridReapply?: boolean
  /** Diagnostic label for blocked or allowed full-grid reapplies. */
  reason?: string
  /** How pending-local protection should be applied during bounded authoritative repair. */
  pendingLocalFilterPolicy?: PendingLocalFilterPolicy
}

function resolveColumnDisplayName(columns: SpreadsheetColumn[], columnKey: string): string {
  return columns.find(c => c.id === columnKey)?.name ?? columns.find(c => c.name === columnKey)?.name ?? columnKey
}

function resolveRowIndexForRemoteId(
  rowId: string,
  _columns: SpreadsheetColumn[],
  rows: Record<string, unknown>[]
): number | undefined {
  return resolveViewerRowIndexForRemoteId(rows, rowId)
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

function createRegion(row: number, col: number): AuthoritativeGridRegion {
  return { minRow: row, maxRow: row, minCol: col, maxCol: col }
}

function createRowBoundedRegion(row: number, minCol: number, maxCol: number): AuthoritativeGridRegion {
  return { minRow: row, maxRow: row, minCol, maxCol }
}

function mergeRegionsToBoundingBox(regions: readonly AuthoritativeGridRegion[]): AuthoritativeGridRegion | undefined {
  let merged: AuthoritativeGridRegion | undefined
  for (const region of regions) {
    merged = merged
      ? {
          minRow: Math.min(merged.minRow, region.minRow),
          maxRow: Math.max(merged.maxRow, region.maxRow),
          minCol: Math.min(merged.minCol, region.minCol),
          maxCol: Math.max(merged.maxCol, region.maxCol)
        }
      : { ...region }
  }
  return merged
}

function compactContiguousRegions(regions: readonly AuthoritativeGridRegion[]): AuthoritativeGridRegion[] {
  if (regions.length <= 1) return regions.map(region => ({ ...region }))

  const horizontalInput = [...regions].sort(
    (left, right) =>
      left.minRow - right.minRow ||
      left.maxRow - right.maxRow ||
      left.minCol - right.minCol ||
      left.maxCol - right.maxCol
  )
  const horizontallyMerged: AuthoritativeGridRegion[] = []
  for (const region of horizontalInput) {
    const previous = horizontallyMerged[horizontallyMerged.length - 1]
    if (
      previous &&
      previous.minRow === region.minRow &&
      previous.maxRow === region.maxRow &&
      region.minCol <= previous.maxCol + 1 &&
      region.maxCol >= previous.minCol - 1
    ) {
      previous.minCol = Math.min(previous.minCol, region.minCol)
      previous.maxCol = Math.max(previous.maxCol, region.maxCol)
      continue
    }
    horizontallyMerged.push({ ...region })
  }

  const verticalInput = [...horizontallyMerged].sort(
    (left, right) =>
      left.minCol - right.minCol ||
      left.maxCol - right.maxCol ||
      left.minRow - right.minRow ||
      left.maxRow - right.maxRow
  )
  const compacted: AuthoritativeGridRegion[] = []
  for (const region of verticalInput) {
    const previous = compacted[compacted.length - 1]
    if (
      previous &&
      previous.minCol === region.minCol &&
      previous.maxCol === region.maxCol &&
      region.minRow <= previous.maxRow + 1 &&
      region.maxRow >= previous.minRow - 1
    ) {
      previous.minRow = Math.min(previous.minRow, region.minRow)
      previous.maxRow = Math.max(previous.maxRow, region.maxRow)
      continue
    }
    compacted.push({ ...region })
  }

  return compacted.sort(
    (left, right) =>
      left.minRow - right.minRow ||
      left.minCol - right.minCol ||
      left.maxRow - right.maxRow ||
      left.maxCol - right.maxCol
  )
}

function rowHasMaterializedColumnKey(row: Record<string, unknown>, column: SpreadsheetColumn): boolean {
  if (Object.prototype.hasOwnProperty.call(row, column.name)) return true
  if (column.id !== column.name && Object.prototype.hasOwnProperty.call(row, column.id)) return true
  return false
}

function rowHasNonBlankMaterializedCellValue(row: Record<string, unknown>, column: SpreadsheetColumn): boolean {
  if (!rowHasMaterializedColumnKey(row, column)) return false
  const signature = normalizeBlankLikeEchoSignature(toEchoSignature(readSpreadsheetRowCellValue(row, column)))
  return signature !== 'blank'
}

/**
 * Narrow authoritative reapply bounds after row materialization.
 * Includes only grid rows/columns that carry local materialized values, not the full visible width.
 */
export function computeAuthoritativeRegionForMaterializedRows(params: {
  createdGridRowIndices: number[]
  rows: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  createdRows?: Record<string, unknown>[]
  sourceUniverRows?: Record<string, unknown>[]
}): AuthoritativeGridRegion | undefined {
  const { createdGridRowIndices, rows, columns, createdRows, sourceUniverRows } = params
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0 || createdGridRowIndices.length === 0) return undefined

  let region: AuthoritativeGridRegion | undefined

  for (const gridRowIndex of createdGridRowIndices) {
    if (!Number.isInteger(gridRowIndex) || gridRowIndex < 0) continue
    const sessionRow = rows.find((row, index) => getViewerRowVisualIndex(row, index) === gridRowIndex)
    const createdRow = createdRows?.find((row, index) => getViewerRowVisualIndex(row, index) === gridRowIndex)
    const sourceRow = sourceUniverRows?.find((row, index) => getViewerRowVisualIndex(row, index) === gridRowIndex)
    const candidates = [sessionRow, createdRow, sourceRow].filter(
      (row): row is Record<string, unknown> => row != null && typeof row === 'object'
    )

    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
      const column = visibleColumns[colIndex]
      const shouldInclude = candidates.some(row => rowHasNonBlankMaterializedCellValue(row, column))
      if (!shouldInclude) continue
      region = expandRegion(region, gridRowIndex, colIndex)
    }
  }

  return region
}

/**
 * Computes narrow authoritative regions for existing visual rows, limited to columns that
 * already carry non-blank materialized values on those rows.
 */
export function computeAuthoritativeRegionsForVisualRows(params: {
  rowIndices: readonly number[]
  rows: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
}): AuthoritativeGridRegion[] {
  const { rowIndices, rows, columns } = params
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0 || rowIndices.length === 0) return []

  const targetRowIndices = Array.from(new Set(rowIndices.filter(index => Number.isInteger(index) && index >= 0))).sort(
    (left, right) => left - right
  )
  if (targetRowIndices.length === 0) return []

  const rowsByVisualIndex = new Map<number, Record<string, unknown>>()
  rows.forEach((row, index) => {
    const visualIndex = getViewerRowVisualIndex(row, index)
    if (!rowsByVisualIndex.has(visualIndex)) {
      rowsByVisualIndex.set(visualIndex, row)
    }
  })

  const regions: AuthoritativeGridRegion[] = []
  for (const gridRowIndex of targetRowIndices) {
    const row = rowsByVisualIndex.get(gridRowIndex)
    if (!row) continue

    let minCol = Number.POSITIVE_INFINITY
    let maxCol = -1
    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
      const column = visibleColumns[colIndex]
      if (!rowHasNonBlankMaterializedCellValue(row, column)) continue
      if (colIndex < minCol) minCol = colIndex
      if (colIndex > maxCol) maxCol = colIndex
    }

    if (!Number.isFinite(minCol) || maxCol < 0) continue
    regions.push(createRowBoundedRegion(gridRowIndex, minCol, maxCol))
  }

  return compactContiguousRegions(regions)
}

function resolveCreatedRowRegionsForReplayDeltaChange(params: {
  change: SpreadsheetReplayDelta
  columns: SpreadsheetColumn[]
  rows: Record<string, unknown>[]
}): AuthoritativeGridRegion[] {
  const { change, columns, rows } = params
  const payload =
    change.payload && typeof change.payload === 'object' ? (change.payload as Record<string, unknown>) : {}
  const wireRowsSource = Array.isArray(payload.rows)
    ? (payload.rows as unknown[])
    : Array.isArray(((change as Record<string, unknown>).result as Record<string, unknown> | undefined)?.rows)
      ? (((change as Record<string, unknown>).result as Record<string, unknown>).rows as unknown[])
      : []
  if (wireRowsSource.length === 0) return []

  const rowIndexByIdentity = buildViewerRowVisualIndexByIdentity(rows)
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0) return []

  const regions: AuthoritativeGridRegion[] = []
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

    let minCol = Number.POSITIVE_INFINITY
    let maxCol = -1
    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
      const column = visibleColumns[colIndex]
      if (!rowHasNonBlankMaterializedCellValue(data, column)) continue
      if (colIndex < minCol) minCol = colIndex
      if (colIndex > maxCol) maxCol = colIndex
    }
    if (!Number.isFinite(minCol) || maxCol < 0) continue
    regions.push(createRowBoundedRegion(rowIndex, minCol, maxCol))
  }

  return regions
}

export function tryComputeAuthoritativeRegionsFromReplayDeltas(params: {
  changes: SpreadsheetReplayDelta[]
  columns: SpreadsheetColumn[]
  rows: Record<string, unknown>[]
}): AuthoritativeGridRegion[] | undefined {
  const regions: AuthoritativeGridRegion[] = []
  const { changes, columns, rows } = params

  for (const change of changes) {
    const op = String(change.operationType || '')
    const payload =
      change.payload && typeof change.payload === 'object' ? (change.payload as Record<string, unknown>) : {}

    if (op === 'set_cell' || op === 'clear_cell') {
      const rowId = String(payload.rowId ?? '')
      const columnKey = String(payload.columnName ?? payload.column ?? '')
      if (!rowId || !columnKey) continue
      const rowIndex = resolveRowIndexForRemoteId(rowId, columns, rows)
      const colIndex = resolveColIndexForColumnKey(columns, rows, columnKey)
      if (rowIndex == null || colIndex == null || colIndex < 0) continue
      regions.push(createRegion(rowIndex, colIndex))
      continue
    }

    if (op === 'set_range' || op === 'cells_changed') {
      const cells = payload.cells
      if (!Array.isArray(cells)) continue
      for (const cell of cells) {
        if (!cell || typeof cell !== 'object') continue
        const record = cell as Record<string, unknown>
        const rowId = String(record.rowId ?? '')
        const columnKey = String(record.columnName ?? record.column ?? '')
        if (!rowId || !columnKey) continue
        const rowIndex = resolveRowIndexForRemoteId(rowId, columns, rows)
        const colIndex = resolveColIndexForColumnKey(columns, rows, columnKey)
        if (rowIndex == null || colIndex == null || colIndex < 0) continue
        regions.push(createRegion(rowIndex, colIndex))
      }
      continue
    }

    if (op === 'add_rows' || op === 'insert_rows_at') {
      regions.push(
        ...resolveCreatedRowRegionsForReplayDeltaChange({
          change,
          columns,
          rows
        })
      )
      continue
    }

    if (op === 'set_style') {
      const cells = payload.cells
      if (!Array.isArray(cells)) continue
      for (const cell of cells) {
        if (!cell || typeof cell !== 'object') continue
        const record = cell as Record<string, unknown>
        const row = typeof record.row === 'number' ? record.row : undefined
        const col = typeof record.col === 'number' ? record.col : undefined
        if (row != null && col != null && row >= 0 && col >= 0) {
          regions.push(createRegion(row, col))
          continue
        }
        const cellRef = typeof record.cellRef === 'string' ? record.cellRef.trim() : ''
        if (!cellRef) continue
        const a1 = parseA1Reference(cellRef)
        if (a1) regions.push(createRegion(a1.row, a1.col))
      }
    }
  }

  if (regions.length === 0) return undefined
  return compactContiguousRegions(regions)
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
  return mergeRegionsToBoundingBox(tryComputeAuthoritativeRegionsFromReplayDeltas(params) ?? [])
}
