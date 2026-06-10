import type { SpreadsheetColumn, SpreadsheetMergeRange } from '../types/spreadsheet'

export type ColumnReorderMove = {
  sourceStartColumn: number
  count: number
  destinationStartColumn: number
  rawDestinationStartColumn?: number
}

const sortColumnsByOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  [...columns].sort((left, right) => left.order - right.order)

export const visibleColumnsInGridOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  sortColumnsByOrder(columns).filter(column => column.isVisible !== false)

export const normalizeColumnMoveDestinationIndex = (
  sourceStartIndex: number,
  count: number,
  destinationIndex: number
): number | null => {
  const safeSourceStart = Math.max(0, Math.trunc(sourceStartIndex))
  const safeCount = Math.max(0, Math.trunc(count))
  const safeDestination = Math.max(0, Math.trunc(destinationIndex))
  if (safeCount === 0) return null

  const sourceEndExclusive = safeSourceStart + safeCount
  if (safeDestination >= safeSourceStart && safeDestination <= sourceEndExclusive) {
    return null
  }

  return safeDestination > safeSourceStart ? Math.max(0, safeDestination - safeCount) : safeDestination
}

export const applyMovesToVisibleOrder = (columnIds: string[], moves: ColumnReorderMove[]): string[] => {
  const workingIds = [...columnIds]
  for (const move of moves) {
    const movedIds = workingIds.splice(move.sourceStartColumn, move.count)
    if (movedIds.length !== move.count) {
      return workingIds
    }
    workingIds.splice(move.destinationStartColumn, 0, ...movedIds)
  }
  return workingIds
}

export type NativeColumnReorderBlockReason =
  | 'source_partially_spans_merge'
  | 'destination_inside_merge'
  | 'shifted_range_intersects_merge'

const moveIntersectsMergeRange = (move: ColumnReorderMove, mergeRange: SpreadsheetMergeRange): boolean => {
  const sourceEnd = move.sourceStartColumn + move.count - 1
  return move.sourceStartColumn <= mergeRange.endColumn && sourceEnd >= mergeRange.startColumn
}

const moveFullyContainsMergeRange = (move: ColumnReorderMove, mergeRange: SpreadsheetMergeRange): boolean => {
  const sourceEnd = move.sourceStartColumn + move.count - 1
  return move.sourceStartColumn <= mergeRange.startColumn && sourceEnd >= mergeRange.endColumn
}

const getMergeSafetyDestinationStartColumn = (move: ColumnReorderMove): number => {
  const rawDestinationStartColumn = move.rawDestinationStartColumn
  if (typeof rawDestinationStartColumn === 'number' && Number.isFinite(rawDestinationStartColumn)) {
    return Math.max(0, Math.trunc(rawDestinationStartColumn))
  }

  return move.destinationStartColumn
}

const buildShiftedRangeForMove = (move: ColumnReorderMove): { startColumn: number; endColumn: number } | null => {
  const sourceEnd = move.sourceStartColumn + move.count - 1
  const mergeSafetyDestinationStartColumn = getMergeSafetyDestinationStartColumn(move)

  if (mergeSafetyDestinationStartColumn > move.sourceStartColumn) {
    return {
      startColumn: sourceEnd + 1,
      endColumn: mergeSafetyDestinationStartColumn + move.count - 1
    }
  }

  if (mergeSafetyDestinationStartColumn < move.sourceStartColumn) {
    return {
      startColumn: mergeSafetyDestinationStartColumn,
      endColumn: move.sourceStartColumn - 1
    }
  }

  return null
}

const shiftedRangeIntersectsMerge = (move: ColumnReorderMove, mergeRange: SpreadsheetMergeRange): boolean => {
  const shiftedRange = buildShiftedRangeForMove(move)
  if (!shiftedRange) return false
  return shiftedRange.startColumn <= mergeRange.endColumn && shiftedRange.endColumn >= mergeRange.startColumn
}

const destinationFallsInsideMergeInterior = (move: ColumnReorderMove, mergeRange: SpreadsheetMergeRange): boolean =>
  mergeRange.startColumn < getMergeSafetyDestinationStartColumn(move) &&
  getMergeSafetyDestinationStartColumn(move) <= mergeRange.endColumn

/**
 * Plans visible-column move steps that transform `previousColumns` layout into `nextColumns`
 * using the same destination semantics as `useSpreadsheetColumns.handleColumnsMove`.
 */
