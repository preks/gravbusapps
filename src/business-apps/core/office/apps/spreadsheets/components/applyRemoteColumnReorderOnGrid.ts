import type { SpreadsheetColumn } from '../types/spreadsheet'
import { classifyNativeColumnReorderWithMerges, type ColumnReorderMove } from '../utils/spreadsheetColumnReorderMoves'
import { getAuthoritativeGridRowExtent } from './univerGridAuthoritativeHelpers'
import { debugRemoteApply } from './univerGridDebug'
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
  getActiveSheet?: () => { getSheetId?: () => string } | null | undefined
  getSheetBySheetId?: (id: string) => { getSheetId?: () => string } | null | undefined
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
  if (!workbook) {
    debugRemoteApply('column_reorder_native_context_missing', { reason: 'no_workbook', sheetId })
    return null
  }
  const unitId = workbook.getUnitId?.() ?? workbook.getId?.()
  if (typeof unitId !== 'string' || !unitId) {
    debugRemoteApply('column_reorder_native_context_missing', { reason: 'no_unit_id', sheetId })
    return null
  }
  const worksheet = workbook.getSheetBySheetId?.(sheetId) ?? workbook.getActiveSheet?.() ?? null
  if (!worksheet) {
    debugRemoteApply('column_reorder_native_context_missing', { reason: 'no_worksheet', sheetId })
    return null
  }
  return { unitId, subUnitId: sheetId, workbook, worksheet }
}

const resolveMaxRowIndex = (worksheet: unknown, rows: Record<string, unknown>[]): number => {
  const bounds = resolveWorksheetGridBounds(worksheet)
  if (bounds) return bounds.maxRowIndex
  return Math.max(0, getAuthoritativeGridRowExtent(rows) - 1)
}

const buildMoveCommandParams = (move: ColumnReorderMove, maxRowIndex: number, unitId: string, subUnitId: string) => {
  const sourceEnd = move.sourceStartColumn + move.count - 1
  const nativeDestinationStartColumn = move.rawDestinationStartColumn ?? move.destinationStartColumn
  const destinationEnd = nativeDestinationStartColumn + move.count - 1
  const fromRange = {
    startRow: 0,
    endRow: maxRowIndex,
    startColumn: move.sourceStartColumn,
    endColumn: sourceEnd
  }
  const toRange = {
    startRow: 0,
    endRow: maxRowIndex,
    startColumn: nativeDestinationStartColumn,
    endColumn: destinationEnd
  }
  return {
    unitId,
    subUnitId,
    range: [
      {
        ...fromRange,
        rangeType: UNIVER_RANGE_TYPE_COLUMN
      }
    ],
    fromRange,
    toRange,
    targetRange: toRange
  }
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
      reason: 'missing_workbook' | 'unplannable_reorder' | 'partial_move_failure' | 'move_cols_command_failed'
    } {
  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }
  const moveClassification = classifyNativeColumnReorderWithMerges({
    previousColumns: params.previousColumns,
    nextColumns: params.nextColumns,
    explicitMoves: params.moves
  })
  if (!moveClassification.ok) {
    debugRemoteApply('column_reorder_native_classification_blocked', {
      sheetId: params.sheetId,
      reason: moveClassification.reason,
      explicitMoveCount: params.moves?.length ?? 0
    })
    return {
      ok: false,
      reason: 'unplannable_reorder'
    }
  }
  const moves = moveClassification.moves
  if (moves.length === 0) {
    debugRemoteApply('column_reorder_native_noop', {
      sheetId: params.sheetId,
      explicitMoveCount: params.moves?.length ?? 0
    })
    return { ok: true, moveCount: 0, appliedMoveCount: 0, status: 'already_in_order' }
  }

  const maxRowIndex = resolveMaxRowIndex(context.worksheet, params.rows)
  let appliedMoveCount = 0

  const applied = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () => {
    for (const move of moves) {
      const commandParams = buildMoveCommandParams(move, maxRowIndex, context.unitId, context.subUnitId)
      debugRemoteApply('column_reorder_native_command_params', {
        sheetId: params.sheetId,
        sourceStartColumn: move.sourceStartColumn,
        count: move.count,
        destinationStartColumn: move.destinationStartColumn,
        rawDestinationStartColumn: move.rawDestinationStartColumn,
        activeSheetId: context.workbook.getActiveSheet?.()?.getSheetId?.(),
        commandRangeIsArray: Array.isArray(commandParams.range),
        commandFromStartColumn: commandParams.fromRange.startColumn,
        commandToStartColumn: commandParams.toRange.startColumn,
        commandTargetStartColumn: commandParams.targetRange.startColumn
      })
      const commandRun = runUniverSyncStructuralCommand(params.api, MOVE_COLS_COMMAND_ID, commandParams)
      if (!commandRun.ok) {
        debugRemoteApply('column_reorder_native_command_failed', {
          sheetId: params.sheetId,
          sourceStartColumn: move.sourceStartColumn,
          destinationStartColumn: move.destinationStartColumn,
          rawDestinationStartColumn: move.rawDestinationStartColumn,
          activeSheetId: context.workbook.getActiveSheet?.()?.getSheetId?.(),
          commandFailureReason: commandRun.reason,
          commandFailureDetail: 'detail' in commandRun ? commandRun.detail : undefined,
          commandFailureResultType: 'resultType' in commandRun ? commandRun.resultType : undefined,
          commandFailureError: 'errorMessage' in commandRun ? commandRun.errorMessage?.slice(0, 160) : undefined
        })
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
