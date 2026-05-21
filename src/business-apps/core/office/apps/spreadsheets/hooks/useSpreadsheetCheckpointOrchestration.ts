import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'

import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetSheet } from '../types'
import type { UniverSheetGridHandle } from '../components/UniverSheetGrid.types'

import {
  bindSpreadsheetManualCheckpointWithFlush,
  type PersistSpreadsheetSnapshotCheckpointContext,
  type SpreadsheetManualCheckpointContext,
  type SpreadsheetSnapshotCoordinator,
  type SpreadsheetSnapshotDebugInfo
} from '../core'
import { useSpreadsheetSnapshotCheckpointPipeline } from './useSpreadsheetSnapshotCheckpointPipeline'

export interface UseSpreadsheetCheckpointOrchestrationParams {
  appId: string
  sheets: SpreadsheetSheet[]
  entityEnabled: boolean
  activeSheetId: string
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<unknown>
  operationQueueRef: MutableRefObject<Promise<void>>
  sheetPersist: {
    beginPersist: () => void
    endPersist: () => void
    recordSuccess: (quiet: boolean) => void
    recordError: (message: string) => void
  }
  sheetT: PersistSpreadsheetSnapshotCheckpointContext['sheetT']
  versioning: PersistSpreadsheetSnapshotCheckpointContext['versioning'] & {
    createCheckpoint: SpreadsheetManualCheckpointContext['createVersionCheckpoint']
  }
  flushPendingCellChangesRef: MutableRefObject<() => Promise<void>>
  getPersistedBaselineRowsForSheet: PersistSpreadsheetSnapshotCheckpointContext['getPersistedBaselineRowsForSheet']
  getActiveSessionRows: PersistSpreadsheetSnapshotCheckpointContext['getActiveSessionRows']
  hasPendingCellPersistence: PersistSpreadsheetSnapshotCheckpointContext['hasPendingCellPersistence']
  isUuid: PersistSpreadsheetSnapshotCheckpointContext['isUuid']
  commitLocalSheetData: PersistSpreadsheetSnapshotCheckpointContext['commitLocalSheetData']
  setSnapshotDebugInfo: Dispatch<SetStateAction<SpreadsheetSnapshotDebugInfo>>
  debugLog: PersistSpreadsheetSnapshotCheckpointContext['debugLog']
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  enqueueSnapshotCheckpointRef: MutableRefObject<(() => Promise<void>) | null>
  pendingSnapshotCheckpointBySheetRef: MutableRefObject<Map<string, { requestedAt: number }>>
  snapshotCheckpointDrainScheduledRef: MutableRefObject<boolean>
  snapshotCheckpointDrainPromiseRef: MutableRefObject<Promise<void> | null>
  socketPersistChainRef: MutableRefObject<Promise<unknown>>
  workbookSnapshotVersionRef: MutableRefObject<number>
  snapshotSaveMetricsRef: MutableRefObject<{
    attempts: number
    conflicts: number
    failures: number
    fallbackLoads: number
  }>
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
  activeSheetIdRef: MutableRefObject<string>
  peerSheetDataCacheRef: MutableRefObject<Map<string, Record<string, unknown>[]>>
  authoritativePeerSheetDataCacheRef: MutableRefObject<Set<string>>
  pendingSnapshotClearCellsRef: MutableRefObject<Map<string, Set<string>>>
  pendingCellPersistTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  unloadKeepAlivePersistRef: MutableRefObject<boolean>
  lastSuccessfulSnapshotCheckpointAtRef: MutableRefObject<number>
  activeTraceSessionRef: MutableRefObject<{ id?: string } | null>
}

export interface UseSpreadsheetCheckpointOrchestrationResult {
  persistSnapshotCheckpointForSheetRef: MutableRefObject<(targetSheetId: string) => Promise<void>>
  enqueueUniverSnapshotCheckpoint: () => Promise<void>
  queueSnapshotCheckpointForSheet: (sheetId: string) => void
  createCheckpointWithFlush: SpreadsheetSnapshotCoordinator['createCheckpointWithFlush']
}

/**
 * Snapshot checkpoint enqueue/coalesce (operation-queue drain) plus manual checkpoint flush sequencing.
 */
