import type { WorkbookSnapshotLifecycleEvent } from '../components/UniverSheetGrid.types'

export function shouldMarkDirtyForSnapshotLifecycle(event: WorkbookSnapshotLifecycleEvent): boolean {
  if (event.phase === 'checkpoint_scheduled') {
    return event.origin === 'workbook'
  }

  return !event.ok && event.origin === 'workbook'
}

export function didAuthoritativeCellPersistenceSettle(params: {
  hasPendingCellPersistence: boolean
  hasPendingCellPersistTimer: boolean
}): boolean {
  return !params.hasPendingCellPersistence && !params.hasPendingCellPersistTimer
}
