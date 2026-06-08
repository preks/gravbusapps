import { useCallback } from 'react'
import type { MutableRefObject } from 'react'
import type { SpreadsheetRemoteFeatureOperationPayload } from '../core'
import type { CellDimensionsPayload } from './UniverSheetGrid.types'
import type { SnapshotDimensions } from './univerGridInternalTypes'
import {
  CURSOR_OVERLAY_COL_WIDTH_PX,
  CURSOR_OVERLAY_HEADER_HEIGHT_PX,
  CURSOR_OVERLAY_ROW_HEIGHT_PX,
  CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX
} from './univerGridLayoutConstants'
import { areSnapshotDimensionsEqual } from './univerGridSnapshotDimensions'
import {
  clampClearAllRangeToBounds,
  dedupeClearAllRanges,
  normalizeClearAllRectangle,
  resolveWorksheetGridBounds,
  type ClearAllRectangle
} from './univerGridRangeSelection'
import {
  acquireRemoteStructuralApplyGuard,
  scheduleReleaseRemoteStructuralApplyGuard
} from './univerRemoteStructuralApplyGuard'

type UniverApiLike = {
  getActiveWorkbook?: () => unknown
  syncExecuteCommand?: (commandId: string, params?: object) => unknown
} | null

type VisibilityAxis = 'row' | 'column'

type VisibilityRange = { start?: number; end?: number }

type UniverVisibilityRange = {
  startRow: number
  endRow: number
  startColumn: number
  endColumn: number
}

type FreezePanesState = {
  startRow: number
  startColumn: number
  xSplit: number
  ySplit: number
}

/** Minimal Univer workbook facade; active workbook from the API is typed as unknown */
type UniverFacadeWorkbook = {
  getActiveSheet?: () => unknown
  getSheetBySheetId?: (id: string) => unknown
  getId?: () => string
  getUnitId?: () => string
}

function resolveWorksheetForRemoteApply(
  workbook: unknown,
  targetSheetId: string,
  activePropSheetId: string,
  multiSheetWorkbookMode: boolean
): unknown {
  const wb = workbook as UniverFacadeWorkbook
  const isActivePropSheet = targetSheetId === activePropSheetId
  if (!isActivePropSheet && multiSheetWorkbookMode) {
    return wb.getSheetBySheetId?.(targetSheetId) ?? wb.getActiveSheet?.()
  }
  return wb.getActiveSheet?.()
}

const SET_ROWS_HIDDEN_COMMAND_ID = 'sheet.command.set-rows-hidden'
const SET_COLS_HIDDEN_COMMAND_ID = 'sheet.command.set-col-hidden'
const SET_ROWS_VISIBLE_COMMAND_ID = 'sheet.command.set-specific-rows-visible'
const SET_COLS_VISIBLE_COMMAND_ID = 'sheet.command.set-col-visible-on-cols'

function shouldUseRecordedVisibilityCommand(commandId: string): boolean {
  if (!commandId) return false
  const normalized = commandId.toLowerCase()
  if (normalized.includes('mutation')) return false
  return !normalized.includes('selected') && !normalized.includes('confirm')
}

function resolveVisibilityCommandId(commandId: string, axis: VisibilityAxis, hidden: boolean): string {
  if (shouldUseRecordedVisibilityCommand(commandId)) return commandId
  if (axis === 'row') return hidden ? SET_ROWS_HIDDEN_COMMAND_ID : SET_ROWS_VISIBLE_COMMAND_ID
  return hidden ? SET_COLS_HIDDEN_COMMAND_ID : SET_COLS_VISIBLE_COMMAND_ID
}

