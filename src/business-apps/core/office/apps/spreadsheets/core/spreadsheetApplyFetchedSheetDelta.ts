import type { SpreadsheetColumn, SpreadsheetSheet } from '../types'
import { sortSpreadsheetRowsBySheetSettings } from '../utils/spreadsheetSheetRowSort'
import type { SpreadsheetSession, SpreadsheetSessionMutationSource } from './SpreadsheetSession'

export interface ApplyFetchedSheetDeltaToSpreadsheetSessionParams {
  spreadsheetSession: SpreadsheetSession
  sheetId: string
  changes: unknown[] | undefined
  columns: SpreadsheetColumn[]
  source: SpreadsheetSessionMutationSource
  version: number
  /** Rows before delta apply; used if session has no sheet entry after apply. */
  baseRows: Record<string, unknown>[]
  targetSheet: SpreadsheetSheet | undefined
}

/**
 * Applies replay delta operations through {@link SpreadsheetSession.applyDeltaChanges}
 * and returns row snapshots sorted for viewer display.
 *
 * Call after optional collaboration-manager replay when needed; transport stays unchanged (Phase 6).
 */
export function applyFetchedSheetDeltaToSpreadsheetSession(
  params: ApplyFetchedSheetDeltaToSpreadsheetSessionParams
): Record<string, unknown>[] {
  const { spreadsheetSession, sheetId, changes, columns, source, version, baseRows, targetSheet } = params

  spreadsheetSession.applyDeltaChanges({
    sheetId,
    changes,
    columns,
    source,
    version
  })

  const sessionRows = spreadsheetSession.getSheetState(sheetId)?.rows
  const rawRows = sessionRows ?? baseRows

  return sortSpreadsheetRowsBySheetSettings(rawRows as Record<string, unknown>[], targetSheet)
}
