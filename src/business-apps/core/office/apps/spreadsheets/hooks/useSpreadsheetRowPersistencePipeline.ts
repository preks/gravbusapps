import { useCallback, type MutableRefObject } from 'react'

import { type SpreadsheetMutationFacade } from '../core'
import { coalesceQueuedCellChanges, reconcileQueuedDraftCellsForCreatedRows } from '../utils/spreadsheetPendingCells'
import {
  buildRowIdentityDiagnostics,
  resolveBackendRowIdForViewerRow,
  toRowIdString
} from '../utils/spreadsheetRowIdentity'
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
  onRowIdentityDiagnostics?: (stage: string, payload: Record<string, unknown>) => void
}

export interface UseSpreadsheetRowPersistencePipelineResult {
  persistAddedRowsWithBatch: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (result: {
      createdRows: Array<Record<string, unknown>>
      persistedIdByClientRowId: Map<string, string>
    }) => void
  ) => Promise<void>
  persistSingleAddedRow: (
    targetSheetId: string,
    rowPayloads: Record<string, unknown>[],
    updateLocalRowsAfterCreate: (result: {
      createdRows: Array<Record<string, unknown>>
      persistedIdByClientRowId: Map<string, string>
    }) => void
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
    onFlushDeferredCellEmits,
    onRowIdentityDiagnostics
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
      updateLocalRowsAfterCreate: (result: {
        createdRows: Array<Record<string, unknown>>
        persistedIdByClientRowId: Map<string, string>
      }) => void
    ) => {
      const result = await mutationFacade.appendRows(targetSheetId, rowPayloads)
      const opResult = result.operationResults.find(r => r.type === 'add_rows')
      const returnedRows = Array.isArray(opResult?.result?.rows)
        ? (opResult?.result?.rows as Array<Record<string, unknown>>)
        : []
      const rowMappings = [
        ...(Array.isArray(result.rowMappings)
          ? (result.rowMappings as Array<{ clientRowId?: string; rowUuid?: string }>)
          : []),
        ...(Array.isArray(opResult?.result?.rowMappings)
          ? (opResult.result.rowMappings as Array<{ clientRowId?: string; rowUuid?: string }>)
          : [])
      ]
      const { createdRows, flushCells, persistedIdByClientRowId } = buildCreatedRowsFromBatch(
        rowPayloads,
        returnedRows,
        pendingClientRowUpdatesRef.current,
        { rowMappings }
      )
      const affectedUiRowIds = rowPayloads.map(rowPayload => toRowIdString(rowPayload._clientRowId)).filter(Boolean)
      onRowIdentityDiagnostics?.('row_materialization_response_received', {
        targetSheetId,
        returnedRowCount: returnedRows.length,
        rowIdentities: buildRowIdentityDiagnostics({
          uiRowIds: affectedUiRowIds,
          rows: createdRows,
          isUuid,
          identityOverrides: new Map(
            Array.from(persistedIdByClientRowId.entries()).map(([uiRowId, backendRowUuid]) => [
              uiRowId,
              { backendRowUuid, identitySource: 'create_row_response' as const }
            ])
          )
        })
      })
      updateLocalRowsAfterCreate({
        createdRows,
        persistedIdByClientRowId
      })
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
      isUuid,
      mutationFacade,
      onFlushDeferredCellEmits,
      onRowIdentityDiagnostics,
      pendingCellChangesRef,
      pendingClientRowUpdatesRef,
      persistPendingCellJournal
    ]
  )

  const persistSingleAddedRow = useCallback(
    async (
      targetSheetId: string,
      rowPayloads: Record<string, unknown>[],
      updateLocalRowsAfterCreate: (result: {
        createdRows: Array<Record<string, unknown>>
        persistedIdByClientRowId: Map<string, string>
      }) => void
    ) => {
      const singlePayload = rowPayloads[0]
      const singleClientRowId = String(singlePayload._clientRowId || '')
      const saved = await mutationFacade.createRow(targetSheetId, singlePayload)
      const persistedId = resolveBackendRowIdForViewerRow(saved as Record<string, unknown>, isUuid) || ''
      onRowIdentityDiagnostics?.('row_materialization_response_received', {
        targetSheetId,
        returnedRowCount: saved ? 1 : 0,
        rowIdentities: buildRowIdentityDiagnostics({
          uiRowIds: singleClientRowId ? [singleClientRowId] : [],
          rows: saved ? [saved] : [],
          isUuid,
          identityOverrides:
            singleClientRowId && persistedId
              ? new Map([
                  [singleClientRowId, { backendRowUuid: persistedId, identitySource: 'create_row_response' as const }]
                ])
              : undefined
        })
      })
      const pending = singleClientRowId ? pendingClientRowUpdatesRef.current.get(singleClientRowId) : undefined
      if (singleClientRowId && pending) {
        pendingClientRowUpdatesRef.current.delete(singleClientRowId)
      }
      const mergedPayload = pending ? { ...singlePayload, ...pending } : singlePayload
      const createdRows: Record<string, unknown>[] = [{ ...mergedPayload, ...(saved || {}) }]
      updateLocalRowsAfterCreate({
        createdRows,
        persistedIdByClientRowId:
          singleClientRowId && persistedId ? new Map([[singleClientRowId, persistedId]]) : new Map<string, string>()
      })
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
