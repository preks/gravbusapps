import { createSpreadsheetTraceId } from '../services/spreadsheetDiagnostics'
import { debugMutationTrace } from './univerGridDebug'
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
  armColumnDeleteFormulaFollowUpSuppression,
  armColumnInsertFormulaFollowUpSuppression,
  armColumnMoveFormulaFollowUpSuppression,
  isColumnInsertDerivedMergeFollowUp,
  isColumnDeleteDerivedMergeFollowUp,
  isColumnMoveDerivedMergeFollowUp,
  armMoveCellRangeFollowUpCollabSuppression,
  isRowInsertDerivedMergeFollowUp,
  isRowDeleteDerivedMergeFollowUp,
  isRowMoveDerivedMergeFollowUp,
  armRowDeleteFormulaFollowUpSuppression,
  armRowInsertFormulaFollowUpSuppression,
  armRowMoveFormulaFollowUpSuppression,
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
      trigger?: unknown
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
  | 'recentMoveCellRangeFollowUpRef'
  | 'rowInsertFormulaFollowUpSuppressUntilMsRef'
  | 'recentInsertRowFormulaFollowUpRef'
  | 'rowDeleteFormulaFollowUpSuppressUntilMsRef'
  | 'recentDeleteRowFormulaFollowUpRef'
  | 'rowMoveFormulaFollowUpSuppressUntilMsRef'
  | 'recentMoveRowFormulaFollowUpRef'
  | 'columnInsertFormulaFollowUpSuppressUntilMsRef'
  | 'recentInsertColumnFormulaFollowUpRef'
  | 'columnDeleteFormulaFollowUpSuppressUntilMsRef'
  | 'recentDeleteColumnFormulaFollowUpRef'
  | 'columnMoveFormulaFollowUpSuppressUntilMsRef'
  | 'recentMoveColumnFormulaFollowUpRef'
  | 'recentNativeColumnMoveEmitRef'
  | 'mergeGestureSuppressBySheetRef'
>

const COLUMN_MOVE_EMIT_DEDUPE_MS = 1_500
const COLUMN_DELETE_EMIT_DEDUPE_MS = 1_000

function buildNativeColumnMoveSignature(
  sheetId: string,
  move: { sourceStartColumn: number; sourceEndColumn: number; destinationStartColumn: number }
): string {
  return `${sheetId}:${move.sourceStartColumn}:${move.sourceEndColumn}:${move.destinationStartColumn}`
}

function pruneFeatureEmitDedupMap(map: Map<string, number>, now: number): void {
  if (map.size <= 64) return
  for (const [key, timestamp] of map) {
    if (now - timestamp > 5000) map.delete(key)
  }
}

function hasNativeColumnDeleteTrigger(params: CommandParams): boolean {
  return typeof params?.trigger === 'string' && isNativeColumnDeleteCommand(params.trigger)
}

function hasNativeColumnInsertTrigger(params: CommandParams): boolean {
  return typeof params?.trigger === 'string' && isNativeColumnInsertCommand(params.trigger)
}

function hasNativeColumnMoveTrigger(params: CommandParams): boolean {
  return (
    typeof params?.trigger === 'string' &&
    isNativeColumnMoveCommand(params.trigger) &&
    !isNativeColumnDeleteCommand(params.trigger) &&
    !isNativeColumnInsertCommand(params.trigger)
  )
}

function hasNativeRowInsertTrigger(params: CommandParams): boolean {
  return typeof params?.trigger === 'string' && isNativeRowInsertCommand(params.trigger)
}

function hasNativeRowDeleteTrigger(params: CommandParams): boolean {
  return typeof params?.trigger === 'string' && isNativeRowDeleteCommand(params.trigger)
}

