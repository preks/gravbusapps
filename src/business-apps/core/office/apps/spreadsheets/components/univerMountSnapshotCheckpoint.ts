import type { WorkbookSnapshotLifecycleOrigin } from './UniverSheetGrid.types'
import type { UniverGridController } from './useUniverGridController'

const SNAPSHOT_TIMEOUT_MS = 10000
/** Shorter throttle so formatting-heavy sessions hit the server before users close the tab. */
const AUTO_SNAPSHOT_THROTTLE_MS = 2000
const AUTO_SNAPSHOT_MAX_WAIT_MS = 12000

export type UniverMountSnapshotCheckpointRefs = Pick<
  UniverGridController,
  | 'callbacksRef'
  | 'isDirtyRef'
  | 'hasEditedRef'
  | 'snapshotRequestInFlightRef'
  | 'snapshotRequestQueuedRef'
  | 'snapshotCheckpointTimerRef'
  | 'snapshotCheckpointScheduledAtRef'
  | 'snapshotFirstDirtyAtRef'
  | 'snapshotLastRequestedAtRef'
  | 'snapshotLifecycleOriginRef'
  | 'snapshotDirtyVersionRef'
  | 'requestSnapshotCheckpointRef'
  | 'scheduleSnapshotCheckpointRef'
> & {
  flushQueuedSnapshotRequest: () => void
}

/**
 * Snapshot save pacing: request in-flight tracking, bounded wait, and dirty scheduling.
 * Side-effect wiring for `mountUniverWorkbookBootstrap`.
 */
