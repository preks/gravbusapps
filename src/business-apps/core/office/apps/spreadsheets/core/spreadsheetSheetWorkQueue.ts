/**
 * Per-sheet local intent coordinator unifying:
 *  - Local normal `handleMutationBatchOp` submits (FIFO + coalesce window)
 *  - Remote deltaUpdates / collaboration grid-apply jobs (FIFO)
 *
 * Both lanes serialize globally on the injected `operationQueueRef` chain.
 *
 * Submit gating is per-kind:
 *
 *  - **Fast path** (`cellValue`, `rangeValue`, `clear` — pure cell-value writes):
 *    The backend resolves per-(rowId, columnName) conflicts inline and returns
 *    `results[]` (Tier 1). Submitting with a stale base is safe — non-overlapping
 *    writes are accepted, overlapping writes come back as `rejected_conflict`
 *    with `serverState` that the pipeline paints. Therefore the fast path does
 *    **not** wait for in-flight remote jobs (no starvation behind replay) and
 *    does **not** enforce `queueClientAppliedVersion === refreshedBaseVersion`.
 *
 *  - **Conservative path** (`paste`, `style`, `formula`, `structural`,
 *    `undoRedo`, `unknownAtomic`): row/column/sheet structure or multi-cell
 *    transformations can be invalidated by remote changes that landed in the
 *    gap. These keep the version equality invariant and the remote-priority
 *    gate to avoid sending operations that would 409 against a structurally
 *    shifted base.
 *
 * Response-aware ownership:
 *  - Backend `results[]` is consulted per operation: `accepted` ops clear
 *    ownership for their cells (transition to `submitted` with TTL); cells
 *    bound to `rejected_conflict` ops are marked `failed` so the visible
 *    serverState paint (issued by the mutation pipeline) is no longer treated
 *    as locally owned. Older backends that omit `results[]` fall back to the
 *    legacy behavior of marking every owned cell `submitted`.
 *
 * The queue is the sole writer of `queueClientAppliedVersion` — never derive
 * it from a `Math.max(...)` across collab refs.
 */

import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetMutationBatchSubmit, SpreadsheetMutationTraceMeta } from './SpreadsheetMutationFacade'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type LocalPersistKind =
  // Coalescable: simple `set_cell` value writes only.
  | 'cellValue'
  // Atomic boundaries — never coalesce across these.
  | 'rangeValue'
  | 'paste'
  | 'style'
  | 'formula'
  | 'structural'
  | 'undoRedo'
  | 'clear'
  | 'unknownAtomic'

export interface LocalPersistInput {
  sheetId: string
  kind: LocalPersistKind
  operations: SpreadsheetBatchOperation[]
  enqueuedAt: number
  traceId?: string
  /**
   * Cell keys this group claims ownership of (so guards B/C can skip duplicate
   * persist while these are pending/scheduled/submitting). Optional — caller may
   * pass undefined for kinds that don't map to a single-cell concept (e.g.
   * structural / dimensions).
   */
  ownedCellKeys?: readonly string[]
  /** Optional trace meta forwarded to the HTTP submitter. */
  traceMeta?: SpreadsheetMutationTraceMeta
  /** Optional batchIdPrefix forwarded to the HTTP submitter. */
  batchIdPrefix?: string
  /**
   * Queue-managed counter for failed-and-requeued attempts. Set by the queue
   * internally on requeue; callers leave this undefined on initial enqueue.
   */
  retryAttempt?: number
}

export type RemoteApplyKind =
  // Bulk/single cell grid paint expected before completion.
  | 'gridApply'
  // Transaction runner + any async bulk follow-up + paint.
  | 'transactionApply'
  // Client echo: version update only, no grid paint.
  | 'versionOnlyEcho'
  // Fallback path with no grid API; caller signals done explicitly.
  | 'noGridFallback'

export interface RemoteJobRecord {
  jobId: string
  sheetId: string
  kind: RemoteApplyKind
  paintDone: boolean
  versionDone: boolean
  bulkDepthDone: boolean
  noGridFallbackDone: boolean
  createdAt: number
  /** Set when `controller.fail(...)` is invoked. */
  failed: boolean
  /** Set when all required signals for `kind` are satisfied. */
  complete: boolean
}

export interface RemoteJobController {
  readonly jobId: string
  readonly sheetId: string
  readonly kind: RemoteApplyKind
  markPaintDone(): void
  markVersionDone(version?: number): void
  markBulkDepthDone(): void
  markNoGridFallbackDone(): void
  fail(error: unknown): void
}

export type QueueCellOwnershipState = 'none' | 'pending' | 'scheduled' | 'submitting' | 'submitted' | 'failed'

export type ForceFlushGroupResult = 'flushed' | 'blocked_by_remote' | 'failed' | 'nothing_to_flush'

export interface ForceFlushAllResult {
  bySheet: Record<string, ForceFlushGroupResult[]>
}

export type SheetQueueSyncState = 'idle' | 'pending' | 'retrying' | 'failed' | 'conflict_recovered'

export interface SheetQueueDebugState {
  sheetId: string
  remotePending: number
  remoteInFlight: number
  localPending: number
  localOldestWaitMs: number
  coalesceWindowOpen: boolean
  pendingGroupCount: number
  lastFlushGroupKind: LocalPersistKind | null
  lastFlushGroupSize: number
  lastBaseVersion: number | null
  queueClientAppliedVersion: number | null
  lastSubmittedVersion: number | null
  lastNewVersion: number | null
  lastWaitReason: string | null
  lastRetryCount: number
  activeRemoteJobs: RemoteJobRecord[]
  cellOwnershipCounts: Partial<Record<QueueCellOwnershipState, number>>
  syncState: SheetQueueSyncState
}

export interface SheetWorkQueueApi {
  enqueueRemoteApply(
    sheetId: string,
    kind: RemoteApplyKind,
    execute: (controller: RemoteJobController) => Promise<void>
  ): Promise<string>
  enqueueLocalPersist(sheetId: string, item: LocalPersistInput): Promise<void>
  forceFlush(sheetId: string): Promise<ForceFlushGroupResult[]>
  forceFlushAll(): Promise<ForceFlushAllResult>
  awaitIdle(sheetId: string): Promise<void>
  getQueueCellState(sheetId: string, cellKey: string): QueueCellOwnershipState
  isQueueOwnedCell(sheetId: string, cellKey: string): boolean
  getDebugState(sheetId: string): SheetQueueDebugState
  /** Test/teardown only — cancels timers and rejects nothing; queue becomes inert. */
  dispose(): void
}

// ---------------------------------------------------------------------------
// Dependencies (injected by `useSpreadsheetSheetWorkQueue`)
// ---------------------------------------------------------------------------

