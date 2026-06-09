import { getCellRangeMoveMutation } from '../components/univerGridWorkbookMutationModule'
import { extractActiveRangeBounds } from '../components/univerGridRangeSelection'
import type { SheetCellMatrix } from '../components/cellMatrixUtils'
import type { SpreadsheetBulkRemoteCellItem } from '../core/SpreadsheetCollaborationContract'

export type CellRangeRect = {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

export type PendingCutCellRange = {
  sheetId: string
  fromRange: CellRangeRect
  capturedAt: number
}

export type RecentMoveCellRangeFollowUp = {
  sheetId: string
  fromRange: CellRangeRect
  toRange: CellRangeRect
}

export type RecentInsertRowFormulaFollowUp = {
  sheetId: string
  followUpRanges: CellRangeRect[]
}

export type RecentDeleteRowFormulaFollowUp = {
  sheetId: string
  followUpRanges: CellRangeRect[]
}

export type RecentMoveRowFormulaFollowUp = {
  sheetId: string
  followUpRanges: CellRangeRect[]
}

export type RecentInsertColumnFormulaFollowUp = {
  sheetId: string
  followUpRanges: CellRangeRect[]
}

export type RecentDeleteColumnFormulaFollowUp = {
  sheetId: string
  followUpRanges: CellRangeRect[]
}

export type RecentMoveColumnFormulaFollowUp = {
  sheetId: string
  followUpRanges: CellRangeRect[]
}

export type CutPasteFollowUpCollabDecision = {
  suppress: boolean
  payloadCellValue?: SheetCellMatrix
  ranges?: CellRangeRect[]
}

const CUT_PASTE_COLLAB_SUPPRESSION_MS = 2000
const ROW_INSERT_FORMULA_FOLLOW_UP_SUPPRESSION_MS = 500

export const cutPasteCollabSuppressionDurationMs = (): number => CUT_PASTE_COLLAB_SUPPRESSION_MS
export const rowInsertFormulaFollowUpSuppressionDurationMs = (): number => ROW_INSERT_FORMULA_FOLLOW_UP_SUPPRESSION_MS

type SuppressionWindowRef = { current: number }
type RecentMoveCellRangeRef = { current: RecentMoveCellRangeFollowUp | null }
type RecentInsertRowFormulaRef = { current: RecentInsertRowFormulaFollowUp | null }
type RecentDeleteRowFormulaRef = { current: RecentDeleteRowFormulaFollowUp | null }
type RecentMoveRowFormulaRef = { current: RecentMoveRowFormulaFollowUp | null }
type RecentInsertColumnFormulaRef = { current: RecentInsertColumnFormulaFollowUp | null }
type RecentDeleteColumnFormulaRef = { current: RecentDeleteColumnFormulaFollowUp | null }
type RecentMoveColumnFormulaRef = { current: RecentMoveColumnFormulaFollowUp | null }

type StructuralAxis = 'row' | 'column'
type StructuralFormulaFollowUp = { sheetId: string; followUpRanges: CellRangeRect[] }
type StructuralMoveFollowUp = { sourceStartIndex: number; count: number; destinationStartIndex: number }

function countCellsInMatrix(cellValue: unknown): number {
  if (!cellValue || typeof cellValue !== 'object') return 0
  let count = 0
  for (const rowCells of Object.values(cellValue as Record<string, unknown>)) {
    if (!rowCells || typeof rowCells !== 'object') continue
    count += Object.keys(rowCells as Record<string, unknown>).length
  }
  return count
}

export function armMoveCellRangeFollowUpCollabSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentMoveRef: RecentMoveCellRangeRef
  sheetId: string
  fromRange: CellRangeRect
  toRange: CellRangeRect
  now?: number
}): number {
  const now = params.now ?? Date.now()
  const suppressUntilMs = now + cutPasteCollabSuppressionDurationMs()
  params.suppressionRef.current = suppressUntilMs
  params.recentMoveRef.current = {
    sheetId: params.sheetId,
    fromRange: params.fromRange,
    toRange: params.toRange
  }
  return suppressUntilMs
}

export function armRowInsertFormulaFollowUpSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentInsertRef: RecentInsertRowFormulaRef
  sheetId: string
  insertIndex: number
  count: number
  direction: 'lefttop' | 'rightbottom'
  now?: number
}): number {
  const now = params.now ?? Date.now()
  const suppressUntilMs = now + rowInsertFormulaFollowUpSuppressionDurationMs()
  const insertedStartRow = params.direction === 'rightbottom' ? params.insertIndex + 1 : params.insertIndex
  mergeStructuralFormulaFollowUpSuppression({
    suppressionRef: params.suppressionRef,
    recentFollowUpRef: params.recentInsertRef,
    sheetId: params.sheetId,
    followUpRanges: buildInsertStructuralFollowUpRanges({
      axis: 'row',
      insertIndex: insertedStartRow,
      count: params.count
    }),
    suppressUntilMs
  })
  return suppressUntilMs
}

export function armRowDeleteFormulaFollowUpSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentDeleteRef: RecentDeleteRowFormulaRef
  sheetId: string
  deleteStartRow: number
  count: number
  now?: number
}): number {
  const now = params.now ?? Date.now()
  const suppressUntilMs = now + rowInsertFormulaFollowUpSuppressionDurationMs()
  mergeStructuralFormulaFollowUpSuppression({
    suppressionRef: params.suppressionRef,
    recentFollowUpRef: params.recentDeleteRef,
    sheetId: params.sheetId,
    followUpRanges: buildDeleteStructuralFollowUpRanges({
      axis: 'row',
      deleteStartIndex: params.deleteStartRow
    }),
    suppressUntilMs
  })
  return suppressUntilMs
}

export function armRowMoveFormulaFollowUpSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentMoveRef: RecentMoveRowFormulaRef
  sheetId: string
  sourceStartRow: number
  count: number
  destinationStartRow: number
  now?: number
}): number {
  const now = params.now ?? Date.now()
  const suppressUntilMs = now + rowInsertFormulaFollowUpSuppressionDurationMs()
  mergeStructuralFormulaFollowUpSuppression({
    suppressionRef: params.suppressionRef,
    recentFollowUpRef: params.recentMoveRef,
    sheetId: params.sheetId,
    followUpRanges: buildMoveStructuralFollowUpRanges({
      axis: 'row',
      moves: [
        {
          sourceStartIndex: params.sourceStartRow,
          count: params.count,
          destinationStartIndex: params.destinationStartRow
        }
      ]
    }),
    suppressUntilMs
  })
  return suppressUntilMs
}

export function armColumnInsertFormulaFollowUpSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentInsertRef: RecentInsertColumnFormulaRef
  sheetId: string
  insertIndex: number
  count: number
  direction: 'lefttop' | 'rightbottom'
  now?: number
}): number {
  const now = params.now ?? Date.now()
  const suppressUntilMs = now + rowInsertFormulaFollowUpSuppressionDurationMs()
  const insertedStartColumn = params.direction === 'rightbottom' ? params.insertIndex + 1 : params.insertIndex
  mergeStructuralFormulaFollowUpSuppression({
    suppressionRef: params.suppressionRef,
    recentFollowUpRef: params.recentInsertRef,
    sheetId: params.sheetId,
    followUpRanges: buildInsertStructuralFollowUpRanges({
      axis: 'column',
      insertIndex: insertedStartColumn,
      count: params.count
    }),
    suppressUntilMs
  })
  return suppressUntilMs
}

export function armColumnDeleteFormulaFollowUpSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentDeleteRef: RecentDeleteColumnFormulaRef
  sheetId: string
  deleteStartColumn: number
  now?: number
}): number {
  const now = params.now ?? Date.now()
  const suppressUntilMs = now + rowInsertFormulaFollowUpSuppressionDurationMs()
  mergeStructuralFormulaFollowUpSuppression({
    suppressionRef: params.suppressionRef,
    recentFollowUpRef: params.recentDeleteRef,
    sheetId: params.sheetId,
    followUpRanges: buildDeleteStructuralFollowUpRanges({
      axis: 'column',
      deleteStartIndex: params.deleteStartColumn
    }),
    suppressUntilMs
  })
  return suppressUntilMs
}

export function armColumnMoveFormulaFollowUpSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentMoveRef: RecentMoveColumnFormulaRef
  sheetId: string
  moves: StructuralMoveFollowUp[]
  now?: number
}): number {
  const now = params.now ?? Date.now()
  const suppressUntilMs = now + rowInsertFormulaFollowUpSuppressionDurationMs()
  mergeStructuralFormulaFollowUpSuppression({
    suppressionRef: params.suppressionRef,
    recentFollowUpRef: params.recentMoveRef,
    sheetId: params.sheetId,
    followUpRanges: buildMoveStructuralFollowUpRanges({
      axis: 'column',
      moves: params.moves
    }),
    suppressUntilMs
  })
  return suppressUntilMs
}

function buildAxisRange(axis: StructuralAxis, startIndex: number, endIndex: number): CellRangeRect {
  if (axis === 'row') {
    return {
      startRow: startIndex,
      endRow: endIndex,
      startColumn: 0,
      endColumn: Number.MAX_SAFE_INTEGER
    }
  }
  return {
    startRow: 0,
    endRow: Number.MAX_SAFE_INTEGER,
    startColumn: startIndex,
    endColumn: endIndex
  }
}

function buildInsertStructuralFollowUpRanges(params: {
  axis: StructuralAxis
  insertIndex: number
  count: number
}): CellRangeRect[] {
  return [buildAxisRange(params.axis, params.insertIndex, params.insertIndex + params.count)]
}

function buildDeleteStructuralFollowUpRanges(params: {
  axis: StructuralAxis
  deleteStartIndex: number
}): CellRangeRect[] {
  return [buildAxisRange(params.axis, params.deleteStartIndex, Number.MAX_SAFE_INTEGER)]
}

function buildMoveStructuralFollowUpRanges(params: {
  axis: StructuralAxis
  moves: StructuralMoveFollowUp[]
}): CellRangeRect[] {
  if (params.moves.length === 0) return []
  const minStructuralIndex = Math.min(
    ...params.moves.flatMap(move => [move.sourceStartIndex, move.destinationStartIndex])
  )
  const ranges: CellRangeRect[] = [buildAxisRange(params.axis, minStructuralIndex, Number.MAX_SAFE_INTEGER)]
  for (const move of params.moves) {
    const sourceEndIndex = move.sourceStartIndex + move.count - 1
    const destinationEndIndex = move.destinationStartIndex + move.count - 1
    ranges.push(buildAxisRange(params.axis, move.sourceStartIndex, sourceEndIndex))
    ranges.push(buildAxisRange(params.axis, move.destinationStartIndex, destinationEndIndex))
  }
  return ranges
}

