const CANONICAL_RELOAD_MATERIALIZATION_REASONS = new Set([
  'batch_operations',
  'column_structure',
  'structural_operation',
  'column_add',
  'column_delete',
  'column_reorder',
  'columns_reorder',
  'column_reorder_no_native_handler',
  'column_reorder_structural_repair',
  'column_slots_insert_fallback',
  'column_slots_delete_fallback',
  'row_structure',
  'insert_row_slots',
  'delete_row_slots',
  'move_row_slots',
  'row_slots_insert_fallback',
  'row_slots_delete_fallback',
  'row_slots_move_fallback'
])

export function prefersCanonicalReloadForMaterializationReason(reason: string | null | undefined): boolean {
  if (!reason) {
    return false
  }
  return CANONICAL_RELOAD_MATERIALIZATION_REASONS.has(reason)
}
