import { readSpreadsheetRowCellValue, type SpreadsheetBulkRemoteCellItem } from '../core'
import type { SpreadsheetColumn } from '../types'
import {
  buildAuthoritativeRowsByGridIndex,
  getAuthoritativeGridRowExtent,
  toEchoSignature
} from '../components/univerGridAuthoritativeHelpers'
import type { AuthoritativeGridRegion } from './spreadsheetAuthoritativeRegion'
import { getCanonicalRowId } from './spreadsheetRowIdentity'
import { getViewerRowVisualIndex } from './spreadsheetPeerRowHydration'
import { getUniverCellStyleRef, resolveUniverCellFormatting } from './univerAdapter'

const cellValuesEqual = (left: unknown, right: unknown): boolean => toEchoSignature(left) === toEchoSignature(right)
const projectorOwnedPaintOptions = { useSenderA1Row: true } as const
const cloneSnapshotValue = <T>(value: T): T => {
  if (value == null) return value
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(value)
    }
  } catch {
    // Fall through to JSON clone.
  }
  return JSON.parse(JSON.stringify(value)) as T
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const buildSnapshotCellStylePatch = (
  cell: Record<string, unknown> | null | undefined,
  workbookStyles: Record<string, unknown>
): { set: Record<string, unknown> } | null => {
  if (!isRecord(cell)) return null

  const set: Record<string, unknown> = {}
  const preferredStyleRef = getUniverCellStyleRef(cell as never, workbookStyles)
  if (preferredStyleRef?.id) {
    set.s = preferredStyleRef.id
  }
  const resolvedFormatting = resolveUniverCellFormatting(cell as never, workbookStyles)
  for (const [key, value] of Object.entries(resolvedFormatting ?? {})) {
    if (key === 's' || value === undefined) continue
    if (preferredStyleRef && stableFormattingValueEqual(preferredStyleRef.definition[key], value)) continue
    set[key] = cloneSnapshotValue(value)
  }

  return Object.keys(set).length > 0 ? { set } : null
}

const stableFormattingValueEqual = (left: unknown, right: unknown): boolean => {
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return left === right
  }
}

/**
 * Builds the explicit cell list the Univer grid should paint from authoritative viewer rows.
 * Used by the session projector (no signature-cache diff).
 */
export function buildAuthoritativePaintCellsFromViewerRows(
  data: readonly Record<string, unknown>[],
  columns: SpreadsheetColumn[],
  options?: { regions?: readonly AuthoritativeGridRegion[] }
): SpreadsheetBulkRemoteCellItem[] {
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0) return []

  const rowsByGridIndex = buildAuthoritativeRowsByGridIndex([...data])
  const rowExtent = getAuthoritativeGridRowExtent([...data])
  const regions = options?.regions ?? []
  const items: SpreadsheetBulkRemoteCellItem[] = []

  const paintAt = (rowIndex: number, colIndex: number) => {
    const row = rowsByGridIndex.get(rowIndex)
    const column = visibleColumns[colIndex]
    if (!column) return
    const value = row ? (readSpreadsheetRowCellValue(row, column) ?? '') : ''
    items.push({
      rowIndex,
      colIndex,
      value,
      rowId: row ? getCanonicalRowId(row) : undefined,
      options: projectorOwnedPaintOptions
    })
  }

  if (regions.length === 0) {
    for (let rowIndex = 0; rowIndex < rowExtent; rowIndex += 1) {
      for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
        paintAt(rowIndex, colIndex)
      }
    }
    return items
  }

  for (const bounded of regions) {
    const rowLoopStart = Math.max(0, bounded.minRow)
    const rowLoopEnd = Math.min(rowExtent, bounded.maxRow + 1)
    const colLoopStart = Math.max(0, bounded.minCol)
    const colLoopEnd = Math.min(visibleColumns.length, bounded.maxCol + 1)
    for (let rowIndex = rowLoopStart; rowIndex < rowLoopEnd; rowIndex += 1) {
      for (let colIndex = colLoopStart; colIndex < colLoopEnd; colIndex += 1) {
        paintAt(rowIndex, colIndex)
      }
    }
  }
  return items
}

export function buildAuthoritativePaintCellsForMaterializedRows(
  data: readonly Record<string, unknown>[],
  columns: SpreadsheetColumn[],
  region: AuthoritativeGridRegion | null | undefined
): SpreadsheetBulkRemoteCellItem[] {
  if (!region) return []
  return buildAuthoritativePaintCellsFromViewerRows(data, columns, { regions: [region] })
}

