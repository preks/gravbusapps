import type { SpreadsheetColumn, SpreadsheetMergeRange } from '../types/spreadsheet'
import { classifyNativeColumnReorderWithMerges, type ColumnReorderMove } from '../utils/spreadsheetColumnReorderMoves'
import { getAuthoritativeGridRowExtent } from './univerGridAuthoritativeHelpers'
import { resolveWorksheetGridBounds } from './univerGridRangeSelection'
import { runUniverSyncStructuralCommand } from './univerSyncStructuralCommand'
import { runWithWorkbookFacadeSheetActive } from './univerGridWorkbookMutationModule'

/** Matches `RANGE_TYPE.COLUMN` in `@univerjs/core` — required for `sheet.command.move-cols`. */
const UNIVER_RANGE_TYPE_COLUMN = 2

const MOVE_COLS_COMMAND_ID = 'sheet.command.move-cols'

type UniverApiLike = {
  getActiveWorkbook?: () => unknown
  syncExecuteCommand?: (commandId: string, params?: object) => unknown
} | null

type UniverFacadeWorkbook = {
  getActiveSheet?: () => unknown
  getSheetBySheetId?: (id: string) => unknown
  getId?: () => string
  getUnitId?: () => string
  setActiveSheet?: (id: string) => unknown
  save?: () => unknown
  getSnapshot?: () => unknown
  snapshot?: unknown
}

const resolveWorkbookContext = (
  api: UniverApiLike,
  sheetId: string
): { unitId: string; subUnitId: string; workbook: UniverFacadeWorkbook; worksheet: unknown } | null => {
  const workbook = api?.getActiveWorkbook?.() as UniverFacadeWorkbook | null | undefined
  if (!workbook) return null
  const unitId = workbook.getUnitId?.() ?? workbook.getId?.()
  if (typeof unitId !== 'string' || !unitId) return null
  const worksheet = workbook.getSheetBySheetId?.(sheetId) ?? workbook.getActiveSheet?.() ?? null
  if (!worksheet) return null
  return { unitId, subUnitId: sheetId, workbook, worksheet }
}

const resolveMaxRowIndex = (worksheet: unknown, rows: Record<string, unknown>[]): number => {
  const bounds = resolveWorksheetGridBounds(worksheet)
  if (bounds) return bounds.maxRowIndex
  return Math.max(0, getAuthoritativeGridRowExtent(rows) - 1)
}

const buildMoveCommandParams = (move: ColumnReorderMove, maxRowIndex: number, unitId: string, subUnitId: string) => {
  const sourceEnd = move.sourceStartColumn + move.count - 1
  const destinationEnd = move.destinationStartColumn + move.count - 1
  const fromRange = {
    startRow: 0,
    endRow: maxRowIndex,
    startColumn: move.sourceStartColumn,
    endColumn: sourceEnd
  }
  const toRange = {
    startRow: 0,
    endRow: maxRowIndex,
    startColumn: move.destinationStartColumn,
    endColumn: destinationEnd
  }
  return {
    unitId,
    subUnitId,
    range: {
      ...fromRange,
      rangeType: UNIVER_RANGE_TYPE_COLUMN
    },
    fromRange,
    toRange
  }
}

const extractLiveWorksheetMergeRanges = (workbook: UniverFacadeWorkbook, sheetId: string): SpreadsheetMergeRange[] => {
  const workbookSnapshot = workbook.save?.() ?? workbook.getSnapshot?.() ?? workbook.snapshot
  if (!workbookSnapshot || typeof workbookSnapshot !== 'object' || Array.isArray(workbookSnapshot)) return []
  const sheets =
    'sheets' in workbookSnapshot &&
    workbookSnapshot.sheets &&
    typeof workbookSnapshot.sheets === 'object' &&
    !Array.isArray(workbookSnapshot.sheets)
      ? (workbookSnapshot.sheets as Record<string, unknown>)
      : null
  const worksheet = sheets?.[sheetId]
  if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet)) return []
  const mergeData = (worksheet as { mergeData?: unknown }).mergeData
  if (!Array.isArray(mergeData)) return []
  return mergeData.filter(
    (range): range is SpreadsheetMergeRange =>
      Boolean(range) &&
      typeof range === 'object' &&
      Number.isFinite((range as SpreadsheetMergeRange).startRow) &&
      Number.isFinite((range as SpreadsheetMergeRange).endRow) &&
      Number.isFinite((range as SpreadsheetMergeRange).startColumn) &&
      Number.isFinite((range as SpreadsheetMergeRange).endColumn)
  )
}

export function applyRemoteColumnReorderOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  previousColumns: SpreadsheetColumn[]
  nextColumns: SpreadsheetColumn[]
  rows: Record<string, unknown>[]
  moves?: ColumnReorderMove[]
}):
  | { ok: true; moveCount: number; appliedMoveCount: number; status: 'already_in_order' | 'moves_applied' }
  | {
      ok: false
      reason:
        | 'missing_workbook'
        | 'unplannable_reorder'
        | 'partial_move_failure'
        | 'move_cols_command_failed'
        | 'move_cols_merge_unsupported'
    } {
  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }
  const liveMergeRanges = extractLiveWorksheetMergeRanges(context.workbook, params.sheetId)
  const moveClassification = classifyNativeColumnReorderWithMerges({
    previousColumns: params.previousColumns,
    nextColumns: params.nextColumns,
    mergeRanges: liveMergeRanges,
    explicitMoves: params.moves
  })
  if (!moveClassification.ok) {
    return {
      ok: false,
      reason:
        moveClassification.reason === 'unplannable_reorder' ? 'unplannable_reorder' : 'move_cols_merge_unsupported'
    }
  }
  const moves = moveClassification.moves
  if (moves.length === 0) {
    return { ok: true, moveCount: 0, appliedMoveCount: 0, status: 'already_in_order' }
  }

  const maxRowIndex = resolveMaxRowIndex(context.worksheet, params.rows)
  let appliedMoveCount = 0

  const applied = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () => {
    for (const move of moves) {
      const commandParams = buildMoveCommandParams(move, maxRowIndex, context.unitId, context.subUnitId)
      const commandRun = runUniverSyncStructuralCommand(params.api, MOVE_COLS_COMMAND_ID, commandParams)
      if (!commandRun.ok) {
        return false
      }
      appliedMoveCount += 1
    }
    return appliedMoveCount === moves.length
  })

  if (!applied) {
    return { ok: false, reason: appliedMoveCount > 0 ? 'partial_move_failure' : 'move_cols_command_failed' }
  }
  if (appliedMoveCount === 0) {
    return { ok: false, reason: 'move_cols_command_failed' }
  }
  if (appliedMoveCount !== moves.length) {
    return { ok: false, reason: 'partial_move_failure' }
  }

  return { ok: true, moveCount: moves.length, appliedMoveCount, status: 'moves_applied' }
}
