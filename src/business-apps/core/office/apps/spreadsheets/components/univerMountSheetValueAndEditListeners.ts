import { createUniver } from '@univerjs/presets'
import {
  computeOccupiedBoundingRange,
  countOccupiedCellsInSheetMatrix,
  intersectSheetRangeShapes,
  normalizeCellMatrix,
  overlayExplicitMutationCellsOntoDerived,
  sheetRangeDeclaredArea,
  type SheetCellMatrix,
  type SheetRangeShape
} from './cellMatrixUtils'
import {
  isClearLikeMutationCommand,
  isCurrentFacadeWorksheet,
  isImplicitClearLikeSetRangeMutation
} from './univerGridWorkbookMutationModule'
import { deriveCellMatrixFromRanges } from '../utils/univerWorksheetCellRead'
import type { UniverGridController } from './useUniverGridController'

export type RegisterUniverMountSheetValueAndEditListenersDeps = Pick<
  UniverGridController,
  'readOnlyRef' | 'isApplyingRemoteUpdateRef' | 'collabPersistedBulkApplyDepthRef' | 'univerAPIRef'
> & {
  univerAPI: ReturnType<typeof createUniver>['univerAPI']
  handleDetectedCellMutation: (args: {
    source: 'sheet-value-changed' | 'command-executed' | 'selection-reconcile' | 'sheet-edit-ended'
    commandId?: string
    payloadCellValue: SheetCellMatrix | undefined
    ranges: SheetRangeShape[]
    worksheetId?: string | null
    preserveUndefinedAsNull?: boolean
  }) => boolean | Promise<boolean>
  reconcileSingleCell: (
    row: number | undefined,
    col: number | undefined,
    source: 'selection-reconcile' | 'sheet-edit-ended',
    worksheetId?: string | null
  ) => void
}

export type RegisterUniverMountSheetValueAndEditListenersHandles = {
  valueChangeDisposable: { dispose(): void } | undefined
  sheetEditEndedDisposable: { dispose(): void } | undefined
}

export function registerUniverMountSheetValueAndEditListeners(
  deps: RegisterUniverMountSheetValueAndEditListenersDeps
): RegisterUniverMountSheetValueAndEditListenersHandles {
  const {
    univerAPI,
    readOnlyRef,
    isApplyingRemoteUpdateRef,
    collabPersistedBulkApplyDepthRef,
    univerAPIRef,
    handleDetectedCellMutation,
    reconcileSingleCell
  } = deps

  const eventKey =
    (univerAPI as { Event?: { SheetValueChanged?: string } }).Event?.SheetValueChanged ?? 'SheetValueChanged'
  const valueChangeDisposable = (
    univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
  ).addEvent?.(eventKey, (rawParams: unknown) => {
    if (readOnlyRef.current) return
    // Avoid re-entry while remote apply writes into Univer (prevents echo / duplicate persist).
    if (isApplyingRemoteUpdateRef.current || collabPersistedBulkApplyDepthRef.current > 0) return
    const params = rawParams as {
      effectedRanges?: Array<{
        getRange?: () => { startRow: number; endRow: number; startColumn: number; endColumn: number }
      }>
      payload?: {
        id?: string
        params?: {
          cellValue?: Record<number, Record<number, { v?: unknown }>>
          range?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
          sheetId?: string
          subUnitId?: string
        }
      }
      sheetId?: string
      subUnitId?: string
    }
    const payload = params?.payload
    const payloadParams = payload?.params
    const worksheetId =
      payloadParams?.subUnitId ?? payloadParams?.sheetId ?? params?.subUnitId ?? params?.sheetId ?? null
    let cellValue = normalizeCellMatrix(payload?.params?.cellValue)
    let mutationRanges = (payload?.params?.range ??
      params.effectedRanges?.map(r => r.getRange?.()).filter(Boolean) ??
      []) as SheetRangeShape[]
    if (mutationRanges.length === 1 && cellValue) {
      const declared = mutationRanges[0]
      const bboxSparse = computeOccupiedBoundingRange(cellValue)
      if (bboxSparse) {
        const area = sheetRangeDeclaredArea(declared)
        const occupied = countOccupiedCellsInSheetMatrix(cellValue)
        if (occupied > 0 && area > occupied * 2) {
          const clipped = intersectSheetRangeShapes(declared, bboxSparse)
          if (clipped) mutationRanges = [clipped]
        }
      }
    }
    const workbook = univerAPIRef.current?.getActiveWorkbook()
    const activeWorksheet = workbook?.getActiveSheet()
    const worksheet =
      worksheetId && typeof workbook?.getSheetBySheetId === 'function'
        ? (workbook.getSheetBySheetId(worksheetId) ?? activeWorksheet)
        : activeWorksheet
    const currentWorksheet =
      isCurrentFacadeWorksheet(activeWorksheet, worksheet, worksheetId) &&
      worksheet &&
      typeof (worksheet as { getRange?: unknown }).getRange === 'function'
        ? worksheet
        : undefined
    const commandId = String(payload?.id ?? '')
    const preserveUndefinedAsNull =
      isClearLikeMutationCommand(commandId) ||
      isImplicitClearLikeSetRangeMutation({
        commandId,
        ranges: mutationRanges,
        payloadCellValue: cellValue
      })

    const explicitCellMatrixSnapshot = cellValue
    if (preserveUndefinedAsNull) {
      cellValue = overlayExplicitMutationCellsOntoDerived(
        deriveCellMatrixFromRanges(currentWorksheet, mutationRanges, 10000, true),
        explicitCellMatrixSnapshot
      )
    } else if (!cellValue) {
      cellValue = deriveCellMatrixFromRanges(currentWorksheet, mutationRanges)
    }
    if (!cellValue) return
    const result = handleDetectedCellMutation({
      source: 'sheet-value-changed',
      commandId,
      payloadCellValue: cellValue,
      ranges: mutationRanges,
      worksheetId,
      preserveUndefinedAsNull
    })
    if (result && typeof (result as Promise<boolean>).then === 'function') {
      void (result as Promise<boolean>).catch(() => {
        /* best-effort persist */
      })
    }
  })

  const sheetEditEndedEventKey =
    (univerAPI as { Event?: { SheetEditEnded?: string } }).Event?.SheetEditEnded ?? 'SheetEditEnded'
  const sheetEditEndedDisposable = (
    univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
  ).addEvent?.(sheetEditEndedEventKey, (rawParams: unknown) => {
    if (readOnlyRef.current) return
    const params = rawParams as
      | {
          row?: number
          col?: number
          startRow?: number
          startColumn?: number
          cell?: { row?: number; col?: number; actualRow?: number; actualColumn?: number }
          range?: { startRow?: number; startColumn?: number }
          sheetId?: string
          subUnitId?: string
        }
      | undefined
    const cell = params?.cell
    const range = params?.range
    const row = cell?.actualRow ?? cell?.row ?? params?.row ?? params?.startRow ?? range?.startRow
    const col = cell?.actualColumn ?? cell?.col ?? params?.col ?? params?.startColumn ?? range?.startColumn
    reconcileSingleCell(row, col, 'sheet-edit-ended', params?.subUnitId ?? params?.sheetId ?? null)
  })

  return { valueChangeDisposable, sheetEditEndedDisposable }
}
