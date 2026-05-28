import type {
  ForceAuthoritativeGridReapplyOptions,
  SpreadsheetBulkRemoteApplyMeta,
  SpreadsheetBulkRemoteCellItem,
  SpreadsheetRemoteClearAllRangePayload,
  SpreadsheetRemoteClearFormatRangePayload,
  SpreadsheetRemoteFeatureOperationPayload,
  SpreadsheetStylePatch
} from './SpreadsheetCollaborationContract'
import type {
  SpreadsheetCommittedBatchEnvelope,
  SpreadsheetCommittedOperation
} from './spreadsheetCommittedDeltaContract'
import type { SpreadsheetRemoteTransactionPlan } from './spreadsheetRemoteTransaction'

export type UniverRemoteTransactionRunResult =
  | { ok: true; appliedCellCount: number; appliedOperationCount: number }
  | {
      ok: false
      reason: 'missing_runner_callback' | 'unsupported_runner_operation' | 'runner_apply_failed'
      detail: string
    }

export interface UniverRemoteTransactionRunnerCallbacks {
  applyRemoteCellUpdate?: (
    rowIndex: number,
    colIndex: number,
    value: unknown,
    rowId?: string,
    options?: SpreadsheetBulkRemoteCellItem['options']
  ) => void
  applyRemoteCellUpdatesBulk?: (items: SpreadsheetBulkRemoteCellItem[], meta?: SpreadsheetBulkRemoteApplyMeta) => void
  applyRemoteClearAllRange?: (
    payload: SpreadsheetRemoteClearAllRangePayload,
    meta?: SpreadsheetBulkRemoteApplyMeta
  ) => void
  applyRemoteClearFormatRange?: (
    payload: SpreadsheetRemoteClearFormatRangePayload,
    meta?: SpreadsheetBulkRemoteApplyMeta
  ) => void
  applyRemoteSpreadsheetFeatureOperation?: (
    payload: SpreadsheetRemoteFeatureOperationPayload,
    meta?: SpreadsheetBulkRemoteApplyMeta
  ) => void
  forceGridReapply?: (
    sheetId: string,
    region?: import('../utils/spreadsheetAuthoritativeRegion').AuthoritativeGridReapplyTarget,
    options?: ForceAuthoritativeGridReapplyOptions
  ) => void
  runWithRemoteApplyGuard?: <T>(apply: () => T) => T
}

const RUNNER_STRUCTURAL_ROW_OPS = new Set(['insert_row_slots', 'delete_row_slots', 'move_row_slots', 'move_cell_range'])
const RUNNER_STRUCTURAL_COLUMN_OPS = new Set(['column_add', 'column_delete', 'columns_reorder', 'column_reorder'])
/**
 * Row materialization / deletion applied via session projection and collaboration-manager grid sync
 * after the runner completes (same lifecycle as insert_row_slots live hooks).
 */
const RUNNER_DEFERRED_ROW_PERSISTENCE_OPS = new Set([
  'add_rows',
  'insert_rows_at',
  'row_add',
  'row_delete',
  'delete_rows'
])
/** Applied via onRemoteColumnUpdate / applyRemoteDimensions after the runner completes. */
const RUNNER_METADATA_ONLY_OPS = new Set(['column_update', 'set_col_width', 'set_row_height'])
/** Applied via SpreadsheetCollaborationManager live feature hooks after the runner completes. */
const RUNNER_DEFERRED_LIVE_FEATURE_OPS = new Set(['visibility_update', 'freeze_panes'])

const toNumberOrNull = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

const getMeta = (
  batch: SpreadsheetCommittedBatchEnvelope,
  operation: SpreadsheetCommittedOperation
): SpreadsheetBulkRemoteApplyMeta => ({
  traceSessionId: batch.traceSessionId,
  traceId: batch.traceId,
  batchId: batch.batchId,
  operationType: operation.type
})

