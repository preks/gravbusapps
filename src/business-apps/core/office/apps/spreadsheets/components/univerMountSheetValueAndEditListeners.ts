import type { MutableRefObject } from 'react'
import { createUniver } from '@univerjs/presets'
import {
  computeOccupiedBoundingRange,
  countOccupiedCellsInSheetMatrix,
  intersectSheetRangeShapes,
  normalizeCellMatrix,
  overlayExplicitMutationCellsOntoDerived,
  sheetRangeDeclaredArea,
  type SheetCellMatrix,
  type SheetRangeShape
} from './cellMatrixUtils'
import {
  buildShouldSuppressRemoteEcho,
  cellMatrixHasAnyNonSuppressedCell
} from './univerMountHandleDetectedCellMutationRemoteEcho'
import type { RemoteEchoSuppressionEntry } from './univerGridInternalTypes'
import {
  isClearLikeMutationCommand,
  isCurrentFacadeWorksheet,
  isImplicitClearLikeSetRangeMutation
} from './univerGridWorkbookMutationModule'
import {
  compareCommandKindWithLegacy,
  getCommandKind,
  setCommandClassificationTelemetryEmitter
} from './univerCommandClassification'
import { deriveCellMatrixFromRanges } from '../utils/univerWorksheetCellRead'
import type { HandleDetectedCellMutationArgs } from './univerMountHandleDetectedCellMutation.types'
import type { MutationEmitTailCoordinator } from './univerMutationEmitTailCoordinator'
import type { UniverGridController } from './useUniverGridController'

export const EMIT_LITERAL_FALLBACK_KEY = '__active_worksheet__'

async function awaitDetectedCellMutationResult(result: boolean | Promise<boolean> | undefined): Promise<boolean> {
  if (result != null && typeof (result as Promise<boolean>).then === 'function') {
    return (result as Promise<boolean>).catch(() => false)
  }
  return Boolean(result)
}

async function runDetectedCellMutationThroughCoordinator(
  coordinator: MutationEmitTailCoordinator,
  tailKey: string,
  handleDetectedCellMutation: RegisterUniverMountSheetValueAndEditListenersDeps['handleDetectedCellMutation'],
  args: HandleDetectedCellMutationArgs
): Promise<boolean> {
  let handled = false
  await coordinator.enqueue(tailKey, async () => {
    handled = await awaitDetectedCellMutationResult(handleDetectedCellMutation(args))
  })
  return handled
}

/**
 * 1e: Resolve a stable logical worksheet key for emit serialization in this priority order:
 *   1. worksheetId from the event payload
 *   2. worksheetId from the worksheet/facade object associated with the event
 *   3. active sheet id captured at event time
 *   4. active sheet id resolved at handling time
 *   5. literal fallback key (warned + telemetered) only as a last resort
 *
 * The same logical worksheet must produce the same serialization key even when one event
 * carries an explicit id and another does not. Without this, two emits on the same sheet can
 * land on different keys and skip serialization, re-opening the post-flush race.
 */
export function resolveEmitSerializationKey(
  payloadWorksheetId: string | null | undefined,
  facadeWorksheetId: string | null | undefined,
  activeWorksheetIdAtEventTime: string | null | undefined,
  activeWorksheetIdAtHandlingTime: string | null | undefined
): { key: string; usedLiteralFallback: boolean } {
  const candidate =
    (typeof payloadWorksheetId === 'string' && payloadWorksheetId) ||
    (typeof facadeWorksheetId === 'string' && facadeWorksheetId) ||
    (typeof activeWorksheetIdAtEventTime === 'string' && activeWorksheetIdAtEventTime) ||
    (typeof activeWorksheetIdAtHandlingTime === 'string' && activeWorksheetIdAtHandlingTime) ||
    ''
  if (candidate) return { key: candidate, usedLiteralFallback: false }
  return { key: EMIT_LITERAL_FALLBACK_KEY, usedLiteralFallback: true }
}

export type DeferredDirtyCell = {
  row: number
  col: number
  worksheetId: string | null
}

export function isRemoteApplyGuardActive(
  isApplyingRemoteUpdateRef: MutableRefObject<boolean>,
  collabPersistedBulkApplyDepthRef: MutableRefObject<number>
): boolean {
  return isApplyingRemoteUpdateRef.current || collabPersistedBulkApplyDepthRef.current > 0
}

