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
import type { UniverGridController } from './useUniverGridController'

export const EMIT_LITERAL_FALLBACK_KEY = '__active_worksheet__'

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

export type RegisterUniverMountSheetValueAndEditListenersDeps = Pick<
  UniverGridController,
  'readOnlyRef' | 'isApplyingRemoteUpdateRef' | 'collabPersistedBulkApplyDepthRef' | 'univerAPIRef' | 'callbacksRef'
> & {
  univerAPI: ReturnType<typeof createUniver>['univerAPI']
  handleDetectedCellMutation: (args: {
    source: 'sheet-value-changed' | 'command-executed' | 'selection-reconcile' | 'sheet-edit-ended'
    commandId?: string
    payloadCellValue: SheetCellMatrix | undefined
    ranges: SheetRangeShape[]
    worksheetId?: string | null
    preserveUndefinedAsNull?: boolean
  }) => boolean | Promise<boolean>
  reconcileSingleCell: (
    row: number | undefined,
    col: number | undefined,
    source: 'selection-reconcile' | 'sheet-edit-ended',
    worksheetId?: string | null
  ) => void
}

export type RegisterUniverMountSheetValueAndEditListenersHandles = {
  valueChangeDisposable: { dispose(): void } | undefined
  sheetEditEndedDisposable: { dispose(): void } | undefined
}

export function registerUniverMountSheetValueAndEditListeners(
  deps: RegisterUniverMountSheetValueAndEditListenersDeps
): RegisterUniverMountSheetValueAndEditListenersHandles {
  const {
    univerAPI,
    readOnlyRef,
    isApplyingRemoteUpdateRef,
    collabPersistedBulkApplyDepthRef,
    univerAPIRef,
    callbacksRef,
    handleDetectedCellMutation,
    reconcileSingleCell
  } = deps

  /**
   * Per-worksheet promise tail. Serializes calls to handleDetectedCellMutation so the post-flush
   * remap+submit region inside emit dispatch never races with another concurrent emit on the same
   * sheet. Without this, on a slow network, N parallel SheetValueChanged events can land all N
   * emits at the post-flush snapshot read simultaneously and lose cells whose row hasn't been
   * materialized in the snapshot they happened to read.
   */
  const emitTailByWorksheetId = new Map<string, Promise<void>>()

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
    // Avoid re-entry while remote apply writes into Univer (prevents echo / duplicate persist).
    if (isApplyingRemoteUpdateRef.current || collabPersistedBulkApplyDepthRef.current > 0) {
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
    const previous = emitTailByWorksheetId.get(tailKey) ?? Promise.resolve()
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const result = handleDetectedCellMutation({
          source: 'sheet-value-changed',
          commandId,
          payloadCellValue: cellValue,
          ranges: mutationRanges,
          worksheetId,
          preserveUndefinedAsNull
        })
        if (result && typeof (result as Promise<boolean>).then === 'function') {
          await (result as Promise<boolean>).catch(() => undefined)
        }
      })
    emitTailByWorksheetId.set(tailKey, next)
    void next.finally(() => {
      if (emitTailByWorksheetId.get(tailKey) === next) {
        emitTailByWorksheetId.delete(tailKey)
      }
    })
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
    reconcileSingleCell(row, col, 'sheet-edit-ended', params?.subUnitId ?? params?.sheetId ?? null)
  })

  return { valueChangeDisposable, sheetEditEndedDisposable }
}
