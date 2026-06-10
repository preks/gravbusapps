/**
 * SpreadsheetAppViewer
 *
 * Runtime viewer for a generated spreadsheet app.
 * Standardized on the top-level `components/`, `hooks/`, `views/` structure (no `viewer/` directory).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { useTranslation } from '@newwork/nw-design-system'
import type { SpreadsheetApp, SpreadsheetAppViewerProps, SpreadsheetColumn, SpreadsheetSheet, ViewType } from './types'
import { columnToFormField } from './types'
import {
  SpreadsheetApiService,
  revalidateSpreadsheetUniverSnapshotAfterIdleTab,
  type SpreadsheetBatchOperation,
  type SpreadsheetBatchOperationResponse
} from './services/SpreadsheetApiService'

import { useSpreadsheetViewerState } from './hooks/useSpreadsheetViewerState'
import { resolveSpreadsheetKnownSheetRouting } from './utils/spreadsheetKnownSheetRouting'
import { sortSpreadsheetRowsBySheetSettings } from './utils/spreadsheetSheetRowSort'
import { attachSnapshotCoversVersions, mergeSnapshotCoversVersions } from './utils/spreadsheetSnapshotCoverage'
import {
  useSpreadsheetBootstrapSnapshotPipeline,
  type BootstrapWorkbookReconcileIssuePhase
} from './hooks/useSpreadsheetBootstrapSnapshotPipeline'
import { useSpreadsheetSessionBinding } from './hooks/useSpreadsheetSessionBinding'
import { useSpreadsheetSessionRowsRef } from './hooks/useSpreadsheetSessionRowsRef'
import { useSpreadsheetMutationPipeline } from './hooks/useSpreadsheetMutationPipeline'
import { resolveBackendDirtyRegionsToAuthoritativeRegions } from './utils/spreadsheetDirtyRegions'
import {
  computeAuthoritativeRegionForMaterializedRows,
  estimateAuthoritativeGridReapplyTargetCellCount,
  normalizeAuthoritativeGridReapplyTarget,
  type AuthoritativeGridReapplyTarget,
  type AuthoritativeGridRegion,
  type ForceAuthoritativeGridReapplyOptions
} from './utils/spreadsheetAuthoritativeRegion'
import {
  buildAuthoritativePaintCoverageRegions,
  classifyBackendDirtyRegionReapply,
  isServerAuthoritativeRepairReapply,
  subtractAuthoritativeRepairRegions
} from './utils/spreadsheetBackendRepairReapply'
import {
  buildAuthoritativePaintCellsForMaterializedRows,
  buildAuthoritativePaintCellsFromViewerRows
} from './utils/spreadsheetAuthoritativeProjector'
import { useSpreadsheetSheetWorkQueue } from './hooks/useSpreadsheetSheetWorkQueue'
import { splitUnifiedOperationsByPersistKind } from './core/spreadsheetLocalPersistChunks'

/**
 * Extract `rowId\u0000columnName` keys for cells written by a chunk so the
 * queue can record ownership and Guard B / Guard C can skip duplicate
 * persistence while the cells are pending/scheduled/submitting.
 */
const getSemanticCellOwnershipKey = (cell: Record<string, unknown>): string | null => {
  const rowId = cell.rowId
  const columnName = cell.columnName
  if (typeof rowId !== 'string' || typeof columnName !== 'string') return null
  return `${rowId}\u0000${columnName}`
}

const getCoordinateCellProtectionKey = (sheetId: string, cell: Record<string, unknown>): string | null => {
  const rowIndex = typeof cell.rowIndex === 'number' ? cell.rowIndex : typeof cell.row === 'number' ? cell.row : null
  const colIndex = typeof cell.colIndex === 'number' ? cell.colIndex : typeof cell.col === 'number' ? cell.col : null
  if (typeof rowIndex !== 'number' || typeof colIndex !== 'number') return null
  if (!Number.isInteger(rowIndex) || !Number.isInteger(colIndex)) return null
  return spreadsheetPendingLocalMutationCoordinateCellKey(sheetId, rowIndex, colIndex)
}

const readOperationCells = (op: SpreadsheetBatchOperation): Record<string, unknown>[] => {
  const data = (op as { data?: Record<string, unknown> }).data
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data.cells)) {
    return data.cells.filter((cell): cell is Record<string, unknown> => Boolean(cell) && typeof cell === 'object')
  }
  return [data]
}

const readOperationCellIndex = (
  cell: Record<string, unknown>,
  keys: readonly ['rowIndex', 'row'] | ['colIndex', 'col']
): number | null => {
  const direct = cell[keys[0]]
  if (typeof direct === 'number' && Number.isFinite(direct)) return Math.trunc(direct)
  const fallback = cell[keys[1]]
  if (typeof fallback === 'number' && Number.isFinite(fallback)) return Math.trunc(fallback)
  return null
}

const readOperationStylePatch = (value: unknown): SpreadsheetStylePatch | null => {
  return value && typeof value === 'object' ? (value as SpreadsheetStylePatch) : null
}