function resolveRemoteVisibilityCommandRanges(
  axis: VisibilityAxis,
  simplifiedRanges: VisibilityRange[],
  params: Record<string, unknown>
): UniverVisibilityRange[] {
  const paramsRanges = Array.isArray(params.ranges) ? params.ranges : []
  const fromParams = paramsRanges
    .map(range => {
      if (!range || typeof range !== 'object' || Array.isArray(range)) return null
      const candidate = range as Record<string, unknown>
      const startRow = Number(candidate.startRow)
      const endRow = Number(candidate.endRow)
      const startColumn = Number(candidate.startColumn)
      const endColumn = Number(candidate.endColumn)
      if (
        !Number.isFinite(startRow) ||
        !Number.isFinite(endRow) ||
        !Number.isFinite(startColumn) ||
        !Number.isFinite(endColumn)
      ) {
        return null
      }
      return {
        startRow: Math.max(0, Math.trunc(startRow)),
        endRow: Math.max(0, Math.trunc(endRow)),
        startColumn: Math.max(0, Math.trunc(startColumn)),
        endColumn: Math.max(0, Math.trunc(endColumn))
      }
    })
    .filter((range): range is UniverVisibilityRange => range != null)
  if (fromParams.length > 0) return fromParams
  return toUniverVisibilityRanges(axis, simplifiedRanges)
}

function toUniverVisibilityRanges(axis: VisibilityAxis, ranges: VisibilityRange[]): UniverVisibilityRange[] {
  return ranges
    .map(range => {
      const start = Math.max(0, Math.trunc(Number(range.start)))
      const end = Math.max(start, Math.trunc(Number(range.end)))
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null
      return axis === 'row'
        ? { startRow: start, endRow: end, startColumn: 0, endColumn: 0 }
        : { startRow: 0, endRow: 0, startColumn: start, endColumn: end }
    })
    .filter((range): range is UniverVisibilityRange => range != null)
}

function normalizeFreezeStart(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined
  return Math.max(-1, Math.trunc(raw))
}

function normalizeFreezeSplit(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined
  return Math.max(0, Math.trunc(raw))
}

function normalizeRemoteFreezeState(data: Record<string, unknown>): { cleared: true } | FreezePanesState | null {
  const commandId = typeof data.commandId === 'string' ? data.commandId.trim().toLowerCase() : ''
  const params =
    data.params && typeof data.params === 'object' && !Array.isArray(data.params)
      ? (data.params as Record<string, unknown>)
      : {}
  const readStart = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const fromData = normalizeFreezeStart(data[key])
      if (fromData !== undefined) return fromData
      const fromParams = normalizeFreezeStart(params[key])
      if (fromParams !== undefined) return fromParams
    }
    return undefined
  }
  const readSplit = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const fromData = normalizeFreezeSplit(data[key])
      if (fromData !== undefined) return fromData
      const fromParams = normalizeFreezeSplit(params[key])
      if (fromParams !== undefined) return fromParams
    }
    return undefined
  }
  if (data.cleared === true) return { cleared: true }
  let startRow = readStart('startRow')
  let startColumn = readStart('startColumn')
  let xSplit = readSplit('xSplit')
  let ySplit = readSplit('ySplit')
  if (commandId === 'sheet.command.set-row-frozen') {
    if (startRow === 0) startRow = 1
    if (ySplit === 0) ySplit = 1
  }
  if (commandId === 'sheet.command.set-col-frozen') {
    if (startColumn === 0) startColumn = 1
    if (xSplit === 0) xSplit = 1
  }
  if (startRow === undefined || startColumn === undefined || xSplit === undefined || ySplit === undefined) {
    return null
  }
  return { startRow, startColumn, xSplit, ySplit }
}

export interface UseUniverRemoteApplyParams {
  sheetId: string
  propsRef: MutableRefObject<{ multiSheetWorkbookMode?: boolean }>
  univerAPIRef: MutableRefObject<UniverApiLike>
  cellDimensionsRef: MutableRefObject<SnapshotDimensions | null>
  isApplyingRemoteUpdateRef: MutableRefObject<boolean>
  collabPersistedBulkApplyDepthRef: MutableRefObject<number>
  refreshCursorRectsRef: MutableRefObject<(() => void) | null>
  refreshCommentRectsRef: MutableRefObject<(() => void) | null>
}