function mergeStructuralFormulaFollowUpSuppression(params: {
  suppressionRef: SuppressionWindowRef
  recentFollowUpRef: { current: StructuralFormulaFollowUp | null }
  sheetId: string
  followUpRanges: CellRangeRect[]
  suppressUntilMs: number
}): void {
  params.suppressionRef.current = Math.max(params.suppressionRef.current, params.suppressUntilMs)
  const previous = params.recentFollowUpRef.current
  params.recentFollowUpRef.current =
    previous && previous.sheetId === params.sheetId
      ? {
          sheetId: params.sheetId,
          followUpRanges: [...previous.followUpRanges, ...params.followUpRanges]
        }
      : {
          sheetId: params.sheetId,
          followUpRanges: params.followUpRanges
        }
}

function rangesIntersect(a: CellRangeRect, b: CellRangeRect): boolean {
  return !(a.endRow < b.startRow || a.startRow > b.endRow || a.endColumn < b.startColumn || a.startColumn > b.endColumn)
}

function rangesTouchStructuralFollowUp(rangesToCheck: CellRangeRect[], followUpRanges: CellRangeRect[]): boolean {
  return rangesToCheck.some(range => followUpRanges.some(followUpRange => rangesIntersect(range, followUpRange)))
}

function allRangesTouchStructuralFollowUp(rangesToCheck: CellRangeRect[], followUpRanges: CellRangeRect[]): boolean {
  return rangesToCheck.every(range => followUpRanges.some(followUpRange => rangesIntersect(range, followUpRange)))
}

function payloadTouchesRecentMove(payloadCellValue: unknown, recentMove: RecentMoveCellRangeFollowUp): boolean {
  if (!payloadCellValue || typeof payloadCellValue !== 'object') return false
  for (const rowKey of Object.keys(payloadCellValue as Record<string, unknown>)) {
    const row = Number(rowKey)
    if (!Number.isFinite(row)) continue
    const rowCells = (payloadCellValue as Record<string, unknown>)[rowKey]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells as Record<string, unknown>)) {
      const col = Number(colKey)
      if (!Number.isFinite(col)) continue
      const point = { startRow: row, endRow: row, startColumn: col, endColumn: col }
      if (rangesIntersect(point, recentMove.fromRange) || rangesIntersect(point, recentMove.toRange)) {
        return true
      }
    }
  }
  return false
}

function rangesTouchRecentMove(params: {
  worksheetId?: string | null
  ranges?: CellRangeRect[]
  recentMove?: RecentMoveCellRangeFollowUp | null
  payloadCellValue?: unknown
}): boolean {
  const { recentMove, ranges, worksheetId, payloadCellValue } = params
  if (!recentMove) return false
  if (worksheetId && worksheetId !== recentMove.sheetId) return false
  if (Array.isArray(ranges) && ranges.length > 0) {
    return ranges.some(
      range => rangesIntersect(range, recentMove.fromRange) || rangesIntersect(range, recentMove.toRange)
    )
  }
  return payloadTouchesRecentMove(payloadCellValue, recentMove)
}

function pointTouchesRecentMove(row: number, col: number, recentMove: RecentMoveCellRangeFollowUp): boolean {
  const point = { startRow: row, endRow: row, startColumn: col, endColumn: col }
  return rangesIntersect(point, recentMove.fromRange) || rangesIntersect(point, recentMove.toRange)
}

function isClearLikeCellEntry(cellValue: unknown): boolean {
  if (cellValue == null) return true
  if (!cellValue || typeof cellValue !== 'object' || Array.isArray(cellValue)) return false
  const obj = cellValue as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(obj, 'f') && obj.f === null) return true
  if (Object.prototype.hasOwnProperty.call(obj, 'v') && obj.v == null) return true
  return false
}

function isFormulaLikeCellEntry(cellValue: unknown): boolean {
  if (!cellValue || typeof cellValue !== 'object' || Array.isArray(cellValue)) return false
  const obj = cellValue as Record<string, unknown>
  return typeof obj.f === 'string' && obj.f.trim().length > 0
}

function payloadContainsOnlyFormulaCells(payloadCellValue: unknown): boolean {
  if (!payloadCellValue || typeof payloadCellValue !== 'object') return false
  let sawFormulaCell = false
  for (const rowCells of Object.values(payloadCellValue as Record<string, unknown>)) {
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const cellValue of Object.values(rowCells as Record<string, unknown>)) {
      if (isClearLikeCellEntry(cellValue)) continue
      if (!isFormulaLikeCellEntry(cellValue)) {
        return false
      }
      sawFormulaCell = true
    }
  }
  return sawFormulaCell
}

function isSingleCellRange(range: CellRangeRect): boolean {
  return range.startRow === range.endRow && range.startColumn === range.endColumn
}

function shouldPreserveSingleCellFormulaFollowUp(params: {
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
}): boolean {
  if (!payloadContainsOnlyFormulaCells(params.payloadCellValue)) return false
  const rangesToCheck =
    Array.isArray(params.ranges) && params.ranges.length > 0
      ? params.ranges
      : computeMatrixBounds(params.payloadCellValue)
  if (rangesToCheck.length !== 1) return false
  return isSingleCellRange(rangesToCheck[0])
}

function isFormulaLikeGridReapplyCellValue(cellValue: unknown): boolean {
  if (isFormulaLikeCellEntry(cellValue)) return true
  return typeof cellValue === 'string' && cellValue.trim().startsWith('=')
}

