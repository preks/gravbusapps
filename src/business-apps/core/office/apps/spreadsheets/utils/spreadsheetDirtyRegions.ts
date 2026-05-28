import type { SpreadsheetColumn } from '../types/spreadsheet'
import type { SpreadsheetViewerRow } from '../core/SpreadsheetSession'
import type { SpreadsheetDeltaDirtyRegion } from '../core/spreadsheetDeltaRegionPlanner'
import { SPREADSHEET_DELTA_ALL_COLUMNS } from '../core/spreadsheetDeltaRegionPlanner'
import type { AuthoritativeGridRegion } from './spreadsheetAuthoritativeRegion'
import { createUniverConversionContext } from './univerAdapter'
import { resolveViewerRowIndexForRemoteId } from './spreadsheetRowProjection'

/** Backend-authoritative dirty region metadata (v2 batch + committed batch). */
export type SpreadsheetDirtyRegion =
  | {
      type: 'cell'
      rowId?: string
      row?: number
      columnName?: string
      col?: number
    }
  | {
      type: 'rect'
      minRow: number
      maxRow: number
      minCol: number
      maxCol: number
    }
  | { type: 'rowSlot'; startRow: number; count: number }
  | { type: 'columnSlot'; startCol: number; count: number }
  | { type: 'sheetStructure' }

const asDirtyRegionArray = (value: unknown): SpreadsheetDirtyRegion[] => {
  if (!Array.isArray(value)) return []
  const regions: SpreadsheetDirtyRegion[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const type = String(record.type ?? '')
    if (type === 'cell') {
      regions.push({
        type: 'cell',
        rowId: typeof record.rowId === 'string' ? record.rowId : undefined,
        row: typeof record.row === 'number' ? Math.trunc(record.row) : undefined,
        columnName: typeof record.columnName === 'string' ? record.columnName : undefined,
        col: typeof record.col === 'number' ? Math.trunc(record.col) : undefined
      })
      continue
    }
    if (type === 'rect') {
      const minRow = Number(record.minRow)
      const maxRow = Number(record.maxRow)
      const minCol = Number(record.minCol)
      const maxCol = Number(record.maxCol)
      if ([minRow, maxRow, minCol, maxCol].every(Number.isFinite)) {
        regions.push({ type: 'rect', minRow, maxRow, minCol, maxCol })
      }
      continue
    }
    if (type === 'rowSlot') {
      const startRow = Number(record.startRow)
      const count = Number(record.count)
      if (Number.isFinite(startRow) && Number.isFinite(count) && count > 0) {
        regions.push({ type: 'rowSlot', startRow: Math.trunc(startRow), count: Math.trunc(count) })
      }
      continue
    }
    if (type === 'columnSlot') {
      const startCol = Number(record.startCol)
      const count = Number(record.count)
      if (Number.isFinite(startCol) && Number.isFinite(count) && count > 0) {
        regions.push({ type: 'columnSlot', startCol: Math.trunc(startCol), count: Math.trunc(count) })
      }
      continue
    }
    if (type === 'sheetStructure') {
      regions.push({ type: 'sheetStructure' })
    }
  }
  return regions
}

export const parseSpreadsheetDirtyRegions = (value: unknown): SpreadsheetDirtyRegion[] => asDirtyRegionArray(value)

const resolveRowIndex = (
  rowId: string | undefined,
  row: number | undefined,
  rows: SpreadsheetViewerRow[]
): number | undefined => {
  if (typeof row === 'number' && row >= 0) return row
  if (!rowId) return undefined
  return resolveViewerRowIndexForRemoteId(rows, rowId)
}

const resolveColIndex = (
  columnName: string | undefined,
  col: number | undefined,
  columns: SpreadsheetColumn[]
): number | undefined => {
  if (typeof col === 'number' && col >= 0) return col
  if (!columnName) return undefined
  const visible = columns.filter(column => column.isVisible !== false)
  const ctx = createUniverConversionContext(columns, [])
  let colIndex = ctx.columnIdToIndex.get(columnName)
  if (colIndex == null) {
    const idx = visible.findIndex(column => column.id === columnName || column.name === columnName)
    colIndex = idx >= 0 ? idx : undefined
  }
  return colIndex
}