export function attachUniverMountSnapshotCheckpointHandlers(refs: UniverMountSnapshotCheckpointRefs): {
  markDirtyAndScheduleSnapshot: (origin: WorkbookSnapshotLifecycleOrigin) => void
} {
  const {
    flushQueuedSnapshotRequest,
    callbacksRef,
    isDirtyRef,
    hasEditedRef,
    snapshotRequestInFlightRef,
    snapshotRequestQueuedRef,
    snapshotCheckpointTimerRef,
    snapshotCheckpointScheduledAtRef,
    snapshotFirstDirtyAtRef,
    snapshotLastRequestedAtRef,
    snapshotLifecycleOriginRef,
    snapshotDirtyVersionRef,
    requestSnapshotCheckpointRef,
    scheduleSnapshotCheckpointRef
  } = refs

  const requestSnapshotCheckpoint = (force = false) => {
    const onSnapshotRequestedCb = callbacksRef.current.onSnapshotRequested
    if (!onSnapshotRequestedCb) return
    if (!force && !isDirtyRef.current) return
    if (snapshotRequestInFlightRef.current) {
      snapshotRequestQueuedRef.current = true
      return
    }
    if (snapshotCheckpointTimerRef.current) {
      clearTimeout(snapshotCheckpointTimerRef.current)
      snapshotCheckpointTimerRef.current = null
    }
    snapshotCheckpointScheduledAtRef.current = null
    const lifecycleOrigin = snapshotLifecycleOriginRef.current
    try {
      callbacksRef.current.onWorkbookSnapshotLifecycle?.({ phase: 'checkpoint_scheduled', origin: lifecycleOrigin })
      snapshotLastRequestedAtRef.current = Date.now()
      const requestDirtyVersion = snapshotDirtyVersionRef.current
      const result = onSnapshotRequestedCb()
      const promise = Promise.resolve(result) as Promise<void>
      snapshotRequestInFlightRef.current = promise
      const timeoutId = setTimeout(() => {
        if (snapshotRequestInFlightRef.current === promise) {
          snapshotRequestInFlightRef.current = null
          flushQueuedSnapshotRequest()
        }
      }, SNAPSHOT_TIMEOUT_MS)
      void promise
        .then(() => {
          if (snapshotDirtyVersionRef.current === requestDirtyVersion && !snapshotRequestQueuedRef.current) {
            isDirtyRef.current = false
            hasEditedRef.current = false
            snapshotFirstDirtyAtRef.current = null
            snapshotLifecycleOriginRef.current = 'workbook'
          } else {
            scheduleSnapshotCheckpoint(AUTO_SNAPSHOT_THROTTLE_MS)
          }
          callbacksRef.current.onWorkbookSnapshotLifecycle?.({
            phase: 'checkpoint_settled',
            ok: true,
            origin: lifecycleOrigin
          })
        })
        .catch(() => {
          callbacksRef.current.onWorkbookSnapshotLifecycle?.({
            phase: 'checkpoint_settled',
            ok: false,
            origin: lifecycleOrigin
          })
          // Keep dirty; we'll retry on the next trigger.
          scheduleSnapshotCheckpoint(AUTO_SNAPSHOT_THROTTLE_MS)
        })
        .finally(() => {
          clearTimeout(timeoutId)
          snapshotRequestInFlightRef.current = null
          flushQueuedSnapshotRequest()
        })
    } catch {
      // Keep dirty
      callbacksRef.current.onWorkbookSnapshotLifecycle?.({
        phase: 'checkpoint_settled',
        ok: false,
        origin: lifecycleOrigin
      })
      scheduleSnapshotCheckpoint(AUTO_SNAPSHOT_THROTTLE_MS)
      flushQueuedSnapshotRequest()
    }
  }

  // Pace frontend snapshot saves, but guarantee they are emitted within a bounded
  // window while the workbook stays dirty.
  const scheduleSnapshotCheckpoint = (preferredDelayMs = AUTO_SNAPSHOT_THROTTLE_MS) => {
    const onSnapshotRequestedCb = callbacksRef.current.onSnapshotRequested
    if (!onSnapshotRequestedCb || !isDirtyRef.current) return

    const now = Date.now()
    if (snapshotFirstDirtyAtRef.current == null) {
      snapshotFirstDirtyAtRef.current = now
    }
    const earliestAllowedAt = snapshotLastRequestedAtRef.current + AUTO_SNAPSHOT_THROTTLE_MS
    const preferredAt = now + Math.max(0, preferredDelayMs)
    const maxWaitAt = snapshotFirstDirtyAtRef.current + AUTO_SNAPSHOT_MAX_WAIT_MS
    const dueAt = Math.min(maxWaitAt, Math.max(earliestAllowedAt, preferredAt))

    if (
      snapshotCheckpointTimerRef.current &&
      snapshotCheckpointScheduledAtRef.current != null &&
      snapshotCheckpointScheduledAtRef.current <= dueAt
    ) {
      return
    }
    if (snapshotCheckpointTimerRef.current) {
      clearTimeout(snapshotCheckpointTimerRef.current)
    }
    snapshotCheckpointScheduledAtRef.current = dueAt
    snapshotCheckpointTimerRef.current = setTimeout(
      () => {
        snapshotCheckpointTimerRef.current = null
        snapshotCheckpointScheduledAtRef.current = null
        requestSnapshotCheckpoint(true)
      },
      Math.max(0, dueAt - Date.now())
    )
    callbacksRef.current.onWorkbookSnapshotLifecycle?.({
      phase: 'checkpoint_scheduled',
      origin: snapshotLifecycleOriginRef.current
    })
  }

  requestSnapshotCheckpointRef.current = requestSnapshotCheckpoint
  scheduleSnapshotCheckpointRef.current = scheduleSnapshotCheckpoint

  const markDirtyAndScheduleSnapshot = (origin: WorkbookSnapshotLifecycleOrigin) => {
    snapshotDirtyVersionRef.current += 1
    isDirtyRef.current = true
    hasEditedRef.current = true
    snapshotLifecycleOriginRef.current =
      origin === 'workbook' || snapshotLifecycleOriginRef.current !== 'workbook' ? origin : 'workbook'
    scheduleSnapshotCheckpoint()
  }

  return { markDirtyAndScheduleSnapshot }
}
