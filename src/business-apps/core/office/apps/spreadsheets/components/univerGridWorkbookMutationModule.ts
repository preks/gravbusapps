/**
 * Workbook mutation helpers and synchronous remote cell writes shared by bootstrap mount and the grid component.
 */
import type { MutableRefObject } from 'react'
import {
  readSpreadsheetRowCellValue,
  toA1Reference,
  type SpreadsheetFeatureOperationType,
  type SpreadsheetMutationPlannedCell,
  type SpreadsheetStylePatch,
  type SpreadsheetUnifiedMutationBatchOperationType
} from '../core'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import type { ConversionContext } from '../utils/univerAdapter'
import { tryStructuredClone } from '../utils/tryStructuredClone'
import { readWorksheetCellValue } from '../utils/univerWorksheetCellRead'
import type { SheetCellMatrix, SheetCellMatrixCoordinateMode, SheetRangeShape } from './cellMatrixUtils'
import type { ApplyRemoteCellUpdateOptions } from './UniverSheetGrid.types'
import type { RemoteEchoSuppressionEntry } from './univerGridInternalTypes'
import {
  getSpreadsheetRowAtUniverGridIndex,
  normalizeValueForEchoSignature,
  toEchoSignature
} from './univerGridAuthoritativeHelpers'
import { type ClearAllRectangle } from './univerGridRangeSelection'

export const UNIVER_CELL_VALUE_KEYS = ['v', 'f', 'm', 'p', 'ct', 'si', 'custom'] as const

export function cloneWorksheetSnapshot(value: Record<string, unknown>): Record<string, unknown> {
  return tryStructuredClone(value) ?? value
}

export function inlineResolvedStyle(cell: Record<string, unknown>, style: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(style)) {
    cell[key] = cloneWorksheetSnapshot({ value }).value
  }
  delete cell.s
}

export function stripWorksheetValueKeys(
  worksheet: Record<string, unknown>,
  sheetId: string,
  sheetName: string,
  styles: Record<string, unknown> = {}
): Record<string, unknown> {
  const cloned = cloneWorksheetSnapshot(worksheet)
  cloned.id = sheetId
  cloned.name = sheetName
  const cellData = cloned.cellData
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return cloned

  for (const rowCells of Object.values(cellData)) {
    if (!rowCells || typeof rowCells !== 'object' || Array.isArray(rowCells)) continue
    for (const cell of Object.values(rowCells)) {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
      const cellRecord = cell as Record<string, unknown>
      const styleId = typeof cellRecord.s === 'string' ? cellRecord.s : ''
      const styleDefinition = styleId ? styles[styleId] : undefined
      if (styleDefinition && typeof styleDefinition === 'object' && !Array.isArray(styleDefinition)) {
        inlineResolvedStyle(cellRecord, styleDefinition as Record<string, unknown>)
      }
      for (const key of UNIVER_CELL_VALUE_KEYS) {
        delete cellRecord[key]
      }
    }
  }

  return cloned
}

export function worksheetHasCopyPayload(worksheet: Record<string, unknown> | undefined): boolean {
  if (!worksheet) return false
  const cellData = worksheet.cellData
  if (cellData && typeof cellData === 'object' && !Array.isArray(cellData)) {
    if (Object.keys(cellData).length > 0) return true
  }
  const mergeData = worksheet.mergeData
  if (Array.isArray(mergeData) && mergeData.length > 0) return true
  return false
}

export function mergeWorksheetFormattingWithAuthoritativeValues(
  donorWorksheet: Record<string, unknown>,
  valueWorksheet: Record<string, unknown>,
  sheetId: string,
  sheetName: string
): Record<string, unknown> {
  const donorCellData =
    donorWorksheet.cellData && typeof donorWorksheet.cellData === 'object' && !Array.isArray(donorWorksheet.cellData)
      ? (donorWorksheet.cellData as Record<string, Record<string, unknown>>)
      : {}
  const valueCellData =
    valueWorksheet.cellData && typeof valueWorksheet.cellData === 'object' && !Array.isArray(valueWorksheet.cellData)
      ? (valueWorksheet.cellData as Record<string, Record<string, unknown>>)
      : {}
  const mergedCellData: Record<string, Record<string, unknown>> = {}
  const rowKeys = new Set([...Object.keys(donorCellData), ...Object.keys(valueCellData)])

  rowKeys.forEach(rowKey => {
    const donorRow = donorCellData[rowKey] ?? {}
    const valueRow = valueCellData[rowKey] ?? {}
    const mergedRow: Record<string, unknown> = {}
    const colKeys = new Set([...Object.keys(donorRow), ...Object.keys(valueRow)])
    colKeys.forEach(colKey => {
      const donorCell =
        donorRow[colKey] && typeof donorRow[colKey] === 'object' && !Array.isArray(donorRow[colKey])
          ? (donorRow[colKey] as Record<string, unknown>)
          : {}
      const valueCell =
        valueRow[colKey] && typeof valueRow[colKey] === 'object' && !Array.isArray(valueRow[colKey])
          ? (valueRow[colKey] as Record<string, unknown>)
          : {}
      const mergedCell = { ...donorCell }
      if (mergedCell.s && typeof mergedCell.s === 'object' && !Array.isArray(mergedCell.s)) {
        inlineResolvedStyle(mergedCell, mergedCell.s as Record<string, unknown>)
      }
      for (const key of UNIVER_CELL_VALUE_KEYS) {
        delete mergedCell[key]
      }
      for (const key of UNIVER_CELL_VALUE_KEYS) {
        if (Object.prototype.hasOwnProperty.call(valueCell, key)) {
          mergedCell[key] = valueCell[key]
        }
      }
      if (Object.keys(mergedCell).length === 0 && Object.keys(valueCell).length > 0) {
        Object.assign(mergedCell, valueCell)
      }
      if (Object.keys(mergedCell).length > 0) {
        mergedRow[colKey] = mergedCell
      }
    })
    if (Object.keys(mergedRow).length > 0) {
      mergedCellData[rowKey] = mergedRow
    }
  })

  return {
    ...valueWorksheet,
    ...donorWorksheet,
    id: sheetId,
    name: sheetName,
    cellData: mergedCellData
  }
}

