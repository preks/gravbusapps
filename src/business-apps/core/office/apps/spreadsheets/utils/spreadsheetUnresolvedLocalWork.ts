import type { SpreadsheetIntentJournal } from '../core/spreadsheetIntentJournal'
import type { SpreadsheetVersionCausalOwnershipRegistry } from '../core/spreadsheetVersionCausalOwnership'

export function hasSpreadsheetUnresolvedLocalWork(params: {
  intentJournal?: SpreadsheetIntentJournal | null
  versionCausalOwnership?: SpreadsheetVersionCausalOwnershipRegistry | null
  sheetId?: string
}): boolean {
  if (params.intentJournal?.hasUnresolvedIntents(params.sheetId)) {
    return true
  }
  if (params.versionCausalOwnership?.hasUnresolvedIntents(params.sheetId)) {
    return true
  }
  return false
}

const COLD_START_SNAPSHOT_RELOAD_MARKERS = [
  'bootstrap',
  'initial-load',
  'table-bootstrap',
  'workbook-bootstrap',
  'entity-bootstrap'
] as const

export function isColdStartSnapshotReload(seedPrefix: string): boolean {
  const normalized = seedPrefix.trim().toLowerCase()
  return COLD_START_SNAPSHOT_RELOAD_MARKERS.some(marker => normalized.includes(marker))
}
