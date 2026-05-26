import { useCallback, useMemo, type MutableRefObject } from 'react'

import type { SheetWorkQueueApi } from '../core/spreadsheetSheetWorkQueue'

interface SpreadsheetPersistenceIndicator {
  beginPersist: () => void
  endPersist: () => void
  recordError: (message: string) => void
}

interface SnapshotCheckpointBySheetRefEntry {
  requestedAt: number
}

export interface UseSpreadsheetLeaveGuardPipelineParams {
  entityEnabled: boolean
  entityEnabledRef: MutableRefObject<boolean>
  canEditWithLockRef: MutableRefObject<boolean>
  activeSheetIdRef: MutableRefObject<string>
  operationQueueRef: MutableRefObject<Promise<void>>
  pendingCellChangesRef: MutableRefObject<unknown[]>
  pendingCellPersistTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  univerDataChangeTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  workbookSnapshotThrottlePendingRef: MutableRefObject<boolean>
  snapshotCheckpointDrainScheduledRef: MutableRefObject<boolean>
  pendingSnapshotCheckpointBySheetRef: MutableRefObject<Map<string, SnapshotCheckpointBySheetRefEntry>>
  leaveGuardVersioningUnsavedRef: MutableRefObject<boolean>
  leaveGuardSheetDirtyRef: MutableRefObject<boolean>
  leaveGuardSheetErrorRef: MutableRefObject<string | null>
  leaveGuardSheetSavingRef: MutableRefObject<boolean>
  cacheLiveUniverSnapshotRef: MutableRefObject<() => void>
  processUniverDataChangeRef: MutableRefObject<() => Promise<void>>
  flushPendingCellChangesRef: MutableRefObject<() => Promise<void>>
  persistSnapshotCheckpointForSheetRef: MutableRefObject<(targetSheetId: string) => Promise<void>>
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  sheetPersist: SpreadsheetPersistenceIndicator
  onPersistCellErrorMessage: string
  onUnsavedLeaveConfirmMessage: string
  onBack?: () => void
  onNavigateToSpreadsheetHub?: () => void
  /**
   * V1 sheet work queue accessor. When provided, the leave guard calls
   * `forceFlushAll()` (Guard C) before the snapshot checkpoint so any
   * coalesced / scheduled queue groups are submitted before navigation.
   * Returns per-sheet/per-group results; we surface aggregate counts via
   * console for diagnostics but do not block leave on `failed` or
   * `blocked_by_remote` — best-effort by design (post-load page snapshot
   * + journal restore covers the rest).
   */
  getSheetWorkQueue?: () => SheetWorkQueueApi | null
}

export interface UseSpreadsheetLeaveGuardPipelineResult {
  flushPendingPersistenceNow: () => void
  hasUnpersistedWork: () => boolean
  confirmLeaveIfUnsaved: () => boolean
  handleGuardedBack?: () => void
  handleGuardedNavigateToSpreadsheetHub?: () => void
}

