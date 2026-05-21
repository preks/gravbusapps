import { useMemo, useRef, type MutableRefObject } from 'react'

import {
  createSpreadsheetMutationBatchSubmitter,
  createSpreadsheetMutationFacade,
  SpreadsheetSessionMutationSources,
  type SpreadsheetMutationBatchRequest,
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

  const perSheetSubmitTailRef = useRef<Map<string, Promise<SpreadsheetBatchOperationResponse | void>>>(new Map())

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
    const chainSheetSubmit = (request: SpreadsheetMutationBatchRequest) => {
      const aliases = createdSheetIdAliasesRef?.current ?? EMPTY_SHEET_ID_ALIASES
      const targetSheetId = resolveReconciledSheetId(request.sheetId, aliases)
      const previous = perSheetSubmitTailRef.current.get(targetSheetId) ?? Promise.resolve()
      // Fix G: when the previous batch on this sheet rejected, do NOT silently chain through.
      // We must re-sync our cached baseVersion before issuing the next submit, otherwise the
      // next batch fires with stale version state and produces cascading 409s that the user
      // experiences as random missing rows / cells. `recoverFromVersionConflict` is best-effort
      // (idempotent on its own); we swallow its rejection so the chain stays alive, but the
      // next batch will at least see a refreshed baseline.
      const next = previous
        .then(undefined, async previousError => {
          console.warn('[SpreadsheetMutationPipeline] previous batch failed; resyncing before next submit', {
            targetSheetId,
            error: previousError instanceof Error ? previousError.message : String(previousError ?? 'unknown')
          })
          try {
            await recoverFromVersionConflict()
          } catch {
            /* recovery is best-effort; the next submitter call will refreshBaseVersionBeforeWrite anyway */
          }
        })
        .then(() => rawSubmitMutationBatch(request)) as Promise<SpreadsheetBatchOperationResponse>
      perSheetSubmitTailRef.current.set(targetSheetId, next)
      // Don't let an unhandled rejection bubble; we only care for chain-consumers awaiting `next` directly.
      void next.catch(() => undefined)
      return next
    }

    if (!serializeMutationSubmitsWithQueue) {
      return chainSheetSubmit
    }
    const { operationQueueRef, chainOnOperationQueue, operationQueueExecutionDepthRef } =
      serializeMutationSubmitsWithQueue
    return async request => {
      if (operationQueueExecutionDepthRef.current > 0) {
        return chainSheetSubmit(request)
      }
      let captured: SpreadsheetBatchOperationResponse | undefined
      await chainOnOperationQueue(operationQueueRef, async () => {
        captured = await chainSheetSubmit(request)
      })
      if (!captured) {
        throw new Error('[SpreadsheetMutationPipeline] submitBatch did not return a response')
      }
      return captured
    }
  }, [createdSheetIdAliasesRef, rawSubmitMutationBatch, recoverFromVersionConflict, serializeMutationSubmitsWithQueue])

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

  return { mutationFacade, submitMutationBatch }
}
