import type { SpreadsheetColumn } from '../types/spreadsheet'

export type ColumnReorderMove = {
  sourceStartColumn: number
  count: number
  destinationStartColumn: number
}

const sortColumnsByOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  [...columns].sort((left, right) => left.order - right.order)

export const visibleColumnsInGridOrder = (columns: SpreadsheetColumn[]): SpreadsheetColumn[] =>
  sortColumnsByOrder(columns).filter(column => column.isVisible !== false)

const normalizeColumnMoveDestinationIndex = (
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
