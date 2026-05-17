import { useRef } from 'react'
import { createUniver } from '@univerjs/presets'
import { createUniverConversionContext } from '../utils/univerAdapter'
import type { AuthoritativeGridRegion } from '../utils/spreadsheetAuthoritativeRegion'
import type {
  ApplyRemoteCellUpdateOptions,
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
  const lastSyncedGridRowCountRef = useRef(0)
  const lastSyncedGridColumnCountRef = useRef(0)
  const lastProcessedAuthoritativeDataSyncTokenRef = useRef<number>(props.authoritativeDataSyncToken ?? 0)
  const pendingAuthoritativeRegionRef = useRef<AuthoritativeGridRegion | null>(null)
  const pendingForcedAuthoritativeReapplyRef = useRef<{
    region: AuthoritativeGridRegion | null
    preferBulk: boolean
    clearAllSignatures: boolean
  } | null>(null)
  const lastProcessedAuthoritativeReapplySeedRef = useRef(0)
  const skipNextAuthoritativeSyncAfterSnapshotInitRef = useRef(false)
  const newRowClientIdByIndexRef = useRef<Map<number, string>>(new Map())
  const recentLocalMutationSignaturesRef = useRef<Map<string, number>>(new Map())
  const recentLocallyMutatedGridCellsRef = useRef<Map<string, number>>(new Map())
  const lastClearAllEmitAtBySignatureRef = useRef<Map<string, number>>(new Map())
  const lastClearFormatEmitAtBySignatureRef = useRef<Map<string, number>>(new Map())
  const lastFeatureEmitAtBySignatureRef = useRef<Map<string, number>>(new Map())
  const pendingFreezeClearEmitTimeoutBySheetRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const activeSelectionRef = useRef<ActiveSelectionPosition | null>(null)
  const copiedSelectionAnchorRef = useRef<(ActiveSelectionPosition & { copiedAt: number }) | null>(null)
  const pendingFormattingPasteIntentRef = useRef<FormattingPasteIntent | null>(null)
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
    getPersistSheetRowsSnapshot: props.getPersistSheetRowsSnapshot,
    // 2a: prefer `isBackendRowUuid`; keep legacy alias for one release.
    isBackendRowUuid: props.isBackendRowUuid,
    isUuidForRowRemap: props.isUuidForRowRemap,
    rowSlotIdentityRegistryRef: props.rowSlotIdentityRegistryRef,
    columnStructureStateRef: props.columnStructureStateRef,
    getSheetContext: props.getSheetContext,
    getCanonicalSheetId: props.getCanonicalSheetId,
    multiSheetWorkbookMode: props.multiSheetWorkbookMode ?? false,
    apiFirstSheetStructure: props.apiFirstSheetStructure ?? true
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
    getPersistSheetRowsSnapshot: props.getPersistSheetRowsSnapshot,
    isBackendRowUuid: props.isBackendRowUuid,
    isUuidForRowRemap: props.isUuidForRowRemap,
    rowSlotIdentityRegistryRef: props.rowSlotIdentityRegistryRef,
    columnStructureStateRef: props.columnStructureStateRef,
    getSheetContext: props.getSheetContext,
    getCanonicalSheetId: props.getCanonicalSheetId,
    multiSheetWorkbookMode: props.multiSheetWorkbookMode ?? false,
    apiFirstSheetStructure: props.apiFirstSheetStructure ?? true
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
  const updateCellDimensionsRef = useRef<(() => void) | null>(null)

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
    lastSyncedGridRowCountRef,
    lastSyncedGridColumnCountRef,
    lastProcessedAuthoritativeDataSyncTokenRef,
    pendingAuthoritativeRegionRef,
    pendingForcedAuthoritativeReapplyRef,
    lastProcessedAuthoritativeReapplySeedRef,
    skipNextAuthoritativeSyncAfterSnapshotInitRef,
    newRowClientIdByIndexRef,
    recentLocalMutationSignaturesRef,
    recentLocallyMutatedGridCellsRef,
    lastClearAllEmitAtBySignatureRef,
    lastClearFormatEmitAtBySignatureRef,
    lastFeatureEmitAtBySignatureRef,
    pendingFreezeClearEmitTimeoutBySheetRef,
    activeSelectionRef,
    copiedSelectionAnchorRef,
    pendingFormattingPasteIntentRef,
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
    updateCellDimensionsRef
  }
}

export type UniverGridController = ReturnType<typeof useUniverGridController>
