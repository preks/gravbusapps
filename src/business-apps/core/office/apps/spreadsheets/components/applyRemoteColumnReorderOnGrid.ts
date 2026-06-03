import type { SpreadsheetColumn } from '../types/spreadsheet'
import { planVisibleColumnReorderMoves, type ColumnReorderMove } from '../utils/spreadsheetColumnReorderMoves'
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

export function applyRemoteColumnReorderOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  previousColumns: SpreadsheetColumn[]
  nextColumns: SpreadsheetColumn[]
  rows: Record<string, unknown>[]
}): { ok: true; moveCount: number; appliedMoveCount: number } | { ok: false; reason: string } {
  const moves = planVisibleColumnReorderMoves(params.previousColumns, params.nextColumns)
  if (moves.length === 0) return { ok: true, moveCount: 0, appliedMoveCount: 0 }

  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }

  const maxRowIndex = resolveMaxRowIndex(context.worksheet, params.rows)
  let appliedMoveCount = 0

  const applied = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () => {
    for (const move of moves) {
      const commandParams = buildMoveCommandParams(move, maxRowIndex, context.unitId, context.subUnitId)
      const commandRun = runUniverSyncStructuralCommand(params.api, MOVE_COLS_COMMAND_ID, commandParams)
      if (commandRun.ok) {
        appliedMoveCount += 1
      }
    }
    return appliedMoveCount > 0
  })

  if (!applied || appliedMoveCount === 0) {
    return { ok: false, reason: 'move_cols_command_failed' }
  }

  return { ok: true, moveCount: moves.length, appliedMoveCount }
}
