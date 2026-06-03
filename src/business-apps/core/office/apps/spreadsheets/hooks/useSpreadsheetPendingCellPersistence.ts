import { useCallback, useRef, type MutableRefObject } from 'react'

import { SpreadsheetApiRequestError } from '../services/SpreadsheetApiService'
import { didAuthoritativeCellPersistenceSettle } from '../utils/spreadsheetPersistenceSemantics'
import { isSheetCreationAwaitingPersistedId } from '../utils/reconcileTemporarySheetId'

import type {
  SpreadsheetPendingCellBatch as PendingCellBatch,
  SpreadsheetPendingCellChange as CellChange
} from '../core'
import type { SheetWorkQueueApi } from '../core/spreadsheetSheetWorkQueue'
import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'

interface SpreadsheetPersistenceIndicator {
  beginPersist: () => void
  endPersist: () => void
  recordSuccess: (isSettled: boolean) => void
  recordError: (message: string) => void
}

export interface UseSpreadsheetPendingCellPersistenceParams {
  entityEnabled: boolean
  defaultPersistDebounceMs: number
  maxPersistDebounceMs?: number
  pendingCellPersistTimeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  pendingCellChangesRef: MutableRefObject<CellChange[]>
  pendingCellBatchesRef: MutableRefObject<PendingCellBatch[]>
  activeSheetIdRef: MutableRefObject<string>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  pendingCreatedSheetSelectionRef: MutableRefObject<{
    temporarySheetId: string
    persistedSheetId: string | null
  } | null>
  cellFlushSequenceRef: MutableRefObject<number>
  hasPendingCellPersistence: () => boolean
  buildPendingCellBatches: (cells: CellChange[]) => PendingCellBatch[]
  persistPendingCellJournal: () => void
  recoverFromVersionConflict: () => Promise<boolean>
  /**
   * Per-sheet local intent coordinator. Pending cell batches are always routed
   * through `enqueueLocalPersist` (kind `cellValue`).
   */
  sheetWorkQueue: SheetWorkQueueApi
  sheetPersist: SpreadsheetPersistenceIndicator
  onPersistErrorMessage: string
  markVersionAsSaved: () => void
}

export interface UseSpreadsheetPendingCellPersistenceResult {
  flushPendingCellChangesRef: MutableRefObject<() => Promise<void>>
  schedulePendingCellPersist: (delayMs?: number) => void
}

