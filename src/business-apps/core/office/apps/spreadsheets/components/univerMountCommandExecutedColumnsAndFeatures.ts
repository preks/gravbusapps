import { createSpreadsheetTraceId } from '../services/spreadsheetDiagnostics'
import { resolveClearAllRanges } from './univerGridRangeSelection'
import { UNIVER_COMMAND_TYPE_MUTATION } from './univerGridUniverConstants'
import {
  cloneJsonRecord,
  featureRangesToVisibilityRanges,
  getColumnInsertDirection,
  getColumnMutationRange,
  getRowInsertDirection,
  getRowMutationRange,
  isNativeColumnDeleteCommand,
  isNativeColumnInsertCommand,
  isNativeRowInsertCommand,
  resolveSpreadsheetFeatureOperationType,
  resolveVisibilityAxis,
  resolveVisibilityHidden
} from './univerGridWorkbookMutationModule'
import { isUnsupportedSnapshotOnlyCollaborationCommand } from './snapshotTriggerUtils'
import type { UniverGridController } from './useUniverGridController'

type CommandParams =
  | {
      cellValue?: unknown
      range?:
        | { startRow: number; endRow: number; startColumn: number; endColumn: number }
        | Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
      ranges?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
      sheetId?: string
      subUnitId?: string
      startRow?: number
      endRow?: number
      startColumn?: number
      endColumn?: number
      direction?: unknown
      insertDirection?: unknown
    }
  | undefined

type ColumnFeatureRefs = Pick<
  UniverGridController,
  'univerAPIRef' | 'propsRef' | 'callbacksRef' | 'lastFeatureEmitAtBySignatureRef'
>

function resolveVisibilityCommandRanges(params: CommandParams, axis: 'row' | 'column') {
  const directRanges = Array.isArray(params?.ranges)
    ? params.ranges
    : Array.isArray(params?.range)
      ? params.range
      : null
  if (directRanges && directRanges.length > 0) return directRanges

  if (axis === 'row' && typeof params?.startRow === 'number') {
    return [
      {
        startRow: params.startRow,
        endRow: typeof params.endRow === 'number' ? params.endRow : params.startRow,
        startColumn: 0,
        endColumn: 0
      }
    ]
  }

  if (axis === 'column' && typeof params?.startColumn === 'number') {
    return [
      {
        startRow: 0,
        endRow: 0,
        startColumn: params.startColumn,
        endColumn: typeof params.endColumn === 'number' ? params.endColumn : params.startColumn
      }
    ]
  }

  return []
}

