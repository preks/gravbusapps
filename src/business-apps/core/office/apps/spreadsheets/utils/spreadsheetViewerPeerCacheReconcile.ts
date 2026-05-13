import type { SpreadsheetSheet } from '../types'
import { sortSpreadsheetRowsBySheetSettings } from './spreadsheetSheetRowSort'

export type PendingUniverRowsEntry = {
  data: Record<string, unknown>[]
  persistedRows: Record<string, unknown>[]
}

/**
 * Keeps `peerSheetDataCache` aligned with `app.sheets` updates without wiping live rows
 * for sheets whose server payload is empty/stale (multi-sheet native tabs).
 */
export function reconcilePeerSheetCachesFromAppSheets(options: {
  sheets: SpreadsheetSheet[]
  activeSheetId: string
  getActiveSessionRows: () => Record<string, unknown>[]
  pendingUniverRowsBySheet: Map<string, PendingUniverRowsEntry>
  peerSheetDataCache: Map<string, Record<string, unknown>[]>
  authoritativePeerSheetDataCache: Set<string>
}): void {
  const {
    sheets,
    activeSheetId,
    getActiveSessionRows,
    pendingUniverRowsBySheet,
    peerSheetDataCache,
    authoritativePeerSheetDataCache
  } = options

  const nextSheetIds = new Set(sheets.map(sheet => sheet.id))
  for (const cachedSheetId of Array.from(peerSheetDataCache.keys())) {
    if (!nextSheetIds.has(cachedSheetId)) {
      peerSheetDataCache.delete(cachedSheetId)
      authoritativePeerSheetDataCache.delete(cachedSheetId)
    }
  }

  for (const sheet of sheets) {
    const serverRows = sortSpreadsheetRowsBySheetSettings(sheet.data ?? [], sheet) as Record<string, unknown>[]
    const pendingUniverRows = pendingUniverRowsBySheet.get(sheet.id)

    if (sheet.id === activeSheetId) {
      const activeRows = getActiveSessionRows()
      const rowsToCache = activeRows.length > 0 ? activeRows : serverRows
      peerSheetDataCache.set(sheet.id, [...rowsToCache])
      authoritativePeerSheetDataCache.add(sheet.id)
      continue
    }

    if (pendingUniverRows && pendingUniverRows.data.length > pendingUniverRows.persistedRows.length) {
      peerSheetDataCache.set(sheet.id, [...pendingUniverRows.data])
      authoritativePeerSheetDataCache.add(sheet.id)
      continue
    }

    const existingRows = peerSheetDataCache.get(sheet.id)
    if (!existingRows) {
      peerSheetDataCache.set(sheet.id, serverRows)
      authoritativePeerSheetDataCache.add(sheet.id)
      continue
    }

    if (existingRows.length === 0 && serverRows.length > 0) {
      peerSheetDataCache.set(sheet.id, serverRows)
      authoritativePeerSheetDataCache.add(sheet.id)
    }
  }
}
