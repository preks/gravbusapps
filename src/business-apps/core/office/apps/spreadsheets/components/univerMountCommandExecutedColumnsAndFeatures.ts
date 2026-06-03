import { createSpreadsheetTraceId } from '../services/spreadsheetDiagnostics'
import { resolveClearAllRanges } from './univerGridRangeSelection'
import { UNIVER_COMMAND_TYPE_COMMAND, UNIVER_COMMAND_TYPE_MUTATION } from './univerGridUniverConstants'
import {
  cloneJsonRecord,
  featureRangesToVisibilityRanges,
  getCellRangeMoveMutation,
  getFreezePanesMutation,
  getColumnInsertDirection,
  getColumnMoveMutation,
  getColumnMutationRange,
  getRowMoveMutation,
  getRowInsertDirection,
  getRowMutationRange,
  isNativeCellRangeMoveCommand,
  isNativeColumnDeleteCommand,
  isNativeColumnInsertCommand,
  isNativeColumnMoveCommand,
  isNativeFreezePanesCommand,
  isNativeRowDeleteCommand,
  isNativeRowInsertCommand,
  isNativeRowMoveCommand,
  resolveSpreadsheetFeatureOperationType,
  resolveVisibilityAxis,
  resolveVisibilityHidden
} from './univerGridWorkbookMutationModule'
import { isUnsupportedSnapshotOnlyCollaborationCommand } from './snapshotTriggerUtils'
import type { UniverGridController } from './useUniverGridController'
import { registerMergeGestureSuppress } from '../utils/spreadsheetMergeGestureSuppress'
import {
  cutPasteCollabSuppressionDurationMs,
  isNativeCutPasteCommand,
  resolveCutPasteCellRangeMove
} from '../utils/spreadsheetCutPasteMove'

type CommandParams =
  | {
      cellValue?: unknown
      range?:
        | { startRow: number; endRow: number; startColumn: number; endColumn: number }
        | Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
      ranges?: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
      fromRange?:
        | { startRow: number; endRow: number; startColumn: number; endColumn: number }
        | Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }>
      sourceRange?: { startRow: number; endRow: number; startColumn: number; endColumn: number }
      sheetId?: string
      subUnitId?: string
      startRow?: number
      endRow?: number
      targetRow?: number
      destinationStartRow?: number
      toStartRow?: number
      destinationRow?: number
      startColumn?: number
      endColumn?: number
      targetColumn?: number
      destinationStartColumn?: number
      toStartColumn?: number
      destinationColumn?: number
      toRange?: { startRow: number; endRow: number; startColumn: number; endColumn: number }
      targetRange?: { startRow: number; endRow: number; startColumn: number; endColumn: number }
      from?: { row?: number; column?: number } | null
      to?: { row?: number; column?: number } | null
      direction?: unknown
      insertDirection?: unknown
    }
  | undefined

