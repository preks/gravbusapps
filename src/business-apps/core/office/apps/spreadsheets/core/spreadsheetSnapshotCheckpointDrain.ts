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
  let delayedRetryHandle: ReturnType<typeof setTimeout> | null = null

  const scheduleDelayedDrain = (): void => {
    if (delayedRetryHandle != null) {
      clearTimeout(delayedRetryHandle)
    }
    const pendingEntries = Array.from(params.pendingSnapshotCheckpointBySheetRef.current.values())
    if (pendingEntries.length === 0) return
    const earliestRequestedAt = Math.min(...pendingEntries.map(entry => entry.requestedAt))
    const delayMs = Math.max(0, earliestRequestedAt - Date.now())
    delayedRetryHandle = globalThis.setTimeout(() => {
      delayedRetryHandle = null
      void scheduleDrain()
    }, delayMs)
  }

  const scheduleDrain = (): Promise<void> => {
    if (params.snapshotCheckpointDrainScheduledRef.current) {
      return params.snapshotCheckpointDrainPromiseRef.current ?? Promise.resolve()
    }
    if (delayedRetryHandle != null) {
      clearTimeout(delayedRetryHandle)
      delayedRetryHandle = null
    }

    params.snapshotCheckpointDrainScheduledRef.current = true
    const promise = params
      .chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        try {
          while (params.pendingSnapshotCheckpointBySheetRef.current.size > 0) {
            const readySheetIds = Array.from(params.pendingSnapshotCheckpointBySheetRef.current.entries())
              .filter(([, entry]) => entry.requestedAt <= Date.now())
              .map(([sheetId]) => sheetId)
            if (readySheetIds.length === 0) {
              break
            }
            readySheetIds.forEach(sheetId => {
              params.pendingSnapshotCheckpointBySheetRef.current.delete(sheetId)
            })

            for (const targetSheetId of readySheetIds) {
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
          scheduleDelayedDrain()
        }
      }) as Promise<void>

    params.snapshotCheckpointDrainPromiseRef.current = promise
    return promise
  }

  return scheduleDrain
}