/**
 * Univer inline style keys that can appear directly on a cell mutation payload
 * when the mutation changes formatting without going through a shared styleId (`s`).
 * Mirrors Univer's ITextStyle / ICellStyle shape: bold/italic/underline/strikethrough,
 * font family/size/color, background, horizontal/vertical alignment, text rotation,
 * padding, border, and number format. If any of these is present in the incoming
 * mutation payload, we treat the change as style-affecting and emit a `set_style` op.
 */
const UNIVER_INLINE_STYLE_KEYS = [
  'bl',
  'it',
  'ul',
  'st',
  'ol',
  'ff',
  'fs',
  'cl',
  'bg',
  'ht',
  'vt',
  'tb',
  'tr',
  'pd',
  'bd',
  'n'
] as const

export function normalizeStylePatch(value: unknown): SpreadsheetStylePatch | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const set =
    record.set && typeof record.set === 'object' && !Array.isArray(record.set)
      ? ({ ...(record.set as Record<string, unknown>) } as Record<string, unknown>)
      : undefined
  const unset = Array.isArray(record.unset)
    ? record.unset.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
    : undefined
  if ((!set || Object.keys(set).length === 0) && (!unset || unset.length === 0)) return undefined
  return {
    ...(set && Object.keys(set).length > 0 ? { set } : {}),
    ...(unset && unset.length > 0 ? { unset } : {})
  }
}

export function applyStylePatchToUniverCell(
  cell: Record<string, unknown>,
  patch: SpreadsheetStylePatch
): Record<string, unknown> {
  const next = { ...cell }
  for (const key of patch.unset ?? []) {
    if (key) delete next[key]
  }
  if (patch.set && typeof patch.set === 'object') {
    for (const [key, value] of Object.entries(patch.set)) {
      if (value !== undefined) next[key] = value
    }
  }
  return next
}

export function richCellPayloadHasValue(rich: Record<string, unknown>): boolean {
  for (const k of UNIVER_CELL_VALUE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rich, k)) return true
  }
  return false
}

export function normalizeValueForGridWrite(value: unknown): unknown {
  const normalized = normalizeValueForEchoSignature(value)
  if (normalized === undefined || normalized === null) return ''
  if (typeof normalized === 'object' && normalized && !Array.isArray(normalized)) {
    const obj = normalized as Record<string, unknown>
    if (typeof obj.f === 'string') {
      return obj.f.trim().startsWith('=') ? obj.f.trim() : `=${obj.f.trim()}`
    }
  }
  return normalized
}

export function normalizeBlankLikeEchoSignature(signature: string | undefined): string {
  if (signature === 'u:' || signature === 'n:' || signature === 's:') return 'blank'
  return signature ?? 'missing'
}

export function normalizeSelectionReconcileSignature(signature: string | undefined): string {
  return normalizeBlankLikeEchoSignature(signature)
}

export function pruneExpiredRecentMutationEntries(entries: Map<string, number>, now: number): void {
  for (const [key, expiresAt] of entries.entries()) {
    if (expiresAt <= now) {
      entries.delete(key)
    }
  }
}

export function parseLegacySpreadsheetCursorPath(
  path: string[] | undefined,
  sheetId: string,
  context: ConversionContext | null,
  columns: SpreadsheetColumn[],
  normalizeSheetId?: (sheetId: string) => string
): { row: number; col: number; endRow?: number; endCol?: number } | null {
  const normalizedSheetId = normalizeSheetId?.(sheetId) ?? sheetId
  const cursorSheetId = typeof path?.[0] === 'string' ? path[0] : ''
  const normalizedCursorSheetId = normalizeSheetId?.(cursorSheetId) ?? cursorSheetId
  if (!path || path.length < 3 || normalizedCursorSheetId !== normalizedSheetId || !context) return null

  const rowId = String(path[1] ?? '')
  const columnId = String(path[2] ?? '')
  if (!rowId || !columnId) return null

  const row = context.rowIdToIndex.get(rowId)
  if (row == null) return null

  const visibleColumns = columns.filter(column => column.isVisible !== false)
  const col = visibleColumns.findIndex(column => column.id === columnId || column.name === columnId)
  if (col < 0) return null

  return { row, col }
}

export function buildUnifiedPlannerMutationSignature(
  cells: SpreadsheetMutationPlannedCell[],
  styles?: Record<string, unknown>
): string {
  const parts = cells
    .map(
      cell =>
        `${cell.rowIndex}:${cell.colIndex}:${cell.valueAction}:${toEchoSignature(cell.value)}:${JSON.stringify(cell.stylePatch ?? null)}`
    )
    .sort()
  const styleKeys = styles && typeof styles === 'object' ? Object.keys(styles).sort().join(',') : ''
  return `unified:${parts.join('|')}|styles:${styleKeys}`
}

