import { getAuthoritativeGridRowExtent } from './univerGridAuthoritativeHelpers'
import { resolveWorksheetGridBounds } from './univerGridRangeSelection'
import { runUniverSyncStructuralCommand } from './univerSyncStructuralCommand'
import { runWithWorkbookFacadeSheetActive } from './univerGridWorkbookMutationModule'

/** Matches `RANGE_TYPE.ROW` in `@univerjs/core` — required for `sheet.command.move-rows`. */
const UNIVER_RANGE_TYPE_ROW = 1

const MOVE_ROWS_COMMAND_ID = 'sheet.command.move-rows'

export type RemoteRowSlotsMove = {
  sourceStartGridRowIndex: number
  count: number
  destinationGridRowIndex: number
}

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

const resolveMaxColumnIndex = (worksheet: unknown, minColumns: number): number => {
  const bounds = resolveWorksheetGridBounds(worksheet)
  if (bounds) return bounds.maxColIndex
  return Math.max(0, minColumns - 1)
}

const normalizeMove = (move: RemoteRowSlotsMove): RemoteRowSlotsMove | null => {
  const sourceStartGridRowIndex = Math.max(0, Math.trunc(move.sourceStartGridRowIndex))
  const count = Math.max(0, Math.trunc(move.count))
  const destinationGridRowIndex = Math.max(0, Math.trunc(move.destinationGridRowIndex))
  if (count <= 0) return null

  const sourceEnd = sourceStartGridRowIndex + count - 1
  if (destinationGridRowIndex >= sourceStartGridRowIndex && destinationGridRowIndex <= sourceEnd) {
    return null
  }

  return { sourceStartGridRowIndex, count, destinationGridRowIndex }
}

const buildMoveCommandParams = (
  move: RemoteRowSlotsMove,
  maxRowIndex: number,
  maxColumnIndex: number,
  unitId: string,
  subUnitId: string
) => {
  const sourceEnd = move.sourceStartGridRowIndex + move.count - 1
  const destinationEnd = move.destinationGridRowIndex + move.count - 1
  const fromRange = {
    startRow: move.sourceStartGridRowIndex,
    endRow: sourceEnd,
    startColumn: 0,
    endColumn: maxColumnIndex
  }
  const toRange = {
    startRow: move.destinationGridRowIndex,
    endRow: destinationEnd,
    startColumn: 0,
    endColumn: maxColumnIndex
  }
  return {
    unitId,
    subUnitId,
    range: {
      ...fromRange,
      rangeType: UNIVER_RANGE_TYPE_ROW
    },
    fromRange,
    toRange
  }
}

export function applyRemoteRowSlotsOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  move: RemoteRowSlotsMove
  rows: Record<string, unknown>[]
  visibleColumnCount: number
}): { ok: true } | { ok: false; reason: string } {
  const move = normalizeMove(params.move)
  if (!move) return { ok: true }

  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }

  const maxRowIndex = resolveMaxRowIndex(context.worksheet, params.rows)
  const maxColumnIndex = resolveMaxColumnIndex(context.worksheet, params.visibleColumnCount)
  const commandParams = buildMoveCommandParams(move, maxRowIndex, maxColumnIndex, context.unitId, context.subUnitId)

  const commandRun = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () =>
    runUniverSyncStructuralCommand(params.api, MOVE_ROWS_COMMAND_ID, commandParams)
  )

  if (!commandRun?.ok) {
    if (commandRun?.reason === 'missing_sync_execute_command') {
      return { ok: false, reason: 'missing_sync_execute_command' }
    }
    return { ok: false, reason: 'move_rows_command_failed' }
  }

  return { ok: true }
}