export interface SheetWorkQueueDeps {
  /** Serialize `fn` on the shared mutation operation queue chain. */
  chainOnOperationQueue: (fn: () => Promise<void>) => Promise<void>
  /**
   * Fast-path local persists (`cellValue` / `rangeValue` / `clear`) use a
   * dedicated chain so `processUniverDataChange` backlog on the main queue
   * cannot starve HTTP. Falls back to `chainOnOperationQueue` when omitted.
   */
  chainOnLocalPersist?: (fn: () => Promise<void>) => Promise<void>
  /** Submits a single local batch via the existing HTTP submitter (409 retry inside). */
  submitMutationBatch: SpreadsheetMutationBatchSubmit
  /**
   * Direct HTTP submit for fast-path groups (no extra `operationQueueRef`
   * nesting). Falls back to `submitMutationBatch` when omitted.
   */
  submitMutationBatchForFastPath?: SpreadsheetMutationBatchSubmit
  /** Mirrors key queue transitions into the spreadsheet diagnostics panel. */
  emitDiagnosticsTraceEvent?: (event: SpreadsheetTraceEventInput) => void
  refreshBaseVersionBeforeWrite: (sheetId: string, baseVersion: number) => Promise<number>
  resolveBaseVersion: (sheetId: string) => number
  /** Returns true while a bulk apply scope is open globally (belt-and-suspenders). */
  isCollabBulkApplyDepthZero: () => boolean
  /** SOLO vs COLLAB idle coalesce window selector (in ms). */
  getLocalIdleCoalesceMs: () => number
  /** Hard cap on coalesce window; submit even if more cellValue arrive (in ms). */
  getLocalFlushMaxWaitMs?: () => number
  /** Submitted-state TTL before cell ownership returns to `none` (in ms). */
  getSubmittedOwnershipTtlMs?: () => number
  /**
   * Hard cap on queue-level requeue attempts per failed group. After the cap
   * is reached, the group is dropped to `failed` and the user is responsible
   * for re-typing. Defaults to 2 (so total wire attempts = 1 original + 2
   * requeues = 3).
   *
   * Counts against this budget:
   *  - Transient network / 5xx / 408 / 425 / 429 failures.
   *  - 409 `structural_conflict` / `version_too_stale` on **fast-path**
   *    kinds (cellValue / rangeValue / clear) — those are cell-addressed
   *    by stable `rowId` + `columnName` and survive a structural shift, so
   *    a refreshed-base resend is safe (bounded so a pathological loop
   *    cannot spin forever).
   */
  getMaxQueueRetryAttempts?: () => number
  /**
   * Optional structural recovery hook invoked **before** a 409 fast-path
   * retry. It should fetch and apply any pending sheet deltas (so the
   * local session/baseline catches up from the stale `baseVersion` to the
   * server's `currentVersion` before we resend). The promise should resolve
   * once recovery has run (success or skipped); rejection is treated as
   * best-effort and does not block the retry — the cell write will still
   * land server-side, but the visible grid may flicker until a remote
   * broadcast arrives.
   *
   * When omitted, the retry fires immediately without structural catch-up.
   */
  requestStructuralRecovery?: (sheetId: string) => Promise<void>
  /** Optional debug sink — gated by `SHEET_QUEUE_DEBUG` at the call site. */
  debug?: (event: string, payload: Record<string, unknown>) => void
  /** Wall clock; overridable for tests. */
  now?: () => number
  /** Timer abstraction; overridable for tests. */
  setTimeoutFn?: (fn: () => void, ms: number) => unknown
  clearTimeoutFn?: (handle: unknown) => void
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_LOCAL_FLUSH_MAX_WAIT_MS = 500
const DEFAULT_SUBMITTED_OWNERSHIP_TTL_MS = 10_000
const DEFAULT_MAX_QUEUE_RETRY_ATTEMPTS = 2
const LOCAL_OLDEST_WAIT_NONE = 0

/**
 * Pure cell-value writes that the backend can resolve per-(rowId, columnName)
 * via Tier 1 conflict resolution. Fast-path groups bypass the remote-priority
 * gate and the version equality invariant so user typing is never starved
 * behind in-flight remote replay.
 *
 * Atomic-boundary kinds (structural / paste / style / formula / undoRedo /
 * unknownAtomic) keep the conservative path because the backend cannot
 * rebase them per-field — a stale base would either 409 or silently land on
 * the wrong row/column after a structural shift.
 */
const isFastPathLocalPersistKind = (kind: LocalPersistKind): boolean =>
  kind === 'cellValue' || kind === 'rangeValue' || kind === 'clear'

const chainForLocalPersistKind = (
  deps: SheetWorkQueueDeps,
  kind: LocalPersistKind
): ((fn: () => Promise<void>) => Promise<void>) => {
  if (isFastPathLocalPersistKind(kind) && deps.chainOnLocalPersist) {
    return deps.chainOnLocalPersist
  }
  return deps.chainOnOperationQueue
}

const submitMutationBatchForKind = (
  deps: SheetWorkQueueDeps,
  kind: LocalPersistKind
): SpreadsheetMutationBatchSubmit => {
  if (isFastPathLocalPersistKind(kind) && deps.submitMutationBatchForFastPath) {
    return deps.submitMutationBatchForFastPath
  }
  return deps.submitMutationBatch
}

/**
 * Auto-add row batches (`add_rows` only) are race-tolerant on the backend:
 * the handler dedups by `clientRowId` and adopts position collisions.
 * On the new gap-aware structural gate the BE only rejects `add_rows` when
 * a gap row shifter actually intersects a positional target — once the FE
 * has caught up via `requestStructuralRecovery` and resubmits, the batch
 * lands. We treat such groups like the fast path for the 409 retry decision
 * (same retry cap, same `requestStructuralRecovery`-then-requeue dance),
 * but do NOT treat them as fast path elsewhere — the conservative-path
 * version-equality invariant still matters because `add_rows` carries
 * `clientRowId` mappings that downstream `set_range` ops depend on.
 *
 * Other structural shapes (column_add, insert_rows_at, delete_rows,
 * move_row_slots, columns_reorder, column_delete, move_cell_range) are
 * NOT auto-retried — their positional intent depends on the grid order at
 * submit time, so a blind resubmit would silently land at the wrong index.
 * Those bubble up to higher-level handling.
 */
const isAddRowsOnlyOperationList = (operations: readonly SpreadsheetBatchOperation[]): boolean => {
  if (operations.length === 0) return false
  for (const op of operations) {
    if (String((op as { type?: unknown }).type ?? '') !== 'add_rows') {
      return false
    }
  }
  return true
}

/**
 * Classify whether a submit failure is worth requeueing inside the queue.
 *
 * - Network / transient (5xx, 408/425/429): retryable for every kind.
 * - 409 `structural_conflict` / `version_too_stale` on a fast-path kind:
 *   retryable. Cells are addressed by stable `rowId` (UUID) + `columnName`,
 *   so a structural shift between `baseVersion` and `currentVersion` does
 *   NOT invalidate the operation identity — only its base version is stale.
 *   The retry refreshes the base via `refreshBaseVersionBeforeWrite` (the
 *   submitter has already updated session/remembered sheet versions from
 *   the 409 body) and resends. Without this, fast-path writes that race a
 *   structural change are silently lost (no retry, no `serverState` paint).
 * - 409 on an **add_rows-only** batch (auto-add row): retryable on the same
 *   plumbing. The backend `add_rows` handler is race-tolerant
 *   (`clientRowId` dedup + position-adopt) and the gap-aware structural
 *   gate only 409s when a gap row shifter actually intersects a positional
 *   target. After `requestStructuralRecovery` catches the local session up,
 *   the resubmit either lands or, in the rare case it 409s again, exhausts
 *   the retry cap. This unblocks downstream `set_range(rowRef=clientHandle)`
 *   ops that would otherwise fail with `unknown_client_row_handle` because
 *   the `clientRowId → UUID` mapping never arrived.
 * - 409 on any other conservative kind (structural insert/delete/move,
 *   column ops, paste, style, formula, undoRedo, unknownAtomic): terminal.
 *   Their semantics depend on a grid layout that may have shifted in
 *   incompatible ways; a blind resubmit would silently land at the wrong
 *   index. Surface to higher-level handling.
 * - Plain `Error`s with no `status`: terminal.
 */
const isQueueRetryableSubmitFailure = (
  error: unknown,
  kind: LocalPersistKind,
  operations: readonly SpreadsheetBatchOperation[]
): boolean => {
  if (error == null || typeof error !== 'object') return false
  const status = (error as { status?: unknown }).status
  if (typeof status !== 'number') return false
  if (status === 408 || status === 425 || status === 429) return true
  if (status >= 500 && status < 600) return true
  if (status === 409) {
    const reason = readErrorReason(error)
    // `structural_conflict` and `version_too_stale` both fit the rebase
    // model: they signal a base-version drift, not a semantically invalid
    // operation. `partial_operation_id_overlap` is NOT retried — it
    // indicates the server already processed (some of) these operationIds
    // and a resend would be ambiguous; the journal layer must intervene.
    if (reason !== 'structural_conflict' && reason !== 'version_too_stale') {
      return false
    }
    // Fast-path cells are identified by stable (rowId, columnName) and
    // survive a structural shift — refreshed-base resend is safe.
    if (isFastPathLocalPersistKind(kind)) return true
    // Auto-add-row batches (`add_rows` exclusively) are race-tolerant on
    // the BE: `clientRowId` dedup + position-adopt absorb concurrent
    // creations, and the new gap-aware gate only 409s when a gap row
    // shifter actually intersects a target position. After a structural
    // recovery the resubmit lands.
    if (isAddRowsOnlyOperationList(operations)) return true
  }
  return false
}

const readErrorReason = (error: unknown): string | null => {
  if (error == null || typeof error !== 'object') return null
  const details = (error as { details?: unknown }).details
  if (!details || typeof details !== 'object') return null
  const reason = (details as { reason?: unknown }).reason
  if (typeof reason === 'string') return reason
  const message = (details as { message?: unknown }).message
  if (message && typeof message === 'object') {
    const nested = (message as { reason?: unknown }).reason
    if (typeof nested === 'string') return nested
  }
  return null
}

const readErrorCurrentVersion = (error: unknown): number | null => {
  if (error == null || typeof error !== 'object') return null
  const details = (error as { details?: unknown }).details
  if (!details || typeof details !== 'object') return null
  const raw = (details as { currentVersion?: unknown }).currentVersion
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.trunc(raw)
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw)
  const message = (details as { message?: unknown }).message
  if (message && typeof message === 'object') {
    const nested = (message as { currentVersion?: unknown }).currentVersion
    if (typeof nested === 'number' && Number.isFinite(nested)) return Math.trunc(nested)
    if (typeof nested === 'string' && /^\d+$/.test(nested)) return Number(nested)
  }
  return null
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let jobIdSequence = 0
const nextJobId = (): string => {
  jobIdSequence += 1
  return `rj_${Date.now().toString(36)}_${jobIdSequence}`
}

const remoteJobRequiresPaint = (kind: RemoteApplyKind): boolean => kind === 'gridApply' || kind === 'transactionApply'

const remoteJobRequiresBulkDepth = (kind: RemoteApplyKind): boolean =>
  kind === 'gridApply' || kind === 'transactionApply'

const remoteJobRequiresNoGridFallback = (kind: RemoteApplyKind): boolean => kind === 'noGridFallback'

const isRemoteJobComplete = (record: RemoteJobRecord): boolean => {
  if (record.failed) return true
  if (!record.versionDone) return false
  if (remoteJobRequiresPaint(record.kind) && !record.paintDone) return false
  if (remoteJobRequiresBulkDepth(record.kind) && !record.bulkDepthDone) return false
  if (remoteJobRequiresNoGridFallback(record.kind) && !record.noGridFallbackDone) return false
  return true
}

interface PerSheetState {
  sheetId: string
  // Local lane
  localGroups: LocalPersistInput[]
  coalesceTimer: unknown | null
  coalesceFirstScheduledAt: number | null
  // Remote lane
  remotePending: RemoteJobRecord[]
  remoteInFlight: Map<string, RemoteJobRecord>
  remoteAwaitingSignals: Map<string, RemoteJobRecord>
  // Cell ownership
  cellOwnership: Map<string, { state: QueueCellOwnershipState; submittedAt?: number; ttlHandle?: unknown }>
  // Version tracking (queue-owned)
  queueClientAppliedVersion: number | null
  // Debug telemetry
  lastFlushGroupKind: LocalPersistKind | null
  lastFlushGroupSize: number
  lastBaseVersion: number | null
  lastSubmittedVersion: number | null
  lastNewVersion: number | null
  lastWaitReason: string | null
  lastRetryCount: number
  syncState: SheetQueueSyncState
  // awaitIdle waiters
  idleWaiters: Array<() => void>
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createSpreadsheetSheetWorkQueue = (deps: SheetWorkQueueDeps): SheetWorkQueueApi => {
  const now = deps.now ?? (() => Date.now())
  const setTimeoutFn = deps.setTimeoutFn ?? ((fn, ms) => setTimeout(fn, ms))
  const clearTimeoutFn = deps.clearTimeoutFn ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>))
  const flushMaxWaitMs = () => deps.getLocalFlushMaxWaitMs?.() ?? DEFAULT_LOCAL_FLUSH_MAX_WAIT_MS
  const submittedTtlMs = () => deps.getSubmittedOwnershipTtlMs?.() ?? DEFAULT_SUBMITTED_OWNERSHIP_TTL_MS
  const maxQueueRetryAttempts = () => deps.getMaxQueueRetryAttempts?.() ?? DEFAULT_MAX_QUEUE_RETRY_ATTEMPTS
  const debug = (event: string, payload: Record<string, unknown>): void => {
    deps.debug?.(event, payload)
  }
  const traceDiag = (
    stage: string,
    payload: Record<string, unknown>,
    options?: { traceId?: string | null; severity?: SpreadsheetTraceEventInput['severity'] }
  ): void => {
    deps.emitDiagnosticsTraceEvent?.({
      source: 'client',
      stage,
      traceId: options?.traceId ?? null,
      severity: options?.severity,
      payload
    })
  }