export function buildSnapshotStylePaintCellsFromWorkbookSnapshot(
  workbookSnapshot: Record<string, unknown> | null,
  sheetId: string,
  data: readonly Record<string, unknown>[],
  columns: SpreadsheetColumn[],
  options?: { regions?: readonly AuthoritativeGridRegion[] }
): SpreadsheetBulkRemoteCellItem[] {
  if (!isRecord(workbookSnapshot) || !sheetId) return []
  const workbookStyles = isRecord(workbookSnapshot.styles) ? (workbookSnapshot.styles as Record<string, unknown>) : {}
  const sheets = isRecord(workbookSnapshot.sheets) ? (workbookSnapshot.sheets as Record<string, unknown>) : {}
  const worksheet = isRecord(sheets[sheetId]) ? (sheets[sheetId] as Record<string, unknown>) : null
  if (!worksheet) return []

  const cellData = isRecord(worksheet.cellData) ? (worksheet.cellData as Record<string, Record<string, unknown>>) : {}
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0) return []

  const rowsByGridIndex = buildAuthoritativeRowsByGridIndex([...data])
  const regions = options?.regions ?? []
  const items: SpreadsheetBulkRemoteCellItem[] = []

  const rowIndexAllowed = (rowIndex: number, colIndex: number): boolean => {
    if (regions.length === 0) return true
    return regions.some(
      region =>
        rowIndex >= region.minRow && rowIndex <= region.maxRow && colIndex >= region.minCol && colIndex <= region.maxCol
    )
  }

  const sharedStyles = Object.keys(workbookStyles).length > 0 ? cloneSnapshotValue(workbookStyles) : null

  for (const [rowKey, rowCells] of Object.entries(cellData)) {
    const rowIndex = Number(rowKey)
    if (!Number.isInteger(rowIndex) || rowIndex < 0 || !isRecord(rowCells)) continue
    const row = rowsByGridIndex.get(rowIndex)
    for (const [colKey, cellValue] of Object.entries(rowCells)) {
      const colIndex = Number(colKey)
      if (
        !Number.isInteger(colIndex) ||
        colIndex < 0 ||
        colIndex >= visibleColumns.length ||
        !rowIndexAllowed(rowIndex, colIndex)
      ) {
        continue
      }
      const stylePatch = buildSnapshotCellStylePatch(
        isRecord(cellValue) ? (cellValue as Record<string, unknown>) : null,
        workbookStyles
      )
      if (!stylePatch) continue
      items.push({
        rowIndex,
        colIndex,
        rowId: row ? getCanonicalRowId(row) : undefined,
        options: {
          ...projectorOwnedPaintOptions,
          targetSheetId: sheetId,
          skipRemoteEchoRegistration: true,
          stylePatch,
          univerStyles: sharedStyles
        }
      })
    }
  }

  return items
}

/**
 * Session-derived changed cells: diff viewer rows before/after a session apply.
 */
