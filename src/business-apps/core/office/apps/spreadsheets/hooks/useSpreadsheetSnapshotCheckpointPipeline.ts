import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react'

import {
  createSnapshotCheckpointDrainScheduler,
  persistSpreadsheetSnapshotCheckpointForSheet,
  touchPendingSpreadsheetSnapshotCheckpointForSheet,
  type CreateSnapshotCheckpointDrainSchedulerParams,
  type PendingSnapshotCheckpointBySheet,
  type PersistSpreadsheetSnapshotCheckpointContext
} from '../core'

export interface UseSpreadsheetSnapshotCheckpointPipelineParams {
  checkpointContext: PersistSpreadsheetSnapshotCheckpointContext
  activeSheetId: string
  enqueueSnapshotCheckpointRef: MutableRefObject<(() => Promise<void>) | null>
  chainOnOperationQueue: CreateSnapshotCheckpointDrainSchedulerParams['chainOnOperationQueue']
  operationQueueRef: CreateSnapshotCheckpointDrainSchedulerParams['operationQueueRef']
  pendingSnapshotCheckpointBySheetRef: MutableRefObject<PendingSnapshotCheckpointBySheet>
  snapshotCheckpointDrainScheduledRef: MutableRefObject<boolean>
  snapshotCheckpointDrainPromiseRef: MutableRefObject<Promise<void> | null>
  sheetPersist: CreateSnapshotCheckpointDrainSchedulerParams['sheetPersist']
}

export interface UseSpreadsheetSnapshotCheckpointPipelineResult {
  persistSnapshotCheckpointForSheet: (targetSheetId: string) => Promise<void>
  persistSnapshotCheckpointForSheetRef: MutableRefObject<(targetSheetId: string) => Promise<void>>
  enqueueUniverSnapshotCheckpoint: () => Promise<void>
  queueSnapshotCheckpointForSheet: (sheetId: string) => void
}

export function useSpreadsheetSnapshotCheckpointPipeline(
  params: UseSpreadsheetSnapshotCheckpointPipelineParams
): UseSpreadsheetSnapshotCheckpointPipelineResult {
  const {
    checkpointContext,
    activeSheetId,
    enqueueSnapshotCheckpointRef,
    chainOnOperationQueue,
    operationQueueRef,
    pendingSnapshotCheckpointBySheetRef,
    snapshotCheckpointDrainScheduledRef,
    snapshotCheckpointDrainPromiseRef,
    sheetPersist
  } = params

  const persistSnapshotCheckpointForSheet = useCallback(
    (targetSheetId: string) => persistSpreadsheetSnapshotCheckpointForSheet(targetSheetId, checkpointContext),
    [checkpointContext]
  )

  const persistSnapshotCheckpointForSheetRef = useRef(persistSnapshotCheckpointForSheet)
  persistSnapshotCheckpointForSheetRef.current = persistSnapshotCheckpointForSheet

  const scheduleSnapshotCheckpointDrain = useMemo(
    () =>
      createSnapshotCheckpointDrainScheduler({
        chainOnOperationQueue,
        operationQueueRef,
        pendingSnapshotCheckpointBySheetRef,
        snapshotCheckpointDrainScheduledRef,
        snapshotCheckpointDrainPromiseRef,
        persistSnapshotCheckpointForSheet,
        sheetPersist
      }),
    [persistSnapshotCheckpointForSheet, sheetPersist.beginPersist, sheetPersist.endPersist]
  )

  const enqueueUniverSnapshotCheckpoint = useCallback((): Promise<void> => {
    touchPendingSpreadsheetSnapshotCheckpointForSheet(
      pendingSnapshotCheckpointBySheetRef.current,
      activeSheetId,
      Date.now()
    )
    return scheduleSnapshotCheckpointDrain()
  }, [activeSheetId, scheduleSnapshotCheckpointDrain])

  const queueSnapshotCheckpointForSheet = useCallback(
    (sheetId: string) => {
      touchPendingSpreadsheetSnapshotCheckpointForSheet(
        pendingSnapshotCheckpointBySheetRef.current,
        sheetId,
        Date.now()
      )
      void scheduleSnapshotCheckpointDrain()
    },
    [scheduleSnapshotCheckpointDrain]
  )

  useEffect(() => {
    enqueueSnapshotCheckpointRef.current = enqueueUniverSnapshotCheckpoint
  }, [enqueueSnapshotCheckpointRef, enqueueUniverSnapshotCheckpoint])

  return {
    persistSnapshotCheckpointForSheet,
    persistSnapshotCheckpointForSheetRef,
    enqueueUniverSnapshotCheckpoint,
    queueSnapshotCheckpointForSheet
  }
}
