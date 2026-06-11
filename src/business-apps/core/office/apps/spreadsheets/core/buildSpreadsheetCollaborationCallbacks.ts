import type React from 'react'
import { toast } from 'sonner'

import type {
  SpreadsheetBulkRemoteApplyResult,
  SpreadsheetBulkRemoteApplyMeta,
  SpreadsheetBulkRemoteCellItem,
  SpreadsheetCollaborationCallbacks,
  SpreadsheetReplayResponse
} from './SpreadsheetCollaborationContract'
import type { SheetWorkQueueApi } from './spreadsheetSheetWorkQueue'
import type { SpreadsheetMutationFacade } from './SpreadsheetMutationFacade'
import type { SpreadsheetSession } from './SpreadsheetSession'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import { UniverRemoteTransactionRunner } from './univerRemoteTransactionRunner'
import { hydrateCachedRowsWithServerIdentities } from '../utils/spreadsheetPeerRowHydration'
import { findSessionGridDivergences } from '../utils/spreadsheetSessionGridDivergence'
import { resolveReconciledSheetId } from '../utils/reconcileTemporarySheetId'
import type { StructuralWsDedupToken } from '../utils/spreadsheetStructuralWsDedup'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import { createCollaborationApplyRemoteDimensions } from '../hooks/collaborationApplyRemoteDimensions'
import { createCollaborationWorkbookStructureHandler } from '../hooks/collaborationWorkbookStructureBridge'
import type { UniverSheetGridCollaborationBridgeHandle } from '../components/UniverSheetGrid.types'
import { isServerAuthoritativeRepairReapply } from '../utils/spreadsheetBackendRepairReapply'
import type {
  AuthoritativeGridReapplyTarget,
  ForceAuthoritativeGridReapplyOptions
} from '../utils/spreadsheetAuthoritativeRegion'
import { normalizeAuthoritativeGridReapplyTarget } from '../utils/spreadsheetAuthoritativeRegion'
import type {
  SpreadsheetLiveRemoteApplyVersionScope,
  SpreadsheetVersionCausalOwnershipRegistry
} from './spreadsheetVersionCausalOwnership'
import type {
  SpreadsheetCommittedCommentAnchorPatch,
  SpreadsheetCommittedWorksheetMetadataPatch
} from './spreadsheetCommittedDeltaContract'

type ViewerRow = Record<string, unknown>

function forwardForceAuthoritativeReapply(
  spreadsheetGridRef: React.MutableRefObject<UniverSheetGridCollaborationBridgeHandle | null | undefined>,
  region: AuthoritativeGridReapplyTarget | undefined,
  options: ForceAuthoritativeGridReapplyOptions | undefined,
  diagnostics: {
    debugLog: (message: string, meta?: Record<string, unknown>) => void
    enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  }
): void {
  const regions = normalizeAuthoritativeGridReapplyTarget(region)
  const isFullGrid = regions == null
  if (isFullGrid && options?.allowFullGridReapply !== true) {
    diagnostics.debugLog('full_grid_reapply_blocked_supported_op', {
      reason: options?.reason ?? 'full_grid_reapply_not_allowed'
    })
    diagnostics.enqueueDiagnosticsTraceEvent({
      source: 'client',
      stage: 'client_collab_force_grid_reapply_blocked',
      severity: 'info',
      payload: {
        reason: options?.reason ?? 'full_grid_reapply_not_allowed',
        boundedRegion: false,
        diagnostic: 'full_grid_reapply_blocked_supported_op'
      }
    })
    return
  }
  if (regions && regions.length > 1) {
    diagnostics.debugLog('multi_region_authoritative_reapply', {
      regionCount: regions.length,
      reason: options?.reason
    })
  }
  const target: AuthoritativeGridReapplyTarget = regions == null ? null : regions.length === 1 ? regions[0] : regions
  spreadsheetGridRef.current?.forceAuthoritativeReapply?.(target, options)
}

