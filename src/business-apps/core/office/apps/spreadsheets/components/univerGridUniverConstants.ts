/** Univer command `type` for committed mutations (see Univer command pipeline). */
export const UNIVER_COMMAND_TYPE_MUTATION = 2

export const REMOTE_ECHO_SUPPRESSION_TTL_MS = 800

/** Spread bulk-only serial fallback across frames — avoids main-thread freezes when one peer joins mid-flight on huge `set_style` replays. */
export const BULK_SERIAL_FALLBACK_CELLS_PER_FRAME = 64

export const SELECTION_RECONCILE_LOCAL_EDIT_SUPPRESSION_MS = 400

export const COPY_ORIGIN_RESTORE_WINDOW_MS = 30000

/** Cleanup only. Paste formatting correctness should come from consuming the matching mutation wave. */
export const FORMATTING_PASTE_INTENT_CLEANUP_WINDOW_MS = 30000

/** Fallback safety cap for worksheet range scans when Univer does not provide sparse payload coordinates. */
export const SPREADSHEET_MAX_WORKSHEET_RANGE_READ_CELLS = 10000
