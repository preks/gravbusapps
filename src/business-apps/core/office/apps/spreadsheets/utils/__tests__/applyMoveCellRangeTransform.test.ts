import { applyMoveCellRangeTransform } from '../applyMoveCellRangeTransform'
import { getViewerRowVisualIndex } from '../spreadsheetPeerRowHydration'

const columnNames = ['col_a', 'col_b', 'col_c', 'col_d']

const buildRow = (overrides: Record<string, unknown>) => ({
  _id: overrides._id,
  _gridRowIndex: overrides._gridRowIndex,
  ...overrides
})

describe('applyMoveCellRangeTransform', () => {
  it('returns the same array when delta is zero', () => {
    const rows = [buildRow({ _id: 'r0', _gridRowIndex: 0, col_a: 1 })]
    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }
    })
    expect(next).toBe(rows)
  })

  it('relocates a single cell to a different row/column and clears the source', () => {
    const rows = [
      buildRow({ _id: 'r0', _gridRowIndex: 0, col_a: 'hello', col_b: 'keep' }),
      buildRow({ _id: 'r1', _gridRowIndex: 1 })
    ]
    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 1, endRow: 1, startColumn: 2, endColumn: 2 }
    })
    expect((next[0] as Record<string, unknown>).col_a).toBeUndefined()
    expect((next[0] as Record<string, unknown>).col_b).toBe('keep')
    expect((next[1] as Record<string, unknown>).col_c).toBe('hello')
  })

  it('relocates a 2x2 block preserving values', () => {
    const rows = [
      buildRow({ _id: 'r0', _gridRowIndex: 0, col_a: 'A', col_b: 'B' }),
      buildRow({ _id: 'r1', _gridRowIndex: 1, col_a: 'C', col_b: 'D' }),
      buildRow({ _id: 'r2', _gridRowIndex: 2 }),
      buildRow({ _id: 'r3', _gridRowIndex: 3 })
    ]
    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 },
      toRange: { startRow: 2, endRow: 3, startColumn: 2, endColumn: 3 }
    })
    expect(next[0]).not.toHaveProperty('col_a')
    expect(next[0]).not.toHaveProperty('col_b')
    expect((next[2] as Record<string, unknown>).col_c).toBe('A')
    expect((next[2] as Record<string, unknown>).col_d).toBe('B')
    expect((next[3] as Record<string, unknown>).col_c).toBe('C')
    expect((next[3] as Record<string, unknown>).col_d).toBe('D')
  })

  it('handles partial overlap without dropping values', () => {
    const rows = [
      buildRow({ _id: 'r0', _gridRowIndex: 0, col_a: 'A', col_b: 'B' }),
      buildRow({ _id: 'r1', _gridRowIndex: 1 })
    ]
    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 },
      toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }
    })
    expect((next[0] as Record<string, unknown>).col_a).toBeUndefined()
    expect((next[0] as Record<string, unknown>).col_b).toBe('A')
    expect((next[0] as Record<string, unknown>).col_c).toBe('B')
  })

  it('moves formula objects and clears the source cell', () => {
    const rows = [
      buildRow({
        _id: 'r0',
        _gridRowIndex: 0,
        col_a: { f: '=SUM(B1:B5)', v: 83 },
        col_b: 'keep'
      }),
      buildRow({ _id: 'r1', _gridRowIndex: 1 })
    ]

    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 1, endRow: 1, startColumn: 2, endColumn: 2 }
    })

    expect((next[0] as Record<string, unknown>).col_a).toBeUndefined()
    expect((next[0] as Record<string, unknown>).col_b).toBe('keep')
    expect((next[1] as Record<string, unknown>).col_c).toEqual({ f: '=SUM(B1:B5)', v: 83 })
  })

  it('does not clear overlapping destinations after moving formula objects', () => {
    const rows = [buildRow({ _id: 'r0', _gridRowIndex: 0, col_a: { f: '=A1', v: 1 }, col_b: { f: '=B1', v: 2 } })]

    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 1 },
      toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }
    })

    expect((next[0] as Record<string, unknown>).col_a).toBeUndefined()
    expect((next[0] as Record<string, unknown>).col_b).toEqual({ f: '=A1', v: 1 })
    expect((next[0] as Record<string, unknown>).col_c).toEqual({ f: '=B1', v: 2 })
  })

  it('skips out-of-bounds rows and columns', () => {
    const rows = [buildRow({ _id: 'r0', _gridRowIndex: 0, col_a: 'A' })]
    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 99, endRow: 99, startColumn: 0, endColumn: 0 }
    })
    expect((next[0] as Record<string, unknown>).col_a).toBeUndefined()
  })

  it('resolves source rows by _gridRowIndex instead of sparse array position', () => {
    const rows = [
      buildRow({ _id: 'r0', _gridRowIndex: 0, col_i: 'keep-i0' }),
      buildRow({ _id: 'r6', _gridRowIndex: 6, col_i: 'keep-i6' }),
      buildRow({ _id: 'r7', _gridRowIndex: 7, col_i: 7, col_h: '' }),
      buildRow({ _id: 'r8', _gridRowIndex: 8, col_i: 8 })
    ]
    const columnNames = ['col_h', 'col_i', 'col_j', 'col_k']
    const next = applyMoveCellRangeTransform({
      rows,
      columnNamesByGridIndex: columnNames,
      fromRange: { startRow: 7, endRow: 8, startColumn: 1, endColumn: 1 },
      toRange: { startRow: 7, endRow: 8, startColumn: 0, endColumn: 0 }
    })

    const rowByGridIndex = (gridRow: number) =>
      next.find((row, index) => getViewerRowVisualIndex(row as Record<string, unknown>, index) === gridRow) as
        | Record<string, unknown>
        | undefined

    expect(rowByGridIndex(6)?.col_i).toBe('keep-i6')
    expect(rowByGridIndex(7)?.col_i).toBeUndefined()
    expect(rowByGridIndex(7)?.col_h).toBe(7)
    expect(rowByGridIndex(8)?.col_i).toBeUndefined()
    expect(rowByGridIndex(8)?.col_h).toBe(8)
  })
})
