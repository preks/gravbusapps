/**
 * Minimum distinct cells before using bulk Univer apply (setValues / chunked
 * writes). Set to 1 so that even single-cell remote broadcasts — which are the
 * common case during concurrent fast typing — take the deferred-paint bulk
 * path (`queueMicrotask` + dense `setValues` / chunked rAF) instead of an
 * immediate synchronous per-cell Univer command. Combined with the receiver
 * rAF coalescer in `buildSpreadsheetCollaborationCallbacks`, this caps remote
 * paint frequency at one Univer command per animation frame.
 */
export const SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH = 1

/** Max cells to write per animation frame when chunking non-rectangular bulk applies. */
export const SPREADSHEET_BULK_APPLY_CHUNK_SIZE = 250

/** Stop writing after this many ms per RAF chunk (avoids 500ms+ frame violations). */
export const SPREADSHEET_BULK_RAF_BUDGET_MS = 10

/** Minimum cells per chunk when time-budgeted path also caps batch size. */
export const SPREADSHEET_BULK_RAF_MIN_CHUNK_CELLS = 1

/**
 * Higher per-frame budget for backlog drains (initial catch-up / authoritative re-sync after
 * delta replay). Live collab keeps the small budget above so concurrent typing stays smooth,
 * but a one-shot catch-up of ~1–5k cells benefits from spending most of one frame on writes
 * instead of stretching the drain across hundreds of animation frames.
 */
export const SPREADSHEET_BULK_RAF_BUDGET_MS_CATCHUP = 40

/** Minimum cells per chunk during catch-up backlog drains; pairs with the larger budget above. */
export const SPREADSHEET_BULK_RAF_MIN_CHUNK_CELLS_CATCHUP = 64

/** Cell-count threshold above which a remote bulk is considered a "backlog" worth fast-draining. */
export const SPREADSHEET_BULK_BACKLOG_CELL_THRESHOLD = 200

/** Safety cap: single setValues is fast for small rectangles, but blocks the main thread for big pastes. */
export const SPREADSHEET_BULK_MAX_DENSE_RECTANGLE_CELLS = 2_000

/**
 * Operation types from {@link SpreadsheetBulkRemoteApplyMeta.operationType} that represent a
 * one-shot backlog drain (catch-up replay or authoritative re-sync) rather than ongoing live
 * collaboration traffic. These bulks are eligible for the larger per-frame budget above.
 */
export const SPREADSHEET_BULK_BACKLOG_OPERATION_TYPES = new Set<string>([
  'authoritative_reapply',
  'catch_up_materialized',
  'add_rows_replay'
])

/** Returns true when the given bulk meta represents a backlog-style drain (Phase 2). */
export function isBacklogBulkApply(operationType: string | undefined, cellCount: number): boolean {
  if (!operationType) return false
  if (!SPREADSHEET_BULK_BACKLOG_OPERATION_TYPES.has(operationType)) return false
  return cellCount >= SPREADSHEET_BULK_BACKLOG_CELL_THRESHOLD
}

/** Sample remote-apply debug logs when many cells would be traced (debug mode only). */
export const SPREADSHEET_BULK_REMOTE_APPLY_DEBUG_SAMPLE = 50

/**
 * Minimum length of a contiguous per-row strip before we pay the `Range.setValues(...)` overhead
 * instead of falling back to per-cell `setValue`. Below this threshold the per-cell path is
 * cheaper (one call vs. one range allocation + matrix). Used by the sparse-row strip fast path
 * in `UniverSheetGrid`'s chunked bulk apply for backlog drains (Phase 4).
 */
export const SPREADSHEET_BULK_ROW_STRIP_MIN_LENGTH = 2
