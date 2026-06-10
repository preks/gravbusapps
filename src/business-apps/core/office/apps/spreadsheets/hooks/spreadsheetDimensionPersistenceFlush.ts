import type { MutableRefObject } from 'react'

import { createSpreadsheetMutationOperationId } from '../core'
import type { SpreadsheetMutationFacade } from '../core'
import type { SpreadsheetApp, SpreadsheetColumn } from '../types'
import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import { debugLog } from '../utils/spreadsheetViewerDebug'

export interface DimensionPersistFlushContext {
  activeSheetId: string
  mutationFacadeRef: MutableRefObject<SpreadsheetMutationFacade | null>
  enqueueSnapshotCheckpointRef: MutableRefObject<(() => Promise<void>) | null>
  recentLocalColumnResizeRef: MutableRefObject<Map<string, { width: number; at: number }>>
  recentLocalRowHeightRef: MutableRefObject<Map<string, { height: number; at: number }>>
  recentLocalColWidthRef: MutableRefObject<Map<string, { width: number; at: number }>>
  baselineRowHeightsRef: MutableRefObject<Map<number, number>>
  baselineColWidthsRef: MutableRefObject<Map<number, number>>
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  onAppUpdate?: (app: SpreadsheetApp) => void
  onLocalAppUpdate?: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  markRecentLocalSnapshotMutation?: (sheetId: string, source: string) => void
  clearPendingWidthOverridesForColumns: (columnIds: string[]) => void
}

/**
 * Runs after the debounced dimension-change window (see viewer hook). Dispatches
 * column_update + set_row_height / set_col_width batches and enqueues snapshot checkpoint.
 */
export function runDimensionPersistFlush(
  columnsToPersist: SpreadsheetColumn[] | null,
  changedColumns: Array<{ columnId: string; width: number }>,
  dimOps: SpreadsheetBatchOperation[],
  ctx: DimensionPersistFlushContext
): void {
  const hasWorkToDo = (columnsToPersist && changedColumns.length > 0) || dimOps.length > 0
  if (!hasWorkToDo) return

  debugLog('dimension persist flush queued', {
    sheetId: ctx.activeSheetId,
    changedColumnCount: changedColumns.length,
    dimensionOpCount: dimOps.length,
    dimensionOpTypes: dimOps.map(op => op.type)
  })

  if (columnsToPersist && changedColumns.length > 0 && (ctx.onLocalAppUpdate || ctx.onAppUpdate)) {
    ctx.applyLocalAppUpdate(currentApp => ({
      ...currentApp,
      sheets: currentApp.sheets.map(sheet =>
        sheet.id === ctx.activeSheetId ? { ...sheet, columns: columnsToPersist } : sheet
      )
    }))
  }

  const submitBatch = ctx.mutationFacadeRef.current?.submitBatch
  if (!submitBatch) {
    debugLog('dimension persist flush skipped: mutation facade unavailable', {
      sheetId: ctx.activeSheetId,
      changedColumnCount: changedColumns.length,
      dimensionOpCount: dimOps.length
    })
    console.warn(
      '[SpreadsheetAppViewer] Dim batch dispatched before mutation facade was ready; widths/heights will still persist via the snapshot checkpoint below'
    )
  } else {
    const ops: SpreadsheetBatchOperation[] = []
    const now = Date.now()
    const baselineRowHeightUpdates: Array<{ rowIndex: number; height: number }> = []
    const baselineColWidthUpdates: Array<{ colIndex: number; width: number }> = []

    if (changedColumns.length > 0) {
      for (const change of changedColumns) {
        ctx.recentLocalColumnResizeRef.current.set(`${ctx.activeSheetId}:${change.columnId}`, {
          width: change.width,
          at: now
        })
        ops.push({
          operationId: createSpreadsheetMutationOperationId('column_update'),
          type: 'column_update',
          data: {
            sheetId: ctx.activeSheetId,
            columnId: change.columnId,
            columnPatch: { width: change.width }
          }
        })
      }
    }

    for (const op of dimOps) {
      const data = op.data as {
        rowIndex?: number
        height?: number
        colIndex?: number
        width?: number
      }
      if (op.type === 'set_row_height' && typeof data.rowIndex === 'number' && typeof data.height === 'number') {
        ctx.recentLocalRowHeightRef.current.set(`${ctx.activeSheetId}:${data.rowIndex}`, {
          height: data.height,
          at: now
        })
        baselineRowHeightUpdates.push({ rowIndex: data.rowIndex, height: data.height })
      } else if (op.type === 'set_col_width' && typeof data.colIndex === 'number' && typeof data.width === 'number') {
        ctx.recentLocalColWidthRef.current.set(`${ctx.activeSheetId}:${data.colIndex}`, {
          width: data.width,
          at: now
        })
        baselineColWidthUpdates.push({ colIndex: data.colIndex, width: data.width })
      }
      ops.push(op)
    }

    if (ops.length > 0) {
      ctx.markRecentLocalSnapshotMutation?.(ctx.activeSheetId, 'dimensions_submit')
      debugLog('dimension persist submitBatch', {
        sheetId: ctx.activeSheetId,
        operationCount: ops.length,
        operationTypes: ops.map(op => op.type)
      })
      void (async () => {
        try {
          await submitBatch({
            sheetId: ctx.activeSheetId,
            operations: ops,
            batchIdPrefix: 'dimensions_change'
          })
          debugLog('dimension persist submitBatch succeeded', {
            sheetId: ctx.activeSheetId,
            operationCount: ops.length
          })
          baselineRowHeightUpdates.forEach(({ rowIndex, height }) => {
            ctx.baselineRowHeightsRef.current.set(rowIndex, height)
          })
          baselineColWidthUpdates.forEach(({ colIndex, width }) => {
            ctx.baselineColWidthsRef.current.set(colIndex, width)
          })
        } catch (error) {
          debugLog('dimension persist submitBatch failed', {
            sheetId: ctx.activeSheetId,
            operationCount: ops.length,
            message: error instanceof Error ? error.message : 'unknown'
          })
          ctx.clearPendingWidthOverridesForColumns(changedColumns.map(c => c.columnId))
          console.error('[SpreadsheetAppViewer] Failed to persist dim batch:', error)
        }
      })()
    }
  }

  const enqueueSnapshotCheckpoint = ctx.enqueueSnapshotCheckpointRef.current
  if (enqueueSnapshotCheckpoint) {
    void enqueueSnapshotCheckpoint()
  }
}
