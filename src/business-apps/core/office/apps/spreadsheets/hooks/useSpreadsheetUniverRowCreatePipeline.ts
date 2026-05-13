import { useCallback, useRef, type MutableRefObject } from 'react'

import { SpreadsheetApiRequestError } from '../services/SpreadsheetApiService'
import {
  areCanonicalSheetIdsEqual,
  isSheetCreationAwaitingPersistedId,
  resolveReconciledSheetId
} from '../utils/reconcileTemporarySheetId'
import { resolveBackendRowIdForViewerRow } from '../utils/spreadsheetRowIdentity'
import type { SpreadsheetColumn } from '../types'

interface SpreadsheetPersistenceIndicator {
  beginPersist: () => void
  endPersist: () => void
  markDirty: () => void
  recordSuccess: (isSettled: boolean) => void
  recordError: (message: string) => void
}

export interface UseSpreadsheetUniverRowCreatePipelineParams {
  activeSheetId: string
  activeSheetIdRef: MutableRefObject<string>
  activeSheetColumns: SpreadsheetColumn[]
  getColumnsForSheet: (sheetId: string) => SpreadsheetColumn[]
  isUuid: (value: string) => boolean
  isOpsV2Enabled: boolean
  onRowAdd?: unknown
  entityEnabledRef: MutableRefObject<boolean>
  canEditWithLockRef: MutableRefObject<boolean>
  latestUniverDataRef: MutableRefObject<{ data: Record<string, unknown>[]; sheetId: string } | null>
  pendingUniverRowsBySheetRef: MutableRefObject<
    Map<string, { data: Record<string, unknown>[]; persistedRows: Record<string, unknown>[] }>
  >
  lastProcessedLengthRef: MutableRefObject<number>
  operationQueueRef: MutableRefObject<Promise<void>>
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  sheetPersist: SpreadsheetPersistenceIndicator
  markVersionAsChanged: () => void
  markVersionAsSaved: () => void
  onPersistRowsErrorMessage: string
  getActiveSessionRows: () => Record<string, unknown>[]
  buildAddRowPayloadsFromUniverRows: (
    rows: Array<Record<string, unknown>>,
    columns: SpreadsheetColumn[]
  ) => Array<Record<string, unknown>>
  replaceClientRowsWithCreatedRows: (
    previousRows: Record<string, unknown>[],
    createdRows: Array<Record<string, unknown>>
  ) => Record<string, unknown>[]
  persistAddedRowsWithBatch: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
  ) => Promise<void>
  persistSingleAddedRow: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
  ) => Promise<void>
  recoverFromVersionConflict: () => Promise<boolean>
  summarizeRowsForDebug: (rows: Record<string, unknown>[] | undefined) => Record<string, unknown>
  getRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  multiSheetDebugLog: (event: string, meta?: Record<string, unknown> | (() => Record<string, unknown>)) => void
  commitRowsForSheet: (sheetId: string, rows: Record<string, unknown>[], options?: { syncGrid?: boolean }) => void
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
}

export interface UseSpreadsheetUniverRowCreatePipelineResult {
  processUniverDataChange: () => Promise<void>
  processUniverDataChangeRef: MutableRefObject<() => Promise<void>>
}

