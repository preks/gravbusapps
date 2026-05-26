/**
 * Operation types that purely mutate cell values (no row/column/style/structural metadata).
 *
 * On catch-up / conflict-recovery, these cell-value ops do not need to be re-replayed through
 * the collab manager's grid-paint path — the session row state (B) plus the authoritative
 * region re-sync (C) already paint the correct values once. Routing them through collab replay
 * (A) triggers thousands of per-cell `setValue` commands that dominate CPU for tens of seconds.
 *
 * Structural ops still need collab replay because they touch row/column structure that the
 * authoritative-region cell paint cannot reproduce.
 */
export const PURE_CELL_VALUE_DELTA_OP_TYPES = new Set<string>(['set_cell', 'set_range', 'clear_cell', 'cells_changed'])

export type ReplayDeltaPartition<T> = {
  /** Cell-value ops only. Safe to skip in collab replay during catch-up. */
  cellValueChanges: T[]
  /** Structural / style / row-column ops that require collab replay onto Univer. */
  structuralChanges: T[]
}

/**
 * Splits replay deltas into pure cell-value ops vs structural/other ops. Used by catch-up and
 * conflict-recovery to avoid the duplicate cell-paint pass through the collab manager.
 *
 * Order within each bucket is preserved.
 */
export function partitionReplayDeltaChanges<T extends { operationType?: string }>(
  changes: T[] | undefined | null
): ReplayDeltaPartition<T> {
  const cellValueChanges: T[] = []
  const structuralChanges: T[] = []
  if (!Array.isArray(changes)) return { cellValueChanges, structuralChanges }
  for (const change of changes) {
    const operationType = typeof change?.operationType === 'string' ? change.operationType : ''
    if (PURE_CELL_VALUE_DELTA_OP_TYPES.has(operationType)) {
      cellValueChanges.push(change)
    } else {
      structuralChanges.push(change)
    }
  }
  return { cellValueChanges, structuralChanges }
}

/**
 * Counts cell-value vs structural ops without materializing arrays. Useful for diagnostics
 * on the catch-up hot path where allocating new arrays is wasteful for read-only logging.
 */
export function countReplayDeltaChangeKinds(changes: Array<{ operationType?: string }> | undefined | null): {
  changeCount: number
  cellChangeCount: number
  structuralChangeCount: number
} {
  if (!Array.isArray(changes)) {
    return { changeCount: 0, cellChangeCount: 0, structuralChangeCount: 0 }
  }
  let cellChangeCount = 0
  let structuralChangeCount = 0
  for (const change of changes) {
    const operationType = typeof change?.operationType === 'string' ? change.operationType : ''
    if (PURE_CELL_VALUE_DELTA_OP_TYPES.has(operationType)) {
      cellChangeCount += 1
    } else {
      structuralChangeCount += 1
    }
  }
  return { changeCount: changes.length, cellChangeCount, structuralChangeCount }
}
