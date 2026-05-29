import type { SpreadsheetColumn } from '../types/spreadsheet'
import { readSpreadsheetRowCellValue } from './spreadsheetRowCellValue'
import { getSpreadsheetRowAtUniverGridIndex, toEchoSignature } from '../components/univerGridAuthoritativeHelpers'
import { getCanonicalRowId, getClientRowIdentity } from './spreadsheetRowIdentity'

/**
 * A single (rowId, column) cell where the session-row source of truth disagrees
 * with what Univer's grid is actually rendering. Under the Phase 1 single
 * pipeline (`server op → session rows → Univer grid`) this set must always be
 * empty after a remote batch settles; any entry means dual authority leaked back
 * in for that coordinate.
 */
export type SpreadsheetSessionGridDivergence = {
  rowId: string
  columnName: string
  gridRowIndex: number
  colIndex: number
  sessionSignature: string
  gridSignature: string
}

export type SpreadsheetSessionGridTouchedCell = {
  gridRowIndex: number
  colIndex: number
  rowId?: string
}

const extractGridSignature = (
  gridValues: Record<number, Record<number, unknown>>,
  gridRowIndex: number,
  colIndex: number
): string => {
  const rowCells = gridValues[gridRowIndex]
  const raw = rowCells ? rowCells[colIndex] : undefined
  return toEchoSignature(raw ?? '')
}

const resolveSessionRow = (
  sessionRows: Record<string, unknown>[],
  touched: SpreadsheetSessionGridTouchedCell
): Record<string, unknown> | undefined => {
  if (touched.rowId) {
    const byId = sessionRows.find(
      row => getCanonicalRowId(row) === touched.rowId || getClientRowIdentity(row) === touched.rowId
    )
    if (byId) return byId
  }
  return getSpreadsheetRowAtUniverGridIndex(sessionRows, touched.gridRowIndex)
}

/**
 * Compares session-row cell values against a grid readback for the supplied
 * touched cells. Both sides are normalized through {@link toEchoSignature} so
 * scalar `"1"` and Univer cell objects `{ v: 1 }` compare equal. Returns only
 * the cells whose signatures differ.
 *
 * Pure + framework-free so it can be unit-tested without Univer. Style-only
 * differences are ignored because `toEchoSignature` reads the cell value (`v` /
 * `m` / `f`), not formatting.
 */
export function findSessionGridDivergences(params: {
  sessionRows: Record<string, unknown>[]
  visibleColumns: SpreadsheetColumn[]
  gridValues: Record<number, Record<number, unknown>>
  touchedCells: SpreadsheetSessionGridTouchedCell[]
}): SpreadsheetSessionGridDivergence[] {
  const { sessionRows, visibleColumns, gridValues, touchedCells } = params
  const divergences: SpreadsheetSessionGridDivergence[] = []
  const seen = new Set<string>()

  for (const touched of touchedCells) {
    const column = visibleColumns[touched.colIndex]
    if (!column) continue
    const dedupeKey = `${touched.gridRowIndex}\u0000${touched.colIndex}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const sessionRow = resolveSessionRow(sessionRows, touched)
    if (!sessionRow) continue

    const sessionSignature = toEchoSignature(readSpreadsheetRowCellValue(sessionRow, column) ?? '')
    const gridSignature = extractGridSignature(gridValues, touched.gridRowIndex, touched.colIndex)
    if (sessionSignature === gridSignature) continue

    divergences.push({
      rowId: touched.rowId ?? getCanonicalRowId(sessionRow) ?? getClientRowIdentity(sessionRow) ?? '',
      columnName: column.name,
      gridRowIndex: touched.gridRowIndex,
      colIndex: touched.colIndex,
      sessionSignature,
      gridSignature
    })
  }

  return divergences
}