function hasNativeRowMoveTrigger(params: CommandParams): boolean {
  return (
    typeof params?.trigger === 'string' &&
    isNativeRowMoveCommand(params.trigger) &&
    !isNativeRowDeleteCommand(params.trigger) &&
    !isNativeRowInsertCommand(params.trigger)
  )
}

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
    cutPasteCollabSuppressUntilMsRef,
    recentMoveCellRangeFollowUpRef,
    rowInsertFormulaFollowUpSuppressUntilMsRef,
    recentInsertRowFormulaFollowUpRef,
    rowDeleteFormulaFollowUpSuppressUntilMsRef,
    recentDeleteRowFormulaFollowUpRef,
    rowMoveFormulaFollowUpSuppressUntilMsRef,
    recentMoveRowFormulaFollowUpRef,
    columnInsertFormulaFollowUpSuppressUntilMsRef,
    recentInsertColumnFormulaFollowUpRef,
    columnDeleteFormulaFollowUpSuppressUntilMsRef,
    recentDeleteColumnFormulaFollowUpRef,
    columnMoveFormulaFollowUpSuppressUntilMsRef,
    recentMoveColumnFormulaFollowUpRef,
    recentNativeColumnMoveEmitRef
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
    debugMutationTrace('column-move-unmatched', { source: 'command-executed', commandId, commandType: t })
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
      const targetSheetId =
        (typeof params?.subUnitId === 'string' && params.subUnitId) ||
        (typeof params?.sheetId === 'string' && params.sheetId) ||
        propsRef.current.sheet.id
      armColumnInsertFormulaFollowUpSuppression({
        suppressionRef: columnInsertFormulaFollowUpSuppressUntilMsRef,
        recentInsertRef: recentInsertColumnFormulaFollowUpRef,
        sheetId: targetSheetId,
        insertIndex: range.startColumn,
        count: range.endColumn - range.startColumn + 1,
        direction: getColumnInsertDirection(commandId, params ?? {})
      })
      callbacksRef.current.onColumnsInsert?.(
        targetSheetId,
        range.startColumn,
        range.endColumn - range.startColumn + 1,
        getColumnInsertDirection(commandId, params ?? {})
      )
    }
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeColumnDeleteCommand(commandId)) {
    const range = getColumnMutationRange(params ?? {})
    if (range) {
      const targetSheetId =
        (typeof params?.subUnitId === 'string' && params.subUnitId) ||
        (typeof params?.sheetId === 'string' && params.sheetId) ||
        propsRef.current.sheet.id
      const dedupKey = `${targetSheetId}|column_delete|${range.startColumn}:${range.endColumn}`
      const emitNow = Date.now()
      const lastEmitAt = lastFeatureEmitAtBySignatureRef.current.get(dedupKey) ?? 0
      const shouldEmit = emitNow - lastEmitAt >= COLUMN_DELETE_EMIT_DEDUPE_MS
      callbacksRef.current.onDiagnosticsTraceEvent?.({
        source: 'client',
        stage: 'grid_column_delete_native_command',
        severity: shouldEmit ? 'info' : 'warning',
        sheetId: propsRef.current.sheet.id,
        payload: {
          commandId,
          commandType: t,
          targetSheetId,
          startColumn: range.startColumn,
          endColumn: range.endColumn,
          count: range.endColumn - range.startColumn + 1,
          deduped: !shouldEmit
        }
      })
      if (!shouldEmit) return
      lastFeatureEmitAtBySignatureRef.current.set(dedupKey, emitNow)
      pruneFeatureEmitDedupMap(lastFeatureEmitAtBySignatureRef.current, emitNow)
      armColumnDeleteFormulaFollowUpSuppression({
        suppressionRef: columnDeleteFormulaFollowUpSuppressUntilMsRef,
        recentDeleteRef: recentDeleteColumnFormulaFollowUpRef,
        sheetId: targetSheetId,
        deleteStartColumn: range.startColumn
      })
      callbacksRef.current.onColumnsDelete?.(targetSheetId, range.startColumn, range.endColumn)
    }
  } else if (isNativeColumnMoveCommand(commandId)) {
    const move = getColumnMoveMutation((params ?? {}) as Parameters<typeof getColumnMoveMutation>[0])
    const hasOnColumnsMove = typeof callbacksRef.current.onColumnsMove === 'function'
    debugMutationTrace('column-move-detected', {
      source: 'command-executed',
      commandId,
      commandType: t,
      hasMove: Boolean(move),
      hasOnColumnsMove,
      ...(move
        ? {
            sourceStartColumn: move.sourceStartColumn,
            sourceEndColumn: move.sourceEndColumn,
            destinationStartColumn: move.destinationStartColumn
          }
        : {})
    })
    const targetSheetId =
      (typeof params?.subUnitId === 'string' && params.subUnitId) ||
      (typeof params?.sheetId === 'string' && params.sheetId) ||
      propsRef.current.sheet.id
    const signature = move ? buildNativeColumnMoveSignature(targetSheetId, move) : null
    const previousEmit = recentNativeColumnMoveEmitRef.current
    const dedupedFromBeforeCommand = Boolean(
      move &&
        signature &&
        previousEmit &&
        previousEmit.signature === signature &&
        Date.now() - previousEmit.emittedAt <= COLUMN_MOVE_EMIT_DEDUPE_MS
    )
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
        dedupedFromBeforeCommand,
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
    if (move && signature && !dedupedFromBeforeCommand) {
      armColumnMoveFormulaFollowUpSuppression({
        suppressionRef: columnMoveFormulaFollowUpSuppressUntilMsRef,
        recentMoveRef: recentMoveColumnFormulaFollowUpRef,
        sheetId: targetSheetId,
        moves: [
          {
            sourceStartIndex: move.sourceStartColumn,
            count: move.sourceEndColumn - move.sourceStartColumn + 1,
            destinationStartIndex: move.destinationStartColumn
          }
        ]
      })
      recentNativeColumnMoveEmitRef.current = { signature, emittedAt: Date.now() }
      callbacksRef.current.onColumnsMove?.(
        targetSheetId,
        move.sourceStartColumn,
        move.sourceEndColumn - move.sourceStartColumn + 1,
        move.destinationStartColumn
      )
    }
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeRowInsertCommand(commandId)) {
    const range = getRowMutationRange(params ?? {})
    const hasOnRowsInsert = typeof callbacksRef.current.onRowsInsert === 'function'
    const targetSheetId =
      (typeof params?.subUnitId === 'string' && params.subUnitId) ||
      (typeof params?.sheetId === 'string' && params.sheetId) ||
      propsRef.current.sheet.id
    const direction = getRowInsertDirection(commandId, params ?? {})
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
              direction
            }
          : {})
      }
    })
    if (range) {
      armRowInsertFormulaFollowUpSuppression({
        suppressionRef: rowInsertFormulaFollowUpSuppressUntilMsRef,
        recentInsertRef: recentInsertRowFormulaFollowUpRef,
        sheetId: targetSheetId,
        insertIndex: range.startRow,
        count: range.endRow - range.startRow + 1,
        direction
      })
      callbacksRef.current.onRowsInsert?.(targetSheetId, range.startRow, range.endRow - range.startRow + 1, direction)
    }
  } else if (t === UNIVER_COMMAND_TYPE_MUTATION && isNativeRowDeleteCommand(commandId)) {
    const range = getRowMutationRange(params ?? {})
    if (range) {
      const targetSheetId =
        (typeof params?.subUnitId === 'string' && params.subUnitId) ||
        (typeof params?.sheetId === 'string' && params.sheetId) ||
        propsRef.current.sheet.id
      armRowDeleteFormulaFollowUpSuppression({
        suppressionRef: rowDeleteFormulaFollowUpSuppressUntilMsRef,
        recentDeleteRef: recentDeleteRowFormulaFollowUpRef,
        sheetId: targetSheetId,
        deleteStartRow: range.startRow,
        count: range.endRow - range.startRow + 1
      })
      callbacksRef.current.onRowsDelete?.(targetSheetId, range.startRow, range.endRow - range.startRow + 1)
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
      const targetSheetId =
        (typeof params?.subUnitId === 'string' && params.subUnitId) ||
        (typeof params?.sheetId === 'string' && params.sheetId) ||
        propsRef.current.sheet.id
      armRowMoveFormulaFollowUpSuppression({
        suppressionRef: rowMoveFormulaFollowUpSuppressUntilMsRef,
        recentMoveRef: recentMoveRowFormulaFollowUpRef,
        sheetId: targetSheetId,
        sourceStartRow: move.sourceStartRow,
        count: move.sourceEndRow - move.sourceStartRow + 1,
        destinationStartRow: move.destinationStartRow
      })
      callbacksRef.current.onRowsMove?.(
        targetSheetId,
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
        callbacksRef.current.onCellRangeMove?.(targetSheetId, move.fromRange, move.toRange)
        armMoveCellRangeFollowUpCollabSuppression({
          suppressionRef: cutPasteCollabSuppressUntilMsRef,
          recentMoveRef: recentMoveCellRangeFollowUpRef,
          sheetId: targetSheetId,
          fromRange: move.fromRange,
          toRange: move.toRange,
          now: emitNow
        })
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
        callbacksRef.current.onCellRangeMove?.(targetSheetId, move.fromRange, move.toRange)
        armMoveCellRangeFollowUpCollabSuppression({
          suppressionRef: cutPasteCollabSuppressUntilMsRef,
          recentMoveRef: recentMoveCellRangeFollowUpRef,
          sheetId: targetSheetId,
          fromRange: move.fromRange,
          toRange: move.toRange,
          now: emitNow
        })
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
  const suppressMoveDerivedMergeFeatureOperation =
    (featureOperationType === 'merge_ranges' || featureOperationType === 'unmerge_ranges') &&
    (hasNativeColumnMoveTrigger(params) ||
      hasNativeRowMoveTrigger(params) ||
      (t === UNIVER_COMMAND_TYPE_MUTATION &&
        (isColumnMoveDerivedMergeFollowUp({
          suppressUntilMs: columnMoveFormulaFollowUpSuppressUntilMsRef.current,
          worksheetId: targetSheetId,
          ranges,
          recentMove: recentMoveColumnFormulaFollowUpRef.current
        }) ||
          isRowMoveDerivedMergeFollowUp({
            suppressUntilMs: rowMoveFormulaFollowUpSuppressUntilMsRef.current,
            worksheetId: targetSheetId,
            ranges,
            recentMove: recentMoveRowFormulaFollowUpRef.current
          }))))
  const suppressInsertDerivedMergeFeatureOperation =
    (featureOperationType === 'merge_ranges' || featureOperationType === 'unmerge_ranges') &&
    (hasNativeColumnInsertTrigger(params) ||
      hasNativeRowInsertTrigger(params) ||
      (t === UNIVER_COMMAND_TYPE_MUTATION &&
        (isColumnInsertDerivedMergeFollowUp({
          suppressUntilMs: columnInsertFormulaFollowUpSuppressUntilMsRef.current,
          worksheetId: targetSheetId,
          ranges,
          recentInsert: recentInsertColumnFormulaFollowUpRef.current
        }) ||
          isRowInsertDerivedMergeFollowUp({
            suppressUntilMs: rowInsertFormulaFollowUpSuppressUntilMsRef.current,
            worksheetId: targetSheetId,
            ranges,
            recentInsert: recentInsertRowFormulaFollowUpRef.current
          }))))
  const suppressDeleteDerivedMergeFeatureOperation =
    (featureOperationType === 'merge_ranges' || featureOperationType === 'unmerge_ranges') &&
    (hasNativeColumnDeleteTrigger(params) ||
      hasNativeRowDeleteTrigger(params) ||
      isColumnDeleteDerivedMergeFollowUp({
        suppressUntilMs: columnDeleteFormulaFollowUpSuppressUntilMsRef.current,
        worksheetId: targetSheetId,
        ranges,
        recentDelete: recentDeleteColumnFormulaFollowUpRef.current
      }) ||
      isRowDeleteDerivedMergeFollowUp({
        suppressUntilMs: rowDeleteFormulaFollowUpSuppressUntilMsRef.current,
        worksheetId: targetSheetId,
        ranges,
        recentDelete: recentDeleteRowFormulaFollowUpRef.current
      }))
  if (suppressMoveDerivedMergeFeatureOperation) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_feature_operation_suppressed_move_derived_merge',
      severity: 'info',
      sheetId: targetSheetId,
      payload: {
        commandId,
        operationType: featureOperationType,
        rangeCount: ranges.length
      }
    })
    return
  }
  if (suppressInsertDerivedMergeFeatureOperation) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_feature_operation_suppressed_insert_derived_merge',
      severity: 'info',
      sheetId: targetSheetId,
      payload: {
        commandId,
        operationType: featureOperationType,
        rangeCount: ranges.length
      }
    })
    return
  }
  if (suppressDeleteDerivedMergeFeatureOperation) {
    callbacksRef.current.onDiagnosticsTraceEvent?.({
      source: 'client',
      stage: 'grid_feature_operation_suppressed_delete_derived_merge',
      severity: 'info',
      sheetId: targetSheetId,
      payload: {
        commandId,
        operationType: featureOperationType,
        rangeCount: ranges.length
      }
    })
    return
  }
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
