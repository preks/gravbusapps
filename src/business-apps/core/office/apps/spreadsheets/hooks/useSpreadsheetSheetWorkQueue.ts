import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'

import {
  createSpreadsheetSheetWorkQueue,
  type SheetWorkQueueApi,
  type SheetWorkQueueDeps
} from '../core/spreadsheetSheetWorkQueue'
import type { SpreadsheetMutationBatchSubmit } from '../core/SpreadsheetMutationFacade'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'

/**
 * Bridges the pure {@link createSpreadsheetSheetWorkQueue} to React.
 *
 * - Queue is constructed once and lives for the lifetime of the host component.
 *   All injected dependencies are read through refs so the queue body never
 *   depends on changing closure values.
 * - The queue is the **sole writer** of `queueClientAppliedVersionRef` — the
 *   ref exposed here is for debug instrumentation and tests only. Do NOT mutate
 *   it from outside the queue.
 * - Idle coalesce window is selected per-render from `getIsCollaborative()`:
 *     - collab: 40–80ms (default 60)
 *     - solo:   100–150ms (default 120)
 *   Pass explicit overrides if a host needs a different cadence.
 */
export interface UseSpreadsheetSheetWorkQueueParams {
  /** Shared mutation operation queue ref from SpreadsheetAppViewer. */
  operationQueueRef: MutableRefObject<Promise<void>>
  /** Same `chainOnOperationQueue` used by the rest of the viewer. */
  chainOnOperationQueue: (queueRef: MutableRefObject<Promise<void>>, fn: () => Promise<void>) => Promise<void>
  /**
   * Dedicated chain for fast-path cell persists so Univer data-change work on
   * `operationQueueRef` cannot starve HTTP.
   */
  localPersistQueueRef: MutableRefObject<Promise<void>>
  /** Existing HTTP submitter (handles 409 retry + recoverFromVersionConflict internally). */
  submitMutationBatch: SpreadsheetMutationBatchSubmit
  /** Direct HTTP submit used by fast-path queue flushes (no main-queue nesting). */
  submitMutationBatchForSheetQueue: SpreadsheetMutationBatchSubmit
  /** Mirrors queue transitions into the diagnostics panel. */
  enqueueDiagnosticsTraceEvent?: (event: SpreadsheetTraceEventInput) => void
  onLocalMutationCellProtectionChange?: (
    sheetId: string,
    cellKeys: readonly string[],
    protectedFromRepaint: boolean
  ) => void
  refreshBaseVersionBeforeWrite: (sheetId: string, baseVersion: number) => Promise<number>
  resolveBaseVersion: (sheetId: string) => number
  /** `collabPersistedBulkApplyDepthRef.current === 0` belt-and-suspenders. */
  collabPersistedBulkApplyDepthRef: MutableRefObject<number>
  /** Used to pick coalesce window (collab vs solo). */
  getIsCollaborative?: () => boolean
  /** Overrides — useful for tests. */
  localIdleCoalesceMsCollab?: number
  localIdleCoalesceMsSolo?: number
  /**
   * Hard cap on the coalesce window. Collab fast typing benefits from a
   * larger window because it lowers the broadcast rate that every peer has
   * to paint, so the collab default is intentionally higher than solo.
   * `localFlushMaxWaitMs` is kept as a back-compat alias that overrides
   * both lanes when set.
   */
  localFlushMaxWaitMsCollab?: number
  localFlushMaxWaitMsSolo?: number
  localFlushMaxWaitMs?: number
  submittedOwnershipTtlMs?: number
  /**
   * Cap for queue-level requeue attempts per failed group. Default 2 (3 wire
   * attempts total). Counts against transient 5xx / 408 / 425 / 429 / network
   * failures, plus 409 `structural_conflict` / `version_too_stale` on
   * fast-path kinds (which the queue retries with a refreshed base).
   */
  maxQueueRetryAttempts?: number
  /**
   * Structural recovery hook invoked before a fast-path 409 retry. Should
   * fetch and apply pending sheet deltas so the local session catches up
   * before the resend. Typically `(sheetId) => requestSheetDeltaCatchUp(...)`.
   */
  requestStructuralRecovery?: (sheetId: string) => Promise<void>
  /** Debug sink — caller decides whether `SHEET_QUEUE_DEBUG` is on. */
  debug?: (event: string, payload: Record<string, unknown>) => void
}

export interface UseSpreadsheetSheetWorkQueueResult {
  queue: SheetWorkQueueApi
  /**
   * Per-sheet client-applied version mirror. Queue owns writes — exposed here
   * for debug surfaces / leave-guard diagnostics only.
   *
   * Read via `queue.getDebugState(sheetId).queueClientAppliedVersion` for the
   * canonical value. The ref is intentionally a snapshot fed by the queue's
   * debug telemetry — never mutate it from outside.
   */
  queueClientAppliedVersionRef: MutableRefObject<Record<string, number | null>>
}

