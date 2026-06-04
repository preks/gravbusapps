import { useMemo, useRef } from 'react'

import {
  createMutationEmitTailCoordinator,
  type MutationEmitTailCoordinator
} from './univerMutationEmitTailCoordinator'
import { createUniver } from '@univerjs/presets'
import { createUniverConversionContext } from '../utils/univerAdapter'
import type { AuthoritativeGridRegion } from '../utils/spreadsheetAuthoritativeRegion'
import type {
  ApplyRemoteCellUpdateOptions,
  CellDimensionsUpdateResult,
  UniverSheetGridProps,
  WorkbookSnapshotLifecycleOrigin
} from './UniverSheetGrid.types'
import type { ActiveSelectionPosition, RemoteEchoSuppressionEntry, SnapshotDimensions } from './univerGridInternalTypes'

export type FormattingPasteIntentSource = 'dom' | 'command'

export type FormattingPasteIntent = {
  id: number
  at: number
  sheetId: string | null
  source: FormattingPasteIntentSource
}

/**
 * Shared mutable refs for Univer bootstrap, collaboration, snapshots, and sheet chrome.
 * Keeps a single object boundary for hooks extracted from `UniverSheetGrid`.
 */
export function useUniverGridController(props: UniverSheetGridProps) {
  const isSheetInteractionActiveRef = useRef<boolean>(false)
  const univerAPIRef = useRef<ReturnType<typeof createUniver>['univerAPI'] | null>(null)
  const remoteEchoSuppressionRef = useRef<Map<string, RemoteEchoSuppressionEntry>>(new Map())
  const deferredRemoteCellAppliesRef = useRef<
    Map<
      string,
      { rowIndex: number; colIndex: number; value: unknown; rowId?: string; options?: ApplyRemoteCellUpdateOptions }[]
    >
  >(new Map())
  const isApplyingRemoteUpdateRef = useRef(false)
  const isDirtyRef = useRef(false)
  const hasEditedRef = useRef(false)
  const lastCellValueMutationAtRef = useRef(0)
  const snapshotRequestInFlightRef = useRef<Promise<void> | null>(null)
  const snapshotRequestQueuedRef = useRef(false)
  const snapshotCheckpointTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const snapshotCheckpointScheduledAtRef = useRef<number | null>(null)
  const snapshotFirstDirtyAtRef = useRef<number | null>(null)
  const snapshotLastRequestedAtRef = useRef<number>(0)
  const snapshotLifecycleOriginRef = useRef<WorkbookSnapshotLifecycleOrigin>('workbook')
  const snapshotDirtyVersionRef = useRef(0)
  const requestSnapshotCheckpointRef = useRef<((force?: boolean) => void) | null>(null)
  const scheduleSnapshotCheckpointRef = useRef<((delayMs?: number) => void) | null>(null)
  const lastSyncedGridCellSignaturesRef = useRef<Map<string, string>>(new Map())
  const collabPersistedBulkApplyDepthRef = useRef(0)
  /**
   * Set by `registerUniverMountSheetValueAndEditListeners` so the bulk-apply hot path can drop
   * any deferred reconcile entries that fall inside the region the manager just painted
   * (those are echoes of the bulk write, not real local edits). When unset (listener not
   * mounted yet) the call is a no-op.
   */
  const bulkApplyClearDeferredDirtyCellsRef = useRef<
    | ((worksheetId: string | null, region: { minRow: number; maxRow: number; minCol: number; maxCol: number }) => void)
    | null
  >(null)
  /** Set by sheet value listeners; flushes user edits deferred during remote apply before remount. */
  const flushDeferredDirtyCellsRef = useRef<(() => Promise<void>) | null>(null)
  const lastSyncedGridRowCountRef = useRef(0)
  const lastSyncedGridColumnCountRef = useRef(0)
  const lastProcessedAuthoritativeDataSyncTokenRef = useRef<number>(props.authoritativeDataSyncToken ?? 0)
  const pendingAuthoritativeRegionRef = useRef<AuthoritativeGridRegion[] | null>(null)
  const pendingForcedAuthoritativeReapplyRef = useRef<{
    regions: AuthoritativeGridRegion[] | null
    preferBulk: boolean
    clearAllSignatures: boolean
    reason?: string
    pendingLocalFilterPolicy?: import('../utils/spreadsheetAuthoritativeRegion').PendingLocalFilterPolicy
    preserveStagedDirectPaint?: boolean
  } | null>(null)
  const lastProcessedAuthoritativeReapplySeedRef = useRef(0)
  const skipNextAuthoritativeSyncAfterSnapshotInitRef = useRef(false)
  const newRowClientIdByIndexRef = useRef<Map<number, string>>(new Map())
  const recentLocalMutationSignaturesRef = useRef<Map<string, number>>(new Map())
  const lastClearAllEmitAtBySignatureRef = useRef<Map<string, number>>(new Map())
  const lastClearFormatEmitAtBySignatureRef = useRef<Map<string, number>>(new Map())
  const lastFeatureEmitAtBySignatureRef = useRef<Map<string, number>>(new Map())
  const pendingFreezeClearEmitTimeoutBySheetRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const activeSelectionRef = useRef<ActiveSelectionPosition | null>(null)
  const copiedSelectionAnchorRef = useRef<(ActiveSelectionPosition & { copiedAt: number }) | null>(null)
  const pendingCutCellRangeRef = useRef<import('../utils/spreadsheetCutPasteMove').PendingCutCellRange | null>(null)
  const cutPasteCollabSuppressUntilMsRef = useRef(0)
  const mergeGestureSuppressBySheetRef = useRef<
    Map<string, import('../utils/spreadsheetMergeGestureSuppress').MergeGestureSuppressEntry>
  >(new Map())
  const pendingFormattingPasteIntentRef = useRef<FormattingPasteIntent | null>(null)
  const pendingAutofillIntentRef = useRef<import('./univerAutofillIntent').SpreadsheetAutofillIntent | null>(null)
  const pendingDimensionUserIntentRef = useRef<
    import('./univerDimensionUserIntent').SpreadsheetDimensionUserIntent | null
  >(null)
  const contextRef = useRef<ReturnType<typeof createUniverConversionContext> | null>(null)
  const propsRef = useRef({
    sheet: props.sheet,
    data: props.data,
    columns: props.columns,
    initialSnapshot: props.initialSnapshot,
    collaborationEnabled: props.collaborationEnabled ?? false,
    onOperationEmit: props.onOperationEmit,
    onStyleBatchOp: props.onStyleBatchOp,
    onMutationBatchOp: props.onMutationBatchOp,
    flushUnmaterializedRowsBeforePersistRef: props.flushUnmaterializedRowsBeforePersistRef,
    flushPendingCellChangesRef: props.flushPendingCellChangesRef,
    flushDeferredDirtyCellsRef: props.flushDeferredDirtyCellsRef,
    getPersistSheetRowsSnapshot: props.getPersistSheetRowsSnapshot,
    getPersistedBaselineRowsSnapshot: props.getPersistedBaselineRowsSnapshot,
    // 2a: prefer `isBackendRowUuid`; keep legacy alias for one release.
    isBackendRowUuid: props.isBackendRowUuid,
    isUuidForRowRemap: props.isUuidForRowRemap,
    rowSlotIdentityRegistryRef: props.rowSlotIdentityRegistryRef,
    rowMaterializationReadinessRef: props.rowMaterializationReadinessRef,
    columnStructureStateRef: props.columnStructureStateRef,
    getSheetContext: props.getSheetContext,
    getCanonicalSheetId: props.getCanonicalSheetId,
    multiSheetWorkbookMode: props.multiSheetWorkbookMode ?? false,
    apiFirstSheetStructure: props.apiFirstSheetStructure ?? true,
    pendingLocalMutationCellsRef: props.pendingLocalMutationCellsRef,
    spreadsheetIntentJournalRef: props.spreadsheetIntentJournalRef,
    versionCausalOwnershipRef: props.versionCausalOwnershipRef,
    resolveKnownSheetVersion: props.resolveKnownSheetVersion
  })
  const lastUniverInitDepsRef = useRef<{
    workbookInstanceKey: string
    snapshotSeed?: string
    isReadOnly: boolean
    gridHostElConnected: boolean
    appLocale: string
  } | null>(null)

  propsRef.current = {
    sheet: props.sheet,
    data: props.data,
    columns: props.columns,
    initialSnapshot: props.initialSnapshot,
    collaborationEnabled: props.collaborationEnabled ?? false,
    onOperationEmit: props.onOperationEmit,
    onStyleBatchOp: props.onStyleBatchOp,
    onMutationBatchOp: props.onMutationBatchOp,
    flushUnmaterializedRowsBeforePersistRef: props.flushUnmaterializedRowsBeforePersistRef,
    flushPendingCellChangesRef: props.flushPendingCellChangesRef,
    flushDeferredDirtyCellsRef: props.flushDeferredDirtyCellsRef,
    getPersistSheetRowsSnapshot: props.getPersistSheetRowsSnapshot,
    getPersistedBaselineRowsSnapshot: props.getPersistedBaselineRowsSnapshot,
    isBackendRowUuid: props.isBackendRowUuid,
    isUuidForRowRemap: props.isUuidForRowRemap,
    rowSlotIdentityRegistryRef: props.rowSlotIdentityRegistryRef,
    rowMaterializationReadinessRef: props.rowMaterializationReadinessRef,
    columnStructureStateRef: props.columnStructureStateRef,
    getSheetContext: props.getSheetContext,
    getCanonicalSheetId: props.getCanonicalSheetId,
    multiSheetWorkbookMode: props.multiSheetWorkbookMode ?? false,
    apiFirstSheetStructure: props.apiFirstSheetStructure ?? true,
    pendingLocalMutationCellsRef: props.pendingLocalMutationCellsRef,
    spreadsheetIntentJournalRef: props.spreadsheetIntentJournalRef,
    versionCausalOwnershipRef: props.versionCausalOwnershipRef,
    resolveKnownSheetVersion: props.resolveKnownSheetVersion
  }

  const callbacksRef = useRef({
    onCellChange: props.onCellChange,
    onCellsChange: props.onCellsChange,
    onSnapshotRequested: props.onSnapshotRequested,
    onWorkbookSnapshotLifecycle: props.onWorkbookSnapshotLifecycle,
    onDataChange: props.onDataChange,
    onCursorEmit: props.onCursorEmit,
    onOperationEmit: props.onOperationEmit,
    onDimensionsChange: props.onDimensionsChange,
    onDiagnosticsTraceEvent: props.onDiagnosticsTraceEvent,
    onOpenCommentRequest: props.onOpenCommentRequest,
    onActiveWorksheetChange: props.onActiveWorksheetChange,
    onUniverSheetInserted: props.onUniverSheetInserted,
    onUniverSheetRemoved: props.onUniverSheetRemoved,
    onUniverSheetRenamed: props.onUniverSheetRenamed,
    onUniverSheetVisibilityChanged: props.onUniverSheetVisibilityChanged,
    onNativeSheetStructureIntent: props.onNativeSheetStructureIntent,
    onColumnsInsert: props.onColumnsInsert,
    onColumnsDelete: props.onColumnsDelete,
    onColumnsMove: props.onColumnsMove,
    onRowsInsert: props.onRowsInsert,
    onRowsDelete: props.onRowsDelete,
    onRowsMove: props.onRowsMove,
    onCellRangeMove: props.onCellRangeMove
  })

  callbacksRef.current = {
    onCellChange: props.onCellChange,
    onCellsChange: props.onCellsChange,
    onSnapshotRequested: props.onSnapshotRequested,
    onWorkbookSnapshotLifecycle: props.onWorkbookSnapshotLifecycle,
    onDataChange: props.onDataChange,
    onCursorEmit: props.onCursorEmit,
    onOperationEmit: props.onOperationEmit,
    onDimensionsChange: props.onDimensionsChange,
    onDiagnosticsTraceEvent: props.onDiagnosticsTraceEvent,
    onOpenCommentRequest: props.onOpenCommentRequest,
    onActiveWorksheetChange: props.onActiveWorksheetChange,
    onUniverSheetInserted: props.onUniverSheetInserted,
    onUniverSheetRemoved: props.onUniverSheetRemoved,
    onUniverSheetRenamed: props.onUniverSheetRenamed,
    onUniverSheetVisibilityChanged: props.onUniverSheetVisibilityChanged,
    onNativeSheetStructureIntent: props.onNativeSheetStructureIntent,
    onColumnsInsert: props.onColumnsInsert,
    onColumnsDelete: props.onColumnsDelete,
    onColumnsMove: props.onColumnsMove,
    onRowsInsert: props.onRowsInsert,
    onRowsDelete: props.onRowsDelete,
    onRowsMove: props.onRowsMove,
    onCellRangeMove: props.onCellRangeMove
  }

  const readOnlyRef = useRef(props.isReadOnly)
  readOnlyRef.current = props.isReadOnly

  const mutationEmitTailCoordinator = useMemo<MutationEmitTailCoordinator>(
    () => createMutationEmitTailCoordinator(),
    []
  )

  const lastEmittedCursorPathRef = useRef<string>('')
  const pendingInitialCursorPathRef = useRef<string>('')
  const lastEmittedWorksheetIdRef = useRef<string>('')
  const univerBootstrapCompleteRef = useRef<boolean>(false)
  const recentSheetMutationIdsRef = useRef<Set<string>>(new Set())
  const recentlyDuplicatedWorksheetIdsRef = useRef<Map<string, number>>(new Map())
  const rewrittenWorksheetIdsRef = useRef<Map<string, string>>(new Map())
  const cellDimensionsRef = useRef<SnapshotDimensions | null>(null)
  const sheetScrollRef = useRef<{ scrollLeft: number; scrollTop: number }>({ scrollLeft: 0, scrollTop: 0 })
  const refreshCursorRectsRef = useRef<(() => void) | null>(null)
  const refreshCommentRectsRef = useRef<(() => void) | null>(null)
  const updateCellDimensionsRef = useRef<(() => CellDimensionsUpdateResult) | null>(null)

  return {
    isSheetInteractionActiveRef,
    univerAPIRef,
    remoteEchoSuppressionRef,
    deferredRemoteCellAppliesRef,
    isApplyingRemoteUpdateRef,
    isDirtyRef,
    hasEditedRef,
    lastCellValueMutationAtRef,
    snapshotRequestInFlightRef,
    snapshotRequestQueuedRef,
    snapshotCheckpointTimerRef,
    snapshotCheckpointScheduledAtRef,
    snapshotFirstDirtyAtRef,
    snapshotLastRequestedAtRef,
    snapshotLifecycleOriginRef,
    snapshotDirtyVersionRef,
    requestSnapshotCheckpointRef,
    scheduleSnapshotCheckpointRef,
    lastSyncedGridCellSignaturesRef,
    collabPersistedBulkApplyDepthRef,
    bulkApplyClearDeferredDirtyCellsRef,
    flushDeferredDirtyCellsRef,
    lastSyncedGridRowCountRef,
    lastSyncedGridColumnCountRef,
    lastProcessedAuthoritativeDataSyncTokenRef,
    pendingAuthoritativeRegionRef,
    pendingForcedAuthoritativeReapplyRef,
    lastProcessedAuthoritativeReapplySeedRef,
    skipNextAuthoritativeSyncAfterSnapshotInitRef,
    newRowClientIdByIndexRef,
    recentLocalMutationSignaturesRef,
    lastClearAllEmitAtBySignatureRef,
    lastClearFormatEmitAtBySignatureRef,
    lastFeatureEmitAtBySignatureRef,
    pendingFreezeClearEmitTimeoutBySheetRef,
    activeSelectionRef,
    copiedSelectionAnchorRef,
    pendingCutCellRangeRef,
    cutPasteCollabSuppressUntilMsRef,
    mergeGestureSuppressBySheetRef,
    pendingFormattingPasteIntentRef,
    pendingAutofillIntentRef,
    pendingDimensionUserIntentRef,
    contextRef,
    propsRef,
    lastUniverInitDepsRef,
    callbacksRef,
    readOnlyRef,
    lastEmittedCursorPathRef,
    pendingInitialCursorPathRef,
    lastEmittedWorksheetIdRef,
    univerBootstrapCompleteRef,
    recentSheetMutationIdsRef,
    recentlyDuplicatedWorksheetIdsRef,
    rewrittenWorksheetIdsRef,
    cellDimensionsRef,
    sheetScrollRef,
    refreshCursorRectsRef,
    refreshCommentRectsRef,
    updateCellDimensionsRef,
    mutationEmitTailCoordinator
  }
}

export type UniverGridController = ReturnType<typeof useUniverGridController>
