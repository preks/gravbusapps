/**
 * Pure row-resolution helpers shared by SpreadsheetAppViewer (peer cache vs session vs server ordering).
 */

import type { SpreadsheetSheet } from '../types'
import { sortSpreadsheetRowsBySheetSettings } from './spreadsheetSheetRowSort'

export type ViewerRow = Record<string, unknown>

export interface RichestRowsInactiveCandidates {
  peerCached?: ViewerRow[]
  pendingUniver?: ViewerRow[]
  latestUniver?: ViewerRow[]
  serverSorted: ViewerRow[]
}

export interface RichestRowsDebugCallbacks {
  enabled: boolean
  log: (event: string, meta?: Record<string, unknown> | (() => Record<string, unknown>)) => void
  summarize: (rows: ViewerRow[] | undefined) => Record<string, unknown>
}

/**
 * Matches viewer `getKnownRowsForSheet`: authoritative peer cache first, then session rows, then sorted server data.
 */
export function resolveKnownRowsForSheetFromSources(options: {
  authoritativePeerCacheHit: boolean
  peerCachedRows: ViewerRow[] | undefined
  sessionSheetRows: ViewerRow[] | undefined
  sheetMeta: SpreadsheetSheet | undefined
}): ViewerRow[] {
  const { authoritativePeerCacheHit, peerCachedRows, sessionSheetRows, sheetMeta } = options
  if (authoritativePeerCacheHit && peerCachedRows) return peerCachedRows
  if (sessionSheetRows != null) return sessionSheetRows
  return sortSpreadsheetRowsBySheetSettings(sheetMeta?.data ?? [], sheetMeta) as ViewerRow[]
}

/**
 * Active sheet: session-backed rows sorted by sheet settings.
 * Inactive: richest candidate among pending Univer, peer cache, latest Univer snapshot, server — then sorted.
 */
export function resolveRichestKnownRowsForSheet(options: {
  sheetId: string
  activeSheetId: string
  targetSheet: SpreadsheetSheet | undefined
  sessionBackedRowsWhenActive: ViewerRow[]
  inactiveCandidates: RichestRowsInactiveCandidates
  debug?: RichestRowsDebugCallbacks
}): ViewerRow[] {
  const { sheetId, activeSheetId, targetSheet, sessionBackedRowsWhenActive, inactiveCandidates, debug } = options

  if (sheetId === activeSheetId) {
    const sessionRows = sessionBackedRowsWhenActive
    if (debug?.enabled) {
      const summarize = debug.summarize
      debug.log('richest_rows_selected_before_sheet_create', () => ({
        sheetId,
        activeSheetId,
        targetSheetFound: Boolean(targetSheet),
        candidates: [{ source: 'spreadsheetSession', summary: summarize(sessionRows) }],
        selected: summarize(sessionRows)
      }))
    }
    return sortSpreadsheetRowsBySheetSettings(sessionRows, targetSheet) as ViewerRow[]
  }

  const { peerCached, pendingUniver, latestUniver, serverSorted } = inactiveCandidates
  const candidateSummaries: Array<{ source: string; summary: Record<string, unknown> }> = []
  const addCandidateSummary = (source: string, rows: ViewerRow[] | undefined): void => {
    if (!rows) return
    if (debug?.enabled) candidateSummaries.push({ source, summary: debug.summarize(rows) })
  }

  addCandidateSummary('peerSheetDataCache', peerCached)
  addCandidateSummary('pendingUniverRows', pendingUniver)
  addCandidateSummary('latestUniverData', latestUniver)
  addCandidateSummary('serverSheetData', serverSorted)

  const selected = pendingUniver ?? peerCached ?? latestUniver ?? serverSorted

  if (debug?.enabled) {
    debug.log('richest_rows_selected_before_sheet_create', () => ({
      sheetId,
      activeSheetId,
      targetSheetFound: Boolean(targetSheet),
      candidates: candidateSummaries,
      selected: debug.summarize(selected)
    }))
  }

  return sortSpreadsheetRowsBySheetSettings(selected, targetSheet) as ViewerRow[]
}