  const sheets = new Map<string, PerSheetState>()
  let disposed = false

  const ensureSheet = (sheetId: string): PerSheetState => {
    let state = sheets.get(sheetId)
    if (!state) {
      state = {
        sheetId,
        localGroups: [],
        coalesceTimer: null,
        coalesceFirstScheduledAt: null,
        remotePending: [],
        remoteInFlight: new Map(),
        remoteAwaitingSignals: new Map(),
        cellOwnership: new Map(),
        queueClientAppliedVersion: null,
        lastFlushGroupKind: null,
        lastFlushGroupSize: 0,
        lastBaseVersion: null,
        lastSubmittedVersion: null,
        lastNewVersion: null,
        lastWaitReason: null,
        lastRetryCount: 0,
        syncState: 'idle',
        idleWaiters: []
      }
      sheets.set(sheetId, state)
    }
    return state
  }

  // -------------------------------------------------------------------------
  // Cell ownership lifecycle
  // -------------------------------------------------------------------------

  const setCellState = (state: PerSheetState, cellKey: string, next: QueueCellOwnershipState): void => {
    const existing = state.cellOwnership.get(cellKey)
    if (existing?.ttlHandle != null) {
      clearTimeoutFn(existing.ttlHandle)
    }
    if (next === 'none') {
      state.cellOwnership.delete(cellKey)
      return
    }
    if (next === 'submitted') {
      const submittedAt = now()
      const ttl = submittedTtlMs()
      const ttlHandle = setTimeoutFn(() => {
        const current = state.cellOwnership.get(cellKey)
        if (current?.state === 'submitted' && current.submittedAt === submittedAt) {
          state.cellOwnership.delete(cellKey)
        }
      }, ttl)
      state.cellOwnership.set(cellKey, { state: next, submittedAt, ttlHandle })
      return
    }
    state.cellOwnership.set(cellKey, { state: next })
  }