export function useSpreadsheetLeaveGuardPipeline(
  params: UseSpreadsheetLeaveGuardPipelineParams
): UseSpreadsheetLeaveGuardPipelineResult {
  const {
    entityEnabled,
    entityEnabledRef,
    canEditWithLockRef,
    activeSheetIdRef,
    operationQueueRef,
    pendingCellChangesRef,
    pendingCellPersistTimeoutRef,
    univerDataChangeTimeoutRef,
    workbookSnapshotThrottlePendingRef,
    snapshotCheckpointDrainScheduledRef,
    pendingSnapshotCheckpointBySheetRef,
    leaveGuardVersioningUnsavedRef,
    leaveGuardSheetDirtyRef,
    leaveGuardSheetErrorRef,
    leaveGuardSheetSavingRef,
    cacheLiveUniverSnapshotRef,
    processUniverDataChangeRef,
    flushPendingCellChangesRef,
    persistSnapshotCheckpointForSheetRef,
    chainOnOperationQueue,
    sheetPersist,
    onPersistCellErrorMessage,
    onUnsavedLeaveConfirmMessage,
    onBack,
    onNavigateToSpreadsheetHub,
    getSheetWorkQueue
  } = params

  const flushPendingPersistenceNow = useCallback(() => {
    if (entityEnabled) return

    if (univerDataChangeTimeoutRef.current) {
      clearTimeout(univerDataChangeTimeoutRef.current)
      univerDataChangeTimeoutRef.current = null
    }
    if (pendingCellPersistTimeoutRef.current) {
      clearTimeout(pendingCellPersistTimeoutRef.current)
      pendingCellPersistTimeoutRef.current = null
    }
    const run = async () => {
      cacheLiveUniverSnapshotRef.current()
      await processUniverDataChangeRef.current()
      // Guard C: best-effort flush of any coalesced/scheduled queue groups
      // before journal + snapshot. Run BEFORE the legacy journal flush so
      // resolved cells the queue owns are submitted via the queue path
      // (where the version-equality invariant + retries apply) rather than
      // racing through the journal.
      const queue = getSheetWorkQueue?.()
      if (queue) {
        try {
          const aggregate = await queue.forceFlushAll()
          let flushed = 0
          let failed = 0
          let blocked = 0
          for (const sheetResults of Object.values(aggregate.bySheet)) {
            for (const r of sheetResults) {
              if (r === 'flushed') flushed += 1
              else if (r === 'failed') failed += 1
              else if (r === 'blocked_by_remote') blocked += 1
            }
          }
          if (failed > 0 || blocked > 0) {
            // Diagnostic only; do not abort leave — the journal + post-load
            // restore covers anything left behind.
            console.warn('[leave-guard] sheet work queue forceFlushAll partial', {
              flushed,
              failed,
              blockedByRemote: blocked
            })
          }
        } catch (err) {
          console.warn('[leave-guard] sheet work queue forceFlushAll threw', err)
        }
      }
      await flushPendingCellChangesRef.current()
      if (entityEnabledRef.current || !canEditWithLockRef.current) return
      const sheetId = activeSheetIdRef.current
      if (!sheetId) return
      try {
        sheetPersist.beginPersist()
        try {
          await persistSnapshotCheckpointForSheetRef.current(sheetId)
        } finally {
          sheetPersist.endPersist()
        }
      } catch (err) {
        console.warn('[SpreadsheetAppViewer] Best-effort Univer snapshot on tab hide/flush failed:', err)
      }
    }

    void chainOnOperationQueue(operationQueueRef, run).catch(err => {
      console.error('[SpreadsheetAppViewer] Flush on visibility/pagehide failed:', err)
      sheetPersist.recordError(onPersistCellErrorMessage)
    })
  }, [
    activeSheetIdRef,
    cacheLiveUniverSnapshotRef,
    canEditWithLockRef,
    chainOnOperationQueue,
    entityEnabled,
    entityEnabledRef,
    flushPendingCellChangesRef,
    getSheetWorkQueue,
    onPersistCellErrorMessage,
    operationQueueRef,
    pendingCellPersistTimeoutRef,
    persistSnapshotCheckpointForSheetRef,
    processUniverDataChangeRef,
    sheetPersist,
    univerDataChangeTimeoutRef
  ])

  const hasUnpersistedWork = useCallback((): boolean => {
    if (entityEnabledRef.current || !canEditWithLockRef.current) return false
    const matchesHeaderUnsaved =
      leaveGuardVersioningUnsavedRef.current ||
      leaveGuardSheetDirtyRef.current ||
      Boolean(leaveGuardSheetErrorRef.current) ||
      leaveGuardSheetSavingRef.current
    const hasPendingCells = pendingCellChangesRef.current.length > 0
    const hasPendingDebounce = pendingCellPersistTimeoutRef.current != null
    const hasPendingUniverChange = univerDataChangeTimeoutRef.current != null
    const hasPendingSnapshotWork =
      workbookSnapshotThrottlePendingRef.current ||
      pendingSnapshotCheckpointBySheetRef.current.size > 0 ||
      snapshotCheckpointDrainScheduledRef.current
    return (
      matchesHeaderUnsaved || hasPendingCells || hasPendingDebounce || hasPendingUniverChange || hasPendingSnapshotWork
    )
  }, [
    canEditWithLockRef,
    entityEnabledRef,
    leaveGuardSheetDirtyRef,
    leaveGuardSheetErrorRef,
    leaveGuardSheetSavingRef,
    leaveGuardVersioningUnsavedRef,
    pendingCellChangesRef,
    pendingCellPersistTimeoutRef,
    pendingSnapshotCheckpointBySheetRef,
    snapshotCheckpointDrainScheduledRef,
    univerDataChangeTimeoutRef,
    workbookSnapshotThrottlePendingRef
  ])

  const confirmLeaveIfUnsaved = useCallback((): boolean => {
    if (!hasUnpersistedWork()) return true
    try {
      flushPendingPersistenceNow()
    } catch {
      /* keep prompt path */
    }
    return globalThis.confirm(onUnsavedLeaveConfirmMessage)
  }, [flushPendingPersistenceNow, hasUnpersistedWork, onUnsavedLeaveConfirmMessage])

  const handleGuardedBack = useMemo(() => {
    if (!onBack) return undefined
    return () => {
      if (!confirmLeaveIfUnsaved()) return
      onBack()
    }
  }, [confirmLeaveIfUnsaved, onBack])

  const handleGuardedNavigateToSpreadsheetHub = useMemo(() => {
    if (!onNavigateToSpreadsheetHub) return undefined
    return () => {
      if (!confirmLeaveIfUnsaved()) return
      onNavigateToSpreadsheetHub()
    }
  }, [confirmLeaveIfUnsaved, onNavigateToSpreadsheetHub])

  return {
    flushPendingPersistenceNow,
    hasUnpersistedWork,
    confirmLeaveIfUnsaved,
    handleGuardedBack,
    handleGuardedNavigateToSpreadsheetHub
  }
}
