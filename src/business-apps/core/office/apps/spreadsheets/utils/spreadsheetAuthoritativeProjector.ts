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

const cellValuesEqual = (left: unknown, right: unknown): boolean => toEchoSignature(left) === toEchoSignature(right)

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
      rowId: row ? getCanonicalRowId(row) : undefined
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

  const beforeByIndex = buildAuthoritativeRowsByGridIndex([...beforeRows])
  const afterByIndex = buildAuthoritativeRowsByGridIndex([...afterRows])
  const maxRow = Math.max(getAuthoritativeGridRowExtent([...beforeRows]), getAuthoritativeGridRowExtent([...afterRows]))
  const items: SpreadsheetBulkRemoteCellItem[] = []

  for (let rowIndex = 0; rowIndex < maxRow; rowIndex += 1) {
    const beforeRow = beforeByIndex.get(rowIndex)
    const afterRow = afterByIndex.get(rowIndex)
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
        rowId: afterRow ? getCanonicalRowId(afterRow) : beforeRow ? getCanonicalRowId(beforeRow) : undefined
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
        rowId: id || undefined
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
        rowId: id
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
