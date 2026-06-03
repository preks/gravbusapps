import type { CellRangeRect } from '../utils/applyMoveCellRangeTransform'
import { validateMoveCellRangeForVisibleColumnCount } from '../utils/spreadsheetMoveCellRangeGrid'
import { runUniverSyncStructuralCommand } from './univerSyncStructuralCommand'
import { runWithWorkbookFacadeSheetActive } from './univerGridWorkbookMutationModule'

const MOVE_RANGE_COMMAND_ID = 'sheet.command.move-range'
const MOVE_RANGE_MUTATION_ID = 'sheet.mutation.move-range'
const MOVE_CELL_MUTATION_ID = 'sheet.mutation.move-cell'

type UniverApiLike = {
  getActiveWorkbook?: () => unknown
  syncExecuteCommand?: (commandId: string, params?: object) => unknown
} | null

type UniverFacadeWorkbook = {
  getActiveSheet?: () => { getSheetId?: () => string } | null | undefined
  getSheetBySheetId?: (id: string) => unknown
  getId?: () => string
  getUnitId?: () => string
  setActiveSheet?: (id: string) => unknown
}

const resolveWorkbookContext = (
  api: UniverApiLike,
  sheetId: string
): { unitId: string; subUnitId: string; workbook: UniverFacadeWorkbook } | null => {
  const workbook = api?.getActiveWorkbook?.() as UniverFacadeWorkbook | null | undefined
  if (!workbook) return null
  const unitId = workbook.getUnitId?.() ?? workbook.getId?.()
  if (typeof unitId !== 'string' || !unitId) return null
  const worksheet = workbook.getSheetBySheetId?.(sheetId) ?? workbook.getActiveSheet?.() ?? null
  if (!worksheet) return null
  return { unitId, subUnitId: sheetId, workbook }
}

const isNoOpMove = (fromRange: CellRangeRect, toRange: CellRangeRect): boolean =>
  fromRange.startRow === toRange.startRow &&
  fromRange.endRow === toRange.endRow &&
  fromRange.startColumn === toRange.startColumn &&
  fromRange.endColumn === toRange.endColumn

const isSingleCellRange = (range: CellRangeRect): boolean =>
  range.startRow === range.endRow && range.startColumn === range.endColumn

const buildMoveRangeParams = (fromRange: CellRangeRect, toRange: CellRangeRect, unitId: string, subUnitId: string) => ({
  unitId,
  subUnitId,
  fromRange,
  toRange
})

const buildMoveCellMutationParams = (
  fromRange: CellRangeRect,
  toRange: CellRangeRect,
  unitId: string,
  subUnitId: string
) => ({
  unitId,
  subUnitId,
  from: { row: fromRange.startRow, column: fromRange.startColumn },
  to: { row: toRange.startRow, column: toRange.startColumn }
})

const runStructuralMove = (
  api: UniverApiLike,
  commandId: string,
  commandParams: object
): { ok: true } | { ok: false; reason: 'missing_sync_execute_command' | 'command_failed' } => {
  const commandRun = runUniverSyncStructuralCommand(api, commandId, commandParams)
  if (!commandRun?.ok) {
    if (commandRun?.reason === 'missing_sync_execute_command') {
      return { ok: false, reason: 'missing_sync_execute_command' }
    }
    return { ok: false, reason: 'command_failed' }
  }
  return { ok: true }
}

export function applyRemoteMoveCellRangeOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  fromRange: CellRangeRect
  toRange: CellRangeRect
  visibleColumnCount: number
}): { ok: true } | { ok: false; reason: string } {
  const validation = validateMoveCellRangeForVisibleColumnCount(
    params.visibleColumnCount,
    params.fromRange,
    params.toRange
  )
  if (!validation.ok) {
    return { ok: false, reason: `invalid_visible_grid_range:${validation.reason}` }
  }
  const fromRange = validation.fromRange
  const toRange = validation.toRange
  if (isNoOpMove(fromRange, toRange)) {
    return { ok: true }
  }

  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }

  const rangeParams = buildMoveRangeParams(fromRange, toRange, context.unitId, context.subUnitId)
  const cellParams = buildMoveCellMutationParams(fromRange, toRange, context.unitId, context.subUnitId)

  const attempts: Array<{ commandId: string; commandParams: object }> = [
    { commandId: MOVE_RANGE_COMMAND_ID, commandParams: rangeParams },
    { commandId: MOVE_RANGE_MUTATION_ID, commandParams: rangeParams }
  ]
  if (isSingleCellRange(fromRange) && isSingleCellRange(toRange)) {
    attempts.push({ commandId: MOVE_CELL_MUTATION_ID, commandParams: cellParams })
  }

  return (
    runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () => {
      for (const attempt of attempts) {
        const result = runStructuralMove(params.api, attempt.commandId, attempt.commandParams)
        if (result.ok) {
          return { ok: true as const }
        }
        if (result.reason === 'missing_sync_execute_command') {
          return { ok: false as const, reason: 'missing_sync_execute_command' }
        }
      }
      return { ok: false as const, reason: 'move_range_command_failed' }
    }) ?? { ok: false, reason: 'missing_workbook' }
  )
}
