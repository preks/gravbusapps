import type { MutableRefObject } from 'react'
import type { SpreadsheetMutationPlan, SpreadsheetMutationPlannedCell } from '../core'
import type { SpreadsheetColumn } from '../types/spreadsheet'
import type { ConversionContext } from '../utils/univerAdapter'
import type { SpreadsheetStableRowTarget } from '../utils/spreadsheetRowSlotIdentity'
import type { SheetCellMatrix, SheetRangeShape } from './cellMatrixUtils'
import type { UniverWorkbookBootstrapMountContext } from './univerWorkbookBootstrapMountContext'
import type { UniverGridController } from './useUniverGridController'

export type HandleDetectedCellMutationArgs = {
  source: 'sheet-value-changed' | 'command-executed' | 'selection-reconcile' | 'sheet-edit-ended' | 'deferred-reconcile'
  commandId?: string
  payloadCellValue: SheetCellMatrix | undefined
  ranges: SheetRangeShape[]
  worksheetId?: string | null
  preserveUndefinedAsNull?: boolean
}

export type UniverMountHandleDetectedCellMutationDeps = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'propsRef'
  | 'callbacksRef'
  | 'contextRef'
  | 'recentlyDuplicatedWorksheetIdsRef'
  | 'remoteEchoSuppressionRef'
  | 'recentLocallyMutatedGridCellsRef'
  | 'lastSyncedGridCellSignaturesRef'
  | 'lastCellValueMutationAtRef'
  | 'newRowClientIdByIndexRef'
  | 'recentLocalMutationSignaturesRef'
  | 'pendingFormattingPasteIntentRef'
  | 'pendingAutofillIntentRef'
> &
  Pick<UniverWorkbookBootstrapMountContext, 'getWorkbookSnapshotRef'> & {
    peekPasteFormattingReplaceIntent: (sheetId: string) => boolean
    peekAutofillApplyType: (sheetId: string) => import('./univerAutofillIntent').SpreadsheetAutofillApplyType | null
    /**
     * Ensures `add_rows` completes before unified cell/style HTTP batch when new rows use `client_*` ids.
     *
     * Optional `finalize` runs INSIDE the same operation-queue task as the flush. Used by the emit
     * dispatch to make `flush → snapshot read → remap → submit` atomic with respect to other
     * concurrent processUniverDataChange / submit tasks. Without it, the snapshot read can race
     * with another emit's flush and miss a freshly-materialized row UUID, causing the cell write
     * to be submitted with a temp `client_*` id (which the backend rejects).
     */
    flushUnmaterializedRowsBeforePersist?: (targetSheetId: string, finalize?: () => Promise<void>) => Promise<void>
    /** Authoritative row snapshot after flush (session); used to remap `client_*` → server UUIDs in batch ops. */
    getPersistSheetRowsSnapshot?: (targetSheetId: string) => Record<string, unknown>[]
    /**
     * 2a: Predicate slots live on {@link UniverMountHandleDetectedCellMutationDeps.propsRef}
     * (`isBackendRowUuid`, deprecated `isUuidForRowRemap`). Call sites use
     * {@link resolveBackendRowUuidPredicateFromGridProps}.
     */
    isBackendRowUuid?: (value: string) => boolean
    /**
     * @deprecated 2a: Use {@link isBackendRowUuid} on grid props / `propsRef.current`. The
     * {@link resolveBackendRowUuidPredicate} helper warns once if both host predicates are
     * provided and not referentially equal.
     */
    isUuidForRowRemap?: (value: string) => boolean
    rowSlotIdentityRegistryRef?: MutableRefObject<
      import('../utils/spreadsheetRowSlotIdentity').SpreadsheetRowSlotIdentityRegistry | null
    >
    columnStructureStateRef?: MutableRefObject<{
      healthy: boolean
      pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
      expectedColumnsSignature: string | null
    }>
  }

