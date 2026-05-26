import { resolveWorksheetGridBounds } from './univerGridRangeSelection'
import { runUniverSyncStructuralCommand } from './univerSyncStructuralCommand'
import { runWithWorkbookFacadeSheetActive } from './univerGridWorkbookMutationModule'

/** Sync mutation — async remove-column commands break `syncExecuteCommand`. */
const REMOVE_COL_MUTATION_ID = 'sheet.mutation.remove-col'

export type RemoteDeleteColumnSlots = {
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

const normalizeDelete = (deleteSlots: RemoteDeleteColumnSlots): RemoteDeleteColumnSlots | null => {
  const startGridColumnIndex = Math.max(0, Math.trunc(deleteSlots.startGridColumnIndex))
  const count = Math.max(0, Math.trunc(deleteSlots.count))
  if (count <= 0) return null
  return { startGridColumnIndex, count }
}

const buildRemoveColMutationParams = (
  deleteSlots: RemoteDeleteColumnSlots,
  maxRowIndex: number,
  unitId: string,
  subUnitId: string
) => {
  const endColumn = deleteSlots.startGridColumnIndex + deleteSlots.count - 1
  return {
    unitId,
    subUnitId,
    range: {
      startRow: 0,
      endRow: maxRowIndex,
      startColumn: deleteSlots.startGridColumnIndex,
      endColumn
    }
  }
}

export function applyRemoteDeleteColumnSlotsOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  deleteSlots: RemoteDeleteColumnSlots
  rowCount: number
}): { ok: true } | { ok: false; reason: string } {
  const deleteSlots = normalizeDelete(params.deleteSlots)
  if (!deleteSlots) return { ok: true }

  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }

  const maxRowIndex = resolveMaxRowIndex(context.worksheet, params.rowCount)
  const mutationParams = buildRemoveColMutationParams(deleteSlots, maxRowIndex, context.unitId, context.subUnitId)

  const commandRun = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () =>
    runUniverSyncStructuralCommand(params.api, REMOVE_COL_MUTATION_ID, mutationParams)
  )

  if (!commandRun?.ok) {
    if (commandRun?.reason === 'missing_sync_execute_command') {
      return { ok: false, reason: 'missing_sync_execute_command' }
    }
    return { ok: false, reason: 'remove_col_mutation_failed' }
  }

  return { ok: true }
}
