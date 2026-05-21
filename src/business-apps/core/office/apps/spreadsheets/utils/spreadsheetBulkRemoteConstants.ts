/** Minimum distinct cells before using bulk Univer apply (setValues / chunked writes). */
export const SPREADSHEET_BULK_MIN_CELLS_FOR_FAST_PATH = 2

/** Max cells to write per animation frame when chunking non-rectangular bulk applies. */
export const SPREADSHEET_BULK_APPLY_CHUNK_SIZE = 250

/** Stop writing after this many ms per RAF chunk (avoids 500ms+ frame violations). */
export const SPREADSHEET_BULK_RAF_BUDGET_MS = 10

/** Minimum cells per chunk when time-budgeted path also caps batch size. */
export const SPREADSHEET_BULK_RAF_MIN_CHUNK_CELLS = 1

/** Safety cap: single setValues is fast for small rectangles, but blocks the main thread for big pastes. */
export const SPREADSHEET_BULK_MAX_DENSE_RECTANGLE_CELLS = 2_000

/** Sample remote-apply debug logs when many cells would be traced (debug mode only). */
export const SPREADSHEET_BULK_REMOTE_APPLY_DEBUG_SAMPLE = 50
