import { useEffect, type MutableRefObject } from 'react'

export interface UseSpreadsheetLifecyclePersistenceBridgeParams {
  flushPendingPersistenceNow: () => void
  unloadKeepAlivePersistRef: MutableRefObject<boolean>
  cacheLiveUniverSnapshotRef: MutableRefObject<() => void>
  entityEnabledRef: MutableRefObject<boolean>
  canEditWithLockRef: MutableRefObject<boolean>
  leaveGuardVersioningUnsavedRef: MutableRefObject<boolean>
  leaveGuardSheetDirtyRef: MutableRefObject<boolean>
  leaveGuardSheetErrorRef: MutableRefObject<string | null>
  leaveGuardSheetSavingRef: MutableRefObject<boolean>
  pendingCellChangesRef: MutableRefObject<unknown[]>
  pendingCellPersistTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  univerDataChangeTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  workbookSnapshotThrottlePendingRef: MutableRefObject<boolean>
  snapshotCheckpointDrainScheduledRef: MutableRefObject<boolean>
  pendingSnapshotCheckpointBySheetRef: MutableRefObject<Map<string, { requestedAt: number }>>
  collaborationHealthRef: MutableRefObject<string>
  scheduleSheetVersionRefreshFromApiRef: MutableRefObject<() => void>
  revalidateSpreadsheetUniverSnapshotAfterIdleTab: () => void
}

export function useSpreadsheetLifecyclePersistenceBridge(params: UseSpreadsheetLifecyclePersistenceBridgeParams): void {
  const {
    flushPendingPersistenceNow,
    unloadKeepAlivePersistRef,
    cacheLiveUniverSnapshotRef,
    entityEnabledRef,
    canEditWithLockRef,
    leaveGuardVersioningUnsavedRef,
    leaveGuardSheetDirtyRef,
    leaveGuardSheetErrorRef,
    leaveGuardSheetSavingRef,
    pendingCellChangesRef,
    pendingCellPersistTimeoutRef,
    univerDataChangeTimeoutRef,
    workbookSnapshotThrottlePendingRef,
    snapshotCheckpointDrainScheduledRef,
    pendingSnapshotCheckpointBySheetRef,
    collaborationHealthRef,
    scheduleSheetVersionRefreshFromApiRef,
    revalidateSpreadsheetUniverSnapshotAfterIdleTab
  } = params

  useEffect(() => {
    if (typeof globalThis === 'undefined' || typeof document === 'undefined') return

    let resumeFlushTimeout: ReturnType<typeof setTimeout> | null = null
    const scheduleResumeFlush = () => {
      if (resumeFlushTimeout) clearTimeout(resumeFlushTimeout)
      resumeFlushTimeout = setTimeout(() => {
        resumeFlushTimeout = null
        flushPendingPersistenceNow()
      }, 300)
    }

    const handlePageHide = () => {
      unloadKeepAlivePersistRef.current = true
      cacheLiveUniverSnapshotRef.current()
      flushPendingPersistenceNow()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        unloadKeepAlivePersistRef.current = true
        cacheLiveUniverSnapshotRef.current()
        if (resumeFlushTimeout) {
          clearTimeout(resumeFlushTimeout)
          resumeFlushTimeout = null
        }
        flushPendingPersistenceNow()
        return
      }
      if (document.visibilityState === 'visible') {
        unloadKeepAlivePersistRef.current = false
        revalidateSpreadsheetUniverSnapshotAfterIdleTab()
        if (collaborationHealthRef.current !== 'connected') {
          scheduleSheetVersionRefreshFromApiRef.current()
        }
        scheduleResumeFlush()
      }
    }
    const handleWindowFocus = () => {
      unloadKeepAlivePersistRef.current = false
      scheduleResumeFlush()
    }
    const handleOnline = () => {
      unloadKeepAlivePersistRef.current = false
      scheduleResumeFlush()
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (entityEnabledRef.current || !canEditWithLockRef.current) return
      cacheLiveUniverSnapshotRef.current()
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
      const shouldPrompt =
        matchesHeaderUnsaved ||
        hasPendingCells ||
        hasPendingDebounce ||
        hasPendingUniverChange ||
        hasPendingSnapshotWork
      if (shouldPrompt) {
        unloadKeepAlivePersistRef.current = true
        flushPendingPersistenceNow()
        e.preventDefault()
        e.returnValue = ''
      }
    }

    globalThis.addEventListener('pagehide', handlePageHide)
    globalThis.addEventListener('focus', handleWindowFocus)
    globalThis.addEventListener('online', handleOnline)
    globalThis.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      unloadKeepAlivePersistRef.current = false
      if (resumeFlushTimeout) clearTimeout(resumeFlushTimeout)
      globalThis.removeEventListener('pagehide', handlePageHide)
      globalThis.removeEventListener('focus', handleWindowFocus)
      globalThis.removeEventListener('online', handleOnline)
      globalThis.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    cacheLiveUniverSnapshotRef,
    canEditWithLockRef,
    collaborationHealthRef,
    entityEnabledRef,
    flushPendingPersistenceNow,
    leaveGuardSheetDirtyRef,
    leaveGuardSheetErrorRef,
    leaveGuardSheetSavingRef,
    leaveGuardVersioningUnsavedRef,
    pendingCellChangesRef,
    pendingCellPersistTimeoutRef,
    pendingSnapshotCheckpointBySheetRef,
    revalidateSpreadsheetUniverSnapshotAfterIdleTab,
    scheduleSheetVersionRefreshFromApiRef,
    snapshotCheckpointDrainScheduledRef,
    unloadKeepAlivePersistRef,
    univerDataChangeTimeoutRef,
    workbookSnapshotThrottlePendingRef
  ])
}