export const DEFERRED_LOCAL_CELL_FLUSH_POLL_MS = 100
/**
 * Poll interval while a remote apply guard is held (catch-up bulk drain etc.). Slower than the
 * `DEFERRED_LOCAL_CELL_FLUSH_POLL_MS` baseline so we don't churn the timer thread during long
 * one-shot drains. The first post-guard tick still arrives within `DEFERRED_LOCAL_CELL_FLUSH_POLL_MS`
 * once the guard clears (we drop back to the baseline interval on each iteration).
 */
export const DEFERRED_LOCAL_CELL_FLUSH_POLL_MS_GUARD_ACTIVE = 500
/**
 * Force-reconcile deferred local edits even if remote apply guard is still held (main-thread
 * starvation safety valve). Raised from the prior 8s so a realistic catch-up / authoritative
 * re-sync backlog drain (which can run ~30–45s for ~2k cells) finishes naturally instead of
 * having `flushDeferredDirtyCells` fire `reconcileSingleCell` over many cells mid-drain
 * (observed as a ~1.8s `poll` hitch in production traces).
 */
export const DEFERRED_LOCAL_CELL_FORCE_FLUSH_MS = 60_000

export function markDeferredDirtyCellsFromCellMatrix(
  deferredDirtyCells: Map<string, DeferredDirtyCell>,
  cellValue: SheetCellMatrix,
  worksheetId: string | null,
  fallbackWorksheetId: string | null
): void {
  const sheetKey = worksheetId ?? fallbackWorksheetId ?? EMIT_LITERAL_FALLBACK_KEY
  for (const rowKey of Object.keys(cellValue)) {
    const row = Number(rowKey)
    if (Number.isNaN(row)) continue
    const rowCells = cellValue[row]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      const col = Number(colKey)
      if (Number.isNaN(col)) continue
      deferredDirtyCells.set(`${sheetKey}:${row}:${col}`, {
        row,
        col,
        worksheetId: worksheetId ?? fallbackWorksheetId
      })
    }
  }
}

/**
 * Queue cells for post-remote-apply reconciliation. Only non-echo cells are
 * queued — remote peer writes that match `remoteEchoSuppressionRef` must not
 * be reconciled (that path runs `getWorkbookSnapshot` / full workbook clone
 * per cell). When the mutation carries a sparse `cellValue` matrix, only
 * those coordinates are queued; we no longer expand the full `ranges`
 * rectangle (dense `setValues` used to mark every cell in the bbox).
 */
export function markDeferredDirtyCellsFromMutation(
  deferredDirtyCells: Map<string, DeferredDirtyCell>,
  ranges: SheetRangeShape[],
  cellValue: SheetCellMatrix,
  worksheetId: string | null,
  fallbackWorksheetId: string | null,
  remoteEchoSuppressionRef?: MutableRefObject<Map<string, RemoteEchoSuppressionEntry>>
): void {
  const matrixRowKeys = Object.keys(cellValue)
  if (matrixRowKeys.length > 0) {
    const now = Date.now()
    const shouldSuppress = remoteEchoSuppressionRef
      ? buildShouldSuppressRemoteEcho({ remoteEchoSuppressionRef }, now)
      : () => false
    const sheetKey = worksheetId ?? fallbackWorksheetId ?? EMIT_LITERAL_FALLBACK_KEY
    for (const rowKey of matrixRowKeys) {
      const row = Number(rowKey)
      if (Number.isNaN(row)) continue
      const rowCells = cellValue[row]
      if (!rowCells || typeof rowCells !== 'object') continue
      for (const colKey of Object.keys(rowCells)) {
        const col = Number(colKey)
        if (Number.isNaN(col)) continue
        const cell = rowCells[col]
        if (remoteEchoSuppressionRef && shouldSuppress(row, col, cell)) {
          continue
        }
        deferredDirtyCells.set(`${sheetKey}:${row}:${col}`, {
          row,
          col,
          worksheetId: worksheetId ?? fallbackWorksheetId
        })
      }
    }
    return
  }
  if (ranges.length > 0) {
    markDeferredDirtyCellsFromRanges(deferredDirtyCells, ranges, worksheetId, fallbackWorksheetId)
  }
}

export function markDeferredDirtyCellsFromRanges(
  deferredDirtyCells: Map<string, DeferredDirtyCell>,
  ranges: SheetRangeShape[],
  worksheetId: string | null,
  fallbackWorksheetId: string | null
): void {
  const sheetKey = worksheetId ?? fallbackWorksheetId ?? EMIT_LITERAL_FALLBACK_KEY
  for (const range of ranges) {
    for (let row = range.startRow; row <= range.endRow; row += 1) {
      for (let col = range.startColumn; col <= range.endColumn; col += 1) {
        deferredDirtyCells.set(`${sheetKey}:${row}:${col}`, {
          row,
          col,
          worksheetId: worksheetId ?? fallbackWorksheetId
        })
      }
    }
  }
}

