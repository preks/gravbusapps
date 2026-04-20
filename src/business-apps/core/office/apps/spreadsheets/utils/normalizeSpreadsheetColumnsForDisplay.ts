import type { SpreadsheetColumn } from '../types'

/**
 * API payloads may omit `isVisible` or `label`. Call sites that used `filter(c => c.isVisible)`
 * dropped those columns entirely, which produced an empty column list and a blank Univer surface.
 * Align with `buildWorkbookSnapshot` / Univer: visible unless explicitly `false`.
 * Fall back to `name` when `label` is absent so AI-generated spreadsheets render correctly.
 */
export function normalizeSpreadsheetColumnsForDisplay(columns: SpreadsheetColumn[]): SpreadsheetColumn[] {
  if (!columns.length) return columns
  return columns.map(column => ({
    ...column,
    label: column.label || column.name,
    isVisible: column.isVisible !== false
  }))
}
