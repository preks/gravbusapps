import {
  classifyNativeColumnReorderWithMerges,
  planVisibleColumnReorderMoves,
  resolveColumnReorderMoves
} from '../spreadsheetColumnReorderMoves'
import type { SpreadsheetColumn, SpreadsheetMergeRange } from '../../types/spreadsheet'

const column = (id: string, order: number, isVisible = true): SpreadsheetColumn => ({
  id,
  name: id,
  label: id,
  type: 'text',
  order,
  isVisible,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  width: 100
})

describe('planVisibleColumnReorderMoves', () => {
  it('returns no moves when visible order is unchanged', () => {
    const columns = [column('a', 0), column('b', 1), column('c', 2)]
    expect(planVisibleColumnReorderMoves(columns, columns)).toEqual([])
  })

  it('plans a single swap between adjacent visible columns', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]
    expect(planVisibleColumnReorderMoves(previous, next)).toEqual([
      { sourceStartColumn: 2, count: 1, destinationStartColumn: 1 }
    ])
  })

  it('ignores hidden columns when planning visible grid moves', () => {
    const previous = [column('a', 0), column('b', 1), column('hidden', 2, false), column('c', 3)]
    const next = [column('a', 0), column('c', 1), column('hidden', 2, false), column('b', 3)]
    expect(planVisibleColumnReorderMoves(previous, next)).toEqual([
      { sourceStartColumn: 2, count: 1, destinationStartColumn: 1 }
    ])
  })
})

describe('resolveColumnReorderMoves', () => {
  it('prefers explicit multi-column moves when they match the target order', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2), column('d', 3)]
    const next = [column('b', 0), column('c', 1), column('a', 2), column('d', 3)]

    expect(
      resolveColumnReorderMoves({
        previousColumns: previous,
        nextColumns: next,
        explicitMoves: [{ sourceStartColumn: 1, count: 2, destinationStartColumn: 0 }]
      })
    ).toEqual({
      ok: true,
      moves: [{ sourceStartColumn: 1, count: 2, destinationStartColumn: 0 }]
    })
  })
})

describe('classifyNativeColumnReorderWithMerges', () => {
  const mergedBlock: SpreadsheetMergeRange[] = [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }]

  it('allows moving a whole merged block when the explicit move fully contains the merge', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2), column('d', 3)]
    const next = [column('b', 0), column('c', 1), column('a', 2), column('d', 3)]

    expect(
      classifyNativeColumnReorderWithMerges({
        previousColumns: previous,
        nextColumns: next,
        mergeRanges: mergedBlock,
        explicitMoves: [{ sourceStartColumn: 1, count: 2, destinationStartColumn: 0 }]
      })
    ).toEqual({
      ok: true,
      moves: [{ sourceStartColumn: 1, count: 2, destinationStartColumn: 0 }]
    })
  })

  it('blocks moves that partially span a merge in the source range', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]

    expect(
      classifyNativeColumnReorderWithMerges({
        previousColumns: previous,
        nextColumns: next,
        mergeRanges: mergedBlock
      })
    ).toEqual({
      ok: false,
      reason: 'source_partially_spans_merge',
      moves: [{ sourceStartColumn: 2, count: 1, destinationStartColumn: 1 }]
    })
  })

  it('blocks moves whose destination lands inside another merge interior', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2), column('d', 3), column('e', 4)]
    const next = [column('a', 0), column('b', 1), column('d', 2), column('c', 3), column('e', 4)]
    const mergeRanges: SpreadsheetMergeRange[] = [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }]

    expect(
      classifyNativeColumnReorderWithMerges({
        previousColumns: previous,
        nextColumns: next,
        mergeRanges
      })
    ).toEqual({
      ok: false,
      reason: 'destination_inside_merge',
      moves: [{ sourceStartColumn: 3, count: 1, destinationStartColumn: 2 }]
    })
  })
})
