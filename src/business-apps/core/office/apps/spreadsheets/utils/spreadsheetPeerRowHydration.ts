import { getCanonicalRowId, rowMatchesRemoteId } from './spreadsheetRowIdentity'

/**
 * Finite, non-negative `_gridRowIndex` from a row when present — omit from API payloads when `undefined`.
 */
export function getFiniteNonNegativeGridRowIndex(row: Record<string, unknown>): number | undefined {
  const raw = Number(row._gridRowIndex)
  if (!Number.isFinite(raw) || raw < 0) return undefined
  return Math.trunc(raw)
}

/**
 * Canonical visual row index from `_gridRowIndex` when present (Univer/grid ordering).
 * Used by adapters, grid authoritative maps, and peer hydration — keep in sync across call sites.
 */
export function getViewerRowVisualIndex(row: Record<string, unknown>, fallbackIndex: number): number {
  return getFiniteNonNegativeGridRowIndex(row) ?? fallbackIndex
}

/**
 * Stable canonical row order for peer/session arrays: prefer explicit visual slot,
 * then keep original relative order when visual indices tie or are missing.
 */
export function sortRowsByCanonicalVisualOrder<T extends Record<string, unknown>>(rows: T[]): T[] {
  return rows
    .map((row, index) => ({
      row,
      index,
      visualIndex: getViewerRowVisualIndex(row, index)
    }))
    .sort((left, right) => {
      if (left.visualIndex !== right.visualIndex) {
        return left.visualIndex - right.visualIndex
      }
      return left.index - right.index
    })
    .map(entry => entry.row)
}

/**
 * Resolve the visual grid row index for a target row identity inside the current
 * viewer row set. Falls back to reference equality when the row has no durable id.
 */
export function findViewerRowVisualIndex(
  rows: Record<string, unknown>[],
  targetRow: Record<string, unknown>
): number | null {
  const targetCanonicalId = getCanonicalRowId(targetRow)
  const targetClientRowId =
    typeof targetRow._clientRowId === 'string' && targetRow._clientRowId ? targetRow._clientRowId : null

  for (let index = 0; index < rows.length; index += 1) {
    const candidate = rows[index]
    if (targetCanonicalId && rowMatchesRemoteId(candidate, targetCanonicalId)) {
      return getViewerRowVisualIndex(candidate, index)
    }
    if (
      targetClientRowId &&
      typeof candidate._clientRowId === 'string' &&
      candidate._clientRowId === targetClientRowId
    ) {
      return getViewerRowVisualIndex(candidate, index)
    }
    if (!targetCanonicalId && !targetClientRowId && candidate === targetRow) {
      return getViewerRowVisualIndex(candidate, index)
    }
  }

  return null
}

/**
 * Merge authoritative backend row ids onto peer-tab cached rows when positions match,
 * so optimistic client ids do not survive tab switches longer than necessary.
 */
export function hydrateCachedRowsWithServerIdentities(
  cachedRows: Record<string, unknown>[],
  serverRows: Record<string, unknown>[] | undefined
): Record<string, unknown>[] {
  if (!serverRows || serverRows.length === 0 || cachedRows.length === 0) return cachedRows
  const serverRowsByVisualIndex = new Map<number, Record<string, unknown>>()
  serverRows.forEach((row, index) => {
    serverRowsByVisualIndex.set(getViewerRowVisualIndex(row, index), row)
  })

  return cachedRows.map((row, index) => {
    const serverRow = serverRowsByVisualIndex.get(getViewerRowVisualIndex(row, index))
    if (!serverRow) return row
    const serverRowId = getCanonicalRowId(serverRow)
    if (!serverRowId || rowMatchesRemoteId(row, serverRowId)) return row
    const currentId = String(row._id ?? '')
    if (currentId && !currentId.startsWith('client_')) return row
    return {
      ...row,
      _id: serverRowId,
      _rowUuid: serverRow._rowUuid ?? serverRow.id ?? serverRowId,
      ...(serverRow.id != null ? { id: serverRow.id } : {})
    }
  })
}
