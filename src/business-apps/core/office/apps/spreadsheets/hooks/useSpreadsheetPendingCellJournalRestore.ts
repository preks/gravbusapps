import { useEffect, type MutableRefObject } from 'react'

import {
  readSpreadsheetPendingCellJournal,
  type SpreadsheetPendingCellBatch,
  type SpreadsheetPendingCellChange
} from '../core'
import { coalesceQueuedCellChanges } from '../utils/spreadsheetPendingCells'

export interface UseSpreadsheetPendingCellJournalRestoreParams {
  entityEnabled: boolean
  pendingCellJournalStorageKey: string
  pendingCellJournalRestoredKeyRef: MutableRefObject<string | null>
  pendingCellChangesRef: MutableRefObject<SpreadsheetPendingCellChange[]>
  pendingCellBatchesRef: MutableRefObject<SpreadsheetPendingCellBatch[]>
  persistPendingCellJournal: () => void
  flushPendingPersistenceNow: () => void
}

export function useSpreadsheetPendingCellJournalRestore(params: UseSpreadsheetPendingCellJournalRestoreParams): void {
  const {
    entityEnabled,
    pendingCellJournalStorageKey,
    pendingCellJournalRestoredKeyRef,
    pendingCellChangesRef,
    pendingCellBatchesRef,
    persistPendingCellJournal,
    flushPendingPersistenceNow
  } = params

  useEffect(() => {
    if (entityEnabled || typeof globalThis === 'undefined') return
    if (pendingCellJournalRestoredKeyRef.current === pendingCellJournalStorageKey) return
    pendingCellJournalRestoredKeyRef.current = pendingCellJournalStorageKey

    const journal = readSpreadsheetPendingCellJournal(pendingCellJournalStorageKey)
    if (!journal) return

    pendingCellChangesRef.current = coalesceQueuedCellChanges(journal.draftCells)
    pendingCellBatchesRef.current = journal.pendingBatches
    persistPendingCellJournal()

    if (journal.draftCells.length > 0 || journal.pendingBatches.length > 0) {
      flushPendingPersistenceNow()
    }
  }, [entityEnabled, flushPendingPersistenceNow, pendingCellJournalStorageKey, persistPendingCellJournal])
}