export function convertBackendDirtyRegionsToDeltaRegions(params: {
  dirtyRegions: SpreadsheetDirtyRegion[]
  columns: SpreadsheetColumn[]
  rows: SpreadsheetViewerRow[]
}): SpreadsheetDeltaDirtyRegion[] {
  const { dirtyRegions, columns, rows } = params
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  const delta: SpreadsheetDeltaDirtyRegion[] = []

  for (const region of dirtyRegions) {
    if (region.type === 'sheetStructure') {
      delta.push({ type: 'entireSheetStructure' })
      continue
    }
    if (region.type === 'cell') {
      const rowIndex = resolveRowIndex(region.rowId, region.row, rows)
      const colIndex = resolveColIndex(region.columnName, region.col, columns)
      if (rowIndex != null && colIndex != null) {
        delta.push({
          type: 'rect',
          minRow: rowIndex,
          maxRow: rowIndex,
          minCol: colIndex,
          maxCol: colIndex
        })
      }
      continue
    }
    if (region.type === 'rect') {
      delta.push({
        type: 'rect',
        minRow: region.minRow,
        maxRow: region.maxRow,
        minCol: region.minCol,
        maxCol: region.maxCol >= SPREADSHEET_DELTA_ALL_COLUMNS / 2 ? SPREADSHEET_DELTA_ALL_COLUMNS : region.maxCol
      })
      continue
    }
    if (region.type === 'rowSlot') {
      delta.push({
        type: 'rect',
        minRow: region.startRow,
        maxRow: region.startRow + Math.max(0, region.count) - 1,
        minCol: 0,
        maxCol: SPREADSHEET_DELTA_ALL_COLUMNS
      })
      continue
    }
    if (region.type === 'columnSlot') {
      delta.push({ type: 'colsFrom', startCol: region.startCol })
    }
  }

  if (delta.length === 0 && visibleColumns.length === 0) {
    return []
  }
  return delta
}

export function resolveBackendDirtyRegionsToAuthoritativeRegions(params: {
  dirtyRegions: SpreadsheetDirtyRegion[]
  columns: SpreadsheetColumn[]
  rows: SpreadsheetViewerRow[]
  clampRegion?: (region: AuthoritativeGridRegion) => AuthoritativeGridRegion | null
}): AuthoritativeGridRegion[] {
  const delta = convertBackendDirtyRegionsToDeltaRegions(params)
  if (delta.some(region => region.type === 'entireSheetStructure' || region.type === 'entireUsedRange')) {
    return []
  }

  const visibleColumns = params.columns.filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0) return []

  const regions: AuthoritativeGridRegion[] = []
  const lastCol = visibleColumns.length - 1

  for (const dirty of delta) {
    if (dirty.type === 'rect') {
      const maxColExceedsVisible = dirty.maxCol >= lastCol || dirty.maxCol >= Number.MAX_SAFE_INTEGER / 2
      const region: AuthoritativeGridRegion = {
        minRow: Math.max(0, dirty.minRow),
        maxRow: Math.max(dirty.minRow, dirty.maxRow),
        minCol: Math.max(0, Math.min(dirty.minCol, lastCol)),
        maxCol: maxColExceedsVisible ? lastCol : Math.max(dirty.minCol, Math.min(dirty.maxCol, lastCol))
      }
      const clamped = params.clampRegion ? params.clampRegion(region) : region
      if (clamped) regions.push(clamped)
      continue
    }
    if (dirty.type === 'rowsFrom') {
      const maxRow = Math.max(dirty.startRow, Math.max(0, params.rows.length - 1))
      const region: AuthoritativeGridRegion = {
        minRow: Math.max(0, dirty.startRow),
        maxRow,
        minCol: 0,
        maxCol: lastCol
      }
      const clamped = params.clampRegion ? params.clampRegion(region) : region
      if (clamped) regions.push(clamped)
      continue
    }
    if (dirty.type === 'colsFrom') {
      const region: AuthoritativeGridRegion = {
        minRow: 0,
        maxRow: Math.max(0, params.rows.length - 1),
        minCol: Math.max(0, Math.min(dirty.startCol, lastCol)),
        maxCol: lastCol
      }
      const clamped = params.clampRegion ? params.clampRegion(region) : region
      if (clamped) regions.push(clamped)
    }
  }

  return regions
}

export function mergeAuthoritativeGridRegions(regions: AuthoritativeGridRegion[]): AuthoritativeGridRegion | null {
  if (regions.length === 0) return null
  return regions.reduce<AuthoritativeGridRegion | null>((merged, region) => {
    if (!merged) return { ...region }
    return {
      minRow: Math.min(merged.minRow, region.minRow),
      maxRow: Math.max(merged.maxRow, region.maxRow),
      minCol: Math.min(merged.minCol, region.minCol),
      maxCol: Math.max(merged.maxCol, region.maxCol)
    }
  }, null)
}