export function planVisibleColumnReorderMoves(
  previousColumns: SpreadsheetColumn[],
  nextColumns: SpreadsheetColumn[]
): ColumnReorderMove[] {
  const targetIds = visibleColumnsInGridOrder(nextColumns).map(column => column.id)
  const workingIds = visibleColumnsInGridOrder(previousColumns).map(column => column.id)
  if (workingIds.join('|') === targetIds.join('|')) return []

  const moves: ColumnReorderMove[] = []
  while (workingIds.join('|') !== targetIds.join('|')) {
    let firstMismatch = 0
    while (firstMismatch < workingIds.length && workingIds[firstMismatch] === targetIds[firstMismatch]) {
      firstMismatch += 1
    }
    if (firstMismatch >= targetIds.length) break

    const movingId = targetIds[firstMismatch]
    const sourceIndex = workingIds.indexOf(movingId)
    if (sourceIndex < 0) break

    const count = 1
    const destinationStartColumn = normalizeColumnMoveDestinationIndex(sourceIndex, count, firstMismatch)
    if (destinationStartColumn == null) break

    moves.push({ sourceStartColumn: sourceIndex, count, destinationStartColumn })

    const [removed] = workingIds.splice(sourceIndex, 1)
    workingIds.splice(firstMismatch, 0, removed)
  }

  return moves
}

export function explicitColumnReorderMovesReachTarget(params: {
  previousColumns: SpreadsheetColumn[]
  nextColumns: SpreadsheetColumn[]
  explicitMoves?: ColumnReorderMove[]
}): boolean {
  const explicitMoves = Array.isArray(params.explicitMoves) ? params.explicitMoves.filter(move => move.count > 0) : []
  if (explicitMoves.length === 0) return false
  const previousVisibleOrder = visibleColumnsInGridOrder(params.previousColumns).map(column => column.id)
  const nextVisibleOrder = visibleColumnsInGridOrder(params.nextColumns).map(column => column.id)
  const explicitAppliedVisibleOrder = applyMovesToVisibleOrder(previousVisibleOrder, explicitMoves)
  return explicitAppliedVisibleOrder.join('|') === nextVisibleOrder.join('|')
}

export function resolveColumnReorderMoves(params: {
  previousColumns: SpreadsheetColumn[]
  nextColumns: SpreadsheetColumn[]
  explicitMoves?: ColumnReorderMove[]
}):
  | { ok: true; moves: ColumnReorderMove[] }
  | { ok: false; reason: 'unplannable_reorder'; moves: ColumnReorderMove[] } {
  const previousVisibleOrder = visibleColumnsInGridOrder(params.previousColumns).map(column => column.id)
  const nextVisibleOrder = visibleColumnsInGridOrder(params.nextColumns).map(column => column.id)
  const explicitMoves = Array.isArray(params.explicitMoves) ? params.explicitMoves.filter(move => move.count > 0) : []
  if (explicitMoves.length > 0) {
    if (
      explicitColumnReorderMovesReachTarget({
        previousColumns: params.previousColumns,
        nextColumns: params.nextColumns,
        explicitMoves
      })
    ) {
      return { ok: true, moves: explicitMoves }
    }
    return { ok: false, reason: 'unplannable_reorder', moves: explicitMoves }
  }
  if (previousVisibleOrder.join('|') === nextVisibleOrder.join('|')) {
    return { ok: true, moves: [] }
  }

  const moves = planVisibleColumnReorderMoves(params.previousColumns, params.nextColumns)
  const appliedVisibleOrder = applyMovesToVisibleOrder(previousVisibleOrder, moves)
  if (appliedVisibleOrder.join('|') !== nextVisibleOrder.join('|')) {
    return { ok: false, reason: 'unplannable_reorder', moves }
  }

  return { ok: true, moves }
}

export function classifyNativeColumnReorderWithMerges(params: {
  previousColumns: SpreadsheetColumn[]
  nextColumns: SpreadsheetColumn[]
  mergeRanges?: SpreadsheetMergeRange[]
  explicitMoves?: ColumnReorderMove[]
}):
  | { ok: true; moves: ColumnReorderMove[] }
  | { ok: false; reason: 'unplannable_reorder' | NativeColumnReorderBlockReason; moves: ColumnReorderMove[] } {
  const resolvedMoves = resolveColumnReorderMoves({
    previousColumns: params.previousColumns,
    nextColumns: params.nextColumns,
    explicitMoves: params.explicitMoves
  })
  if (!resolvedMoves.ok) {
    return resolvedMoves
  }

  const mergeRanges = Array.isArray(params.mergeRanges) ? params.mergeRanges : []
  for (const move of resolvedMoves.moves) {
    for (const mergeRange of mergeRanges) {
      const moveCarriesWholeMerge = moveFullyContainsMergeRange(move, mergeRange)
      if (moveIntersectsMergeRange(move, mergeRange) && !moveCarriesWholeMerge) {
        return { ok: false, reason: 'source_partially_spans_merge', moves: resolvedMoves.moves }
      }
      if (destinationFallsInsideMergeInterior(move, mergeRange)) {
        return { ok: false, reason: 'destination_inside_merge', moves: resolvedMoves.moves }
      }
      if (!moveCarriesWholeMerge && shiftedRangeIntersectsMerge(move, mergeRange)) {
        return { ok: false, reason: 'shifted_range_intersects_merge', moves: resolvedMoves.moves }
      }
    }
  }

  return resolvedMoves
}