export function shouldScheduleDeferredLocalCellFlush(
  guardActive: boolean,
  deferredFirstMarkedAt: number | null,
  now: number,
  forceFlushMs = DEFERRED_LOCAL_CELL_FORCE_FLUSH_MS
): boolean {
  if (!guardActive) return true
  if (deferredFirstMarkedAt == null) return false
  return now - deferredFirstMarkedAt >= forceFlushMs
}

/**
 * Drop deferred-dirty-cell entries that fall inside a region a remote bulk apply just painted.
 * Cells queued during the bulk in the same region are by definition echoes of the bulk write
 * (true local edits target different cells) and reconciling them later costs an expensive
 * `reconcileSingleCell` per coordinate after the apply guard drops.
 *
 * Local edits outside the bulk region are left intact so the deferred flush still picks them up.
 */
export function clearDeferredDirtyCellsInRegion(
  deferredDirtyCells: Map<string, DeferredDirtyCell>,
  worksheetId: string | null,
  region: { minRow: number; maxRow: number; minCol: number; maxCol: number }
): number {
  if (deferredDirtyCells.size === 0) return 0
  if (
    !Number.isFinite(region.minRow) ||
    !Number.isFinite(region.maxRow) ||
    !Number.isFinite(region.minCol) ||
    !Number.isFinite(region.maxCol) ||
    region.maxRow < region.minRow ||
    region.maxCol < region.minCol
  ) {
    return 0
  }
  const sheetKey = worksheetId ?? EMIT_LITERAL_FALLBACK_KEY
  let cleared = 0
  for (const [key, cell] of deferredDirtyCells) {
    const cellSheetKey = cell.worksheetId ?? EMIT_LITERAL_FALLBACK_KEY
    if (cellSheetKey !== sheetKey) continue
    if (cell.row < region.minRow || cell.row > region.maxRow || cell.col < region.minCol || cell.col > region.maxCol) {
      continue
    }
    deferredDirtyCells.delete(key)
    cleared += 1
  }
  return cleared
}

export function shouldDropRemoteEchoDuringApplyGuard(
  cellValue: SheetCellMatrix,
  remoteEchoSuppressionRef: MutableRefObject<Map<string, RemoteEchoSuppressionEntry>>,
  now = Date.now()
): boolean {
  const shouldSuppress = buildShouldSuppressRemoteEcho({ remoteEchoSuppressionRef }, now)
  return !cellMatrixHasAnyNonSuppressedCell(cellValue, shouldSuppress, 0, 0)
}

export type RegisterUniverMountSheetValueAndEditListenersDeps = Pick<
  UniverGridController,
  | 'readOnlyRef'
  | 'isApplyingRemoteUpdateRef'
  | 'collabPersistedBulkApplyDepthRef'
  | 'remoteEchoSuppressionRef'
  | 'univerAPIRef'
  | 'callbacksRef'
  | 'propsRef'
> & {
  univerAPI: ReturnType<typeof createUniver>['univerAPI']
  handleDetectedCellMutation: (args: HandleDetectedCellMutationArgs) => boolean | Promise<boolean>
  mutationEmitTailCoordinator: MutationEmitTailCoordinator
  /** Read-only reconcile for deferred remote replay cells (awaits emit tail internally). */
  reconcileDeferredSingleCell: (row: number, col: number, worksheetId?: string | null) => void
}

export type RegisterUniverMountSheetValueAndEditListenersHandles = {
  valueChangeDisposable: { dispose(): void } | undefined
  sheetEditEndedDisposable: { dispose(): void } | undefined
  /**
   * Drop deferred reconcile entries that fall inside the region a remote bulk apply just
   * painted. The bulk-apply hot path calls this once per `finishBulkApplyOnce` so the
   * post-guard `flushDeferredDirtyCells` doesn't fan out per-cell `reconcileSingleCell` over
   * coordinates that already match what the bulk wrote.
   */
  clearDeferredDirtyCellsInRegion: (
    worksheetId: string | null,
    region: { minRow: number; maxRow: number; minCol: number; maxCol: number }
  ) => number
}