export interface BuildSpreadsheetCollaborationCallbacksParams {
  spreadsheetSession: SpreadsheetSession
  activeSheet: SpreadsheetSheet
  appSheetsRef: React.MutableRefObject<SpreadsheetSheet[]>
  peerSheetDataCacheRef: React.MutableRefObject<Map<string, ViewerRow[]>>
  authoritativePeerSheetDataCacheRef: React.MutableRefObject<Set<string>>
  getBackendRowIdForUiRowIdRef: React.MutableRefObject<(uiRowId: string, univerRow?: number) => string | undefined>
  activeSheetId: string
  commitLocalSheetData: SpreadsheetCollaborationCallbacks['commitLocalSheetData']
  syncSheetRowsIntoLocalState: (
    targetSheetId: string,
    rows: ViewerRow[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      version?: number
      recoveredSheetMeta?: SpreadsheetSheet
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
      authoritativeApplyMeta?: SpreadsheetBulkRemoteApplyMeta | null
    }
  ) => void
  applyRemoteCellUpdateWithRetry: SpreadsheetCollaborationCallbacks['applyRemoteCellUpdate']
  activeSheetIdRef: React.MutableRefObject<string>
  spreadsheetGridRef: React.MutableRefObject<UniverSheetGridCollaborationBridgeHandle | null | undefined>
  getWorkbookSnapshot: () => Record<string, unknown> | null
  applyCommittedWorksheetMetadataPatch: (patch: SpreadsheetCommittedWorksheetMetadataPatch) => void
  applyCommittedCommentAnchorPatches: (patches: SpreadsheetCommittedCommentAnchorPatch[]) => void
  recentLocalRowHeightRef: React.MutableRefObject<Map<string, { height: number; at: number }>>
  recentLocalColWidthRef: React.MutableRefObject<Map<string, { width: number; at: number }>>
  baselineRowHeightsRef: React.MutableRefObject<Map<number, number>>
  baselineColWidthsRef: React.MutableRefObject<Map<number, number>>
  updateActiveSheetVersion: (version: number, mode?: 'set' | 'max') => void
  rememberSheetVersion: (sheetId: string, version: number) => void
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  structuralWsDedupRef: React.MutableRefObject<StructuralWsDedupToken | null>
  ensureRemoteSheetInLiveWorkbook: (sheet: Record<string, unknown> | undefined, insertIndex?: number) => void
  renameRemoteSheetInLiveWorkbook: (sheetId: string | undefined, nextName: string | undefined) => void
  removeRemoteSheetFromLiveWorkbook: (sheetId: string | undefined) => void
  setRemoteSheetVisibilityInLiveWorkbook: (
    sheetId: string | undefined,
    hidden: boolean | undefined,
    options?: { syncActiveSheet?: boolean }
  ) => void
  mapPersistedRowsToViewerRows: (rows: unknown) => ViewerRow[]
  onAppRefreshNeeded?: (appId: string, sheetId?: string) => void | Promise<void>
  appId: string
  markSheetNeedsGridMaterialization: (sheetId: string, reason: string) => void
  requestSheetDeltaCatchUp: (
    sheetId: string,
    reason:
      | 'collaboration_join'
      | 'collaboration_reconnect'
      | 'sheet_activation'
      | 'visibility'
      | 'focus'
      | 'version_gap'
      | 'row_identity_mismatch'
      | 'stale_version_data_op',
    options?: { sinceVersion?: number; incomingVersion?: number }
  ) => Promise<boolean>
  scheduleSheetVersionRefreshFromApi: () => void
  scheduleRemoteStructuralResync: (sheetId?: string, options?: { immediate?: boolean }) => void
  handleRemoteColumnUpdate: (data: Record<string, unknown>) => void
  mutationFacadeRef: React.MutableRefObject<SpreadsheetMutationFacade | null>
  fetchSheetReplaySince: (sheetId: string, sinceVersion: number) => Promise<SpreadsheetReplayResponse>
  isSpreadsheetAppsDebugEnabled: () => boolean
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  sheetT: (key: string) => string
  debugLog: (message: string, meta?: Record<string, unknown>) => void
  setActiveSheetId: (id: string) => void
  getActiveSessionRows: () => ViewerRow[]
  resolveKnownSheetVersion: (sheetId: string) => number
  coordinateForceGridReapply?: SpreadsheetCollaborationCallbacks['forceGridReapply']
  createdSheetIdAliasesRef?: React.MutableRefObject<Map<string, string>>
  isRecentLocalBatchId?: (batchId: string | undefined, tabId?: string | undefined) => boolean
  /**
   * Sheet work queue accessor. When this resolves to a queue (set after
   * collaboration callbacks are constructed via a ref bridge), the callbacks
   * use it for two distinct concerns:
   *
   *  1. **Version echo (conservative path support)**: `onVersionUpdate` and
   *     `onSheetVersionUpdate` feed a `versionOnlyEcho` job so the queue's
   *     per-sheet `queueClientAppliedVersion` advances in lockstep with the
   *     collab manager. This is the load-bearing signal for the version
   *     equality invariant that gates conservative-path local submits
   *     (structural / style / paste / etc.). Cell-value writes use the
   *     fast path and do not require this signal.
   *
   *  2. **Remote paint overlay protection**: `applyRemoteCellUpdate` and
   *     `applyRemoteCellUpdatesBulk` consult `isQueueOwnedCell` and skip
   *     the visible grid paint for any cell with an unresolved local
   *     intent (status `pending` / `scheduled` / `submitting`). Baseline
   *     and session continue to receive the remote value through other
   *     channels; only the user-visible paint is suppressed until the
   *     backend response resolves ownership. This is what prevents
   *     remote replay from clobbering a freshly typed value before the
   *     server has had a chance to accept or reject it.
   */
  getSheetWorkQueue?: () => SheetWorkQueueApi | null
  isRowMaterializationInFlight?: (sheetId: string) => boolean
  versionCausalOwnershipRef?: React.MutableRefObject<SpreadsheetVersionCausalOwnershipRegistry | null>
  liveRemoteApplyVersionRef?: React.MutableRefObject<SpreadsheetLiveRemoteApplyVersionScope | null>
}

/**
 * Builds the collaboration manager callback bundle (session reads + grid apply + structural WS).
 */
