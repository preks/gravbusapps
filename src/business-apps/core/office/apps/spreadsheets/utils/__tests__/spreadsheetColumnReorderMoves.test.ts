import {
  explicitColumnReorderMovesReachTarget,
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
  it('detects when explicit moves match the target order from a candidate previous order', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]

    expect(
      explicitColumnReorderMovesReachTarget({
        previousColumns: previous,
        nextColumns: next,
        explicitMoves: [{ sourceStartColumn: 2, count: 1, destinationStartColumn: 1 }]
      })
    ).toBe(true)
  })

  it('detects when explicit moves do not match the target order from a stale previous order', () => {
    const stalePrevious = [column('a', 0), column('c', 1), column('b', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]

    expect(
      explicitColumnReorderMovesReachTarget({
        previousColumns: stalePrevious,
        nextColumns: next,
        explicitMoves: [{ sourceStartColumn: 2, count: 1, destinationStartColumn: 1 }]
      })
    ).toBe(false)
  })

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

  it('does not silently drop explicit moves when metadata order already matches the target', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('b', 1), column('c', 2)]

    expect(
      resolveColumnReorderMoves({
        previousColumns: previous,
        nextColumns: next,
        explicitMoves: [{ sourceStartColumn: 1, count: 1, destinationStartColumn: 0 }]
      })
    ).toEqual({
      ok: false,
      reason: 'unplannable_reorder',
      moves: [{ sourceStartColumn: 1, count: 1, destinationStartColumn: 0 }]
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

  it('blocks rightward moves whose shifted range crosses a merge span', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2), column('d', 3), column('e', 4)]
    const next = [column('a', 0), column('c', 1), column('d', 2), column('e', 3), column('b', 4)]
    const mergeRanges: SpreadsheetMergeRange[] = [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 3 }]

    expect(
      classifyNativeColumnReorderWithMerges({
        previousColumns: previous,
        nextColumns: next,
        mergeRanges,
        explicitMoves: [{ sourceStartColumn: 1, count: 1, destinationStartColumn: 4 }]
      })
    ).toEqual({
      ok: false,
      reason: 'shifted_range_intersects_merge',
      moves: [{ sourceStartColumn: 1, count: 1, destinationStartColumn: 4 }]
    })
  })

  it('blocks leftward moves whose shifted range crosses a merge span', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2), column('d', 3), column('e', 4)]
    const next = [column('d', 0), column('a', 1), column('b', 2), column('c', 3), column('e', 4)]
    const mergeRanges: SpreadsheetMergeRange[] = [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }]

    expect(
      classifyNativeColumnReorderWithMerges({
        previousColumns: previous,
        nextColumns: next,
        mergeRanges,
        explicitMoves: [{ sourceStartColumn: 3, count: 1, destinationStartColumn: 0 }]
      })
    ).toEqual({
      ok: false,
      reason: 'shifted_range_intersects_merge',
      moves: [{ sourceStartColumn: 3, count: 1, destinationStartColumn: 0 }]
    })
  })

  it('uses rawDestinationStartColumn when checking rightward merge crossings', () => {
    const previous = Array.from({ length: 12 }, (_, index) => column(String.fromCharCode(97 + index), index))
    const next = [
      previous[0],
      previous[1],
      previous[2],
      previous[3],
      previous[4],
      previous[5],
      previous[6],
      previous[7],
      previous[9],
      previous[8],
      previous[10],
      previous[11]
    ].map((entry, index) => ({ ...entry, order: index }))
    const mergeRanges: SpreadsheetMergeRange[] = [{ startRow: 0, endRow: 0, startColumn: 10, endColumn: 11 }]

    expect(
      classifyNativeColumnReorderWithMerges({
        previousColumns: previous,
        nextColumns: next,
        mergeRanges,
        explicitMoves: [
          {
            sourceStartColumn: 8,
            count: 1,
            destinationStartColumn: 9,
            rawDestinationStartColumn: 10
          }
        ]
      })
    ).toEqual({
      ok: false,
      reason: 'shifted_range_intersects_merge',
      moves: [
        {
          sourceStartColumn: 8,
          count: 1,
          destinationStartColumn: 9,
          rawDestinationStartColumn: 10
        }
      ]
    })
  })

  it('allows rightward moves when rawDestinationStartColumn does not cross a merge span', () => {
    const previous = Array.from({ length: 12 }, (_, index) => column(String.fromCharCode(97 + index), index))
    const next = [
      previous[0],
      previous[1],
      previous[2],
      previous[3],
      previous[4],
      previous[5],
      previous[6],
      previous[7],
      previous[9],
      previous[8],
      previous[10],
      previous[11]
    ].map((entry, index) => ({ ...entry, order: index }))
    const mergeRanges: SpreadsheetMergeRange[] = [{ startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 }]

    expect(
      classifyNativeColumnReorderWithMerges({
        previousColumns: previous,
        nextColumns: next,
        mergeRanges,
        explicitMoves: [
          {
            sourceStartColumn: 8,
            count: 1,
            destinationStartColumn: 9,
            rawDestinationStartColumn: 10
          }
        ]
      })
    ).toEqual({
      ok: true,
      moves: [
        {
          sourceStartColumn: 8,
          count: 1,
          destinationStartColumn: 9,
          rawDestinationStartColumn: 10
        }
      ]
    })
  })
})