export function runRemoteCommandWithStructuralGuard(params: {
  isApplyingRemoteUpdateRef: MutableRefObject<boolean>
  collabPersistedBulkApplyDepthRef: MutableRefObject<number>
  execute: () => unknown
}): unknown {
  const guardRefs = {
    isApplyingRemoteUpdateRef: params.isApplyingRemoteUpdateRef,
    collabPersistedBulkApplyDepthRef: params.collabPersistedBulkApplyDepthRef
  }
  acquireRemoteStructuralApplyGuard(guardRefs)
  try {
    return params.execute()
  } finally {
    scheduleReleaseRemoteStructuralApplyGuard(guardRefs)
  }
}

export function useUniverRemoteApply({
  sheetId,
  propsRef,
  univerAPIRef,
  cellDimensionsRef,
  isApplyingRemoteUpdateRef,
  collabPersistedBulkApplyDepthRef,
  refreshCursorRectsRef,
  refreshCommentRectsRef
}: UseUniverRemoteApplyParams) {
  const applyRemoteDimensions = useCallback(
    (payload: CellDimensionsPayload) => {
      const isActivePropSheet = payload.sheetId === sheetId
      if (!isActivePropSheet && !propsRef.current.multiSheetWorkbookMode) return
      const currentDimensions = cellDimensionsRef.current
      const currentColumnData = isActivePropSheet ? (currentDimensions?.columnData ?? {}) : {}
      const currentRowData = isActivePropSheet ? (currentDimensions?.rowData ?? {}) : {}
      const localZoom = currentDimensions?.zoomRatio ?? 1
      const nextDimensions = {
        defaultColWidth:
          payload.defaultColWidth > 0
            ? payload.defaultColWidth
            : (currentDimensions?.defaultColWidth ?? CURSOR_OVERLAY_COL_WIDTH_PX),
        defaultRowHeight:
          payload.defaultRowHeight > 0
            ? payload.defaultRowHeight
            : (currentDimensions?.defaultRowHeight ?? CURSOR_OVERLAY_ROW_HEIGHT_PX),
        columnData: { ...currentColumnData, ...(payload.columnData ?? {}) },
        rowData: { ...currentRowData, ...(payload.rowData ?? {}) },
        rowHeaderWidth:
          payload.rowHeaderWidth > 0
            ? payload.rowHeaderWidth
            : (currentDimensions?.rowHeaderWidth ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX),
        columnHeaderHeight:
          payload.columnHeaderHeight > 0
            ? payload.columnHeaderHeight
            : (currentDimensions?.columnHeaderHeight ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX),
        zoomRatio: localZoom
      }
      if (isActivePropSheet && areSnapshotDimensionsEqual(currentDimensions, nextDimensions)) {
        return
      }
      if (isActivePropSheet) {
        cellDimensionsRef.current = nextDimensions
      }
      const api = univerAPIRef.current
      const workbook = api?.getActiveWorkbook?.()
      const worksheet = resolveWorksheetForRemoteApply(
        workbook,
        payload.sheetId,
        sheetId,
        propsRef.current.multiSheetWorkbookMode === true
      )
      if (
        worksheet &&
        typeof (worksheet as { setColumnWidth?: (col: number, w: number) => unknown }).setColumnWidth === 'function'
      ) {
        const ws = worksheet as {
          setColumnWidth: (col: number, w: number) => unknown
          setRowHeight: (row: number, h: number) => unknown
        }
        isApplyingRemoteUpdateRef.current = true
        try {
          Object.entries(payload.columnData ?? {}).forEach(([colStr, meta]) => {
            const w = meta?.w
            const currentWidth =
              typeof currentColumnData[colStr]?.w === 'number' && Number.isFinite(currentColumnData[colStr]?.w)
                ? Math.round(currentColumnData[colStr].w as number)
                : null
            const nextWidth = typeof w === 'number' && Number.isFinite(w) ? Math.round(w) : null
            if (nextWidth != null && nextWidth > 0 && currentWidth !== nextWidth) {
              ws.setColumnWidth(Number(colStr), nextWidth)
            }
          })
          Object.entries(payload.rowData ?? {}).forEach(([rowStr, meta]) => {
            const h = meta?.h
            const currentHeight =
              typeof currentRowData[rowStr]?.h === 'number' && Number.isFinite(currentRowData[rowStr]?.h)
                ? Math.round(currentRowData[rowStr].h as number)
                : null
            const nextHeight = typeof h === 'number' && Number.isFinite(h) ? Math.round(h) : null
            if (nextHeight != null && nextHeight > 0 && currentHeight !== nextHeight) {
              ws.setRowHeight(Number(rowStr), nextHeight)
            }
          })
        } finally {
          isApplyingRemoteUpdateRef.current = false
        }
      }
      if (isActivePropSheet) {
        refreshCursorRectsRef.current?.()
        refreshCommentRectsRef.current?.()
      }
    },
    [sheetId]
  )

  const applyRemoteClearAllRange = useCallback(
    (payload: {
      sheetId: string
      ranges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
    }) => {
      const api = univerAPIRef.current
      if (!api) return
      if (!payload || !Array.isArray(payload.ranges) || payload.ranges.length === 0) return
      const workbook = api.getActiveWorkbook?.()
      if (!workbook) return
      const targetWorksheet = resolveWorksheetForRemoteApply(
        workbook,
        payload.sheetId,
        sheetId,
        propsRef.current.multiSheetWorkbookMode === true
      )
      if (!targetWorksheet) return
      const gridBounds = resolveWorksheetGridBounds(targetWorksheet)
      const normalizedRanges = dedupeClearAllRanges(
        payload.ranges
          .map(range => normalizeClearAllRectangle(range))
          .filter((range): range is ClearAllRectangle => range != null)
          .map(range => (gridBounds ? clampClearAllRangeToBounds(range, gridBounds) : range))
      )
      if (normalizedRanges.length === 0) return
      const cellValue: Record<string, Record<string, null>> = {}
      for (const range of normalizedRanges) {
        const sr = range.startRow
        const er = range.endRow
        const sc = range.startColumn
        const ec = range.endColumn
        for (let r = sr; r <= er; r += 1) {
          const rowKey = String(r)
          const rowMap = cellValue[rowKey] ?? (cellValue[rowKey] = {})
          for (let c = sc; c <= ec; c += 1) {
            rowMap[String(c)] = null
          }
        }
      }
      if (Object.keys(cellValue).length === 0) return
      const subUnitId =
        (targetWorksheet as { getSheetId?: () => string } | null | undefined)?.getSheetId?.() ?? payload.sheetId
      const unitId =
        (workbook as { getId?: () => string; getUnitId?: () => string } | null | undefined)?.getUnitId?.() ??
        (workbook as { getId?: () => string } | null | undefined)?.getId?.()
      if (!subUnitId || !unitId) return
      isApplyingRemoteUpdateRef.current = true
      try {
        api.syncExecuteCommand?.('sheet.mutation.set-range-values', {
          unitId,
          subUnitId,
          cellValue
        })
      } catch (clearAllErr) {
        console.warn('[UniverSheetGrid] applyRemoteClearAllRange dispatch failed:', clearAllErr)
      } finally {
        isApplyingRemoteUpdateRef.current = false
      }
    },
    [sheetId]
  )

  const applyRemoteClearFormatRange = useCallback(
    (payload: {
      sheetId: string
      ranges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
    }) => {
      const api = univerAPIRef.current
      if (!api) return
      if (!payload || !Array.isArray(payload.ranges) || payload.ranges.length === 0) return
      const workbook = api.getActiveWorkbook?.()
      if (!workbook) return
      const targetWorksheet = resolveWorksheetForRemoteApply(
        workbook,
        payload.sheetId,
        sheetId,
        propsRef.current.multiSheetWorkbookMode === true
      )
      if (!targetWorksheet) return
      const gridBounds = resolveWorksheetGridBounds(targetWorksheet)
      const normalizedRanges = dedupeClearAllRanges(
        payload.ranges
          .map(range => normalizeClearAllRectangle(range))
          .filter((range): range is ClearAllRectangle => range != null)
          .map(range => (gridBounds ? clampClearAllRangeToBounds(range, gridBounds) : range))
      )
      if (normalizedRanges.length === 0) return
      const cellValue: Record<string, Record<string, { s: null }>> = {}
      for (const range of normalizedRanges) {
        const sr = range.startRow
        const er = range.endRow
        const sc = range.startColumn
        const ec = range.endColumn
        for (let r = sr; r <= er; r += 1) {
          const rowKey = String(r)
          const rowMap = cellValue[rowKey] ?? (cellValue[rowKey] = {})
          for (let c = sc; c <= ec; c += 1) {
            rowMap[String(c)] = { s: null }
          }
        }
      }
      if (Object.keys(cellValue).length === 0) return
      const subUnitId =
        (targetWorksheet as { getSheetId?: () => string } | null | undefined)?.getSheetId?.() ?? payload.sheetId
      const unitId =
        (workbook as { getId?: () => string; getUnitId?: () => string } | null | undefined)?.getUnitId?.() ??
        (workbook as { getId?: () => string } | null | undefined)?.getId?.()
      if (!subUnitId || !unitId) return
      isApplyingRemoteUpdateRef.current = true
      try {
        api.syncExecuteCommand?.('sheet.mutation.set-range-values', {
          unitId,
          subUnitId,
          cellValue
        })
      } catch (clearFormatErr) {
        console.warn('[UniverSheetGrid] applyRemoteClearFormatRange dispatch failed:', clearFormatErr)
      } finally {
        isApplyingRemoteUpdateRef.current = false
      }
    },
    [sheetId]
  )

  const applyRemoteSpreadsheetFeatureOperation = useCallback(
    (payload: SpreadsheetRemoteFeatureOperationPayload) => {
      const api = univerAPIRef.current
      const workbook = api?.getActiveWorkbook?.()
      if (!api || !workbook || !payload?.data?.sheetId) return
      const targetSheetId = payload.data.sheetId
      const targetWorksheet = resolveWorksheetForRemoteApply(
        workbook,
        targetSheetId,
        sheetId,
        propsRef.current.multiSheetWorkbookMode === true
      )
      if (!targetWorksheet) return
      const subUnitId =
        (targetWorksheet as { getSheetId?: () => string } | null | undefined)?.getSheetId?.() ?? targetSheetId
      const unitId =
        (workbook as { getId?: () => string; getUnitId?: () => string } | null | undefined)?.getUnitId?.() ??
        (workbook as { getId?: () => string } | null | undefined)?.getId?.()
      const commandId = typeof payload.data.commandId === 'string' ? payload.data.commandId : ''
      const params =
        payload.data.params && typeof payload.data.params === 'object' && !Array.isArray(payload.data.params)
          ? { ...(payload.data.params as Record<string, unknown>), unitId, subUnitId, sheetId: targetSheetId }
          : { unitId, subUnitId, sheetId: targetSheetId }
      try {
        if (payload.type === 'merge_ranges' || payload.type === 'unmerge_ranges') {
          const mergeData = payload.data as { ranges?: unknown }
          const ranges = Array.isArray(mergeData.ranges)
            ? mergeData.ranges
                .map(normalizeClearAllRectangle)
                .filter((range): range is ClearAllRectangle => range != null)
            : []
          if (ranges.length > 0 && typeof api.syncExecuteCommand === 'function') {
            runRemoteCommandWithStructuralGuard({
              isApplyingRemoteUpdateRef,
              collabPersistedBulkApplyDepthRef,
              execute: () =>
                api.syncExecuteCommand?.(
                  payload.type === 'merge_ranges'
                    ? 'sheet.mutation.add-worksheet-merge'
                    : 'sheet.mutation.remove-worksheet-merge',
                  {
                    unitId,
                    subUnitId,
                    ranges
                  }
                )
            })
          }
          return
        }
        if (payload.type === 'visibility_update') {
          const visibilityData = payload.data as {
            axis?: 'row' | 'column'
            ranges?: Array<{ start?: number; end?: number }>
            hidden?: boolean
          }
          const axis: VisibilityAxis = visibilityData.axis === 'row' ? 'row' : 'column'
          const ranges = Array.isArray(visibilityData.ranges) ? visibilityData.ranges : []
          const commandRanges = resolveRemoteVisibilityCommandRanges(axis, ranges, params)
          if (commandRanges.length > 0 && typeof api.syncExecuteCommand === 'function') {
            runRemoteCommandWithStructuralGuard({
              isApplyingRemoteUpdateRef,
              collabPersistedBulkApplyDepthRef,
              execute: () =>
                api.syncExecuteCommand?.(resolveVisibilityCommandId(commandId, axis, visibilityData.hidden === true), {
                  ...params,
                  ranges: commandRanges
                })
            })
            return
          }
          const columnSetter = targetWorksheet as { setColumnWidth?: (col: number, w: number) => unknown }
          const rowSetter = targetWorksheet as { setRowHeight?: (row: number, h: number) => unknown }
          for (const range of ranges) {
            const start = Math.max(0, Math.trunc(Number(range.start)))
            const end = Math.max(start, Math.trunc(Number(range.end)))
            for (let index = start; index <= end; index += 1) {
              if (axis === 'column') {
                columnSetter.setColumnWidth?.(index, visibilityData.hidden ? 0 : CURSOR_OVERLAY_COL_WIDTH_PX)
              } else {
                rowSetter.setRowHeight?.(index, visibilityData.hidden ? 0 : CURSOR_OVERLAY_ROW_HEIGHT_PX)
              }
            }
          }
          return
        }
        if (payload.type === 'freeze_panes') {
          const freeze = normalizeRemoteFreezeState(payload.data as Record<string, unknown>)
          if (freeze?.cleared) {
            const freezeTarget = targetWorksheet as { cancelFreeze?: () => unknown }
            if (typeof freezeTarget.cancelFreeze === 'function') {
              freezeTarget.cancelFreeze()
              return
            }
            if (typeof api.syncExecuteCommand === 'function') {
              runRemoteCommandWithStructuralGuard({
                isApplyingRemoteUpdateRef,
                collabPersistedBulkApplyDepthRef,
                execute: () => api.syncExecuteCommand?.(commandId || 'sheet.command.cancel-frozen', params)
              })
              return
            }
          }
          if (freeze) {
            const freezeTarget = targetWorksheet as { setFreeze?: (freeze: FreezePanesState) => unknown }
            if (typeof freezeTarget.setFreeze === 'function') {
              freezeTarget.setFreeze(freeze)
              return
            }
            if (typeof api.syncExecuteCommand === 'function') {
              runRemoteCommandWithStructuralGuard({
                isApplyingRemoteUpdateRef,
                collabPersistedBulkApplyDepthRef,
                execute: () =>
                  api.syncExecuteCommand?.(commandId || 'sheet.command.set-selection-frozen', {
                    ...params,
                    ...freeze
                  })
              })
              return
            }
          }
        }
        if (commandId && typeof api.syncExecuteCommand === 'function') {
          runRemoteCommandWithStructuralGuard({
            isApplyingRemoteUpdateRef,
            collabPersistedBulkApplyDepthRef,
            execute: () =>
              api.syncExecuteCommand?.(commandId, params && typeof params === 'object' ? params : undefined)
          })
          return
        }
      } catch (featureErr) {
        console.warn('[UniverSheetGrid] applyRemoteSpreadsheetFeatureOperation failed:', featureErr)
      }
    },
    [collabPersistedBulkApplyDepthRef, isApplyingRemoteUpdateRef, sheetId]
  )

  return {
    applyRemoteDimensions,
    applyRemoteClearAllRange,
    applyRemoteClearFormatRange,
    applyRemoteSpreadsheetFeatureOperation
  }
}
