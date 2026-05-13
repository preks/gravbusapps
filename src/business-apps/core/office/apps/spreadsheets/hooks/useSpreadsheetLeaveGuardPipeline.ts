import { useCallback, useMemo, type MutableRefObject } from 'react'

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
    onNavigateToSpreadsheetHub
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