  const setCellStatesBulk = (
    state: PerSheetState,
    cellKeys: readonly string[] | undefined,
    next: QueueCellOwnershipState
  ): void => {
    if (!cellKeys || cellKeys.length === 0) return
    for (const key of cellKeys) {
      setCellState(state, key, next)
    }
  }

  const getCellState = (sheetId: string, cellKey: string): QueueCellOwnershipState => {
    const state = sheets.get(sheetId)
    if (!state) return 'none'
    return state.cellOwnership.get(cellKey)?.state ?? 'none'
  }

  // -------------------------------------------------------------------------
  // Remote lane
  // -------------------------------------------------------------------------

  const isSheetPersistReady = (state: PerSheetState): { ready: boolean; reason: string | null } => {
    if (state.remotePending.length > 0) return { ready: false, reason: 'remote_pending' }
    if (state.remoteInFlight.size > 0) return { ready: false, reason: 'remote_in_flight' }
    if (state.remoteAwaitingSignals.size > 0) return { ready: false, reason: 'remote_awaiting_signals' }
    if (!deps.isCollabBulkApplyDepthZero()) return { ready: false, reason: 'bulk_depth_open' }
    return { ready: true, reason: null }
  }

  /**
   * Fast-path gate: only bulk-apply depth blocks. Remote pending/in-flight/
   * awaiting-signals do NOT block cell-value submits because the backend
   * resolves per-field conflicts and accepts stale-base disjoint writes.
   */
  const isSheetPersistReadyForFastPath = (): { ready: boolean; reason: string | null } => {
    if (!deps.isCollabBulkApplyDepthZero()) return { ready: false, reason: 'bulk_depth_open' }
    return { ready: true, reason: null }
  }

  const persistReadyForGroup = (
    state: PerSheetState,
    kind: LocalPersistKind
  ): { ready: boolean; reason: string | null } =>
    isFastPathLocalPersistKind(kind) ? isSheetPersistReadyForFastPath() : isSheetPersistReady(state)

  const notifyIdleIfReached = (state: PerSheetState): void => {
    if (state.localGroups.length > 0) return
    if (state.coalesceTimer != null) return
    if (state.remotePending.length > 0) return
    if (state.remoteInFlight.size > 0) return
    if (state.remoteAwaitingSignals.size > 0) return
    if (state.idleWaiters.length === 0) return
    const waiters = state.idleWaiters
    state.idleWaiters = []
    state.syncState = 'idle'
    for (const w of waiters) {
      try {
        w()
      } catch {
        // intentional: idle waiters must not throw out of notify
      }
    }
  }

  const tryCompleteRemoteJob = (state: PerSheetState, record: RemoteJobRecord): void => {
    if (record.complete) return
    if (!isRemoteJobComplete(record)) return
    record.complete = true
    state.remoteAwaitingSignals.delete(record.jobId)
    state.remoteInFlight.delete(record.jobId)
    debug('remote_job_complete', {
      sheetId: state.sheetId,
      jobId: record.jobId,
      kind: record.kind,
      failed: record.failed
    })
    // Once a remote job completes, the gate may have cleared for queued local groups.
    scheduleLocalFlushIfPossible(state)
    notifyIdleIfReached(state)
  }

  const buildRemoteController = (state: PerSheetState, record: RemoteJobRecord): RemoteJobController => ({
    jobId: record.jobId,
    sheetId: record.sheetId,
    kind: record.kind,
    markPaintDone: () => {
      if (record.complete) return
      record.paintDone = true
      debug('remote_job_paint_done', { sheetId: state.sheetId, jobId: record.jobId, kind: record.kind })
      tryCompleteRemoteJob(state, record)
    },
    markVersionDone: (version?: number) => {
      if (record.complete) return
      record.versionDone = true
      if (typeof version === 'number' && Number.isFinite(version)) {
        // Queue is sole writer; we apply a defensive max so out-of-order
        // version echoes (e.g. a late versionOnlyEcho seeded from a stale
        // ref read) cannot downgrade an already-advanced authoritative
        // version. This is safe because the invariant requires
        // queueClientAppliedVersion to mirror the latest known server
        // version, which is monotonically non-decreasing.
        const previous = state.queueClientAppliedVersion
        if (previous == null || version > previous) {
          state.queueClientAppliedVersion = version
        }
      }
      debug('remote_job_version_done', {
        sheetId: state.sheetId,
        jobId: record.jobId,
        kind: record.kind,
        version: version ?? null
      })
      tryCompleteRemoteJob(state, record)
    },
    markBulkDepthDone: () => {
      if (record.complete) return
      record.bulkDepthDone = true
      debug('remote_job_bulk_depth_done', { sheetId: state.sheetId, jobId: record.jobId, kind: record.kind })
      tryCompleteRemoteJob(state, record)
    },
    markNoGridFallbackDone: () => {
      if (record.complete) return
      record.noGridFallbackDone = true
      // Required telemetry per plan: noGridFallback must emit warning/debug event.
      debug('remote_job_no_grid_fallback', {
        sheetId: state.sheetId,
        jobId: record.jobId,
        kind: record.kind
      })
      tryCompleteRemoteJob(state, record)
    },
    fail: (error: unknown) => {
      if (record.complete) return
      record.failed = true
      debug('remote_job_failed', {
        sheetId: state.sheetId,
        jobId: record.jobId,
        kind: record.kind,
        error: error instanceof Error ? error.message : String(error)
      })
      tryCompleteRemoteJob(state, record)
    }
  })

