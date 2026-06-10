export const RECENT_LOCAL_SNAPSHOT_MUTATION_TTL_MS = 5_000

const HYDRATION_GUARD_REASONS = new Set(['focus', 'visibility'])

const SNAPSHOT_MUTATING_OPERATION_TYPES = new Set([
  'set_style',
  'clear_all',
  'clear_format',
  'column_update',
  'set_row_height',
  'set_col_width',
  'add_rows',
  'insert_rows_at',
  'delete_rows',
  'move_rows',
  'insert_columns_at',
  'delete_columns',
  'move_columns',
  'merge_ranges',
  'unmerge_ranges',
  'freeze_panes',
  'set_freeze'
])

export interface RecentLocalSnapshotMutationEntry {
  expiresAt: number
  sources: Set<string>
}

export type RecentLocalSnapshotMutationState = Map<string, RecentLocalSnapshotMutationEntry>

export type SheetHydrationReason = 'sheet_switch' | 'focus' | 'visibility' | 'reconnect' | 'prefetch'

export function shouldSkipActiveSheetSnapshotHydration(params: {
  reason: SheetHydrationReason
  isActiveTargetSheet: boolean
  localOperationVersion: number
  serverOperationVersion: number
  localSheetSnapshotVersion: number
  serverSheetSnapshotVersion: number
}): boolean {
  if (!params.isActiveTargetSheet) return false
  if (!HYDRATION_GUARD_REASONS.has(params.reason)) return false
  if (params.localSheetSnapshotVersion >= params.serverSheetSnapshotVersion) return false
  return params.localOperationVersion >= params.serverOperationVersion
}

export function isSnapshotMutatingOperationType(type: string | undefined): boolean {
  const normalizedType = String(type ?? '')
    .trim()
    .toLowerCase()
  if (!normalizedType) return false
  if (SNAPSHOT_MUTATING_OPERATION_TYPES.has(normalizedType)) return true
  return normalizedType.includes('column_') || normalizedType.includes('row_')
}

export function pruneExpiredRecentLocalSnapshotMutations(
  state: RecentLocalSnapshotMutationState,
  now = Date.now()
): void {
  for (const [sheetId, entry] of state.entries()) {
    if (entry.expiresAt <= now) {
      state.delete(sheetId)
    }
  }
}

export function markRecentLocalSnapshotMutation(
  state: RecentLocalSnapshotMutationState,
  sheetId: string,
  source: string,
  ttlMs = RECENT_LOCAL_SNAPSHOT_MUTATION_TTL_MS,
  now = Date.now()
): void {
  if (!sheetId) return
  pruneExpiredRecentLocalSnapshotMutations(state, now)
  const previous = state.get(sheetId)
  const nextSources = previous ? new Set(previous.sources) : new Set<string>()
  if (source) {
    nextSources.add(source)
  }
  state.set(sheetId, {
    expiresAt: Math.max(previous?.expiresAt ?? 0, now + Math.max(0, ttlMs)),
    sources: nextSources
  })
}

export function getRecentLocalSnapshotMutation(
  state: RecentLocalSnapshotMutationState,
  sheetId: string,
  now = Date.now()
): RecentLocalSnapshotMutationEntry | null {
  if (!sheetId) return null
  pruneExpiredRecentLocalSnapshotMutations(state, now)
  return state.get(sheetId) ?? null
}

export function shouldDeferHydrationForRecentLocalSnapshotMutation(params: {
  state: RecentLocalSnapshotMutationState
  targetSheetId: string
  activeSheetId: string
  reason: SheetHydrationReason
  now?: number
}): boolean {
  if (params.targetSheetId !== params.activeSheetId) return false
  if (!HYDRATION_GUARD_REASONS.has(params.reason)) return false
  return getRecentLocalSnapshotMutation(params.state, params.targetSheetId, params.now) != null
}