function isFormulaLikeRowMoveReapplyCell(cell: SpreadsheetBulkRemoteCellItem): boolean {
  const univerCell =
    cell.options && typeof cell.options === 'object' && !Array.isArray(cell.options)
      ? cell.options.univerCell
      : undefined
  return isFormulaLikeGridReapplyCellValue(univerCell) || isFormulaLikeGridReapplyCellValue(cell.value)
}

function computeMatrixBounds(payloadCellValue: unknown): CellRangeRect[] {
  if (!payloadCellValue || typeof payloadCellValue !== 'object') return []
  let minRow = Number.POSITIVE_INFINITY
  let maxRow = Number.NEGATIVE_INFINITY
  let minCol = Number.POSITIVE_INFINITY
  let maxCol = Number.NEGATIVE_INFINITY
  for (const rowKey of Object.keys(payloadCellValue as Record<string, unknown>)) {
    const row = Number(rowKey)
    if (!Number.isFinite(row)) continue
    const rowCells = (payloadCellValue as Record<string, unknown>)[rowKey]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells as Record<string, unknown>)) {
      const col = Number(colKey)
      if (!Number.isFinite(col)) continue
      minRow = Math.min(minRow, row)
      maxRow = Math.max(maxRow, row)
      minCol = Math.min(minCol, col)
      maxCol = Math.max(maxCol, col)
    }
  }
  if (!Number.isFinite(minRow) || !Number.isFinite(minCol) || !Number.isFinite(maxRow) || !Number.isFinite(maxCol)) {
    return []
  }
  return [{ startRow: minRow, endRow: maxRow, startColumn: minCol, endColumn: maxCol }]
}

function filterPayloadCellMatrixOutsideRecentMove(
  payloadCellValue: SheetCellMatrix | undefined,
  recentMove: RecentMoveCellRangeFollowUp
): { payloadCellValue?: SheetCellMatrix; ranges?: CellRangeRect[] } {
  if (!payloadCellValue || typeof payloadCellValue !== 'object') {
    return {}
  }
  const filteredMatrix: Record<number, Record<number, unknown>> = {}
  for (const rowKey of Object.keys(payloadCellValue as Record<string, unknown>)) {
    const row = Number(rowKey)
    if (!Number.isFinite(row)) continue
    const rowCells = (payloadCellValue as Record<string, unknown>)[rowKey]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells as Record<string, unknown>)) {
      const col = Number(colKey)
      if (!Number.isFinite(col)) continue
      const cellValue = (rowCells as Record<string, unknown>)[colKey]
      if (pointTouchesRecentMove(row, col, recentMove) && !isClearLikeCellEntry(cellValue)) {
        continue
      }
      const nextRow = filteredMatrix[row] ?? {}
      nextRow[col] = cellValue
      filteredMatrix[row] = nextRow
    }
  }
  if (countCellsInMatrix(filteredMatrix) === 0) {
    return {}
  }
  return {
    payloadCellValue: filteredMatrix,
    ranges: computeMatrixBounds(filteredMatrix)
  }
}

export function isNativeCutPasteCommand(commandId: string): boolean {
  const normalized = commandId.trim().toLowerCase()
  if (!normalized) return false
  return normalized === 'sheet.command.cut-paste' || normalized.includes('cut-paste') || normalized.includes('cutpaste')
}

export function cellRangeRectsSameDimensions(fromRange: CellRangeRect, toRange: CellRangeRect): boolean {
  const fromRowSpan = fromRange.endRow - fromRange.startRow
  const toRowSpan = toRange.endRow - toRange.startRow
  const fromColSpan = fromRange.endColumn - fromRange.startColumn
  const toColSpan = toRange.endColumn - toRange.startColumn
  return fromRowSpan === toRowSpan && fromColSpan === toColSpan
}

export function captureCutSelectionRange(workbook: unknown, sheetId: string): PendingCutCellRange | null {
  const bounds = extractActiveRangeBounds(workbook)
  if (!bounds) return null
  return {
    sheetId,
    fromRange: {
      startRow: bounds.startRow,
      endRow: bounds.endRow,
      startColumn: bounds.startColumn,
      endColumn: bounds.endColumn
    },
    capturedAt: Date.now()
  }
}

export function resolveCutPasteCellRangeMove(params: {
  commandParams: Parameters<typeof getCellRangeMoveMutation>[0] | undefined
  pendingCut: PendingCutCellRange | null
  activeSheetId: string
  workbook: unknown
}): { fromRange: CellRangeRect; toRange: CellRangeRect } | null {
  const fromCommand = getCellRangeMoveMutation(params.commandParams ?? {})
  if (fromCommand && cellRangeRectsSameDimensions(fromCommand.fromRange, fromCommand.toRange)) {
    return fromCommand
  }

  const pasteBounds = extractActiveRangeBounds(params.workbook)
  const toRange =
    fromCommand?.toRange ??
    (pasteBounds
      ? {
          startRow: pasteBounds.startRow,
          endRow: pasteBounds.endRow,
          startColumn: pasteBounds.startColumn,
          endColumn: pasteBounds.endColumn
        }
      : null)

  const pendingCut =
    params.pendingCut && params.pendingCut.sheetId === params.activeSheetId ? params.pendingCut.fromRange : null
  const fromRange = fromCommand?.fromRange ?? pendingCut
  if (!fromRange || !toRange) return null
  if (!cellRangeRectsSameDimensions(fromRange, toRange)) return null
  return { fromRange, toRange }
}

export function shouldSuppressCutPasteFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  commandKind: string
  isRegionReplaceStyleCommand: boolean
  payloadCellValue?: SheetCellMatrix
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentMove?: RecentMoveCellRangeFollowUp | null
}): boolean {
  return resolveCutPasteFollowUpCollab(params).suppress
}

export function isMoveDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentMove?: RecentMoveCellRangeFollowUp | null
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.commandId.includes('set-range-values')) return false
  if (!params.recentMove) return false
  if (
    shouldPreserveSingleCellFormulaFollowUp({
      payloadCellValue: params.payloadCellValue,
      ranges: params.ranges
    })
  ) {
    return false
  }
  if (!payloadContainsOnlyFormulaCells(params.payloadCellValue)) return false
  return !rangesTouchRecentMove({
    worksheetId: params.worksheetId,
    ranges: params.ranges,
    recentMove: params.recentMove,
    payloadCellValue: params.payloadCellValue
  })
}

export function isRowInsertDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentInsert?: RecentInsertRowFormulaFollowUp | null
}): boolean {
  return isStructuralDerivedFormulaFollowUpCollab({
    suppressUntilMs: params.suppressUntilMs,
    commandId: params.commandId,
    payloadCellValue: params.payloadCellValue,
    ranges: params.ranges,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentInsert
  })
}

export function isRowDeleteDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentDelete?: RecentDeleteRowFormulaFollowUp | null
}): boolean {
  return isStructuralDerivedFormulaFollowUpCollab({
    suppressUntilMs: params.suppressUntilMs,
    commandId: params.commandId,
    payloadCellValue: params.payloadCellValue,
    ranges: params.ranges,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentDelete
  })
}

export function isRowMoveDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentMove?: RecentMoveRowFormulaFollowUp | null
}): boolean {
  return isStructuralDerivedFormulaFollowUpCollab({
    suppressUntilMs: params.suppressUntilMs,
    commandId: params.commandId,
    payloadCellValue: params.payloadCellValue,
    ranges: params.ranges,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentMove
  })
}

export function isColumnInsertDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentInsert?: RecentInsertColumnFormulaFollowUp | null
}): boolean {
  return isStructuralDerivedFormulaFollowUpCollab({
    suppressUntilMs: params.suppressUntilMs,
    commandId: params.commandId,
    payloadCellValue: params.payloadCellValue,
    ranges: params.ranges,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentInsert,
    preserveSingleCellFormulaFollowUp: true
  })
}

export function isColumnDeleteDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentDelete?: RecentDeleteColumnFormulaFollowUp | null
}): boolean {
  return isStructuralDerivedFormulaFollowUpCollab({
    suppressUntilMs: params.suppressUntilMs,
    commandId: params.commandId,
    payloadCellValue: params.payloadCellValue,
    ranges: params.ranges,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentDelete,
    preserveSingleCellFormulaFollowUp: false
  })
}

export function isColumnMoveDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentMove?: RecentMoveColumnFormulaFollowUp | null
}): boolean {
  return isStructuralDerivedFormulaFollowUpCollab({
    suppressUntilMs: params.suppressUntilMs,
    commandId: params.commandId,
    payloadCellValue: params.payloadCellValue,
    ranges: params.ranges,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentMove,
    preserveSingleCellFormulaFollowUp: true
  })
}

export function isColumnMoveDerivedMergeFollowUp(params: {
  suppressUntilMs: number
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentMove?: RecentMoveColumnFormulaFollowUp | null
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentMove) return false
  if (params.worksheetId && params.worksheetId !== params.recentMove.sheetId) return false
  const rangesToCheck = params.ranges ?? []
  if (rangesToCheck.length === 0) return false
  return allRangesTouchStructuralFollowUp(rangesToCheck, params.recentMove.followUpRanges)
}

export function isRowInsertDerivedMergeFollowUp(params: {
  suppressUntilMs: number
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentInsert?: RecentInsertRowFormulaFollowUp | null
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentInsert) return false
  if (params.worksheetId && params.worksheetId !== params.recentInsert.sheetId) return false
  const rangesToCheck = params.ranges ?? []
  if (rangesToCheck.length === 0) return false
  return allRangesTouchStructuralFollowUp(rangesToCheck, params.recentInsert.followUpRanges)
}

export function isRowMoveDerivedMergeFollowUp(params: {
  suppressUntilMs: number
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentMove?: RecentMoveRowFormulaFollowUp | null
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentMove) return false
  if (params.worksheetId && params.worksheetId !== params.recentMove.sheetId) return false
  const rangesToCheck = params.ranges ?? []
  if (rangesToCheck.length === 0) return false
  return allRangesTouchStructuralFollowUp(rangesToCheck, params.recentMove.followUpRanges)
}

export function isColumnInsertDerivedMergeFollowUp(params: {
  suppressUntilMs: number
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentInsert?: RecentInsertColumnFormulaFollowUp | null
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentInsert) return false
  if (params.worksheetId && params.worksheetId !== params.recentInsert.sheetId) return false
  const rangesToCheck = params.ranges ?? []
  if (rangesToCheck.length === 0) return false
  return allRangesTouchStructuralFollowUp(rangesToCheck, params.recentInsert.followUpRanges)
}

export function isColumnDeleteDerivedMergeFollowUp(params: {
  suppressUntilMs: number
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentDelete?: RecentDeleteColumnFormulaFollowUp | null
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentDelete) return false
  if (params.worksheetId && params.worksheetId !== params.recentDelete.sheetId) return false
  const rangesToCheck = params.ranges ?? []
  if (rangesToCheck.length === 0) return false
  return allRangesTouchStructuralFollowUp(rangesToCheck, params.recentDelete.followUpRanges)
}