export function isClearLikeMutationCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  if (!normalized) return false
  if (normalized.includes('move-selection') || normalized.includes('navigation')) return false

  return (
    normalized.includes('clear-range') ||
    normalized.includes('clear-selection') ||
    normalized.includes('clear-content') ||
    normalized.includes('clear-value') ||
    normalized.includes('delete-selection') ||
    normalized.includes('deleteselectioncommand') ||
    normalized.includes('move-range') ||
    normalized.includes('move-cell') ||
    normalized.includes('move-row') ||
    normalized.includes('move-column') ||
    normalized.includes('cut-paste') ||
    normalized.includes('cutpaste')
  )
}

/**
 * Returns true for default paste commands that overwrite destination formatting.
 * Excludes paste-special variants (e.g. values-only) because those intentionally
 * preserve target formatting.
 */
export function isFormattingOverwritingPasteCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  if (!normalized.includes('paste')) return false
  if (normalized.includes('copy') && !normalized.includes('cut-paste') && !normalized.includes('cutpaste')) {
    return false
  }
  return (
    !normalized.includes('paste-special') &&
    !normalized.includes('pastespecial') &&
    !normalized.includes('paste_special') &&
    !normalized.includes('value-only') &&
    !normalized.includes('values-only') &&
    !normalized.includes('only-value') &&
    !normalized.includes('only-values') &&
    !normalized.includes('paste-value') &&
    !normalized.includes('paste-values') &&
    !normalized.includes('pastevalue') &&
    !normalized.includes('pastevalues')
  )
}

/** Region-replace ops emit `set_style` patches that unset all formatting keys first (paste-all, cut-paste). */
export function isRegionReplaceStyleCollaborationCommand(commandId: string | undefined): boolean {
  if (!commandId) return false
  if (isFormattingOverwritingPasteCommand(commandId)) return true
  const n = commandId.trim().toLowerCase()
  return n.includes('cut-paste') || n.includes('cutpaste')
}

export function isNativeColumnInsertCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  return normalized.includes('insert') && (normalized.includes('column') || normalized.includes('col'))
}

export function isNativeColumnDeleteCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  const isDelete = normalized.includes('delete') || normalized.includes('remove')
  return isDelete && (normalized.includes('column') || normalized.includes('col'))
}

export function getColumnMutationRange(params: {
  /** Univer column mutations (`sheet.mutation.insert-col`, `remove-col`, …) pass a single range object here. */
  range?: SheetRangeShape | SheetRangeShape[]
  ranges?: SheetRangeShape[]
  startColumn?: number
  endColumn?: number
}): { startColumn: number; endColumn: number } | null {
  const raw = params.range
  const fromRangeProp = Array.isArray(raw) ? raw[0] : raw && typeof raw === 'object' ? raw : undefined
  const fromRangesProp = Array.isArray(params.ranges) ? params.ranges[0] : undefined
  const range = fromRangeProp ?? fromRangesProp
  const startColumn = typeof range?.startColumn === 'number' ? range.startColumn : params.startColumn
  const endColumn = typeof range?.endColumn === 'number' ? range.endColumn : params.endColumn
  if (typeof startColumn !== 'number' || !Number.isFinite(startColumn) || startColumn < 0) return null
  if (typeof endColumn !== 'number' || !Number.isFinite(endColumn) || endColumn < startColumn) {
    return { startColumn, endColumn: startColumn }
  }
  return { startColumn, endColumn }
}

export function getColumnInsertDirection(
  commandId: string,
  params: { direction?: unknown; insertDirection?: unknown }
): 'lefttop' | 'rightbottom' {
  const rawDirection = String(params.direction ?? params.insertDirection ?? '').toLowerCase()
  const normalizedCommand = commandId.trim().toLowerCase()
  if (rawDirection.includes('right') || rawDirection.includes('bottom') || normalizedCommand.includes('right')) {
    return 'rightbottom'
  }
  return 'lefttop'
}

export function isNativeRowInsertCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  return normalized.includes('insert') && (normalized.includes('row') || normalized.includes('rows'))
}

export function getRowMutationRange(params: {
  range?: SheetRangeShape | SheetRangeShape[]
  ranges?: SheetRangeShape[]
  startRow?: number
  endRow?: number
}): { startRow: number; endRow: number } | null {
  const raw = params.range
  const fromRangeProp = Array.isArray(raw) ? raw[0] : raw && typeof raw === 'object' ? raw : undefined
  const fromRangesProp = Array.isArray(params.ranges) ? params.ranges[0] : undefined
  const range = fromRangeProp ?? fromRangesProp
  const startRow = typeof range?.startRow === 'number' ? range.startRow : params.startRow
  const endRow = typeof range?.endRow === 'number' ? range.endRow : params.endRow
  if (typeof startRow !== 'number' || !Number.isFinite(startRow) || startRow < 0) return null
  if (typeof endRow !== 'number' || !Number.isFinite(endRow) || endRow < startRow) {
    return { startRow, endRow: startRow }
  }
  return { startRow, endRow }
}