export function useSpreadsheetUniverRowCreatePipeline(
  params: UseSpreadsheetUniverRowCreatePipelineParams
): UseSpreadsheetUniverRowCreatePipelineResult {
  const {
    activeSheetIdRef,
    activeSheetColumns,
    getColumnsForSheet,
    isUuid,
    isOpsV2Enabled,
    onRowAdd,
    entityEnabledRef,
    canEditWithLockRef,
    latestUniverDataRef,
    pendingUniverRowsBySheetRef,
    lastProcessedLengthRef,
    operationQueueRef,
    chainOnOperationQueue,
    sheetPersist,
    markVersionAsChanged,
    markVersionAsSaved,
    onPersistRowsErrorMessage,
    getActiveSessionRows,
    buildAddRowPayloadsFromUniverRows,
    replaceClientRowsWithCreatedRows,
    persistAddedRowsWithBatch,
    persistSingleAddedRow,
    recoverFromVersionConflict,
    summarizeRowsForDebug,
    getRowsForSheet,
    multiSheetDebugLog,
    commitRowsForSheet,
    pendingCreatedSheetSelectionRef,
    createdSheetIdAliasesRef
  } = params

  const processUniverDataChange = useCallback(async () => {
    const latest = latestUniverDataRef.current
    if (!latest || entityEnabledRef.current || !canEditWithLockRef.current) return
    const targetSheetId = latest.sheetId || activeSheetIdRef.current

    if (
      isSheetCreationAwaitingPersistedId({
        pendingCreatedSheetSelection: pendingCreatedSheetSelectionRef.current,
        effectiveSheetId: targetSheetId,
        aliases: createdSheetIdAliasesRef.current
      })
    ) {
      multiSheetDebugLog('process_univer_data_change_deferred_sheet_create', () => ({
        targetSheetId,
        pendingTemporary: pendingCreatedSheetSelectionRef.current?.temporarySheetId ?? null,
        pendingPersisted: pendingCreatedSheetSelectionRef.current?.persistedSheetId ?? null
      }))
      return
    }

    const newData = latest.data
    const canonicalTargetId = resolveReconciledSheetId(targetSheetId, createdSheetIdAliasesRef.current)

    const pendingRows = pendingUniverRowsBySheetRef.current.get(targetSheetId)
    const isActiveTarget = areCanonicalSheetIdsEqual(
      targetSheetId,
      activeSheetIdRef.current,
      createdSheetIdAliasesRef.current
    )
    const persistedRows = isActiveTarget
      ? getActiveSessionRows()
      : (pendingRows?.persistedRows ?? getRowsForSheet(canonicalTargetId))
    const rowNeedsBackendMaterialization = (row: Record<string, unknown> | undefined): boolean =>
      !row || !resolveBackendRowIdForViewerRow(row, isUuid)
    const firstUnmaterializedRowIndex = newData.findIndex((_, index) =>
      rowNeedsBackendMaterialization(persistedRows[index])
    )
    const hasUnmaterializedRows = firstUnmaterializedRowIndex >= 0 && firstUnmaterializedRowIndex < newData.length
    const lastProcessed = hasUnmaterializedRows
      ? Math.min(isActiveTarget ? lastProcessedLengthRef.current : persistedRows.length, firstUnmaterializedRowIndex)
      : isActiveTarget
        ? lastProcessedLengthRef.current
        : persistedRows.length
    const targetColumns = isActiveTarget ? activeSheetColumns : getColumnsForSheet(canonicalTargetId)
    multiSheetDebugLog('process_univer_data_change_start', () => ({
      sheetId: targetSheetId,
      newData: summarizeRowsForDebug(newData),
      localSheetData: summarizeRowsForDebug(persistedRows),
      lastProcessedLength: lastProcessed,
      activeSheetId: activeSheetIdRef.current
    }))
    if (newData.length <= lastProcessed) {
      multiSheetDebugLog('process_univer_data_change_skip_no_new_rows', () => ({
        sheetId: latest.sheetId,
        newDataLength: newData.length,
        lastProcessedLength: lastProcessed,
        firstUnmaterializedRowIndex
      }))
      return
    }

    sheetPersist.markDirty()
    markVersionAsChanged()

    const prev = persistedRows
    const added = newData.slice(lastProcessed)
    const rowPayloads = buildAddRowPayloadsFromUniverRows(added, targetColumns)

    const useBatchAddRows = isOpsV2Enabled || rowPayloads.length > 1 || !onRowAdd

    const updateLocalRowsAfterCreate = (createdRows: Array<Record<string, unknown>>) => {
      const next = replaceClientRowsWithCreatedRows(prev, createdRows)
      if (isActiveTarget) {
        lastProcessedLengthRef.current = newData.length
      }
      pendingUniverRowsBySheetRef.current.delete(targetSheetId)
      multiSheetDebugLog('process_univer_data_change_rows_created', () => ({
        sheetId: targetSheetId,
        previousLocalRows: summarizeRowsForDebug(prev),
        createdRows: summarizeRowsForDebug(createdRows),
        nextRows: summarizeRowsForDebug(next),
        newData: summarizeRowsForDebug(newData)
      }))
      commitRowsForSheet(canonicalTargetId, next, { syncGrid: false })
    }

    sheetPersist.beginPersist()
    try {
      if (useBatchAddRows) {
        await persistAddedRowsWithBatch(canonicalTargetId, rowPayloads, updateLocalRowsAfterCreate)
        sheetPersist.recordSuccess(true)
        markVersionAsSaved()
        return
      }

      await persistSingleAddedRow(canonicalTargetId, rowPayloads, updateLocalRowsAfterCreate)
      sheetPersist.recordSuccess(true)
      markVersionAsSaved()
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to persist added rows:', error)
      sheetPersist.recordError(onPersistRowsErrorMessage)
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        const recovered = await recoverFromVersionConflict()
        const latestSid = latestUniverDataRef.current?.sheetId
        if (
          recovered &&
          latestSid &&
          resolveReconciledSheetId(latestSid, createdSheetIdAliasesRef.current) === canonicalTargetId &&
          latestUniverDataRef.current.data.length > lastProcessed
        ) {
          void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
        }
      }
    } finally {
      sheetPersist.endPersist()
    }
  }, [
    activeSheetColumns,
    activeSheetIdRef,
    buildAddRowPayloadsFromUniverRows,
    canEditWithLockRef,
    chainOnOperationQueue,
    commitRowsForSheet,
    entityEnabledRef,
    getColumnsForSheet,
    getActiveSessionRows,
    getRowsForSheet,
    isUuid,
    isOpsV2Enabled,
    lastProcessedLengthRef,
    latestUniverDataRef,
    markVersionAsChanged,
    markVersionAsSaved,
    multiSheetDebugLog,
    onPersistRowsErrorMessage,
    onRowAdd,
    operationQueueRef,
    pendingUniverRowsBySheetRef,
    persistAddedRowsWithBatch,
    persistSingleAddedRow,
    recoverFromVersionConflict,
    replaceClientRowsWithCreatedRows,
    sheetPersist,
    summarizeRowsForDebug,
    pendingCreatedSheetSelectionRef,
    createdSheetIdAliasesRef
  ])

  const processUniverDataChangeRef = useRef(processUniverDataChange)
  processUniverDataChangeRef.current = processUniverDataChange

  return { processUniverDataChange, processUniverDataChangeRef }
}
