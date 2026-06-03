import type { SpreadsheetCellIntentRecord } from '../core/spreadsheetIntentJournal'
import { getCanonicalRowId, rowMatchesRemoteId } from './spreadsheetRowIdentity'

/** Unacked local cell intents that may still need overlay after a snapshot reload. */
const REAPPLICABLE_INTENT_STATES = new Set<SpreadsheetCellIntentRecord['state']>(['staged', 'ready', 'submitted'])

/**
 * Intents captured at or before the reloaded sheet version (`baseVersion <= reloadedVersion`).
 * Acknowledged/rejected intents are excluded by state. This is not "newer than reload" — it
 * preserves local work the server snapshot has not yet reflected.
 */
export function listReapplicableLocalIntents(
  intents: SpreadsheetCellIntentRecord[],
  params: { sheetId: string; reloadedVersion: number }
): SpreadsheetCellIntentRecord[] {
  const reloadedVersion = Math.trunc(params.reloadedVersion)
  return intents.filter(intent => {
    if (intent.sheetId !== params.sheetId) return false
    if (!REAPPLICABLE_INTENT_STATES.has(intent.state)) return false
    return intent.baseVersion <= reloadedVersion
  })
}

export function reapplyUnresolvedLocalIntentsToRows<T extends Record<string, unknown>>(
  rows: T[],
  intents: SpreadsheetCellIntentRecord[],
  params: { sheetId: string; reloadedVersion: number }
): T[] {
  const reapplicable = listReapplicableLocalIntents(intents, params)
  if (reapplicable.length === 0) {
    return rows
  }

  return rows.map(row => {
    const rowIdentities = new Set<string>()
    const canonical = getCanonicalRowId(row)
    if (canonical) rowIdentities.add(canonical)
    if (typeof row._clientRowId === 'string' && row._clientRowId) {
      rowIdentities.add(row._clientRowId)
    }

    const overlays = reapplicable.filter(
      intent =>
        rowMatchesRemoteId(row, intent.logicalRowHandle) ||
        [...rowIdentities].some(identity => rowMatchesRemoteId(row, identity))
    )
    if (overlays.length === 0) {
      return row
    }

    const overlay = Object.fromEntries(overlays.map(intent => [intent.columnName, intent.value]))
    return { ...row, ...overlay } as T
  })
}
