import { resolveWorksheetGridBounds } from './univerGridRangeSelection'
import { runUniverSyncStructuralCommand } from './univerSyncStructuralCommand'
import { runWithWorkbookFacadeSheetActive } from './univerGridWorkbookMutationModule'

/** Sync mutation — `sheet.command.insert-row` is async and breaks `syncExecuteCommand`. */
const INSERT_ROW_MUTATION_ID = 'sheet.mutation.insert-row'

export type RemoteInsertRowSlots = {
  startGridRowIndex: number
  count: number
}

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
): { unitId: string; subUnitId: string; workbook: UniverFacadeWorkbook; worksheet: unknown } | null => {
  const workbook = api?.getActiveWorkbook?.() as UniverFacadeWorkbook | null | undefined
  if (!workbook) return null
  const unitId = workbook.getUnitId?.() ?? workbook.getId?.()
  if (typeof unitId !== 'string' || !unitId) return null
  const worksheet = workbook.getSheetBySheetId?.(sheetId) ?? workbook.getActiveSheet?.() ?? null
  if (!worksheet) return null
  return { unitId, subUnitId: sheetId, workbook, worksheet }
}

const resolveMaxColumnIndex = (worksheet: unknown, minColumns: number): number => {
  const bounds = resolveWorksheetGridBounds(worksheet)
  if (bounds) return bounds.maxColIndex
  return Math.max(0, minColumns - 1)
}

const normalizeInsert = (insert: RemoteInsertRowSlots): RemoteInsertRowSlots | null => {
  const startGridRowIndex = Math.max(0, Math.trunc(insert.startGridRowIndex))
  const count = Math.max(0, Math.trunc(insert.count))
  if (count <= 0) return null
  return { startGridRowIndex, count }
}

const buildInsertMutationParams = (
  insert: RemoteInsertRowSlots,
  maxColumnIndex: number,
  unitId: string,
  subUnitId: string
) => {
  const endRow = insert.startGridRowIndex + insert.count - 1
  return {
    unitId,
    subUnitId,
    range: {
      startRow: insert.startGridRowIndex,
      endRow,
      startColumn: 0,
      endColumn: maxColumnIndex
    }
  }
}

export function applyRemoteInsertRowSlotsOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  insert: RemoteInsertRowSlots
  visibleColumnCount: number
}): { ok: true } | { ok: false; reason: string } {
  const insert = normalizeInsert(params.insert)
  if (!insert) return { ok: true }

  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }

  const maxColumnIndex = resolveMaxColumnIndex(context.worksheet, params.visibleColumnCount)
  const mutationParams = buildInsertMutationParams(insert, maxColumnIndex, context.unitId, context.subUnitId)

  const commandRun = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () =>
    runUniverSyncStructuralCommand(params.api, INSERT_ROW_MUTATION_ID, mutationParams)
  )

  if (!commandRun?.ok) {
    if (commandRun?.reason === 'missing_sync_execute_command') {
      return { ok: false, reason: 'missing_sync_execute_command' }
    }
    return { ok: false, reason: 'insert_row_mutation_failed' }
  }

  return { ok: true }
}