export function registerUniverMountSheetValueAndEditListeners(
  deps: RegisterUniverMountSheetValueAndEditListenersDeps
): RegisterUniverMountSheetValueAndEditListenersHandles {
  const {
    univerAPI,
    readOnlyRef,
    isApplyingRemoteUpdateRef,
    collabPersistedBulkApplyDepthRef,
    remoteEchoSuppressionRef,
    univerAPIRef,
    callbacksRef,
    propsRef,
    handleDetectedCellMutation,
    mutationEmitTailCoordinator,
    reconcileDeferredSingleCell
  } = deps

  const deferredDirtyCells = new Map<string, DeferredDirtyCell>()
  let deferredFirstMarkedAt: number | null = null
  let deferredFlushTimer: ReturnType<typeof setTimeout> | null = null

  const flushDeferredDirtyCells = (): void => {
    if (deferredDirtyCells.size === 0) {
      deferredFirstMarkedAt = null
      return
    }
    const cells = Array.from(deferredDirtyCells.values())
    deferredDirtyCells.clear()
    deferredFirstMarkedAt = null
    for (const cell of cells) {
      reconcileDeferredSingleCell(cell.row, cell.col, cell.worksheetId)
    }
    void propsRef.current.flushPendingCellChangesRef?.current?.()
  }

  const scheduleDeferredFlushWhenGuardClears = (): void => {
    if (deferredFirstMarkedAt == null) {
      deferredFirstMarkedAt = Date.now()
    }
    if (deferredFlushTimer != null) return

    const poll = (): void => {
      deferredFlushTimer = null
      if (deferredDirtyCells.size === 0) {
        deferredFirstMarkedAt = null
        return
      }
      const guardActive = isRemoteApplyGuardActive(isApplyingRemoteUpdateRef, collabPersistedBulkApplyDepthRef)
      if (shouldScheduleDeferredLocalCellFlush(guardActive, deferredFirstMarkedAt, Date.now())) {
        flushDeferredDirtyCells()
        return
      }
      // Back off polling while the remote apply guard is still held to avoid timer churn during
      // long catch-up backlog drains. The first iteration after the guard clears immediately
      // drops back to the baseline interval.
      deferredFlushTimer = globalThis.setTimeout(
        poll,
        guardActive ? DEFERRED_LOCAL_CELL_FLUSH_POLL_MS_GUARD_ACTIVE : DEFERRED_LOCAL_CELL_FLUSH_POLL_MS
      )
    }

    deferredFlushTimer = globalThis.setTimeout(poll, DEFERRED_LOCAL_CELL_FLUSH_POLL_MS)
  }

  // 3a/3e: route command-classification mismatch + unknown telemetry through the host's
  // diagnostics callback so we can spot ids missing from the registry during the one-release
  // migration window. The emitter is module-scoped; setting it from here is sufficient because
  // every spreadsheet mount runs through this listener registration.
  setCommandClassificationTelemetryEmitter((event, payload) => {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: event,
      severity: event === 'spreadsheet.command_classification.legacy_mismatch' ? 'warning' : 'info',
      payload: { ...payload }
    })
  })

  // Rate-limit literal-fallback telemetry so we don't spam diagnostics if the active sheet is
  // genuinely unresolvable for an extended period.
  const LITERAL_FALLBACK_WARN_INTERVAL_MS = 60_000
  let lastLiteralFallbackWarnAt = 0

  const reportLiteralFallback = (commandId: string): void => {
    const now = Date.now()
    if (now - lastLiteralFallbackWarnAt >= LITERAL_FALLBACK_WARN_INTERVAL_MS) {
      lastLiteralFallbackWarnAt = now
      console.warn(
        '[SPREADSHEET_PERSIST] sheet_value_listener: literal_worksheet_key_fallback used; emit serialization may degrade across worksheets',
        { commandId }
      )
    }
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'spreadsheet.cell_emit.literal_worksheet_key_fallback',
      severity: 'warning',
      payload: { commandId, fallbackKey: EMIT_LITERAL_FALLBACK_KEY }
    })
  }

  const eventKey =
    (univerAPI as { Event?: { SheetValueChanged?: string } }).Event?.SheetValueChanged ?? 'SheetValueChanged'
  const valueChangeDisposable = (
    univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
  ).addEvent?.(eventKey, (rawParams: unknown) => {
    if (readOnlyRef.current) {
      return
    }
    const params = rawParams as {
      effectedRanges?: Array<{
        getRange?: () => { startRow: number; endRow: number; startColumn: number; endColumn: number }
      }>
      payload?: {
        id?: string
        params?: {
          cellValue?: Record<number, Record<number, { v?: unknown }>>
          range?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
          sheetId?: string
          subUnitId?: string
        }
      }
      sheetId?: string
      subUnitId?: string
    }
    const payload = params?.payload
    const payloadParams = payload?.params
    const worksheetId =
      payloadParams?.subUnitId ?? payloadParams?.sheetId ?? params?.subUnitId ?? params?.sheetId ?? null
    let cellValue = normalizeCellMatrix(payload?.params?.cellValue)
    let mutationRanges = (payload?.params?.range ??
      params.effectedRanges?.map(r => r.getRange?.()).filter(Boolean) ??
      []) as SheetRangeShape[]
    // We must compute `preserveUndefinedAsNull` BEFORE the bounding-box clip below so we can
    // skip clipping for clear-like commands (3c). Otherwise a deliberate wide clear with only
    // a few `{v: null}` cells would have its declared range narrowed and the clear would be
    // partial. The legacy classifiers (`isClearLikeMutationCommand`,
    // `isImplicitClearLikeSetRangeMutation`) and the 3a registry both contribute.
    const commandId = String(payload?.id ?? '')
    compareCommandKindWithLegacy(commandId, 'sheet_value_listener_preserve_undefined_as_null')
    const registryClassifiedAsClearLike = getCommandKind(commandId) === 'clearLike'
    const preserveUndefinedAsNull =
      registryClassifiedAsClearLike ||
      isClearLikeMutationCommand(commandId) ||
      isImplicitClearLikeSetRangeMutation({
        commandId,
        ranges: mutationRanges,
        payloadCellValue: cellValue
      })
    // 3c: skip range-clipping when the command is clear-like. The bounding-box optimization is
    // only safe for value emissions; for clears, the declared range is the user's intent and
    // narrowing it would silently drop the wide clear that lives outside the occupied bbox.
    if (!preserveUndefinedAsNull && mutationRanges.length === 1 && cellValue) {
      const declared = mutationRanges[0]
      const bboxSparse = computeOccupiedBoundingRange(cellValue)
      if (bboxSparse) {
        const area = sheetRangeDeclaredArea(declared)
        const occupied = countOccupiedCellsInSheetMatrix(cellValue)
        if (occupied > 0 && area > occupied * 2) {
          const clipped = intersectSheetRangeShapes(declared, bboxSparse)
          if (clipped) mutationRanges = [clipped]
        }
      }
    }
    const workbook = univerAPIRef.current?.getActiveWorkbook()
    const activeWorksheet = workbook?.getActiveSheet()
    // Snapshot the active worksheet id at event time so the serialization key remains stable
    // even if the active worksheet changes between event arrival and handling-time resolution.
    const activeWorksheetIdAtEventTime =
      typeof (activeWorksheet as { getSheetId?: () => string } | undefined)?.getSheetId === 'function'
        ? (activeWorksheet as { getSheetId: () => string }).getSheetId()
        : null
    const worksheet =
      worksheetId && typeof workbook?.getSheetBySheetId === 'function'
        ? (workbook.getSheetBySheetId(worksheetId) ?? activeWorksheet)
        : activeWorksheet
    const facadeWorksheetId =
      typeof (worksheet as { getSheetId?: () => string } | undefined)?.getSheetId === 'function'
        ? (worksheet as { getSheetId: () => string }).getSheetId()
        : null
    const currentWorksheet =
      isCurrentFacadeWorksheet(activeWorksheet, worksheet, worksheetId) &&
      worksheet &&
      typeof (worksheet as { getRange?: unknown }).getRange === 'function'
        ? worksheet
        : undefined
    const explicitCellMatrixSnapshot = cellValue
    if (preserveUndefinedAsNull) {
      cellValue = overlayExplicitMutationCellsOntoDerived(
        deriveCellMatrixFromRanges(currentWorksheet, mutationRanges, 10000, true),
        explicitCellMatrixSnapshot
      )
    } else if (!cellValue) {
      cellValue = deriveCellMatrixFromRanges(currentWorksheet, mutationRanges)
    }
    if (!cellValue) {
      return
    }

    if (isRemoteApplyGuardActive(isApplyingRemoteUpdateRef, collabPersistedBulkApplyDepthRef)) {
      if (shouldDropRemoteEchoDuringApplyGuard(cellValue, remoteEchoSuppressionRef)) {
        return
      }
      markDeferredDirtyCellsFromMutation(
        deferredDirtyCells,
        mutationRanges,
        cellValue,
        worksheetId,
        activeWorksheetIdAtEventTime,
        remoteEchoSuppressionRef
      )
      scheduleDeferredFlushWhenGuardClears()
      return
    }

    const activeWorksheetIdAtHandlingTime = (() => {
      const wb = univerAPIRef.current?.getActiveWorkbook()
      const aw = wb?.getActiveSheet() as { getSheetId?: () => string } | undefined
      return typeof aw?.getSheetId === 'function' ? aw.getSheetId() : null
    })()
    const { key: tailKey, usedLiteralFallback } = resolveEmitSerializationKey(
      worksheetId,
      facadeWorksheetId,
      activeWorksheetIdAtEventTime,
      activeWorksheetIdAtHandlingTime
    )
    if (usedLiteralFallback) reportLiteralFallback(commandId)
    void runDetectedCellMutationThroughCoordinator(mutationEmitTailCoordinator, tailKey, handleDetectedCellMutation, {
      source: 'sheet-value-changed',
      commandId,
      payloadCellValue: cellValue,
      ranges: mutationRanges,
      worksheetId,
      preserveUndefinedAsNull
    }).catch(() => undefined)
  })

  const sheetEditEndedEventKey =
    (univerAPI as { Event?: { SheetEditEnded?: string } }).Event?.SheetEditEnded ?? 'SheetEditEnded'
  const sheetEditEndedDisposable = (
    univerAPI as { addEvent?(event: string, cb: (p: unknown) => void): { dispose(): void } }
  ).addEvent?.(sheetEditEndedEventKey, (rawParams: unknown) => {
    if (readOnlyRef.current) return
    const params = rawParams as
      | {
          row?: number
          col?: number
          startRow?: number
          startColumn?: number
          cell?: { row?: number; col?: number; actualRow?: number; actualColumn?: number }
          range?: { startRow?: number; startColumn?: number }
          sheetId?: string
          subUnitId?: string
        }
      | undefined
    const cell = params?.cell
    const range = params?.range
    const row = cell?.actualRow ?? cell?.row ?? params?.row ?? params?.startRow ?? range?.startRow
    const col = cell?.actualColumn ?? cell?.col ?? params?.col ?? params?.startColumn ?? range?.startColumn
    const worksheetId = params?.subUnitId ?? params?.sheetId ?? null
    if (typeof row !== 'number' || typeof col !== 'number') {
      flushDeferredDirtyCells()
      return
    }

    const workbook = univerAPIRef.current?.getActiveWorkbook()
    const activeWorksheet = workbook?.getActiveSheet()
    const activeWorksheetIdAtEventTime =
      typeof (activeWorksheet as { getSheetId?: () => string } | undefined)?.getSheetId === 'function'
        ? (activeWorksheet as { getSheetId: () => string }).getSheetId()
        : null
    const activeWorksheetIdAtHandlingTime = (() => {
      const wb = univerAPIRef.current?.getActiveWorkbook()
      const aw = wb?.getActiveSheet() as { getSheetId?: () => string } | undefined
      return typeof aw?.getSheetId === 'function' ? aw.getSheetId() : null
    })()
    const { key: tailKey, usedLiteralFallback } = resolveEmitSerializationKey(
      worksheetId,
      worksheetId,
      activeWorksheetIdAtEventTime,
      activeWorksheetIdAtHandlingTime
    )
    if (usedLiteralFallback) reportLiteralFallback('sheet-edit-ended')

    void (async () => {
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_sheet_edit_ended_commit_started',
        payload: {
          worksheetId,
          row,
          col,
          tailKey
        }
      })
      const handled = await runDetectedCellMutationThroughCoordinator(
        mutationEmitTailCoordinator,
        tailKey,
        handleDetectedCellMutation,
        {
          source: 'sheet-edit-ended',
          payloadCellValue: undefined,
          ranges: [
            {
              startRow: row,
              endRow: row,
              startColumn: col,
              endColumn: col
            }
          ],
          worksheetId
        }
      )
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: handled ? 'grid_sheet_edit_ended_commit_finished' : 'grid_sheet_edit_ended_commit_noop',
        payload: {
          worksheetId,
          row,
          col,
          handled
        }
      })
      flushDeferredDirtyCells()
    })().catch(() => undefined)
  })

  return {
    valueChangeDisposable,
    sheetEditEndedDisposable,
    clearDeferredDirtyCellsInRegion: (worksheetId, region) =>
      clearDeferredDirtyCellsInRegion(deferredDirtyCells, worksheetId, region)
  }
}