const mergeAckDirectPaintItems = (
  baseItems: readonly SpreadsheetBulkRemoteCellItem[],
  overlayItems: readonly SpreadsheetBulkRemoteCellItem[]
): SpreadsheetBulkRemoteCellItem[] => {
  const byKey = new Map<string, SpreadsheetBulkRemoteCellItem>()
  for (const item of baseItems) {
    byKey.set(`${item.rowIndex}:${item.colIndex}`, item)
  }
  for (const item of overlayItems) {
    const key = `${item.rowIndex}:${item.colIndex}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, item)
      continue
    }
    byKey.set(key, {
      ...existing,
      ...item,
      value: item.value !== undefined ? item.value : existing.value,
      rowId: item.rowId ?? existing.rowId,
      options:
        existing.options || item.options
          ? {
              ...(existing.options ?? {}),
              ...(item.options ?? {})
            }
          : undefined
    })
  }
  return [...byKey.values()]
}

const buildAckDirectPaintCellsFromOperations = (
  targetSheetId: string,
  operations: readonly SpreadsheetBatchOperation[]
): SpreadsheetBulkRemoteCellItem[] => {
  const items: SpreadsheetBulkRemoteCellItem[] = []
  for (const operation of operations) {
    const operationType = String(operation.type ?? '')
    if (
      operationType !== 'set_cell' &&
      operationType !== 'set_range' &&
      operationType !== 'clear_cell' &&
      operationType !== 'set_style'
    ) {
      continue
    }
    const operationData =
      operation.data && typeof operation.data === 'object' ? (operation.data as Record<string, unknown>) : null
    if (!operationData) continue
    const univerStyles =
      operationType === 'set_style' && operationData.styles && typeof operationData.styles === 'object'
        ? (operationData.styles as Record<string, unknown>)
        : undefined
    for (const cell of readOperationCells(operation)) {
      const rowIndex = readOperationCellIndex(cell, ['rowIndex', 'row'])
      const colIndex = readOperationCellIndex(cell, ['colIndex', 'col'])
      if (rowIndex == null || colIndex == null) continue
      items.push({
        rowIndex,
        colIndex,
        value:
          operationType === 'set_style'
            ? undefined
            : operationType === 'clear_cell'
              ? null
              : Object.prototype.hasOwnProperty.call(cell, 'value')
                ? cell.value
                : null,
        rowId: typeof cell.rowId === 'string' ? cell.rowId : undefined,
        options:
          operationType === 'set_style'
            ? {
                stylePatch: readOperationStylePatch(cell.stylePatch),
                univerStyles,
                targetSheetId,
                useSenderA1Row: true
              }
            : { targetSheetId }
      })
    }
  }
  return items
}

const extractOwnedCellKeysFromChunk = (chunk: SpreadsheetBatchOperation[]): string[] => {
  const keys = new Set<string>()
  for (const op of chunk) {
    const t = String(op.type ?? '')
    if (t !== 'set_cell' && t !== 'clear_cell' && t !== 'set_range') continue
    for (const cell of readOperationCells(op)) {
      const key = getSemanticCellOwnershipKey(cell)
      if (key) keys.add(key)
    }
  }
  return Array.from(keys)
}

const extractPendingLocalMutationCellKeysFromChunk = (
  sheetId: string,
  chunk: SpreadsheetBatchOperation[]
): string[] => {
  const keys = new Set<string>()
  for (const op of chunk) {
    const t = String(op.type ?? '')
    if (t !== 'set_cell' && t !== 'clear_cell' && t !== 'set_range' && t !== 'set_style') continue
    for (const cell of readOperationCells(op)) {
      const semanticKey = getSemanticCellOwnershipKey(cell)
      if (semanticKey) {
        const [rowId, columnName] = semanticKey.split('\u0000')
        if (rowId && columnName) {
          keys.add(spreadsheetPendingLocalMutationSemanticCellKey(sheetId, rowId, columnName))
        }
      }
      const coordinateKey = getCoordinateCellProtectionKey(sheetId, cell)
      if (coordinateKey) keys.add(coordinateKey)
    }
  }
  return Array.from(keys)
}

const collectAcknowledgedOverlayReleaseKeys = (
  sheetId: string,
  operations: SpreadsheetBatchOperation[]
): { ownedCellKeys: string[]; protectedCellKeys: string[] } => ({
  ownedCellKeys: extractOwnedCellKeysFromChunk(operations),
  protectedCellKeys: extractPendingLocalMutationCellKeysFromChunk(sheetId, operations)
})

import { useSpreadsheetCheckpointOrchestration } from './hooks/useSpreadsheetCheckpointOrchestration'
import { useSpreadsheetDiagnosticsTrace } from './hooks/useSpreadsheetDiagnosticsTrace'
import { useSpreadsheetSheetVersionModel } from './hooks/useSpreadsheetSheetVersionModel'
import { useSpreadsheetViewerSessionModel } from './hooks/useSpreadsheetViewerSessionModel'
import {
  useSpreadsheetRemoteSyncController,
  type SpreadsheetRemoteSyncConflictRecovery,
  type UseSpreadsheetRemoteSyncControllerParams
} from './hooks/useSpreadsheetRemoteSyncController'
import type { SpreadsheetLocalWorkGuard } from './hooks/useSpreadsheetRemoteDeltaCatchUp'
import { hasSpreadsheetUnresolvedLocalWork } from './utils/spreadsheetUnresolvedLocalWork'
import { useSpreadsheetRemoteSyncCollaborationEffects } from './hooks/useSpreadsheetRemoteSyncCollaborationEffects'
import { useSpreadsheetDimensionPersistence } from './hooks/useSpreadsheetDimensionPersistence'
import { useSpreadsheetCollectionSubmission } from './hooks/useSpreadsheetCollectionSubmission'
import { useSpreadsheetPendingCellPersistence } from './hooks/useSpreadsheetPendingCellPersistence'
import { useSpreadsheetCellChangePipeline } from './hooks/useSpreadsheetCellChangePipeline'
import { useSpreadsheetRowPersistencePipeline } from './hooks/useSpreadsheetRowPersistencePipeline'
import { createSpreadsheetRowMaterializationReadiness } from './hooks/spreadsheetRowMaterializationReadiness'
import { useSpreadsheetUniverRowCreatePipeline } from './hooks/useSpreadsheetUniverRowCreatePipeline'
import { resolveUniverRowsForSubmitReadinessMaterialization } from './hooks/spreadsheetRowMaterializationPlan'
import { useSpreadsheetUniverDataChangeBridge } from './hooks/useSpreadsheetUniverDataChangeBridge'
import { useSpreadsheetLeaveGuardPipeline } from './hooks/useSpreadsheetLeaveGuardPipeline'
import { useSpreadsheetPendingCellJournalRestore } from './hooks/useSpreadsheetPendingCellJournalRestore'
import { useSpreadsheetNavigationLeaveIntercept } from './hooks/useSpreadsheetNavigationLeaveIntercept'
import { useSpreadsheetLifecyclePersistenceBridge } from './hooks/useSpreadsheetLifecyclePersistenceBridge'
import { useSpreadsheetFlushTriggers } from './hooks/useSpreadsheetFlushTriggers'
import { useSpreadsheetRowCrudActions } from './hooks/useSpreadsheetRowCrudActions'
import { useSpreadsheetColumnLabelSync } from './hooks/useSpreadsheetColumnLabelSync'
import { useSpreadsheetRenameAction } from './hooks/useSpreadsheetRenameAction'
import { useSpreadsheetAnalyticsActions } from './hooks/useSpreadsheetAnalyticsActions'
import { useSpreadsheetUtilityActions } from './hooks/useSpreadsheetUtilityActions'
import { useSpreadsheetGridDataReaders } from './hooks/useSpreadsheetGridDataReaders'
import { useSpreadsheetWorksheetContextBridge } from './hooks/useSpreadsheetWorksheetContextBridge'
import { useSpreadsheetNativeSheetStructureIntent } from './hooks/useSpreadsheetNativeSheetStructureIntent'
import { useSpreadsheetUniverSheetEvents } from './hooks/useSpreadsheetUniverSheetEvents'
import { useSpreadsheetMainViewRenderer } from './hooks/useSpreadsheetMainViewRenderer'
import { useSpreadsheetEmergencyFallbackGuard } from './hooks/useSpreadsheetEmergencyFallbackGuard'
import { useSpreadsheetViewerController } from './hooks/useSpreadsheetViewerController'
import { useSpreadsheetSidePanelState } from './hooks/useSpreadsheetSidePanelState'
import { useSpreadsheetDiagnosticsDialogActions } from './hooks/useSpreadsheetDiagnosticsDialogActions'
import { useSpreadsheetPersistenceIndicator, maxPersistDate } from './hooks/useSpreadsheetPersistenceIndicator'
import { useSpreadsheetGridStructuralMutations } from './hooks/useSpreadsheetGridStructuralMutations'
import translations from './_i18n'
import { useSpreadsheetCollaboration } from './hooks/useSpreadsheetCollaboration'
import {
  buildSpreadsheetCollaborationCallbacks,
  releaseSpreadsheetMutationOwnershipFromResponse,
  SpreadsheetIntentJournal,
  SpreadsheetVersionCausalOwnershipRegistry,
  type SpreadsheetBulkRemoteCellItem,
  type SpreadsheetFeatureOperationPayload,
  type SpreadsheetStylePatch,
  type SpreadsheetLiveRemoteApplyVersionScope
} from './core'
import type { SpreadsheetCollaborationManager } from './services/SpreadsheetCollaborationManager'
import {
  persistSpreadsheetCreatedSheet,
  persistSpreadsheetSheetDelete,
  primeSpreadsheetSheetInsertCaches,
  queuePersistSpreadsheetSheetRenameAfterCellFlush,
  cloneSnapshot,
  fetchSpreadsheetSheetReplaySince,
  fetchSpreadsheetSheetVersion,
  buildCellPersistenceOperations,
  buildSpreadsheetPendingCellJournalStorageKey,
  createSpreadsheetMutationOperationId,
  normalizeCellValueForBatchPersistence,
  writeSpreadsheetPendingCellJournal
} from './core'
import type {
  SpreadsheetCollaborationCallbacks,
  SpreadsheetMutationFacade,
  SpreadsheetPendingCellBatch as PendingCellBatch,
  SpreadsheetPendingCellChange as CellChange,
  SpreadsheetPendingCellJournal as PendingCellJournal,
  SpreadsheetReplayResponse,
  PersistSpreadsheetCreatedSheetContext,
  SpreadsheetSession,
  SnapshotCellCoordinate,
  SpreadsheetUnifiedMutationBatchPayload
} from './core'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { useSpreadsheetBulkRows, syncTrackingHeaderRowWithColumnLabels } from './hooks/useSpreadsheetBulkRows'
import { useSpreadsheetCommentSidebar } from './hooks/useSpreadsheetCommentSidebar'
import { useSpreadsheetColumns } from './hooks/useSpreadsheetColumns'
import { useVersionUserDisplays } from '@/business-apps/core/office/apps/documents/hooks/useVersionUserDisplays'

import { useVersioning } from '@/business-apps/platform/apps/shared/hooks/useVersioning'
import { useComments } from '@/business-apps/platform/apps/shared/hooks/useComments'
import { useFileLock } from '@/business-apps/platform/apps/shared/hooks/useFileLock'
import { usePublishing } from '@/business-apps/platform/apps/shared/hooks/usePublishing'

import type {
  UniverSheetGridHandle,
  CellDimensionsPayload,
  ApplyRemoteCellUpdateOptions,
  WorkbookSnapshotLifecycleEvent,
  UniverSheetGridInitLifecycleEvent
} from './components/UniverSheetGrid.types'
import {
  buildMultiSheetWorkbookFromAppSheets,
  normalizeWorkbookSnapshotToAppSheets,
  snapshotTrackingHeaderMatchesColumnLabels,
  stripWorkbookSnapshotValuesPreservingFormatting
} from './utils/univerAdapter'
import { writeUniverSnapshotCache, clearUniverSnapshotCache } from './utils/univerSnapshotCache'
import { scheduleCoalescedTimeout } from './utils/collaborationRepairScheduler'
import { exportSnapshotAsXlsx } from './utils/exportToExcel'
import { areCanonicalSheetIdsEqual, resolveReconciledSheetId } from './utils/reconcileTemporarySheetId'
import { resolveRenderedSpreadsheetViewType } from './utils/resolveRenderedSpreadsheetViewType'
import {
  buildRowIdentityDiagnostics,
  buildUiToBackendRowIdMap,
  getClientRowIdentity,
  resolveBackendRowIdForViewerRow,
  resolveSpreadsheetRowRef,
  getSpreadsheetRowRefIdentity
} from './utils/spreadsheetRowIdentity'
import { createSpreadsheetRowSlotIdentityRegistry } from './utils/spreadsheetRowSlotIdentity'
import { shouldMarkDirtyForSnapshotLifecycle } from './utils/spreadsheetPersistenceSemantics'
import { buildDuplicateVisualWorksheetSnapshot } from './utils/workbookStructureFormatting'
import type { StructuralWsDedupToken } from './utils/spreadsheetStructuralWsDedup'
import { coalesceQueuedCellChanges } from './utils/spreadsheetPendingCells'
import {
  protectSpreadsheetPendingLocalMutationCells,
  releaseSpreadsheetPendingLocalMutationCells,
  spreadsheetPendingLocalMutationCoordinateCellKey,
  spreadsheetPendingLocalMutationSemanticCellKey
} from './utils/spreadsheetPendingMaterializationCells'
import { promoteSpreadsheetRowIdentities } from './utils/spreadsheetRowIdentityPromotion'
import {
  SPREADSHEET_UNIFIED_MUTATION_SUBMIT_MAX_BYTES,
  summarizeUnifiedBatchOperationsForDiagnostics
} from './utils/spreadsheetUnifiedBatchSubmitUtils'
import { remapBatchOperationsWithUiToBackendRowMap } from './utils/spreadsheetBatchOperationRowRemap'
import { SpreadsheetViewerLayout } from './components/SpreadsheetViewerLayout'
import { createSpreadsheetTraceId } from './services/spreadsheetDiagnostics'
import {
  SPREADSHEET_GRID_AUTO_REFRESH_MS,
  SPREADSHEET_VERSION_DEBUG_HEARTBEAT_MS,
  debugLog,
  isSpreadsheetAppsDebugEnabled,
  multiSheetDebugLog,
  summarizeLiveWorksheetSnapshotForDebug,
  summarizeRowsForDebug,
  summarizeWorkbookSnapshotForDebug
} from './utils/spreadsheetViewerDebug'
import {
  appendPendingSnapshotClearCoordinates,
  buildAddRowPayloadsFromUniverRows,
  buildAnalyticsInsertPayloads,
  buildCreatedRowsFromBatch,
  buildPersistedRowIdMapFromInsertRowSlotsResult,
  collectSnapshotClearCoordinates,
  collectSnapshotValueWriteCoordinates,
  isExplicitSnapshotCellClearValue,
  isUuidString,
  mapPersistedRowsToViewerRows,
  mapSnapshotRowsToViewerRows,
  overlaySnapshotIfRowsMismatch,
  partitionCellUpdatesByBackendRowId,
  removePendingSnapshotClearCoordinates,
  viewerRowId,
  type ViewerRow
} from './utils/spreadsheetViewerRows'

function createNativeSpreadsheetClientRowId(): string {
  try {
    return `client_${crypto.randomUUID()}`
  } catch {
    return `client_${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onRowAdd,
  onRowUpdate,
  onAppUpdate,
  onLocalAppUpdate,
  onAppRefreshNeeded,
  onSheetUpdate,
  onSheetAdd,
  onSheetDuplicate,
  onSheetDelete,
  onBack,
  onNavigateToSpreadsheetHub,
  onShare,
  onManageShares,
  onEdit,
  isEditing = true,
  isTrashedApp = false,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const spreadsheetSessionRef = useRef<SpreadsheetSession | null>(null)
  const recoverFromVersionConflictRef = useRef<() => Promise<boolean>>(async () => false)
  const isCollaborationConnectedRef = useRef(false)
  const structuralWsDedupRef = useRef<StructuralWsDedupToken | null>(null)
  const canEditWithLockRef = useRef(false)
  const rowMaterializationReadiness = useMemo(() => createSpreadsheetRowMaterializationReadiness(), [])
  const rowSlotIdentityRegistry = useMemo(() => createSpreadsheetRowSlotIdentityRegistry(), [])
  const rowSlotIdentityRegistryRef = useRef(rowSlotIdentityRegistry)
  rowSlotIdentityRegistryRef.current = rowSlotIdentityRegistry
  const rowMaterializationReadinessRef = useRef(rowMaterializationReadiness)
  rowMaterializationReadinessRef.current = rowMaterializationReadiness
  const snapshotSaveMetricsRef = useRef({
    attempts: 0,
    conflicts: 0,
    failures: 0,
    fallbackLoads: 0
  })
  const [snapshotDebugInfo, setSnapshotDebugInfo] = useState<{
    lastSuccessAt: number | null
    lastFailAt: number | null
    successCount: number
    failCount: number
  }>({
    lastSuccessAt: null,
    lastFailAt: null,
    successCount: 0,
    failCount: 0
  })
  useEffect(() => () => rowMaterializationReadiness.clear(), [rowMaterializationReadiness])
  useEffect(() => () => rowSlotIdentityRegistry.clear(), [rowSlotIdentityRegistry])
  const [socketDebugInfo, setSocketDebugInfo] = useState({
    connectCount: 0,
    disconnectCount: 0,
    reconnectCount: 0,
    lastConnectAt: null as number | null,
    lastDisconnectAt: null as number | null,
    lastDisconnectReason: '' as string,
    transport: '' as string,
    socketId: '' as string,
    connectErrorCount: 0
  })
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve())
  /** Fast-path cell persists — isolated from `processUniverDataChange` backlog. */
  const localPersistQueueRef = useRef<Promise<void>>(Promise.resolve())
  /**
   * Lazy bridge to the V1 sheet work queue. Populated by the
   * `useSpreadsheetSheetWorkQueue` effect below — read via a getter so
   * collaboration callbacks (constructed earlier in render) can route
   * `onVersionUpdate` / `onSheetVersionUpdate` to the queue.
   */
  const sheetWorkQueueAccessorRef = useRef<import('./core/spreadsheetSheetWorkQueue').SheetWorkQueueApi | null>(null)
  /**
   * Incremented while any `chainOnOperationQueue` runner is executing. Mutation submits consult this so they
   * do not enqueue a nested queue step while already inside the queue (checkpoint flush → cell persist deadlocks).
   */
  const operationQueueExecutionDepthRef = useRef(0)

  const chainOnOperationQueue = useCallback(
    (queueRef: React.MutableRefObject<Promise<void>>, fn: () => Promise<void>): Promise<void> => {
      const run = async () => {
        operationQueueExecutionDepthRef.current += 1
        try {
          await fn()
        } finally {
          operationQueueExecutionDepthRef.current -= 1
        }
      }

      const nextRun = queueRef.current.then(run, run)
      queueRef.current = nextRun.then(
        () => undefined,
        () => undefined
      )
      return nextRun
    },
    []
  )

  const pendingClientRowUpdatesRef = useRef<Map<string, Record<string, unknown>>>(new Map())
  const pendingCellChangesRef = useRef<CellChange[]>([])
  const flushDeferredDirtyCellsRef = useRef<(() => Promise<void>) | null>(null)
  const pendingCellBatchesRef = useRef<PendingCellBatch[]>([])
  const pendingCellJournalRestoredKeyRef = useRef<string | null>(null)
  const pendingSnapshotClearCellsRef = useRef<Map<string, Set<string>>>(new Map())
  const pendingCellPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const enqueueSnapshotCheckpointRef = useRef<(() => Promise<void>) | null>(null)
  const pendingSnapshotCheckpointBySheetRef = useRef<Map<string, { requestedAt: number }>>(new Map())
  const snapshotCheckpointDrainScheduledRef = useRef(false)
  const snapshotCheckpointDrainPromiseRef = useRef<Promise<void> | null>(null)
  /** True while Univer has scheduled a workbook snapshot that has not yet settled (HTTP + drain). */
  const workbookSnapshotThrottlePendingRef = useRef(false)
  const lastSuccessfulSnapshotCheckpointAtRef = useRef<number>(0)
  const latestUniverDataRef = useRef<{ data: Record<string, unknown>[]; sheetId: string } | null>(null)
  const pendingUniverRowsBySheetRef = useRef<
    Map<string, { data: Record<string, unknown>[]; persistedRows: Record<string, unknown>[] }>
  >(new Map())
  const pendingLocalMutationCellsRef = useRef<Set<string>>(new Set())
  const spreadsheetIntentJournalRef = useRef(new SpreadsheetIntentJournal())
  const versionCausalOwnershipRef = useRef(new SpreadsheetVersionCausalOwnershipRegistry())
  const liveRemoteApplyVersionRef = useRef<SpreadsheetLiveRemoteApplyVersionScope | null>(null)
  const handleLocalMutationCellProtectionChange = useCallback(
    (sheetId: string, cellKeys: readonly string[], protectedFromRepaint: boolean) => {
      const entries = cellKeys.map(key => ({
        key,
        ownerId: `queue:${sheetId}:${key}`
      }))
      if (protectedFromRepaint) {
        protectSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, entries, { ttlMs: 60_000 })
        return
      }
      releaseSpreadsheetPendingLocalMutationCells(pendingLocalMutationCellsRef, entries)
    },
    []
  )
  const createdSheetIdAliasesRef = useRef<Map<string, string>>(new Map())
  const onPersistedSheetReadyRef = useRef<(() => void) | null>(null)
  const pendingCreatedSheetSelectionRef = useRef<{ temporarySheetId: string; persistedSheetId: string | null } | null>(
    null
  )
  const pendingCreatedSheetReconciliationRef = useRef<{ temporarySheetId: string; persistedSheetId: string } | null>(
    null
  )
  const univerDataChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProcessedLengthRef = useRef<number>(0)
  const cellFlushSequenceRef = useRef<number>(0)
  const unloadKeepAlivePersistRef = useRef(false)
  const collaborationManagerRef = useRef<SpreadsheetCollaborationManager | null>(null)
  const spreadsheetGridRef = useRef<UniverSheetGridHandle | null>(null)
  const [gridInitLifecycle, setGridInitLifecycle] = useState<UniverSheetGridInitLifecycleEvent | null>(null)
  const mutationFacadeRef = useRef<SpreadsheetMutationFacade | null>(null)
  const requireMutationFacade = (): SpreadsheetMutationFacade => {
    const facade = mutationFacadeRef.current
    if (!facade) {
      throw new Error('Spreadsheet mutation facade is not initialized yet')
    }
    return facade
  }
  const socketPersistChainRef = useRef<Promise<unknown>>(Promise.resolve())
  const collaborationHealthRef = useRef<'connected' | 'reconnecting' | 'failed'>('reconnecting')
  const isCollaborationJoinedRef = useRef(false)
  const scheduleSheetVersionRefreshFromApiRef = useRef<() => void>(() => {})
  const sheetsNeedingGridMaterializationRef = useRef<Map<string, string>>(new Map())
  const UNIVER_DATA_CHANGE_DEBOUNCE_MS = 250
  // 400ms debounce batches rapid keystrokes into a single flush without noticeable delay.
  const CELL_PERSIST_DEBOUNCE_MS = 250
  const CELL_PERSIST_COLLAB_DEBOUNCE_MS = 40
  const CELL_PERSIST_MAX_DEBOUNCE_MS = 15000
  const isOpsV2Enabled = useMemo(() => {
    try {
      return typeof globalThis === 'undefined' ? true : globalThis.localStorage.getItem('spreadsheetOpsV2') !== '0'
    } catch {
      return true
    }
  }, [])

  // --- Viewer State (sheet/view + local sheet data) ---
  const { activeSheetId, setActiveSheetId, activeSheet, activeView, localSheetDataRef } = useSpreadsheetViewerState({
    app,
    initialSheetId,
    initialViewId: initialViewId ?? null
  })
  const activeSheetIdRef = useRef(activeSheetId)
  activeSheetIdRef.current = activeSheetId
  const {
    showDiagnosticsButton,
    diagnosticsBrowserSessionIdRef,
    diagnosticsTabIdRef,
    isDiagnosticsDialogOpen,
    setIsDiagnosticsDialogOpen,
    diagnosticsScope,
    setDiagnosticsScope,
    diagnosticsTtlMinutes,
    setDiagnosticsTtlMinutes,
    activeTraceSession,
    activeTraceSessionRef,
    traceSessions,
    selectedTraceSessionId,
    setSelectedTraceSessionId,
    traceEvents,
    traceFindings,
    setTraceEvents,
    setTraceFindings,
    isStartingTraceSession,
    isStoppingTraceSession,
    isRefreshingTraceData,
    refreshDiagnosticsData,
    enqueueDiagnosticsTraceEvent,
    startDiagnosticsTraceSession,
    stopDiagnosticsTraceSession
  } = useSpreadsheetDiagnosticsTrace({
    appId: app.id,
    activeSheetId,
    activeSheetIdRef,
    debugLog
  })
  const appSheetsRef = useRef(app.sheets)
  appSheetsRef.current = app.sheets
  const {
    sheetVersionRef,
    workbookSnapshotVersionRef,
    workbookSnapshotCoversVersionsRef,
    knownSheetVersionsRef,
    rememberSheetVersion,
    resolveKnownSheetVersion,
    rememberKnownSheetVersion,
    getKnownSheetVersion,
    updateActiveSheetVersion,
    refreshBaseVersionBeforeWrite,
    rememberLocalCommittedVersion,
    rememberRecentLocalBatchId,
    isRecentLocalBatchId,
    shouldIgnoreRecentlyCommittedOperation
  } = useSpreadsheetSheetVersionModel({
    appId: app.id,
    spreadsheetSessionRef,
    activeSheetIdRef,
    appSheetsRef,
    sheets: app.sheets,
    activeSheetId,
    activeSheetVersion: activeSheet.version
  })
  const spreadsheetSession = useSpreadsheetSessionBinding({
    appId: app.id,
    activeSheetId,
    sheets: app.sheets,
    sheetVersionRef,
    workbookSnapshotVersionRef,
    sessionRef: spreadsheetSessionRef
  })

  const spreadsheetSessionSnapshot = useSyncExternalStore(
    spreadsheetSession.subscribe,
    () => spreadsheetSession.getState(),
    () => spreadsheetSession.getState()
  )

  useSpreadsheetSessionRowsRef({
    spreadsheetSession,
    activeSheetId,
    sessionSnapshot: spreadsheetSessionSnapshot,
    localSheetDataRef
  })

  const getActiveSessionRows = useCallback(
    (): Record<string, unknown>[] => spreadsheetSession.getActiveSheetState()?.rows ?? [],
    [spreadsheetSession]
  )

  const getPersistedBaselineRowsForSheet = useCallback(
    (sheetId: string): Record<string, unknown>[] | null =>
      spreadsheetSession.getSheetState(sheetId)?.persistedBaselineRows ?? null,
    [spreadsheetSession]
  )

  const appRef = useRef(app)
  useEffect(() => {
    appRef.current = app
  }, [app])

  const applyLocalAppUpdate = useCallback(
    (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => {
      if (onLocalAppUpdate) {
        onLocalAppUpdate(updater)
        return
      }
      if (onAppUpdate) {
        onAppUpdate(updater(appRef.current))
      }
    },
    [onAppUpdate, onLocalAppUpdate]
  )

  const preferUniverNativeSheetTabs = true
  const syncRowSlotIdentityRegistry = useCallback(
    (
      sheetId: string,
      rows: ViewerRow[],
      meta: { persisted: boolean; source: 'commit_local' | 'sync_sheet_rows'; activeSheet: boolean; version?: number }
    ) => {
      rowSlotIdentityRegistry.syncRows(sheetId, rows, isUuidString)
      if (meta.persisted) {
        rowSlotIdentityRegistry.markHealthy(sheetId)
      }
    },
    [rowSlotIdentityRegistry]
  )

  const {
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    commitLocalSheetDataRef,
    canonicalActiveSheetRowsSourceRef,
    authoritativeDataSyncToken,
    authoritativePaintCellsRef,
    authoritativePaintMetaRef,
    setActiveSheetIdWithPeerCache,
    getKnownRowsForSheet,
    getActiveSessionVersion,
    getSessionBackedRowsForSheet,
    getRichestKnownRowsForSheet,
    commitLocalSheetData,
    commitOptimisticActiveSheetRows,
    syncSheetRowsIntoLocalState,
    stageAuthoritativeDirectPaintForSync
  } = useSpreadsheetViewerSessionModel({
    app,
    spreadsheetSession,
    activeSheet,
    activeSheetId,
    activeSheetIdRef,
    appSheetsRef,
    sheetVersionRef,
    rememberSheetVersion,
    updateActiveSheetVersion,
    resolveKnownSheetVersion,
    resolveCanonicalSheetId: (sheetId: string) => resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current),
    getActiveSessionRows,
    applyLocalAppUpdate,
    onDataChange,
    collaborationManagerRef,
    preferUniverNativeSheetTabs,
    spreadsheetGridRef,
    pendingUniverRowsBySheetRef,
    latestUniverDataRef,
    setActiveSheetId,
    onRowsStateUpdated: syncRowSlotIdentityRegistry
  })
  const coordinatedAuthoritativeRepairGenerationRef = useRef(0)

  const scheduleCoordinatedAuthoritativeRepair = useCallback(
    (
      targetSheetId: string,
      target: AuthoritativeGridReapplyTarget | undefined,
      options?: ForceAuthoritativeGridReapplyOptions
    ): AuthoritativeGridRegion[] | null => {
      const regions = normalizeAuthoritativeGridReapplyTarget(target)
      const isFullGridRepair = regions == null
      if (isFullGridRepair && options?.allowFullGridReapply !== true) {
        return null
      }
      if (!areCanonicalSheetIdsEqual(targetSheetId, activeSheetIdRef.current, createdSheetIdAliasesRef.current)) {
        return null
      }

      const scheduledRegions = regions?.map(region => ({ ...region })) ?? []
      const repairDescriptor = {
        reason: options?.reason,
        pendingLocalFilterPolicy: options?.pendingLocalFilterPolicy
      }
      const isRepairReapply = isServerAuthoritativeRepairReapply(repairDescriptor)
      const isBackendDirtyRepairReapply =
        repairDescriptor.reason === 'dirty_regions_from_backend_used' ||
        repairDescriptor.reason === 'dirty_regions_from_backend_materialization'
      const isRowMaterializationRepairReapply = repairDescriptor.reason === 'row_materialization'

      let nextScheduledRegions = scheduledRegions
      let preserveStagedDirectPaint = false
      if (
        !isFullGridRepair &&
        isRepairReapply &&
        (isBackendDirtyRepairReapply || isRowMaterializationRepairReapply) &&
        authoritativePaintCellsRef.current?.length
      ) {
        preserveStagedDirectPaint = true
        const remainingRegions = subtractAuthoritativeRepairRegions({
          target: scheduledRegions,
          coveredRegions: buildAuthoritativePaintCoverageRegions(authoritativePaintCellsRef.current)
        })
        if (remainingRegions && remainingRegions.length === 0) {
          debugLog('authoritative repair skipped covered by staged direct paint', {
            sheetId: targetSheetId,
            reason: repairDescriptor.reason,
            regionCount: scheduledRegions.length,
            regionCellEstimate: estimateAuthoritativeGridReapplyTargetCellCount(scheduledRegions),
            stagedPaintCellCount: authoritativePaintCellsRef.current.length
          })
          return null
        }
        if (remainingRegions && remainingRegions.length < scheduledRegions.length) {
          nextScheduledRegions = remainingRegions
          debugLog('authoritative repair reduced by staged direct paint', {
            sheetId: targetSheetId,
            reason: repairDescriptor.reason,
            originalRegionCount: scheduledRegions.length,
            remainingRegionCount: remainingRegions.length,
            originalRegionCellEstimate: estimateAuthoritativeGridReapplyTargetCellCount(scheduledRegions),
            remainingRegionCellEstimate: estimateAuthoritativeGridReapplyTargetCellCount(remainingRegions),
            stagedPaintCellCount: authoritativePaintCellsRef.current.length
          })
        }
      }

      if (isRepairReapply && !preserveStagedDirectPaint) {
        authoritativePaintCellsRef.current = null
        authoritativePaintMetaRef.current = null
        const generation = (coordinatedAuthoritativeRepairGenerationRef.current += 1)
        debugLog(isFullGridRepair ? 'authoritative full repair scheduled' : 'authoritative repair scheduled', {
          sheetId: targetSheetId,
          reason: repairDescriptor.reason,
          generation,
          fullGrid: isFullGridRepair,
          regionCount: nextScheduledRegions.length
        })
      } else if (isRepairReapply && preserveStagedDirectPaint) {
        const generation = (coordinatedAuthoritativeRepairGenerationRef.current += 1)
        debugLog(
          isFullGridRepair
            ? 'authoritative full repair scheduled after staged direct paint'
            : 'authoritative repair scheduled after staged direct paint',
          {
            sheetId: targetSheetId,
            reason: repairDescriptor.reason,
            generation,
            fullGrid: isFullGridRepair,
            regionCount: nextScheduledRegions.length
          }
        )
      }

      globalThis.setTimeout(() => {
        if (!areCanonicalSheetIdsEqual(targetSheetId, activeSheetIdRef.current, createdSheetIdAliasesRef.current)) {
          return
        }
        spreadsheetGridRef.current?.forceAuthoritativeReapply?.(
          isFullGridRepair ? null : nextScheduledRegions.length === 1 ? nextScheduledRegions[0] : nextScheduledRegions,
          preserveStagedDirectPaint ? { ...options, preserveStagedDirectPaint: true } : options
        )
      }, 0)

      return nextScheduledRegions
    },
    [
      activeSheetIdRef,
      authoritativePaintCellsRef,
      authoritativePaintMetaRef,
      createdSheetIdAliasesRef,
      debugLog,
      spreadsheetGridRef
    ]
  )

  useEffect(() => {
    rowSlotIdentityRegistry.syncRows(activeSheetId, getSessionBackedRowsForSheet(activeSheetId), isUuidString)
  }, [activeSheetId, getSessionBackedRowsForSheet, rowSlotIdentityRegistry, spreadsheetSessionSnapshot])

  const sheetPersist = useSpreadsheetPersistenceIndicator(activeSheetId)
  const { t: sheetT } = useTranslation(translations)

  // --- Entity data source (optional per-sheet) ---
  const {
    state: entityState,
    loadData: loadEntityData,
    refresh: refreshEntityData
  } = useEntityDataSource({ accessToken, userId })
  const entityEnabled = Boolean(activeSheet.entityDataSource?.enabled)
  const entityEnabledRef = useRef(entityEnabled)
  entityEnabledRef.current = entityEnabled
  const viewType = useMemo(
    () => resolveRenderedSpreadsheetViewType((activeView?.config.type || activeSheet.viewType || 'table') as ViewType),
    [activeView?.config.type, activeSheet.viewType]
  )
  // Load one Univer workbook for the whole app (all worksheets at once) and rely
  // on Univer's native sheet-bar for switching/adding/removing/renaming. Tab
  // switches are then pure in-memory operations (no network, no white flash) —
  // matching how Excel feels. Insert/rename/remove on the native sheet-bar are
  // wired back to the backend via UniverSheetGrid's onUniverSheet* callbacks,
  // so ghost sheets are no longer possible.

  useEffect(() => {
    createdSheetIdAliasesRef.current.clear()
    pendingCreatedSheetSelectionRef.current = null
    pendingCreatedSheetReconciliationRef.current = null
    pendingUniverRowsBySheetRef.current.clear()
  }, [app.id])
  const hasPendingPersistenceForSheet = useCallback((targetSheetId: string): boolean => {
    if (pendingCellBatchesRef.current.some(batch => batch.targetSheetId === targetSheetId)) {
      return true
    }
    if (pendingCellChangesRef.current.some(cell => (cell.sheetId ?? activeSheetIdRef.current) === targetSheetId)) {
      return true
    }
    if (pendingSnapshotCheckpointBySheetRef.current.has(targetSheetId)) {
      return true
    }
    const pendingUniverRows = pendingUniverRowsBySheetRef.current.get(targetSheetId)
    if (pendingUniverRows && pendingUniverRows.data.length > pendingUniverRows.persistedRows.length) {
      return true
    }
    const latest = latestUniverDataRef.current
    return Boolean(latest?.sheetId === targetSheetId && latest.data.length > lastProcessedLengthRef.current)
  }, [])
  const hasTransientLocalGridStateForSheet = useCallback(
    (targetSheetId: string): boolean => {
      if (!areCanonicalSheetIdsEqual(targetSheetId, activeSheetIdRef.current, createdSheetIdAliasesRef.current)) {
        return false
      }
      if (pendingLocalMutationCellsRef.current.size > 0) {
        return true
      }
      return spreadsheetSession.getSheetState(targetSheetId)?.isDirty === true
    },
    [activeSheetIdRef, createdSheetIdAliasesRef, spreadsheetSession]
  )

  /** Narrow signal for delta catch-up: queued cell batches only (not snapshot/style dim gaps). */
  const hasPendingCellPersistence = useCallback(
    () => pendingCellChangesRef.current.length > 0 || pendingCellBatchesRef.current.length > 0,
    []
  )

  /**
   * Bootstrap path when establishing sheet/version selection without collab side-effects:
   * intentionally avoids `commitLocalSheetData` so we do not bump peer caches, publish `onDataChange`,
   * increment authoritative sync tokens, or apply dirty markers meant for live edits.
   * Session still receives `replaceSheetState` + baseline capture here.
   * Call sites: snapshot/bootstrap pipelines and persisted-sheet restoration — not routine tab switches (those rely on session + binding reconcile).
   */
  const seedActiveSheetState = useCallback(
    (
      sheet: SpreadsheetSheet,
      rows: Record<string, unknown>[],
      options?: {
        version?: number
        setAsActive?: boolean
        markPersisted?: boolean
        updateProcessedLength?: boolean
      }
    ) => {
      const nextRows = [...rows]
      if (typeof options?.version === 'number' && Number.isFinite(options.version) && options.version >= 0) {
        const normalizedVersion = Math.trunc(options.version)
        sheetVersionRef.current = normalizedVersion
        rememberKnownSheetVersion(sheet.id, normalizedVersion)
        rememberSheetVersion(sheet.id, normalizedVersion)
      }
      if (options?.setAsActive !== false) {
        spreadsheetSession.setActiveSheet(sheet.id)
      }
      spreadsheetSession.replaceSheetState(sheet, nextRows, options?.version)
      if (options?.markPersisted !== false) {
        spreadsheetSession.capturePersistedBaseline(sheet.id)
      }
      if (options?.updateProcessedLength) {
        lastProcessedLengthRef.current = nextRows.length
      }
    },
    [rememberKnownSheetVersion, rememberSheetVersion, spreadsheetSession]
  )

  const handleBootstrapWorkbookReconcileIssue = useCallback(
    (detail: { phase: BootstrapWorkbookReconcileIssuePhase; error: unknown }) => {
      const message =
        detail.error instanceof Error
          ? detail.error.message
          : typeof detail.error === 'string'
            ? detail.error
            : 'unknown'
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage:
          detail.phase === 'canonical'
            ? 'workbook_bootstrap_canonical_failed'
            : detail.phase === 'fallback'
              ? 'workbook_bootstrap_remote_fallback_failed'
              : 'workbook_bootstrap_reconcile_failed',
        severity: detail.phase === 'reconcile' ? 'warning' : 'error',
        payload: {
          phase: detail.phase,
          appId: app.id,
          activeSheetId,
          message
        }
      })
      if (detail.phase === 'reconcile') {
        toast.warning(sheetT('workbook-bootstrap-reconcile-warning'))
      } else {
        toast.error(sheetT('workbook-bootstrap-sync-failed'))
      }
    },
    [activeSheetId, app.id, enqueueDiagnosticsTraceEvent, sheetT]
  )

  const {
    bootstrapSnapshot,
    setBootstrapSnapshot,
    bootstrapSnapshotSeed,
    setBootstrapSnapshotSeed,
    isBootstrapSnapshotLoading,
    isBootstrapCanonicalReady,
    isBootstrapWorkbookEnriching,
    isBootstrapWorkbookSyncFailed,
    hasBootstrappedForAppIdRef
  } = useSpreadsheetBootstrapSnapshotPipeline({
    appId: app.id,
    appSheets: app.sheets,
    activeSheetId,
    activeSheet,
    entityEnabled,
    preferUniverNativeSheetTabs,
    spreadsheetSession,
    workbookSnapshotVersionRef,
    workbookSnapshotCoversVersionsRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    seedActiveSheetState,
    mapSnapshotRowsToViewerRows,
    debugLog,
    onBootstrapWorkbookReconcileIssue: handleBootstrapWorkbookReconcileIssue
  })

  const emitDimensionSyncRef = useRef<(payload: CellDimensionsPayload) => void>(() => {})
  const columnStructureStateRef = useRef<{
    healthy: boolean
    pendingInsertedRange: { startIndex: number; endIndex: number; columnNames: string[] } | null
    expectedColumnsSignature: string | null
  }>({
    healthy: true,
    pendingInsertedRange: null,
    expectedColumnsSignature: null
  })

  const {
    pendingColumnWidthOverrides,
    handleDimensionsChanged,
    handleRemoteColumnUpdate,
    recentLocalRowHeightRef,
    recentLocalColWidthRef,
    baselineRowHeightsRef,
    baselineColWidthsRef
  } = useSpreadsheetDimensionPersistence({
    bootstrapSnapshot,
    activeSheetId,
    activeSheetColumns: activeSheet.columns,
    columnStructureStateRef,
    canEditWithLockRef,
    emitDimensionSyncRef,
    applyLocalAppUpdate,
    onAppUpdate,
    onLocalAppUpdate,
    mutationFacadeRef,
    enqueueSnapshotCheckpointRef,
    appSheetsRef,
    spreadsheetGridRef
  })

  useEffect(() => {
    if (!entityEnabled || !activeSheet.entityDataSource) return
    void loadEntityData(activeSheet.entityDataSource)
  }, [activeSheetId, entityEnabled, activeSheet.entityDataSource, loadEntityData])

  const sheetData: Record<string, unknown>[] = useMemo(() => {
    if (entityEnabled) return entityState.data?.records ?? []
    const activeSheetSessionState = spreadsheetSession.getSheetState(activeSheetId)
    if (activeSheetSessionState) return activeSheetSessionState.rows
    return sortSpreadsheetRowsBySheetSettings(activeSheet.data ?? [], activeSheet)
  }, [
    activeSheet,
    activeSheetId,
    entityEnabled,
    entityState.data?.records,
    spreadsheetSession,
    spreadsheetSessionSnapshot
  ])

  const entityDataCount = entityEnabled ? (entityState.data?.count ?? 0) : sheetData.length

  const prevActiveSheetIdForProcessedResetRef = useRef<string | null>(null)
  useEffect(() => {
    const prevActiveSheetId = prevActiveSheetIdForProcessedResetRef.current
    // Only reset the processing bookkeeping on a real sheet *transition*. This
    // effect used to depend on `app.sheets` to correctly seed the new sheet's
    // row count when the user switched into a brand-new empty sheet (so the
    // `if (newData.length <= lastProcessed) return` guard in
    // `processUniverDataChange` didn't skip the first `add_rows` batch). But
    // `commitLocalSheetData` calls `onDataChange` on every successful write,
    // which causes the parent to update `app.sheets` — re-running this effect
    // and resetting `lastProcessedLengthRef` to 0 (the parent's `sheet.data`
    // lags behind session-backed / live grid rows). That made the very next Univer data
    // notification re-dispatch `add_rows` for rows already persisted,
    // producing duplicate rows in the grid. Gate everything on the sheet id
    // actually changing.
    if (prevActiveSheetId === activeSheetId) return
    prevActiveSheetIdForProcessedResetRef.current = activeSheetId

    // IMPORTANT: do NOT read a stale active-sheet row ref here. Resolve the new sheet's
    // rows directly from the authoritative sources: the peer cache (which
    // captures unsynced local edits made on that sheet) falls back to the
    // server-provided `sheet.data`, falls back to an empty array for a newly
    // inserted sheet.
    const pendingUniverRows = pendingUniverRowsBySheetRef.current.get(activeSheetId)
    const cachedRowsForNewSheet = peerSheetDataCacheRef.current.get(activeSheetId)
    const newActiveSheet = app.sheets.find(s => s.id === activeSheetId)
    const existingSessionState = spreadsheetSession.getSheetState(activeSheetId)
    const persistedRowsForNewSheet: Record<string, unknown>[] = existingSessionState
      ? [...existingSessionState.rows]
      : sortSpreadsheetRowsBySheetSettings(
          (pendingUniverRows?.persistedRows ?? cachedRowsForNewSheet ?? newActiveSheet?.data ?? []) as Record<
            string,
            unknown
          >[],
          newActiveSheet
        )
    lastProcessedLengthRef.current = persistedRowsForNewSheet.length
    if (newActiveSheet) {
      spreadsheetSession.setActiveSheet(activeSheetId)
      spreadsheetSession.replaceSheetState(
        newActiveSheet,
        persistedRowsForNewSheet as Record<string, unknown>[],
        resolveKnownSheetVersion(activeSheetId)
      )
      spreadsheetSession.capturePersistedBaseline(activeSheetId)
    }
    workbookSnapshotThrottlePendingRef.current = false
    latestUniverDataRef.current =
      pendingUniverRows != null ? { data: pendingUniverRows.data, sheetId: activeSheetId } : null
    if (univerDataChangeTimeoutRef.current) {
      clearTimeout(univerDataChangeTimeoutRef.current)
      univerDataChangeTimeoutRef.current = null
    }
    if (pendingUniverRows && pendingUniverRows.data.length > persistedRowsForNewSheet.length) {
      scheduleCoalescedTimeout(univerDataChangeTimeoutRef, 0, () => {
        univerDataChangeTimeoutRef.current = null
        void chainOnOperationQueue(operationQueueRef, () => processUniverDataChangeRef.current())
      })
    }
  }, [activeSheetId, app.sheets, chainOnOperationQueue, resolveKnownSheetVersion, spreadsheetSession])

  const tableWorkbookStructureSignature = useMemo(
    () =>
      app.sheets
        .map(sheet => {
          const columnsSignature = sheet.columns
            .map(column =>
              [
                column.id,
                column.name,
                column.label ?? '',
                column.type,
                column.order,
                column.isVisible === false ? 'hidden' : 'visible'
              ].join('\u0000')
            )
            .join('\u0001')
          return [sheet.id, sheet.name, sheet.viewType ?? '', columnsSignature].join('\u0002')
        })
        .join('\u0003'),
    [app.sheets]
  )

  const tableUniverSnapshot = useMemo((): Record<string, unknown> | null => {
    if (!preferUniverNativeSheetTabs) return null
    const appSheetsForBootstrap = appSheetsRef.current
    const activeSheetIdForBootstrap = activeSheetIdRef.current
    // This snapshot is only consumed when Univer bootstraps/remounts. Native
    // tabs keep the workbook alive afterwards, so do not rebuild the full
    // workbook on every active-sheet or row mirror change.
    return buildMultiSheetWorkbookFromAppSheets({
      appSheets: appSheetsForBootstrap,
      activeSheetId: activeSheetIdForBootstrap,
      getRowsForSheet: (sheetId: string) => {
        const cached = authoritativePeerSheetDataCacheRef.current.has(sheetId)
          ? peerSheetDataCacheRef.current.get(sheetId)
          : undefined
        if (sheetId === activeSheetIdForBootstrap) {
          const activeRows = spreadsheetSessionRef.current?.getSheetState(sheetId)?.rows
          if (activeRows && activeRows.length > 0) return activeRows
          return cached ?? []
        }
        const sheet = appSheetsForBootstrap.find(entry => entry.id === sheetId)
        return cached ?? sortSpreadsheetRowsBySheetSettings(sheet?.data ?? [], sheet)
      },
      singleWorksheetBootstrap: bootstrapSnapshot,
      appId: app.id
    }) as unknown as Record<string, unknown>
  }, [preferUniverNativeSheetTabs, bootstrapSnapshot, bootstrapSnapshotSeed, tableWorkbookStructureSignature, app.id])

  const tableSnapshotSeed = useMemo(() => {
    if (!preferUniverNativeSheetTabs) return bootstrapSnapshotSeed
    // In multi-sheet-workbook mode Univer holds every worksheet in one snapshot
    // and handles switching internally (native sheet bar). Including
    // `activeSheetId` here would rebuild the seed on every tab click and
    // re-run the Univer init effect in UniverSheetGrid (it depends on
    // `props.snapshotSeed`), which is what was causing the white flash on
    // sheet switch. Only the bootstrap payload changing (app reload) should
    // reinitialise Univer.
    return `merged:${bootstrapSnapshotSeed}`
  }, [preferUniverNativeSheetTabs, bootstrapSnapshotSeed])

  const tableWorkbookInstanceKey = useMemo(() => {
    if (!preferUniverNativeSheetTabs) return `single:${app.id}:${activeSheetId}`
    // Only remount the Univer workbook when the app itself changes. Adding /
    // removing / renaming sheets is handled natively by Univer's commands +
    // the React-side sync effect; including sheet ids here would remount on
    // every "+" click and cause a big flash while Univer rebuilds.
    return `native:${app.id}`
  }, [preferUniverNativeSheetTabs, app.id, activeSheetId])

  // --- Versioning / Comments / Lock / Publishing ---

  // Called by useVersioning after a successful version restore.
  // The backend has already replaced all row data; we need to:
  //   1. Re-fetch the full app so we have the restored rows
  //   2. Wipe the stale Univer snapshot from localStorage (it reflects pre-restore data)
  //   3. Seed fresh rows into SpreadsheetSession / viewer bootstrap state
  //   4. Force Univer to reinitialise from the fresh rows (bump snapshotSeed with no snapshot)
  const handleVersionRestored = useCallback(async () => {
    // Always bump the seed at the end so Univer reinitialises even if individual
    // fetches below fail.  We track what we managed to load so we can provide the
    // best possible initialisation (snapshot > rows > empty).
    let restoredRows: Record<string, unknown>[] | null = null
    let restoredUniverSnapshot: Record<string, unknown> | null = null
    let freshApp: SpreadsheetApp | null = null

    // 1. Fetch fresh app data (rows + columns) from the backend.
    try {
      freshApp = await SpreadsheetApiService.getApp(app.id)
      if (freshApp) {
        clearUniverSnapshotCache(app.id)
        onAppUpdate?.(freshApp)
        const restoredSheet = freshApp.sheets.find(s => s.id === activeSheetId)
        restoredRows = restoredSheet?.data ?? []
        if (restoredSheet) {
          seedActiveSheetState(restoredSheet, restoredRows, {
            version: Number(restoredSheet.version ?? 0),
            setAsActive: true,
            markPersisted: true
          })
        } else {
          const fallbackSheet =
            freshApp.sheets.find(sheetEntry => sheetEntry.id === activeSheetId) ?? freshApp.sheets[0]
          if (fallbackSheet) {
            seedActiveSheetState(fallbackSheet, restoredRows ?? [], {
              version: Number(fallbackSheet.version ?? 0),
              setAsActive: true,
              markPersisted: true
            })
          } else {
            // Backend returned no sheet rows (e.g. empty `sheets` array). Prefer last-known
            // sheet metadata from props so session + baselines stay aligned with row data.
            const rows = restoredRows ?? []
            const sheetMeta =
              activeSheet?.id === activeSheetId ? activeSheet : app.sheets.find(s => s.id === activeSheetId)
            if (sheetMeta) {
              seedActiveSheetState(sheetMeta, rows, {
                version: Number(sheetMeta.version ?? 0),
                setAsActive: true,
                markPersisted: true
              })
            } else {
              commitLocalSheetDataRef.current?.(rows, {
                persisted: true,
                syncGrid: false,
                publishParent: false,
                peerAuthoritative: true,
                replaceSheetVersion: resolveKnownSheetVersion(activeSheetId)
              })
            }
          }
        }
      } else {
        console.warn('[SpreadsheetAppViewer] getApp returned null after restore; Univer will reinit with previous rows')
      }
    } catch (err) {
      console.warn('[SpreadsheetAppViewer] Could not fetch app after restore:', err)
    }

    // 2. Fetch the restored Univer snapshot (includes cell styling, merges, formulas).
    //    The backend wrote it to the sheet row during restoreToVersion; use it to boot
    //    Univer so the visual state matches the checkpoint exactly.
    try {
      const univerData = await SpreadsheetApiService.getUniverSnapshot(app.id)
      if (univerData?.snapshot && typeof univerData.snapshot === 'object') {
        workbookSnapshotCoversVersionsRef.current = mergeSnapshotCoversVersions(
          workbookSnapshotCoversVersionsRef.current,
          univerData.coversVersions
        )
        const sheetListForNormalize = freshApp?.sheets?.length ? freshApp.sheets : app.sheets
        let snap = normalizeWorkbookSnapshotToAppSheets(
          univerData.snapshot as Record<string, unknown>,
          sheetListForNormalize
        )
        snap = stripWorkbookSnapshotValuesPreservingFormatting(snap)
        const freshSheet = freshApp?.sheets.find(s => s.id === activeSheetId)
        const rowsForOverlay =
          restoredRows && freshSheet ? sortSpreadsheetRowsBySheetSettings(restoredRows, freshSheet) : null
        if (rowsForOverlay && freshSheet) {
          const merged = overlaySnapshotIfRowsMismatch(snap, activeSheetId, rowsForOverlay, freshSheet.columns)
          if (merged && merged !== snap) {
            debugLog('version restore: merged Univer snapshot with row-authoritative overlay', {
              appId: app.id,
              sheetId: activeSheetId
            })
            snap = merged
          }
        }
        restoredUniverSnapshot = snap
        writeUniverSnapshotCache(
          app.id,
          univerData.version,
          stripWorkbookSnapshotValuesPreservingFormatting(
            attachSnapshotCoversVersions(snap, workbookSnapshotCoversVersionsRef.current) ?? snap
          )
        )
      }
    } catch (e) {
      console.warn('[SpreadsheetAppViewer] Could not fetch restored Univer snapshot:', e)
    }

    // 3. Always reinitialise Univer regardless of what succeeded above.
    //    bootstrapSnapshot = null falls back to buildWorkbookSnapshot from rows.
    setBootstrapSnapshot(restoredUniverSnapshot)
    setBootstrapSnapshotSeed(`restore-${Date.now()}`)
    // Dim baselines are reseeded by `useSpreadsheetDimensionPersistence` when `bootstrapSnapshot`
    // updates to this newly set snapshot, so no manual reset needed here.
    sheetPersist.recordSuccess(true)
  }, [
    activeSheet,
    activeSheetId,
    app.id,
    app.sheets,
    onAppUpdate,
    resolveKnownSheetVersion,
    seedActiveSheetState,
    sheetPersist.recordSuccess
  ])

  const versioning = useVersioning({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService,
    autoSaveEnabled: true,
    autoSaveInterval: 30000,
    onVersionRestored: handleVersionRestored,
    onError: error => {
      if (error.name === 'VersionRestoreError') {
        toast.error(error.message)
      }
    },
    t: sheetT
  })
  const versionUserDisplayMap = useVersionUserDisplays(versioning.versions, accessToken)

  const headerSaveStatus = useMemo(
    () => ({
      versioning: {
        isSaving: versioning.isSaving || sheetPersist.isSaving,
        hasUnsavedChanges: versioning.hasUnsavedChanges || sheetPersist.hasLocalDirty || Boolean(sheetPersist.error),
        lastSaveTime: maxPersistDate(versioning.lastSaveTime, sheetPersist.lastPersistedAt)
      },
      persistenceError: sheetPersist.error
    }),
    [
      versioning.isSaving,
      versioning.lastSaveTime,
      versioning.hasUnsavedChanges,
      sheetPersist.isSaving,
      sheetPersist.hasLocalDirty,
      sheetPersist.lastPersistedAt,
      sheetPersist.error
    ]
  )

  /** Mirrors header “unsaved” / saving for synchronous beforeunload (React state is not readable there). */
  const leaveGuardVersioningUnsavedRef = useRef(false)
  const leaveGuardSheetDirtyRef = useRef(false)
  const leaveGuardSheetErrorRef = useRef<string | null>(null)
  const leaveGuardSheetSavingRef = useRef(false)
  useEffect(() => {
    leaveGuardVersioningUnsavedRef.current = versioning.hasUnsavedChanges
  }, [versioning.hasUnsavedChanges])
  useEffect(() => {
    leaveGuardSheetDirtyRef.current = sheetPersist.hasLocalDirty
    leaveGuardSheetErrorRef.current = sheetPersist.error
    leaveGuardSheetSavingRef.current = sheetPersist.isSaving
  }, [sheetPersist.hasLocalDirty, sheetPersist.error, sheetPersist.isSaving])

  const publishing = usePublishing({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentStatus: app.publishMetadata?.status || 'draft',
    apiService: SpreadsheetApiService
  })

  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // Bump snapshot seed so Univer reinitializes with fresh data.
  // Most callers want a rows-only rebuild (`snapshot = null`), but sheet-id
  // reconciliation may preserve visual workbook state. Values are still rebuilt
  // from rows after bootstrap.
  const requestGridRefresh = useCallback((snapshot?: Record<string, unknown> | null, seedOverride?: string) => {
    releaseRowMaterializationInFlightRef.current(activeSheetIdRef.current)
    const visualSnapshot =
      snapshot && typeof snapshot === 'object' ? stripWorkbookSnapshotValuesPreservingFormatting(snapshot) : null
    debugLog('requesting grid refresh', {
      snapshotMode: visualSnapshot ? 'provided-snapshot' : 'rows-only',
      snapshotSummary: summarizeWorkbookSnapshotForDebug(visualSnapshot, activeSheetIdRef.current)
    })
    setBootstrapSnapshot(visualSnapshot)
    setBootstrapSnapshotSeed(prev => seedOverride ?? `${prev}-refresh-${Date.now()}`)
  }, [])

  const remoteSyncConflictRecovery = useMemo(
    (): SpreadsheetRemoteSyncConflictRecovery => ({
      onRecoverSuccess: () => {
        sheetPersist.recordSuccess(true)
        versioning.markAsSaved()
      },
      onRecoverError: (message: string) => {
        sheetPersist.recordError(message)
      },
      translatePersistRecoveryFailed: () => sheetT('persist-recovery-failed')
    }),
    [sheetPersist.recordError, sheetPersist.recordSuccess, sheetT, versioning.markAsSaved]
  )

  const reapplyColumnVisibilityOnGrid = useCallback(
    (_sheetId: string, operations: Array<{ type: 'visibility_update'; data: Record<string, unknown> }>) => {
      for (const operation of operations) {
        spreadsheetGridRef.current?.applyRemoteSpreadsheetFeatureOperation?.(
          {
            type: operation.type,
            data: operation.data as unknown as SpreadsheetFeatureOperationPayload
          },
          { operationType: 'visibility_update' }
        )
      }
    },
    []
  )

  const spreadsheetLocalWorkGuard = useMemo(
    (): SpreadsheetLocalWorkGuard => ({
      hasUnresolvedLocalWorkForSheet: sheetId =>
        hasSpreadsheetUnresolvedLocalWork({
          intentJournal: spreadsheetIntentJournalRef.current,
          versionCausalOwnership: versionCausalOwnershipRef.current,
          sheetId
        }),
      listLocalIntentsForSheet: sheetId => spreadsheetIntentJournalRef.current.listIntents(sheetId),
      markLocalIntentsFailedForSheet: sheetId => spreadsheetIntentJournalRef.current.markSheetIntentsFailed(sheetId)
    }),
    []
  )

  const remoteSyncControllerParams = useMemo((): UseSpreadsheetRemoteSyncControllerParams => {
    return {
      appId: app.id,
      activeSheetId,
      activeSheet,
      preferUniverNativeSheetTabs,
      entityEnabled,
      activeSheetIdRef,
      appSheetsRef,
      workbookSnapshotVersionRef,
      workbookSnapshotCoversVersionsRef,
      pendingCreatedSheetSelectionRef,
      createdSheetIdAliasesRef,
      collaborationManagerRef,
      mutationFacadeRef,
      sheetsNeedingGridMaterializationRef,
      snapshotSaveMetricsRef,
      spreadsheetSession,
      enqueueDiagnosticsTraceEvent,
      activeTraceSessionRef,
      debugLog,
      rememberKnownSheetVersion,
      updateActiveSheetVersion,
      resolveKnownSheetVersion,
      syncSheetRowsIntoLocalState,
      setBootstrapSnapshot,
      requestGridRefresh,
      getKnownRowsForSheet,
      hasPendingCellPersistence,
      hasPendingPersistenceForSheet,
      hasTransientLocalGridStateForSheet,
      getActiveSessionVersion,
      sheetMetadataReloadEnabled: Boolean(onSheetUpdate),
      scheduleSheetVersionRefreshFromApiRef,
      conflictRecovery: remoteSyncConflictRecovery,
      reapplyColumnVisibilityOnGrid,
      flushDeferredDirtyCellsRef,
      localWorkGuard: spreadsheetLocalWorkGuard
    }
  }, [
    activeSheet,
    activeSheetId,
    app.id,
    spreadsheetLocalWorkGuard,
    activeTraceSessionRef,
    appSheetsRef,
    collaborationManagerRef,
    createdSheetIdAliasesRef,
    debugLog,
    enqueueDiagnosticsTraceEvent,
    entityEnabled,
    getActiveSessionVersion,
    getKnownRowsForSheet,
    hasPendingCellPersistence,
    hasPendingPersistenceForSheet,
    hasTransientLocalGridStateForSheet,
    mutationFacadeRef,
    onSheetUpdate,
    pendingCreatedSheetSelectionRef,
    preferUniverNativeSheetTabs,
    remoteSyncConflictRecovery,
    reapplyColumnVisibilityOnGrid,
    flushDeferredDirtyCellsRef,
    rememberKnownSheetVersion,
    requestGridRefresh,
    resolveKnownSheetVersion,
    scheduleSheetVersionRefreshFromApiRef,
    setBootstrapSnapshot,
    snapshotSaveMetricsRef,
    spreadsheetSession,
    syncSheetRowsIntoLocalState,
    updateActiveSheetVersion,
    workbookSnapshotCoversVersionsRef,
    workbookSnapshotVersionRef
  ])

  const {
    scheduleSheetVersionRefreshFromApi,
    scheduleRemoteStructuralResync,
    requestSheetDeltaCatchUp,
    recoverFromVersionConflict
  } = useSpreadsheetRemoteSyncController(remoteSyncControllerParams)

  useEffect(() => {
    const pending = pendingCreatedSheetReconciliationRef.current
    if (!pending) return
    if (!app.sheets.some(sheet => sheet.id === pending.persistedSheetId)) return
    pendingCreatedSheetReconciliationRef.current = null
    debugLog('reconciling created sheet ids after app update', {
      temporarySheetId: pending.temporarySheetId,
      persistedSheetId: pending.persistedSheetId,
      activeSheetId: activeSheetIdRef.current,
      appSheetIds: app.sheets.map(sheet => sheet.id)
    })
    const pendingCreatedSheetSelection = pendingCreatedSheetSelectionRef.current
    const shouldKeepCreatedSheetActive =
      pendingCreatedSheetSelection?.temporarySheetId === pending.temporarySheetId ||
      pendingCreatedSheetSelection?.persistedSheetId === pending.persistedSheetId ||
      activeSheetIdRef.current === pending.temporarySheetId
    if (shouldKeepCreatedSheetActive) {
      pendingCreatedSheetSelectionRef.current = {
        temporarySheetId: pending.temporarySheetId,
        persistedSheetId: pending.persistedSheetId
      }
      setActiveSheetId(pending.persistedSheetId)
    }
    debugLog('created sheet id reconciled without grid refresh', {
      temporarySheetId: pending.temporarySheetId,
      persistedSheetId: pending.persistedSheetId,
      activeSheetId: activeSheetIdRef.current
    })
  }, [app.sheets, setActiveSheetId])

  useEffect(() => {
    if (SPREADSHEET_GRID_AUTO_REFRESH_MS <= 0) return
    const id = globalThis.setInterval(() => {
      requestGridRefresh()
    }, SPREADSHEET_GRID_AUTO_REFRESH_MS)
    return () => globalThis.clearInterval(id)
  }, [requestGridRefresh])

  // --- Bulk row handlers (used by automation responses) ---
  const bulkRows = useSpreadsheetBulkRows({
    app,
    activeSheet: activeSheet ?? null,
    localSheetDataRef,
    canonicalActiveSheetRowsSourceRef,
    commitOptimisticActiveSheetRows,
    onDataChange,
    onAppUpdate,
    onSheetUpdate,
    onRowUpdate,
    onRowAdd: onRowAdd
      ? async (appId: string, sheetId: string, rowData: Record<string, unknown>) => {
          return (await onRowAdd(appId, sheetId, rowData)) ?? {}
        }
      : undefined,
    saveTimeoutRef,
    onRequestGridRefresh: requestGridRefresh
  })

  const collectionHeaderColumnSignature = useMemo(() => {
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    return (
      sheet?.columns
        ?.filter(c => c.isVisible !== false)
        .map(c => `${c.id}\0${(c.label ?? '').trim()}\0${c.name}`)
        .join('|') ?? ''
    )
  }, [app.sheets, activeSheetId])

  /** Re-run header sync when row data hydrates (tracking header row appears), not only on mount. */
  const collectionTrackingHeaderSyncKey = useMemo(() => {
    const rows = spreadsheetSession.getSheetState(activeSheetId)?.rows ?? []
    const idx = rows.findIndex(r => r._isTrackingHeader === true)
    return idx >= 0 ? `${idx}:${rows.length}` : 'none'
  }, [activeSheetId, spreadsheetSession, spreadsheetSessionSnapshot])

  // Collection sheets store human-readable titles in a synthetic header row; keep it in sync when column labels load/update.
  // Univer bootstraps from persisted snapshots and does not follow React `data` edits until snapshotSeed bumps — refresh when snapshot titles are stale.
  useEffect(() => {
    const sheet = app.sheets.find(s => s.id === activeSheetId)
    if (!sheet?.columns?.length) return
    const rows = getActiveSessionRows()
    if (!rows.some(r => r._isTrackingHeader === true)) return
    const synced = syncTrackingHeaderRowWithColumnLabels(rows, sheet.columns)
    const dataForGrid = synced === rows ? rows : synced
    if (synced !== rows) {
      commitLocalSheetData(synced, { persisted: false, syncGrid: false, publishParent: true })
    }
    if (entityEnabled || isBootstrapSnapshotLoading) return
    const snapshotForCompare = preferUniverNativeSheetTabs ? tableUniverSnapshot : bootstrapSnapshot
    if (!snapshotForCompare || typeof snapshotForCompare !== 'object') return
    if (
      snapshotTrackingHeaderMatchesColumnLabels(
        snapshotForCompare as Record<string, unknown>,
        activeSheetId,
        dataForGrid,
        sheet.columns
      )
    ) {
      return
    }
    const headerIdx = dataForGrid.findIndex(row => row._isTrackingHeader === true)
    if (headerIdx < 0) return
    const visibleColumns = sheet.columns.filter(column => column.isVisible !== false)
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const patchTrackingHeaderRow = (attempt: number) => {
      if (cancelled) return
      const grid = spreadsheetGridRef.current
      if (!grid) {
        if (attempt < 6) {
          retryTimer = globalThis.setTimeout(() => patchTrackingHeaderRow(attempt + 1), 75)
        }
        return
      }
      const headerRow = dataForGrid[headerIdx] ?? {}
      visibleColumns.forEach((column, colIndex) => {
        const expected = (
          String(headerRow[column.name] ?? '').trim() || String(headerRow[column.id] ?? '').trim()
        ).trim()
        if (!expected) return
        grid.applyRemoteCellUpdate(headerIdx, colIndex, expected)
      })
    }
    patchTrackingHeaderRow(0)
    return () => {
      cancelled = true
      if (retryTimer) {
        globalThis.clearTimeout(retryTimer)
      }
    }
  }, [
    activeSheetId,
    app.sheets,
    bootstrapSnapshot,
    collectionHeaderColumnSignature,
    collectionTrackingHeaderSyncKey,
    commitLocalSheetData,
    entityEnabled,
    getActiveSessionRows,
    isBootstrapSnapshotLoading,
    preferUniverNativeSheetTabs,
    tableUniverSnapshot
  ])

  // Persist automations/workflow links back into the sheet config
  const persistSheetPatch = useCallback(
    (patch: Partial<SpreadsheetSheet>) => {
      if (onSheetUpdate) {
        void requireMutationFacade().updateSheetMetadata(activeSheetId, patch)
        return
      }
      if (!onLocalAppUpdate && !onAppUpdate) return
      applyLocalAppUpdate(currentApp => ({
        ...currentApp,
        sheets: currentApp.sheets.map(sheet =>
          sheet.id === activeSheetId ? { ...sheet, ...patch, data: getActiveSessionRows() } : sheet
        )
      }))
    },
    [
      activeSheetId,
      applyLocalAppUpdate,
      getActiveSessionRows,
      onAppUpdate,
      onLocalAppUpdate,
      onSheetUpdate,
      requireMutationFacade
    ]
  )

  const automations = useSpreadsheetAutomations({
    spreadsheetId: app.id,
    sheetId: activeSheetId,
    accessToken,
    currentUserId: userId || '',
    initialAutomations: activeSheet.automations || [],
    initialWorkflowLinks: activeSheet.workflowLinks || [],
    onAutomationsChange: newAutomations => persistSheetPatch({ automations: newAutomations }),
    onWorkflowLinksChange: newLinks => persistSheetPatch({ workflowLinks: newLinks }),
    onAddRows: bulkRows.handleAddRows,
    onUpdateRows: bulkRows.handleUpdateRows,
    enablePolling: true,
    pollInterval: 30000
  })

  const {
    hasEnabledSheetCollectionAutomation,
    handleCheckCollectionResponses,
    isCollectionCopy,
    collectionSubmittedAt,
    onSubmitCollection
  } = useSpreadsheetCollectionSubmission({
    app,
    userId,
    activeSheet,
    mutationFacadeRef,
    onAppUpdate,
    onBack,
    getActiveSessionRows,
    completeExcelCollectionTask: automations.completeExcelCollectionTask,
    hasExcelCollectionTaskForApp: automations.hasExcelCollectionTaskForApp,
    fetchBulkCollectionResponses: automations.fetchBulkCollectionResponses,
    translateSubmitSuccess: () => sheetT('toast-submit-success'),
    translateSubmitFailed: () => sheetT('toast-submit-failed')
  })

  const {
    isAutomationsOpen,
    isAnalyticsOpen,
    isSheetsAIOpen,
    analyticsInitialTab,
    sheetsAIInitialTab,
    handleOpenAICapability,
    openAnalyticsPanel,
    openAutomationsPanel,
    closeAutomationsPanel,
    closeAnalyticsPanel,
    closeSheetsAIPanel
  } = useSpreadsheetSidePanelState({
    accessToken,
    activeSheetId,
    refreshAutomationsFromDocumentService: automations.refreshAutomationsFromDocumentService
  })
  const {
    openDiagnosticsDialog,
    onDiagnosticsDialogOpenChange,
    startDiagnosticsTrace,
    stopDiagnosticsTrace,
    refreshDiagnosticsTraceData,
    clearDisplayedDiagnosticsData,
    selectDiagnosticsTraceSession
  } = useSpreadsheetDiagnosticsDialogActions({
    setIsDiagnosticsDialogOpen,
    startDiagnosticsTraceSession,
    stopDiagnosticsTraceSession,
    refreshDiagnosticsData,
    setSelectedTraceSessionId,
    setTraceEvents: setTraceEvents as any,
    setTraceFindings: setTraceFindings as any
  })
  const [isExporting, setIsExporting] = useState(false)

  const trackSnapshotCellClears = useCallback((sheetId: string, cells: SnapshotCellCoordinate[]) => {
    appendPendingSnapshotClearCoordinates(pendingSnapshotClearCellsRef.current, sheetId, cells)
  }, [])

  const forgetSnapshotCellClears = useCallback((sheetId: string, cells: SnapshotCellCoordinate[]): number => {
    return removePendingSnapshotClearCoordinates(pendingSnapshotClearCellsRef.current, sheetId, cells)
  }, [])

  /** Remote ops can arrive before Univer attaches gridRef; retry so tab-to-tab sync is not dropped. */
  const applyRemoteCellUpdateWithRetry = useCallback(
    (rowIndex: number, colIndex: number, value: unknown, rowId?: string, options?: ApplyRemoteCellUpdateOptions) => {
      if (isExplicitSnapshotCellClearValue(value)) {
        trackSnapshotCellClears(activeSheetIdRef.current, [{ row: rowIndex, col: colIndex }])
      } else if (value !== undefined) {
        forgetSnapshotCellClears(activeSheetIdRef.current, [{ row: rowIndex, col: colIndex }])
      }
      const maxAttempts = 12
      const delayMs = 75
      const tryApply = (attempt: number) => {
        const grid = spreadsheetGridRef.current
        if (grid) {
          grid.applyRemoteCellUpdate(rowIndex, colIndex, value, rowId, options)
          enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'grid_remote_apply_started',
            traceSessionId: options?.diagnosticTraceSessionId ?? null,
            traceId: options?.diagnosticTraceId ?? null,
            batchId: options?.diagnosticBatchId ?? null,
            operationType: options?.diagnosticOperationType ?? null,
            payload: {
              rowIndex,
              colIndex,
              rowId: rowId ?? null,
              hasUniverCell: Boolean(options?.univerCell),
              hasUniverStyles: Boolean(options?.univerStyles)
            }
          })
          return
        }
        if (attempt + 1 >= maxAttempts) {
          enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'grid_remote_apply_failed',
            severity: 'error',
            traceSessionId: options?.diagnosticTraceSessionId ?? null,
            traceId: options?.diagnosticTraceId ?? null,
            batchId: options?.diagnosticBatchId ?? null,
            operationType: options?.diagnosticOperationType ?? null,
            payload: {
              reason: 'grid_unavailable_after_retries',
              rowIndex,
              colIndex,
              rowId: rowId ?? null
            }
          })
          return
        }
        globalThis.setTimeout(() => tryApply(attempt + 1), delayMs)
      }
      tryApply(0)
    },
    [enqueueDiagnosticsTraceEvent, forgetSnapshotCellClears, trackSnapshotCellClears]
  )

  const markSheetNeedsGridMaterialization = useCallback(
    (sheetId: string, reason: string) => {
      const resolvedSheetId = resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current)
      if (!resolvedSheetId || resolvedSheetId === activeSheetIdRef.current) return
      sheetsNeedingGridMaterializationRef.current.set(resolvedSheetId, reason)
      spreadsheetSession.markSheetNeedsGridMaterialization(resolvedSheetId, reason)
      debugLog('sheet marked for grid materialization', { sheetId: resolvedSheetId, reason })
    },
    [spreadsheetSession]
  )

  const ensureRemoteSheetInLiveWorkbook = useCallback(
    (rawSheet: Record<string, unknown> | undefined, requestedIndex?: number): void => {
      if (!preferUniverNativeSheetTabs || !rawSheet) return
      const sheetId = typeof rawSheet.id === 'string' ? rawSheet.id : ''
      const sheetName = typeof rawSheet.name === 'string' && rawSheet.name.trim() ? rawSheet.name.trim() : 'Sheet'
      if (!sheetId) return

      const sheet = rawSheet as unknown as SpreadsheetSheet
      const worksheetSnapshot =
        rawSheet.worksheetSnapshot && typeof rawSheet.worksheetSnapshot === 'object'
          ? (rawSheet.worksheetSnapshot as Record<string, unknown>)
          : undefined
      const fallbackColumns =
        appSheetsRef.current.find(entry => entry.id === activeSheetIdRef.current)?.columns ??
        appSheetsRef.current[0]?.columns ??
        []
      const columns = Array.isArray(sheet.columns) ? sheet.columns : fallbackColumns
      const data = Array.isArray(sheet.data)
        ? (sheet.data as Record<string, unknown>[])
        : mapPersistedRowsToViewerRows(rawSheet.rows)
      const maxAttempts = 12
      const delayMs = 75
      const tryEnsure = (attempt: number) => {
        const ensured = spreadsheetGridRef.current?.ensureWorksheetExists?.(
          {
            ...sheet,
            id: sheetId,
            name: sheetName,
            columns,
            data
          },
          data,
          columns,
          {
            index: requestedIndex ?? appSheetsRef.current.length,
            activate: false,
            replaceExisting: Boolean(worksheetSnapshot),
            worksheetSnapshot
          }
        )
        if (ensured) {
          enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_remote_sheet_created_materialized',
            traceSessionId: activeTraceSessionRef.current?.id ?? null,
            payload: {
              sheetId,
              sheetName,
              attempt
            }
          })
          return
        }
        if (attempt + 1 >= maxAttempts) {
          enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_remote_sheet_created_materialize_failed',
            severity: 'warning',
            traceSessionId: activeTraceSessionRef.current?.id ?? null,
            payload: {
              sheetId,
              sheetName,
              reason: 'grid_unavailable_or_insert_failed'
            }
          })
          return
        }
        globalThis.setTimeout(() => tryEnsure(attempt + 1), delayMs)
      }
      tryEnsure(0)
    },
    [enqueueDiagnosticsTraceEvent, preferUniverNativeSheetTabs]
  )

  const renameRemoteSheetInLiveWorkbook = useCallback(
    (sheetId: string | undefined, sheetName: string | undefined): void => {
      if (!preferUniverNativeSheetTabs || !sheetId || !sheetName) return
      const renamed = spreadsheetGridRef.current?.renameWorksheet?.(sheetId, sheetName)
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: renamed ? 'client_remote_sheet_renamed_materialized' : 'client_remote_sheet_renamed_materialize_failed',
        severity: renamed ? undefined : 'warning',
        traceSessionId: activeTraceSessionRef.current?.id ?? null,
        payload: {
          sheetId,
          sheetName
        }
      })
    },
    [enqueueDiagnosticsTraceEvent, preferUniverNativeSheetTabs]
  )

  const removeRemoteSheetFromLiveWorkbook = useCallback(
    (sheetId: string | undefined): void => {
      if (!preferUniverNativeSheetTabs || !sheetId) return
      const removed = spreadsheetGridRef.current?.removeWorksheet?.(sheetId)
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: removed ? 'client_remote_sheet_deleted_materialized' : 'client_remote_sheet_deleted_materialize_failed',
        severity: removed ? undefined : 'warning',
        traceSessionId: activeTraceSessionRef.current?.id ?? null,
        payload: {
          sheetId
        }
      })
    },
    [enqueueDiagnosticsTraceEvent, preferUniverNativeSheetTabs]
  )

  const setRemoteSheetVisibilityInLiveWorkbook = useCallback(
    (sheetId: string | undefined, hidden: boolean | undefined, options?: { syncActiveSheet?: boolean }): void => {
      if (!preferUniverNativeSheetTabs || !sheetId || typeof hidden !== 'boolean') return
      const applied = spreadsheetGridRef.current?.setWorksheetVisibility?.(sheetId, hidden) ?? false
      if (options?.syncActiveSheet && hidden && activeSheetIdRef.current === sheetId) {
        const nextActiveSheetId = app.sheets.find(sheet => sheet.id !== sheetId && sheet.hidden !== true)?.id
        if (nextActiveSheetId) {
          setActiveSheetId(nextActiveSheetId)
        }
      }
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: applied
          ? 'client_remote_sheet_visibility_materialized'
          : 'client_remote_sheet_visibility_materialize_failed',
        severity: applied ? undefined : 'warning',
        traceSessionId: activeTraceSessionRef.current?.id ?? null,
        payload: {
          sheetId,
          hidden
        }
      })
    },
    [app.sheets, enqueueDiagnosticsTraceEvent, preferUniverNativeSheetTabs, setActiveSheetId]
  )

  // --- Collaboration (header presence + Univer grid operations/cursors) ---
  const fetchSheetReplaySince = useCallback(
    async (sheetId: string, sinceVersion: number): Promise<SpreadsheetReplayResponse> =>
      fetchSpreadsheetSheetReplaySince(app.id, sheetId, sinceVersion, {
        traceSessionId: activeTraceSessionRef.current?.id,
        sessionId: diagnosticsBrowserSessionIdRef.current,
        tabId: diagnosticsTabIdRef.current
      }),
    [app.id]
  )

  // Ref for getBackendRowIdForUiRowId — defined later, but the manager reads it lazily via
  // the callbacks ref, so the actual function is always current by the time an operation fires.
  const getBackendRowIdForUiRowIdRef = useRef<(uiRowId: string, univerRow?: number) => string | undefined>(
    () => undefined
  )
  const isRowMaterializationInFlightRef = useRef<(sheetId: string) => boolean>(() => false)
  const releaseRowMaterializationInFlightRef = useRef<(sheetId: string) => void>(() => undefined)
  const applyCommittedCommentAnchorPatchesRef = useRef<(patches: Array<{ id: string }>) => void>(() => undefined)
  const getCurrentWorkbookSnapshot = useCallback((): Record<string, unknown> | null => {
    const sessionSnapshot = spreadsheetSession.getState().workbookSnapshot
    if (sessionSnapshot && typeof sessionSnapshot === 'object') {
      return sessionSnapshot as Record<string, unknown>
    }
    return (spreadsheetGridRef.current?.getWorkbookSnapshot?.() as Record<string, unknown> | null) ?? null
  }, [spreadsheetSession])
  const applyCommittedWorksheetMetadataPatch = useCallback(
    (patch: { sheetId: string; keys: Record<string, unknown> }) => {
      const currentSnapshot = getCurrentWorkbookSnapshot()
      if (!currentSnapshot) return
      const nextSnapshot = cloneSnapshot(currentSnapshot) as Record<string, unknown>
      const sheets = nextSnapshot.sheets
      if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return
      const nextSheets = sheets as Record<string, unknown>
      const currentSheet = nextSheets[patch.sheetId]
      if (!currentSheet || typeof currentSheet !== 'object' || Array.isArray(currentSheet)) return
      const nextSheet = { ...(currentSheet as Record<string, unknown>) }
      const previousMergeRanges = Array.isArray((currentSheet as Record<string, unknown>).mergeData)
        ? (cloneSnapshot((currentSheet as Record<string, unknown>).mergeData) as Array<{
            startRow: number
            endRow: number
            startColumn: number
            endColumn: number
          }>)
        : []
      for (const [key, value] of Object.entries(patch.keys)) {
        if (value === null) {
          delete nextSheet[key]
          continue
        }
        nextSheet[key] = cloneSnapshot(value)
      }
      nextSheets[patch.sheetId] = nextSheet
      const nextMergeRanges = Array.isArray(nextSheet.mergeData)
        ? (cloneSnapshot(nextSheet.mergeData) as Array<{
            startRow: number
            endRow: number
            startColumn: number
            endColumn: number
          }>)
        : []
      if (Object.prototype.hasOwnProperty.call(patch.keys, 'mergeData')) {
        spreadsheetGridRef.current?.applyCommittedWorksheetMergePatch?.(
          patch.sheetId,
          previousMergeRanges,
          nextMergeRanges
        )
      }
      spreadsheetSession.updateWorkbookSnapshot(nextSnapshot, workbookSnapshotVersionRef.current)
    },
    [getCurrentWorkbookSnapshot, spreadsheetSession, workbookSnapshotVersionRef]
  )
  const applyCommittedCommentAnchorPatches = useCallback(
    (patches: Array<{ id: string }>) => applyCommittedCommentAnchorPatchesRef.current(patches),
    []
  )

  // Collaboration callbacks wired from the viewer into SpreadsheetCollaborationManager
  const collaborationCallbacks = useMemo(
    (): SpreadsheetCollaborationCallbacks =>
      buildSpreadsheetCollaborationCallbacks({
        spreadsheetSession,
        activeSheet,
        appSheetsRef,
        peerSheetDataCacheRef,
        authoritativePeerSheetDataCacheRef,
        getBackendRowIdForUiRowIdRef,
        activeSheetId,
        commitLocalSheetData,
        syncSheetRowsIntoLocalState,
        applyRemoteCellUpdateWithRetry,
        activeSheetIdRef,
        spreadsheetGridRef,
        getWorkbookSnapshot: getCurrentWorkbookSnapshot,
        applyCommittedWorksheetMetadataPatch,
        applyCommittedCommentAnchorPatches,
        recentLocalRowHeightRef,
        recentLocalColWidthRef,
        baselineRowHeightsRef,
        baselineColWidthsRef,
        updateActiveSheetVersion,
        rememberSheetVersion,
        applyLocalAppUpdate,
        structuralWsDedupRef,
        ensureRemoteSheetInLiveWorkbook,
        renameRemoteSheetInLiveWorkbook,
        removeRemoteSheetFromLiveWorkbook,
        setRemoteSheetVisibilityInLiveWorkbook,
        mapPersistedRowsToViewerRows,
        onAppRefreshNeeded,
        appId: app.id,
        markSheetNeedsGridMaterialization,
        requestSheetDeltaCatchUp,
        scheduleSheetVersionRefreshFromApi,
        scheduleRemoteStructuralResync,
        handleRemoteColumnUpdate,
        mutationFacadeRef,
        fetchSheetReplaySince,
        isSpreadsheetAppsDebugEnabled,
        enqueueDiagnosticsTraceEvent,
        sheetT,
        debugLog,
        setActiveSheetId,
        getActiveSessionRows,
        resolveKnownSheetVersion,
        coordinateForceGridReapply: scheduleCoordinatedAuthoritativeRepair,
        createdSheetIdAliasesRef,
        isRecentLocalBatchId,
        getSheetWorkQueue: () => sheetWorkQueueAccessorRef.current,
        isRowMaterializationInFlight: sheetId => isRowMaterializationInFlightRef.current(sheetId),
        versionCausalOwnershipRef,
        liveRemoteApplyVersionRef
      }),
    [
      activeSheetId,
      activeSheet.columns,
      app.id,
      applyLocalAppUpdate,
      applyRemoteCellUpdateWithRetry,
      commitLocalSheetData,
      ensureRemoteSheetInLiveWorkbook,
      fetchSheetReplaySince,
      handleRemoteColumnUpdate,
      markSheetNeedsGridMaterialization,
      onAppRefreshNeeded,
      getCurrentWorkbookSnapshot,
      rememberSheetVersion,
      removeRemoteSheetFromLiveWorkbook,
      renameRemoteSheetInLiveWorkbook,
      setRemoteSheetVisibilityInLiveWorkbook,
      requestSheetDeltaCatchUp,
      resolveKnownSheetVersion,
      createdSheetIdAliasesRef,
      isRecentLocalBatchId,
      setActiveSheetId,
      spreadsheetSession,
      syncSheetRowsIntoLocalState,
      applyCommittedWorksheetMetadataPatch,
      applyCommittedCommentAnchorPatches,
      scheduleRemoteStructuralResync,
      scheduleSheetVersionRefreshFromApi,
      sheetT,
      updateActiveSheetVersion,
      enqueueDiagnosticsTraceEvent,
      getActiveSessionRows,
      scheduleCoordinatedAuthoritativeRepair
    ]
  )

  const collaboration = useSpreadsheetCollaboration({
    appId: app.id,
    accessToken,
    disabled: isTrashedApp,
    callbacks: collaborationCallbacks,
    shouldIgnoreReceivedOperation: shouldIgnoreRecentlyCommittedOperation
  })

  emitDimensionSyncRef.current = () => {
    // Dimensions persist via HTTP batch (`set_row_height` / `set_col_width`) and
    // fan-out through `batch_operations` — no P2P `dimension_sync` relay.
  }

  collaborationManagerRef.current = collaboration.manager
  collaborationHealthRef.current = collaboration.collaborationHealth
  isCollaborationJoinedRef.current = collaboration.isCollaborationJoined
  isCollaborationConnectedRef.current = collaboration.isCollaborationConnected

  const comments = useComments({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    socket: collaboration.socket,
    apiService: SpreadsheetApiService,
    autoRefreshInterval: collaboration.socket ? 0 : 30000
  })
  applyCommittedCommentAnchorPatchesRef.current = comments.applyCommentAnchorPatches

  const getSelectedCellRef = useCallback(
    (): string | null =>
      spreadsheetGridRef.current?.getActiveSelectionReference?.() ??
      spreadsheetGridRef.current?.getActiveCellReference?.() ??
      null,
    []
  )

  const focusCommentCellReference = useCallback(
    (cellReference: string, sheetId?: string): boolean =>
      spreadsheetGridRef.current?.focusCellReference?.(cellReference, sheetId) ?? false,
    []
  )

  const commentAuthorUserIds = useMemo(() => {
    const ids = new Set<string>()
    for (const comment of comments.comments) {
      if (comment.createdBy) {
        ids.add(comment.createdBy)
      }
    }
    return [...ids]
  }, [comments.comments])

  const commentUserDisplayMap = useVersionUserDisplays([], accessToken, commentAuthorUserIds)

  const spreadsheetCommentSidebar = useSpreadsheetCommentSidebar({
    comments,
    activeSheetId,
    showComments,
    setShowComments,
    getSelectedCellRef,
    focusCellReference: focusCommentCellReference,
    commentUserDisplayMap,
    currentUserId: userId,
    currentUserAvatar: collaboration.currentUserAvatar
  })

  const commentedCells = useMemo(() => {
    const roots = spreadsheetCommentSidebar.filteredComments
      .filter(comment => {
        return (
          comment.type === 'cell' &&
          !comment.parentId &&
          !comment.resolvedAt &&
          typeof comment.cellReference === 'string' &&
          comment.cellReference.trim().length > 0
        )
      })
      .map(comment => ({
        cellReference: comment.cellReference!.trim().toUpperCase(),
        content: String(comment.content || ''),
        createdByName: comment.createdByName,
        createdByAvatar: comment.createdByAvatar,
        createdAt: comment.createdAt
      }))
    const latestByCell = new Map<
      string,
      { cellReference: string; content: string; createdByName?: string; createdByAvatar?: string; createdAt?: string }
    >()
    for (const comment of roots) {
      const existing = latestByCell.get(comment.cellReference)
      if (!existing) {
        latestByCell.set(comment.cellReference, comment)
        continue
      }
      const existingTs = existing.createdAt ? Date.parse(existing.createdAt) : 0
      const nextTs = comment.createdAt ? Date.parse(comment.createdAt) : 0
      if (nextTs >= existingTs) {
        latestByCell.set(comment.cellReference, comment)
      }
    }
    return Array.from(latestByCell.values())
  }, [spreadsheetCommentSidebar.filteredComments])

  const handleOpenCommentRequest = useCallback(() => {
    spreadsheetCommentSidebar.openCommentsSidebar()
  }, [spreadsheetCommentSidebar])

  useSpreadsheetRemoteSyncCollaborationEffects({
    preferUniverNativeSheetTabs,
    entityEnabled,
    appId: app.id,
    appIsShared: app.isShared,
    activeSheetId,
    activeSheetIdRef,
    collaborationJoined: collaboration.isCollaborationJoined,
    collaborationConnected: collaboration.isCollaborationConnected,
    requestSheetDeltaCatchUp,
    rememberKnownSheetVersion,
    rememberSheetVersion,
    scheduleSheetVersionRefreshFromApi,
    hasPendingPersistenceForSheet,
    commitLocalSheetData,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    createdSheetIdAliasesRef,
    pendingCreatedSheetSelectionRef,
    appSheetsRef
  })

  useEffect(() => {
    const materializationReason = sheetsNeedingGridMaterializationRef.current.get(activeSheetId)
    if (!materializationReason) return

    const timeoutId = globalThis.setTimeout(() => {
      if (activeSheetIdRef.current !== activeSheetId) return
      sheetsNeedingGridMaterializationRef.current.delete(activeSheetId)
      spreadsheetSessionRef.current?.clearSheetGridMaterialization(activeSheetId)
      spreadsheetGridRef.current?.forceAuthoritativeReapply?.(null, {
        allowFullGridReapply: true,
        clearAllSignatures: true,
        preferBulk: true,
        reason: 'sheet_grid_materialization'
      })
      debugLog('forced grid materialization for activated sheet', {
        sheetId: activeSheetId,
        reason: materializationReason
      })
    }, 0)

    return () => globalThis.clearTimeout(timeoutId)
  }, [activeSheetId])

  // Seed the manager's version tracker so delta reconciliation has a baseline
  useEffect(() => {
    collaboration.manager.setLastKnownVersion(getActiveSessionVersion())
  }, [collaboration.manager, activeSheetId, getActiveSessionVersion])

  useEffect(() => {
    if (!isSpreadsheetAppsDebugEnabled()) return
    const emit = () => {
      debugLog('versions heartbeat', {
        appId: app.id,
        sheetId: activeSheetId,
        sheetOpsVersion: getActiveSessionVersion(),
        workbookSnapshotCheckpointVersion: workbookSnapshotVersionRef.current,
        collaborationLastKnownOpsVersion: collaboration.manager.getLastKnownVersion(),
        sheetMetaVersionFromAppState: activeSheet.version
      })
    }
    emit()
    const timerId = globalThis.setInterval(emit, SPREADSHEET_VERSION_DEBUG_HEARTBEAT_MS)
    return () => globalThis.clearInterval(timerId)
  }, [
    activeSheet.version,
    activeSheetId,
    app.id,
    collaboration.manager,
    getActiveSessionVersion,
    workbookSnapshotVersionRef
  ])

  /** Dev/MCP read helpers (Playwright Gate 3). Cell edits stay on the Univer canvas. */
  useEffect(() => {
    if (!isSpreadsheetAppsDebugEnabled()) return
    type McpHost = typeof globalThis & {
      __spreadsheetMcpTraceBuffer?: Array<Record<string, unknown>>
      __spreadsheetCollabE2e?: {
        clearTraceBuffer: () => void
        getTraceBuffer: () => Array<Record<string, unknown>>
        readGridValues: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
        getActiveCellA1: () => string | null
      }
    }
    const host = globalThis as McpHost
    host.__spreadsheetMcpTraceBuffer = host.__spreadsheetMcpTraceBuffer ?? []
    host.__spreadsheetCollabE2e = {
      clearTraceBuffer: () => {
        host.__spreadsheetMcpTraceBuffer = []
      },
      getTraceBuffer: () => [...(host.__spreadsheetMcpTraceBuffer ?? [])],
      readGridValues: (rowCount, colCount) =>
        spreadsheetGridRef.current?.getVisibleRangeValues?.(rowCount, colCount) ?? null,
      getActiveCellA1: () => spreadsheetGridRef.current?.getActiveCellReference?.() ?? null
    }
    return () => {
      delete host.__spreadsheetCollabE2e
    }
  }, [activeSheetId])

  useEffect(() => {
    const targetSheetId = activeSheetId
    const timeoutId = globalThis.setTimeout(() => {
      if (targetSheetId !== activeSheetIdRef.current) return
      collaboration.manager.flushDeferredCellsChangedForSheet(targetSheetId)
    }, 0)
    return () => globalThis.clearTimeout(timeoutId)
  }, [activeSheetId, collaboration.manager])

  useEffect(() => {
    const sock = collaboration.socket
    if (!sock) return
    const onConnect = () => {
      setSocketDebugInfo(prev => ({
        ...prev,
        connectCount: prev.connectCount + 1,
        lastConnectAt: Date.now(),
        transport: (sock as any).io?.engine?.transport?.name ?? '',
        socketId: sock.id ?? ''
      }))
    }
    const onDisconnect = (reason: string) => {
      setSocketDebugInfo(prev => ({
        ...prev,
        disconnectCount: prev.disconnectCount + 1,
        lastDisconnectAt: Date.now(),
        lastDisconnectReason: reason
      }))
    }
    const onReconnect = () => {
      setSocketDebugInfo(prev => ({
        ...prev,
        reconnectCount: prev.reconnectCount + 1,
        lastConnectAt: Date.now(),
        transport: (sock as any).io?.engine?.transport?.name ?? '',
        socketId: sock.id ?? ''
      }))
    }
    const onConnectError = () => {
      setSocketDebugInfo(prev => ({
        ...prev,
        connectErrorCount: prev.connectErrorCount + 1
      }))
    }
    sock.on('connect', onConnect)
    sock.on('disconnect', onDisconnect)
    sock.on('connect_error', onConnectError)
    sock.io?.on('reconnect', onReconnect)
    if (sock.connected) {
      setSocketDebugInfo(prev => ({
        ...prev,
        connectCount: prev.connectCount > 0 ? prev.connectCount : 1,
        lastConnectAt: prev.lastConnectAt ?? Date.now(),
        transport: (sock as any).io?.engine?.transport?.name ?? '',
        socketId: sock.id ?? ''
      }))
    }
    return () => {
      sock.off('connect', onConnect)
      sock.off('disconnect', onDisconnect)
      sock.off('connect_error', onConnectError)
      sock.io?.off('reconnect', onReconnect)
    }
  }, [collaboration.socket])

  const fileLock = useFileLock({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentUserId: userId,
    apiService: SpreadsheetApiService,
    // Keep a low-frequency polling fallback; primary updates are socket-driven.
    autoRefreshInterval: 15000,
    realtimeSocket: collaboration.socket,
    blockEditingUntilLockResolved: true
  })
  const canEditWithLock = isEditing && !entityEnabled && fileLock.canEdit
  canEditWithLockRef.current = canEditWithLock

  /**
   * Synchronous write of the live Univer workbook to localStorage so a fast close/reload can still
   * restore styles from cache while the async HTTP snapshot is in flight or aborted.
   */
  const cacheLiveUniverSnapshotRef = useRef<() => void>(() => {})
  const cacheLiveUniverSnapshotToLocalStorageBestEffort = useCallback(() => {
    if (entityEnabledRef.current || !canEditWithLockRef.current) return
    const sheetId = activeSheetIdRef.current
    if (!sheetId) return
    try {
      const raw = spreadsheetGridRef.current?.getWorkbookSnapshot?.()
      if (!raw || typeof raw !== 'object') return
      const version = Math.max(0, Math.trunc(Number(workbookSnapshotVersionRef.current ?? 0)))
      const snapshotWithCoverage = attachSnapshotCoversVersions(
        cloneSnapshot(raw) as Record<string, unknown>,
        workbookSnapshotCoversVersionsRef.current
      )
      writeUniverSnapshotCache(
        app.id,
        version,
        stripWorkbookSnapshotValuesPreservingFormatting(
          snapshotWithCoverage ?? (cloneSnapshot(raw) as Record<string, unknown>)
        )
      )
    } catch (err) {
      console.warn('[SpreadsheetAppViewer] Emergency snapshot localStorage cache failed:', err)
    }
  }, [app.id])
  cacheLiveUniverSnapshotRef.current = cacheLiveUniverSnapshotToLocalStorageBestEffort

  const effectiveGridColumns = useMemo(() => {
    const overrideEntries = Object.entries(pendingColumnWidthOverrides)
    if (overrideEntries.length === 0) return activeSheet.columns
    return activeSheet.columns.map(column => {
      const overrideWidth = pendingColumnWidthOverrides[column.id]
      if (typeof overrideWidth !== 'number' || !Number.isFinite(overrideWidth) || overrideWidth <= 0) {
        return column
      }
      const currentWidth =
        typeof column.width === 'number' && Number.isFinite(column.width) ? Math.round(column.width) : undefined
      if (currentWidth === Math.round(overrideWidth)) return column
      return { ...column, width: overrideWidth }
    })
  }, [activeSheet.columns, pendingColumnWidthOverrides])

  /** Prefer `isVisible !== false`; if that would hide every column (legacy data), fall back so Univer still mounts. */
  const spreadsheetColumnsForGrid = useMemo(() => {
    const visible = effectiveGridColumns.filter(c => c.isVisible !== false)
    if (visible.length > 0) return visible
    return effectiveGridColumns.length > 0 ? effectiveGridColumns : visible
  }, [effectiveGridColumns])

  // --- Column handling (includes auto-add for Univer grid) ---
  const handleCellChangeRef = useRef<(rowId: string, columnName: string, value: unknown, sheetId?: string) => void>(
    () => {}
  )

  const columnsState = useSpreadsheetColumns({
    app,
    activeSheet,
    effectiveActiveSheetColumns: effectiveGridColumns,
    columnStructureStateRef,
    localSheetDataRef,
    canonicalActiveSheetRowsSourceRef,
    commitOptimisticActiveSheetRows,
    handleCellChangeRef,
    onAppUpdate: nextApp => applyLocalAppUpdate(() => nextApp),
    onDiagnosticsTraceEvent: enqueueDiagnosticsTraceEvent,
    onBlockedColumnReorder: () => {
      toast.warning(sheetT('toast-column-reorder-merged-cells-unsupported'))
    },
    emitColumnBatchOperation: op => {
      const submitBatch = mutationFacadeRef.current?.submitBatch
      if (!submitBatch) {
        console.warn('[SpreadsheetAppViewer] Column batch op dispatched before mutation facade was ready', op)
        return
      }
      void (async () => {
        const targetSheetId = typeof op.data.sheetId === 'string' ? op.data.sheetId : activeSheetIdRef.current
        try {
          await submitBatch({
            sheetId: targetSheetId,
            operations: [op],
            batchIdPrefix: 'column_op'
          })
        } catch (err) {
          console.error('[SpreadsheetAppViewer] Column batch op failed', err)
        }
      })()
    },
    emitColumnBatchOperations: ops => {
      const submitBatch = mutationFacadeRef.current?.submitBatch
      if (!submitBatch || ops.length === 0) {
        return
      }
      const targetSheetId =
        typeof ops[0]?.data?.sheetId === 'string' ? (ops[0].data.sheetId as string) : activeSheetIdRef.current
      void (async () => {
        try {
          await submitBatch({
            sheetId: targetSheetId,
            operations: ops,
            batchIdPrefix: 'column_op'
          })
        } catch (err) {
          console.error('[SpreadsheetAppViewer] Column batch ops failed', err)
        }
      })()
    }
  })

  // --- Row edit dialog state + handlers ---
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)

  const createOperationId = useCallback((prefix: string) => createSpreadsheetMutationOperationId(prefix), [])

  const isUuid = useCallback((value: unknown): boolean => (typeof value === 'string' ? isUuidString(value) : false), [])

  const getBackendRowIdForUiRowId = useCallback(
    (uiRowId: string, univerRow?: number): string | undefined => {
      const rows = getActiveSessionRows()

      const row = rows.find(r => viewerRowId(r) === uiRowId)
      if (row) return resolveBackendRowIdForViewerRow(row, isUuid)

      const byBackend = rows.find(r => resolveBackendRowIdForViewerRow(r, isUuid) === uiRowId)
      if (byBackend) return resolveBackendRowIdForViewerRow(byBackend, isUuid)

      if (univerRow != null && univerRow >= 0 && univerRow < rows.length) {
        const rowByIndex = rows[univerRow]
        if (rowByIndex) {
          return resolveBackendRowIdForViewerRow(rowByIndex, isUuid)
        }
      }
      return undefined
    },
    [getActiveSessionRows, isUuid]
  )
  getBackendRowIdForUiRowIdRef.current = getBackendRowIdForUiRowId

  const pendingCellJournalStorageKey = useMemo(() => buildSpreadsheetPendingCellJournalStorageKey(app.id), [app.id])

  const persistPendingCellJournal = useCallback(() => {
    if (entityEnabled || typeof globalThis === 'undefined') return
    try {
      writeSpreadsheetPendingCellJournal(pendingCellJournalStorageKey, {
        draftCells: pendingCellChangesRef.current,
        pendingBatches: pendingCellBatchesRef.current
      } satisfies PendingCellJournal)
    } catch {
      // Best-effort persistence only.
    }
  }, [entityEnabled, pendingCellJournalStorageKey])

  const handleWorkbookSnapshotLifecycle = useCallback(
    (event: WorkbookSnapshotLifecycleEvent) => {
      if (event.phase === 'checkpoint_scheduled') {
        workbookSnapshotThrottlePendingRef.current = true
        if (shouldMarkDirtyForSnapshotLifecycle(event)) {
          sheetPersist.markDirty()
          versioning.markAsChanged()
        }
        return
      }
      if (event.ok) {
        workbookSnapshotThrottlePendingRef.current = false
        return
      }
      workbookSnapshotThrottlePendingRef.current = true
      if (shouldMarkDirtyForSnapshotLifecycle(event)) {
        sheetPersist.markDirty()
        versioning.markAsChanged()
      }
    },
    [sheetPersist.markDirty, versioning.markAsChanged]
  )

  useEffect(() => {
    recoverFromVersionConflictRef.current = recoverFromVersionConflict
  }, [recoverFromVersionConflict])

  const buildPendingCellBatches = useCallback(
    (queuedCells: CellChange[]): PendingCellBatch[] => {
      const groupedCells = new Map<string, CellChange[]>()
      for (const cell of queuedCells) {
        const targetSheetId = cell.sheetId ?? activeSheetIdRef.current
        const next = groupedCells.get(targetSheetId) ?? []
        next.push(cell)
        groupedCells.set(targetSheetId, next)
      }

      const resolveRowsForCellFlush = (targetSheetId: string): ViewerRow[] => {
        const sessionRows = spreadsheetSession.getSheetState(targetSheetId)?.rows
        if (sessionRows) return sessionRows as ViewerRow[]
        const cached = peerSheetDataCacheRef.current.get(targetSheetId)
        if (cached) return cached as ViewerRow[]
        const sheet = app.sheets.find(entry => entry.id === targetSheetId)
        return sortSpreadsheetRowsBySheetSettings(sheet?.data ?? [], sheet) as ViewerRow[]
      }

      const workItems: PendingCellBatch[] = []
      for (const [targetSheetId, sheetCells] of groupedCells) {
        const coalescedSheetCells = coalesceQueuedCellChanges(sheetCells)
        const sourceTraceIds: string[] = []
        for (const cell of coalescedSheetCells) {
          if (typeof cell.traceId !== 'string' || cell.traceId.length === 0) continue
          if (!sourceTraceIds.includes(cell.traceId)) {
            sourceTraceIds.push(cell.traceId)
          }
        }
        const uiToBackendRowId = buildUiToBackendRowIdMap(resolveRowsForCellFlush(targetSheetId), isUuid)
        const { setUpdatesByBackendRowId, clearCells } = partitionCellUpdatesByBackendRowId(
          coalescedSheetCells,
          uiToBackendRowId,
          pendingClientRowUpdatesRef.current,
          isUuid
        )
        const operations = buildCellPersistenceOperations({
          setUpdatesByBackendRowId,
          clearCells,
          createOperationId
        })
        if (operations.length === 0) continue
        workItems.push({
          batchId: createOperationId(`cell_ops_${targetSheetId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)}`),
          traceId:
            sourceTraceIds.length === 1
              ? sourceTraceIds[0]
              : sourceTraceIds.length > 1
                ? createSpreadsheetTraceId('spreadsheet_batch')
                : undefined,
          sourceTraceIds,
          targetSheetId,
          operations
        })
      }
      return workItems
    },
    [app.sheets, createOperationId, isUuid, spreadsheetSession]
  )

  const applyResponseRowsToLocalBaseline = useCallback(
    (
      targetSheetId: string,
      operations: SpreadsheetBatchOperation[],
      response: SpreadsheetBatchOperationResponse
    ): void => {
      if (!spreadsheetSession.getSheetState(targetSheetId)) return
      // Persisted baseline must reflect ONLY server-acked state. Cloning the whole
      // session (capturePersistedBaseline) would absorb optimistic, un-acked edits
      // that are painted into the session before their batch is sent (e.g. the rest of
      // an autofill/fill-down range). That falsely marks those cells durable, so the
      // outbound planner's getPersistedSignatureForCell drops their value writes and
      // only the first cell ever reaches the API. Scope the baseline to the columns the
      // server actually acknowledged in this response's operations.
      spreadsheetSession.capturePersistedBaselineForOperations(targetSheetId, operations)
      const dirtyRegions = response.dirtyRegions ?? []
      const isActiveTarget = areCanonicalSheetIdsEqual(
        targetSheetId,
        activeSheetIdRef.current,
        createdSheetIdAliasesRef.current
      )
      if (!isActiveTarget) return
      const isStyleOnlyAck =
        operations.length > 0 && operations.every(operation => String(operation.type ?? '') === 'set_style')
      const ackOperationPaintCells = buildAckDirectPaintCellsFromOperations(targetSheetId, operations)
      if (dirtyRegions.length === 0) {
        if (isStyleOnlyAck && ackOperationPaintCells.length > 0) {
          stageAuthoritativeDirectPaintForSync(targetSheetId, ackOperationPaintCells, {
            operationType: 'set_style'
          })
        }
        return
      }
      const regions = resolveBackendDirtyRegionsToAuthoritativeRegions({
        dirtyRegions,
        columns: spreadsheetColumnsForGrid,
        rows: getActiveSessionRows() as Record<string, unknown>[]
      })
      if (regions.length === 0) {
        if (isStyleOnlyAck && ackOperationPaintCells.length > 0) {
          stageAuthoritativeDirectPaintForSync(targetSheetId, ackOperationPaintCells, {
            operationType: 'set_style'
          })
        }
        return
      }
      const activeRows = getActiveSessionRows() as Record<string, unknown>[]
      const ackRegionPaintCells = buildAuthoritativePaintCellsFromViewerRows(activeRows, spreadsheetColumnsForGrid, {
        regions
      })
      const ackDirectPaintCells = mergeAckDirectPaintItems(ackRegionPaintCells, ackOperationPaintCells)
      if (ackDirectPaintCells.length > 0) {
        stageAuthoritativeDirectPaintForSync(targetSheetId, ackDirectPaintCells, {
          operationType: isStyleOnlyAck ? 'set_style' : 'authoritative_reapply'
        })
      }
      const backendRepairClassification = classifyBackendDirtyRegionReapply({
        sheetId: targetSheetId,
        regions,
        rows: activeRows,
        isFreshMaterializedBackendRow: (sheetId, rowId) =>
          isUuid(rowId) &&
          rowMaterializationReadinessRef.current?.getMaterializedValuesByBackendRowId(sheetId, rowId) != null
      })
      scheduleCoordinatedAuthoritativeRepair(targetSheetId, regions.length === 1 ? regions[0] : regions, {
        clearAllSignatures: false,
        preferBulk: true,
        reason: backendRepairClassification.reason,
        pendingLocalFilterPolicy: backendRepairClassification.pendingLocalFilterPolicy
      })
    },
    [
      spreadsheetSession,
      spreadsheetColumnsForGrid,
      getActiveSessionRows,
      activeSheetIdRef,
      createdSheetIdAliasesRef,
      isUuid,
      rowMaterializationReadinessRef,
      scheduleCoordinatedAuthoritativeRepair,
      stageAuthoritativeDirectPaintForSync
    ]
  )

  const fetchSheetVersion = useCallback(
    (targetSheetId: string) => fetchSpreadsheetSheetVersion(app.id, targetSheetId),
    [app.id]
  )

  const serializeMutationSubmitsWithQueue = useMemo(
    () => ({
      operationQueueRef,
      chainOnOperationQueue,
      operationQueueExecutionDepthRef
    }),
    [chainOnOperationQueue]
  )

  const releaseMutationOwnershipFromResponse = useCallback(
    (params: {
      sheetId: string
      operations: import('./services/SpreadsheetApiService').SpreadsheetBatchOperation[]
      response: import('./services/SpreadsheetApiService').SpreadsheetBatchOperationResponse
    }) => {
      releaseSpreadsheetMutationOwnershipFromResponse({
        sheetId: params.sheetId,
        operations: params.operations,
        response: params.response,
        intentJournal: spreadsheetIntentJournalRef.current,
        versionCausalOwnership: versionCausalOwnershipRef.current,
        rowMaterializationReadiness,
        rowSlotIdentityRegistry,
        pendingLocalMutationCellsRef
      })
      const queue = sheetWorkQueueAccessorRef.current
      if (queue) {
        const { ownedCellKeys, protectedCellKeys } = collectAcknowledgedOverlayReleaseKeys(
          params.sheetId,
          params.operations
        )
        queue.releaseAcknowledgedCellOwnership(params.sheetId, {
          ownedCellKeys,
          protectedCellKeys
        })
      }
    },
    []
  )

  const handleLocalBatchCommitted = useCallback(
    (targetSheetId: string, version: number) => {
      if (!Number.isFinite(version) || version < 0) return
      const normalizedVersion = Math.trunc(version)
      rememberKnownSheetVersion(targetSheetId, normalizedVersion)
      const aliases = createdSheetIdAliasesRef.current
      const isActiveTarget = areCanonicalSheetIdsEqual(targetSheetId, activeSheetIdRef.current, aliases)
      if (isActiveTarget) {
        collaborationManagerRef.current?.setLastKnownVersion(normalizedVersion)
      }
      const queue = sheetWorkQueueAccessorRef.current
      if (queue) {
        void queue.enqueueRemoteApply(targetSheetId, 'versionOnlyEcho', async controller => {
          controller.markVersionDone(normalizedVersion)
        })
      }
    },
    [activeSheetIdRef, createdSheetIdAliasesRef, rememberKnownSheetVersion]
  )

  const applyLocalCommittedBatch = useCallback(
    (params: {
      committedBatch: import('./core').SpreadsheetCommittedBatchEnvelope
      traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string }
      isSameUser?: boolean
    }) => collaborationManagerRef.current?.applyLocalCommittedBatch(params) ?? false,
    []
  )

  const { mutationFacade, submitMutationBatch, submitMutationBatchForSheetQueue } = useSpreadsheetMutationPipeline({
    appId: app.id,
    activeSheetIdRef,
    spreadsheetSession,
    sheetVersionRef,
    appSheetsRef,
    snapshotSaveMetricsRef,
    unloadKeepAlivePersistRef,
    enqueueSnapshotCheckpointRef,
    activeTraceSessionRef,
    diagnosticsBrowserSessionIdRef,
    diagnosticsTabIdRef,
    createOperationId,
    getKnownSheetVersion,
    rememberRecentLocalBatchId,
    rememberKnownSheetVersion,
    rememberSheetVersion,
    rememberLocalCommittedVersion,
    onLocalBatchCommitted: handleLocalBatchCommitted,
    applyLocalCommittedBatch,
    releaseMutationOwnershipFromResponse,
    refreshBaseVersionBeforeWrite,
    updateActiveSheetVersion,
    applyResponseRowsToLocalBaseline,
    recoverFromVersionConflict,
    enqueueDiagnosticsTraceEvent,
    fetchSheetVersion,
    fetchSheetReplaySince,
    scheduleRemoteStructuralResync,
    onRowAdd,
    onRowUpdate,
    onSheetAdd,
    onSheetDuplicate,
    onSheetUpdate,
    onSheetDelete,
    mutationFacadeRef,
    createdSheetIdAliasesRef,
    serializeMutationSubmitsWithQueue
  })

  // -----------------------------------------------------------------
  // Per-sheet work queue (V1)
  //
  // Constructed eagerly so debug surfaces / future wiring observe the same
  // instance. In Phase 2A this queue is intentionally **not yet wired** to
  // `handleMutationBatchOp` or collaboration callbacks; those land in
  // subsequent checkpoints. The queue is harmless dead code until then,
  // but we seed `queueClientAppliedVersion` on mount / sheet activation so
  // that once local wiring lands the version-equality invariant does not
  // block the first submit (`version_confidence_missing`).
  //
  // `collabPersistedBulkApplyDepthRef` is created at viewer scope as a stub
  // (always 0). The authoritative bulk-depth signal is the per-job
  // `markBulkDepthDone()` invoked by collab callbacks via RemoteJobController
  // (wired in Phase 2B). The plan calls this stub the "belt-and-suspenders"
  // global check; for V1 the per-job signal is the source of truth.
  // -----------------------------------------------------------------
  const sheetQueueBulkApplyDepthRef = useRef(0)
  const isSheetQueueDebugEnabled = useMemo(() => {
    if (typeof globalThis === 'undefined') return false
    try {
      return globalThis.localStorage?.getItem('spreadsheetSheetQueueDebug') === '1'
    } catch {
      return false
    }
  }, [])
  const { queue: sheetWorkQueue, queueClientAppliedVersionRef: sheetQueueClientAppliedVersionRef } =
    useSpreadsheetSheetWorkQueue({
      operationQueueRef,
      localPersistQueueRef,
      chainOnOperationQueue,
      submitMutationBatch,
      submitMutationBatchForSheetQueue,
      enqueueDiagnosticsTraceEvent,
      onLocalMutationCellProtectionChange: handleLocalMutationCellProtectionChange,
      refreshBaseVersionBeforeWrite,
      resolveBaseVersion: (sheetId: string) => resolveKnownSheetVersion(sheetId),
      collabPersistedBulkApplyDepthRef: sheetQueueBulkApplyDepthRef,
      getIsCollaborative: () => isCollaborationConnectedRef.current,
      // Before retrying a fast-path 409 (structural_conflict / version_too_stale)
      // pull and apply the sheet deltas the server says happened between our
      // stale `baseVersion` and `currentVersion`. This catches up the local
      // session/baseline so the retry both lands server-side AND the visible
      // grid reflects the structural change immediately, instead of waiting
      // for the next WS broadcast.
      requestStructuralRecovery: async sheetId => {
        await requestSheetDeltaCatchUp(sheetId, 'version_gap')
      },
      debug: isSheetQueueDebugEnabled
        ? (event, payload) => {
            console.debug('[sheet-queue]', { event, ...payload })
          }
        : undefined
    })
  // Bridge: publish the queue instance to the collaboration callbacks
  // constructed earlier in render (see `sheetWorkQueueAccessorRef`).
  sheetWorkQueueAccessorRef.current = sheetWorkQueue
  // Quiet unused-variable lint in Phase 2A/2B — exported for wiring landing
  // in Phase 2C and for debug surfaces.
  void sheetQueueClientAppliedVersionRef

  useEffect(() => {
    if (!isSheetQueueDebugEnabled || typeof globalThis === 'undefined') {
      return undefined
    }
    const bridge = globalThis as typeof globalThis & {
      __gbaSheetQueue?: {
        getDebugState: (sheetId?: string) => ReturnType<typeof sheetWorkQueue.getDebugState>
        forceFlush: (sheetId?: string) => ReturnType<typeof sheetWorkQueue.forceFlush>
      }
    }
    bridge.__gbaSheetQueue = {
      getDebugState: (sheetId?: string) => sheetWorkQueue.getDebugState(sheetId ?? activeSheetIdRef.current),
      forceFlush: (sheetId?: string) => sheetWorkQueue.forceFlush(sheetId ?? activeSheetIdRef.current)
    }
    return () => {
      delete bridge.__gbaSheetQueue
    }
  }, [isSheetQueueDebugEnabled, sheetWorkQueue])

  /**
   * Boot-time seed of `queueClientAppliedVersion` for sheets present at mount.
   *
   * The dominant version-advance signal is the live `onVersionUpdate` /
   * `onSheetVersionUpdate` collab path wired in
   * `buildSpreadsheetCollaborationCallbacks` (it calls `markVersionDone` via
   * `enqueueRemoteApply('versionOnlyEcho', …)`). But the very first local
   * submit happens before any collab broadcast arrives, so without an
   * initial seed it would park on `version_confidence_missing`. This runs
   * exactly once per sheet on mount and on sheet-id change.
   *
   * Tier 1 conflict resolution intentionally removed the reconcile-on-every-
   * render variant: there is no longer a `client_behind_refreshed_base`
   * recovery loop driven by client-side reconcile, so the only seed we need
   * is the initial bootstrap one.
   */
  useEffect(() => {
    const seed = (sheetId: string, version: number): void => {
      if (sheetId === '' || !Number.isFinite(version)) return
      const current = sheetWorkQueue.getDebugState(sheetId).queueClientAppliedVersion
      if (current != null) return
      void sheetWorkQueue.enqueueRemoteApply(sheetId, 'versionOnlyEcho', async controller => {
        controller.markVersionDone(version)
      })
    }
    for (const sheet of app.sheets) {
      seed(sheet.id, resolveKnownSheetVersion(sheet.id))
    }
    if (activeSheetId) {
      seed(activeSheetId, resolveKnownSheetVersion(activeSheetId))
    }
  }, [activeSheetId, app.sheets, resolveKnownSheetVersion, sheetWorkQueue])

  const persistSpreadsheetCreatedSheetContext = useMemo<PersistSpreadsheetCreatedSheetContext>(
    () => ({
      mutationFacade,
      spreadsheetSession,
      activeSheetIdRef,
      peerSheetDataCacheRef,
      authoritativePeerSheetDataCacheRef,
      createdSheetIdAliasesRef,
      pendingCreatedSheetSelectionRef,
      pendingCreatedSheetReconciliationRef,
      pendingUniverRowsBySheetRef,
      pendingSnapshotClearCellsRef,
      pendingSnapshotCheckpointBySheetRef,
      knownSheetVersionsRef,
      pendingCellChangesRef,
      pendingCellBatchesRef,
      latestUniverDataRef,
      applyLocalAppUpdate,
      seedActiveSheetState,
      setActiveSheetId,
      rememberKnownSheetVersion,
      ensureRemoteSheetInLiveWorkbook,
      onPersistedSheetReady: () => {
        onPersistedSheetReadyRef.current?.()
      }
    }),
    [
      mutationFacade,
      spreadsheetSession,
      applyLocalAppUpdate,
      seedActiveSheetState,
      setActiveSheetId,
      rememberKnownSheetVersion,
      ensureRemoteSheetInLiveWorkbook
    ]
  )

  const { flushPendingCellChangesRef, schedulePendingCellPersist } = useSpreadsheetPendingCellPersistence({
    entityEnabled,
    defaultPersistDebounceMs: CELL_PERSIST_DEBOUNCE_MS,
    maxPersistDebounceMs: CELL_PERSIST_MAX_DEBOUNCE_MS,
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
    sheetPersist: {
      beginPersist: sheetPersist.beginPersist,
      endPersist: sheetPersist.endPersist,
      recordSuccess: sheetPersist.recordSuccess,
      recordError: sheetPersist.recordError
    },
    onPersistErrorMessage: sheetT('persist-cell-failed'),
    markVersionAsSaved: versioning.markAsSaved
  })

  const {
    persistSnapshotCheckpointForSheetRef,
    enqueueUniverSnapshotCheckpoint,
    queueSnapshotCheckpointForSheet,
    createCheckpointWithFlush
  } = useSpreadsheetCheckpointOrchestration({
    appId: app.id,
    sheets: app.sheets,
    entityEnabled,
    activeSheetId,
    chainOnOperationQueue,
    operationQueueRef,
    sheetPersist,
    sheetT,
    versioning,
    flushPendingCellChangesRef,
    getPersistedBaselineRowsForSheet,
    getActiveSessionRows,
    hasPendingCellPersistence,
    isSheetPersistenceBusy: (sheetId: string) => sheetWorkQueue.isSheetPersistenceBusy(sheetId),
    isUuid,
    commitLocalSheetData,
    setSnapshotDebugInfo,
    debugLog,
    enqueueDiagnosticsTraceEvent,
    enqueueSnapshotCheckpointRef,
    pendingSnapshotCheckpointBySheetRef,
    snapshotCheckpointDrainScheduledRef,
    snapshotCheckpointDrainPromiseRef,
    socketPersistChainRef,
    workbookSnapshotVersionRef,
    workbookSnapshotCoversVersionsRef,
    snapshotSaveMetricsRef,
    spreadsheetGridRef,
    activeSheetIdRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    pendingLocalMutationCellsRef,
    pendingSnapshotClearCellsRef,
    resolveKnownSheetVersion,
    pendingCellPersistTimeoutRef,
    unloadKeepAlivePersistRef,
    lastSuccessfulSnapshotCheckpointAtRef,
    activeTraceSessionRef
  })

  const handleLocalCursorEmit = useCallback(
    (pos: { path: string[] }) => {
      collaboration.emitCursor({ path: pos.path })
    },
    [collaboration]
  )

  const getCanonicalSheetId = useCallback(
    (sheetId: string) => resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current),
    []
  )

  const { handleCellsChange, handleCellChange } = useSpreadsheetCellChangePipeline({
    canEditWithLock,
    entityEnabled,
    activeSheetId,
    activeSheetColumns: activeSheet.columns,
    sheets: app.sheets,
    createdSheetIdAliasesRef,
    pendingCellChangesRef,
    activeTraceSessionRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    collaborationConnected: collaboration.isCollaborationConnected,
    collaborationParticipantCount: collaboration.headerParticipants.length,
    defaultPersistDebounceMs: CELL_PERSIST_DEBOUNCE_MS,
    collaborationPersistDebounceMs: CELL_PERSIST_COLLAB_DEBOUNCE_MS,
    collectSnapshotClearCoordinates,
    collectSnapshotValueWriteCoordinates,
    trackSnapshotCellClears,
    forgetSnapshotCellClears,
    getKnownRowsForSheet,
    getActiveSessionRows,
    syncSheetRowsIntoLocalState,
    schedulePendingCellPersist,
    persistPendingCellJournal,
    commitLocalSheetData,
    markSheetDirty: sheetPersist.markDirty,
    markVersionAsChanged: versioning.markAsChanged,
    debugLog,
    enqueueDiagnosticsTraceEvent
  })

  useEffect(() => {
    handleCellChangeRef.current = handleCellChange
  }, [handleCellChange])

  const logRowIdentityDiagnostics = useCallback(
    (stage: string, payload: Record<string, unknown>) => {
      const targetSheetId =
        typeof payload.targetSheetId === 'string'
          ? resolveReconciledSheetId(payload.targetSheetId, createdSheetIdAliasesRef.current)
          : activeSheetIdRef.current
      debugLog('row identity diagnostics', {
        stage,
        targetSheetId,
        ...payload
      })
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage,
        sheetId: targetSheetId,
        payload
      })
    },
    [enqueueDiagnosticsTraceEvent]
  )

  const { persistAddedRowsWithBatch, persistSingleAddedRow } = useSpreadsheetRowPersistencePipeline({
    activeSheetId,
    mutationFacade,
    updateActiveSheetVersion,
    isUuid,
    pendingClientRowUpdatesRef,
    pendingCellChangesRef,
    persistPendingCellJournal,
    buildCreatedRowsFromBatch,
    onFlushDeferredCellEmits: () => collaborationManagerRef.current?.tryFlushDeferredCellEmits(),
    onRowIdentityDiagnostics: logRowIdentityDiagnostics,
    rowMaterializationReadiness
  })

  const {
    processUniverDataChangeRef,
    materializeTemporaryRowsForSubmit,
    isRowMaterializationInFlightForSheet,
    releaseRowMaterializationInFlightForSheet
  } = useSpreadsheetUniverRowCreatePipeline({
    activeSheetId,
    activeSheetIdRef,
    activeSheetColumns: activeSheet.columns,
    collaborationConnected: collaboration.isCollaborationConnected,
    collaborationParticipantCount: collaboration.headerParticipants.length,
    pendingLocalMutationCellsRef,
    getColumnsForSheet: (targetSheetId: string) =>
      appSheetsRef.current.find(sheet =>
        areCanonicalSheetIdsEqual(sheet.id, targetSheetId, createdSheetIdAliasesRef.current)
      )?.columns ?? activeSheet.columns,
    isUuid,
    isOpsV2Enabled,
    onRowAdd,
    entityEnabledRef,
    canEditWithLockRef,
    latestUniverDataRef,
    pendingUniverRowsBySheetRef,
    lastProcessedLengthRef,
    operationQueueRef: operationQueueRef as any,
    chainOnOperationQueue: chainOnOperationQueue as any,
    sheetPersist: {
      beginPersist: sheetPersist.beginPersist,
      endPersist: sheetPersist.endPersist,
      markDirty: sheetPersist.markDirty,
      recordSuccess: sheetPersist.recordSuccess,
      recordError: sheetPersist.recordError
    },
    markVersionAsChanged: versioning.markAsChanged,
    markVersionAsSaved: versioning.markAsSaved,
    onPersistRowsErrorMessage: sheetT('persist-rows-add-failed'),
    getActiveSessionRows,
    getRowsForSheet: getKnownRowsForSheet,
    buildAddRowPayloadsFromUniverRows,
    commitRowsForSheet: (targetSheetId, rows, options) => {
      if (areCanonicalSheetIdsEqual(targetSheetId, activeSheetIdRef.current, createdSheetIdAliasesRef.current)) {
        commitLocalSheetData(rows, options)
        return
      }
      syncSheetRowsIntoLocalState(targetSheetId, rows, {
        persisted: true,
        syncGrid: false
      })
    },
    onRowsMaterializedContextSync: (targetSheetId, rows, meta) => {
      const isActiveTarget = areCanonicalSheetIdsEqual(
        targetSheetId,
        activeSheetIdRef.current,
        createdSheetIdAliasesRef.current
      )
      if (isActiveTarget) {
        spreadsheetGridRef.current?.syncGridConversionContext?.(spreadsheetColumnsForGrid, rows)
        const region = computeAuthoritativeRegionForMaterializedRows({
          createdGridRowIndices: meta.createdGridRowIndices,
          rows,
          columns: spreadsheetColumnsForGrid,
          createdRows: meta.createdRows,
          sourceUniverRows: meta.sourceUniverRows
        })
        if (region) {
          const directPaintCells = buildAuthoritativePaintCellsForMaterializedRows(
            rows,
            spreadsheetColumnsForGrid,
            region
          )
          if (directPaintCells.length > 0) {
            stageAuthoritativeDirectPaintForSync(targetSheetId, directPaintCells, {
              operationType: 'authoritative_reapply'
            })
          }
          const regionCellEstimate = (region.maxRow - region.minRow + 1) * (region.maxCol - region.minCol + 1)
          const scheduledRegions = scheduleCoordinatedAuthoritativeRepair(targetSheetId, region, {
            clearAllSignatures: false,
            preferBulk: true,
            reason: 'row_materialization',
            pendingLocalFilterPolicy: 'server_authoritative_repair'
          })
          if (scheduledRegions) {
            logRowIdentityDiagnostics('row_materialization_bounded_authoritative_reapply_requested', {
              targetSheetId,
              region: scheduledRegions.length === 1 ? scheduledRegions[0] : scheduledRegions,
              regionCellEstimate,
              createdGridRowIndices: meta.createdGridRowIndices
            })
          }
        }
      }
      logRowIdentityDiagnostics('row_materialization_context_synced', {
        targetSheetId,
        contextSynced: isActiveTarget,
        isActiveTarget,
        rowCount: rows.length,
        affectedUiRowIds: meta.affectedUiRowIds,
        createdGridRowIndices: meta.createdGridRowIndices,
        rowIdentities: buildRowIdentityDiagnostics({
          uiRowIds: meta.affectedUiRowIds,
          rows,
          isUuid
        })
      })
    },
    requestBoundedAuthoritativeReapply: (targetSheetId, region, options) => {
      const isActiveTarget = areCanonicalSheetIdsEqual(
        targetSheetId,
        activeSheetIdRef.current,
        createdSheetIdAliasesRef.current
      )
      if (!isActiveTarget) return
      const normalizedRegions = normalizeAuthoritativeGridReapplyTarget(region)
      if (!normalizedRegions) return
      const scheduledRegions = scheduleCoordinatedAuthoritativeRepair(targetSheetId, normalizedRegions, options)
      if (!scheduledRegions) return
      const regionCellEstimate = scheduledRegions.reduce(
        (total, boundedRegion) =>
          total + (boundedRegion.maxRow - boundedRegion.minRow + 1) * (boundedRegion.maxCol - boundedRegion.minCol + 1),
        0
      )
      logRowIdentityDiagnostics('stale_active_snapshot_bounded_authoritative_reapply_requested', {
        targetSheetId,
        region: scheduledRegions.length === 1 ? scheduledRegions[0] : scheduledRegions,
        regionCellEstimate,
        reason: options?.reason ?? 'stale_active_snapshot_row_materialization'
      })
    },
    persistAddedRowsWithBatch,
    persistSingleAddedRow,
    recoverFromVersionConflict,
    fetchAuthoritativeRowsForSheet: (targetSheetId: string) =>
      SpreadsheetApiService.getAllRows(
        app.id,
        resolveReconciledSheetId(targetSheetId, createdSheetIdAliasesRef.current)
      ),
    summarizeRowsForDebug,
    multiSheetDebugLog,
    onRowIdentityDiagnostics: logRowIdentityDiagnostics,
    pendingCreatedSheetSelectionRef,
    createdSheetIdAliasesRef,
    rowMaterializationReadiness,
    rowSlotIdentityRegistry,
    spreadsheetIntentJournalRef,
    versionCausalOwnershipRef
  })
  isRowMaterializationInFlightRef.current = isRowMaterializationInFlightForSheet
  releaseRowMaterializationInFlightRef.current = releaseRowMaterializationInFlightForSheet

  const flushUnmaterializedRowsBeforePersistRef = useRef<
    ((sheetId: string, finalize?: () => Promise<void>) => Promise<void>) | null
  >(null)
  useEffect(() => {
    flushUnmaterializedRowsBeforePersistRef.current = async (sheetId: string, finalize?: () => Promise<void>) => {
      await chainOnOperationQueue(operationQueueRef, async () => {
        // Fix D: use the `submit_readiness` materialization path, NOT the regular
        // `processUniverDataChange` path. The regular path is gated by a "stale active snapshot"
        // guard (univer_data_change reason) which silently skips when Univer's view is
        // compressed/behind the persisted session — exactly the state we land in just after
        // add_rows commits while Univer hasn't re-emitted the new row identities yet. When the
        // emit dispatch explicitly asks us to flush before submitting, we MUST actually flush.
        const canonicalTargetId = resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current)
        const sessionRows = spreadsheetSession.getSheetState(canonicalTargetId)?.rows ?? []
        const latest = latestUniverDataRef.current
        const latestRows =
          latest && resolveReconciledSheetId(latest.sheetId, createdSheetIdAliasesRef.current) === canonicalTargetId
            ? (latest.data as Array<Record<string, unknown>>)
            : null
        const rows = resolveUniverRowsForSubmitReadinessMaterialization({
          sessionRows,
          latestUniverRows: latestRows,
          isUuid
        })
        const effectiveSheetId = latest?.sheetId || sheetId
        if (rows.length > 0) {
          await materializeTemporaryRowsForSubmit(effectiveSheetId, rows)
        }
        if (finalize) {
          await finalize()
        }
      })
    }
  }, [chainOnOperationQueue, createdSheetIdAliasesRef, isUuid, materializeTemporaryRowsForSubmit, spreadsheetSession])

  const getPersistSheetRowsSnapshotForGrid = useCallback(
    (sheetId: string) => {
      const canonical = resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current)
      return spreadsheetSession.getSheetState(canonical)?.rows ?? []
    },
    [spreadsheetSession]
  )

  const getPersistedBaselineRowsSnapshotForGrid = useCallback(
    (sheetId: string) => {
      const canonical = resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current)
      return spreadsheetSession.getSheetState(canonical)?.persistedBaselineRows ?? null
    },
    [spreadsheetSession]
  )

  const getLatestAuthoritativeUniverRowsForSheet = useCallback(
    (sheetId: string): ViewerRow[] | null => {
      const canonical = resolveReconciledSheetId(sheetId, createdSheetIdAliasesRef.current)
      const latest = latestUniverDataRef.current
      if (latest && resolveReconciledSheetId(latest.sheetId, createdSheetIdAliasesRef.current) === canonical) {
        return latest.data as ViewerRow[]
      }

      const pendingRows =
        pendingUniverRowsBySheetRef.current.get(canonical) ?? pendingUniverRowsBySheetRef.current.get(sheetId)
      if (pendingRows?.data) {
        return pendingRows.data as ViewerRow[]
      }

      return (
        ((peerSheetDataCacheRef.current.get(canonical) ?? peerSheetDataCacheRef.current.get(sheetId)) as
          | ViewerRow[]
          | undefined) ?? null
      )
    },
    [createdSheetIdAliasesRef, latestUniverDataRef, pendingUniverRowsBySheetRef, peerSheetDataCacheRef]
  )

  const { handleUniverDataChange } = useSpreadsheetUniverDataChangeBridge({
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    latestUniverDataRef,
    pendingUniverRowsBySheetRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    lastProcessedLengthRef,
    univerDataChangeTimeoutRef,
    operationQueueRef,
    chainOnOperationQueue,
    processUniverDataChangeRef,
    getKnownRowsForSheet,
    getActiveSessionRows,
    summarizeRowsForDebug,
    multiSheetDebugLog,
    univerDataChangeDebounceMs: UNIVER_DATA_CHANGE_DEBOUNCE_MS,
    canEditWithLock,
    entityEnabled
  })

  useEffect(() => {
    onPersistedSheetReadyRef.current = () => {
      queueMicrotask(() => {
        void flushPendingCellChangesRef.current()
        void processUniverDataChangeRef.current()
      })
    }
  })

  const {
    flushPendingPersistenceNow,
    hasUnpersistedWork,
    confirmLeaveIfUnsaved,
    handleGuardedBack,
    handleGuardedNavigateToSpreadsheetHub
  } = useSpreadsheetLeaveGuardPipeline({
    entityEnabled,
    entityEnabledRef,
    canEditWithLockRef,
    activeSheetIdRef,
    operationQueueRef,
    pendingCellChangesRef,
    pendingCellPersistTimeoutRef,
    univerDataChangeTimeoutRef,
    workbookSnapshotThrottlePendingRef,
    snapshotCheckpointDrainScheduledRef,
    pendingSnapshotCheckpointBySheetRef,
    leaveGuardVersioningUnsavedRef,
    leaveGuardSheetDirtyRef,
    leaveGuardSheetErrorRef,
    leaveGuardSheetSavingRef,
    cacheLiveUniverSnapshotRef,
    processUniverDataChangeRef,
    flushPendingCellChangesRef,
    persistSnapshotCheckpointForSheetRef,
    chainOnOperationQueue,
    sheetPersist: {
      beginPersist: sheetPersist.beginPersist,
      endPersist: sheetPersist.endPersist,
      recordError: sheetPersist.recordError
    },
    onPersistCellErrorMessage: sheetT('persist-cell-failed'),
    onUnsavedLeaveConfirmMessage: sheetT('unsaved-leave-confirm'),
    onBack,
    onNavigateToSpreadsheetHub,
    getSheetWorkQueue: () => sheetWorkQueueAccessorRef.current,
    hasUnresolvedCollaborationWork: () =>
      hasSpreadsheetUnresolvedLocalWork({
        intentJournal: spreadsheetIntentJournalRef.current,
        versionCausalOwnership: versionCausalOwnershipRef.current,
        sheetId: activeSheetIdRef.current
      })
  })

  useSpreadsheetPendingCellJournalRestore({
    entityEnabled,
    pendingCellJournalStorageKey,
    pendingCellJournalRestoredKeyRef,
    pendingCellChangesRef,
    pendingCellBatchesRef,
    persistPendingCellJournal,
    flushPendingPersistenceNow
  })

  useSpreadsheetNavigationLeaveIntercept({
    confirmLeaveIfUnsaved,
    hasUnpersistedWork,
    flushPendingPersistenceNow,
    onUnsavedLeaveConfirmMessage: sheetT('unsaved-leave-confirm')
  })

  useSpreadsheetLifecyclePersistenceBridge({
    flushPendingPersistenceNow,
    unloadKeepAlivePersistRef,
    cacheLiveUniverSnapshotRef,
    entityEnabledRef,
    canEditWithLockRef,
    leaveGuardVersioningUnsavedRef,
    leaveGuardSheetDirtyRef,
    leaveGuardSheetErrorRef,
    leaveGuardSheetSavingRef,
    pendingCellChangesRef: pendingCellChangesRef as React.MutableRefObject<any[]>,
    pendingCellPersistTimeoutRef,
    univerDataChangeTimeoutRef,
    workbookSnapshotThrottlePendingRef,
    snapshotCheckpointDrainScheduledRef,
    pendingSnapshotCheckpointBySheetRef,
    collaborationHealthRef,
    scheduleSheetVersionRefreshFromApiRef,
    revalidateSpreadsheetUniverSnapshotAfterIdleTab
  })

  useSpreadsheetFlushTriggers({
    isCollaborationConnected: collaboration.isCollaborationConnected,
    hasPendingCellPersistence,
    flushPendingPersistenceNow,
    univerDataChangeTimeoutRef,
    pendingCellPersistTimeoutRef
  })

  const formFields = useMemo(() => {
    const visible = activeSheet.columns.filter(c => c.isVisible !== false)
    return visible.map((col, idx) => columnToFormField(col, idx))
  }, [activeSheet.columns])

  const { handleUpdateRow, handleDeleteRow } = useSpreadsheetRowCrudActions({
    canEditWithLock,
    activeSheetId,
    editingRow,
    setEditingRow,
    getActiveSessionRows,
    commitLocalSheetData,
    mutationFacade,
    isOpsV2Enabled,
    isUuid,
    viewerRowId,
    scheduleSheetVersionRefreshFromApi,
    updateActiveSheetVersion,
    markVersionAsSaved: versioning.markAsSaved,
    sheetPersist: {
      beginPersist: sheetPersist.beginPersist,
      endPersist: sheetPersist.endPersist,
      recordSuccess: sheetPersist.recordSuccess,
      recordError: sheetPersist.recordError
    },
    onPersistRowUpdateFailedMessage: sheetT('persist-row-update-failed'),
    onPersistRowDeleteFailedMessage: sheetT('persist-row-delete-failed'),
    onBeforeStructuralRowDelete: sheetId => {
      rowSlotIdentityRegistry.markUnhealthy(sheetId, 'row_delete_pending')
    }
  })

  // --- Column editing save (from dialog) ---
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])
  const onSaveColumns = useCallback(
    (columns: SpreadsheetColumn[]) => persistSheetPatch({ columns }),
    [persistSheetPatch]
  )

  const { onBulkCollectionColumnLabelsUpdate } = useSpreadsheetColumnLabelSync({
    canEditWithLock,
    activeSheetId,
    activeSheetColumns: activeSheet.columns,
    mutationFacade,
    onSheetUpdate,
    onLocalAppUpdate,
    onAppUpdate: onAppUpdate as any,
    applyLocalAppUpdate,
    getActiveSessionRows
  })

  const { handleRenameAppName } = useSpreadsheetRenameAction({
    app,
    canEditWithLock,
    onAppUpdate: onAppUpdate as any,
    messages: {
      required: sheetT('toast-file-name-required'),
      failed: sheetT('toast-file-rename-failed'),
      success: sheetT('toast-file-rename-success')
    }
  })

  const { handleExportToExcel, handleCreateReviewComment } = useSpreadsheetUtilityActions({
    isExporting,
    setIsExporting,
    appName: app.name,
    activeSheetName: activeSheet.name,
    getWorkbookSnapshot: getCurrentWorkbookSnapshot,
    exportSnapshotAsXlsx,
    createReviewComment: async content =>
      Boolean(
        await comments.createComment({
          type: 'document',
          content
        })
      ),
    messages: {
      reviewCommentCreateFailed: sheetT('toast-review-comment-create-failed'),
      reviewCommentCreated: sheetT('toast-review-comment-created')
    }
  })

  const { handleInsertAnalyticsRows, handleApplyFormulaToColumn } = useSpreadsheetAnalyticsActions({
    canEditWithLock,
    entityEnabled,
    activeSheetId,
    activeSheetColumns: activeSheet.columns,
    getActiveSessionRows,
    commitLocalSheetData,
    mutationFacade,
    handleCellsChange,
    viewerRowId,
    buildAnalyticsInsertPayloads,
    markVersionAsSaved: versioning.markAsSaved,
    sheetPersist: {
      beginPersist: sheetPersist.beginPersist,
      endPersist: sheetPersist.endPersist,
      recordSuccess: sheetPersist.recordSuccess,
      recordError: sheetPersist.recordError
    },
    messages: {
      analyticsNoMatchingColumns: sheetT('toast-analytics-no-matching-columns'),
      analyticsNoRowsInserted: sheetT('toast-analytics-no-rows-inserted'),
      analyticsInsertedRows: count => sheetT('toast-analytics-inserted-rows', { count }),
      analyticsInsertFailed: sheetT('toast-analytics-insert-failed'),
      formulaNoRows: sheetT('toast-formula-no-rows'),
      formulaApplied: count => sheetT('toast-formula-applied', { count }),
      persistRowsAddFailed: sheetT('persist-rows-add-failed')
    },
    normalizeCellValueForBatchPersistence
  })

  const { getHeaderRowFromGrid, getSheetDataFromGrid } = useSpreadsheetGridDataReaders({
    spreadsheetGridRef: spreadsheetGridRef as React.MutableRefObject<{
      getVisibleRangeValues?: (rowCount: number, colCount: number) => Record<number, Record<number, unknown>> | null
    } | null>,
    activeSheetColumns: activeSheet.columns,
    sheetDataLength: sheetData.length
  })

  const { handleUniverActiveWorksheetChange, resolveSheetContextForGrid } = useSpreadsheetWorksheetContextBridge({
    sheets: app.sheets,
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    pendingCreatedSheetSelectionRef,
    peerSheetDataCacheRef,
    getActiveSessionRows,
    setActiveSheetIdWithPeerCache,
    debugLog
  })

  const { handleNativeSheetStructureIntent } = useSpreadsheetNativeSheetStructureIntent({
    preferUniverNativeSheetTabs,
    isTrashedApp,
    appSheets: app.sheets,
    activeSheetIdRef,
    activeSheetColumns: activeSheet.columns,
    createdSheetIdAliasesRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    pendingUniverRowsBySheetRef,
    operationQueueRef: operationQueueRef as any,
    socketPersistChainRef,
    processUniverDataChangeRef,
    flushPendingCellChangesRef,
    structuralWsDedupRef,
    mutationFacade,
    persistSpreadsheetCreatedSheetContext,
    getRichestKnownRowsForSheet,
    getActiveSessionRows,
    applyLocalAppUpdate: applyLocalAppUpdate as any,
    rememberKnownSheetVersion,
    rememberSheetVersion,
    renameRemoteSheetInLiveWorkbook,
    removeRemoteSheetFromLiveWorkbook,
    queueSnapshotCheckpointForSheet,
    setActiveSheetId,
    chainOnOperationQueue: chainOnOperationQueue as any,
    primeSpreadsheetSheetInsertCaches,
    persistSpreadsheetCreatedSheet: persistSpreadsheetCreatedSheet as any,
    queuePersistSpreadsheetSheetRenameAfterCellFlush: queuePersistSpreadsheetSheetRenameAfterCellFlush as any,
    persistSpreadsheetSheetDelete: persistSpreadsheetSheetDelete as any,
    buildDuplicateVisualWorksheetSnapshot,
    getWorkbookSnapshot: getCurrentWorkbookSnapshot
  })

  const handleUniverSheetVisibilityChanged = useCallback(
    (payload: { sheetId: string; hidden: boolean }) => {
      handleNativeSheetStructureIntent({
        type: 'visibility',
        sheetId: payload.sheetId,
        hidden: payload.hidden
      })
    },
    [handleNativeSheetStructureIntent]
  )

  const { handleUniverSheetInserted, handleUniverSheetRemoved, handleUniverSheetRenamed } =
    useSpreadsheetUniverSheetEvents({
      appSheets: app.sheets as any,
      activeSheet: activeSheet as any,
      activeSheetId,
      activeSheetIdRef,
      createdSheetIdAliasesRef,
      pendingCreatedSheetSelectionRef,
      peerSheetDataCacheRef,
      authoritativePeerSheetDataCacheRef,
      pendingUniverRowsBySheetRef,
      pendingCellChangesRef: pendingCellChangesRef as any,
      pendingCellBatchesRef: pendingCellBatchesRef as any,
      spreadsheetGridRef: spreadsheetGridRef as any,
      socketPersistChainRef,
      operationQueueRef,
      processUniverDataChangeRef,
      flushPendingCellChangesRef,
      mutationFacade,
      persistSpreadsheetCreatedSheetContext,
      setActiveSheetId,
      applyLocalAppUpdate: applyLocalAppUpdate as any,
      getActiveSessionRows,
      getRichestKnownRowsForSheet,
      onLocalAppUpdate,
      onAppUpdate,
      chainOnOperationQueue,
      persistSpreadsheetCreatedSheet: persistSpreadsheetCreatedSheet as any,
      persistSpreadsheetSheetDelete: persistSpreadsheetSheetDelete as any,
      queuePersistSpreadsheetSheetRenameAfterCellFlush: queuePersistSpreadsheetSheetRenameAfterCellFlush as any,
      rememberKnownSheetVersion,
      rememberSheetVersion,
      queueSnapshotCheckpointForSheet,
      debugLog,
      multiSheetDebugLog,
      summarizeRowsForDebug,
      summarizeLiveWorksheetSnapshotForDebug: summarizeLiveWorksheetSnapshotForDebug as any
    })

  const handleStyleBatchOp = useCallback(
    (styleData: any) => {
      const targetSheetId = resolveReconciledSheetId(styleData.sheetId, createdSheetIdAliasesRef.current)
      void submitMutationBatch({
        sheetId: targetSheetId,
        operations: [
          {
            operationId: createOperationId('set_style'),
            type: 'set_style',
            data: { ...styleData, sheetId: targetSheetId } as unknown as Record<string, unknown>
          }
        ],
        batchIdPrefix: 'set_style',
        traceMeta: {
          traceId: styleData.traceId,
          operationType: 'set_style'
        }
      }).catch(err => {
        console.error('[SpreadsheetAppViewer] set_style batch op failed', err)
      })
    },
    [submitMutationBatch, createOperationId]
  )

  const handleMutationBatchOp = useCallback(
    async (batchData: SpreadsheetUnifiedMutationBatchPayload) => {
      if (!Array.isArray(batchData.operations) || batchData.operations.length === 0) {
        return
      }
      const routingDecision = resolveSpreadsheetKnownSheetRouting({
        producerSheetId: batchData.sheetId,
        reactActiveSheetId: activeSheetIdRef.current,
        sheets: app.sheets,
        aliases: createdSheetIdAliasesRef.current
      })
      const targetSheetId = routingDecision.targetSheetId

      // Diagnostic: detect Univer / React active-sheet routing mismatch. The
      // batch's `sheetId` is the producer's view of which sheet the user
      // edited (usually derived from Univer's active subUnitId); the React
      // active sheet is what we display in the tab strip. If they disagree
      // the write is about to land on the wrong sheet — log enough context
      // to root-cause without spamming the happy path.
      const reactActiveSheetId = activeSheetIdRef.current
      if (routingDecision.hasRoutingMismatch) {
        console.warn('[SheetRoutingMismatch] batch target sheet differs from React active sheet', {
          rawProducerSheetId: batchData.sheetId,
          resolvedTargetSheetId: targetSheetId,
          reactActiveSheetId,
          canonicalReactActiveSheetId: routingDecision.canonicalActiveSheetId,
          firstOperationType: batchData.operations[0]?.type,
          operationCount: batchData.operations.length,
          traceId: batchData.traceId ?? null,
          knownSheetIds: app.sheets.map(sheet => sheet.id),
          routingOutcome: routingDecision.outcome
        })
      }
      if (!routingDecision.knownTargetSheet) {
        console.warn('[SheetRoutingDrop] dropping mutation batch for unknown target sheet', {
          rawProducerSheetId: batchData.sheetId,
          resolvedTargetSheetId: targetSheetId,
          reactActiveSheetId,
          canonicalReactActiveSheetId: routingDecision.canonicalActiveSheetId,
          firstOperationType: batchData.operations[0]?.type,
          operationCount: batchData.operations.length,
          traceId: batchData.traceId ?? null,
          knownSheetIds: app.sheets.map(sheet => sheet.id),
          routingOutcome: routingDecision.outcome
        })
        debugLog('unified mutation batch dropped for unknown sheet', {
          traceId: batchData.traceId ?? null,
          rawProducerSheetId: batchData.sheetId,
          resolvedTargetSheetId: targetSheetId,
          routingOutcome: routingDecision.outcome
        })
        enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'viewer_unified_mutation_drop_unknown_sheet',
          traceId: batchData.traceId ?? null,
          severity: 'warning',
          payload: {
            rawProducerSheetId: batchData.sheetId,
            resolvedTargetSheetId: targetSheetId,
            reactActiveSheetId,
            canonicalReactActiveSheetId: routingDecision.canonicalActiveSheetId,
            operationCount: batchData.operations.length,
            firstOperationType: batchData.operations[0]?.type ?? null,
            knownSheetIds: app.sheets.map(sheet => sheet.id),
            routingOutcome: routingDecision.outcome
          }
        })
        return
      }

      const operationTypes = batchData.operations.map(operation => operation.type)
      let mappedOperations: SpreadsheetBatchOperation[] = batchData.operations.map(operation => ({
        operationId: createOperationId(operation.type),
        type: operation.type,
        data: {
          ...operation.data,
          ...(typeof (operation.data as { sheetId?: unknown })?.sheetId === 'string' ? { sheetId: targetSheetId } : {})
        } as Record<string, unknown>
      }))
      let diagnosticsSummary = summarizeUnifiedBatchOperationsForDiagnostics(mappedOperations)
      const affectedUiRowIds = Array.from(new Set(diagnosticsSummary.temporaryRowIdMatches.map(match => match.rowId)))
      let readinessUnresolvedRows: Array<{
        clientRowId: string
        status: string
        reason?: string
        gridRowIndex?: number
      }> = []
      const readinessResolvedRowIds = new Map<string, string>()
      const rowsBeforeGate = getPersistSheetRowsSnapshotForGrid(targetSheetId)
      const sessionResolvedRowIds = buildUiToBackendRowIdMap(rowsBeforeGate, isUuid)
      const latestSnapshotRows = getLatestAuthoritativeUniverRowsForSheet(targetSheetId) ?? []
      latestSnapshotRows.forEach(row => {
        const backendRowId = resolveBackendRowIdForViewerRow(row, isUuid)
        const clientRowId = getClientRowIdentity(row)
        if (!backendRowId || !clientRowId) return
        readinessResolvedRowIds.set(clientRowId, backendRowId)
      })
      promoteSpreadsheetRowIdentities({
        sheetId: targetSheetId,
        persistedIdByClientRowId: readinessResolvedRowIds,
        deps: {
          rowMaterializationReadiness,
          rowSlotIdentityRegistry,
          intentJournal: spreadsheetIntentJournalRef.current,
          versionCausalOwnership: versionCausalOwnershipRef.current,
          pendingLocalMutationCellsRef
        }
      })
      affectedUiRowIds.forEach(clientRowId => {
        const backendRowId =
          sessionResolvedRowIds.get(clientRowId) ??
          rowMaterializationReadiness.getResolvedBackendRowId(targetSheetId, clientRowId)
        if (!backendRowId) return
        readinessResolvedRowIds.set(clientRowId, backendRowId)
      })

      if (affectedUiRowIds.length > 0) {
        logRowIdentityDiagnostics('viewer_row_materialization_before_flush', {
          targetSheetId,
          traceId: batchData.traceId ?? null,
          readinessGateEnabled: true,
          temporaryRowIdMatches: diagnosticsSummary.temporaryRowIdMatches,
          rowIdentities: buildRowIdentityDiagnostics({
            uiRowIds: affectedUiRowIds,
            rows: rowsBeforeGate,
            uiToBackend: sessionResolvedRowIds,
            identityOverrides: new Map(
              Array.from(readinessResolvedRowIds.entries()).map(([uiRowId, backendRowUuid]) => [
                uiRowId,
                { backendRowUuid, identitySource: 'readiness_coordinator' as const }
              ])
            ),
            isUuid
          })
        })
      }

      if (affectedUiRowIds.length > readinessResolvedRowIds.size) {
        enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'viewer_row_materialization_readiness_gate_start',
          traceId: batchData.traceId ?? null,
          payload: {
            targetSheetId,
            pendingClientRowIds: affectedUiRowIds.filter(clientRowId => !readinessResolvedRowIds.has(clientRowId))
          }
        })
        const readinessResult = await rowMaterializationReadiness.awaitTemporaryRowsReadyForSubmit({
          sheetId: targetSheetId,
          clientRowIds: affectedUiRowIds.filter(clientRowId => !readinessResolvedRowIds.has(clientRowId)),
          getLatestSnapshotRows: getLatestAuthoritativeUniverRowsForSheet,
          materializeRowsFromSnapshot: async ({ sheetId, rows }) => {
            await chainOnOperationQueue(operationQueueRef, async () => {
              await materializeTemporaryRowsForSubmit(sheetId, rows)
            })
          }
        })
        readinessResult.resolved.forEach((backendRowId, clientRowId) => {
          readinessResolvedRowIds.set(clientRowId, backendRowId)
        })
        readinessUnresolvedRows = readinessResult.unresolved
        logRowIdentityDiagnostics('viewer_row_materialization_readiness_result', {
          targetSheetId,
          traceId: batchData.traceId ?? null,
          resolvedRowIds: Array.from(readinessResolvedRowIds.entries()).map(([clientRowId, backendRowId]) => ({
            clientRowId,
            backendRowId
          })),
          unresolvedRows: readinessUnresolvedRows,
          rowIdentities: buildRowIdentityDiagnostics({
            uiRowIds: affectedUiRowIds,
            rows: getPersistSheetRowsSnapshotForGrid(targetSheetId),
            uiToBackend: readinessResolvedRowIds,
            identityOverrides: new Map(
              Array.from(readinessResolvedRowIds.entries()).map(([uiRowId, backendRowUuid]) => [
                uiRowId,
                { backendRowUuid, identitySource: 'readiness_coordinator' as const }
              ])
            ),
            isUuid
          })
        })
      }

      const rebuildOperationsFromLatestSnapshot = (attempt: 'after_readiness_gate'): typeof diagnosticsSummary => {
        const rows = getPersistSheetRowsSnapshotForGrid(targetSheetId)
        const uiToBackend = buildUiToBackendRowIdMap(rows, isUuid)
        readinessResolvedRowIds.forEach((backendRowId, clientRowId) => {
          uiToBackend.set(clientRowId, backendRowId)
        })
        const remapResult = remapBatchOperationsWithUiToBackendRowMap(mappedOperations, uiToBackend)
        mappedOperations = remapResult.operations
        const nextSummary = summarizeUnifiedBatchOperationsForDiagnostics(mappedOperations)
        const attemptUiRowIds = Array.from(new Set(nextSummary.temporaryRowIdMatches.map(match => match.rowId)))

        logRowIdentityDiagnostics('viewer_row_identity_after_remap_map_build', {
          targetSheetId,
          traceId: batchData.traceId ?? null,
          attempt,
          mapSize: remapResult.mapSize,
          availableRemapKeys: remapResult.availableRemapKeys.slice(0, 20),
          remappedEntries: remapResult.remappedEntries,
          unresolvedTemporaryRowIdMatches: remapResult.unresolvedTemporaryRowIdMatches,
          unresolvedReadinessRows: readinessUnresolvedRows,
          rowIdentities: buildRowIdentityDiagnostics({
            uiRowIds: attemptUiRowIds.length > 0 ? attemptUiRowIds : affectedUiRowIds,
            rows,
            uiToBackend,
            identityOverrides: new Map(
              Array.from(readinessResolvedRowIds.entries()).map(([uiRowId, backendRowUuid]) => [
                uiRowId,
                { backendRowUuid, identitySource: 'readiness_coordinator' as const }
              ])
            ),
            isUuid
          })
        })

        return nextSummary
      }

      if (affectedUiRowIds.length > 0) {
        diagnosticsSummary = rebuildOperationsFromLatestSnapshot('after_readiness_gate')
      }

      if (diagnosticsSummary.temporaryRowIdMatches.length > 0) {
        const unresolvedRowIds = new Set(diagnosticsSummary.temporaryRowIdMatches.map(match => match.rowId))
        const deferredCellChanges: CellChange[] = []
        const nextOperations: SpreadsheetBatchOperation[] = []

        mappedOperations.forEach(operation => {
          if (operation.type === 'set_range' && Array.isArray(operation.data?.cells)) {
            const immediateCells: Array<Record<string, unknown>> = []
            operation.data.cells.forEach(cell => {
              const record =
                cell && typeof cell === 'object' && !Array.isArray(cell) ? (cell as Record<string, unknown>) : null
              const rowRef = record ? resolveSpreadsheetRowRef(record.rowRef) : undefined
              const rowId = record ? String(record.rowId ?? '') : ''
              const rowIdentity = rowId || (rowRef ? getSpreadsheetRowRefIdentity(rowRef) : '')
              const columnName = record ? String(record.columnName ?? '') : ''
              if (!record || !rowIdentity || !unresolvedRowIds.has(rowIdentity)) {
                if (record) {
                  immediateCells.push(record)
                }
                return
              }
              if (!columnName) return
              deferredCellChanges.push({
                rowId: rowIdentity,
                columnName,
                value: Object.prototype.hasOwnProperty.call(record, 'value') ? record.value : undefined,
                sheetId: targetSheetId,
                traceId: batchData.traceId
              })
            })
            if (immediateCells.length > 0) {
              nextOperations.push({
                ...operation,
                data: {
                  ...operation.data,
                  cells: immediateCells
                }
              })
            }
            return
          }

          if (
            (operation.type === 'set_cell' || operation.type === 'clear_cell') &&
            operation.data &&
            typeof operation.data === 'object'
          ) {
            const rowRef = resolveSpreadsheetRowRef(operation.data.rowRef)
            const rowId = String(operation.data.rowId ?? '')
            const rowIdentity = rowId || (rowRef ? getSpreadsheetRowRefIdentity(rowRef) : '')
            if (!rowIdentity || !unresolvedRowIds.has(rowIdentity)) {
              nextOperations.push(operation)
              return
            }
            const columnName = String(operation.data.columnName ?? '')
            if (!columnName) return
            deferredCellChanges.push({
              rowId: rowIdentity,
              columnName,
              value: operation.type === 'clear_cell' ? undefined : operation.data.value,
              sheetId: targetSheetId,
              traceId: batchData.traceId
            })
            return
          }

          nextOperations.push(operation)
        })

        if (deferredCellChanges.length > 0) {
          pendingCellChangesRef.current = coalesceQueuedCellChanges([
            ...pendingCellChangesRef.current,
            ...deferredCellChanges
          ])
          persistPendingCellJournal()
          schedulePendingCellPersist()
          logRowIdentityDiagnostics('viewer_unified_mutation_deferred_pending_identity', {
            targetSheetId,
            traceId: batchData.traceId ?? null,
            deferredCellCount: deferredCellChanges.length,
            unresolvedRowIds: Array.from(unresolvedRowIds),
            readinessUnresolvedRows
          })
        }

        mappedOperations = nextOperations
        diagnosticsSummary = summarizeUnifiedBatchOperationsForDiagnostics(mappedOperations)
      }

      if (mappedOperations.length === 0) {
        return
      }

      const chunks = splitUnifiedOperationsByPersistKind(
        mappedOperations,
        SPREADSHEET_UNIFIED_MUTATION_SUBMIT_MAX_BYTES
      )
      debugLog('unified mutation batch submit', {
        traceId: batchData.traceId ?? null,
        targetSheetId,
        operationCount: batchData.operations.length,
        operationTypes,
        chunkCount: chunks.length,
        approximatePayloadBytes: diagnosticsSummary.approximatePayloadBytes,
        temporaryRowIdCount: diagnosticsSummary.temporaryRowIdCount
      })
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'viewer_unified_mutation_submit_requested',
        traceId: batchData.traceId ?? null,
        payload: {
          targetSheetId,
          operationCount: batchData.operations.length,
          operationTypes,
          chunkCount: chunks.length,
          approximatePayloadBytes: diagnosticsSummary.approximatePayloadBytes,
          hasNonBackendRowIdInSetRange: diagnosticsSummary.hasNonBackendRowIdInSetRange,
          temporaryRowIdCount: diagnosticsSummary.temporaryRowIdCount,
          temporaryRowIdMatches: diagnosticsSummary.temporaryRowIdMatches,
          suspiciousClientIds: diagnosticsSummary.suspiciousClientIds,
          readinessResolvedRowIds: Array.from(readinessResolvedRowIds.entries()).map(([clientRowId, backendRowId]) => ({
            clientRowId,
            backendRowId
          })),
          readinessUnresolvedRows
        }
      })

      try {
        for (const chunk of chunks) {
          // V1 wiring: resolved normal ops are enqueued into the per-sheet
          // work queue (Guard A: not pushed to `pendingCellChangesRef`). The
          // queue serializes against remote applies (version equality
          // invariant) and handles coalescing for consecutive cellValue
          // groups. Atomic boundaries (paste/style/structural/etc.) flush as
          // their own ordered group. The queue calls `submitMutationBatch`
          // internally — its 409 retry + recoverFromVersionConflict path is
          // unchanged.
          const kind = chunk.kind
          const ownedCellKeys = extractOwnedCellKeysFromChunk(chunk.operations)
          const protectedCellKeys = extractPendingLocalMutationCellKeysFromChunk(targetSheetId, chunk.operations)
          await sheetWorkQueue.enqueueLocalPersist(targetSheetId, {
            sheetId: targetSheetId,
            kind,
            operations: chunk.operations,
            enqueuedAt: Date.now(),
            traceId: batchData.traceId,
            ownedCellKeys: ownedCellKeys.length > 0 ? ownedCellKeys : undefined,
            protectedCellKeys: protectedCellKeys.length > 0 ? protectedCellKeys : undefined,
            batchIdPrefix: 'unified_mutation',
            traceMeta: {
              traceId: batchData.traceId,
              operationType: 'unified_mutation'
            }
          })
        }
      } catch (err) {
        enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'viewer_unified_mutation_submit_failed',
          traceId: batchData.traceId ?? null,
          severity: 'error',
          payload: {
            ...diagnosticsSummary,
            targetSheetId,
            operationTypes,
            chunkCount: chunks.length,
            message: err instanceof Error ? err.message : 'unknown'
          }
        })
        console.error('[SpreadsheetAppViewer] unified mutation batch op failed', err)
      }
    },
    [
      app.sheets,
      activeSheetIdRef,
      sheetWorkQueue,
      createOperationId,
      chainOnOperationQueue,
      createdSheetIdAliasesRef,
      debugLog,
      enqueueDiagnosticsTraceEvent,
      getLatestAuthoritativeUniverRowsForSheet,
      getPersistSheetRowsSnapshotForGrid,
      isUuid,
      logRowIdentityDiagnostics,
      materializeTemporaryRowsForSubmit,
      operationQueueRef,
      pendingCellChangesRef,
      persistPendingCellJournal,
      rowMaterializationReadiness,
      schedulePendingCellPersist
    ]
  )

  const handleGridInitLifecycle = useCallback(
    (event: UniverSheetGridInitLifecycleEvent) => {
      setGridInitLifecycle(event)
      debugLog('grid init lifecycle', {
        appId: app.id,
        activeSheetId,
        phase: event.phase,
        sheetId: event.sheetId,
        workbookInstanceKey: event.workbookInstanceKey,
        snapshotSeed: event.snapshotSeed,
        reason: event.reason,
        width: event.width,
        height: event.height
      })
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'viewer_grid_init_lifecycle',
        severity: event.phase === 'bootstrap_failed' || event.phase === 'canvas_timeout' ? 'warning' : 'info',
        sheetId: event.sheetId,
        payload: {
          phase: event.phase,
          activeSheetId,
          workbookInstanceKey: event.workbookInstanceKey,
          snapshotSeed: event.snapshotSeed ?? null,
          reason: event.reason ?? null,
          message: event.message ?? null,
          width: event.width ?? null,
          height: event.height ?? null
        }
      })
    },
    [activeSheetId, app.id, enqueueDiagnosticsTraceEvent]
  )

  const structuralMutations = useSpreadsheetGridStructuralMutations({
    activeSheetIdRef,
    createdSheetIdAliasesRef,
    operationQueueRef,
    chainOnOperationQueue,
    mutationFacade: mutationFacade as any,
    rowSlotIdentityRegistry,
    rowMaterializationReadiness,
    spreadsheetIntentJournalRef,
    versionCausalOwnershipRef,
    pendingLocalMutationCellsRef,
    flushPendingCellChangesRef,
    activeSheetColumns: activeSheet.columns as any,
    spreadsheetColumnsForGrid: spreadsheetColumnsForGrid as any,
    spreadsheetGridRef: spreadsheetGridRef as any,
    getActiveSessionRows,
    getKnownRowsForSheet,
    commitLocalSheetData,
    syncSheetRowsIntoLocalState,
    pendingUniverRowsBySheetRef,
    latestUniverDataRef,
    lastProcessedLengthRef,
    buildAddRowPayloadsFromUniverRows,
    buildPersistedRowIdMapFromInsertRowSlotsResult,
    mapPersistedRowsToViewerRows,
    createNativeSpreadsheetClientRowId,
    logRowIdentityDiagnostics,
    buildRowIdentityDiagnostics: buildRowIdentityDiagnostics as any,
    isUuid,
    isUuidString,
    recoverFromVersionConflictRef,
    sheetPersist,
    versioning,
    sheetPersistErrorMessage: sheetT('persist-rows-add-failed'),
    onDiagnosticsTraceEvent: enqueueDiagnosticsTraceEvent,
    handleColumnsInsertInternal: columnsState.handleColumnsInsert as any,
    handleColumnsDeleteInternal: columnsState.handleColumnsDelete as any,
    handleColumnsMoveInternal: columnsState.handleColumnsMove as any,
    scheduleStructuralSnapshotReload: (targetSheetId: string) => {
      scheduleRemoteStructuralResync(targetSheetId, { immediate: true })
    }
  })

  const mainView = useSpreadsheetMainViewRenderer({
    viewType,
    isBootstrapCanonicalReady,
    isBootstrapWorkbookEnriching,
    workbookSnapshotSyncFailed: isBootstrapWorkbookSyncFailed,
    preferUniverNativeSheetTabs,
    sheetCount: app.sheets.length,
    hasBootstrappedDone: hasBootstrappedForAppIdRef.current.done,
    activeSheet,
    sheetData,
    initialSnapshot: bootstrapSnapshot,
    initialSnapshotSeed: bootstrapSnapshotSeed as any,
    tableUniverSnapshot: tableUniverSnapshot as any,
    tableSnapshotSeed: tableSnapshotSeed as any,
    authoritativeDataSyncToken: authoritativeDataSyncToken as any,
    authoritativePaintCellsRef,
    authoritativePaintMetaRef,
    workbookInstanceKey: tableWorkbookInstanceKey as any,
    pendingLocalMutationCellsRef,
    spreadsheetIntentJournalRef,
    versionCausalOwnershipRef,
    resolveKnownSheetVersion,
    spreadsheetColumnsForGrid,
    testId,
    onNativeSheetStructureIntent: handleNativeSheetStructureIntent as any,
    onActiveWorksheetChange: handleUniverActiveWorksheetChange,
    onUniverSheetInserted: handleUniverSheetInserted as any,
    onUniverSheetRemoved: handleUniverSheetRemoved as any,
    onUniverSheetRenamed: handleUniverSheetRenamed as any,
    onUniverSheetVisibilityChanged: handleUniverSheetVisibilityChanged as any,
    getSheetContext: resolveSheetContextForGrid,
    onCellChange: handleCellChange,
    onCellsChange: handleCellsChange,
    onSnapshotRequested: enqueueUniverSnapshotCheckpoint,
    onWorkbookSnapshotLifecycle: handleWorkbookSnapshotLifecycle as any,
    onOpenCommentRequest: handleOpenCommentRequest as any,
    commentedCells: commentedCells as any,
    onDataChange: handleUniverDataChange,
    participants: collaboration.cursorParticipants,
    emitOperation: op => collaboration.emitOperation(op as any),
    onDiagnosticsTraceEvent: enqueueDiagnosticsTraceEvent as any,
    onGridInitLifecycle: handleGridInitLifecycle,
    onStyleBatchOp: handleStyleBatchOp,
    onMutationBatchOp: handleMutationBatchOp,
    flushUnmaterializedRowsBeforePersistRef,
    flushPendingCellChangesRef,
    flushDeferredDirtyCellsRef,
    getPersistSheetRowsSnapshot: getPersistSheetRowsSnapshotForGrid,
    getPersistedBaselineRowsSnapshot: getPersistedBaselineRowsSnapshotForGrid,
    isBackendRowUuid: (value: string) => isUuid(value),
    rowSlotIdentityRegistryRef,
    rowMaterializationReadinessRef,
    columnStructureStateRef: columnsState.columnStructureStateRef,
    onCursorEmit: handleLocalCursorEmit,
    getCanonicalSheetId,
    collaborationEnabled: collaboration.isCollaborationConnected,
    canEditWithLock,
    onColumnAdd: columnsState.handleAutoColumnAdd,
    onColumnsInsert: structuralMutations.onColumnsInsert,
    onRowsInsert: structuralMutations.onRowsInsert,
    onRowsDelete: structuralMutations.onRowsDelete,
    onRowsMove: structuralMutations.onRowsMove,
    onColumnsDelete: structuralMutations.onColumnsDelete,
    onColumnsMove: structuralMutations.onColumnsMove,
    onCellRangeMove: structuralMutations.onCellRangeMove,
    onDimensionsChange: handleDimensionsChanged as any,
    gridRef: spreadsheetGridRef as any,
    onEditRow: row => setEditingRow(row),
    onDeleteRow: handleDeleteRow,
    activeView
  })
  const { showEmergencyFallback, emergencyFallbackColumns } = useSpreadsheetEmergencyFallbackGuard({
    appId: app.id,
    activeSheetId,
    viewType,
    testId,
    workbookInstanceKey: tableWorkbookInstanceKey,
    isBootstrapCanonicalReady,
    activeSheetColumns: activeSheet.columns,
    sheetRowCount: sheetData.length,
    gridInitLifecycle
  })

  const { layoutProps } = useSpreadsheetViewerController({
    testId,
    mainView,
    header: {
      app,
      activeSheet,
      onBack: handleGuardedBack,
      onNavigateToSpreadsheetHub: handleGuardedNavigateToSpreadsheetHub,
      isEditing,
      canEditWithLock,
      headerParticipants: collaboration.headerParticipants,
      isCollaborationConnected: collaboration.isCollaborationConnected,
      isEntityDataLoading: entityState.isLoading,
      onRefreshEntityData: () => void refreshEntityData(),
      versioning: headerSaveStatus.versioning,
      persistenceError: headerSaveStatus.persistenceError,
      onShowCheckpointDialog: () => setShowCheckpointDialog(true),
      onShowVersionHistory: () => {
        setShowVersionHistory(true)
        void versioning.loadVersions()
      },
      publishingStatus: app.publishMetadata?.status || 'draft',
      showComments,
      onToggleComments: spreadsheetCommentSidebar.toggleCommentsSidebar,
      unresolvedCommentCount: spreadsheetCommentSidebar.unresolvedCommentCount,
      fileLock: {
        lock: fileLock.lock,
        isLockedByMe: fileLock.isLockedByMe,
        acquireLock: () => {
          void fileLock.acquireLock()
        },
        releaseLock: () => {
          void fileLock.releaseLock()
        }
      },
      onShare,
      onManageShares,
      onRenameAppName: handleRenameAppName,
      onOpenAICapability: handleOpenAICapability,
      onOpenAnalytics: openAnalyticsPanel,
      onOpenAutomations: openAutomationsPanel,
      showCheckCollectionResponses: hasEnabledSheetCollectionAutomation,
      onCheckCollectionResponses: handleCheckCollectionResponses,
      onEdit,
      onExport: () => void handleExportToExcel(),
      isCollectionCopy,
      collectionSubmittedAt,
      onSubmitCollection,
      showDiagnosticsButton,
      activeTraceSession,
      openDiagnosticsDialog
    },
    entityBar: {
      enabled: entityEnabled,
      isLoading: entityState.isLoading,
      error: entityState.error,
      dataCount: entityDataCount,
      dataSourceName: activeSheet.entityDataSource?.entityDisplayName,
      onRefresh: () => void refreshEntityData(),
      onEdit
    },
    emergencyFallback: {
      show: showEmergencyFallback,
      columns: emergencyFallbackColumns,
      sheetData
    },
    sheetTabs: {
      preferUniverNativeSheetTabs,
      sheets: app.sheets,
      activeSheetId,
      onSheetChange: setActiveSheetIdWithPeerCache,
      entityDataLength: entityEnabled ? entityDataCount : undefined
    },
    dialogs: {
      canEditWithLock,
      editingRow,
      setEditingRow,
      formFields,
      handleUpdateRow,
      accessToken,
      isManageColumnsDialogOpen: columnsState.isManageColumnsDialogOpen,
      setIsManageColumnsDialogOpen: columnsState.setIsManageColumnsDialogOpen,
      columns: activeSheet.columns,
      editingColumns,
      setEditingColumns,
      handleAddColumn: columnsState.handleAddColumn,
      onSaveColumns,
      showVersionHistory,
      setShowVersionHistory,
      versionUserDisplayMap,
      versioningForDialogs: { ...versioning, createCheckpoint: createCheckpointWithFlush } as any,
      handleRestoreVersion: versioning.restoreVersion as any,
      showCheckpointDialog,
      setShowCheckpointDialog,
      showPublishDialog,
      setShowPublishDialog,
      publishing: publishing as any,
      showComments,
      setShowComments,
      commentPanel: {
        comments: spreadsheetCommentSidebar.filteredComments,
        unresolvedCount: spreadsheetCommentSidebar.unresolvedCommentCount,
        isLoading: comments.isLoading,
        onCreateComment: async (content, parentId, userName, userAvatar) => {
          const ok = await spreadsheetCommentSidebar.handleCreateComment(content, parentId, userName, userAvatar)
          if (!ok) {
            throw new Error('Failed to create comment')
          }
        },
        onUpdateComment: async (commentId, content) => {
          const ok = await spreadsheetCommentSidebar.handleUpdateComment(commentId, content)
          if (!ok) {
            throw new Error('Failed to update comment')
          }
        },
        onResolveComment: async commentId => {
          const ok = await spreadsheetCommentSidebar.handleResolveComment(commentId)
          if (!ok) {
            throw new Error('Failed to resolve comment')
          }
        },
        onUnresolveComment: commentId => spreadsheetCommentSidebar.handleUnresolveComment(commentId),
        onDeleteComment: async commentId => {
          const ok = await spreadsheetCommentSidebar.handleDeleteComment(commentId)
          if (!ok) {
            throw new Error('Failed to delete comment')
          }
        },
        onScrollToHighlight: spreadsheetCommentSidebar.handleScrollToHighlight,
        onUnhighlight: undefined
      },
      currentUserId: userId,
      currentUserName: collaboration.currentUserName,
      currentUserAvatar: collaboration.currentUserAvatar
    },
    diagnostics: {
      open: isDiagnosticsDialogOpen,
      onOpenChange: onDiagnosticsDialogOpenChange,
      activeTraceSession,
      scope: diagnosticsScope,
      ttlMinutes: diagnosticsTtlMinutes,
      isStarting: isStartingTraceSession,
      isStopping: isStoppingTraceSession,
      isRefreshing: isRefreshingTraceData,
      traceSessions,
      selectedTraceSessionId,
      events: traceEvents,
      findings: traceFindings,
      currentUserId: userId,
      currentTabId: diagnosticsTabIdRef.current,
      onScopeChange: setDiagnosticsScope,
      onTtlChange: setDiagnosticsTtlMinutes,
      onStartTrace: startDiagnosticsTrace,
      onStopTrace: stopDiagnosticsTrace,
      onRefresh: refreshDiagnosticsTraceData,
      onClearDisplayedData: clearDisplayedDiagnosticsData,
      onSelectTraceSession: selectDiagnosticsTraceSession
    },
    sidePanels: {
      isAutomationsOpen,
      isAnalyticsOpen,
      isSheetsAIOpen,
      closeAutomationsPanel,
      closeAnalyticsPanel,
      closeSheetsAIPanel,
      analyticsInitialTab,
      sheetsAIInitialTab,
      columns: activeSheet.columns,
      sheetData,
      sheetName: activeSheet.name,
      activeSheetId,
      appId: app.id,
      accessToken,
      canEditWithLock,
      viewType,
      entityEnabled,
      getHeaderRowFromGrid: getHeaderRowFromGrid as any,
      getSheetDataFromGrid: getSheetDataFromGrid as any,
      handleInsertAnalyticsRows: handleInsertAnalyticsRows as any,
      handleApplyFormulaToColumn: handleApplyFormulaToColumn as any,
      handleCreateReviewComment,
      onOpenCheckpointDialog: () => setShowCheckpointDialog(true),
      automations: automations as any,
      onCheckCollectionResponses: handleCheckCollectionResponses as any,
      onBulkCollectionColumnLabelsUpdate: onBulkCollectionColumnLabelsUpdate as any
    },
    collaborationHealth: {
      collaborationHealth: collaboration.collaborationHealth
    },
    debugBar: {
      enabled: isSpreadsheetAppsDebugEnabled(),
      snapshotDebugInfo,
      snapshotSaveMetricsRef,
      socketDebugInfo,
      collaborationHealth: collaboration.collaborationHealth,
      isPersistSaving: sheetPersist.isSaving,
      hasLocalDirty: sheetPersist.hasLocalDirty,
      lastPersistedAt: sheetPersist.lastPersistedAt,
      persistError: sheetPersist.error,
      isVersionSaving: versioning.isSaving,
      hasUnsavedChanges: versioning.hasUnsavedChanges,
      canEdit: fileLock.canEdit,
      participantCount: collaboration.headerParticipants.length
    }
  })

  return <SpreadsheetViewerLayout {...layoutProps} />
}