export function isRowDeleteDerivedMergeFollowUp(params: {
  suppressUntilMs: number
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentDelete?: RecentDeleteRowFormulaFollowUp | null
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentDelete) return false
  if (params.worksheetId && params.worksheetId !== params.recentDelete.sheetId) return false
  const rangesToCheck = params.ranges ?? []
  if (rangesToCheck.length === 0) return false
  return allRangesTouchStructuralFollowUp(rangesToCheck, params.recentDelete.followUpRanges)
}

function isStructuralDerivedFormulaFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  payloadCellValue?: unknown
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentFollowUp?: StructuralFormulaFollowUp | null
  preserveSingleCellFormulaFollowUp?: boolean
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.commandId.includes('set-range-values')) return false
  if (!params.recentFollowUp) return false
  if (
    params.preserveSingleCellFormulaFollowUp &&
    shouldPreserveSingleCellFormulaFollowUp({
      payloadCellValue: params.payloadCellValue,
      ranges: params.ranges
    })
  ) {
    return false
  }
  if (!payloadContainsOnlyFormulaCells(params.payloadCellValue)) return false
  if (params.worksheetId && params.worksheetId !== params.recentFollowUp.sheetId) return false
  const rangesToCheck =
    Array.isArray(params.ranges) && params.ranges.length > 0
      ? params.ranges
      : computeMatrixBounds(params.payloadCellValue)
  if (rangesToCheck.length === 0) return false
  return rangesTouchStructuralFollowUp(rangesToCheck, params.recentFollowUp.followUpRanges)
}

export function filterRowMoveFormulaReapplyCells(params: {
  suppressUntilMs: number
  worksheetId?: string | null
  recentMove?: RecentMoveRowFormulaFollowUp | null
  cells: SpreadsheetBulkRemoteCellItem[]
}): { cells: SpreadsheetBulkRemoteCellItem[]; skippedCellCount: number } {
  return filterStructuralFormulaReapplyCells({
    suppressUntilMs: params.suppressUntilMs,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentMove,
    cells: params.cells,
    preserveSingleCellFormulaFollowUp: false
  })
}

export function filterColumnInsertFormulaReapplyCells(params: {
  suppressUntilMs: number
  worksheetId?: string | null
  recentInsert?: RecentInsertColumnFormulaFollowUp | null
  cells: SpreadsheetBulkRemoteCellItem[]
}): { cells: SpreadsheetBulkRemoteCellItem[]; skippedCellCount: number } {
  return filterStructuralFormulaReapplyCells({
    suppressUntilMs: params.suppressUntilMs,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentInsert,
    cells: params.cells,
    preserveSingleCellFormulaFollowUp: true
  })
}

export function filterColumnDeleteFormulaReapplyCells(params: {
  suppressUntilMs: number
  worksheetId?: string | null
  recentDelete?: RecentDeleteColumnFormulaFollowUp | null
  cells: SpreadsheetBulkRemoteCellItem[]
}): { cells: SpreadsheetBulkRemoteCellItem[]; skippedCellCount: number } {
  return filterStructuralFormulaReapplyCells({
    suppressUntilMs: params.suppressUntilMs,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentDelete,
    cells: params.cells,
    preserveSingleCellFormulaFollowUp: true
  })
}

export function filterColumnMoveFormulaReapplyCells(params: {
  suppressUntilMs: number
  worksheetId?: string | null
  recentMove?: RecentMoveColumnFormulaFollowUp | null
  cells: SpreadsheetBulkRemoteCellItem[]
}): { cells: SpreadsheetBulkRemoteCellItem[]; skippedCellCount: number } {
  return filterStructuralFormulaReapplyCells({
    suppressUntilMs: params.suppressUntilMs,
    worksheetId: params.worksheetId,
    recentFollowUp: params.recentMove,
    cells: params.cells,
    preserveSingleCellFormulaFollowUp: true
  })
}

function filterStructuralFormulaReapplyCells(params: {
  suppressUntilMs: number
  worksheetId?: string | null
  recentFollowUp?: StructuralFormulaFollowUp | null
  cells: SpreadsheetBulkRemoteCellItem[]
  preserveSingleCellFormulaFollowUp: boolean
}): { cells: SpreadsheetBulkRemoteCellItem[]; skippedCellCount: number } {
  if (Date.now() >= params.suppressUntilMs) {
    return { cells: params.cells, skippedCellCount: 0 }
  }
  if (!params.recentFollowUp) {
    return { cells: params.cells, skippedCellCount: 0 }
  }
  if (params.worksheetId && params.worksheetId !== params.recentFollowUp.sheetId) {
    return { cells: params.cells, skippedCellCount: 0 }
  }
  const formulaCellCount = params.cells.filter(cell => isFormulaLikeRowMoveReapplyCell(cell)).length
  if (params.preserveSingleCellFormulaFollowUp && formulaCellCount <= 1) {
    return { cells: params.cells, skippedCellCount: 0 }
  }

  const cells = params.cells.filter(cell => {
    if (!isFormulaLikeRowMoveReapplyCell(cell)) return true
    return !rangesTouchStructuralFollowUp(
      [
        {
          startRow: cell.rowIndex,
          endRow: cell.rowIndex,
          startColumn: cell.colIndex,
          endColumn: cell.colIndex
        }
      ],
      params.recentFollowUp?.followUpRanges ?? []
    )
  })

  return {
    cells,
    skippedCellCount: params.cells.length - cells.length
  }
}