const normalizeCellItems = (
  batch: SpreadsheetCommittedBatchEnvelope,
  operation: SpreadsheetCommittedOperation,
  options?: SpreadsheetBulkRemoteCellItem['options']
): SpreadsheetBulkRemoteCellItem[] => {
  const data = operation.data
  if (operation.type === 'set_cell' || operation.type === 'clear_cell') {
    const rowIndex = toNumberOrNull(data.row) ?? toNumberOrNull(data.rowIndex)
    const colIndex = toNumberOrNull(data.col) ?? toNumberOrNull(data.colIndex)
    if (rowIndex == null || colIndex == null) return []
    return [
      {
        rowIndex,
        colIndex,
        value: operation.type === 'clear_cell' ? null : data.value,
        rowId: typeof data.rowId === 'string' ? data.rowId : undefined,
        options: {
          ...options,
          targetSheetId: batch.sheetId,
          diagnosticTraceSessionId: batch.traceSessionId,
          diagnosticTraceId: batch.traceId,
          diagnosticBatchId: batch.batchId,
          diagnosticOperationType: operation.type
        }
      }
    ]
  }
  if (operation.type !== 'set_range') return []
  const cells = Array.isArray(data.cells) ? (data.cells as Array<Record<string, unknown>>) : []
  return cells
    .map(cell => {
      const rowIndex = toNumberOrNull(cell.row) ?? toNumberOrNull(cell.rowIndex)
      const colIndex = toNumberOrNull(cell.col) ?? toNumberOrNull(cell.colIndex)
      if (rowIndex == null || colIndex == null) return null
      return {
        rowIndex,
        colIndex,
        value: Object.prototype.hasOwnProperty.call(cell, 'value') ? cell.value : null,
        rowId: typeof cell.rowId === 'string' ? cell.rowId : undefined,
        options: {
          ...options,
          targetSheetId: batch.sheetId,
          diagnosticTraceSessionId: batch.traceSessionId,
          diagnosticTraceId: batch.traceId,
          diagnosticBatchId: batch.batchId,
          diagnosticOperationType: operation.type
        }
      }
    })
    .filter((item): item is SpreadsheetBulkRemoteCellItem => item != null)
}

const normalizeStyleItems = (
  batch: SpreadsheetCommittedBatchEnvelope,
  operation: SpreadsheetCommittedOperation
): SpreadsheetBulkRemoteCellItem[] => {
  if (operation.type !== 'set_style') return []
  const data = operation.data
  const cells = Array.isArray(data.cells) ? (data.cells as Array<Record<string, unknown>>) : []
  const univerStyles = data.styles && typeof data.styles === 'object' ? (data.styles as Record<string, unknown>) : null
  return cells
    .map(cell => {
      const rowIndex = toNumberOrNull(cell.row) ?? toNumberOrNull(cell.rowIndex)
      const colIndex = toNumberOrNull(cell.col) ?? toNumberOrNull(cell.colIndex)
      if (rowIndex == null || colIndex == null) return null
      return {
        rowIndex,
        colIndex,
        value: undefined,
        options: {
          stylePatch:
            cell.stylePatch && typeof cell.stylePatch === 'object' ? (cell.stylePatch as SpreadsheetStylePatch) : null,
          univerStyles,
          targetSheetId: batch.sheetId,
          useSenderA1Row: true,
          diagnosticTraceSessionId: batch.traceSessionId,
          diagnosticTraceId: batch.traceId,
          diagnosticBatchId: batch.batchId,
          diagnosticOperationType: operation.type
        }
      }
    })
    .filter((item): item is SpreadsheetBulkRemoteCellItem => item != null)
}

export class UniverRemoteTransactionRunner {
  constructor(private readonly callbacks: UniverRemoteTransactionRunnerCallbacks) {}

  run(plan: Extract<SpreadsheetRemoteTransactionPlan, { ok: true }>): UniverRemoteTransactionRunResult {
    const execute = (): UniverRemoteTransactionRunResult => this.applyBatch(plan.batch)
    return this.callbacks.runWithRemoteApplyGuard ? this.callbacks.runWithRemoteApplyGuard(execute) : execute()
  }

  private static readonly PERSISTED_CELL_OP_TYPES = new Set(['set_cell', 'set_range', 'clear_cell'])