const DEFAULT_COLLAB_IDLE_MS = 60
const DEFAULT_SOLO_IDLE_MS = 120
const DEFAULT_FLUSH_MAX_WAIT_MS_SOLO = 500
const DEFAULT_FLUSH_MAX_WAIT_MS_COLLAB = 1200
const DEFAULT_SUBMITTED_TTL_MS = 10_000

export const useSpreadsheetSheetWorkQueue = (
  params: UseSpreadsheetSheetWorkQueueParams
): UseSpreadsheetSheetWorkQueueResult => {
  // All mutable params behind refs so the queue body sees current values without
  // being rebuilt when callers re-render.
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Mirror of queueClientAppliedVersion per sheet, updated from queue events.
  const queueClientAppliedVersionRef = useRef<Record<string, number | null>>({})

  const queue = useMemo<SheetWorkQueueApi>(() => {
    const deps: SheetWorkQueueDeps = {
      chainOnOperationQueue: fn => paramsRef.current.chainOnOperationQueue(paramsRef.current.operationQueueRef, fn),
      chainOnLocalPersist: fn => paramsRef.current.chainOnOperationQueue(paramsRef.current.localPersistQueueRef, fn),
      submitMutationBatch: request => paramsRef.current.submitMutationBatch(request),
      submitMutationBatchForFastPath: request => paramsRef.current.submitMutationBatchForSheetQueue(request),
      emitDiagnosticsTraceEvent: event => paramsRef.current.enqueueDiagnosticsTraceEvent?.(event),
      onLocalMutationCellProtectionChange: (sheetId, cellKeys, protectedFromRepaint) =>
        paramsRef.current.onLocalMutationCellProtectionChange?.(sheetId, cellKeys, protectedFromRepaint),
      refreshBaseVersionBeforeWrite: (sheetId, baseVersion) =>
        paramsRef.current.refreshBaseVersionBeforeWrite(sheetId, baseVersion),
      resolveBaseVersion: sheetId => paramsRef.current.resolveBaseVersion(sheetId),
      isCollabBulkApplyDepthZero: () => paramsRef.current.collabPersistedBulkApplyDepthRef.current === 0,
      getLocalIdleCoalesceMs: () => {
        const collab = paramsRef.current.getIsCollaborative?.() ?? false
        if (collab) {
          return paramsRef.current.localIdleCoalesceMsCollab ?? DEFAULT_COLLAB_IDLE_MS
        }
        return paramsRef.current.localIdleCoalesceMsSolo ?? DEFAULT_SOLO_IDLE_MS
      },
      getLocalFlushMaxWaitMs: () => {
        const override = paramsRef.current.localFlushMaxWaitMs
        if (typeof override === 'number') return override
        const collab = paramsRef.current.getIsCollaborative?.() ?? false
        if (collab) {
          return paramsRef.current.localFlushMaxWaitMsCollab ?? DEFAULT_FLUSH_MAX_WAIT_MS_COLLAB
        }
        return paramsRef.current.localFlushMaxWaitMsSolo ?? DEFAULT_FLUSH_MAX_WAIT_MS_SOLO
      },
      getSubmittedOwnershipTtlMs: () => paramsRef.current.submittedOwnershipTtlMs ?? DEFAULT_SUBMITTED_TTL_MS,
      getMaxQueueRetryAttempts: () => paramsRef.current.maxQueueRetryAttempts ?? 2,
      // Always provide a forwarder so a hook param that resolves only after
      // mount (common: callbacks live in a sibling hook) still reaches the
      // queue. The forwarder is a no-op when the caller hasn't supplied one.
      requestStructuralRecovery: async (sheetId: string) => {
        const fn = paramsRef.current.requestStructuralRecovery
        if (!fn) return
        await fn(sheetId)
      },
      debug: (event, payload) => {
        // Mirror version state for debug ref whenever queue advertises it.
        const sheetId = typeof payload.sheetId === 'string' ? payload.sheetId : null
        if (sheetId && event === 'remote_job_version_done' && typeof payload.version === 'number') {
          queueClientAppliedVersionRef.current[sheetId] = payload.version
        }
        if (sheetId && event === 'local_group_submitted' && typeof payload.newVersion === 'number') {
          queueClientAppliedVersionRef.current[sheetId] = payload.newVersion
        }
        paramsRef.current.debug?.(event, payload)
      }
    }
    return createSpreadsheetSheetWorkQueue(deps)
    // Queue is intentionally constructed once per host instance.
  }, [])

  useEffect(() => {
    return () => {
      queue.dispose()
    }
  }, [queue])

  return { queue, queueClientAppliedVersionRef }
}
