import type { SpreadsheetReplayDelta } from './SpreadsheetCollaborationContract'
import {
  applyFetchedSheetDeltaToSpreadsheetSession,
  type ApplyFetchedSheetDeltaToSpreadsheetSessionParams
} from './spreadsheetApplyFetchedSheetDelta'
import { SpreadsheetSessionMutationSources } from './SpreadsheetSession'
import { deltaChangesIncludeManagerReplayOps } from './spreadsheetCollaborationSync'
import {
  applyCommittedGridRowPlacements,
  mergeGridRowPlacementsFromReplayChanges
} from '../utils/spreadsheetCommittedGridRowPlacements'

export type SpreadsheetCollaborationManagerReplay = {
  replayDeltaChanges: (
    changes: SpreadsheetReplayDelta[] | undefined,
    currentVersion: number | undefined,
    targetSheetId: string,
    traceMeta?: { traceSessionId?: string; traceId?: string; batchId?: string }
  ) => void
}

export type ApplyRemoteFetchedSheetDeltaParams = Omit<ApplyFetchedSheetDeltaToSpreadsheetSessionParams, 'source'>

/**
 * Applies HTTP replay deltas into {@link SpreadsheetSession} as remote-committed operations.
 */
export function applyRemoteFetchedSheetDelta(params: ApplyRemoteFetchedSheetDeltaParams): Record<string, unknown>[] {
  const rows = applyFetchedSheetDeltaToSpreadsheetSession({
    ...params,
    source: SpreadsheetSessionMutationSources.RemoteApply
  })
  const placements = mergeGridRowPlacementsFromReplayChanges(params.changes)
  return placements ? applyCommittedGridRowPlacements(rows, placements) : rows
}

export interface ReplayRemoteDeltaThroughCollaborationManagerParams {
  collaborationManager: SpreadsheetCollaborationManagerReplay | null | undefined
  changes: unknown[] | undefined
  currentVersion: number
  sheetId: string
  traceSessionId?: string | null
}

/**
 * When deltas contain ops the collaboration manager knows how to replay onto Univer/data-model,
 * runs that replay before session apply. Returns whether manager replay ran (caller may skip redundant grid sync).
 */
export function replayRemoteDeltaThroughCollaborationManager(
  params: ReplayRemoteDeltaThroughCollaborationManagerParams
): boolean {
  const { collaborationManager, changes, currentVersion, sheetId, traceSessionId } = params
  if (!deltaChangesIncludeManagerReplayOps(changes)) return false
  collaborationManager?.replayDeltaChanges(changes as SpreadsheetReplayDelta[], currentVersion, sheetId, {
    traceSessionId: traceSessionId ?? undefined
  })
  return true
}
