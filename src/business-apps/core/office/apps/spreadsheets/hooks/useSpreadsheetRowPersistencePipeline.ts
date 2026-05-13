import { useCallback, type MutableRefObject } from 'react'

import { type SpreadsheetMutationFacade } from '../core'
import { coalesceQueuedCellChanges, reconcileQueuedDraftCellsForCreatedRows } from '../utils/spreadsheetPendingCells'
import { resolveBackendRowIdForViewerRow } from '../utils/spreadsheetRowIdentity'
import { normalizeCellValueForBatchPersistence } from '../core'

type ViewerRow = Record<string, unknown>

interface CreatedRowsFromBatchResult {
  createdRows: Array<Record<string, unknown>>
  flushCells: Array<{ rowId: string; columnName: string; value: unknown }>
  persistedIdByClientRowId: Map<string, string>
}

export interface UseSpreadsheetRowPersistencePipelineParams {
  activeSheetId: string
  mutationFacade: SpreadsheetMutationFacade
  updateActiveSheetVersion: (version: number, mode?: 'set' | 'max') => void
  isUuid: (value: string) => boolean
  pendingClientRowUpdatesRef: MutableRefObject<Map<string, Record<string, unknown>>>
  pendingCellChangesRef: MutableRefObject<
    Array<{
      rowId: string
      columnName: string
      value: unknown
      univerRow?: number
      univerCol?: number
      sheetId?: string
      traceId?: string
    }>
  >
  persistPendingCellJournal: () => void
  buildCreatedRowsFromBatch: (
    rowPayloads: Record<string, unknown>[],
    returnedRows: Array<Record<string, unknown>>,
    pendingClientRowUpdates: Map<string, Record<string, unknown>>
  ) => CreatedRowsFromBatchResult
  onFlushDeferredCellEmits: () => void
}

export interface UseSpreadsheetRowPersistencePipelineResult {
  persistAddedRowsWithBatch: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
  ) => Promise<void>
  persistSingleAddedRow: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
  ) => Promise<void>
}

export function useSpreadsheetRowPersistencePipeline(
  params: UseSpreadsheetRowPersistencePipelineParams
): UseSpreadsheetRowPersistencePipelineResult {
  const {
    activeSheetId,
    mutationFacade,
    updateActiveSheetVersion,
    isUuid,
    pendingClientRowUpdatesRef,
    pendingCellChangesRef,
    persistPendingCellJournal,
    buildCreatedRowsFromBatch,
    onFlushDeferredCellEmits
  } = params

  const flushPendingCellsForPersistedRow = useCallback(
    async (targetSheetId: string, persistedId: string, pending: Record<string, unknown>) => {
      const cells = Object.entries(pending).map(([columnName, value]) => ({
        rowId: persistedId,
        columnName,
        value: normalizeCellValueForBatchPersistence(value)
      }))
      const response = await mutationFacade.setRange(targetSheetId, cells)
      if (targetSheetId === activeSheetId) {
        updateActiveSheetVersion(Number(response.newVersion || 0))
      }
    },
    [activeSheetId, mutationFacade, updateActiveSheetVersion]
  )

  const persistAddedRowsWithBatch = useCallback(
    async (
      targetSheetId: string,
      rowPayloads: Record<string, unknown>[],
      updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
    ) => {
      const result = await mutationFacade.appendRows(targetSheetId, rowPayloads)
      const opResult = result.operationResults.find(r => r.type === 'add_rows')
      const returnedRows = Array.isArray(opResult?.result?.rows)
        ? (opResult?.result?.rows as Array<Record<string, unknown>>)
        : []
      const { createdRows, flushCells, persistedIdByClientRowId } = buildCreatedRowsFromBatch(
        rowPayloads,
        returnedRows,
        pendingClientRowUpdatesRef.current
      )
      updateLocalRowsAfterCreate(createdRows)
      pendingCellChangesRef.current = coalesceQueuedCellChanges(
        reconcileQueuedDraftCellsForCreatedRows(
          pendingCellChangesRef.current,
          createdRows as ViewerRow[],
          persistedIdByClientRowId
        )
      )
      persistPendingCellJournal()
      onFlushDeferredCellEmits()

      if (flushCells.length === 0) return

      await mutationFacade.setRange(
        targetSheetId,
        flushCells.map(cell => ({
          ...cell,
          value: normalizeCellValueForBatchPersistence(cell.value)
        }))
      )
    },
    [
      buildCreatedRowsFromBatch,
      mutationFacade,
      onFlushDeferredCellEmits,
      pendingCellChangesRef,
      pendingClientRowUpdatesRef,
      persistPendingCellJournal
    ]
  )

  const persistSingleAddedRow = useCallback(
    async (
      targetSheetId: string,
      rowPayloads: Record<string, unknown>[],
      updateLocalRowsAfterCreate: (createdRows: Array<Record<string, unknown>>) => void
    ) => {
      const singlePayload = rowPayloads[0]
      const singleClientRowId = String(singlePayload._clientRowId || '')
      const saved = await mutationFacade.createRow(targetSheetId, singlePayload)
      const persistedId = resolveBackendRowIdForViewerRow(saved as Record<string, unknown>, isUuid) || ''
      const pending = singleClientRowId ? pendingClientRowUpdatesRef.current.get(singleClientRowId) : undefined
      if (singleClientRowId && pending) {
        pendingClientRowUpdatesRef.current.delete(singleClientRowId)
      }
      const mergedPayload = pending ? { ...singlePayload, ...pending } : singlePayload
      const createdRows: Record<string, unknown>[] = [{ ...mergedPayload, ...(saved || {}) }]
      updateLocalRowsAfterCreate(createdRows)
      if (singleClientRowId && persistedId) {
        onFlushDeferredCellEmits()
      }

      if (pending && persistedId) {
        await flushPendingCellsForPersistedRow(targetSheetId, persistedId, pending)
      }

      const savedVersion =
        typeof saved.sheetVersion === 'number'
          ? saved.sheetVersion
          : typeof saved.sheetVersion === 'string'
            ? Number(saved.sheetVersion)
            : Number.NaN
      if (targetSheetId === activeSheetId && Number.isFinite(savedVersion)) {
        updateActiveSheetVersion(savedVersion)
      }
    },
    [
      activeSheetId,
      flushPendingCellsForPersistedRow,
      isUuid,
      mutationFacade,
      onFlushDeferredCellEmits,
      pendingClientRowUpdatesRef,
      updateActiveSheetVersion
    ]
  )

  return { persistAddedRowsWithBatch, persistSingleAddedRow }
}
