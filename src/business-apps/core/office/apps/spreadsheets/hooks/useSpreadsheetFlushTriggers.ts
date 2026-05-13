import { useEffect, type MutableRefObject } from 'react'

export interface UseSpreadsheetFlushTriggersParams {
  isCollaborationConnected: boolean
  hasPendingCellPersistence: () => boolean
  flushPendingPersistenceNow: () => void
  univerDataChangeTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  pendingCellPersistTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
}

export function useSpreadsheetFlushTriggers(params: UseSpreadsheetFlushTriggersParams): void {
  const {
    isCollaborationConnected,
    hasPendingCellPersistence,
    flushPendingPersistenceNow,
    univerDataChangeTimeoutRef,
    pendingCellPersistTimeoutRef
  } = params

  useEffect(() => {
    if (!isCollaborationConnected || !hasPendingCellPersistence()) return
    const timeout = globalThis.setTimeout(() => {
      flushPendingPersistenceNow()
    }, 150)
    return () => clearTimeout(timeout)
  }, [isCollaborationConnected, flushPendingPersistenceNow, hasPendingCellPersistence])

  useEffect(() => {
    return () => {
      if (univerDataChangeTimeoutRef.current) {
        clearTimeout(univerDataChangeTimeoutRef.current)
        univerDataChangeTimeoutRef.current = null
      }
      if (pendingCellPersistTimeoutRef.current) {
        clearTimeout(pendingCellPersistTimeoutRef.current)
        pendingCellPersistTimeoutRef.current = null
      }
    }
  }, [pendingCellPersistTimeoutRef, univerDataChangeTimeoutRef])
}
