import { resolveWorksheetGridBounds } from './univerGridRangeSelection'
import { runUniverSyncStructuralCommand } from './univerSyncStructuralCommand'
import { runWithWorkbookFacadeSheetActive } from './univerGridWorkbookMutationModule'

/** Sync mutation — async remove-row commands break `syncExecuteCommand`. */
const REMOVE_ROWS_MUTATION_ID = 'sheet.mutation.remove-rows'

export type RemoteDeleteRowSlots = {
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

const normalizeDelete = (deleteSlots: RemoteDeleteRowSlots): RemoteDeleteRowSlots | null => {
  const startGridRowIndex = Math.max(0, Math.trunc(deleteSlots.startGridRowIndex))
  const count = Math.max(0, Math.trunc(deleteSlots.count))
  if (count <= 0) return null
  return { startGridRowIndex, count }
}

const buildRemoveRowsMutationParams = (
  deleteSlots: RemoteDeleteRowSlots,
  maxColumnIndex: number,
  unitId: string,
  subUnitId: string
) => {
  const endRow = deleteSlots.startGridRowIndex + deleteSlots.count - 1
  return {
    unitId,
    subUnitId,
    range: {
      startRow: deleteSlots.startGridRowIndex,
      endRow,
      startColumn: 0,
      endColumn: maxColumnIndex
    }
  }
}

export function applyRemoteDeleteRowSlotsOnGrid(params: {
  api: UniverApiLike
  sheetId: string
  deleteSlots: RemoteDeleteRowSlots
  visibleColumnCount: number
}): { ok: true } | { ok: false; reason: string } {
  const deleteSlots = normalizeDelete(params.deleteSlots)
  if (!deleteSlots) return { ok: true }

  const context = resolveWorkbookContext(params.api, params.sheetId)
  if (!context) return { ok: false, reason: 'missing_workbook' }

  const maxColumnIndex = resolveMaxColumnIndex(context.worksheet, params.visibleColumnCount)
  const mutationParams = buildRemoveRowsMutationParams(deleteSlots, maxColumnIndex, context.unitId, context.subUnitId)

  const commandRun = runWithWorkbookFacadeSheetActive(context.workbook, params.sheetId, () =>
    runUniverSyncStructuralCommand(params.api, REMOVE_ROWS_MUTATION_ID, mutationParams)
  )

  if (!commandRun?.ok) {
    if (commandRun?.reason === 'missing_sync_execute_command') {
      return { ok: false, reason: 'missing_sync_execute_command' }
    }
    return { ok: false, reason: 'remove_rows_mutation_failed' }
  }

  return { ok: true }
}