/** Column insert/delete callbacks, unsupported-collab warning, and feature-operation mutation batch. */
export function handleCommandExecutedColumnInsertsAndFeatureOps(
  refs: ColumnFeatureRefs,
  args: {
    t: number | undefined
    commandId: string
    params: CommandParams | undefined
  }
): void {
  const { univerAPIRef, propsRef, callbacksRef, lastFeatureEmitAtBySignatureRef } = refs
  const { t, commandId, params } = args

  const insertColHeuristic =
    t === UNIVER_COMMAND_TYPE_MUTATION &&
    commandId.includes('insert') &&
    (commandId.includes('column') || commandId.includes('col'))

  const insertRowHeuristic =
    t === UNIVER_COMMAND_TYPE_MUTATION &&
    commandId.includes('insert') &&
    (commandId.includes('row') || commandId.includes('rows'))

  if (insertRowHeuristic && !isNativeRowInsertCommand(commandId)) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_row_insert_command_id_unmatched',
      severity: 'info',
      sheetId: propsRef.current.sheet.id,
      payload: {
        commandId,
        commandType: t,
        reason: 'insert+row heuristic did not pass isNativeRowInsertCommand'
      }
    })
  }

  if (insertColHeuristic && !isNativeColumnInsertCommand(commandId)) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_column_insert_command_id_unmatched',
      severity: 'info',
      sheetId: propsRef.current.sheet.id,
      payload: { commandId, commandType: t, reason: 'insert+col heuristic did not pass isNativeColumnInsertCommand' }
    })
  }

  if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeColumnInsertCommand(commandId)) {
    const range = getColumnMutationRange(params ?? {})
    const hasOnColumnsInsert = typeof callbacksRef.current.onColumnsInsert === 'function'
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_column_insert_native_command',
      severity: 'info',
      sheetId: propsRef.current.sheet.id,
      payload: {
        commandId,
        commandType: t,
        hasOnColumnsInsert,
        hasRange: Boolean(range),
        ...(range
          ? {
              startColumn: range.startColumn,
              endColumn: range.endColumn,
              count: range.endColumn - range.startColumn + 1,
              direction: getColumnInsertDirection(commandId, params ?? {})
            }
          : {})
      }
    })
    if (range) {
      callbacksRef.current.onColumnsInsert?.(
        range.startColumn,
        range.endColumn - range.startColumn + 1,
        getColumnInsertDirection(commandId, params ?? {})
      )
    }
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeColumnDeleteCommand(commandId)) {
    const range = getColumnMutationRange(params ?? {})
    if (range) {
      callbacksRef.current.onColumnsDelete?.(range.startColumn, range.endColumn)
    }
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeRowInsertCommand(commandId)) {
    const range = getRowMutationRange(params ?? {})
    const hasOnRowsInsert = typeof callbacksRef.current.onRowsInsert === 'function'
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_row_insert_native_command',
      severity: 'info',
      sheetId: propsRef.current.sheet.id,
      payload: {
        commandId,
        commandType: t,
        hasOnRowsInsert,
        hasRange: Boolean(range),
        viewerRowCount: Array.isArray(propsRef.current.data) ? propsRef.current.data.length : undefined,
        ...(range
          ? {
              startRow: range.startRow,
              endRow: range.endRow,
              count: range.endRow - range.startRow + 1,
              direction: getRowInsertDirection(commandId, params ?? {})
            }
          : {})
      }
    })
    if (range) {
      callbacksRef.current.onRowsInsert?.(
        range.startRow,
        range.endRow - range.startRow + 1,
        getRowInsertDirection(commandId, params ?? {})
      )
    }
  }
  if (isUnsupportedSnapshotOnlyCollaborationCommand(commandId)) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_unsupported_live_collab_command',
      severity: 'warning',
      payload: {
        commandId,
        reason: 'missing_granular_operation'
      }
    })
  }
  const featureOperationType = resolveSpreadsheetFeatureOperationType(commandId)
  if (!featureOperationType) return
  const targetSheetId =
    (typeof params?.subUnitId === 'string' && params.subUnitId) ||
    (typeof params?.sheetId === 'string' && params.sheetId) ||
    propsRef.current.sheet.id
  const paramsClone = cloneJsonRecord(params)
  const visibilityAxis =
    featureOperationType === 'visibility_update' ? resolveVisibilityAxis(commandId, paramsClone) : null
  const ranges =
    featureOperationType === 'visibility_update'
      ? resolveClearAllRanges(null, { ranges: resolveVisibilityCommandRanges(params, visibilityAxis ?? 'column') })
      : resolveClearAllRanges(
          univerAPIRef.current?.getActiveWorkbook?.(),
          params as { ranges?: unknown[]; range?: unknown | unknown[] } | undefined
        )
  if (featureOperationType === 'visibility_update' && ranges.length === 0) return
  const traceId = createSpreadsheetTraceId(`grid_${featureOperationType}`)
  const dedupKey = `${targetSheetId}|${featureOperationType}|${JSON.stringify(paramsClone ?? ranges)}`
  const emitNow = Date.now()
  const lastEmitAt = lastFeatureEmitAtBySignatureRef.current.get(dedupKey) ?? 0
  const shouldEmitFeatureOperation = emitNow - lastEmitAt >= 1000
  if (!shouldEmitFeatureOperation) return
  lastFeatureEmitAtBySignatureRef.current.set(dedupKey, emitNow)
  if (lastFeatureEmitAtBySignatureRef.current.size > 64) {
    for (const [key, timestamp] of lastFeatureEmitAtBySignatureRef.current) {
      if (emitNow - timestamp > 5000) lastFeatureEmitAtBySignatureRef.current.delete(key)
    }
  }
  const data: Record<string, unknown> = {
    sheetId: targetSheetId,
    commandId,
    ...(paramsClone ? { params: paramsClone } : {})
  }
  if (
    featureOperationType === 'merge_ranges' ||
    featureOperationType === 'unmerge_ranges' ||
    featureOperationType === 'protect_ranges_update'
  ) {
    data.ranges = ranges
  } else if (featureOperationType === 'visibility_update') {
    const axis = visibilityAxis ?? 'column'
    data.axis = axis
    data.hidden = resolveVisibilityHidden(commandId, paramsClone)
    data.ranges = featureRangesToVisibilityRanges(ranges, axis)
  } else if (featureOperationType === 'filter_update' || featureOperationType === 'filter_clear') {
    data.range = ranges[0] ?? null
  }
  propsRef.current.onMutationBatchOp?.({
    sheetId: targetSheetId,
    traceId,
    operations: [
      {
        type: featureOperationType,
        data
      }
    ]
  })
  callbacksRef.current.onDiagnosticsTraceEvent?.({
    source: 'client',
    stage: 'grid_feature_operation_emit',
    traceId,
    payload: {
      commandId,
      targetSheetId,
      operationType: featureOperationType,
      rangeCount: ranges.length
    }
  })
}