export function getRowInsertDirection(
  commandId: string,
  params: { direction?: unknown; insertDirection?: unknown }
): 'lefttop' | 'rightbottom' {
  const rawDirection = String(params.direction ?? params.insertDirection ?? '').toLowerCase()
  const normalizedCommand = commandId.trim().toLowerCase()
  if (
    rawDirection.includes('bottom') ||
    rawDirection.includes('down') ||
    normalizedCommand.includes('after') ||
    normalizedCommand.includes('below')
  ) {
    return 'rightbottom'
  }
  return 'lefttop'
}

export function isImplicitClearLikeSetRangeMutation(params: {
  commandId: string
  ranges: SheetRangeShape[]
  payloadCellValue?: SheetCellMatrix
}): boolean {
  const normalized = params.commandId.trim().toLowerCase()
  if (!normalized.includes('set-range-values')) return false
  if (params.payloadCellValue && hasNonBlankPersistableCellMatrixEntries(params.payloadCellValue)) return false
  return params.ranges.some(
    range =>
      Number.isFinite(range.startRow) &&
      Number.isFinite(range.endRow) &&
      Number.isFinite(range.startColumn) &&
      Number.isFinite(range.endColumn) &&
      range.endRow >= range.startRow &&
      range.endColumn >= range.startColumn
  )
}

export function readFormulaFromUnknown(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.startsWith('=') ? trimmed : null
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const f = (value as { f?: unknown }).f
  if (typeof f !== 'string') return null
  const trimmed = f.trim()
  if (trimmed.length === 0) return null
  return trimmed.startsWith('=') ? trimmed : `=${trimmed}`
}

export function readPayloadFormula(
  payloadCellValue: SheetCellMatrix | undefined,
  rowIndex: number,
  colIndex: number
): string | null {
  if (!payloadCellValue) return null
  const row = payloadCellValue[rowIndex]
  if (!row || typeof row !== 'object') return null
  if (!Object.prototype.hasOwnProperty.call(row, colIndex)) return null
  return readFormulaFromUnknown((row as Record<number, unknown>)[colIndex])
}

export function readLiveWorksheetFormula(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  rowIndex: number,
  colIndex: number
): string | null {
  const live = readWorksheetCellValue(worksheet, rowIndex, colIndex)
  if (live && typeof live === 'object' && !Array.isArray(live)) {
    return readFormulaFromUnknown(live)
  }
  if (typeof live === 'string') {
    return readFormulaFromUnknown(live)
  }
  return null
}

/**
 * Preserve `f` (formula) on every cell in `cellValue` whenever the original
 * mutation payload OR the live worksheet still carries one. Two scenarios
 * silently drop formulas without this:
 *
 * 1. User-typed formulas: SetRangeValuesMutation payload has `{f, v}`, but
 *    `handleDetectedCellMutation` rebuilds `cellValue` via
 *    `deriveCellMatrixFromRanges` (which prefers the live scalar value via
 *    Univer's facade `getRange().getValue()`), discarding the payload's `f`
 *    and persisting only the rendered number.
 * 2. Recompute echoes: dependency change re-fires `SheetValueChanged` for the
 *    formula cell with only the new `v`. The live cell still has `f`, but the
 *    derived matrix carries only the scalar.
 *
 * Cells whose entry already declares `f` (including explicit `f: null` to
 * intentionally clear a formula when typing a literal value) are left
 * untouched so user clears still work.
 */
export function enrichCellMatrixWithLiveFormulas(
  worksheet: { getRange?: (row: number, col: number) => unknown } | undefined,
  cellValue: SheetCellMatrix,
  payloadCellValue?: SheetCellMatrix | undefined
): SheetCellMatrix {
  let nextValue: SheetCellMatrix | null = null
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (!Number.isFinite(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (!Number.isFinite(colIndex)) continue
      const entry = (rowCells as Record<number, unknown>)[colIndex]
      if (entry === null) continue
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        if (Object.prototype.hasOwnProperty.call(entry, 'f')) continue
      }
      const formula =
        readPayloadFormula(payloadCellValue, rowIndex, colIndex) ??
        readLiveWorksheetFormula(worksheet, rowIndex, colIndex)
      if (!formula) continue
      if (!nextValue) nextValue = { ...cellValue }
      const nextRow = { ...(nextValue[rowIndex] ?? {}) } as Record<number, unknown>
      let merged: Record<string, unknown>
      if (entry && typeof entry === 'object') {
        merged = { ...(entry as Record<string, unknown>), f: formula }
      } else if (entry === undefined) {
        merged = { f: formula }
      } else {
        merged = { v: entry, f: formula }
      }
      nextRow[colIndex] = merged as unknown
      nextValue[rowIndex] = nextRow as Record<number, unknown>
    }
  }
  return nextValue ?? cellValue
}

export function readSnapshotRangeCellValue(
  snapshot: Record<string, unknown> | null | undefined,
  sheetId: string,
  row: number,
  col: number
): unknown {
  const sheets = snapshot?.sheets
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return undefined
  const sheetRecord = sheets as Record<string, unknown>
  const keyedWorksheet = sheetRecord[sheetId]
  const valueWorksheet = Object.values(sheetRecord).find(
    worksheet => worksheet && typeof worksheet === 'object' && (worksheet as Record<string, unknown>).id === sheetId
  )
  const orderedSheetId =
    Array.isArray(snapshot?.sheetOrder) && snapshot?.sheetOrder[0] != null ? String(snapshot.sheetOrder[0]) : ''
  const worksheet =
    (keyedWorksheet && typeof keyedWorksheet === 'object' ? (keyedWorksheet as Record<string, unknown>) : null) ??
    (orderedSheetId && sheetRecord[orderedSheetId] && typeof sheetRecord[orderedSheetId] === 'object'
      ? (sheetRecord[orderedSheetId] as Record<string, unknown>)
      : null) ??
    (valueWorksheet && typeof valueWorksheet === 'object' ? (valueWorksheet as Record<string, unknown>) : null)
  if (!worksheet) return undefined
  const cellData = worksheet.cellData
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return undefined
  const rowCells = (cellData as Record<string, unknown>)[String(row)] ?? (cellData as Record<number, unknown>)[row]
  if (!rowCells || typeof rowCells !== 'object' || Array.isArray(rowCells)) return undefined
  return (rowCells as Record<string, unknown>)[String(col)] ?? (rowCells as Record<number, unknown>)[col]
}

export function deriveCellMatrixFromWorkbookSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  sheetId: string,
  ranges: SheetRangeShape[],
  maxCells = 10000
): SheetCellMatrix | undefined {
  const derived: SheetCellMatrix = {}
  let visited = 0
  const limitReached = () => visited > maxCells
  const addCellValue = (row: number, col: number) => {
    visited += 1
    if (limitReached()) return
    const value = readSnapshotRangeCellValue(snapshot, sheetId, row, col)
    if (value === undefined) return
    if (!derived[row]) derived[row] = {}
    derived[row][col] = value
  }
  for (const range of ranges) {
    for (let r = range.startRow; r <= range.endRow && !limitReached(); r++) {
      for (let c = range.startColumn; c <= range.endColumn && !limitReached(); c++) {
        addCellValue(r, c)
      }
    }
    if (limitReached()) break
  }
  return Object.keys(derived).length > 0 ? derived : undefined
}

export function getNewRowIndices(cellValue: SheetCellMatrix, ctx: ConversionContext, rowOffset: number): number[] {
  return Object.keys(cellValue)
    .map(k => Number(k))
    .filter(ri => !Number.isNaN(ri) && ctx.rowIndexToId.get(ri + rowOffset) === undefined)
    .sort((a, b) => a - b)
}

export function buildNewRowsFromCellMatrix(params: {
  newRowIndices: number[]
  cellValue: SheetCellMatrix
  ctx: ConversionContext
  colOffset: number
  rowOffset: number
  getClientRowId: (globalRowIndex: number) => string
}): Record<string, unknown>[] {
  const { newRowIndices, cellValue, ctx, colOffset, rowOffset, getClientRowId } = params
  return newRowIndices.map(rowIndex => {
    const rowCells = cellValue[rowIndex]
    const globalRowIndex = rowIndex + rowOffset
    const row: Record<string, unknown> = {
      _id: getClientRowId(globalRowIndex),
      // Preserve the user's visual grid row so snapshot/bootstrap can keep sparse
      // empty rows above newly-created rows instead of compacting them upward.
      _gridRowIndex: globalRowIndex
    }
    if (!rowCells || typeof rowCells !== 'object') return row

    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const columnName =
        ctx.columnIndexToName.get(colIndex + colOffset) ?? ctx.columnIndexToId.get(colIndex + colOffset)
      if (columnName === undefined) continue
      const cell = rowCells[colIndex]
      row[columnName] = cell ?? { v: '' }
    }
    return row
  })
}

/**
 * Extract changed cells from a Univer value-change event.
 *
 * Returns univerRow/univerCol alongside the logical rowId/columnName. The Univer grid indices
 * are the sender's actual visual position and get transmitted as an A1 cellRef in the collaboration
 * operation. The receiver uses this cellRef to update the correct Univer cell, avoiding a bug where
 * data-array-index-based resolution wrote to the wrong row after row additions/deletions caused
 * the data array and Univer grid to drift out of sync.
 */
/** Univer may emit `{ s: ... }` style-only cell payloads; those must not become row-model writes. */
export function isPersistableCellDataMutationValue(value: unknown): boolean {
  if (value === undefined) return false
  if (value === null) return true
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  return 'v' in o || 'f' in o || 'm' in o || 'ct' in o
}

export function hasCollabWireStylePayload(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const o = value as Record<string, unknown>
  if ('s' in o) return true
  for (const k of UNIVER_INLINE_STYLE_KEYS) {
    if (k in o) return true
  }
  return false
}

/**
 * Returns true only when the incoming mutation payload is style-only. Value commits
 * (payloads containing `v`/`f`/`m`/`ct`) are excluded even when Univer carries the
 * existing `s` along on the same payload — that `s` is NOT a style change, it's
 * just the cell's current styleId being re-asserted while the user types a value
 * into a styled cell. Re-asserting on every keystroke would (a) double the batches
 * per edit (one `set_range` for the value + one redundant `set_style`), wasting
 * DB writes + broadcasts, and (b) greatly increase the chance of racing the value
 * batch on `baseVersion` and getting a 409.
 *
 * Multi-cell command-driven operations (drag-fill / paste expansion) can carry
 * both value keys and style keys on the same payload when the style genuinely
 * changes. Those call sites opt into mixed payload handling explicitly via
 * `allowValueCarryingStylePayloads`.
 */
export function isCollabWireCellMutationValue(value: unknown, allowValueCarryingStylePayloads = false): boolean {
  if (!hasCollabWireStylePayload(value)) return false
  if (allowValueCarryingStylePayloads) return true
  const o = value as Record<string, unknown>
  for (const k of UNIVER_CELL_VALUE_KEYS) {
    if (k in o) return false
  }
  return true
}

