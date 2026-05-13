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
