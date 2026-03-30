import type { ViewType } from '../types'

export type RenderedSpreadsheetMainViewType = 'table' | 'form' | 'dashboard' | 'kanban'

/**
 * Maps sheet / view config to a viewer pane that actually exists.
 * `calendar` and any unknown type fall back to `table` so we never return `null` from the main view renderer.
 */
export function resolveRenderedSpreadsheetViewType(
  raw: ViewType | string | undefined
): RenderedSpreadsheetMainViewType {
  if (raw === 'table' || raw === 'form' || raw === 'dashboard' || raw === 'kanban') {
    return raw
  }
  return 'table'
}