export function countCellMatrixEntries(cellValue: SheetCellMatrix): number {
  let count = 0
  for (const rowCells of Object.values(cellValue)) {
    if (!rowCells || typeof rowCells !== 'object') continue
    count += Object.keys(rowCells).length
  }
  return count
}

export function hasNonBlankPersistableCellMatrixEntries(cellValue: SheetCellMatrix): boolean {
  for (const rowCells of Object.values(cellValue)) {
    if (!rowCells || typeof rowCells !== 'object') continue
    if (
      Object.values(rowCells).some(cell => {
        if (!isPersistableCellDataMutationValue(cell)) return false
        return normalizeBlankLikeEchoSignature(toEchoSignature(normalizeValueForEchoSignature(cell))) !== 'blank'
      })
    ) {
      return true
    }
  }
  return false
}

export function summarizeRangesForDebug(ranges: SheetRangeShape[]): string {
  return ranges
    .map(range => `${toA1Reference(range.startRow, range.startColumn)}:${toA1Reference(range.endRow, range.endColumn)}`)
    .join('|')
}

export function summarizeCellMatrixForDebug(
  cellValue: SheetCellMatrix | undefined,
  limit = 16
): Record<string, unknown> {
  if (!cellValue) {
    return { count: 0, blankCount: 0, nonBlankCount: 0, cells: '' }
  }
  let count = 0
  let blankCount = 0
  let nonBlankCount = 0
  let persistableCount = 0
  let styleOnlyCount = 0
  const cells: string[] = []
  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      count += 1
      const cell = rowCells[colIndex]
      const signature = normalizeBlankLikeEchoSignature(toEchoSignature(cell))
      if (isPersistableCellDataMutationValue(cell)) persistableCount += 1
      if (isCollabWireCellMutationValue(cell)) styleOnlyCount += 1
      if (signature === 'blank') {
        blankCount += 1
      } else {
        nonBlankCount += 1
      }
      if (cells.length < limit) {
        cells.push(`${toA1Reference(rowIndex, colIndex)}:${signature === 'blank' ? 'blank' : 'value'}`)
      }
    }
  }
  return {
    count,
    blankCount,
    nonBlankCount,
    persistableCount,
    styleOnlyCount,
    cells: cells.join('|')
  }
}

export function detectCellMatrixCoordinateModeHint(
  ranges: SheetRangeShape[],
  value: SheetCellMatrix | undefined
): SheetCellMatrixCoordinateMode {
  if (!value || ranges.length === 0) return 'auto'
  let sawAnyCell = false
  let fitsRelative = true
  let fitsAbsolute = true

  for (const rowKey of Object.keys(value)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = value[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      sawAnyCell = true
      const cellFitsRelative = ranges.some(
        range =>
          rowIndex >= 0 &&
          rowIndex <= range.endRow - range.startRow &&
          colIndex >= 0 &&
          colIndex <= range.endColumn - range.startColumn
      )
      const cellFitsAbsolute = ranges.some(
        range =>
          rowIndex >= range.startRow &&
          rowIndex <= range.endRow &&
          colIndex >= range.startColumn &&
          colIndex <= range.endColumn
      )
      if (!cellFitsRelative) fitsRelative = false
      if (!cellFitsAbsolute) fitsAbsolute = false
    }
  }

  if (!sawAnyCell) return 'auto'
  if (fitsRelative && !fitsAbsolute) return 'relative'
  if (fitsAbsolute && !fitsRelative) return 'absolute'
  return 'auto'
}

export function countCellMatrixWritesAgainstCurrentData(params: {
  cellValue: SheetCellMatrix | undefined
  currentData: Record<string, unknown>[]
  contextColumns: SpreadsheetColumn[]
}): { changed: number; destructiveBlankWrites: number } {
  const { cellValue, currentData, contextColumns } = params
  if (!cellValue) {
    return { changed: 0, destructiveBlankWrites: 0 }
  }
  const visibleColumns = contextColumns.filter(column => column.isVisible !== false)
  let changed = 0
  let destructiveBlankWrites = 0

  for (const rowKey of Object.keys(cellValue)) {
    const rowIndex = Number(rowKey)
    if (Number.isNaN(rowIndex)) continue
    const rowCells = cellValue[rowIndex]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const colIndex = Number(colKey)
      if (Number.isNaN(colIndex)) continue
      const nextValue = rowCells[colIndex]
      if (!isPersistableCellDataMutationValue(nextValue)) continue
      const column = visibleColumns[colIndex]
      const currentRow = getSpreadsheetRowAtUniverGridIndex(currentData, rowIndex)
      const currentValue = column && currentRow ? readSpreadsheetRowCellValue(currentRow, column) : undefined
      const nextSignature = normalizeBlankLikeEchoSignature(toEchoSignature(normalizeValueForEchoSignature(nextValue)))
      const currentSignature = normalizeBlankLikeEchoSignature(toEchoSignature(currentValue))
      if (currentSignature !== nextSignature) {
        changed += 1
      }
      if (currentSignature !== 'blank' && nextSignature === 'blank') {
        destructiveBlankWrites += 1
      }
    }
  }

  return { changed, destructiveBlankWrites }
}

