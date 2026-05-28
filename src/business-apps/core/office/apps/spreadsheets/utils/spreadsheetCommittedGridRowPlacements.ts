import type { ViewerRow } from './spreadsheetRowIdentity'
import { getCanonicalRowId } from './spreadsheetRowIdentity'
import { getFiniteNonNegativeGridRowIndex } from './spreadsheetPeerRowHydration'

export type SpreadsheetCommittedGridRowPlacement = {
  rowUuid: string
  gridRowIndex: number
}

/**
 * Apply BE-committed `{ rowUuid -> _gridRowIndex }` placements onto viewer rows.
 * First release uses identity projection: canonical index equals visible index.
 */
export function applyCommittedGridRowPlacements<T extends ViewerRow>(
  rows: T[],
  placements: Record<string, number> | undefined
): T[] {
  if (!placements || Object.keys(placements).length === 0) {
    return rows
  }

  return rows.map(row => {
    const rowUuid = getCanonicalRowId(row)
    if (!rowUuid) {
      return row
    }
    const nextIndex = placements[rowUuid]
    if (nextIndex == null || !Number.isFinite(nextIndex) || nextIndex < 0) {
      return row
    }
    const normalized = Math.trunc(nextIndex)
    const current = getFiniteNonNegativeGridRowIndex(row)
    if (current === normalized) {
      return row
    }
    return {
      ...row,
      _gridRowIndex: normalized
    }
  })
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

/**
 * Merges `{ rowUuid -> _gridRowIndex }` maps from replay/catch-up delta operations.
 * Later `appliedVersion` wins when the same row appears in multiple changes.
 */
export function mergeGridRowPlacementsFromReplayChanges(
  changes: unknown[] | undefined
): Record<string, number> | undefined {
  if (!changes || changes.length === 0) {
    return undefined
  }

  const merged: Record<string, number> = {}
  const ordered = [...changes].sort((left, right) => {
    const leftVersion = Number((left as Record<string, unknown>).appliedVersion ?? 0)
    const rightVersion = Number((right as Record<string, unknown>).appliedVersion ?? 0)
    return leftVersion - rightVersion
  })

  for (const change of ordered) {
    const record = asRecord(change)
    if (!record) continue
    const payload = asRecord(record.payload) ?? asRecord(record.data) ?? asRecord(record.result)
    const placements =
      parseCommittedGridRowPlacements(record.gridRowIndexByRowUuid) ??
      parseCommittedGridRowPlacements(payload?.gridRowIndexByRowUuid)
    if (!placements) continue
    Object.assign(merged, placements)
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}

export function parseCommittedGridRowPlacements(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  const placements: Record<string, number> = {}
  for (const [rowUuid, rawIndex] of Object.entries(value as Record<string, unknown>)) {
    const normalized = Number(rawIndex)
    if (!rowUuid || !Number.isFinite(normalized) || normalized < 0) {
      continue
    }
    placements[rowUuid] = Math.trunc(normalized)
  }
  return Object.keys(placements).length > 0 ? placements : undefined
}