  const drainRemotePending = (state: PerSheetState): void => {
    if (disposed) return
    // Move all pending remote jobs into in-flight serially on operationQueue chain.
    // We do them one at a time so callers can observe deterministic ordering.
    if (state.remotePending.length === 0) return
    const record = state.remotePending.shift()
    if (!record) return
    state.remoteInFlight.set(record.jobId, record)
    state.syncState = 'pending'
    const executor = pendingRemoteExecutors.get(record.jobId)
    pendingRemoteExecutors.delete(record.jobId)
    if (!executor) {
      // Defensive: no executor means the caller never made it; treat as complete.
      state.remoteInFlight.delete(record.jobId)
      drainRemotePending(state)
      return
    }
    void deps.chainOnOperationQueue(async () => {
      const controller = buildRemoteController(state, record)
      try {
        await executor(controller)
      } catch (error) {
        controller.fail(error)
      }
      // If the caller never invoked any controller method (kind permitting), we
      // park the job in awaitingSignals so persist-ready blocks correctly until
      // signals (or a future fail) complete it. For kinds that need no further
      // signal beyond what executor must have invoked, completion already happened
      // through the controller methods inside the executor.
      if (!record.complete) {
        state.remoteInFlight.delete(record.jobId)
        state.remoteAwaitingSignals.set(record.jobId, record)
      }
      // After executor returns, attempt to drain more remote jobs and then local.
      drainRemotePending(state)
      scheduleLocalFlushIfPossible(state)
    })
  }

  /** Executors keyed by jobId — separated so RemoteJobRecord stays serializable. */
  const pendingRemoteExecutors = new Map<string, (controller: RemoteJobController) => Promise<void>>()

  const enqueueRemoteApply: SheetWorkQueueApi['enqueueRemoteApply'] = async (sheetId, kind, execute) => {
    if (disposed) {
      throw new Error('SheetWorkQueue disposed')
    }
    const state = ensureSheet(sheetId)
    const record: RemoteJobRecord = {
      jobId: nextJobId(),
      sheetId,
      kind,
      paintDone: false,
      versionDone: false,
      bulkDepthDone: false,
      noGridFallbackDone: false,
      createdAt: now(),
      failed: false,
      complete: false
    }
    pendingRemoteExecutors.set(record.jobId, execute)
    state.remotePending.push(record)
    debug('remote_job_created', { sheetId, jobId: record.jobId, kind })
    drainRemotePending(state)
    return record.jobId
  }

  // -------------------------------------------------------------------------
  // Local lane
  // -------------------------------------------------------------------------

  const cellKeyForOp = (op: SpreadsheetBatchOperation): string | null => {
    const data = (op as { data?: Record<string, unknown> }).data
    if (!data || typeof data !== 'object') return null
    const rowId = (data as { rowId?: unknown }).rowId
    const columnName = (data as { columnName?: unknown }).columnName
    if (typeof rowId !== 'string' || typeof columnName !== 'string') return null
    return `${rowId}\u0000${columnName}`
  }

  /**
   * Map the backend's per-operation `results[]` onto per-cell ownership.
   *
   * - `accepted` ops transition their owned cell to `submitted` (TTL applies).
   * - `rejected_conflict` ops transition their owned cell to `failed` so the
   *   visible `serverState` paint issued by the mutation pipeline is no longer
   *   shadowed by stale local ownership. The user can immediately retype on
   *   top of a failed cell because `enqueueLocalPersist` resets state to
   *   `pending`.
   * - Cells in `group.ownedCellKeys` that don't correspond to any operation
   *   in `results[]` (e.g. anonymous ops without `data.rowId`/`columnName`)
   *   default to `submitted` — same as the legacy no-results behavior.
   * - When the backend omits `results[]` entirely (pre-Tier-1), every owned
   *   cell falls back to `submitted` so behavior is unchanged for that case.
   */
  const applyResponseAwareOwnership = (
    state: PerSheetState,
    group: LocalPersistInput,
    response: SpreadsheetBatchOperationResponse
  ): void => {
    const results = response.results
    if (!results || results.length === 0) {
      setCellStatesBulk(state, group.ownedCellKeys, 'submitted')
      return
    }
    const operationIdToCellKey = new Map<string, string>()
    for (const op of group.operations) {
      const opId = (op as { operationId?: unknown }).operationId
      if (typeof opId !== 'string') continue
      const key = cellKeyForOp(op)
      if (key) operationIdToCellKey.set(opId, key)
    }
    const acceptedKeys: string[] = []
    const rejectedKeys: string[] = []
    const accountedFor = new Set<string>()
    for (const r of results) {
      const key = operationIdToCellKey.get(r.operationId)
      if (!key) continue
      accountedFor.add(key)
      if (r.status === 'accepted') acceptedKeys.push(key)
      else rejectedKeys.push(key)
    }
    if (group.ownedCellKeys && group.ownedCellKeys.length > 0) {
      const unaccounted = group.ownedCellKeys.filter(k => !accountedFor.has(k))
      setCellStatesBulk(state, unaccounted, 'submitted')
    }
    setCellStatesBulk(state, acceptedKeys, 'submitted')
    setCellStatesBulk(state, rejectedKeys, 'failed')
  }

  const countResultsByStatus = (
    response: SpreadsheetBatchOperationResponse,
    status: 'accepted' | 'rejected_conflict'
  ): number => {
    if (!response.results || response.results.length === 0) return 0
    let count = 0
    for (const r of response.results) {
      if (r.status === status) count += 1
    }
    return count
  }

  const canCoalesceWithLastGroup = (state: PerSheetState, kind: LocalPersistKind): boolean => {
    if (kind !== 'cellValue') return false
    const last = state.localGroups[state.localGroups.length - 1]
    if (!last) return false
    return last.kind === 'cellValue'
  }

  const mergeIntoLastGroup = (state: PerSheetState, item: LocalPersistInput): void => {
    const last = state.localGroups[state.localGroups.length - 1]
    if (!last) {
      state.localGroups.push(item)
      return
    }
    // Latest write wins per cellKey within the merged group.
    const merged = new Map<string, SpreadsheetBatchOperation>()
    const anonOps: SpreadsheetBatchOperation[] = []
    const ingest = (ops: SpreadsheetBatchOperation[]) => {
      for (const op of ops) {
        const key = cellKeyForOp(op)
        if (key) {
          merged.delete(key)
          merged.set(key, op)
        } else {
          anonOps.push(op)
        }
      }
    }
    ingest(last.operations)
    ingest(item.operations)
    last.operations = [...anonOps, ...Array.from(merged.values())]
    if (item.ownedCellKeys) {
      const existing = new Set(last.ownedCellKeys ?? [])
      for (const k of item.ownedCellKeys) existing.add(k)
      last.ownedCellKeys = Array.from(existing)
    }
  }

  const cancelCoalesceTimer = (state: PerSheetState): void => {
    if (state.coalesceTimer != null) {
      clearTimeoutFn(state.coalesceTimer)
      state.coalesceTimer = null
    }
  }

  const armCoalesceTimer = (state: PerSheetState): void => {
    cancelCoalesceTimer(state)
    const idleMs = deps.getLocalIdleCoalesceMs()
    const firstScheduledAt = state.coalesceFirstScheduledAt ?? now()
    const elapsed = now() - firstScheduledAt
    const remainingHardCap = Math.max(0, flushMaxWaitMs() - elapsed)
    const waitMs = Math.min(idleMs, remainingHardCap)
    state.coalesceTimer = setTimeoutFn(() => {
      state.coalesceTimer = null
      state.coalesceFirstScheduledAt = null
      scheduleLocalFlushIfPossible(state)
    }, waitMs)
  }

