import type { MutableRefObject } from 'react'

import type { SpreadsheetSheet } from '../types'
import type { SpreadsheetCollaborationManager } from '../services/SpreadsheetCollaborationManager'
import type { SpreadsheetMutationFacade, SpreadsheetSession } from '../core'
import type { SpreadsheetSessionDiffProjectionMode } from '../core/SpreadsheetCollaborationContract'
import { replayRemoteDeltaThroughCollaborationManager, applyRemoteFetchedSheetDelta } from '../core'
import type { SpreadsheetTraceEventInput, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'
import {
  estimateAuthoritativeGridReapplyTargetCellCount,
  tryComputeAuthoritativeRegionsFromReplayDeltas,
  type AuthoritativeGridReapplyTarget
} from '../utils/spreadsheetAuthoritativeRegion'
import { countReplayDeltaChangeKinds, partitionReplayDeltaChanges } from '../utils/spreadsheetReplayDeltaPartition'
import type { SpreadsheetSnapshotCoversVersions } from '../utils/spreadsheetSnapshotCoverage'

const OPERATION_VERSION_STREAM = 'sheet_operations' as const
const COLUMN_STRUCTURAL_DELTA_OP_TYPES = new Set(['column_add', 'column_delete', 'columns_reorder', 'column_reorder'])
const GRID_PAINTED_STRUCTURAL_DELTA_OP_TYPES = new Set([
  'add_rows',
  'insert_rows_at',
  'columns_reorder',
  'column_reorder',
  'column_add',
  'column_delete',
  'move_row_slots',
  'insert_row_slots',
  'delete_row_slots',
  'move_cell_range'
])

export interface ApplyFetchedSheetDeltaRemotelyParams {
  delta: Awaited<ReturnType<SpreadsheetMutationFacade['fetchSheetChangesSince']>>
  targetSheetId: string
  sinceVersion: number
  reason: string
  spreadsheetSession: SpreadsheetSession
  getKnownRowsForSheet: (sheetId: string) => Record<string, unknown>[]
  syncSheetRowsIntoLocalState: (
    sheetId: string,
    rows: Record<string, unknown>[],
    options?: {
      persisted?: boolean
      syncGrid?: boolean
      sessionDiffProjectionMode?: SpreadsheetSessionDiffProjectionMode
      version?: number
      authoritativeGridRegion?: AuthoritativeGridReapplyTarget
    }
  ) => void
  rememberKnownSheetVersion: (sheetId: string, version: number) => void
  workbookSnapshotCoversVersionsRef: MutableRefObject<SpreadsheetSnapshotCoversVersions>
  activeSheetIdRef: MutableRefObject<string>
  collaborationManagerRef: MutableRefObject<SpreadsheetCollaborationManager | null>
  enqueueDiagnosticsTraceEvent: (event: SpreadsheetTraceEventInput) => void
  activeTraceSessionRef: MutableRefObject<SpreadsheetTraceSession | null>
  targetSheet?: SpreadsheetSheet
  resolveTargetSheet?: (sheetId: string) => SpreadsheetSheet | undefined
  reportStaleRecoveryLifecycle?: (payload: { sheetId: string; stage: string; version?: number | null }) => void
}

export interface ApplyFetchedSheetDeltaRemotelyResult {
  applied: boolean
  currentVersion: number
  replayRan: boolean
  nextRows: Record<string, unknown>[]
}

export function applyFetchedSheetDeltaRemotely(
  params: ApplyFetchedSheetDeltaRemotelyParams
): ApplyFetchedSheetDeltaRemotelyResult {
  const currentVersion = Number(params.delta.currentVersion || params.sinceVersion)
  if (currentVersion <= params.sinceVersion) {
    params.reportStaleRecoveryLifecycle?.({
      sheetId: params.targetSheetId,
      stage: 'catchup_noop',
      version: currentVersion
    })
    params.workbookSnapshotCoversVersionsRef.current = {
      ...params.workbookSnapshotCoversVersionsRef.current,
      [params.targetSheetId]: Math.max(params.sinceVersion, currentVersion)
    }
    params.enqueueDiagnosticsTraceEvent({
      source: 'client',
      stage: 'client_delta_catchup_noop',
      traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
      version: currentVersion,
      payload: {
        reason: params.reason,
        targetSheetId: params.targetSheetId,
        sinceVersion: params.sinceVersion,
        versionStream: OPERATION_VERSION_STREAM
      }
    })
    return {
      applied: true,
      currentVersion,
      replayRan: false,
      nextRows: params.getKnownRowsForSheet(params.targetSheetId)
    }
  }

  const targetSheet = params.targetSheet ?? params.resolveTargetSheet?.(params.targetSheetId)
  const baseRows = params.getKnownRowsForSheet(params.targetSheetId)
  const { structuralChanges } = partitionReplayDeltaChanges(params.delta.changes)
  const changeKinds = countReplayDeltaChangeKinds(params.delta.changes)
  const hasColumnStructuralChanges = structuralChanges.some(change => {
    const opType = typeof change.operationType === 'string' ? change.operationType : ''
    return COLUMN_STRUCTURAL_DELTA_OP_TYPES.has(opType)
  })
  const hasAddRowsStructural = structuralChanges.some(change => {
    const opType = typeof change.operationType === 'string' ? change.operationType : ''
    return opType === 'add_rows' || opType === 'insert_rows_at' || opType === 'insert_row_slots'
  })
  const hasGridPaintedStructuralChanges = structuralChanges.some(change => {
    const opType = typeof change.operationType === 'string' ? change.operationType : ''
    return GRID_PAINTED_STRUCTURAL_DELTA_OP_TYPES.has(opType)
  })
  const replayRan =
    structuralChanges.length > 0 &&
    replayRemoteDeltaThroughCollaborationManager({
      collaborationManager: params.collaborationManagerRef.current,
      changes: structuralChanges,
      currentVersion,
      sheetId: params.targetSheetId,
      traceSessionId: params.activeTraceSessionRef.current?.id
    })
  const nextRows = applyRemoteFetchedSheetDelta({
    spreadsheetSession: params.spreadsheetSession,
    sheetId: params.targetSheetId,
    changes: params.delta.changes,
    columns: targetSheet?.columns ?? [],
    version: currentVersion,
    baseRows,
    targetSheet
  })

  params.rememberKnownSheetVersion(params.targetSheetId, currentVersion)
  params.workbookSnapshotCoversVersionsRef.current = {
    ...params.workbookSnapshotCoversVersionsRef.current,
    [params.targetSheetId]: currentVersion
  }

  const isActiveTarget = params.targetSheetId === params.activeSheetIdRef.current
  const authoritativeGridRegion =
    isActiveTarget && targetSheet
      ? tryComputeAuthoritativeRegionsFromReplayDeltas({
          changes: params.delta.changes,
          columns: targetSheet.columns,
          rows: nextRows
        })
      : undefined
  // Row structural replay can paint the active grid directly, but column structural
  // replay is not reliable enough yet to skip the follow-up grid sync.
  const replayPaintedStructural =
    replayRan && isActiveTarget && hasGridPaintedStructuralChanges && !hasColumnStructuralChanges
  const skipSyncGrid = replayPaintedStructural && changeKinds.cellChangeCount === 0
  const syncGrid = isActiveTarget && !skipSyncGrid
  const sessionDiffProjectionMode: SpreadsheetSessionDiffProjectionMode | undefined =
    syncGrid && !authoritativeGridRegion ? 'skip' : undefined
  const skipSyncGridReason = !isActiveTarget
    ? 'inactive_target'
    : skipSyncGrid
      ? 'structural_replay_painted'
      : authoritativeGridRegion
        ? 'region_sync'
        : 'full_token'
  const authoritativeRegionCellEstimate = estimateAuthoritativeGridReapplyTargetCellCount(authoritativeGridRegion)

  params.enqueueDiagnosticsTraceEvent({
    source: 'client',
    stage: 'client_catchup_paint_strategy',
    traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
    version: currentVersion,
    payload: {
      reason: params.reason,
      targetSheetId: params.targetSheetId,
      versionStream: OPERATION_VERSION_STREAM,
      replayRan,
      syncGrid,
      skipSyncGridReason,
      skippedStructuralReplay: false,
      changeCount: changeKinds.changeCount,
      cellChangeCount: changeKinds.cellChangeCount,
      structuralChangeCount: changeKinds.structuralChangeCount,
      hasAddRowsStructural,
      hasColumnStructuralChanges,
      authoritativeRegionCellEstimate
    }
  })

  params.syncSheetRowsIntoLocalState(params.targetSheetId, nextRows, {
    persisted: true,
    syncGrid,
    sessionDiffProjectionMode,
    version: currentVersion,
    ...(authoritativeGridRegion ? { authoritativeGridRegion } : {})
  })
  params.enqueueDiagnosticsTraceEvent({
    source: 'client',
    stage: 'client_delta_catchup_applied',
    traceSessionId: params.activeTraceSessionRef.current?.id ?? null,
    version: currentVersion,
    payload: {
      reason: params.reason,
      targetSheetId: params.targetSheetId,
      sinceVersion: params.sinceVersion,
      currentVersion,
      versionStream: OPERATION_VERSION_STREAM,
      changeCount: params.delta.changes?.length ?? 0,
      rowCount: nextRows.length,
      activeSheet: isActiveTarget,
      replayedThroughManager: replayRan
    }
  })
  params.reportStaleRecoveryLifecycle?.({
    sheetId: params.targetSheetId,
    stage: 'catchup_applied',
    version: currentVersion
  })

  return {
    applied: true,
    currentVersion,
    replayRan,
    nextRows
  }
}