export function isCurrentFacadeWorksheet(
  activeSheet:
    | {
        getSheetId?: () => string
      }
    | null
    | undefined,
  worksheet:
    | {
        getSheetId?: () => string
      }
    | null
    | undefined,
  expectedSheetId?: string | null
): boolean {
  if (!activeSheet || !worksheet) return false
  const activeId = activeSheet.getSheetId?.()
  const worksheetId = worksheet.getSheetId?.()
  if (!activeId || !worksheetId || activeId !== worksheetId) return false
  return !expectedSheetId || worksheetId === expectedSheetId
}

type WorkbookFacadeSheetSwitch = {
  getActiveSheet?: () => { getSheetId?: () => string } | null | undefined
  setActiveSheet?: (id: string) => unknown
}

/**
 * Univer's FRange.getCellData/setValue require the range's worksheet to be the active sheet.
 * Temporarily activate `targetSheetId` for the duration of `fn`, then restore the previous sheet.
 */
export function runWithWorkbookFacadeSheetActive<T>(
  workbook: WorkbookFacadeSheetSwitch | null | undefined,
  targetSheetId: string | null | undefined,
  fn: () => T
): T {
  if (!workbook || !targetSheetId || typeof workbook.setActiveSheet !== 'function') {
    return fn()
  }
  let previousId: string | undefined
  try {
    const prev = workbook.getActiveSheet?.()?.getSheetId?.()
    previousId = typeof prev === 'string' ? prev : undefined
  } catch {
    previousId = undefined
  }
  if (previousId === targetSheetId) {
    return fn()
  }
  try {
    workbook.setActiveSheet(targetSheetId)
  } catch {
    return fn()
  }
  try {
    return fn()
  } finally {
    if (previousId && previousId !== targetSheetId) {
      try {
        workbook.setActiveSheet(previousId)
      } catch {
        // Best-effort restore; leaving the target sheet active is preferable to a half-switched state.
      }
    }
  }
}

export function isUnifiedMutationOperationType(type: string): type is SpreadsheetUnifiedMutationBatchOperationType {
  return (
    type === 'set_range' ||
    type === 'clear_cell' ||
    type === 'set_style' ||
    type === 'clear_all' ||
    type === 'clear_format' ||
    isSpreadsheetFeatureOperationType(type)
  )
}

export function isSpreadsheetFeatureOperationType(type: string): type is SpreadsheetFeatureOperationType {
  return (
    type === 'merge_ranges' ||
    type === 'unmerge_ranges' ||
    type === 'freeze_panes' ||
    type === 'filter_update' ||
    type === 'filter_clear' ||
    type === 'visibility_update' ||
    type === 'protect_ranges_update' ||
    type === 'sheet_protection_update'
  )
}

export function cloneJsonRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return tryStructuredClone(value as Record<string, unknown>) ?? undefined
}

export function resolveSpreadsheetFeatureOperationType(commandId: string): SpreadsheetFeatureOperationType | null {
  const normalized = commandId.toLowerCase()
  if (!normalized) return null
  if (
    normalized.includes('unmerge') ||
    normalized.includes('cancel-merge') ||
    normalized.includes('cancelmerge') ||
    normalized.includes('remove-worksheet-merge')
  ) {
    return 'unmerge_ranges'
  }
  if (normalized.includes('merge')) return 'merge_ranges'
  if (normalized.includes('freeze')) return 'freeze_panes'
  if (normalized.includes('filter')) {
    return normalized.includes('clear') || normalized.includes('remove') || normalized.includes('cancel')
      ? 'filter_clear'
      : 'filter_update'
  }
  if (
    normalized.includes('hide') ||
    normalized.includes('hidden') ||
    normalized.includes('unhide') ||
    normalized.includes('visible')
  ) {
    return 'visibility_update'
  }
  if (normalized.includes('protect')) {
    return normalized.includes('sheet') ? 'sheet_protection_update' : 'protect_ranges_update'
  }
  return null
}

export function resolveVisibilityAxis(
  commandId: string,
  params: Record<string, unknown> | undefined
): 'row' | 'column' {
  const normalized = commandId.toLowerCase()
  const axis = typeof params?.axis === 'string' ? params.axis.toLowerCase() : ''
  if (normalized.includes('row') || normalized.includes('rows') || axis === 'row') return 'row'
  return 'column'
}

export function resolveVisibilityHidden(commandId: string, params: Record<string, unknown> | undefined): boolean {
  const normalized = commandId.toLowerCase()
  if (typeof params?.hidden === 'boolean') return params.hidden
  if (normalized.includes('visible') || normalized.includes('unhide')) return false
  return true
}

export function featureRangesToVisibilityRanges(ranges: ClearAllRectangle[], axis: 'row' | 'column') {
  return ranges.map(range =>
    axis === 'row' ? { start: range.startRow, end: range.endRow } : { start: range.startColumn, end: range.endColumn }
  )
}

