import { useCallback, useRef, type MutableRefObject } from 'react'

import { SpreadsheetApiRequestError } from '../services/SpreadsheetApiService'
import { didAuthoritativeCellPersistenceSettle } from '../utils/spreadsheetPersistenceSemantics'
import { isSheetCreationAwaitingPersistedId, resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'

import type {
  SpreadsheetPendingCellBatch as PendingCellBatch,
  SpreadsheetPendingCellChange as CellChange,
  SpreadsheetMutationFacade
} from '../core'

interface SpreadsheetPersistenceIndicator {
  beginPersist: () => void
  endPersist: () => void
  recordSuccess: (isSettled: boolean) => void
  recordError: (message: string) => void
}

export interface UseSpreadsheetPendingCellPersistenceParams {
  entityEnabled: boolean
  defaultPersistDebounceMs: number
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
  updateActiveSheetVersion: (version: number, mode: 'set' | 'max') => void
  hasPendingCellPersistence: () => boolean
  buildPendingCellBatches: (cells: CellChange[]) => PendingCellBatch[]
  persistPendingCellJournal: () => void
  recoverFromVersionConflict: () => Promise<boolean>
  submitMutationBatch: SpreadsheetMutationFacade['submitBatch']
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
    pendingCellPersistTimeoutRef,
    pendingCellChangesRef,
    pendingCellBatchesRef,
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    pendingCreatedSheetSelectionRef,
    cellFlushSequenceRef,
    updateActiveSheetVersion,
    hasPendingCellPersistence,
    buildPendingCellBatches,
    persistPendingCellJournal,
    recoverFromVersionConflict,
    submitMutationBatch,
    sheetPersist,
    onPersistErrorMessage,
    markVersionAsSaved
  } = params

  const flushPendingCellChanges = useCallback(async () => {
    if (entityEnabled) return
    if (!hasPendingCellPersistence()) return

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
    if (pendingCellChangesRef.current.some(c => sheetBlocked(c.sheetId))) return
    if (pendingCellBatchesRef.current.some(b => sheetBlocked(b.targetSheetId))) return

    cellFlushSequenceRef.current += 1

    sheetPersist.beginPersist()
    try {
      let didPersistAnyBatch = false
      while (true) {
        if (pendingCellBatchesRef.current.length === 0) {
          const draftCells = pendingCellChangesRef.current
          if (draftCells.length === 0) break
          pendingCellChangesRef.current = []
          pendingCellBatchesRef.current = buildPendingCellBatches(draftCells)
          persistPendingCellJournal()
          if (pendingCellBatchesRef.current.length === 0) break
        }

        const [nextBatch, ...remainingBatches] = pendingCellBatchesRef.current
        if (!nextBatch) break
        const response = await submitMutationBatch({
          sheetId: nextBatch.targetSheetId,
          operations: nextBatch.operations,
          batchIdPrefix: 'persisted_cell_batch',
          batchIdOverride: nextBatch.batchId,
          traceMeta: {
            traceId: nextBatch.traceId,
            sourceTraceIds: nextBatch.sourceTraceIds,
            operationType: 'persisted_cell_batch'
          }
        })
        pendingCellBatchesRef.current = remainingBatches
        persistPendingCellJournal()
        didPersistAnyBatch = true
        if (
          resolveReconciledSheetId(nextBatch.targetSheetId, aliases) ===
          resolveReconciledSheetId(activeSheetIdRef.current, aliases)
        ) {
          updateActiveSheetVersion(Number(response.newVersion || 0), 'max')
        }
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
    submitMutationBatch,
    buildPendingCellBatches,
    entityEnabled,
    hasPendingCellPersistence,
    onPersistErrorMessage,
    persistPendingCellJournal,
    recoverFromVersionConflict,
    sheetPersist,
    updateActiveSheetVersion,
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

  const schedulePendingCellPersist = useCallback(
    (delayMs = defaultPersistDebounceMs) => {
      if (pendingCellPersistTimeoutRef.current) {
        clearTimeout(pendingCellPersistTimeoutRef.current)
      }
      pendingCellPersistTimeoutRef.current = setTimeout(() => {
        pendingCellPersistTimeoutRef.current = null
        void flushPendingCellChangesRef.current()
      }, delayMs)
    },
    [defaultPersistDebounceMs, pendingCellPersistTimeoutRef]
  )

  return {
    flushPendingCellChangesRef,
    schedulePendingCellPersist
  }
}