/** Work completed after matrix + gating; passed into persist plan + emit. */
export type DetectedCellMutationReady = {
  now: number
  source: HandleDetectedCellMutationArgs['source']
  commandId: string | undefined
  targetSheetId: string
  /**
   * 2c: True when the planner context for this mutation was sourced from the host's
   * `getSheetContext` (i.e. the host owns context lifetime). When true, the persist plan
   * intentionally does NOT mutate any of the following refs because the host is the
   * authoritative writer:
   *   - `lastSyncedGridCellSignaturesRef` (echo signature ledger)
   *   - `contextRef.current` (planner conversion context)
   *   - `recentLocalMutationSignaturesRef` (treated as host-owned in this branch)
   *   - `newRowClientIdByIndexRef` (host clears, planner only reads)
   *
   * When false, the planner is the authoritative writer for these refs. This boolean was
   * previously named `useResolvedContext`, which obscured the ownership contract.
   */
  contextOwnedByHost: boolean
  cellValue: SheetCellMatrix
  ctxBefore: ConversionContext
  contextColumns: SpreadsheetColumn[]
  currentData: Record<string, unknown>[]
  resolveStableRowTarget: (rowIndex: number) => SpreadsheetStableRowTarget | null
  resolveStableColumnName: (columnIndex: number) => string | null
  rowIdentityStructureHealthy: boolean
  rowIdentityStructuralMismatch: boolean
  columnIdentityStructureHealthy: boolean
  columnIdentityStructuralMismatch: boolean
  rowOffset: number
  colOffset: number
  hadPasteIntentForSheet: boolean
  hadPasteFormattingIntentForSheet: boolean
  autofillApplyType: import('./univerAutofillIntent').SpreadsheetAutofillApplyType | null
  disableMixedValueStylePayloads: boolean
  preserveUndefinedAsNull: boolean
  explicitPayloadAbsoluteCellValue: SheetCellMatrix | undefined
  worksheetCellValue: SheetCellMatrix | undefined
  workbookSnapshotCellValue: SheetCellMatrix | undefined
  payloadCellValue: SheetCellMatrix | undefined
  ranges: SheetRangeShape[]
  shouldSuppress: (globalRowIndex: number, globalColIndex: number, value: unknown) => boolean
  pendingNewRowsUpdate: {
    nextData: Record<string, unknown>[]
    nextContext: ConversionContext
  } | null
  /**
   * 1d: Normalized live merge ranges extracted from the current worksheet facade. The planner
   * uses these for merge-slave protection instead of the workbook snapshot, which can lag the
   * live state by one or two layers. `null` means extraction failed and the planner should fall
   * back to `workbookSnapshot.mergeData`.
   */
  liveMergeRanges: SheetRangeShape[] | null
}

export type ResolveDetectedCellMutationResult =
  | { status: 'return'; value: boolean }
  | { status: 'ready'; ready: DetectedCellMutationReady }

export type PersistEmitInput = {
  source: HandleDetectedCellMutationArgs['source']
  targetSheetId: string
  mutationTraceId: string
  localMutationPlan: SpreadsheetMutationPlan
  plannedCellsFiltered: SpreadsheetMutationPlannedCell[]
  emittedChangedCells: Array<{
    rowId: string
    columnName: string
    value: unknown
    univerRow: number
    univerCol: number
  }>
  planStyles: SpreadsheetMutationPlan['styles']
  hadPasteIntentForSheet: boolean
  hadPasteFormattingIntentForSheet: boolean
  autofillApplyType: import('./univerAutofillIntent').SpreadsheetAutofillApplyType | null
  commandId: string | undefined
  /** True when new rows were merged into sheet data this tick and value cells will be persisted. */
  materializeRowsBeforeEmit: boolean
}

export type PersistPlanPhaseResult = { kind: 'return'; value: boolean } | { kind: 'emit'; emit: PersistEmitInput }