  /**
   * First group that can run now. Fast-path groups may flush ahead of a
   * conservative head that is waiting on remote/bulk gates so cell typing
   * is not starved for tens of seconds.
   */
  const findNextFlushableGroupIndex = (state: PerSheetState): number => {
    for (let index = 0; index < state.localGroups.length; index += 1) {
      const candidate = state.localGroups[index]
      if (!candidate) continue
      const ready = persistReadyForGroup(state, candidate.kind)
      if (ready.ready) return index
    }
    return -1
  }

  /**
   * Attempt to flush one local group through `operationQueueRef`. Caller must
   * invoke this whenever conditions might have changed (remote drained, version
   * advanced, new local item enqueued past coalesce window, idle reached).
   */
  const scheduleLocalFlushIfPossible = (state: PerSheetState): void => {
    if (disposed) return
    if (state.localGroups.length === 0) {
      notifyIdleIfReached(state)
      return
    }
    // If coalesce timer is active and head group is coalescable, let timer fire.
    if (state.coalesceTimer != null) {
      const head = state.localGroups[0]
      if (head?.kind === 'cellValue') return
      // Atomic-boundary head should not wait on timer — fall through to flush.
      cancelCoalesceTimer(state)
      state.coalesceFirstScheduledAt = null
    }
    const flushIndex = findNextFlushableGroupIndex(state)
    if (flushIndex < 0) {
      const head = state.localGroups[0]
      if (!head) {
        state.lastWaitReason = null
        notifyIdleIfReached(state)
        return
      }
      const ready = persistReadyForGroup(state, head.kind)
      state.lastWaitReason = ready.reason
      traceDiag('sheet_queue_flush_blocked', {
        sheetId: state.sheetId,
        kind: head.kind,
        reason: ready.reason,
        pendingGroups: state.localGroups.length,
        fastPath: isFastPathLocalPersistKind(head.kind)
      })
      if (
        ready.reason === 'remote_pending' ||
        ready.reason === 'remote_in_flight' ||
        ready.reason === 'remote_awaiting_signals'
      ) {
        debug('local_starved_by_remote', { sheetId: state.sheetId, reason: ready.reason, kind: head.kind })
      }
      return
    }
    state.lastWaitReason = null
    const group = state.localGroups[flushIndex]
    if (!group) {
      notifyIdleIfReached(state)
      return
    }
    // Mark owned cells as submitting (transition pending → submitting at flush time).
    setCellStatesBulk(state, group.ownedCellKeys, 'submitting')
    state.localGroups.splice(flushIndex, 1)
    state.syncState = 'pending'
    traceDiag(
      'sheet_queue_flush_scheduled',
      {
        sheetId: state.sheetId,
        kind: group.kind,
        operationCount: group.operations.length,
        fastPath: isFastPathLocalPersistKind(group.kind),
        usesLocalPersistChain: isFastPathLocalPersistKind(group.kind) && Boolean(deps.chainOnLocalPersist)
      },
      { traceId: group.traceId }
    )
    void chainForLocalPersistKind(
      deps,
      group.kind
    )(async () => {
      await submitGroup(state, group)
    })
  }

