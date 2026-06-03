import { resolveWorksheetGridBounds } from './univerGridRangeSelection'
import { runUniverSyncStructuralCommand } from './univerSyncStructuralCommand'
import { runWithWorkbookFacadeSheetActive } from './univerGridWorkbookMutationModule'

/** Sync mutation — async insert-column commands break `syncExecuteCommand`. */
const INSERT_COL_MUTATION_ID = 'sheet.mutation.insert-col'

export type RemoteInsertColumnSlots = {
  startGridColumnIndex: number
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

const resolveMaxRowIndex = (worksheet: unknown, minRows: number): number => {
  const bounds = resolveWorksheetGridBounds(worksheet)
  if (bounds) return bounds.maxRowIndex
  return Math.max(0, minRows - 1)
}

const normalizeInsert = (insert: RemoteInsertColumnSlots): RemoteInsertColumnSlots | null => {
  const startGridColumnIndex = Math.max(0, Math.trunc(insert.startGridColumnIndex))
  const count = Math.max(0, Math.trunc(insert.count))
  if (count <= 0) return null
  return { startGridColumnIndex, count }
}

const buildInsertMutationParams = (
  insert: RemoteInsertColumnSlots,
  maxRowIndex: number,
  unitId: string,
  subUnitId: string
) => {
  const endColumn = insert.startGridColumnIndex + insert.count - 1
  return {
    unitId,
    subUnitId,
    range: {
      startRow: 0,
      endRow: maxRowIndex,
      startColumn: insert.startGridColumnIndex,
      endColumn
    }
  }
}

export function applyRemoteInsertColumnSlotsOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  insert: RemoteInsertColumnSlots
  rowCount: number
}): { ok: true } | { ok: false; reason: string } {
  const insert = normalizeInsert(params.insert)
  if (!insert) return { ok: true }

  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }

  const maxRowIndex = resolveMaxRowIndex(context.worksheet, params.rowCount)
  const mutationParams = buildInsertMutationParams(insert, maxRowIndex, context.unitId, context.subUnitId)

  const commandRun = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () =>
    runUniverSyncStructuralCommand(params.api, INSERT_COL_MUTATION_ID, mutationParams)
  )

  if (!commandRun?.ok) {
    if (commandRun?.reason === 'missing_sync_execute_command') {
      return { ok: false, reason: 'missing_sync_execute_command' }
    }
    return { ok: false, reason: 'insert_col_mutation_failed' }
  }

  return { ok: true }
}