  private applyBatch(batch: SpreadsheetCommittedBatchEnvelope): UniverRemoteTransactionRunResult {
    let appliedCellCount = 0
    let appliedOperationCount = 0
    try {
      const hasPersistedCellOps = batch.operations.some(operation =>
        UniverRemoteTransactionRunner.PERSISTED_CELL_OP_TYPES.has(operation.type)
      )
      const deferredStyleOps = hasPersistedCellOps
        ? batch.operations.filter(operation => operation.type === 'set_style')
        : []
      const immediateOps = hasPersistedCellOps
        ? batch.operations.filter(operation => operation.type !== 'set_style')
        : batch.operations

      const flushDeferredStyles = (): UniverRemoteTransactionRunResult | null => {
        for (const styleOperation of deferredStyleOps) {
          const styleResult = this.applyOperation(batch, styleOperation)
          if (!styleResult.ok) return styleResult
          appliedCellCount += styleResult.appliedCellCount
          appliedOperationCount += 1
        }
        return null
      }

      const cellOps = immediateOps.filter(operation =>
        UniverRemoteTransactionRunner.PERSISTED_CELL_OP_TYPES.has(operation.type)
      )
      let cellOpsApplied = 0

      for (const operation of immediateOps) {
        const isPersistedCellOp = UniverRemoteTransactionRunner.PERSISTED_CELL_OP_TYPES.has(operation.type)
        const isLastCellOpBeforeStyles =
          deferredStyleOps.length > 0 && isPersistedCellOp && ++cellOpsApplied === cellOps.length
        const result = this.applyOperation(batch, operation, isLastCellOpBeforeStyles ? flushDeferredStyles : undefined)
        if (!result.ok) return result
        appliedCellCount += result.appliedCellCount
        appliedOperationCount += 1
      }

      if (deferredStyleOps.length > 0 && cellOps.length === 0) {
        const styleOnlyResult = flushDeferredStyles()
        if (styleOnlyResult) return styleOnlyResult
      }

      return { ok: true, appliedCellCount, appliedOperationCount }
    } catch (error) {
      return {
        ok: false,
        reason: 'runner_apply_failed',
        detail: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private applyOperation(
    batch: SpreadsheetCommittedBatchEnvelope,
    operation: SpreadsheetCommittedOperation,
    onPersistedCellBulkComplete?: () => UniverRemoteTransactionRunResult | null
  ): UniverRemoteTransactionRunResult {
    if (operation.type === 'set_cell' || operation.type === 'set_range' || operation.type === 'clear_cell') {
      const items = normalizeCellItems(batch, operation)
      if (items.length === 0) return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
      if (this.callbacks.applyRemoteCellUpdatesBulk) {
        const meta = getMeta(batch, operation)
        if (onPersistedCellBulkComplete) {
          meta.onApplyComplete = () => {
            const deferredResult = onPersistedCellBulkComplete()
            if (deferredResult && !deferredResult.ok) {
              throw new Error(`${deferredResult.reason}:${deferredResult.detail}`)
            }
          }
        }
        this.callbacks.applyRemoteCellUpdatesBulk(items, meta)
      } else if (this.callbacks.applyRemoteCellUpdate) {
        for (const item of items) {
          this.callbacks.applyRemoteCellUpdate(item.rowIndex, item.colIndex, item.value, item.rowId, item.options)
        }
        if (onPersistedCellBulkComplete) {
          const deferredResult = onPersistedCellBulkComplete()
          if (deferredResult && !deferredResult.ok) return deferredResult
        }
      } else {
        return { ok: false, reason: 'missing_runner_callback', detail: 'applyRemoteCellUpdate' }
      }
      return { ok: true, appliedCellCount: items.length, appliedOperationCount: 1 }
    }

    if (operation.type === 'set_style') {
      const items = normalizeStyleItems(batch, operation)
      if (items.length === 0) return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
      if (this.callbacks.applyRemoteCellUpdatesBulk) {
        this.callbacks.applyRemoteCellUpdatesBulk(items, getMeta(batch, operation))
      } else if (this.callbacks.applyRemoteCellUpdate) {
        for (const item of items) {
          this.callbacks.applyRemoteCellUpdate(item.rowIndex, item.colIndex, item.value, item.rowId, item.options)
        }
      } else {
        return { ok: false, reason: 'missing_runner_callback', detail: 'applyRemoteCellUpdate' }
      }
      return { ok: true, appliedCellCount: items.length, appliedOperationCount: 1 }
    }

    if (operation.type === 'clear_all') {
      if (!this.callbacks.applyRemoteClearAllRange) {
        return { ok: false, reason: 'missing_runner_callback', detail: 'applyRemoteClearAllRange' }
      }
      this.callbacks.applyRemoteClearAllRange(
        operation.data as unknown as SpreadsheetRemoteClearAllRangePayload,
        getMeta(batch, operation)
      )
      return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
    }

    if (operation.type === 'clear_format') {
      if (!this.callbacks.applyRemoteClearFormatRange) {
        return { ok: false, reason: 'missing_runner_callback', detail: 'applyRemoteClearFormatRange' }
      }
      this.callbacks.applyRemoteClearFormatRange(
        operation.data as unknown as SpreadsheetRemoteClearFormatRangePayload,
        getMeta(batch, operation)
      )
      return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
    }

    if (operation.type === 'merge_ranges' || operation.type === 'unmerge_ranges') {
      if (!this.callbacks.applyRemoteSpreadsheetFeatureOperation) {
        return { ok: false, reason: 'missing_runner_callback', detail: 'applyRemoteSpreadsheetFeatureOperation' }
      }
      this.callbacks.applyRemoteSpreadsheetFeatureOperation(
        {
          type: operation.type,
          data: operation.data as SpreadsheetRemoteFeatureOperationPayload['data']
        },
        getMeta(batch, operation)
      )
      return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
    }

    if (RUNNER_STRUCTURAL_ROW_OPS.has(operation.type) || RUNNER_STRUCTURAL_COLUMN_OPS.has(operation.type)) {
      return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
    }

    if (RUNNER_DEFERRED_ROW_PERSISTENCE_OPS.has(operation.type)) {
      return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
    }

    if (RUNNER_METADATA_ONLY_OPS.has(operation.type)) {
      return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
    }

    if (RUNNER_DEFERRED_LIVE_FEATURE_OPS.has(operation.type)) {
      return { ok: true, appliedCellCount: 0, appliedOperationCount: 1 }
    }

    return { ok: false, reason: 'unsupported_runner_operation', detail: operation.type }
  }
}