  const submitGroup = async (
    state: PerSheetState,
    group: LocalPersistInput
  ): Promise<'submitted' | 'failed' | 'parked'> => {
    let madeProgress = false
    let outcome: 'submitted' | 'failed' | 'parked' = 'parked'
    const isFastPath = isFastPathLocalPersistKind(group.kind)
    const isAddRowsOnly = isAddRowsOnlyOperationList(group.operations)
    try {
      const refreshedBaseVersion = await deps.refreshBaseVersionBeforeWrite(
        group.sheetId,
        deps.resolveBaseVersion(group.sheetId)
      )
      state.lastBaseVersion = refreshedBaseVersion

      let wireBaseVersion: number
      if (isFastPath) {
        // Fast path: backend resolves per-(rowId, columnName) conflicts inline
        // (Tier 1). Stale-base disjoint writes are accepted, overlapping writes
        // come back as `rejected_conflict` in `results[]`. Use the latest known
        // base directly and do NOT park on version-equality. Best-effort: seed
        // `queueClientAppliedVersion` if missing so debug surfaces report a
        // sensible value.
        wireBaseVersion = refreshedBaseVersion
        if (state.queueClientAppliedVersion == null || state.queueClientAppliedVersion < refreshedBaseVersion) {
          state.queueClientAppliedVersion = refreshedBaseVersion
        }
      } else {
        // Conservative path: structural/style/paste/etc. cannot be rebased
        // per-field. Require the queue mirror to match the refreshed base, but
        // catch up when collab version echoes lag behind `knownSheetVersion`
        // (otherwise the lane parks forever with `client_behind_refreshed_base`
        // while fast-path groups pile up behind the head).
        let clientApplied = state.queueClientAppliedVersion
        if (clientApplied == null) {
          state.queueClientAppliedVersion = refreshedBaseVersion
          clientApplied = refreshedBaseVersion
          debug('version_confidence_seeded_from_refresh', {
            sheetId: state.sheetId,
            refreshedBaseVersion,
            kind: group.kind
          })
          traceDiag(
            'sheet_queue_version_catchup',
            {
              sheetId: state.sheetId,
              kind: group.kind,
              previousClientApplied: null,
              refreshedBaseVersion,
              reason: 'version_confidence_missing'
            },
            { traceId: group.traceId }
          )
        } else if (clientApplied < refreshedBaseVersion) {
          debug('client_behind_refreshed_base_catchup', {
            sheetId: state.sheetId,
            refreshedBaseVersion,
            clientApplied,
            kind: group.kind
          })
          state.queueClientAppliedVersion = refreshedBaseVersion
          traceDiag(
            'sheet_queue_version_catchup',
            {
              sheetId: state.sheetId,
              kind: group.kind,
              previousClientApplied: clientApplied,
              refreshedBaseVersion,
              reason: 'client_behind_refreshed_base'
            },
            { traceId: group.traceId }
          )
        } else if (clientApplied > refreshedBaseVersion) {
          debug('client_ahead_of_refreshed_base', {
            sheetId: state.sheetId,
            refreshedBaseVersion,
            clientApplied,
            kind: group.kind
          })
          state.localGroups.unshift(group)
          setCellStatesBulk(state, group.ownedCellKeys, 'pending')
          state.syncState = 'idle'
          state.lastWaitReason = 'client_ahead_of_refreshed_base'
          traceDiag(
            'sheet_queue_flush_parked',
            {
              sheetId: state.sheetId,
              kind: group.kind,
              reason: 'client_ahead_of_refreshed_base',
              refreshedBaseVersion,
              clientApplied
            },
            { traceId: group.traceId, severity: 'warning' }
          )
          outcome = 'parked'
          return outcome
        }
        wireBaseVersion = refreshedBaseVersion
      }

      state.lastSubmittedVersion = wireBaseVersion
      state.lastFlushGroupKind = group.kind
      state.lastFlushGroupSize = group.operations.length

      traceDiag(
        'sheet_queue_http_submit_started',
        {
          sheetId: group.sheetId,
          kind: group.kind,
          operationCount: group.operations.length,
          baseVersion: wireBaseVersion,
          fastPath: isFastPath
        },
        { traceId: group.traceId }
      )
      const response: SpreadsheetBatchOperationResponse = await submitMutationBatchForKind(
        deps,
        group.kind
      )({
        sheetId: group.sheetId,
        operations: group.operations,
        batchIdPrefix: group.batchIdPrefix,
        traceMeta: group.traceMeta,
        // Wire baseVersion matches the value the queue gate authorized
        // (no TOCTOU). For fast path this is the freshly refreshed base.
        baseVersion: wireBaseVersion
      })
      state.lastNewVersion = response.newVersion
      // Queue is sole writer of queueClientAppliedVersion for local-submit
      // case. Monotonic max — late responses cannot downgrade a version
      // already advanced by a concurrent remote echo.
      if (state.queueClientAppliedVersion == null || response.newVersion > state.queueClientAppliedVersion) {
        state.queueClientAppliedVersion = response.newVersion
      }
      state.syncState = 'idle'
      applyResponseAwareOwnership(state, group, response)
      madeProgress = true
      outcome = 'submitted'
      debug('local_group_submitted', {
        sheetId: state.sheetId,
        kind: group.kind,
        size: group.operations.length,
        newVersion: response.newVersion,
        baseVersion: wireBaseVersion,
        fastPath: isFastPath,
        acceptedCount: countResultsByStatus(response, 'accepted'),
        rejectedCount: countResultsByStatus(response, 'rejected_conflict'),
        retryAttempt: group.retryAttempt ?? 0
      })
      traceDiag(
        'sheet_queue_http_submit_finished',
        {
          sheetId: state.sheetId,
          kind: group.kind,
          operationCount: group.operations.length,
          newVersion: response.newVersion,
          baseVersion: wireBaseVersion,
          fastPath: isFastPath
        },
        { traceId: group.traceId }
      )
    } catch (error) {
      const attempt = group.retryAttempt ?? 0
      const isRetryable = isQueueRetryableSubmitFailure(error, group.kind, group.operations)
      const canRequeue = isRetryable && attempt < maxQueueRetryAttempts()
      const errorStatus =
        typeof (error as { status?: unknown })?.status === 'number' ? (error as { status: number }).status : null
      const errorReason = readErrorReason(error)
      const conflictServerVersion = errorStatus === 409 ? readErrorCurrentVersion(error) : null

      state.lastRetryCount += 1
      debug('local_group_failed', {
        sheetId: state.sheetId,
        kind: group.kind,
        size: group.operations.length,
        attempt,
        isRetryable,
        canRequeue,
        status: errorStatus,
        reason: errorReason,
        conflictServerVersion,
        fastPath: isFastPath,
        addRowsOnly: isAddRowsOnly,
        error: error instanceof Error ? error.message : String(error)
      })

      // Advance the queue's clientAppliedVersion mirror to the server-reported
      // currentVersion (when present). This keeps the conservative-path
      // invariant unblocked after a fast-path retry resolves the base drift,
      // and it prevents the next fast-path refresh from re-issuing the same
      // stale base.
      if (
        conflictServerVersion != null &&
        (state.queueClientAppliedVersion == null || conflictServerVersion > state.queueClientAppliedVersion)
      ) {
        state.queueClientAppliedVersion = conflictServerVersion
      }

      if (canRequeue) {
        // Bounded requeue:
        //  - Transient (5xx / 408 / 425 / 429 / network): retried as-is.
        //  - 409 `structural_conflict` / `version_too_stale` on a fast-path
        //    kind: requeued so the next submit picks up the refreshed base
        //    version. Cells are identified by stable `rowId` (UUID) +
        //    `columnName`, so the operation identity survives a structural
        //    shift — only the base version was stale.
        //
        // For the 409 case we also trigger an optional structural recovery
        // (`requestStructuralRecovery`) before the resend so the local
        // session/baseline catches up from `baseVersion` to the server's
        // `currentVersion`. Without it the cell write still lands on the
        // server, but the visible grid would be stale until the next remote
        // broadcast arrives. We suppress the finally-block's immediate flush
        // (`madeProgress = false`) and re-arm it from the recovery callback
        // so the retry waits for catch-up. Recovery itself enqueues onto the
        // remote lane via `requestSheetDeltaCatchUp`, which serializes with
        // the local retry through the operation queue chain.
        const shouldRunStructuralRecovery =
          errorStatus === 409 && (isFastPath || isAddRowsOnly) && deps.requestStructuralRecovery != null
        state.localGroups.unshift({ ...group, retryAttempt: attempt + 1 })
        setCellStatesBulk(state, group.ownedCellKeys, 'pending')
        state.syncState = 'retrying'
        outcome = 'parked'
        if (shouldRunStructuralRecovery) {
          // Do NOT set madeProgress yet — the finally block would re-flush
          // immediately and bypass the catch-up. Recovery's `then` callback
          // reschedules the flush after the structural delta is applied.
          madeProgress = false
          void deps.requestStructuralRecovery!(group.sheetId)
            .catch(recoveryError => {
              debug('structural_recovery_failed', {
                sheetId: state.sheetId,
                kind: group.kind,
                attempt: attempt + 1,
                error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
              })
            })
            .then(() => {
              if (disposed) return
              scheduleLocalFlushIfPossible(state)
            })
        } else {
          madeProgress = true
        }
      } else {
        state.syncState = 'failed'
        setCellStatesBulk(state, group.ownedCellKeys, 'failed')
        madeProgress = true // group consumed; do not block other groups
        outcome = 'failed'
        traceDiag(
          'sheet_queue_http_submit_failed',
          {
            sheetId: state.sheetId,
            kind: group.kind,
            operationCount: group.operations.length,
            attempt,
            status: errorStatus,
            reason: errorReason,
            message: error instanceof Error ? error.message : String(error)
          },
          { traceId: group.traceId, severity: 'error' }
        )
      }
    } finally {
      // Only continue draining when we actually consumed a group. If we parked
      // on version mismatch, we must wait for an external trigger (remote
      // completion / new enqueue) to avoid a tight reschedule loop.
      if (madeProgress) {
        scheduleLocalFlushIfPossible(state)
      }
      notifyIdleIfReached(state)
    }
    return outcome
  }