export function diffViewerRowsToAuthoritativePaintCells(
  beforeRows: readonly Record<string, unknown>[],
  afterRows: readonly Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): SpreadsheetBulkRemoteCellItem[] {
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  if (visibleColumns.length === 0) return []

  const beforeById = new Map<string, { row: Record<string, unknown>; rowIndex: number }>()
  beforeRows.forEach((row, index) => {
    const rowId = getCanonicalRowId(row)
    if (!rowId) return
    beforeById.set(rowId, { row, rowIndex: getViewerRowVisualIndex(row, index) })
  })
  const afterById = new Map<string, { row: Record<string, unknown>; rowIndex: number }>()
  afterRows.forEach((row, index) => {
    const rowId = getCanonicalRowId(row)
    if (!rowId) return
    afterById.set(rowId, { row, rowIndex: getViewerRowVisualIndex(row, index) })
  })
  const beforeByIndex = buildAuthoritativeRowsByGridIndex([...beforeRows])
  const afterByIndex = buildAuthoritativeRowsByGridIndex([...afterRows])
  const maxRow = Math.max(getAuthoritativeGridRowExtent([...beforeRows]), getAuthoritativeGridRowExtent([...afterRows]))
  const items: SpreadsheetBulkRemoteCellItem[] = []
  const seenCommonRowIds = new Set<string>()

  for (const [rowId, beforeEntry] of beforeById) {
    const afterEntry = afterById.get(rowId)
    if (!afterEntry) continue
    seenCommonRowIds.add(rowId)
    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
      const column = visibleColumns[colIndex]
      const beforeValue = readSpreadsheetRowCellValue(beforeEntry.row, column) ?? ''
      const afterValue = readSpreadsheetRowCellValue(afterEntry.row, column) ?? ''
      if (cellValuesEqual(beforeValue, afterValue)) continue
      items.push({
        rowIndex: afterEntry.rowIndex,
        colIndex,
        value: afterValue,
        rowId,
        options: projectorOwnedPaintOptions
      })
    }
  }

  for (let rowIndex = 0; rowIndex < maxRow; rowIndex += 1) {
    const beforeRow = beforeByIndex.get(rowIndex)
    const afterRow = afterByIndex.get(rowIndex)
    const beforeRowId = beforeRow ? getCanonicalRowId(beforeRow) : ''
    const afterRowId = afterRow ? getCanonicalRowId(afterRow) : ''
    if ((beforeRowId && seenCommonRowIds.has(beforeRowId)) || (afterRowId && seenCommonRowIds.has(afterRowId))) {
      continue
    }
    for (let colIndex = 0; colIndex < visibleColumns.length; colIndex += 1) {
      const column = visibleColumns[colIndex]
      const beforeValue = beforeRow ? readSpreadsheetRowCellValue(beforeRow, column) : undefined
      const afterValue = afterRow ? readSpreadsheetRowCellValue(afterRow, column) : undefined
      const normalizedBefore = beforeRow ? (beforeValue ?? '') : undefined
      const normalizedAfter = afterRow ? (afterValue ?? '') : ''
      if (beforeRow && afterRow && cellValuesEqual(normalizedBefore, normalizedAfter)) {
        continue
      }
      if (!beforeRow && !afterRow) continue
      items.push({
        rowIndex,
        colIndex,
        value: normalizedAfter,
        rowId: afterRow ? getCanonicalRowId(afterRow) : beforeRow ? getCanonicalRowId(beforeRow) : undefined,
        options: projectorOwnedPaintOptions
      })
    }
  }

  return items
}

/** Index rows by durable identity for structural adds/removals outside grid extent. */
export function collectAuthoritativePaintCellsForNewOrRemovedRows(
  beforeRows: readonly Record<string, unknown>[],
  afterRows: readonly Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): SpreadsheetBulkRemoteCellItem[] {
  const visibleColumns = columns.filter(column => column.isVisible !== false)
  const beforeIds = new Set(
    beforeRows.flatMap(row => {
      const id = getCanonicalRowId(row)
      return id ? [id] : []
    })
  )
  const afterIds = new Set(
    afterRows.flatMap(row => {
      const id = getCanonicalRowId(row)
      return id ? [id] : []
    })
  )
  const items: SpreadsheetBulkRemoteCellItem[] = []
  afterRows.forEach((row, index) => {
    const id = getCanonicalRowId(row)
    if (id && beforeIds.has(id)) return
    const gridRowIndex = getViewerRowVisualIndex(row, index)
    visibleColumns.forEach((column, colIndex) => {
      items.push({
        rowIndex: gridRowIndex,
        colIndex,
        value: readSpreadsheetRowCellValue(row, column) ?? '',
        rowId: id || undefined,
        options: projectorOwnedPaintOptions
      })
    })
  })
  beforeRows.forEach((row, index) => {
    const id = getCanonicalRowId(row)
    if (!id || afterIds.has(id)) return
    const gridRowIndex = getViewerRowVisualIndex(row, index)
    visibleColumns.forEach((_column, colIndex) => {
      items.push({
        rowIndex: gridRowIndex,
        colIndex,
        value: '',
        rowId: id,
        options: projectorOwnedPaintOptions
      })
    })
  })
  return items
}

export function mergeAuthoritativePaintCellLists(
  ...lists: readonly SpreadsheetBulkRemoteCellItem[][]
): SpreadsheetBulkRemoteCellItem[] {
  const byKey = new Map<string, SpreadsheetBulkRemoteCellItem>()
  for (const list of lists) {
    for (const item of list) {
      byKey.set(`${item.rowIndex}:${item.colIndex}`, item)
    }
  }
  return [...byKey.values()]
}