/** Synchronous Univer write used by bulk apply and the single-cell remote path (inside microtask). */
export function writeRemoteCellIntoUniverWorksheetSync(params: {
  workbook: { addStyles?: (styles: Record<string, unknown>) => void }
  worksheet: {
    getRange: (
      row: number,
      col: number,
      numRows?: number,
      numColumns?: number
    ) => { getCellData?: () => unknown; setValue: (v: unknown) => unknown } | null | undefined
  }
  rowForApply: number
  colForApply: number
  value: unknown
  options?: ApplyRemoteCellUpdateOptions | undefined
  echoKey: string
  remoteEchoSuppressionRef: MutableRefObject<Map<string, RemoteEchoSuppressionEntry>>
}): void {
  const { workbook, worksheet, rowForApply, colForApply, value, options, echoKey, remoteEchoSuppressionRef } = params
  const rQ = worksheet.getRange(rowForApply, colForApply)
  if (!rQ) return

  const optStyles = options?.univerStyles
  if (optStyles && typeof optStyles === 'object') {
    const keys = Object.keys(optStyles)
    if (keys.length > 0) {
      const fw = workbook as { addStyles?: (s: Record<string, unknown>) => void }
      try {
        fw.addStyles?.(optStyles)
      } catch (styleErr) {
        console.warn('[UniverSheetGrid] addStyles (remote collab) failed:', styleErr)
      }
    }
  }

  // `clear_all` semantics: drop the entire cell entry (value + style ref + inline
  // formatting). Univer's `setValue(null)` on a Range is the equivalent of the
  // matrix write produced by `ClearSelectionAllCommand` and removes the cell from
  // `cellData` entirely on the next snapshot read.
  if (options?.removeCellEntry) {
    try {
      rQ.setValue(null as unknown as never)
    } catch (clearErr) {
      console.warn('[UniverSheetGrid] removeCellEntry setValue(null) failed:', clearErr)
    }
    const echoEntry = remoteEchoSuppressionRef.current.get(echoKey)
    if (echoEntry && Date.now() <= echoEntry.expiresAt) {
      const next = new Set(echoEntry.signatures)
      next.add('blank')
      remoteEchoSuppressionRef.current.set(echoKey, { ...echoEntry, signatures: next })
    }
    return
  }

  const stylePatch = normalizeStylePatch(options?.stylePatch)
  if (stylePatch) {
    try {
      const rawCurrent = (rQ.getCellData?.() as Record<string, unknown> | null | undefined) ?? {}
      const current = rawCurrent && typeof rawCurrent === 'object' && !Array.isArray(rawCurrent) ? rawCurrent : {}
      const patched = applyStylePatchToUniverCell(current, stylePatch)
      const echoEntry = remoteEchoSuppressionRef.current.get(echoKey)
      if (echoEntry && Date.now() <= echoEntry.expiresAt) {
        const next = new Set(echoEntry.signatures)
        next.add(normalizeBlankLikeEchoSignature(toEchoSignature(patched)))
        for (const k of UNIVER_CELL_VALUE_KEYS) {
          if (Object.prototype.hasOwnProperty.call(current, k)) {
            next.add(normalizeBlankLikeEchoSignature(toEchoSignature((current as Record<string, unknown>)[k])))
          }
        }
        remoteEchoSuppressionRef.current.set(echoKey, { ...echoEntry, signatures: next })
      }
      rQ.setValue(patched as any)
    } catch (stylePatchErr) {
      console.warn('[UniverSheetGrid] stylePatch apply failed:', stylePatchErr)
    }
    return
  }

  const rich = options?.univerCell

  if (rich && typeof rich === 'object' && Object.keys(rich).length > 0) {
    const richObj = rich as Record<string, unknown>
    if (!richCellPayloadHasValue(richObj)) {
      try {
        const rawCurrent = (rQ.getCellData?.() as Record<string, unknown> | null | undefined) ?? {}
        const current = rawCurrent && typeof rawCurrent === 'object' && !Array.isArray(rawCurrent) ? rawCurrent : {}
        const merged = { ...current, ...richObj }
        const echoEntry = remoteEchoSuppressionRef.current.get(echoKey)
        if (echoEntry && Date.now() <= echoEntry.expiresAt) {
          const next = new Set(echoEntry.signatures)
          next.add(normalizeBlankLikeEchoSignature(toEchoSignature(merged)))
          for (const k of UNIVER_CELL_VALUE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(current, k)) {
              next.add(normalizeBlankLikeEchoSignature(toEchoSignature((current as Record<string, unknown>)[k])))
            }
          }
          remoteEchoSuppressionRef.current.set(echoKey, { ...echoEntry, signatures: next })
        }
        rQ.setValue(merged as any)
      } catch {
        rQ.setValue(richObj as any)
      }
    } else {
      rQ.setValue(richObj as any)
    }
  } else {
    const scalar = normalizeValueForGridWrite(value)
    try {
      const current = rQ.getCellData?.() as Record<string, unknown> | null | undefined
      const keepStyle = current && typeof current === 'object' && 's' in current && current.s != null
      if (keepStyle) {
        const merged: Record<string, unknown> = { ...current }
        if (typeof scalar === 'string' && scalar.startsWith('=')) {
          merged.f = scalar
          merged.v = null
          merged.p = null
          merged.si = null
        } else if (scalar === '' || scalar == null) {
          merged.v = null
          merged.f = null
          merged.p = null
          merged.si = null
          merged.custom = null
        } else {
          merged.v = scalar as unknown
          merged.f = null
          merged.p = null
          merged.si = null
        }
        rQ.setValue(merged as any)
      } else {
        rQ.setValue(scalar as any)
      }
    } catch {
      rQ.setValue(scalar as any)
    }
  }
}

export function getOrCreateClientRowId(globalRowIndex: number, idMap: Map<number, string>): string {
  let clientRowId = idMap.get(globalRowIndex)
  if (clientRowId) return clientRowId
  try {
    clientRowId = `client_${crypto.randomUUID()}`
  } catch {
    clientRowId = `client_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
  idMap.set(globalRowIndex, clientRowId)
  return clientRowId
}
