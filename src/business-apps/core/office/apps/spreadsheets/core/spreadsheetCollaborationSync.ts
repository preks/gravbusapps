import type { SpreadsheetReplayResponse } from './SpreadsheetCollaborationContract'

/**
 * Delta operation types that {@link SpreadsheetCollaborationManager.replayDeltaChanges} can translate
 * into grid/data-model updates in addition to {@link SpreadsheetSession.applyDeltaChanges}.
 */
export const MANAGER_REPLAY_DELTA_OP_TYPES = new Set([
  'set_cell',
  'set_range',
  'clear_cell',
  'add_rows',
  'insert_rows_at',
  'insert_row_slots',
  'delete_rows',
  'delete_row_slots',
  'move_row_slots',
  'move_cell_range',
  'row_add',
  'row_delete',
  'row_update',
  'set_style',
  'set_row_height',
  'set_col_width',
  'column_add',
  'column_delete',
  'column_reorder',
  'columns_reorder',
  'column_update',
  'merge_ranges',
  'unmerge_ranges',
  'freeze_panes',
  'filter_update',
  'filter_clear',
  'visibility_update',
  'protect_ranges_update',
  'sheet_protection_update'
])

export function deltaChangesIncludeManagerReplayOps(changes: unknown[] | undefined): boolean {
  return (changes || []).some(change => {
    const operationType = String((change as Record<string, unknown>)?.operationType || '')
    return MANAGER_REPLAY_DELTA_OP_TYPES.has(operationType)
  })
}

/**
 * True when the replay log cannot be applied incrementally and a canonical workbook/sheet reload is required.
 */
export function sheetDeltaRequiresFullSnapshot(
  sinceVersion: number,
  delta: Pick<SpreadsheetReplayResponse, 'currentVersion' | 'changes' | 'requiresSnapshot'>
): boolean {
  if (delta.requiresSnapshot) return true
  if (delta.currentVersion <= sinceVersion) return false
  const changes = delta.changes || []
  if (delta.currentVersion === sinceVersion + 1 && changes.length === 0) return false
  if (changes.length === 0) return true
  const applied = changes
    .map(c => Number((c as unknown as Record<string, unknown>).appliedVersion))
    .filter(n => Number.isFinite(n) && n > 0)
  if (applied.length === 0) return true
  const minApplied = Math.min(...applied)
  return minApplied > sinceVersion + 1
}
