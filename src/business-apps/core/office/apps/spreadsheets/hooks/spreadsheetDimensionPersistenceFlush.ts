import type { MutableRefObject } from 'react'

import { createSpreadsheetMutationOperationId } from '../core'
import type { SpreadsheetMutationFacade } from '../core'
import type { SpreadsheetApp, SpreadsheetColumn } from '../types'
import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'

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
    console.warn(
      '[SpreadsheetAppViewer] Dim batch dispatched before mutation facade was ready; widths/heights will still persist via the snapshot checkpoint below'
    )
  } else {
    const ops: SpreadsheetBatchOperation[] = []
    const now = Date.now()

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
        ctx.baselineRowHeightsRef.current.set(data.rowIndex, data.height)
      } else if (op.type === 'set_col_width' && typeof data.colIndex === 'number' && typeof data.width === 'number') {
        ctx.recentLocalColWidthRef.current.set(`${ctx.activeSheetId}:${data.colIndex}`, {
          width: data.width,
          at: now
        })
        ctx.baselineColWidthsRef.current.set(data.colIndex, data.width)
      }
      ops.push(op)
    }

    if (ops.length > 0) {
      void (async () => {
        try {
          await submitBatch({
            sheetId: ctx.activeSheetId,
            operations: ops,
            batchIdPrefix: 'dimensions_change'
          })
        } catch (error) {
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