export function filterMoveCellRangeFormulaReapplyCells(params: {
  suppressUntilMs: number
  worksheetId?: string | null
  recentMove?: RecentMoveCellRangeFollowUp | null
  cells: SpreadsheetBulkRemoteCellItem[]
}): { cells: SpreadsheetBulkRemoteCellItem[]; skippedCellCount: number } {
  if (Date.now() >= params.suppressUntilMs) {
    return { cells: params.cells, skippedCellCount: 0 }
  }
  if (!params.recentMove) {
    return { cells: params.cells, skippedCellCount: 0 }
  }
  if (params.worksheetId && params.worksheetId !== params.recentMove.sheetId) {
    return { cells: params.cells, skippedCellCount: 0 }
  }
  const formulaCellCount = params.cells.filter(cell => isFormulaLikeRowMoveReapplyCell(cell)).length
  if (formulaCellCount <= 1) {
    return { cells: params.cells, skippedCellCount: 0 }
  }
  const cells = params.cells.filter(cell => {
    if (!isFormulaLikeRowMoveReapplyCell(cell)) return true
    return !rangesTouchRecentMove({
      worksheetId: params.worksheetId,
      ranges: [
        {
          startRow: cell.rowIndex,
          endRow: cell.rowIndex,
          startColumn: cell.colIndex,
          endColumn: cell.colIndex
        }
      ],
      recentMove: params.recentMove
    })
  })

  return {
    cells,
    skippedCellCount: params.cells.length - cells.length
  }
}

export function shouldDropStandaloneInsertRowFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentInsert?: RecentInsertRowFormulaFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  return shouldDropStandaloneStructuralFormulaFollowUpBatch({
    suppressUntilMs: params.suppressUntilMs,
    targetSheetId: params.targetSheetId,
    recentFollowUp: params.recentInsert,
    operations: params.operations,
    preserveSingleCellFormulaFollowUp: false
  })
}

export function shouldDropStandaloneDeleteRowFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentDelete?: RecentDeleteRowFormulaFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  return shouldDropStandaloneStructuralFormulaFollowUpBatch({
    suppressUntilMs: params.suppressUntilMs,
    targetSheetId: params.targetSheetId,
    recentFollowUp: params.recentDelete,
    operations: params.operations,
    preserveSingleCellFormulaFollowUp: false
  })
}

export function shouldDropStandaloneMoveRowFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentMove?: RecentMoveRowFormulaFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  return shouldDropStandaloneStructuralFormulaFollowUpBatch({
    suppressUntilMs: params.suppressUntilMs,
    targetSheetId: params.targetSheetId,
    recentFollowUp: params.recentMove,
    operations: params.operations,
    preserveSingleCellFormulaFollowUp: false
  })
}

export function shouldDropStandaloneInsertColumnFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentInsert?: RecentInsertColumnFormulaFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  return shouldDropStandaloneStructuralFormulaFollowUpBatch({
    suppressUntilMs: params.suppressUntilMs,
    targetSheetId: params.targetSheetId,
    recentFollowUp: params.recentInsert,
    operations: params.operations,
    preserveSingleCellFormulaFollowUp: true
  })
}

export function shouldDropStandaloneDeleteColumnFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentDelete?: RecentDeleteColumnFormulaFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  return shouldDropStandaloneStructuralFormulaFollowUpBatch({
    suppressUntilMs: params.suppressUntilMs,
    targetSheetId: params.targetSheetId,
    recentFollowUp: params.recentDelete,
    operations: params.operations,
    preserveSingleCellFormulaFollowUp: false
  })
}

export function shouldDropStandaloneMoveColumnFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentMove?: RecentMoveColumnFormulaFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  return shouldDropStandaloneStructuralFormulaFollowUpBatch({
    suppressUntilMs: params.suppressUntilMs,
    targetSheetId: params.targetSheetId,
    recentFollowUp: params.recentMove,
    operations: params.operations,
    preserveSingleCellFormulaFollowUp: true
  })
}

function shouldDropStandaloneStructuralFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentFollowUp?: StructuralFormulaFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
  preserveSingleCellFormulaFollowUp: boolean
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentFollowUp || params.targetSheetId !== params.recentFollowUp.sheetId) return false
  const extracted = extractFormulaOnlyStandaloneOperationRanges(params.operations)
  if (!extracted || !extracted.sawFormulaCell || extracted.ranges.length === 0) return false
  if (params.preserveSingleCellFormulaFollowUp && extracted.formulaCellCount <= 1) return false
  return allRangesTouchStructuralFollowUp(extracted.ranges, params.recentFollowUp.followUpRanges)
}

export function shouldDropStandaloneMoveCellRangeFormulaFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentMove?: RecentMoveCellRangeFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentMove || params.targetSheetId !== params.recentMove.sheetId) return false
  const extracted = extractFormulaOnlyStandaloneOperationRanges(params.operations)
  if (!extracted || !extracted.sawFormulaCell || extracted.ranges.length === 0) return false
  if (extracted.formulaCellCount <= 1) return false
  const allTouchRecentMove = extracted.ranges.every(range =>
    rangesTouchRecentMove({
      worksheetId: params.targetSheetId,
      ranges: [range],
      recentMove: params.recentMove
    })
  )
  if (allTouchRecentMove) return true
  return extracted.ranges.every(
    range =>
      !rangesTouchRecentMove({
        worksheetId: params.targetSheetId,
        ranges: [range],
        recentMove: params.recentMove
      })
  )
}

