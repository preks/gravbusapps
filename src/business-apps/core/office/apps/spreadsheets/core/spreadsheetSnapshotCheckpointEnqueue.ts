/** Pending snapshot checkpoint keyed by sheet (latest request wins per sheet). */
export type PendingSnapshotCheckpointEntry = { requestedAt: number }

/**
 * Marks `sheetId` as needing a debounced Univer snapshot checkpoint (HTTP PUT).
 * Repeated calls for the same sheet update `requestedAt` — coalesced by the drain scheduler.
 */
export function touchPendingSpreadsheetSnapshotCheckpointForSheet(
  pendingBySheet: Map<string, PendingSnapshotCheckpointEntry>,
  sheetId: string,
  nowMs: number
): void {
  pendingBySheet.set(sheetId, { requestedAt: nowMs })
}
