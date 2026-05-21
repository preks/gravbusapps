import type { SpreadsheetSheet } from '../types'

function normalizeSpreadsheetViewerRowIds(data: Record<string, unknown>[]): Record<string, unknown>[] {
  const idCounts = new Map<string, number>()
  data.forEach(row => {
    const uiId = row._id ?? row.id
    const key = uiId == null ? '' : String(uiId)
    if (!key) return
    idCounts.set(key, (idCounts.get(key) ?? 0) + 1)
  })

  let mutated = false
  const normalized = data.map(row => {
    const uiId = row._id ?? row.id
    const key = uiId == null ? '' : String(uiId)
    if (!key || (idCounts.get(key) ?? 0) < 2) return row

    const backendRowId = row._rowUuid == null ? '' : String(row._rowUuid)
    if (!backendRowId || backendRowId === key) return row

    mutated = true
    return {
      ...row,
      _id: backendRowId
    }
  })

  return mutated ? normalized : data
}

/** Sort sheet rows by optional `settings.rowOrder` (shared by session, snapshots, and bootstrap paths). */
export function sortSpreadsheetRowsBySheetSettings(
  data: Record<string, unknown>[],
  sheet?: SpreadsheetSheet | { settings?: { rowOrder?: string[] } }
): Record<string, unknown>[] {
  const normalizedData = normalizeSpreadsheetViewerRowIds(data)
  const rowOrder = sheet?.settings?.rowOrder
  if (!rowOrder || rowOrder.length === 0) return normalizedData

  const orderMap = new Map(rowOrder.map((id, idx) => [id, idx]))
  return [...normalizedData].sort((a, b) => {
    const aId = String(a._rowUuid ?? a._id ?? a.id ?? '')
    const bId = String(b._rowUuid ?? b._id ?? b.id ?? '')
    const aOrder = orderMap.get(aId) ?? Number.MAX_SAFE_INTEGER
    const bOrder = orderMap.get(bId) ?? Number.MAX_SAFE_INTEGER
    return aOrder - bOrder
  })
}