  const enqueueLocalPersist: SheetWorkQueueApi['enqueueLocalPersist'] = async (sheetId, item) => {
    if (disposed) {
      throw new Error('SheetWorkQueue disposed')
    }
    if (item.sheetId !== sheetId) {
      throw new Error(`SheetWorkQueue.enqueueLocalPersist: sheetId mismatch (api=${sheetId} item=${item.sheetId})`)
    }
    const state = ensureSheet(sheetId)
    setCellStatesBulk(state, item.ownedCellKeys, 'pending')
    if (canCoalesceWithLastGroup(state, item.kind)) {
      mergeIntoLastGroup(state, item)
    } else {
      state.localGroups.push(item)
    }
    state.syncState = 'pending'
    debug('local_group_enqueued', {
      sheetId,
      kind: item.kind,
      size: item.operations.length,
      pendingGroups: state.localGroups.length
    })
    traceDiag(
      'sheet_queue_local_enqueued',
      {
        sheetId,
        kind: item.kind,
        operationCount: item.operations.length,
        pendingGroups: state.localGroups.length,
        fastPath: isFastPathLocalPersistKind(item.kind)
      },
      { traceId: item.traceId }
    )
    // Atomic boundaries do not wait on coalesce window.
    if (item.kind !== 'cellValue') {
      cancelCoalesceTimer(state)
      state.coalesceFirstScheduledAt = null
      // Promote owned cells to scheduled-ish (we don't have a distinct state besides pending).
      scheduleLocalFlushIfPossible(state)
      return
    }
    // cellValue: open / extend coalesce window unless persist-ready blocked.
    if (state.coalesceFirstScheduledAt == null) {
      state.coalesceFirstScheduledAt = now()
    }
    setCellStatesBulk(state, item.ownedCellKeys, 'scheduled')
    armCoalesceTimer(state)
  }

  // -------------------------------------------------------------------------
  // Force flush (Guard C)
  // -------------------------------------------------------------------------

  const forceFlush: SheetWorkQueueApi['forceFlush'] = async sheetId => {
    if (disposed) return ['nothing_to_flush']
    const state = sheets.get(sheetId)
    if (!state) return ['nothing_to_flush']
    cancelCoalesceTimer(state)
    state.coalesceFirstScheduledAt = null
    if (state.localGroups.length === 0) return ['nothing_to_flush']
    debug('force_flush_start', { sheetId, pendingGroups: state.localGroups.length })
    const results: ForceFlushGroupResult[] = []
    while (state.localGroups.length > 0) {
      const group = state.localGroups[0]
      if (!group) break
      const ready = persistReadyForGroup(state, group.kind)
      if (!ready.ready) {
        debug('force_flush_blocked_by_remote', { sheetId, reason: ready.reason, kind: group.kind })
        // Remaining groups (including this one) stay queued; surface
        // blocked_by_remote per remaining group so callers can decide whether
        // to wait for remote completion or fall back to journaling.
        for (let i = 0; i < state.localGroups.length; i += 1) {
          results.push('blocked_by_remote')
        }
        return results
      }
      const before = state.localGroups.length
      const submitOutcomes: Array<'submitted' | 'failed' | 'parked'> = []
      try {
        setCellStatesBulk(state, group.ownedCellKeys, 'submitting')
        state.localGroups.shift()
        await chainForLocalPersistKind(
          deps,
          group.kind
        )(async () => {
          submitOutcomes.push(await submitGroup(state, group))
        })
        const outcome = submitOutcomes[0] ?? 'parked'
        if (outcome === 'submitted') {
          results.push('flushed')
          debug('force_flush_group_flushed', { sheetId, kind: group.kind })
        } else if (outcome === 'failed') {
          results.push('failed')
          debug('force_flush_failed', { sheetId, kind: group.kind })
        } else {
          // Parked on version mismatch — surface as blocked_by_remote since
          // recovery requires a remote-driven version advance.
          results.push('blocked_by_remote')
          debug('force_flush_blocked_by_remote', { sheetId, reason: 'version_mismatch' })
        }
      } catch (error) {
        results.push('failed')
        debug('force_flush_failed', {
          sheetId,
          kind: group.kind,
          error: error instanceof Error ? error.message : String(error)
        })
      }
      // If queue couldn't make progress (parked → unshifted), stop to avoid spin.
      if (state.localGroups.length >= before) break
    }
    return results
  }

  const forceFlushAll: SheetWorkQueueApi['forceFlushAll'] = async () => {
    const bySheet: Record<string, ForceFlushGroupResult[]> = {}
    for (const sheetId of Array.from(sheets.keys())) {
      bySheet[sheetId] = await forceFlush(sheetId)
    }
    return { bySheet }
  }

  // -------------------------------------------------------------------------
  // Idle wait
  // -------------------------------------------------------------------------

  const awaitIdle: SheetWorkQueueApi['awaitIdle'] = sheetId => {
    const state = ensureSheet(sheetId)
    if (
      state.localGroups.length === 0 &&
      state.coalesceTimer == null &&
      state.remotePending.length === 0 &&
      state.remoteInFlight.size === 0 &&
      state.remoteAwaitingSignals.size === 0
    ) {
      return Promise.resolve()
    }
    return new Promise<void>(resolve => {
      state.idleWaiters.push(resolve)
    })
  }

  // -------------------------------------------------------------------------
  // Debug
  // -------------------------------------------------------------------------

  const getDebugState: SheetWorkQueueApi['getDebugState'] = sheetId => {
    const state = ensureSheet(sheetId)
    const counts: Partial<Record<QueueCellOwnershipState, number>> = {}
    for (const entry of state.cellOwnership.values()) {
      counts[entry.state] = (counts[entry.state] ?? 0) + 1
    }
    const oldest = state.localGroups[0]
    const oldestWaitMs = oldest ? Math.max(LOCAL_OLDEST_WAIT_NONE, now() - oldest.enqueuedAt) : LOCAL_OLDEST_WAIT_NONE
    return {
      sheetId,
      remotePending: state.remotePending.length,
      remoteInFlight: state.remoteInFlight.size,
      localPending: state.localGroups.length,
      localOldestWaitMs: oldestWaitMs,
      coalesceWindowOpen: state.coalesceTimer != null,
      pendingGroupCount: state.localGroups.length,
      lastFlushGroupKind: state.lastFlushGroupKind,
      lastFlushGroupSize: state.lastFlushGroupSize,
      lastBaseVersion: state.lastBaseVersion,
      queueClientAppliedVersion: state.queueClientAppliedVersion,
      lastSubmittedVersion: state.lastSubmittedVersion,
      lastNewVersion: state.lastNewVersion,
      lastWaitReason: state.lastWaitReason,
      lastRetryCount: state.lastRetryCount,
      activeRemoteJobs: [
        ...state.remoteInFlight.values(),
        ...state.remoteAwaitingSignals.values(),
        ...state.remotePending
      ],
      cellOwnershipCounts: counts,
      syncState: state.syncState
    }
  }

  // -------------------------------------------------------------------------
  // Disposal
  // -------------------------------------------------------------------------

  const dispose = (): void => {
    disposed = true
    for (const state of sheets.values()) {
      cancelCoalesceTimer(state)
      for (const entry of state.cellOwnership.values()) {
        if (entry.ttlHandle != null) clearTimeoutFn(entry.ttlHandle)
      }
      state.cellOwnership.clear()
      state.idleWaiters = []
    }
    pendingRemoteExecutors.clear()
  }

  return {
    enqueueRemoteApply,
    enqueueLocalPersist,
    forceFlush,
    forceFlushAll,
    awaitIdle,
    getQueueCellState: (sheetId, cellKey) => getCellState(sheetId, cellKey),
    isQueueOwnedCell: (sheetId, cellKey) => {
      const s = getCellState(sheetId, cellKey)
      return s === 'pending' || s === 'scheduled' || s === 'submitting'
    },
    getDebugState,
    dispose
  }
}
