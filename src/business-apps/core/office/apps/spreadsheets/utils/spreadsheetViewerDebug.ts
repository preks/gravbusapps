import { countWorksheetsInUniverSnapshot, workbookFormattingRichnessScore } from './univerAdapter'
import { getViewerRowVisualIndex } from './spreadsheetPeerRowHydration'
import { getKnownCellValueCount, getWorksheetFromSnapshot } from '../core'
import { env } from '@/common/env/EnvUtils'

/** Debounce for remote sheet catch-up when switching tabs (ms). */
export const REMOTE_SHEET_CATCHUP_DEBOUNCE_MS = 150

/** With spreadsheet debug on (`spreadsheetAppsDebug` localStorage), periodic sheet/workbook version log interval (ms). */
export const SPREADSHEET_VERSION_DEBUG_HEARTBEAT_MS = 5000

/**
 * Optional: periodically remount Univer (`requestGridRefresh`). **Off by default** — full remount flickers badly.
 * Set `NEXT_PUBLIC_SPREADSHEET_GRID_REFRESH_INTERVAL_MS` to a positive ms (max 60000) only when debugging sync.
 */
export const SPREADSHEET_GRID_AUTO_REFRESH_MS = ((): number => {
  const raw = env('NEXT_PUBLIC_SPREADSHEET_GRID_REFRESH_INTERVAL_MS')
  if (raw == null || raw === '' || raw === '0') return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60_000) : 0
})()

export const isSpreadsheetAppsDebugEnabled = (): boolean => {
  try {
    return (
      globalThis.localStorage?.getItem('spreadsheetAppsDebug') === '1' ||
      globalThis.localStorage?.getItem('debug:spreadsheet-apps') === '1'
    )
  } catch {
    return false
  }
}

export const debugLog = (message: string, meta?: Record<string, unknown>): void => {
  if (!isSpreadsheetAppsDebugEnabled()) return
  console.debug(`[SpreadsheetAppViewer] ${message}`, meta ?? {})
}

export const multiSheetDebugLog = (
  event: string,
  meta?: Record<string, unknown> | (() => Record<string, unknown>)
): void => {
  if (!isSpreadsheetAppsDebugEnabled()) return
  console.info(`[SpreadsheetMultiSheetDebug] ${event}`, typeof meta === 'function' ? meta() : (meta ?? {}))
}

export const summarizeRowsForDebug = (rows: Record<string, unknown>[] | undefined): Record<string, unknown> => {
  if (!rows || rows.length === 0) return { rowCount: 0 }
  const visualIndices = rows
    .map((row, fallbackIndex) => getViewerRowVisualIndex(row, fallbackIndex))
    .sort((a, b) => a - b)
  return {
    rowCount: rows.length,
    firstVisualRow: visualIndices[0],
    lastVisualRow: visualIndices[visualIndices.length - 1],
    nonEmptyRows: rows.filter(row => getKnownCellValueCount(row) > 0).length,
    sample: rows.slice(0, 3).map((row, index) => ({
      index,
      gridRowIndex: row._gridRowIndex ?? null,
      id: row._id ?? row.id ?? null,
      valueCount: getKnownCellValueCount(row)
    }))
  }
}

export const summarizeWorkbookSnapshotForDebug = (
  snapshot: Record<string, unknown> | null | undefined,
  focusSheetId?: string
): Record<string, unknown> => {
  if (!snapshot || typeof snapshot !== 'object') {
    return { hasSnapshot: false }
  }
  const styles = snapshot.styles
  return {
    hasSnapshot: true,
    worksheetCount: countWorksheetsInUniverSnapshot(snapshot),
    sheetOrder: Array.isArray(snapshot.sheetOrder) ? snapshot.sheetOrder.map(id => String(id)) : [],
    styleCount: styles && typeof styles === 'object' ? Object.keys(styles as Record<string, unknown>).length : 0,
    focusSheetId: focusSheetId ?? null,
    focusSheetFormattingRichness: focusSheetId ? workbookFormattingRichnessScore(snapshot, focusSheetId) : null
  }
}

export const summarizeLiveWorksheetSnapshotForDebug = (
  snapshot: Record<string, unknown> | null | undefined,
  sheetId: string
): Record<string, unknown> => {
  if (!snapshot) return { hasSnapshot: false }
  const worksheet = getWorksheetFromSnapshot(snapshot, sheetId)
  const cellData = worksheet?.cellData as Record<string, Record<string, unknown>> | undefined
  if (!cellData || typeof cellData !== 'object') {
    return {
      hasSnapshot: true,
      hasWorksheet: Boolean(worksheet),
      rowKeyCount: 0
    }
  }
  const rowKeys = Object.keys(cellData)
    .map(key => Number(key))
    .filter(value => Number.isFinite(value))
    .sort((a, b) => a - b)
  return {
    hasSnapshot: true,
    hasWorksheet: Boolean(worksheet),
    rowKeyCount: rowKeys.length,
    firstRowKey: rowKeys[0] ?? null,
    lastRowKey: rowKeys[rowKeys.length - 1] ?? null,
    firstRows: rowKeys.slice(0, 5).map(rowIndex => ({
      rowIndex,
      columnCount: Object.keys(cellData[String(rowIndex)] ?? cellData[rowIndex] ?? {}).length
    }))
  }
}
