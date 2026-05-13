import type { MutableRefObject } from 'react'

export type PendingSnapshotCheckpointBySheet = Map<string, { requestedAt: number }>

export interface SnapshotCheckpointDrainSheetPersist {
  beginPersist: () => void
  endPersist: () => void
}

export interface CreateSnapshotCheckpointDrainSchedulerParams {
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<unknown>
  operationQueueRef: MutableRefObject<Promise<void>>
  pendingSnapshotCheckpointBySheetRef: MutableRefObject<PendingSnapshotCheckpointBySheet>
  snapshotCheckpointDrainScheduledRef: MutableRefObject<boolean>
  snapshotCheckpointDrainPromiseRef: MutableRefObject<Promise<void> | null>
  persistSnapshotCheckpointForSheet: (targetSheetId: string) => Promise<void>
  sheetPersist: SnapshotCheckpointDrainSheetPersist
}

/**
 * Coalesces snapshot checkpoint work onto the operation queue: one in-flight drain
 * at a time, processes all currently pending sheet ids, then reschedules if new
 * requests arrived during the drain (same semantics as the viewer loop).
 */
export function createSnapshotCheckpointDrainScheduler(
  params: CreateSnapshotCheckpointDrainSchedulerParams
): () => Promise<void> {
  const scheduleDrain = (): Promise<void> => {
    if (params.snapshotCheckpointDrainScheduledRef.current) {
      return params.snapshotCheckpointDrainPromiseRef.current ?? Promise.resolve()
    }

    params.snapshotCheckpointDrainScheduledRef.current = true
    const promise = params
      .chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        try {
          while (params.pendingSnapshotCheckpointBySheetRef.current.size > 0) {
            const pendingSheetIds = Array.from(params.pendingSnapshotCheckpointBySheetRef.current.keys())
            params.pendingSnapshotCheckpointBySheetRef.current.clear()

            for (const targetSheetId of pendingSheetIds) {
              await params.persistSnapshotCheckpointForSheet(targetSheetId)
            }
          }
        } finally {
          params.sheetPersist.endPersist()
        }
      })
      .finally(() => {
        params.snapshotCheckpointDrainScheduledRef.current = false
        params.snapshotCheckpointDrainPromiseRef.current = null
        if (params.pendingSnapshotCheckpointBySheetRef.current.size > 0) {
          void scheduleDrain()
        }
      }) as Promise<void>

    params.snapshotCheckpointDrainPromiseRef.current = promise
    return promise
  }

  return scheduleDrain
}
