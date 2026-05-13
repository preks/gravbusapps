import type { MutableRefObject } from 'react'

import {
  runSpreadsheetManualCheckpointWithFlush,
  type SpreadsheetManualCheckpointContext
} from './spreadsheetCheckpointCoordinator'
import type { SpreadsheetSnapshotCoordinator } from './SpreadsheetSnapshotCoordinator'

export interface BindSpreadsheetManualCheckpointWithFlushParams {
  activeSheetId: string
  pendingCellPersistTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  socketPersistChainRef: MutableRefObject<Promise<unknown>>
  chainOnOperationQueue: SpreadsheetManualCheckpointContext['chainOnOperationQueue']
  operationQueueRef: SpreadsheetManualCheckpointContext['operationQueueRef']
  flushPendingCellChangesRef: MutableRefObject<() => Promise<void>>
  getLiveWorkbookSnapshot: SpreadsheetManualCheckpointContext['getLiveWorkbookSnapshot']
  createVersionCheckpoint: SpreadsheetManualCheckpointContext['createVersionCheckpoint']
  onFlushFailure: SpreadsheetManualCheckpointContext['onFlushFailure']
}

/**
 * Viewer/versioning wiring for {@link runSpreadsheetManualCheckpointWithFlush}: debounce cancel,
 * socket chain, queued cell flush, then version checkpoint from live Univer snapshot.
 */
export function bindSpreadsheetManualCheckpointWithFlush(
  params: BindSpreadsheetManualCheckpointWithFlushParams
): SpreadsheetSnapshotCoordinator['createCheckpointWithFlush'] {
  return description =>
    runSpreadsheetManualCheckpointWithFlush(description, {
      activeSheetId: params.activeSheetId,
      clearPendingCellDebounce: () => {
        if (params.pendingCellPersistTimeoutRef.current) {
          clearTimeout(params.pendingCellPersistTimeoutRef.current)
          params.pendingCellPersistTimeoutRef.current = null
        }
      },
      awaitSocketPersistChain: async () => {
        await params.socketPersistChainRef.current.catch(() => {})
      },
      chainOnOperationQueue: params.chainOnOperationQueue,
      operationQueueRef: params.operationQueueRef,
      flushPendingCellChanges: () => params.flushPendingCellChangesRef.current(),
      getLiveWorkbookSnapshot: params.getLiveWorkbookSnapshot,
      createVersionCheckpoint: params.createVersionCheckpoint,
      onFlushFailure: params.onFlushFailure
    })
}
