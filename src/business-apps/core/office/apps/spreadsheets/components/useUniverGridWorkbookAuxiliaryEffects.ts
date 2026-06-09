import { useEffect } from 'react'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import { createUniverConversionContext } from '../utils/univerAdapter'
import { CURSOR_OVERLAY_COL_WIDTH_PX, CURSOR_OVERLAY_ROW_HEIGHT_PX } from './univerGridLayoutConstants'
import { tryGetUniverActiveWorkbook, tryGetUniverActiveWorksheet } from './univerSafeFacadeAccess'
import type { UniverGridController } from './useUniverGridController'

type ConversionContextDeps = Pick<UniverGridController, 'univerAPIRef' | 'contextRef'>

/**
 * Keeps `contextRef` aligned with React `data`/`columns` so Univer value-change handlers map indices correctly.
 * Must run before `useUniverAuthoritativeGridSync` in the parent (effect registration order).
 */
export function useUniverGridConversionContextSync(
  params: {
    data: Record<string, unknown>[]
    columns: SpreadsheetColumn[]
  } & ConversionContextDeps
): void {
  const { data, columns, univerAPIRef, contextRef } = params

  useEffect(() => {
    if (!univerAPIRef.current) return
    contextRef.current = createUniverConversionContext(columns, data)
  }, [data, columns])
}

type SnapshotColumnTimerDeps = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'cellDimensionsRef'
  | 'isApplyingRemoteUpdateRef'
  | 'collabPersistedBulkApplyDepthRef'
  | 'columnInsertFormulaFollowUpSuppressUntilMsRef'
  | 'columnDeleteFormulaFollowUpSuppressUntilMsRef'
  | 'columnMoveFormulaFollowUpSuppressUntilMsRef'
  | 'isDirtyRef'
  | 'snapshotRequestInFlightRef'
  | 'requestSnapshotCheckpointRef'
  | 'scheduleSnapshotCheckpointRef'
  | 'readOnlyRef'
>

/**
 * Column width sync into Univer, snapshot checkpoint fallback interval, and visibility re-arm.
 * Run after `useUniverAuthoritativeGridSync` so column widths follow authoritative reconciliation.
 */
export function useUniverGridSnapshotColumnAndTimerEffects(
  params: { columns: SpreadsheetColumn[] } & SnapshotColumnTimerDeps
): void {
  const {
    columns,
    univerAPIRef,
    cellDimensionsRef,
    isApplyingRemoteUpdateRef,
    collabPersistedBulkApplyDepthRef,
    columnInsertFormulaFollowUpSuppressUntilMsRef,
    columnDeleteFormulaFollowUpSuppressUntilMsRef,
    columnMoveFormulaFollowUpSuppressUntilMsRef,
    isDirtyRef,
    snapshotRequestInFlightRef,
    requestSnapshotCheckpointRef,
    scheduleSnapshotCheckpointRef,
    readOnlyRef
  } = params

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    const workbookAccessBlockedUntilRef = { current: 0 }

    const clearPendingTimeout = () => {
      if (timeoutId != null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
    }

    const getColumnStructuralBlockUntilMs = () =>
      Math.max(
        columnInsertFormulaFollowUpSuppressUntilMsRef.current,
        columnDeleteFormulaFollowUpSuppressUntilMsRef.current,
        columnMoveFormulaFollowUpSuppressUntilMsRef.current
      )

    const runColumnWidthSync = () => {
      if (cancelled) return
      clearPendingTimeout()

      const blockUntilMs = getColumnStructuralBlockUntilMs()
      const remoteStructuralGuardActive =
        isApplyingRemoteUpdateRef.current || collabPersistedBulkApplyDepthRef.current > 0
      if (remoteStructuralGuardActive || Date.now() < blockUntilMs) {
        const structuralDelayMs = Math.max(16, blockUntilMs - Date.now() + 16)
        timeoutId = setTimeout(runColumnWidthSync, remoteStructuralGuardActive ? 50 : structuralDelayMs)
        return
      }

      const api = univerAPIRef.current
      const workbook = tryGetUniverActiveWorkbook(api, { blockedUntilRef: workbookAccessBlockedUntilRef })
      const worksheet = tryGetUniverActiveWorksheet(workbook as { getActiveSheet?: () => unknown } | null | undefined, {
        blockedUntilRef: workbookAccessBlockedUntilRef
      })
      if (
        !worksheet ||
        typeof (worksheet as { setColumnWidth?: (col: number, w: number) => unknown }).setColumnWidth !== 'function'
      ) {
        if (api) {
          timeoutId = setTimeout(runColumnWidthSync, 50)
        }
        return
      }

      const ws = worksheet as { setColumnWidth: (col: number, w: number) => unknown }
      const nextColumnData = { ...(cellDimensionsRef.current?.columnData ?? {}) }
      const visibleColumns = columns.filter(column => column.isVisible !== false)
      let hasMaterialWidthChange = false
      visibleColumns.forEach((column, index) => {
        if (typeof column.width === 'number' && Number.isFinite(column.width) && column.width > 0) {
          const currentWidth =
            typeof nextColumnData[index]?.w === 'number' && Number.isFinite(nextColumnData[index]?.w)
              ? Math.round(nextColumnData[index].w as number)
              : null
          const nextWidth = Math.round(column.width)
          if (currentWidth === nextWidth) return
          hasMaterialWidthChange = true
          ws.setColumnWidth(index, column.width)
          nextColumnData[index] = { ...(nextColumnData[index] ?? {}), w: column.width }
        }
      })
      if (!hasMaterialWidthChange) {
        return
      }
      cellDimensionsRef.current = cellDimensionsRef.current
        ? { ...cellDimensionsRef.current, columnData: nextColumnData }
        : {
            defaultColWidth: CURSOR_OVERLAY_COL_WIDTH_PX,
            defaultRowHeight: CURSOR_OVERLAY_ROW_HEIGHT_PX,
            columnData: nextColumnData,
            rowData: {},
            rowHeaderWidth: 48,
            columnHeaderHeight: 28,
            zoomRatio: 1
          }
    }

    runColumnWidthSync()

    return () => {
      cancelled = true
      clearPendingTimeout()
    }
  }, [columns])

  useEffect(() => {
    const FALLBACK_INTERVAL_MS = 60000
    const id = setInterval(() => {
      if (!isDirtyRef.current) return
      const req = requestSnapshotCheckpointRef.current
      if (!req || snapshotRequestInFlightRef.current) return
      req()
    }, FALLBACK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (readOnlyRef.current) return
      const schedule = scheduleSnapshotCheckpointRef.current
      if (!schedule || !isDirtyRef.current) return
      schedule(5000)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])
}
