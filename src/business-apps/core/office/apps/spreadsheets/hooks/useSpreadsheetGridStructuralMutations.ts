import { useMemo, type MutableRefObject } from 'react'

import { SpreadsheetApiRequestError } from '../services/SpreadsheetApiService'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import { areCanonicalSheetIdsEqual, resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import { createIdentityRowProjectionModel } from '../utils/spreadsheetRowProjection'
import { promoteSpreadsheetRowIdentities } from '../utils/spreadsheetRowIdentityPromotion'
import { applyMoveCellRangeToViewerRows } from '../utils/spreadsheetMoveCellRangeGrid'
import { patchLatestUniverSnapshotRowBackendIdentities } from '../utils/spreadsheetUniverSnapshotIdentity'
import { applyCommittedGridRowPlacements } from '../utils/spreadsheetCommittedGridRowPlacements'
import { buildPersistedRowIdMapFromInsertRowSlotsResult } from '../utils/spreadsheetViewerRows'
import type { SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import type { SpreadsheetIntentJournal } from '../core/spreadsheetIntentJournal'
import type { SpreadsheetVersionCausalOwnershipRegistry } from '../core/spreadsheetVersionCausalOwnership'
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
    ) => Promise<SpreadsheetBatchOperationResponse>
    deleteRowSlots: (
      sheetId: string,
      startGridRowIndex: number,
      count: number
    ) => Promise<SpreadsheetBatchOperationResponse>
    moveRowSlots: (
      sheetId: string,
      sourceStartGridRowIndex: number,
      count: number,
      destinationGridRowIndex: number
    ) => Promise<SpreadsheetBatchOperationResponse>
    moveCellRange: (
      sheetId: string,
      fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
      toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    ) => Promise<SpreadsheetBatchOperationResponse>
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
  spreadsheetIntentJournalRef?: MutableRefObject<SpreadsheetIntentJournal | null>
  versionCausalOwnershipRef?: MutableRefObject<SpreadsheetVersionCausalOwnershipRegistry | null>
  pendingLocalMutationCellsRef?: MutableRefObject<Set<string>>
  flushPendingCellChangesRef?: MutableRefObject<() => Promise<void>>
  activeSheetColumns: any[]
  spreadsheetColumnsForGrid: any[]
  spreadsheetGridRef: MutableRefObject<{
    syncGridConversionContext?: (columns?: unknown, rows?: ViewerRow[]) => void
    shouldIgnoreStructuralRowCommand?: () => boolean
  } | null>
  getActiveSessionRows: () => ViewerRow[]
  getKnownRowsForSheet: (sheetId: string) => ViewerRow[]
  resolveSheetContext?: (sheetId: string) => { columns: any[]; data: ViewerRow[] } | null
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
  buildPersistedRowIdMapFromInsertRowSlotsResult: typeof buildPersistedRowIdMapFromInsertRowSlotsResult
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
  onDiagnosticsTraceEvent?: (event: SpreadsheetTraceEventInput) => void
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
      response: SpreadsheetBatchOperationResponse,
      fallbackRows: ViewerRow[],
      options?: { syncGrid?: boolean }
    ) => {
      const authoritativeRows = params.getKnownRowsForSheet(targetSheetId)
      const baseRows = authoritativeRows.length > 0 ? authoritativeRows : fallbackRows
      const nextRows = applyCommittedGridRowPlacements(baseRows, response.gridRowIndexByRowUuid)
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
      const isActiveTargetSheet = areCanonicalSheetIdsEqual(
        targetSheetId,
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      if (isActiveTargetSheet) {
        params.commitLocalSheetData(rollbackRows, {
          persisted: false,
          syncGrid: false,
          publishParent: true
        })
      } else {
        params.syncSheetRowsIntoLocalState(targetSheetId, rollbackRows, {
          persisted: false,
          syncGrid: false
        })
      }
      params.rowSlotIdentityRegistry.markHealthy(targetSheetId)
      if (isActiveTargetSheet) {
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(params.spreadsheetColumnsForGrid, rollbackRows)
      }
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        await params.recoverFromVersionConflictRef.current()
      }
      params.sheetPersist.recordError(params.sheetPersistErrorMessage)
    }

    const resolveTargetSheetState = (
      sheetId: string
    ): { targetSheetId: string; isActiveTargetSheet: boolean; rows: ViewerRow[]; columns: any[] } | null => {
      const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
      const isActiveTargetSheet = areCanonicalSheetIdsEqual(
        targetSheetId,
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      if (isActiveTargetSheet) {
        return {
          targetSheetId,
          isActiveTargetSheet: true,
          rows: params.getActiveSessionRows(),
          columns: params.activeSheetColumns
        }
      }
      const targetSheetContext = params.resolveSheetContext?.(targetSheetId) ?? null
      if (!targetSheetContext) return null
      return {
        targetSheetId,
        isActiveTargetSheet: false,
        rows: targetSheetContext.data,
        columns: targetSheetContext.columns
      }
    }

    const syncOptimisticRows = (
      targetSheetId: string,
      isActiveTargetSheet: boolean,
      rows: ViewerRow[],
      columnsForGridSync: any[]
    ) => {
      if (isActiveTargetSheet) {
        params.commitLocalSheetData(rows, {
          persisted: false,
          syncGrid: false,
          publishParent: true
        })
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(columnsForGridSync, rows)
        return
      }
      params.syncSheetRowsIntoLocalState(targetSheetId, rows, {
        persisted: false,
        syncGrid: false
      })
    }

    const onColumnsInsert = (
      sheetId: string,
      insertIndex: number,
      count: number,
      direction: 'lefttop' | 'rightbottom'
    ) => {
      const shouldIgnore = Boolean(params.spreadsheetGridRef.current?.shouldIgnoreStructuralRowCommand?.())
      const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
      const isActiveTargetSheet = areCanonicalSheetIdsEqual(
        targetSheetId,
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      params.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: shouldIgnore
          ? 'viewer_column_insert_structural_callback_skipped'
          : 'viewer_column_insert_structural_callback_invoked',
        severity: 'info',
        sheetId: targetSheetId,
        payload: { insertIndex, count, direction, isActiveTargetSheet }
      })
      if (shouldIgnore) {
        return
      }
      if (!isActiveTargetSheet) {
        params.scheduleStructuralSnapshotReload?.(targetSheetId)
        return
      }
      const nextColumns = params.handleColumnsInsertInternal(insertIndex, count, direction)
      if (nextColumns) {
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(nextColumns)
      }
    }

    const onColumnsDelete = (sheetId: string, startIndex: number, endIndex: number) => {
      const shouldIgnore = Boolean(params.spreadsheetGridRef.current?.shouldIgnoreStructuralRowCommand?.())
      const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
      const isActiveTargetSheet = areCanonicalSheetIdsEqual(
        targetSheetId,
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      params.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: shouldIgnore
          ? 'viewer_column_delete_structural_callback_skipped'
          : 'viewer_column_delete_structural_callback_invoked',
        severity: 'info',
        sheetId: targetSheetId,
        payload: { startIndex, endIndex, isActiveTargetSheet }
      })
      if (shouldIgnore) {
        return
      }
      if (!isActiveTargetSheet) {
        params.scheduleStructuralSnapshotReload?.(targetSheetId)
        return
      }
      const syncPayload = params.handleColumnsDeleteInternal(startIndex, endIndex)
      if (syncPayload) {
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(syncPayload.columns, syncPayload.data)
      }
    }

    const onColumnsMove = (sheetId: string, sourceStartIndex: number, count: number, destinationIndex: number) => {
      const shouldIgnore = Boolean(params.spreadsheetGridRef.current?.shouldIgnoreStructuralRowCommand?.())
      const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
      const isActiveTargetSheet = areCanonicalSheetIdsEqual(
        targetSheetId,
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      params.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: shouldIgnore
          ? 'viewer_column_move_structural_callback_skipped'
          : 'viewer_column_move_structural_callback_invoked',
        severity: 'info',
        sheetId: targetSheetId,
        payload: {
          sourceStartIndex,
          count,
          destinationIndex,
          moveSignature: `${targetSheetId}:${sourceStartIndex}:${count}:${destinationIndex}`,
          isActiveTargetSheet
        }
      })
      if (shouldIgnore) {
        return
      }
      if (!isActiveTargetSheet) {
        params.scheduleStructuralSnapshotReload?.(targetSheetId)
        return
      }
      const nextColumns = params.handleColumnsMoveInternal(sourceStartIndex, count, destinationIndex)
      if (nextColumns) {
        params.spreadsheetGridRef.current?.syncGridConversionContext?.(nextColumns)
      }
    }

    const onRowsInsert = (
      sheetId: string,
      insertIndex: number,
      count: number,
      direction: 'lefttop' | 'rightbottom'
    ) => {
      if (count <= 0) {
        return
      }
      if (params.spreadsheetGridRef.current?.shouldIgnoreStructuralRowCommand?.()) {
        return
      }
      const target = resolveTargetSheetState(sheetId)
      if (!target) {
        const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
        params.scheduleStructuralSnapshotReload?.(targetSheetId)
        return
      }
      const { targetSheetId, isActiveTargetSheet, rows: previousRows, columns: targetColumns } = target
      params.rowSlotIdentityRegistry.markUnhealthy(targetSheetId, 'row_slot_insert_pending')
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
      const rowPayloads = params.buildAddRowPayloadsFromUniverRows(insertedRows, targetColumns)

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

      syncOptimisticRows(targetSheetId, isActiveTargetSheet, optimisticRows, params.spreadsheetColumnsForGrid)

      void params.chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        params.sheetPersist.markDirty()
        params.versioning.markAsChanged()
        try {
          const response = await params.mutationFacade.insertRowSlots(
            targetSheetId,
            startGridRowIndex,
            count,
            rowPayloads
          )
          const insertResult = response.operationResults.find(result => result.type === 'insert_row_slots')
          const persistedIdByClientRowId = params.buildPersistedRowIdMapFromInsertRowSlotsResult(
            insertResult?.result as Record<string, unknown> | undefined,
            {
              fallbackClientRowIdsInOrder: Array.from(placeholderClientIds),
              rowMappings: response.rowMappings
            }
          )
          promoteSpreadsheetRowIdentities({
            sheetId: targetSheetId,
            persistedIdByClientRowId,
            deps: {
              rowMaterializationReadiness: params.rowMaterializationReadiness,
              rowSlotIdentityRegistry: params.rowSlotIdentityRegistry,
              intentJournal: params.spreadsheetIntentJournalRef?.current,
              versionCausalOwnership: params.versionCausalOwnershipRef?.current,
              pendingLocalMutationCellsRef: params.pendingLocalMutationCellsRef
            }
          })
          persistedIdByClientRowId.forEach((backendRowId, clientRowId) => {
            const resolver = readinessPendingResolvers.get(clientRowId)
            if (!resolver) return
            resolver.resolve(backendRowId)
            readinessPendingResolvers.delete(clientRowId)
          })
          const sessionRows = isActiveTargetSheet
            ? params.getActiveSessionRows()
            : (params.resolveSheetContext?.(targetSheetId)?.data ?? optimisticRows)
          const authoritativeRows = applyCommittedGridRowPlacements(
            applyInsertRowSlotsTransform(
              sessionRows,
              startGridRowIndex,
              count,
              params.mapPersistedRowsToViewerRows(insertResult?.result?.rows)
            ),
            response.gridRowIndexByRowUuid
          )
          const previousLatest = params.latestUniverDataRef.current
          if (
            previousLatest &&
            areCanonicalSheetIdsEqual(previousLatest.sheetId, targetSheetId, params.createdSheetIdAliasesRef.current) &&
            previousLatest.data.length > 0 &&
            persistedIdByClientRowId.size > 0
          ) {
            params.latestUniverDataRef.current = {
              sheetId: targetSheetId,
              data: patchLatestUniverSnapshotRowBackendIdentities({
                latestRows: previousLatest.data,
                authoritativeRows,
                persistedIdByClientRowId,
                isUuid: params.isUuidString
              })
            }
          }
          // Univer already inserted rows locally — sync session/version/ids without grid resync or snapshot reload.
          finalizeStructuralSuccess(targetSheetId, response, authoritativeRows, { syncGrid: false })
          void params.flushPendingCellChangesRef?.current?.()
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

    const onRowsDelete = (sheetId: string, startIndex: number, count: number) => {
      if (count <= 0) {
        return
      }
      if (params.spreadsheetGridRef.current?.shouldIgnoreStructuralRowCommand?.()) {
        return
      }
      const target = resolveTargetSheetState(sheetId)
      if (!target) {
        const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
        params.scheduleStructuralSnapshotReload?.(targetSheetId)
        return
      }
      const { targetSheetId, isActiveTargetSheet, rows: previousRows } = target
      params.rowSlotIdentityRegistry.markUnhealthy(targetSheetId, 'row_slot_delete_pending')
      const projection = createIdentityRowProjectionModel(previousRows)
      const startGridRowIndex = projection.resolveVisibleRowIndex(startIndex).virtualSlot
      const optimisticRows = applyDeleteRowSlotsTransform(previousRows, startGridRowIndex, count)

      syncOptimisticRows(targetSheetId, isActiveTargetSheet, optimisticRows, params.spreadsheetColumnsForGrid)

      void params.chainOnOperationQueue(params.operationQueueRef, async () => {
        params.sheetPersist.beginPersist()
        params.sheetPersist.markDirty()
        params.versioning.markAsChanged()
        try {
          const response = await params.mutationFacade.deleteRowSlots(targetSheetId, startGridRowIndex, count)
          finalizeStructuralSuccess(targetSheetId, response, optimisticRows, { syncGrid: false })
        } catch (error) {
          await handleStructuralFailure(targetSheetId, previousRows, error)
        } finally {
          params.sheetPersist.endPersist()
        }
      })
    }

    const onRowsMove = (sheetId: string, sourceStartIndex: number, count: number, destinationIndex: number) => {
      if (count <= 0) {
        return
      }
      if (params.spreadsheetGridRef.current?.shouldIgnoreStructuralRowCommand?.()) {
        return
      }
      const target = resolveTargetSheetState(sheetId)
      if (!target) {
        const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
        params.scheduleStructuralSnapshotReload?.(targetSheetId)
        return
      }
      const { targetSheetId, isActiveTargetSheet, rows: previousRows } = target
      params.rowSlotIdentityRegistry.markUnhealthy(targetSheetId, 'row_slot_move_pending')
      const projection = createIdentityRowProjectionModel(previousRows)
      const sourceStartGridRowIndex = projection.resolveVisibleRowIndex(sourceStartIndex).virtualSlot
      const destinationGridRowIndex = projection.resolveVisibleRowIndex(destinationIndex).virtualSlot
      const optimisticRows = applyMoveRowSlotsTransform(
        previousRows,
        sourceStartGridRowIndex,
        count,
        destinationGridRowIndex
      )

      syncOptimisticRows(targetSheetId, isActiveTargetSheet, optimisticRows, params.spreadsheetColumnsForGrid)

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
          // Univer already applied the row move locally — keep session/version in sync without
          // pushing rows back into the workbook or reloading the full canonical snapshot.
          finalizeStructuralSuccess(targetSheetId, response, optimisticRows, { syncGrid: false })
        } catch (error) {
          await handleStructuralFailure(targetSheetId, previousRows, error)
        } finally {
          params.sheetPersist.endPersist()
        }
      })
    }

    const onCellRangeMove = (
      sheetId: string,
      fromRange: { startRow: number; endRow: number; startColumn: number; endColumn: number },
      toRange: { startRow: number; endRow: number; startColumn: number; endColumn: number }
    ) => {
      if (
        fromRange.endRow - fromRange.startRow !== toRange.endRow - toRange.startRow ||
        fromRange.endColumn - fromRange.startColumn !== toRange.endColumn - toRange.startColumn
      ) {
        return
      }
      const targetSheetId = resolveReconciledSheetId(sheetId, params.createdSheetIdAliasesRef.current)
      const isActiveTargetSheet = areCanonicalSheetIdsEqual(
        targetSheetId,
        params.activeSheetIdRef.current,
        params.createdSheetIdAliasesRef.current
      )
      const targetSheetContext = isActiveTargetSheet
        ? { columns: params.activeSheetColumns, data: params.getActiveSessionRows() }
        : (params.resolveSheetContext?.(targetSheetId) ?? null)
      if (!targetSheetContext) {
        params.scheduleStructuralSnapshotReload?.(targetSheetId)
        return
      }
      const previousRows = targetSheetContext.data
      const optimisticRows = applyMoveCellRangeToViewerRows({
        rows: previousRows,
        columns: targetSheetContext.columns,
        fromRange,
        toRange
      })

      // Keep relational row.data in sync for table/kanban views. Univer already applied the
      // grid move locally — do not push rows back into the workbook (syncGrid) or reload the
      // full canonical snapshot (same rationale as column batch ops in SpreadsheetAppViewer).
      if (optimisticRows !== previousRows) {
        if (isActiveTargetSheet) {
          params.commitLocalSheetData(optimisticRows, {
            persisted: false,
            syncGrid: false,
            publishParent: true
          })
          params.spreadsheetGridRef.current?.syncGridConversionContext?.(
            params.spreadsheetColumnsForGrid,
            optimisticRows
          )
        } else {
          params.syncSheetRowsIntoLocalState(targetSheetId, optimisticRows, {
            persisted: false,
            syncGrid: false
          })
        }
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