export function buildSpreadsheetCollaborationCallbacks(
  params: BuildSpreadsheetCollaborationCallbacksParams
): SpreadsheetCollaborationCallbacks {
  const {
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
    getWorkbookSnapshot,
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
    appId,
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
    coordinateForceGridReapply,
    createdSheetIdAliasesRef,
    isRecentLocalBatchId,
    getSheetWorkQueue,
    isRowMaterializationInFlight,
    liveRemoteApplyVersionRef
  } = params
  const dispatchForceGridReapply: SpreadsheetCollaborationCallbacks['forceGridReapply'] = (
    sheetId,
    region,
    options
  ) => {
    const shouldUseCoordinatedRepair =
      typeof coordinateForceGridReapply === 'function' &&
      isServerAuthoritativeRepairReapply({
        reason: options?.reason,
        pendingLocalFilterPolicy: options?.pendingLocalFilterPolicy
      })
    if (shouldUseCoordinatedRepair) {
      coordinateForceGridReapply(sheetId, region, options)
      return
    }
    globalThis.setTimeout(() => {
      if (activeSheetIdRef.current !== sheetId) return
      forwardForceAuthoritativeReapply(spreadsheetGridRef, region ?? null, options, {
        debugLog,
        enqueueDiagnosticsTraceEvent
      })
    }, 0)
  }

  /**
   * Feeds a `versionOnlyEcho` job to the queue so `queueClientAppliedVersion`
   * advances when the collab manager reports a new authoritative version.
   *
   * Under concurrent fast typing the collab manager fires this once per
   * remote keystroke. The queue only needs the **latest** version per sheet
   * (`queueClientAppliedVersion` is a monotonic max), so we coalesce all
   * intermediate values into a single rAF-scheduled enqueue per sheet.
   * This collapses 10–20 queue tasks per second per peer into 1 per frame,
   * which removes the dominant source of `chainOnOperationQueue` churn
   * during concurrent typing.
   *
   * Safe no-op when the queue accessor is not provided or returns null
   * (legacy / tests / pre-mount).
   */
  const pendingVersionEcho = new Map<string, number>()
  let pendingVersionEchoHandle: number | null = null
  const getQueueAppliedVersion = (sheetId: string): number | null => {
    const queue = getSheetWorkQueue?.()
    if (!queue || typeof queue.getDebugState !== 'function') {
      return null
    }
    const appliedVersion = queue.getDebugState(sheetId).queueClientAppliedVersion
    return typeof appliedVersion === 'number' && Number.isFinite(appliedVersion) ? Math.trunc(appliedVersion) : null
  }
  const flushPendingVersionEchoes = (): void => {
    pendingVersionEchoHandle = null
    const queue = getSheetWorkQueue?.()
    if (!queue) {
      pendingVersionEcho.clear()
      return
    }
    for (const [sheetId, version] of pendingVersionEcho) {
      const queueAppliedVersion = getQueueAppliedVersion(sheetId)
      if (queueAppliedVersion != null && queueAppliedVersion >= version) {
        debugLog('versionOnlyEcho_noop', {
          sheetId,
          version,
          queueAppliedVersion
        })
        enqueueDiagnosticsTraceEvent({
          source: 'client',
          stage: 'client_version_echo_noop',
          severity: 'info',
          version,
          payload: {
            sheetId,
            incomingVersion: version,
            queueAppliedVersion,
            diagnostic: 'versionOnlyEcho_noop'
          }
        })
        continue
      }
      void queue.enqueueRemoteApply(sheetId, 'versionOnlyEcho', async controller => {
        controller.markVersionDone(version)
      })
    }
    pendingVersionEcho.clear()
  }
  const scheduleVersionEchoFlush = (): void => {
    if (pendingVersionEchoHandle != null) return
    const raf = (globalThis as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }).requestAnimationFrame
    if (typeof raf === 'function') {
      pendingVersionEchoHandle = raf(() => flushPendingVersionEchoes())
      return
    }
    pendingVersionEchoHandle = (globalThis as { setTimeout: typeof setTimeout }).setTimeout(
      () => flushPendingVersionEchoes(),
      16
    ) as unknown as number
  }
  const seedQueueVersionEcho = (sheetId: string, version: number): void => {
    if (!sheetId || !Number.isFinite(version)) return
    const previous = pendingVersionEcho.get(sheetId)
    if (previous == null || version > previous) {
      pendingVersionEcho.set(sheetId, version)
    }
    scheduleVersionEchoFlush()
  }
  const routeVersionEcho = (
    sheetId: string,
    version: number,
    knownVersionBefore: number,
    options?: { isLocalEcho?: boolean }
  ): void => {
    if (!sheetId || !Number.isFinite(version)) return
    const liveAppliedVersionScope = liveRemoteApplyVersionRef?.current
    const liveVersionAlreadyApplied =
      liveAppliedVersionScope?.sheetId === sheetId && liveAppliedVersionScope.appliedVersion === version
    const clearLiveAppliedVersionScope = () => {
      if (
        liveRemoteApplyVersionRef?.current?.sheetId === sheetId &&
        liveRemoteApplyVersionRef.current.appliedVersion === version
      ) {
        liveRemoteApplyVersionRef.current = null
      }
    }
    if (liveVersionAlreadyApplied) {
      seedQueueVersionEcho(sheetId, version)
      clearLiveAppliedVersionScope()
      return
    }
    if (options?.isLocalEcho) {
      debugLog('versionOnlyEcho_local_echo_noop', {
        sheetId,
        version,
        knownVersionBefore
      })
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'client_version_echo_local_echo_noop',
        severity: 'info',
        version,
        payload: {
          sheetId,
          incomingVersion: version,
          knownVersionBefore,
          diagnostic: 'versionOnlyEcho_local_echo_noop'
        }
      })
      seedQueueVersionEcho(sheetId, version)
      clearLiveAppliedVersionScope()
      return
    }
    const queueAppliedVersion = getQueueAppliedVersion(sheetId)
    const confirmedVersionCandidates = [queueAppliedVersion, knownVersionBefore].filter(
      (candidate): candidate is number => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0
    )
    const latestConfirmedVersion =
      confirmedVersionCandidates.length > 0 ? Math.max(...confirmedVersionCandidates) : null
    const catchUpBaselineVersion =
      typeof knownVersionBefore === 'number' && Number.isFinite(knownVersionBefore) && knownVersionBefore >= 0
        ? Math.trunc(knownVersionBefore)
        : latestConfirmedVersion
    if (!liveVersionAlreadyApplied && catchUpBaselineVersion != null && version > catchUpBaselineVersion) {
      debugLog('versionEcho_requires_catchup', {
        sheetId,
        version,
        catchUpBaselineVersion,
        latestConfirmedVersion,
        queueAppliedVersion,
        knownVersionBefore,
        liveAppliedVersion: liveAppliedVersionScope?.sheetId === sheetId ? liveAppliedVersionScope.appliedVersion : null
      })
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'client_version_echo_requires_catchup',
        severity: 'info',
        version,
        payload: {
          sheetId,
          incomingVersion: version,
          sinceVersion: catchUpBaselineVersion,
          catchUpBaselineVersion,
          queueAppliedVersion,
          knownVersionBefore,
          diagnostic: 'versionEcho_requires_catchup'
        }
      })
      void requestSheetDeltaCatchUp(sheetId, 'version_gap', {
        sinceVersion: catchUpBaselineVersion,
        incomingVersion: version
      })
        .then(applied => {
          if (!applied) return
          debugLog('structural_catchup_applied', {
            sheetId,
            version,
            sinceVersion: catchUpBaselineVersion
          })
          enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'client_version_echo_catchup_applied',
            severity: 'info',
            version,
            payload: {
              sheetId,
              incomingVersion: version,
              sinceVersion: catchUpBaselineVersion,
              diagnostic: 'structural_catchup_applied'
            }
          })
          seedQueueVersionEcho(sheetId, version)
        })
        .catch(error => {
          debugLog('version_echo_catchup_failed', {
            sheetId,
            version,
            sinceVersion: catchUpBaselineVersion,
            error: error instanceof Error ? error.message : String(error)
          })
        })
      clearLiveAppliedVersionScope()
      return
    }
    seedQueueVersionEcho(sheetId, version)
    clearLiveAppliedVersionScope()
  }

  /**
   * Resolve a columnName for `(sheetId, colIndex)` using the session/baseline
   * column metadata. Returns null when the column index is unknown (e.g. the
   * sheet hasn't been hydrated yet or the column was just inserted), in which
   * case overlay protection is best-effort skipped.
   */
  const resolveColumnNameForIndex = (sheetId: string, colIndex: number): string | null => {
    if (!Number.isInteger(colIndex) || colIndex < 0) return null
    const sessionCols = spreadsheetSession.getSheetState(sheetId)?.columns
    const cols = sessionCols ?? appSheetsRef.current.find(s => s.id === sheetId)?.columns ?? null
    if (!cols || colIndex >= cols.length) return null
    const candidate = (cols[colIndex] as { name?: unknown })?.name
    return typeof candidate === 'string' && candidate.length > 0 ? candidate : null
  }

  /**
   * Remote-paint overlay guard. Returns true when the queue still owns a
   * local intent for this cell (status `pending` / `scheduled` / `submitting`).
   * The remote value continues to flow into the session/baseline through
   * other paths (`commitSheetData`, `spreadsheetSession.applyMutation`) so the
   * authoritative truth converges; only the visible grid paint is suppressed
   * so the user's in-flight typing is not overwritten before the backend
   * resolves the conflict. Once the backend response lands, the queue clears
   * ownership and any `rejected_conflict.serverState` is painted via the
   * mutation pipeline.
   */
  const isCellLocallyOwnedForOverlay = (sheetId: string, rowId: string | undefined, colIndex: number): boolean => {
    if (!rowId) return false
    const columnName = resolveColumnNameForIndex(sheetId, colIndex)
    if (!columnName) return false
    const queue = getSheetWorkQueue?.()
    if (!queue) return false
    const key = `${rowId}\u0000${columnName}`
    return queue.isQueueOwnedCell(sheetId, key)
  }

  const isAcknowledgedOverlayBypassCell = (
    sheetId: string,
    rowId: string | undefined,
    colIndex: number,
    metaOrOptions?: Pick<SpreadsheetBulkRemoteApplyMeta, 'acknowledgedCellKeys'>
  ): boolean => {
    if (!rowId || !metaOrOptions?.acknowledgedCellKeys?.length) return false
    const columnName = resolveColumnNameForIndex(sheetId, colIndex)
    if (!columnName) return false
    return metaOrOptions.acknowledgedCellKeys.includes(`${rowId}\u0000${columnName}`)
  }

  /**
   * Per-sheet rAF buffer of incoming remote cell paints.
   *
   * Under concurrent fast typing the collab manager delivers a steady stream
   * of `applyRemoteCellUpdate` / `applyRemoteCellUpdatesBulk` calls — one per
   * WS broadcast, often with only a single cell each. Painting each into
   * Univer synchronously triggers one canvas layout per call, which is the
   * dominant source of the "100% CPU + thousands of layouts/sec" spike
   * observed when two users type at once.
   *
   * The buffer collects all incoming items per sheet within the current
   * frame, dedupes per `(rowId|rowIndex, colIndex)` (latest write wins),
   * and dispatches a single `applyRemoteCellUpdatesBulk` per sheet per
   * animation frame. This caps remote-paint frequency at ~60 fps regardless
   * of peer count and lets the dense `setValues` fast path inside
   * `UniverSheetGrid.applyRemoteCellUpdatesBulk` trigger more often.
   *
   * Structural callbacks (`applyRemoteClearAllRange`,
   * `applyRemoteClearFormatRange`, `applyRemoteSpreadsheetFeatureOperation`,
   * row/column move/insert/delete, `runRemoteTransaction`, `forceGridReapply`,
   * `applyRemoteDimensions`) call `flushPendingRemoteCellPaints()`
   * synchronously before they run so cell paints queued earlier in the same
   * frame are dispatched ahead of the structural op.
   */
  interface PendingRemoteCellBuffer {
    items: SpreadsheetBulkRemoteCellItem[]
    completes: Array<() => void>
    traceMeta: Pick<SpreadsheetBulkRemoteApplyMeta, 'traceSessionId' | 'traceId' | 'batchId' | 'operationType'> | null
    handle: number | null
  }
  const pendingRemoteCellBuffers = new Map<string, PendingRemoteCellBuffer>()
  const ensureRemoteCellBuffer = (sheetId: string): PendingRemoteCellBuffer => {
    let buf = pendingRemoteCellBuffers.get(sheetId)
    if (!buf) {
      buf = { items: [], completes: [], traceMeta: null, handle: null }
      pendingRemoteCellBuffers.set(sheetId, buf)
    }
    return buf
  }
  const cancelBufferHandle = (buf: PendingRemoteCellBuffer): void => {
    if (buf.handle == null) return
    const cancel = (globalThis as { cancelAnimationFrame?: (h: number) => void }).cancelAnimationFrame
    const clear = (globalThis as { clearTimeout: typeof clearTimeout }).clearTimeout
    if (typeof cancel === 'function') {
      try {
        cancel(buf.handle)
      } catch {
        // Fall through to clearTimeout — the handle was created by setTimeout.
        clear(buf.handle as unknown as ReturnType<typeof setTimeout>)
      }
    } else {
      clear(buf.handle as unknown as ReturnType<typeof setTimeout>)
    }
    buf.handle = null
  }
  const flushRemoteCellBuffer = (sheetId: string): void => {
    const buf = pendingRemoteCellBuffers.get(sheetId)
    if (!buf) return
    cancelBufferHandle(buf)
    pendingRemoteCellBuffers.delete(sheetId)
    if (buf.items.length === 0) {
      for (const cb of buf.completes) {
        try {
          cb()
        } catch {
          // onApplyComplete callbacks are best-effort; one throwing must not block the others.
        }
      }
      return
    }
    const deduped = new Map<string, SpreadsheetBulkRemoteCellItem>()
    for (const it of buf.items) {
      const key = `${it.rowId ?? ''}\u0000${it.rowIndex}\u0000${it.colIndex}`
      deduped.set(key, it)
    }
    const merged: SpreadsheetBulkRemoteApplyMeta = {
      ...(buf.traceMeta ?? {}),
      onApplyComplete:
        buf.completes.length === 0
          ? undefined
          : () => {
              for (const cb of buf.completes) {
                try {
                  cb()
                } catch {
                  // Same rationale as above.
                }
              }
            }
    }
    const bulkApply = spreadsheetGridRef.current?.applyRemoteCellUpdatesBulk
    if (!bulkApply) {
      merged.onApplyComplete?.()
      return
    }
    const appliedItems = Array.from(deduped.values())
    bulkApply(appliedItems, merged)
    scheduleSessionGridDivergenceCheck(sheetId, appliedItems)
  }

  /**
   * Gate 2 invariant (dev/trace only): after a remote cell batch paints, the
   * session row source of truth must match what Univer renders for every
   * touched coordinate (`server op → session rows → Univer grid`). Any
   * mismatch means dual authority leaked back in and is emitted as a
   * `session_grid_divergence` diagnostics finding. Read-only: never mutates
   * data, and only runs when spreadsheet debug is enabled.
   */
  const scheduleSessionGridDivergenceCheck = (sheetId: string, appliedItems: SpreadsheetBulkRemoteCellItem[]): void => {
    if (!isSpreadsheetAppsDebugEnabled() || appliedItems.length === 0) return
    if (sheetId !== activeSheetIdRef.current) return
    const touchedCells = appliedItems.map(item => ({
      gridRowIndex: item.rowIndex,
      colIndex: item.colIndex,
      rowId: item.rowId
    }))
    const run = (): void => {
      if (sheetId !== activeSheetIdRef.current) return
      const grid = spreadsheetGridRef.current
      const readGrid = grid?.getVisibleRangeValues
      if (!readGrid) return
      const visibleColumns = (
        spreadsheetSession.getSheetState(sheetId)?.columns ??
        appSheetsRef.current.find(sheet => sheet.id === sheetId)?.columns ??
        []
      ).filter(column => column.isVisible !== false)
      if (visibleColumns.length === 0) return
      const maxGridRowIndex = touchedCells.reduce((max, cell) => Math.max(max, cell.gridRowIndex), 0)
      const gridValues = readGrid(maxGridRowIndex + 1, visibleColumns.length)
      if (!gridValues) return
      const divergences = findSessionGridDivergences({
        sessionRows: getActiveSessionRows(),
        visibleColumns,
        gridValues,
        touchedCells
      })
      if (divergences.length === 0) return
      enqueueDiagnosticsTraceEvent({
        source: 'client',
        stage: 'session_grid_divergence',
        severity: 'error',
        payload: {
          sheetId,
          count: divergences.length,
          touchedCount: touchedCells.length,
          samples: divergences.slice(0, 10)
        }
      })
      debugLog('session_grid_divergence', { sheetId, count: divergences.length })
    }
    const raf = (globalThis as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }).requestAnimationFrame
    if (typeof raf === 'function') {
      raf(() => raf(run))
      return
    }
    ;(globalThis as { setTimeout: typeof setTimeout }).setTimeout(run, 32)
  }
  const flushPendingRemoteCellPaints = (sheetId?: string): void => {
    if (sheetId) {
      flushRemoteCellBuffer(sheetId)
      return
    }
    for (const key of Array.from(pendingRemoteCellBuffers.keys())) {
      flushRemoteCellBuffer(key)
    }
  }
  const scheduleRemoteCellBufferFlush = (sheetId: string): void => {
    const buf = pendingRemoteCellBuffers.get(sheetId)
    if (!buf || buf.handle != null) return
    const raf = (globalThis as { requestAnimationFrame?: (cb: FrameRequestCallback) => number }).requestAnimationFrame
    if (typeof raf === 'function') {
      buf.handle = raf(() => flushRemoteCellBuffer(sheetId))
      return
    }
    buf.handle = (globalThis as { setTimeout: typeof setTimeout }).setTimeout(
      () => flushRemoteCellBuffer(sheetId),
      16
    ) as unknown as number
  }

  const shouldFlushRemoteBulkImmediately = (operationType?: string | null): boolean =>
    operationType === 'authoritative_reapply'

  const wrapRemoteBulkApplyMeta = (
    sheetId: string,
    meta?: SpreadsheetBulkRemoteApplyMeta
  ): SpreadsheetBulkRemoteApplyMeta | undefined => {
    if (!meta) return undefined
    const { onApplyComplete, operationType } = meta
    if (!onApplyComplete && operationType !== 'authoritative_reapply') {
      return meta
    }
    let completed = false
    return {
      ...meta,
      onApplyComplete: () => {
        if (completed) return
        completed = true
        if (operationType === 'authoritative_reapply') {
          enqueueDiagnosticsTraceEvent({
            source: 'client',
            stage: 'authoritative_reapply_complete',
            sheetId,
            traceSessionId: meta.traceSessionId ?? null,
            traceId: meta.traceId ?? null,
            batchId: meta.batchId ?? null,
            operationType,
            payload: {}
          })
        }
        onApplyComplete?.()
      }
    }
  }

  const wrappedApplyRemoteCellUpdate: SpreadsheetCollaborationCallbacks['applyRemoteCellUpdate'] = (
    rowIndex,
    colIndex,
    value,
    rowId,
    options
  ) => {
    const targetSheetId = options?.targetSheetId ?? activeSheetIdRef.current
    if (
      isCellLocallyOwnedForOverlay(targetSheetId, rowId, colIndex) &&
      !isAcknowledgedOverlayBypassCell(targetSheetId, rowId, colIndex, options)
    ) {
      debugLog('remote_cell_update_skipped_locally_owned', {
        sheetId: targetSheetId,
        rowId,
        colIndex
      })
      return
    }
    const buf = ensureRemoteCellBuffer(targetSheetId)
    buf.items.push({ rowIndex, colIndex, value, rowId, options })
    scheduleRemoteCellBufferFlush(targetSheetId)
  }

  const wrappedApplyRemoteCellUpdatesBulk: NonNullable<
    SpreadsheetCollaborationCallbacks['applyRemoteCellUpdatesBulk']
  > = (items, meta) => {
    const targetSheetId = activeSheetIdRef.current
    const effectiveMeta = wrapRemoteBulkApplyMeta(targetSheetId, meta)
    const requestedCellCount = items.length
    let skipped = 0
    let bypassed = 0
    const filtered = items.filter(item => {
      const owned = isCellLocallyOwnedForOverlay(targetSheetId, item.rowId, item.colIndex)
      if (!owned) return true
      if (isAcknowledgedOverlayBypassCell(targetSheetId, item.rowId, item.colIndex, effectiveMeta)) {
        bypassed += 1
        return true
      }
      skipped += 1
      return false
    })
    if (skipped > 0 || bypassed > 0) {
      debugLog('remote_cell_bulk_skipped_locally_owned', {
        sheetId: targetSheetId,
        skipped,
        kept: filtered.length,
        bypassed,
        operationType: effectiveMeta?.operationType ?? null
      })
    }
    if (filtered.length === 0) {
      // Nothing to paint — still invoke `onApplyComplete` so callers waiting
      // on the bulk finish signal (e.g. style-after-paste chaining) proceed.
      debugLog('remote_cell_bulk_zero_visible_paint', {
        sheetId: targetSheetId,
        requested: requestedCellCount,
        skipped,
        bypassed,
        operationType: effectiveMeta?.operationType ?? null
      })
      const result: SpreadsheetBulkRemoteApplyResult = {
        status: 'filtered_to_zero',
        requestedCellCount,
        paintedCellCount: 0,
        skippedCellCount: skipped
      }
      effectiveMeta?.onApplyComplete?.()
      return result
    }
    if (shouldFlushRemoteBulkImmediately(effectiveMeta?.operationType)) {
      flushPendingRemoteCellPaints(targetSheetId)
      const applyBulk = spreadsheetGridRef.current?.applyRemoteCellUpdatesBulk
      applyBulk?.(filtered, effectiveMeta)
      return {
        status: applyBulk ? 'painted' : 'filtered_to_zero',
        requestedCellCount,
        paintedCellCount: applyBulk ? filtered.length : 0,
        skippedCellCount: skipped
      }
    }
    const buf = ensureRemoteCellBuffer(targetSheetId)
    for (const it of filtered) buf.items.push(it)
    if (effectiveMeta?.onApplyComplete) buf.completes.push(effectiveMeta.onApplyComplete)
    if (effectiveMeta && !buf.traceMeta) {
      buf.traceMeta = {
        traceSessionId: effectiveMeta.traceSessionId,
        traceId: effectiveMeta.traceId,
        batchId: effectiveMeta.batchId,
        operationType: effectiveMeta.operationType
      }
    }
    scheduleRemoteCellBufferFlush(targetSheetId)
    return {
      status: 'deferred_buffered',
      requestedCellCount,
      paintedCellCount: 0,
      skippedCellCount: skipped
    }
  }

  // The remote-transaction runner and structural callbacks need an
  // immediate (non-coalesced) version of the cell apply so they don't get
  // reordered behind a deferred bulk. They flush the buffer first, then
  // forward straight to the grid.
  const immediateApplyRemoteCellUpdate: SpreadsheetCollaborationCallbacks['applyRemoteCellUpdate'] = (
    rowIndex,
    colIndex,
    value,
    rowId,
    options
  ) => {
    const targetSheetId = options?.targetSheetId ?? activeSheetIdRef.current
    if (
      isCellLocallyOwnedForOverlay(targetSheetId, rowId, colIndex) &&
      !isAcknowledgedOverlayBypassCell(targetSheetId, rowId, colIndex, options)
    ) {
      return
    }
    flushPendingRemoteCellPaints(targetSheetId)
    applyRemoteCellUpdateWithRetry(rowIndex, colIndex, value, rowId, options)
  }
  const immediateApplyRemoteCellUpdatesBulk: NonNullable<
    SpreadsheetCollaborationCallbacks['applyRemoteCellUpdatesBulk']
  > = (items, meta) => {
    const targetSheetId =
      items
        .find(item => typeof item.options?.targetSheetId === 'string' && item.options.targetSheetId.trim())
        ?.options?.targetSheetId?.trim() ?? activeSheetIdRef.current
    const requestedCellCount = items.length
    flushPendingRemoteCellPaints(targetSheetId)
    let skippedCellCount = 0
    let bypassed = 0
    const filtered = items.filter(item => {
      const itemSheetId =
        typeof item.options?.targetSheetId === 'string' && item.options.targetSheetId.trim()
          ? item.options.targetSheetId.trim()
          : targetSheetId
      const owned = isCellLocallyOwnedForOverlay(itemSheetId, item.rowId, item.colIndex)
      if (!owned) return true
      if (isAcknowledgedOverlayBypassCell(itemSheetId, item.rowId, item.colIndex, meta)) {
        bypassed += 1
        return true
      }
      skippedCellCount += 1
      return false
    })
    if (filtered.length === 0) {
      debugLog('remote_cell_bulk_zero_visible_paint', {
        sheetId: targetSheetId,
        requested: requestedCellCount,
        skipped: skippedCellCount,
        bypassed,
        operationType: meta?.operationType ?? null
      })
      meta?.onApplyComplete?.()
      return {
        status: 'filtered_to_zero',
        requestedCellCount,
        paintedCellCount: 0,
        skippedCellCount
      }
    }
    const applyBulk = spreadsheetGridRef.current?.applyRemoteCellUpdatesBulk
    applyBulk?.(filtered, meta)
    return {
      status: applyBulk ? 'painted' : 'filtered_to_zero',
      requestedCellCount,
      paintedCellCount: applyBulk ? filtered.length : 0,
      skippedCellCount
    }
  }

  const applyRemoteDimensions = createCollaborationApplyRemoteDimensions({
    activeSheetId,
    spreadsheetGridRef,
    recentLocalRowHeightRef,
    recentLocalColWidthRef,
    baselineRowHeightsRef,
    baselineColWidthsRef
  })

  const onWorkbookStructureChange = createCollaborationWorkbookStructureHandler({
    structuralWsDedupRef,
    peerSheetDataCacheRef,
    authoritativePeerSheetDataCacheRef,
    appSheetsRef,
    activeSheetIdRef,
    ensureRemoteSheetInLiveWorkbook,
    renameRemoteSheetInLiveWorkbook,
    removeRemoteSheetFromLiveWorkbook,
    setRemoteSheetVisibilityInLiveWorkbook,
    applyLocalAppUpdate,
    mapPersistedRowsToViewerRows,
    onAppRefreshNeeded,
    appId,
    setActiveSheetId
  })

  return {
    getActiveSheetId: () => {
      const raw = spreadsheetSession.getState().activeSheetId
      const aliases = createdSheetIdAliasesRef?.current
      return aliases ? resolveReconciledSheetId(raw, aliases) : raw
    },
    getColumns: () => spreadsheetSession.getActiveSheetState()?.columns ?? activeSheet.columns,
    getColumnsForSheet: sheetId =>
      spreadsheetSession.getSheetState(sheetId)?.columns ??
      appSheetsRef.current.find(sheet => sheet.id === sheetId)?.columns ??
      [],
    getSheetVersion: sheetId => {
      const sessionVersion = spreadsheetSession.getSheetState(sheetId)?.version
      const queueVersion = getSheetWorkQueue?.()?.getDebugState(sheetId).queueClientAppliedVersion
      const candidates = [
        typeof sessionVersion === 'number' && Number.isFinite(sessionVersion) ? Math.trunc(sessionVersion) : null,
        typeof queueVersion === 'number' && Number.isFinite(queueVersion) ? Math.trunc(queueVersion) : null,
        resolveKnownSheetVersion(sheetId)
      ].filter((value): value is number => typeof value === 'number' && value >= 0)
      return candidates.length > 0 ? Math.max(...candidates) : 0
    },
    isSheetPersistenceBusy: sheetId => {
      if (isRowMaterializationInFlight?.(sheetId)) {
        return true
      }
      return getSheetWorkQueue?.()?.isSheetPersistenceBusy(sheetId) ?? false
    },
    getLocalSheetData: () => getActiveSessionRows(),
    getSheetData: sheetId => {
      const targetSheet = appSheetsRef.current.find(sheet => sheet.id === sheetId)
      const fallbackSorted = sortSpreadsheetRowsBySheetSettings(targetSheet?.data ?? [], targetSheet) as ViewerRow[]
      const sheetSessionState = spreadsheetSession.getSheetState(sheetId)
      if (sheetSessionState) {
        return hydrateCachedRowsWithServerIdentities(sheetSessionState.rows as ViewerRow[], fallbackSorted)
      }
      const cached = peerSheetDataCacheRef.current.get(sheetId)
      if (cached) {
        return hydrateCachedRowsWithServerIdentities(cached, fallbackSorted)
      }
      return fallbackSorted
    },
    getWorkbookSnapshot,
    applyCommittedWorksheetMetadataPatch,
    applyCommittedCommentAnchorPatches,
    getBackendRowIdForUiRowId: (uiRowId, univerRow) => getBackendRowIdForUiRowIdRef.current(uiRowId, univerRow),
    commitLocalSheetData,
    commitSheetData: (sheetId, data, options) => {
      syncSheetRowsIntoLocalState(sheetId, data, options)
    },
    applyRemoteCellUpdate: wrappedApplyRemoteCellUpdate,
    applyRemoteCellUpdatesBulk: wrappedApplyRemoteCellUpdatesBulk,
    applyRemoteClearAllRange: payload => {
      flushPendingRemoteCellPaints()
      spreadsheetGridRef.current?.applyRemoteClearAllRange?.(payload)
    },
    applyRemoteClearFormatRange: payload => {
      flushPendingRemoteCellPaints()
      spreadsheetGridRef.current?.applyRemoteClearFormatRange?.(payload)
    },
    applyRemoteSpreadsheetFeatureOperation: payload => {
      flushPendingRemoteCellPaints()
      spreadsheetGridRef.current?.applyRemoteSpreadsheetFeatureOperation?.(payload)
    },
    forceGridReapply: (sheetId, region, options) => {
      flushPendingRemoteCellPaints(sheetId)
      dispatchForceGridReapply(sheetId, region, options)
    },
    applyRemoteDimensions: payload => {
      flushPendingRemoteCellPaints(payload.sheetId)
      applyRemoteDimensions(payload)
    },
    runRemoteTransaction: plan => {
      // Transactions mix cell + structural ops and rely on strict ordering;
      // never coalesce inside them. Flush any pending buffered paints first
      // so they land in Univer's command engine ahead of the transaction.
      flushPendingRemoteCellPaints()
      if (liveRemoteApplyVersionRef) {
        liveRemoteApplyVersionRef.current = {
          sheetId: plan.batch.sheetId,
          appliedVersion: plan.batch.appliedVersion
        }
      }
      return new UniverRemoteTransactionRunner({
        applyRemoteCellUpdate: immediateApplyRemoteCellUpdate,
        applyRemoteCellUpdatesBulk: immediateApplyRemoteCellUpdatesBulk,
        applyRemoteClearAllRange: (payload, meta) => {
          spreadsheetGridRef.current?.applyRemoteClearAllRange?.(payload, meta)
        },
        applyRemoteClearFormatRange: (payload, meta) => {
          spreadsheetGridRef.current?.applyRemoteClearFormatRange?.(payload, meta)
        },
        applyRemoteSpreadsheetFeatureOperation: (payload, meta) => {
          spreadsheetGridRef.current?.applyRemoteSpreadsheetFeatureOperation?.(payload, meta)
        },
        forceGridReapply: (sheetId, region, options) => {
          dispatchForceGridReapply(sheetId, region, options)
        }
      }).run(plan)
    },
    onVersionUpdate: (version, meta) => {
      const sheetId = activeSheetIdRef.current
      const knownVersionBefore = resolveKnownSheetVersion(sheetId)
      updateActiveSheetVersion(version)
      routeVersionEcho(sheetId, version, knownVersionBefore, meta)
    },
    onSheetVersionUpdate: (sheetId, version, meta) => {
      if (sheetId !== activeSheetIdRef.current) {
        debugLog('inactive_sheet_version_echo_deferred', {
          sheetId,
          version,
          activeSheetId: activeSheetIdRef.current
        })
        return
      }
      const knownVersionBefore = resolveKnownSheetVersion(sheetId)
      rememberSheetVersion(sheetId, version)
      routeVersionEcho(sheetId, version, knownVersionBefore, meta)
      applyLocalAppUpdate(currentApp => ({
        ...currentApp,
        sheets: currentApp.sheets.map(sheet =>
          sheet.id !== sheetId
            ? sheet
            : {
                ...sheet,
                version: Math.max(Number(sheet.version ?? 0), Math.trunc(version))
              }
        )
      }))
    },
    onWorkbookStructureChange,
    markSheetNeedsGridMaterialization,
    requestSheetCatchUp: (sheetId, reason, options) => {
      void requestSheetDeltaCatchUp(sheetId, reason, options)
    },
    scheduleSheetVersionRefreshFromApi,
    scheduleRemoteStructuralResync,
    onRemoteColumnUpdate: handleRemoteColumnUpdate,
    applyRemoteColumnReorder: ({ sheetId, previousColumns, nextColumns, moves }) => {
      flushPendingRemoteCellPaints(sheetId)
      return (
        spreadsheetGridRef.current?.applyRemoteColumnsReorder?.({
          sheetId,
          previousColumns,
          nextColumns,
          moves
        }) ?? false
      )
    },
    applyRemoteRowSlotsMove: ({ sheetId, sourceStartGridRowIndex, count, destinationGridRowIndex }) => {
      flushPendingRemoteCellPaints(sheetId)
      return (
        spreadsheetGridRef.current?.applyRemoteRowSlotsMove?.({
          sheetId,
          sourceStartGridRowIndex,
          count,
          destinationGridRowIndex
        }) ?? false
      )
    },
    applyRemoteInsertRowSlots: ({ sheetId, startGridRowIndex, count }) => {
      flushPendingRemoteCellPaints(sheetId)
      return (
        spreadsheetGridRef.current?.applyRemoteInsertRowSlots?.({
          sheetId,
          startGridRowIndex,
          count
        }) ?? false
      )
    },
    applyRemoteDeleteRowSlots: ({ sheetId, startGridRowIndex, count }) => {
      flushPendingRemoteCellPaints(sheetId)
      return (
        spreadsheetGridRef.current?.applyRemoteDeleteRowSlots?.({
          sheetId,
          startGridRowIndex,
          count
        }) ?? false
      )
    },
    applyRemoteInsertColumnSlots: ({ sheetId, startGridColumnIndex, count }) => {
      flushPendingRemoteCellPaints(sheetId)
      return (
        spreadsheetGridRef.current?.applyRemoteInsertColumnSlots?.({
          sheetId,
          startGridColumnIndex,
          count
        }) ?? false
      )
    },
    applyRemoteDeleteColumnSlots: ({ sheetId, startGridColumnIndex, count }) => {
      flushPendingRemoteCellPaints(sheetId)
      return (
        spreadsheetGridRef.current?.applyRemoteDeleteColumnSlots?.({
          sheetId,
          startGridColumnIndex,
          count
        }) ?? false
      )
    },
    applyRemoteMoveCellRange: ({ sheetId, fromRange, toRange }) => {
      flushPendingRemoteCellPaints(sheetId)
      return spreadsheetGridRef.current?.applyRemoteMoveCellRange?.({ sheetId, fromRange, toRange }) ?? false
    },
    isRecentLocalBatchId,
    fetchChangesSince: async (sheetId, sinceVersion) => {
      const facade = mutationFacadeRef.current
      if (facade) {
        return facade.fetchSheetChangesSince(sheetId, sinceVersion)
      }
      return fetchSheetReplaySince(sheetId, sinceVersion)
    },
    isCollabDiagEnabled: isSpreadsheetAppsDebugEnabled,
    onCollabDiagnostic: (event, meta) => {
      debugLog('collab-diagnostic', { event, meta })
    },
    onDiagnosticsTraceEvent: event => {
      enqueueDiagnosticsTraceEvent(event)
    },
    onPendingQueueTrimmed: dropped => {
      if (dropped > 0) {
        toast.warning(sheetT('collab-queue-trimmed-warn'), { duration: 8000 })
      }
    }
  }
}
