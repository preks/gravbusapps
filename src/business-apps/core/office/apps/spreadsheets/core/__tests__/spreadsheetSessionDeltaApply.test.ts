import {
  applyClearAllDelta,
  applyMergeRangesDelta,
  applySpreadsheetSessionDeltaChangesToRows
} from '../spreadsheetSessionDeltaApply'
import type { SpreadsheetColumn } from '../../types'

const columns: SpreadsheetColumn[] = [
  { id: 'col-a', name: 'ColumnA', type: 'text', isVisible: true, order: 0 },
  { id: 'col-b', name: 'ColumnB', type: 'text', isVisible: true, order: 1 }
]

describe('applySpreadsheetSessionDeltaChangesToRows', () => {
  it('applies peer single-cell update over local stale row (incoming wins per field)', () => {
    const rows = [
      {
        _id: 'row-1',
        _rowUuid: 'row-1',
        ColumnA: 'local-stale',
        ColumnB: 'local-only'
      }
    ]

    const nextRows = applySpreadsheetSessionDeltaChangesToRows(rows, [
      {
        operationType: 'set_cell',
        payload: { rowId: 'row-1', columnName: 'ColumnA', value: 'peer-wins' }
      }
    ])

    expect(nextRows[0]).toEqual({
      _id: 'row-1',
      _rowUuid: 'row-1',
      ColumnA: 'peer-wins',
      ColumnB: 'local-only'
    })
  })
})

describe('applyMergeRangesDelta', () => {
  it('keeps the anchor cell and clears covered slave values', () => {
    const rows = [
      { _id: 'row-1', _gridRowIndex: 0, ColumnA: 'anchor', ColumnB: 'slave' },
      { _id: 'row-2', _gridRowIndex: 1, ColumnA: 'below', ColumnB: 'untouched' }
    ]

    const nextRows = applyMergeRangesDelta(
      rows,
      {
        ranges: [{ startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 }]
      },
      columns
    )

    expect(nextRows[0]).toEqual({ _id: 'row-1', _gridRowIndex: 0, ColumnA: 'anchor' })
    expect(nextRows[1]).toEqual({ _id: 'row-2', _gridRowIndex: 1 })
  })
})

describe('applyClearAllDelta', () => {
  it('strips column values inside the requested ranges by grid row index', () => {
    const rows = [
      { _id: 'row-1', _gridRowIndex: 0, ColumnA: 'keep-top', ColumnB: 'b0' },
      { _id: 'row-2', _gridRowIndex: 1, ColumnA: 'clear-me', ColumnB: 'clear-b' },
      { _id: 'row-3', _gridRowIndex: 5, ColumnA: 'far', ColumnB: 'untouched' }
    ]

    const nextRows = applyClearAllDelta(
      rows,
      {
        ranges: [{ startRow: 1, endRow: 1, startColumn: 0, endColumn: 1 }]
      },
      columns
    )

    expect(nextRows[0]).toEqual({ _id: 'row-1', _gridRowIndex: 0, ColumnA: 'keep-top', ColumnB: 'b0' })
    expect(nextRows[1]).toEqual({ _id: 'row-2', _gridRowIndex: 1 })
    expect(nextRows[2]).toEqual({ _id: 'row-3', _gridRowIndex: 5, ColumnA: 'far', ColumnB: 'untouched' })
  })

  it('returns rows unchanged when ranges are empty', () => {
    const rows = [{ _id: 'row-1', ColumnA: 'value' }]
    expect(applyClearAllDelta(rows, { ranges: [] }, columns)).toBe(rows)
  })
})
