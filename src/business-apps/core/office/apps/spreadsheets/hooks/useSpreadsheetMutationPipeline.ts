import { useMemo, type MutableRefObject } from 'react'

import {
  createSpreadsheetMutationBatchSubmitter,
  createSpreadsheetMutationFacade,
  SpreadsheetSessionMutationSources,
  type SpreadsheetMutationFacade,
  type SpreadsheetReplayResponse,
  type SpreadsheetSession,
  type SpreadsheetViewerRow
} from '../core'
import type { SpreadsheetSheet } from '../types'
import { areCanonicalSheetIdsEqual, resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'

const EMPTY_SHEET_ID_ALIASES = new Map<string, string>()
import type { SpreadsheetTraceEventInput, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'

import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'

export type SpreadsheetOperationQueueChain = (
  queueRef: MutableRefObject<Promise<void>>,
  fn: () => Promise<void>
) => Promise<void>

export interface UseSpreadsheetMutationPipelineParams {
  appId: string
  activeSheetIdRef: MutableRefObject<string>
  spreadsheetSession: SpreadsheetSession
  sheetVersionRef: MutableRefObject<number>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
  snapshotSaveMetricsRef: MutableRefObject<{ conflicts: number }>
  unloadKeepAlivePersistRef: MutableRefObject<boolean>
  enqueueSnapshotCheckpointRef: MutableRefObject<(() => Promise<void>) | null>
  activeTraceSessionRef: MutableRefObject<SpreadsheetTraceSession | null>
  diagnosticsBrowserSessionIdRef: MutableRefObject<string>
  diagnosticsTabIdRef: MutableRefObject<string>
  createOperationId: (prefix: string) => string
  getKnownSheetVersion: (targetSheetId: string, fallbackVersion: number) => number
  rememberRecentLocalBatchId: (batchId: string, tabId?: string) => void
  rememberKnownSheetVersion: (sheetId: string, version: number) => void
  rememberSheetVersion: (sheetId: string, version: number) => void
  rememberLocalCommittedVersion: (version: number) => void
  refreshBaseVersionBeforeWrite: (sheetId: string, baseVersion: number) => Promise<number>
  updateActiveSheetVersion: (version: number, mode: 'set' | 'max') => void
  applyResponseRowsToLocalBaseline: (
    targetSheetId: string,
    operations: SpreadsheetBatchOperation[],
    response: SpreadsheetBatchOperationResponse
  ) => void
  recoverFromVersionConflict: () => Promise<boolean>
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  fetchSheetVersion: (targetSheetId: string) => Promise<number>
  fetchSheetReplaySince: (sheetId: string, sinceVersion: number) => Promise<SpreadsheetReplayResponse>
  scheduleRemoteStructuralResync: (sheetId?: string, options?: { immediate?: boolean }) => void
  onRowAdd?: (appId: string, sheetId: string, rowData: SpreadsheetViewerRow) => Promise<SpreadsheetViewerRow | null>
  onRowUpdate?: (
    appId: string,
    sheetId: string,
    rowId: string,
    rowData: SpreadsheetViewerRow
  ) => Promise<SpreadsheetViewerRow | null>
  onSheetAdd?: (
    appId: string,
    sheet?: Partial<SpreadsheetSheet> & { worksheetSnapshot?: Record<string, unknown> }
  ) => Promise<SpreadsheetSheet | null>
  onSheetDuplicate?: (
    appId: string,
    sourceSheetId: string,
    sheet: { id?: string; name: string; visualWorksheetSnapshot?: Record<string, unknown> }
  ) => Promise<SpreadsheetSheet | null>
  onSheetUpdate?: (
    appId: string,
    sheetId: string,
    updates: Partial<SpreadsheetSheet>
  ) => Promise<SpreadsheetSheet | null>
  onSheetDelete?: (appId: string, sheetId: string) => Promise<boolean>
  mutationFacadeRef: MutableRefObject<SpreadsheetMutationFacade | null>
  /** Temp→persisted ids for newly created sheets (canonical comparisons + route normalization). */
  createdSheetIdAliasesRef?: MutableRefObject<Map<string, string>>
  /** Serializes every submitBatch through the shared operation queue (cell/style/dim ordering). */
  serializeMutationSubmitsWithQueue?: {
    operationQueueRef: MutableRefObject<Promise<void>>
    chainOnOperationQueue: SpreadsheetOperationQueueChain
    /** When >0, callers already run inside `chainOnOperationQueue`; submitting must not nest-queue (deadlock). */
    operationQueueExecutionDepthRef: MutableRefObject<number>
  }
}

export interface UseSpreadsheetMutationPipelineResult {
  mutationFacade: SpreadsheetMutationFacade
  submitMutationBatch: SpreadsheetMutationFacade['submitBatch']
  /** Unwrapped HTTP submitter for the sheet work queue (avoids main-queue starvation). */
  submitMutationBatchForSheetQueue: SpreadsheetMutationFacade['submitBatch']
}

export function useSpreadsheetMutationPipeline(
  params: UseSpreadsheetMutationPipelineParams
): UseSpreadsheetMutationPipelineResult {
  const {
    appId,
    activeSheetIdRef,
    spreadsheetSession,
    sheetVersionRef,
    appSheetsRef,
    snapshotSaveMetricsRef,
    unloadKeepAlivePersistRef,
    enqueueSnapshotCheckpointRef,
    activeTraceSessionRef,
    diagnosticsBrowserSessionIdRef,
    diagnosticsTabIdRef,
    createOperationId,
    getKnownSheetVersion,
    rememberRecentLocalBatchId,
    rememberKnownSheetVersion,
    rememberSheetVersion,
    rememberLocalCommittedVersion,
    refreshBaseVersionBeforeWrite,
    updateActiveSheetVersion,
    applyResponseRowsToLocalBaseline,
    recoverFromVersionConflict,
    enqueueDiagnosticsTraceEvent,
    fetchSheetVersion,
    fetchSheetReplaySince,
    scheduleRemoteStructuralResync,
    onRowAdd,
    onRowUpdate,
    onSheetAdd,
    onSheetDuplicate,
    onSheetUpdate,
    onSheetDelete,
    mutationFacadeRef,
    createdSheetIdAliasesRef,
    serializeMutationSubmitsWithQueue
  } = params

  const rawSubmitMutationBatch = useMemo<SpreadsheetMutationFacade['submitBatch']>(
    () =>
      createSpreadsheetMutationBatchSubmitter({
        appId,
        createBatchId: createOperationId,
        getTraceContext: () => ({
          traceSessionId: activeTraceSessionRef.current?.id,
          sessionId: diagnosticsBrowserSessionIdRef.current,
          tabId: diagnosticsTabIdRef.current
        }),
        shouldKeepalive: () => unloadKeepAlivePersistRef.current,
        normalizeTargetSheetId: sheetId =>
          resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef?.current ?? EMPTY_SHEET_ID_ALIASES),
        isActiveSheet: sheetId =>
          areCanonicalSheetIdsEqual(
            sheetId,
            activeSheetIdRef.current,
            createdSheetIdAliasesRef?.current ?? EMPTY_SHEET_ID_ALIASES
          ),
        resolveBaseVersion: targetSheetId => {
          const aliases = createdSheetIdAliasesRef?.current ?? EMPTY_SHEET_ID_ALIASES
          const canonicalTarget = resolveReconciledSheetId(targetSheetId, aliases)
          const canonicalActive = resolveReconciledSheetId(activeSheetIdRef.current, aliases)
          const isActiveCanonical = canonicalTarget === canonicalActive
          return getKnownSheetVersion(
            canonicalTarget,
            isActiveCanonical
              ? (spreadsheetSession.getActiveSheetState()?.version ?? sheetVersionRef.current)
              : Number(
                  appSheetsRef.current.find(sheet => resolveReconciledSheetId(sheet.id, aliases) === canonicalTarget)
                    ?.version ?? 0
                )
          )
        },
        getActiveSheetVersion: () => spreadsheetSession.getActiveSheetState()?.version ?? sheetVersionRef.current,
        refreshBaseVersionBeforeWrite,
        fetchSheetVersion,
        rememberRecentLocalBatchId,
        rememberKnownSheetVersion,
        rememberSheetVersion,
        rememberLocalCommittedVersion,
        setActiveSheetVersion: version => {
          updateActiveSheetVersion(version, 'set')
        },
        applyMutationToSession: (targetSheetId, operations, response) => {
          spreadsheetSession.applyMutation({
            sheetId: targetSheetId,
            operations,
            response,
            source: SpreadsheetSessionMutationSources.LocalEdit
          })

          // Tier 1 per-field conflict: any operation the backend marked
          // `rejected_conflict` was NOT applied server-side. The user typed
          // a value that lost a last-writer-wins race; we paint the server's
          // current value into the local session as a remote update so the
          // grid and any other readers converge to the authoritative value.
          // Older backends omit `results[]`; treat that as "everything accepted".
          const rejectedResults = response.results?.filter(
            (entry): entry is Extract<typeof entry, { status: 'rejected_conflict' }> =>
              entry.status === 'rejected_conflict'
          )
          if (!rejectedResults || rejectedResults.length === 0) {
            return
          }
          const paintOperations: SpreadsheetBatchOperation[] = []
          for (const rejected of rejectedResults) {
            for (const cell of rejected.serverState) {
              if (cell.field !== 'value') continue
              paintOperations.push({
                operationId: `paint_${rejected.operationId}_${cell.rowId}_${cell.columnName}`,
                type: 'set_cell',
                data: {
                  rowId: cell.rowId,
                  columnName: cell.columnName,
                  value: cell.value
                }
              })
            }
          }
          if (paintOperations.length === 0) return
          spreadsheetSession.applyMutation({
            sheetId: targetSheetId,
            operations: paintOperations,
            source: SpreadsheetSessionMutationSources.RemoteApply
          })
        },
        applyResponseRowsToLocalBaseline,
        incrementConflictCount: () => {
          snapshotSaveMetricsRef.current.conflicts += 1
        },
        recoverFromVersionConflict,
        scheduleSnapshotCheckpointFromPersistence: () => {
          void enqueueSnapshotCheckpointRef.current?.()
        },
        emitTraceEvent: enqueueDiagnosticsTraceEvent
      }),
    [
      appId,
      activeSheetIdRef,
      appSheetsRef,
      applyResponseRowsToLocalBaseline,
      createOperationId,
      enqueueDiagnosticsTraceEvent,
      enqueueSnapshotCheckpointRef,
      fetchSheetVersion,
      getKnownSheetVersion,
      rememberLocalCommittedVersion,
      rememberKnownSheetVersion,
      rememberRecentLocalBatchId,
      rememberSheetVersion,
      recoverFromVersionConflict,
      refreshBaseVersionBeforeWrite,
      snapshotSaveMetricsRef,
      spreadsheetSession,
      sheetVersionRef,
      activeTraceSessionRef,
      diagnosticsBrowserSessionIdRef,
      diagnosticsTabIdRef,
      unloadKeepAlivePersistRef,
      updateActiveSheetVersion,
      createdSheetIdAliasesRef
    ]
  )

  const submitMutationBatch = useMemo<SpreadsheetMutationFacade['submitBatch']>(() => {
    // NOTE: Per-sheet HTTP serialization (the old `perSheetSubmitTailRef`)
    // has been removed. Two equivalent ordering guarantees exist now:
    //
    //  1. Queue-routed submits (`sheetWorkQueue.enqueueLocalPersist`) are
    //     serialized by the queue's own per-sheet FIFO + global
    //     `chainOnOperationQueue` mutex.
    //  2. Direct submits from the journal/restore path
    //     (`useSpreadsheetPendingCellPersistence`) are issued one-at-a-time
    //     and likewise chained through `chainOnOperationQueue`.
    //
    // Both lanes call `refreshBaseVersionBeforeWrite` immediately before
    // each submit, which is what the old "Fix G" recovery-on-prior-error
    // ultimately accomplished (resync the cached base before the next wire
    // call). Cascading 409s are therefore avoided without a per-sheet
    // promise chain on top of the global queue.
    if (!serializeMutationSubmitsWithQueue) {
      return rawSubmitMutationBatch
    }
    const { operationQueueRef, chainOnOperationQueue, operationQueueExecutionDepthRef } =
      serializeMutationSubmitsWithQueue
    return async request => {
      if (operationQueueExecutionDepthRef.current > 0) {
        return rawSubmitMutationBatch(request)
      }
      let captured: SpreadsheetBatchOperationResponse | undefined
      await chainOnOperationQueue(operationQueueRef, async () => {
        captured = await rawSubmitMutationBatch(request)
      })
      if (!captured) {
        throw new Error('[SpreadsheetMutationPipeline] submitBatch did not return a response')
      }
      return captured
    }
  }, [rawSubmitMutationBatch, serializeMutationSubmitsWithQueue])

  const mutationFacade = useMemo(
    () =>
      createSpreadsheetMutationFacade({
        appId,
        submitBatch: submitMutationBatch,
        fetchSheetChangesSince: fetchSheetReplaySince,
        requestStructuralResync: scheduleRemoteStructuralResync,
        onRowAdd,
        onRowUpdate,
        onSheetAdd,
        onSheetDuplicate,
        onSheetUpdate,
        onSheetDelete
      }),
    [
      appId,
      fetchSheetReplaySince,
      onRowAdd,
      onRowUpdate,
      onSheetAdd,
      onSheetDelete,
      onSheetDuplicate,
      onSheetUpdate,
      scheduleRemoteStructuralResync,
      submitMutationBatch
    ]
  )

  mutationFacadeRef.current = mutationFacade

  return { mutationFacade, submitMutationBatch, submitMutationBatchForSheetQueue: rawSubmitMutationBatch }
}
