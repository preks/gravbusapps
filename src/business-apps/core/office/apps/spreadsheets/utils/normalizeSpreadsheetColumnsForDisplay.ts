import type { SpreadsheetColumn } from '../types'

/**
 * API payloads may omit `isVisible` or `label`. Call sites that used `filter(c => c.isVisible)`
 * dropped those columns entirely, which produced an empty column list and a blank Univer surface.
 * Align with `buildWorkbookSnapshot` / Univer: visible unless explicitly `false`.
 * Fall back to `name` when `label` is absent so AI-generated spreadsheets render correctly.
 * We also defensively sort/reseat `order` because some structural server responses can arrive
 * with duplicate or sparse orders during recovery windows.
 */
export function normalizeSpreadsheetColumnsForDisplay(columns: SpreadsheetColumn[]): SpreadsheetColumn[] {
  if (!columns.length) return columns
  return columns
    .map((column, originalIndex) => {
      const order =
        typeof column.order === 'number' && Number.isFinite(column.order) ? Math.trunc(column.order) : originalIndex
      return {
        column,
        originalIndex,
        order
      }
    })
    .sort((left, right) => {
      if (left.order !== right.order) return left.order - right.order
      return left.originalIndex - right.originalIndex
    })
    .map(({ column }, order) => ({
      ...column,
      label: column.label || column.name,
      isVisible: column.isVisible !== false,
      order
    }))
}