export function useSpreadsheetPendingCellPersistence(
  params: UseSpreadsheetPendingCellPersistenceParams
): UseSpreadsheetPendingCellPersistenceResult {
  const {
    entityEnabled,
    defaultPersistDebounceMs,
    maxPersistDebounceMs = 15000,
    pendingCellPersistTimeoutRef,
    pendingCellChangesRef,
    pendingCellBatchesRef,
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    pendingCreatedSheetSelectionRef,
    cellFlushSequenceRef,
    hasPendingCellPersistence,
    buildPendingCellBatches,
    persistPendingCellJournal,
    recoverFromVersionConflict,
    sheetWorkQueue,
    sheetPersist,
    onPersistErrorMessage,
    markVersionAsSaved
  } = params

  /**
   * Extract `(rowId, columnName)` tuples from a batch's operations so the
   * coordinator can track cell ownership while the submit is in flight.
   * Operations without a single-cell shape (e.g. anonymous `set_range`
   * forms) are skipped — they will fall back to the legacy "all owned →
   * submitted" path inside the queue when the response lacks per-op
   * results for those keys.
   */
  const collectOwnedCellKeysForBatchOps = (operations: SpreadsheetBatchOperation[]): string[] => {
    const seen = new Set<string>()
    for (const op of operations) {
      const data = (op as { data?: Record<string, unknown> }).data
      if (!data || typeof data !== 'object') continue
      const rowId = (data as { rowId?: unknown }).rowId
      const columnName = (data as { columnName?: unknown }).columnName
      if (typeof rowId !== 'string' || typeof columnName !== 'string') continue
      seen.add(`${rowId}\u0000${columnName}`)
    }
    return Array.from(seen)
  }

  const flushPendingCellChanges = useCallback(async () => {
    if (entityEnabled) {
      return
    }
    if (!hasPendingCellPersistence()) {
      return
    }

    const aliases = createdSheetIdAliasesRef.current
    const pendingSel = pendingCreatedSheetSelectionRef.current
    const sheetBlocked = (sheetId: string | undefined) =>
      Boolean(
        sheetId &&
          isSheetCreationAwaitingPersistedId({
            pendingCreatedSheetSelection: pendingSel,
            effectiveSheetId: sheetId,
            aliases
          })
      )
    if (pendingCellChangesRef.current.some(c => sheetBlocked(c.sheetId))) {
      return
    }
    if (pendingCellBatchesRef.current.some(b => sheetBlocked(b.targetSheetId))) {
      return
    }

    cellFlushSequenceRef.current += 1

    sheetPersist.beginPersist()
    try {
      let didPersistAnyBatch = false
      while (true) {
        if (pendingCellBatchesRef.current.length === 0) {
          const draftCells = pendingCellChangesRef.current
          if (draftCells.length === 0) {
            break
          }
          pendingCellChangesRef.current = []
          pendingCellBatchesRef.current = buildPendingCellBatches(draftCells)
          persistPendingCellJournal()
          if (pendingCellBatchesRef.current.length === 0) {
            break
          }
        }

        const [nextBatch, ...remainingBatches] = pendingCellBatchesRef.current
        if (!nextBatch) break
        await sheetWorkQueue.enqueueLocalPersist(nextBatch.targetSheetId, {
          sheetId: nextBatch.targetSheetId,
          kind: 'cellValue',
          operations: nextBatch.operations,
          enqueuedAt: Date.now(),
          ownedCellKeys: collectOwnedCellKeysForBatchOps(nextBatch.operations),
          batchIdPrefix: 'persisted_cell_batch',
          traceMeta: {
            traceId: nextBatch.traceId,
            sourceTraceIds: nextBatch.sourceTraceIds,
            operationType: 'persisted_cell_batch'
          }
        })
        pendingCellBatchesRef.current = remainingBatches
        persistPendingCellJournal()
        didPersistAnyBatch = true
      }

      if (!didPersistAnyBatch) return
      const authoritativeCellPersistenceSettled = didAuthoritativeCellPersistenceSettle({
        hasPendingCellPersistence: hasPendingCellPersistence(),
        hasPendingCellPersistTimer: pendingCellPersistTimeoutRef.current != null
      })
      sheetPersist.recordSuccess(authoritativeCellPersistenceSettled)
      if (authoritativeCellPersistenceSettled) {
        markVersionAsSaved()
      }
    } catch (error) {
      persistPendingCellJournal()
      console.error('[SpreadsheetAppViewer] Failed to persist cell changes:', error)
      sheetPersist.recordError(onPersistErrorMessage)
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        const recovered = await recoverFromVersionConflict()
        if (recovered && hasPendingCellPersistence()) {
          void flushPendingCellChangesRef.current()
        }
      }
    } finally {
      sheetPersist.endPersist()
    }
  }, [
    sheetWorkQueue,
    buildPendingCellBatches,
    entityEnabled,
    hasPendingCellPersistence,
    onPersistErrorMessage,
    persistPendingCellJournal,
    recoverFromVersionConflict,
    sheetPersist,
    markVersionAsSaved,
    pendingCellPersistTimeoutRef,
    activeSheetIdRef,
    pendingCellBatchesRef,
    pendingCellChangesRef,
    cellFlushSequenceRef,
    createdSheetIdAliasesRef,
    pendingCreatedSheetSelectionRef
  ])

  const flushPendingCellChangesRef = useRef(flushPendingCellChanges)
  flushPendingCellChangesRef.current = flushPendingCellChanges
  const pendingCellPersistFirstScheduledAtRef = useRef<number | null>(null)

  const schedulePendingCellPersist = useCallback(
    (delayMs = defaultPersistDebounceMs) => {
      const now = Date.now()
      if (pendingCellPersistFirstScheduledAtRef.current == null) {
        pendingCellPersistFirstScheduledAtRef.current = now
      }
      const elapsed = now - pendingCellPersistFirstScheduledAtRef.current
      const maxRemaining = maxPersistDebounceMs - elapsed
      const effectiveDelay = maxRemaining <= 0 ? 0 : Math.min(delayMs, maxRemaining)

      if (pendingCellPersistTimeoutRef.current) {
        clearTimeout(pendingCellPersistTimeoutRef.current)
      }
      pendingCellPersistTimeoutRef.current = setTimeout(() => {
        pendingCellPersistTimeoutRef.current = null
        pendingCellPersistFirstScheduledAtRef.current = null
        void flushPendingCellChangesRef.current()
      }, effectiveDelay)
    },
    [defaultPersistDebounceMs, maxPersistDebounceMs, pendingCellPersistTimeoutRef]
  )

  return {
    flushPendingCellChangesRef,
    schedulePendingCellPersist
  }
}