export function useSpreadsheetCheckpointOrchestration(
  params: UseSpreadsheetCheckpointOrchestrationParams
): UseSpreadsheetCheckpointOrchestrationResult {
  const {
    appId,
    sheets,
    entityEnabled,
    activeSheetId,
    chainOnOperationQueue,
    operationQueueRef,
    sheetPersist,
    sheetT,
    versioning,
    flushPendingCellChangesRef,
    getPersistedBaselineRowsForSheet,
    getActiveSessionRows,
    hasPendingCellPersistence,
    isUuid,
    commitLocalSheetData,
    setSnapshotDebugInfo,
    debugLog,
    enqueueDiagnosticsTraceEvent,
    enqueueSnapshotCheckpointRef,
    pendingSnapshotCheckpointBySheetRef,
    snapshotCheckpointDrainScheduledRef,
    snapshotCheckpointDrainPromiseRef,
    socketPersistChainRef,
    workbookSnapshotVersionRef,
    snapshotSaveMetricsRef,
    spreadsheetGridRef,
    activeSheetIdRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    pendingSnapshotClearCellsRef,
    pendingCellPersistTimeoutRef,
    unloadKeepAlivePersistRef,
    lastSuccessfulSnapshotCheckpointAtRef,
    activeTraceSessionRef
  } = params

  const checkpointContext = useMemo(
    (): PersistSpreadsheetSnapshotCheckpointContext => ({
      appId,
      sheets,
      entityEnabled,
      socketPersistChainRef,
      workbookSnapshotVersionRef,
      snapshotSaveMetricsRef,
      spreadsheetGridRef,
      activeSheetIdRef,
      peerSheetDataCacheRef,
      authoritativePeerSheetDataCacheRef,
      getPersistedBaselineRowsForSheet,
      pendingSnapshotClearCellsRef,
      pendingSnapshotCheckpointBySheetRef,
      pendingCellPersistTimeoutRef,
      unloadKeepAlivePersistRef,
      lastSuccessfulSnapshotCheckpointAtRef,
      activeTraceSessionRef,
      getActiveSessionRows,
      hasPendingCellPersistence,
      isUuid,
      commitLocalSheetData,
      setSnapshotDebugInfo,
      debugLog,
      enqueueDiagnosticsTraceEvent,
      sheetPersist,
      sheetT,
      versioning
    }),
    [
      appId,
      sheets,
      commitLocalSheetData,
      debugLog,
      enqueueDiagnosticsTraceEvent,
      entityEnabled,
      getActiveSessionRows,
      getPersistedBaselineRowsForSheet,
      hasPendingCellPersistence,
      isUuid,
      activeTraceSessionRef,
      authoritativePeerSheetDataCacheRef,
      lastSuccessfulSnapshotCheckpointAtRef,
      peerSheetDataCacheRef,
      pendingCellPersistTimeoutRef,
      pendingSnapshotCheckpointBySheetRef,
      pendingSnapshotClearCellsRef,
      snapshotSaveMetricsRef,
      socketPersistChainRef,
      spreadsheetGridRef,
      unloadKeepAlivePersistRef,
      workbookSnapshotVersionRef,
      activeSheetIdRef,
      sheetPersist,
      sheetT,
      versioning
    ]
  )

  const { persistSnapshotCheckpointForSheetRef, enqueueUniverSnapshotCheckpoint, queueSnapshotCheckpointForSheet } =
    useSpreadsheetSnapshotCheckpointPipeline({
      checkpointContext,
      activeSheetId,
      enqueueSnapshotCheckpointRef,
      chainOnOperationQueue,
      operationQueueRef,
      pendingSnapshotCheckpointBySheetRef,
      snapshotCheckpointDrainScheduledRef,
      snapshotCheckpointDrainPromiseRef,
      sheetPersist: { beginPersist: sheetPersist.beginPersist, endPersist: sheetPersist.endPersist }
    })

  const createCheckpointWithFlush = useCallback<SpreadsheetSnapshotCoordinator['createCheckpointWithFlush']>(
    bindSpreadsheetManualCheckpointWithFlush({
      activeSheetId,
      pendingCellPersistTimeoutRef,
      socketPersistChainRef,
      chainOnOperationQueue,
      operationQueueRef,
      flushPendingCellChangesRef,
      getLiveWorkbookSnapshot: () => spreadsheetGridRef.current?.getWorkbookSnapshot?.() ?? null,
      createVersionCheckpoint: versioning.createCheckpoint,
      onFlushFailure: error => {
        console.error('[SpreadsheetAppViewer] Checkpoint flush failed; aborting checkpoint', error)
        toast.error(sheetT('toast-checkpoint-flush-warning'))
      }
    }),
    [
      activeSheetId,
      chainOnOperationQueue,
      flushPendingCellChangesRef,
      operationQueueRef,
      pendingCellPersistTimeoutRef,
      socketPersistChainRef,
      spreadsheetGridRef,
      sheetT,
      versioning.createCheckpoint
    ]
  )

  return {
    persistSnapshotCheckpointForSheetRef,
    enqueueUniverSnapshotCheckpoint,
    queueSnapshotCheckpointForSheet,
    createCheckpointWithFlush
  }
}
