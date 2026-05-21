import type { MutableRefObject } from 'react'

/**
 * Serializes async work against the same queue used for mutation batches so
 * checkpoint flush cannot race version reads on concurrent batches.
 */
export type SpreadsheetOperationQueueChainer = (
  queueRef: MutableRefObject<Promise<void>>,
  fn: () => Promise<void>
) => Promise<void>

export interface SpreadsheetManualCheckpointContext {
  activeSheetId: string
  /** Cancels debounced cell persist timers before draining the queue */
  clearPendingCellDebounce: () => void
  /** Wait for in-flight socket persists before flushing through the queue */
  awaitSocketPersistChain: () => Promise<void>
  chainOnOperationQueue: SpreadsheetOperationQueueChainer
  operationQueueRef: MutableRefObject<Promise<void>>
  flushPendingCellChanges: () => Promise<void>
  getLiveWorkbookSnapshot: () => Record<string, unknown> | null | undefined
  createVersionCheckpoint: (
    description: string,
    options: { univerSnapshots: Record<string, Record<string, unknown> | null> }
  ) => Promise<unknown | null>
  onFlushFailure: (error: unknown) => void
}

/**
 * User-initiated checkpoint path: cancel debounced persists, drain the mutation
 * queue (including cell flush), then snapshot live Univer state into versioning.
 *
 * Extracted from SpreadsheetAppViewer so sequencing stays centralized (Phase 5).
 */
export async function runSpreadsheetManualCheckpointWithFlush(
  description: string,
  ctx: SpreadsheetManualCheckpointContext
): Promise<unknown | null> {
  ctx.clearPendingCellDebounce()
  try {
    await ctx.awaitSocketPersistChain()
    await ctx.chainOnOperationQueue(ctx.operationQueueRef, () => ctx.flushPendingCellChanges())
  } catch (error) {
    ctx.onFlushFailure(error)
    return null
  }

  const liveSnapshot = ctx.getLiveWorkbookSnapshot() ?? null
  const univerSnapshots: Record<string, Record<string, unknown> | null> = {
    [ctx.activeSheetId]: liveSnapshot
  }

  return ctx.createVersionCheckpoint(description, { univerSnapshots })
}
