import { useMemo, type MutableRefObject } from 'react'

import { SpreadsheetApiRequestError } from '../services/SpreadsheetApiService'
import { areCanonicalSheetIdsEqual, resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { createIdentityRowProjectionModel } from '../utils/spreadsheetRowProjection'
import { applyMoveCellRangeTransform } from '../utils/applyMoveCellRangeTransform'
import {
  applyDeleteRowSlotsTransform,
  applyInsertRowSlotsTransform,
  applyMoveRowSlotsTransform,
  resolveLocalRowsInSlotRange
} from '../utils/spreadsheetRowSlotTransforms'

type ViewerRow = Record<string, unknown>

interface StructuralMutationParams {
  activeSheetIdRef: MutableRefObject<string>
  createdSheetIdAliasesRef: MutableRefObject<Map<string, string>>
  operationQueueRef: MutableRefObject<Promise<void>>
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  mutationFacade: {
    insertRowSlots: (
      sheetId: string,
      startGridRowIndex: number,
      count: number,
      materializedRows?: ViewerRow[]
    ) => Promise<{ newVersion: number; operationResults: Array<{ type: string; result: Record<string, unknown> }> }>
    deleteRowSlots: (sheetId: string, startGridRowIndex: number, count: number) => Promise<{ newVersion: number }>
    moveRowSlots: (
      sheetId: string,
      sourceStartGridRowIndex: number,
      count: number,
      destinationGridRowIndex: number
    ) => Promise<{ newVersion: number }>
    moveCellRange: (
      sheetId: string,
      fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
      toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    ) => Promise<{ newVersion: number }>
  }
  rowSlotIdentityRegistry: {
    markUnhealthy: (sheetId: string, reason: string) => void
    markHealthy: (sheetId: string) => void
    bindBackendRowId: (sheetId: string, clientRowId: string, backendRowId: string) => void
    syncRows: (sheetId: string, rows: ViewerRow[], isUuid: (value: string) => boolean) => void
  }
  rowMaterializationReadiness: {
    registerPending: (sheetId: string, clientRowId: string, promise: Promise<string>) => void
    resolveMany: (sheetId: string, mapping: Map<string, string>) => void
    reject: (sheetId: string, clientRowId: string, error: unknown) => void
  }
  activeSheetColumns: any[]
  spreadsheetColumnsForGrid: any[]
  spreadsheetGridRef: MutableRefObject<{
    syncGridConversionContext?: (columns?: unknown, rows?: ViewerRow[]) => void
  } | null>
  getActiveSessionRows: () => ViewerRow[]
  getKnownRowsForSheet: (sheetId: string) => ViewerRow[]
  commitLocalSheetData: (
    rows: ViewerRow[],
    options: { persisted: boolean; syncGrid: boolean; publishParent?: boolean }
  ) => void
  syncSheetRowsIntoLocalState: (
    sheetId: string,
    rows: ViewerRow[],
    options: { persisted: boolean; syncGrid: boolean; version?: number }
  ) => void
  pendingUniverRowsBySheetRef: MutableRefObject<Map<string, unknown>>
  latestUniverDataRef: MutableRefObject<{ data: ViewerRow[]; sheetId: string } | null>
  lastProcessedLengthRef: MutableRefObject<number>
  buildAddRowPayloadsFromUniverRows: (rows: ViewerRow[], columns: any[]) => ViewerRow[]
  buildPersistedRowIdMapFromBatchRows: (rows: unknown) => Map<string, string>
  mapPersistedRowsToViewerRows: (rows: unknown) => ViewerRow[]
  createNativeSpreadsheetClientRowId: () => string
  logRowIdentityDiagnostics: (eventName: string, payload: Record<string, unknown>) => void
  buildRowIdentityDiagnostics: (payload: Record<string, unknown>) => unknown
  isUuid: (value: unknown) => boolean
  isUuidString: (value: string) => boolean
  recoverFromVersionConflictRef: MutableRefObject<() => Promise<boolean>>
  sheetPersist: {
    beginPersist: () => void
    markDirty: () => void
    recordSuccess: (persisted: boolean) => void
    recordError: (message: string) => void
    endPersist: () => void
  }
  versioning: {
    markAsChanged: () => void
    markAsSaved: () => void
  }
  sheetPersistErrorMessage: string
  handleColumnsInsertInternal: (
    insertIndex: number,
    count: number,
    direction: 'lefttop' | 'rightbottom'
  ) => any[] | null | undefined
  handleColumnsDeleteInternal: (
    startIndex: number,
    endIndex: number
  ) => { columns: any[]; data: ViewerRow[] } | null | undefined
  handleColumnsMoveInternal: (
    sourceStartIndex: number,
    count: number,
    destinationIndex: number
  ) => any[] | null | undefined
  scheduleStructuralSnapshotReload?: (targetSheetId: string) => void
}

export function useSpreadsheetGridStructuralMutations(params: StructuralMutationParams) {
  return useMemo(() => {
    const finalizeStructuralSuccess = (
      targetSheetId: string,
      response: { newVersion: number },
      fallbackRows: ViewerRow[],
      options?: { syncGrid?: boolean }
    ) => {
      const authoritativeRows = params.getKnownRowsForSheet(targetSheetId)
      const nextRows = authoritativeRows.length > 0 ? authoritativeRows : fallbackRows
      params.syncSheetRowsIntoLocalState(targetSheetId, nextRows, {
        persisted: true,
        syncGrid: options?.syncGrid ?? true,
        version: response.newVersion
      })
      params.pendingUniverRowsBySheetRef.current.delete(targetSheetId)
      params.latestUniverDataRef.current = {
        data: nextRows,
        sheetId: targetSheetId
      }
      if (
        areCanonicalSheetIdsEqual(
          targetSheetId,
          params.activeSheetIdRef.current,
          params.createdSheetIdAliasesRef.current
        )
      ) {
        params.lastProcessedLengthRef.current = nextRows.length
      }
      params.rowSlotIdentityRegistry.markHealthy(targetSheetId)
      params.rowSlotIdentityRegistry.syncRows(targetSheetId, nextRows, params.isUuidString)
      params.sheetPersist.recordSuccess(true)
      params.versioning.markAsSaved()
    }

    const handleStructuralFailure = async (
      targetSheetId: string,
      rollbackRows: ViewerRow[],
      error: unknown,
      pendingClientRowIds?: Iterable<string>
    ) => {
      for (const clientRowId of pendingClientRowIds ?? []) {
        params.rowMaterializationReadiness.reject(targetSheetId, clientRowId, error)
      }
      params.commitLocalSheetData(rollbackRows, {
        persisted: false,
        syncGrid: false,
        publishParent: true
      })
      params.rowSlotIdentityRegistry.markHealthy(targetSheetId)
      params.spreadsheetGridRef.current?.syncGridConversionContext?.(params.spreadsheetColumnsForGrid, rollbackRows)
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        await params.recoverFromVersionConflictRef.current()
      }
      params.sheetPersist.recordError(params.sheetPersistErrorMessage)
    }

    const onColumnsInsert = (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => {
      const nextColumns = params.handleColumnsInsertInternal(insertIndex, count, direction)
      if (nextColumns) {
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(nextColumns)
      }
    }

    const onColumnsDelete = (startIndex: number, endIndex: number) => {
      const syncPayload = params.handleColumnsDeleteInternal(startIndex, endIndex)
      if (syncPayload) {
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(syncPayload.columns, syncPayload.data)
      }
    }

    const onColumnsMove = (sourceStartIndex: number, count: number, destinationIndex: number) => {
      const nextColumns = params.handleColumnsMoveInternal(sourceStartIndex, count, destinationIndex)
      if (nextColumns) {
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(nextColumns)
      }
    }

    const onRowsInsert = (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => {
      if (count <= 0) {
        return
      }
      const targetSheetId = resolveReconciledSheetId(
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      params.rowSlotIdentityRegistry.markUnhealthy(targetSheetId, 'row_slot_insert_pending')
      const previousRows = params.getActiveSessionRows()
      const projection = createIdentityRowProjectionModel(previousRows)
      const startGridRowIndex = projection.resolveVisibleRowIndex(
        direction === 'rightbottom' ? insertIndex + 1 : insertIndex
      ).virtualSlot
      const placeholders = Array.from({ length: count }, (_, offset) => ({
        _id: params.createNativeSpreadsheetClientRowId(),
        _clientRowId: '',
        _gridRowIndex: startGridRowIndex + offset
      })).map(row => ({ ...row, _clientRowId: String(row._id) }))
      const placeholderClientIds = new Set(placeholders.map(row => String(row._id ?? '')).filter(Boolean))
      const optimisticRows = applyInsertRowSlotsTransform(previousRows, startGridRowIndex, count, placeholders)
      const insertedRows = resolveLocalRowsInSlotRange(optimisticRows, startGridRowIndex, count)
      const rowPayloads = params.buildAddRowPayloadsFromUniverRows(insertedRows, params.activeSheetColumns)

      params.logRowIdentityDiagnostics('viewer_row_slot_insert_optimistic_rows', {
        targetSheetId,
        startGridRowIndex,
        count,
        placeholderClientRowIds: Array.from(placeholderClientIds),
        rowIdentities: params.buildRowIdentityDiagnostics({
          uiRowIds: Array.from(placeholderClientIds),
          rows: optimisticRows,
          isUuid: params.isUuid
        })
      })

      params.commitLocalSheetData(optimisticRows, {
        persisted: false,
        syncGrid: false,
        publishParent: true
      })
      params.spreadsheetGridRef.current?.syncGridConversionContext?.(params.spreadsheetColumnsForGrid, optimisticRows)

      void params.chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        params.sheetPersist.markDirty()
        params.versioning.markAsChanged()
        const readinessPendingResolvers = new Map<
          string,
          { resolve: (backendRowId: string) => void; reject: (error: unknown) => void }
        >()
        placeholderClientIds.forEach(clientRowId => {
          const promise = new Promise<string>((resolvePromise, rejectPromise) => {
            readinessPendingResolvers.set(clientRowId, {
              resolve: resolvePromise,
              reject: rejectPromise
            })
          })
          params.rowMaterializationReadiness.registerPending(targetSheetId, clientRowId, promise)
        })
        try {
          const response = await params.mutationFacade.insertRowSlots(
            targetSheetId,
            startGridRowIndex,
            count,
            rowPayloads
          )
          const insertResult = response.operationResults.find(result => result.type === 'insert_row_slots')
          const persistedIdByClientRowId = params.buildPersistedRowIdMapFromBatchRows(insertResult?.result?.rows)
          params.rowMaterializationReadiness.resolveMany(targetSheetId, persistedIdByClientRowId)
          persistedIdByClientRowId.forEach((backendRowId, clientRowId) => {
            params.rowSlotIdentityRegistry.bindBackendRowId(targetSheetId, clientRowId, backendRowId)
          })
          persistedIdByClientRowId.forEach((backendRowId, clientRowId) => {
            const resolver = readinessPendingResolvers.get(clientRowId)
            if (!resolver) return
            resolver.resolve(backendRowId)
            readinessPendingResolvers.delete(clientRowId)
          })
          const latestRows = params.getKnownRowsForSheet(targetSheetId)
          const authoritativeRows = applyInsertRowSlotsTransform(
            latestRows,
            startGridRowIndex,
            count,
            params.mapPersistedRowsToViewerRows(insertResult?.result?.rows)
          )
          finalizeStructuralSuccess(targetSheetId, response, authoritativeRows)
          params.scheduleStructuralSnapshotReload?.(targetSheetId)
        } catch (error) {
          placeholderClientIds.forEach(clientRowId => {
            const resolver = readinessPendingResolvers.get(clientRowId)
            if (!resolver) return
            resolver.reject(error)
            readinessPendingResolvers.delete(clientRowId)
          })
          await handleStructuralFailure(targetSheetId, previousRows, error, placeholderClientIds)
        } finally {
          params.sheetPersist.endPersist()
        }
      })
    }

    const onRowsDelete = (startIndex: number, count: number) => {
      if (count <= 0) {
        return
      }
      const targetSheetId = resolveReconciledSheetId(
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      params.rowSlotIdentityRegistry.markUnhealthy(targetSheetId, 'row_slot_delete_pending')
      const previousRows = params.getActiveSessionRows()
      const projection = createIdentityRowProjectionModel(previousRows)
      const startGridRowIndex = projection.resolveVisibleRowIndex(startIndex).virtualSlot
      const optimisticRows = applyDeleteRowSlotsTransform(previousRows, startGridRowIndex, count)

      params.commitLocalSheetData(optimisticRows, {
        persisted: false,
        syncGrid: false,
        publishParent: true
      })
      params.spreadsheetGridRef.current?.syncGridConversionContext?.(params.spreadsheetColumnsForGrid, optimisticRows)

      void params.chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        params.sheetPersist.markDirty()
        params.versioning.markAsChanged()
        try {
          const response = await params.mutationFacade.deleteRowSlots(targetSheetId, startGridRowIndex, count)
          finalizeStructuralSuccess(targetSheetId, response, optimisticRows)
        } catch (error) {
          await handleStructuralFailure(targetSheetId, previousRows, error)
        } finally {
          params.sheetPersist.endPersist()
        }
      })
    }

    const onRowsMove = (sourceStartIndex: number, count: number, destinationIndex: number) => {
      if (count <= 0) {
        return
      }
      const targetSheetId = resolveReconciledSheetId(
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      params.rowSlotIdentityRegistry.markUnhealthy(targetSheetId, 'row_slot_move_pending')
      const previousRows = params.getActiveSessionRows()
      const projection = createIdentityRowProjectionModel(previousRows)
      const sourceStartGridRowIndex = projection.resolveVisibleRowIndex(sourceStartIndex).virtualSlot
      const destinationGridRowIndex = projection.resolveVisibleRowIndex(destinationIndex).virtualSlot
      const optimisticRows = applyMoveRowSlotsTransform(
        previousRows,
        sourceStartGridRowIndex,
        count,
        destinationGridRowIndex
      )

      params.commitLocalSheetData(optimisticRows, {
        persisted: false,
        syncGrid: false,
        publishParent: true
      })
      params.spreadsheetGridRef.current?.syncGridConversionContext?.(params.spreadsheetColumnsForGrid, optimisticRows)

      void params.chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        params.sheetPersist.markDirty()
        params.versioning.markAsChanged()
        try {
          const response = await params.mutationFacade.moveRowSlots(
            targetSheetId,
            sourceStartGridRowIndex,
            count,
            destinationGridRowIndex
          )
          finalizeStructuralSuccess(targetSheetId, response, optimisticRows)
          params.scheduleStructuralSnapshotReload?.(targetSheetId)
        } catch (error) {
          await handleStructuralFailure(targetSheetId, previousRows, error)
        } finally {
          params.sheetPersist.endPersist()
        }
      })
    }

    const onCellRangeMove = (
      fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
      toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    ) => {
      if (
        fromRange.endRow - fromRange.startRow !== toRange.endRow - toRange.startRow ||
        fromRange.endColumn - fromRange.startColumn !== toRange.endColumn - toRange.startColumn
      ) {
        return
      }
      const targetSheetId = resolveReconciledSheetId(
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      const previousRows = params.getActiveSessionRows()
      const columnNamesByGridIndex = params.activeSheetColumns.map(column =>
        typeof column?.name === 'string' ? column.name : null
      )
      const optimisticRows = applyMoveCellRangeTransform({
        rows: previousRows,
        columnNamesByGridIndex,
        fromRange,
        toRange
      })

      // Keep relational row.data in sync for table/kanban views. Univer already applied the
      // grid move locally — do not push rows back into the workbook (syncGrid) or reload the
      // full canonical snapshot (same rationale as column batch ops in SpreadsheetAppViewer).
      if (optimisticRows !== previousRows) {
        params.commitLocalSheetData(optimisticRows, {
          persisted: false,
          syncGrid: false,
          publishParent: true
        })
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(params.spreadsheetColumnsForGrid, optimisticRows)
      }

      void params.chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        params.sheetPersist.markDirty()
        params.versioning.markAsChanged()
        try {
          const response = await params.mutationFacade.moveCellRange(targetSheetId, fromRange, toRange)
          finalizeStructuralSuccess(targetSheetId, response, optimisticRows, { syncGrid: false })
        } catch (error) {
          await handleStructuralFailure(targetSheetId, previousRows, error)
        } finally {
          params.sheetPersist.endPersist()
        }
      })
    }

    return {
      onColumnsInsert,
      onColumnsDelete,
      onColumnsMove,
      onRowsInsert,
      onRowsDelete,
      onRowsMove,
      onCellRangeMove
    }
  }, [params])
}
