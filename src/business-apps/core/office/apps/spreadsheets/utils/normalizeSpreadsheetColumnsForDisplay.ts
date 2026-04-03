import type { SpreadsheetColumn } from '../types'

/**
 * API payloads may omit `isVisible`. Call sites that used `filter(c => c.isVisible)` dropped those
 * columns entirely, which produced an empty column list and a blank Univer surface.
 * Align with `buildWorkbookSnapshot` / Univer: visible unless explicitly `false`.
 */
export function normalizeSpreadsheetColumnsForDisplay(columns: SpreadsheetColumn[]): SpreadsheetColumn[] {
  if (!columns.length) return columns
  return columns.map(column => ({
    ...column,
    isVisible: column.isVisible !== false
  }))
}