export function shouldDropStandaloneMoveCellRangeValueFollowUpBatch(params: {
  suppressUntilMs: number
  targetSheetId: string
  recentMove?: RecentMoveCellRangeFollowUp | null
  operations: Array<{ type: string; data?: Record<string, unknown> }>
}): boolean {
  if (Date.now() >= params.suppressUntilMs) return false
  if (!params.recentMove || params.targetSheetId !== params.recentMove.sheetId) return false
  const extracted = extractStandaloneValueOperationRanges(params.operations)
  if (!extracted || extracted.cellCount <= 1) return false
  return extracted.ranges.every(range =>
    rangesTouchRecentMove({
      worksheetId: params.targetSheetId,
      ranges: [range],
      recentMove: params.recentMove
    })
  )
}

function extractFormulaOnlyStandaloneOperationRanges(
  operations: Array<{ type: string; data?: Record<string, unknown> }>
): { ranges: CellRangeRect[]; sawFormulaCell: boolean; formulaCellCount: number } | null {
  if (operations.length === 0) return null
  const ranges: CellRangeRect[] = []
  let sawFormulaCell = false
  let formulaCellCount = 0
  for (const operation of operations) {
    if (operation.type !== 'set_range' && operation.type !== 'set_cell') return null
    const cells = Array.isArray(operation.data?.cells)
      ? operation.data.cells
      : operation.data && typeof operation.data === 'object'
        ? [operation.data]
        : []
    if (cells.length === 0) return null
    for (const cell of cells) {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return null
      const record = cell as Record<string, unknown>
      const row =
        typeof record.row === 'number' ? record.row : typeof record.rowIndex === 'number' ? record.rowIndex : null
      const col =
        typeof record.col === 'number' ? record.col : typeof record.colIndex === 'number' ? record.colIndex : null
      if (row == null || col == null) return null
      const value = Object.prototype.hasOwnProperty.call(record, 'value') ? record.value : undefined
      if (isClearLikeCellEntry(value)) {
        ranges.push({ startRow: row, endRow: row, startColumn: col, endColumn: col })
        continue
      }
      if (!isFormulaLikeCellEntry(value)) return null
      sawFormulaCell = true
      formulaCellCount += 1
      ranges.push({ startRow: row, endRow: row, startColumn: col, endColumn: col })
    }
  }
  return { ranges, sawFormulaCell, formulaCellCount }
}

function extractStandaloneValueOperationRanges(
  operations: Array<{ type: string; data?: Record<string, unknown> }>
): { ranges: CellRangeRect[]; cellCount: number } | null {
  if (operations.length === 0) return null
  const ranges: CellRangeRect[] = []
  let cellCount = 0
  for (const operation of operations) {
    if (operation.type !== 'set_range' && operation.type !== 'set_cell') return null
    const cells = Array.isArray(operation.data?.cells)
      ? operation.data.cells
      : operation.data && typeof operation.data === 'object'
        ? [operation.data]
        : []
    if (cells.length === 0) return null
    for (const cell of cells) {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) return null
      const record = cell as Record<string, unknown>
      const row =
        typeof record.row === 'number' ? record.row : typeof record.rowIndex === 'number' ? record.rowIndex : null
      const col =
        typeof record.col === 'number' ? record.col : typeof record.colIndex === 'number' ? record.colIndex : null
      if (row == null || col == null) return null
      cellCount += 1
      ranges.push({ startRow: row, endRow: row, startColumn: col, endColumn: col })
    }
  }
  return { ranges, cellCount }
}

export function resolveCutPasteFollowUpCollab(params: {
  suppressUntilMs: number
  commandId: string
  commandKind: string
  isRegionReplaceStyleCommand: boolean
  payloadCellValue?: SheetCellMatrix
  ranges?: CellRangeRect[]
  worksheetId?: string | null
  recentMove?: RecentMoveCellRangeFollowUp | null
}): CutPasteFollowUpCollabDecision {
  const defaultDecision: CutPasteFollowUpCollabDecision = {
    suppress: false,
    payloadCellValue: params.payloadCellValue,
    ranges: params.ranges
  }
  if (Date.now() >= params.suppressUntilMs) return defaultDecision
  if (isNativeCutPasteCommand(params.commandId)) return { suppress: true }
  if (
    params.commandId.includes('set-range-values') &&
    countCellsInMatrix(params.payloadCellValue) > 1 &&
    rangesTouchRecentMove({
      worksheetId: params.worksheetId,
      ranges: params.ranges,
      recentMove: params.recentMove,
      payloadCellValue: params.payloadCellValue
    })
  ) {
    const filtered = filterPayloadCellMatrixOutsideRecentMove(
      params.payloadCellValue,
      params.recentMove as RecentMoveCellRangeFollowUp
    )
    if (!filtered.payloadCellValue) {
      return { suppress: true }
    }
    return {
      suppress: false,
      ...filtered
    }
  }
  if (
    isMoveDerivedFormulaFollowUpCollab({
      suppressUntilMs: params.suppressUntilMs,
      commandId: params.commandId,
      payloadCellValue: params.payloadCellValue,
      ranges: params.ranges,
      worksheetId: params.worksheetId,
      recentMove: params.recentMove
    })
  ) {
    return { suppress: true }
  }
  if (params.isRegionReplaceStyleCommand) return { suppress: true }
  return defaultDecision
}