type ColumnFeatureRefs = Pick<
  UniverGridController,
  | 'univerAPIRef'
  | 'propsRef'
  | 'callbacksRef'
  | 'lastFeatureEmitAtBySignatureRef'
  | 'pendingFreezeClearEmitTimeoutBySheetRef'
  | 'pendingCutCellRangeRef'
  | 'cutPasteCollabSuppressUntilMsRef'
  | 'mergeGestureSuppressBySheetRef'
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
  const {
    univerAPIRef,
    propsRef,
    callbacksRef,
    lastFeatureEmitAtBySignatureRef,
    pendingFreezeClearEmitTimeoutBySheetRef,
    pendingCutCellRangeRef,
    cutPasteCollabSuppressUntilMsRef
  } = refs
  const { t, commandId, params } = args

  const insertColHeuristic =
    t === UNIVER_COMMAND_TYPE_MUTATION &&
    commandId.includes('insert') &&
    (commandId.includes('column') || commandId.includes('col'))

  const insertRowHeuristic =
    t === UNIVER_COMMAND_TYPE_MUTATION &&
    commandId.includes('insert') &&
    (commandId.includes('row') || commandId.includes('rows'))

  const moveColHeuristic =
    t === UNIVER_COMMAND_TYPE_MUTATION &&
    (commandId.includes('move') || commandId.includes('drag')) &&
    (commandId.includes('column') || commandId.includes('columns') || commandId.includes('col'))

  const moveRowHeuristic =
    t === UNIVER_COMMAND_TYPE_MUTATION &&
    (commandId.includes('move') || commandId.includes('drag')) &&
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

  if (moveColHeuristic && !isNativeColumnMoveCommand(commandId)) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_column_move_command_id_unmatched',
      severity: 'info',
      sheetId: propsRef.current.sheet.id,
      payload: { commandId, commandType: t, reason: 'move+col heuristic did not pass isNativeColumnMoveCommand' }
    })
  }

  if (moveRowHeuristic && !isNativeRowMoveCommand(commandId)) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_row_move_command_id_unmatched',
      severity: 'info',
      sheetId: propsRef.current.sheet.id,
      payload: { commandId, commandType: t, reason: 'move+row heuristic did not pass isNativeRowMoveCommand' }
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
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeColumnMoveCommand(commandId)) {
    const move = getColumnMoveMutation((params ?? {}) as Parameters<typeof getColumnMoveMutation>[0])
    const hasOnColumnsMove = typeof callbacksRef.current.onColumnsMove === 'function'
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_column_move_native_command',
      severity: move && hasOnColumnsMove ? 'info' : 'warning',
      sheetId: propsRef.current.sheet.id,
      payload: {
        commandId,
        commandType: t,
        hasOnColumnsMove,
        hasMove: Boolean(move),
        params: cloneJsonRecord(params),
        ...(move
          ? {
              sourceStartColumn: move.sourceStartColumn,
              sourceEndColumn: move.sourceEndColumn,
              destinationStartColumn: move.destinationStartColumn,
              count: move.sourceEndColumn - move.sourceStartColumn + 1
            }
          : {})
      }
    })
    if (move) {
      callbacksRef.current.onColumnsMove?.(
        move.sourceStartColumn,
        move.sourceEndColumn - move.sourceStartColumn + 1,
        move.destinationStartColumn
      )
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
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeRowDeleteCommand(commandId)) {
    const range = getRowMutationRange(params ?? {})
    if (range) {
      callbacksRef.current.onRowsDelete?.(range.startRow, range.endRow - range.startRow + 1)
    }
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeRowMoveCommand(commandId)) {
    const move = getRowMoveMutation((params ?? {}) as Parameters<typeof getRowMoveMutation>[0])
    const hasOnRowsMove = typeof callbacksRef.current.onRowsMove === 'function'
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_row_move_native_command',
      severity: move && hasOnRowsMove ? 'info' : 'warning',
      sheetId: propsRef.current.sheet.id,
      payload: {
        commandId,
        commandType: t,
        hasOnRowsMove,
        hasMove: Boolean(move),
        params: cloneJsonRecord(params),
        ...(move
          ? {
              sourceStartRow: move.sourceStartRow,
              sourceEndRow: move.sourceEndRow,
              destinationStartRow: move.destinationStartRow,
              count: move.sourceEndRow - move.sourceStartRow + 1
            }
          : {})
      }
    })
    if (move) {
      callbacksRef.current.onRowsMove?.(
        move.sourceStartRow,
        move.sourceEndRow - move.sourceStartRow + 1,
        move.destinationStartRow
      )
    }
  } else if (
    (t === UNIVER_COMMAND_TYPE_MUTATION || t === UNIVER_COMMAND_TYPE_COMMAND) &&
    isNativeCutPasteCommand(commandId)
  ) {
    const targetSheetId =
      (typeof params?.subUnitId === 'string' && params.subUnitId) ||
      (typeof params?.sheetId === 'string' && params.sheetId) ||
      propsRef.current.sheet.id
    const workbook = univerAPIRef.current?.getActiveWorkbook?.()
    const move = resolveCutPasteCellRangeMove({
      commandParams: (params ?? {}) as Parameters<typeof resolveCutPasteCellRangeMove>[0]['commandParams'],
      pendingCut: pendingCutCellRangeRef.current,
      activeSheetId: targetSheetId,
      workbook
    })
    const hasOnCellRangeMove = typeof callbacksRef.current.onCellRangeMove === 'function'
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_cut_paste_native_command',
      severity: move && hasOnCellRangeMove ? 'info' : 'warning',
      sheetId: propsRef.current.sheet.id,
      payload: {
        commandId,
        commandType: t,
        hasOnCellRangeMove,
        hasMove: Boolean(move),
        fromRange: move?.fromRange,
        toRange: move?.toRange
      }
    })
    if (move && hasOnCellRangeMove) {
      const dedupKey = `${targetSheetId}|move_cell_range|${move.fromRange.startRow},${move.fromRange.endRow},${move.fromRange.startColumn},${move.fromRange.endColumn}->${move.toRange.startRow},${move.toRange.endRow},${move.toRange.startColumn},${move.toRange.endColumn}`
      const emitNow = Date.now()
      const lastEmitAt = lastFeatureEmitAtBySignatureRef.current.get(dedupKey) ?? 0
      const shouldEmit = emitNow - lastEmitAt >= 1000
      if (shouldEmit) {
        lastFeatureEmitAtBySignatureRef.current.set(dedupKey, emitNow)
        callbacksRef.current.onCellRangeMove?.(move.fromRange, move.toRange)
        cutPasteCollabSuppressUntilMsRef.current = emitNow + cutPasteCollabSuppressionDurationMs()
        pendingCutCellRangeRef.current = null
      }
    }
  } else if (
    (t === UNIVER_COMMAND_TYPE_MUTATION || t === UNIVER_COMMAND_TYPE_COMMAND) &&
    isNativeCellRangeMoveCommand(commandId)
  ) {
    const move = getCellRangeMoveMutation((params ?? {}) as Parameters<typeof getCellRangeMoveMutation>[0])
    const hasOnCellRangeMove = typeof callbacksRef.current.onCellRangeMove === 'function'
    if (move) {
      const targetSheetId =
        (typeof params?.subUnitId === 'string' && params.subUnitId) ||
        (typeof params?.sheetId === 'string' && params.sheetId) ||
        propsRef.current.sheet.id
      const dedupKey = `${targetSheetId}|move_cell_range|${move.fromRange.startRow},${move.fromRange.endRow},${move.fromRange.startColumn},${move.fromRange.endColumn}->${move.toRange.startRow},${move.toRange.endRow},${move.toRange.startColumn},${move.toRange.endColumn}`
      const emitNow = Date.now()
      const lastEmitAt = lastFeatureEmitAtBySignatureRef.current.get(dedupKey) ?? 0
      const shouldEmit = emitNow - lastEmitAt >= 1000
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_cell_range_move_native_command',
        severity: hasOnCellRangeMove ? 'info' : 'warning',
        sheetId: propsRef.current.sheet.id,
        payload: {
          commandId,
          commandType: t,
          hasOnCellRangeMove,
          deduped: !shouldEmit,
          fromRange: move.fromRange,
          toRange: move.toRange
        }
      })
      if (shouldEmit) {
        lastFeatureEmitAtBySignatureRef.current.set(dedupKey, emitNow)
        if (lastFeatureEmitAtBySignatureRef.current.size > 64) {
          for (const [key, timestamp] of lastFeatureEmitAtBySignatureRef.current) {
            if (emitNow - timestamp > 5000) lastFeatureEmitAtBySignatureRef.current.delete(key)
          }
        }
        callbacksRef.current.onCellRangeMove?.(move.fromRange, move.toRange)
      }
    } else {
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_cell_range_move_command_id_unmatched',
        severity: 'warning',
        sheetId: propsRef.current.sheet.id,
        payload: { commandId, commandType: t, params: cloneJsonRecord(params) }
      })
    }
  }
  if (
    (t === UNIVER_COMMAND_TYPE_MUTATION || t === UNIVER_COMMAND_TYPE_COMMAND) &&
    isNativeFreezePanesCommand(commandId)
  ) {
    const targetSheetId =
      (typeof params?.subUnitId === 'string' && params.subUnitId) ||
      (typeof params?.sheetId === 'string' && params.sheetId) ||
      propsRef.current.sheet.id
    const paramsClone = cloneJsonRecord(params)
    const ranges = resolveClearAllRanges(
      univerAPIRef.current?.getActiveWorkbook?.(),
      params as { ranges?: unknown[]; range?: unknown | unknown[] } | undefined
    )
    const freeze = getFreezePanesMutation(commandId, params ?? {}, ranges)
    if (!freeze) {
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_freeze_panes_command_id_unmatched',
        severity: 'warning',
        sheetId: propsRef.current.sheet.id,
        payload: { commandId, commandType: t, params: paramsClone, rangeCount: ranges.length }
      })
      return
    }
    const isFreezeClear = 'cleared' in freeze
    const traceId = createSpreadsheetTraceId('grid_freeze_panes')
    const dedupKey = isFreezeClear
      ? `${targetSheetId}|freeze_panes|cleared`
      : `${targetSheetId}|freeze_panes|${freeze.startRow},${freeze.startColumn},${freeze.ySplit},${freeze.xSplit}`
    const data: Record<string, unknown> = {
      sheetId: targetSheetId,
      commandId,
      ...(paramsClone ? { params: paramsClone } : {}),
      ...(isFreezeClear
        ? { cleared: true }
        : {
            xSplit: freeze.xSplit,
            ySplit: freeze.ySplit,
            startRow: freeze.startRow,
            startColumn: freeze.startColumn,
            ...(freeze.range ? { range: freeze.range } : {})
          })
    }
    const emitFreezeOperation = () => {
      const emitNow = Date.now()
      const lastEmitAt = lastFeatureEmitAtBySignatureRef.current.get(dedupKey) ?? 0
      const shouldEmit = emitNow - lastEmitAt >= 1000
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_freeze_panes_native_command',
        severity: shouldEmit ? 'info' : 'warning',
        traceId,
        sheetId: propsRef.current.sheet.id,
        payload: {
          commandId,
          commandType: t,
          deduped: !shouldEmit,
          targetSheetId,
          freeze
        }
      })
      if (!shouldEmit) return
      lastFeatureEmitAtBySignatureRef.current.set(dedupKey, emitNow)
      if (lastFeatureEmitAtBySignatureRef.current.size > 64) {
        for (const [key, timestamp] of lastFeatureEmitAtBySignatureRef.current) {
          if (emitNow - timestamp > 5000) lastFeatureEmitAtBySignatureRef.current.delete(key)
        }
      }
      propsRef.current.onMutationBatchOp?.({
        sheetId: targetSheetId,
        traceId,
        operations: [
          {
            type: 'freeze_panes',
            data
          }
        ]
      })
    }
    const pendingClearTimeout = pendingFreezeClearEmitTimeoutBySheetRef.current.get(targetSheetId)
    if (!isFreezeClear && pendingClearTimeout) {
      clearTimeout(pendingClearTimeout)
      pendingFreezeClearEmitTimeoutBySheetRef.current.delete(targetSheetId)
    }
    if (isFreezeClear) {
      if (pendingClearTimeout) {
        clearTimeout(pendingClearTimeout)
      }
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_freeze_panes_clear_queued',
        severity: 'info',
        traceId,
        sheetId: propsRef.current.sheet.id,
        payload: {
          commandId,
          commandType: t,
          targetSheetId
        }
      })
      const timeoutId = setTimeout(() => {
        pendingFreezeClearEmitTimeoutBySheetRef.current.delete(targetSheetId)
        emitFreezeOperation()
      }, 75)
      pendingFreezeClearEmitTimeoutBySheetRef.current.set(targetSheetId, timeoutId)
      return
    }
    emitFreezeOperation()
    return
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
  if (featureOperationType === 'merge_ranges' && ranges.length > 0) {
    registerMergeGestureSuppress(refs.mergeGestureSuppressBySheetRef, targetSheetId, ranges)
  }
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
