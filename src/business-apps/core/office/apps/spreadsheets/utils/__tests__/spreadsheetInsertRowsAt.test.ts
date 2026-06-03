import { mergeInsertedRowsAtIndex } from '../spreadsheetInsertRowsAt'

describe('mergeInsertedRowsAtIndex', () => {
  it('preserves later optimistic inserts when an earlier insert reconciles against latest rows', () => {
    const baseline = [
      { _id: 'row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, ColumnA: 'top' },
      { _id: 'row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 1, ColumnA: 'bottom' }
    ]

    const afterFirstOptimisticInsert = mergeInsertedRowsAtIndex(
      baseline,
      [{ _id: 'client-row-1', _gridRowIndex: 1 }],
      1
    )
    const afterSecondOptimisticInsert = mergeInsertedRowsAtIndex(
      afterFirstOptimisticInsert,
      [{ _id: 'client-row-2', _gridRowIndex: 2 }],
      2
    )

    const afterFirstAuthoritativeReconcile = mergeInsertedRowsAtIndex(
      afterSecondOptimisticInsert,
      [{ _id: 'client-row-1', _clientRowId: 'client-row-1', _rowUuid: 'backend-row-new-1', _gridRowIndex: 1 }],
      1
    )
    const finalRows = mergeInsertedRowsAtIndex(
      afterFirstAuthoritativeReconcile,
      [{ _id: 'client-row-2', _clientRowId: 'client-row-2', _rowUuid: 'backend-row-new-2', _gridRowIndex: 2 }],
      2
    )

    expect(finalRows).toEqual([
      { _id: 'row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, ColumnA: 'top' },
      { _id: 'client-row-1', _clientRowId: 'client-row-1', _rowUuid: 'backend-row-new-1', _gridRowIndex: 1 },
      { _id: 'client-row-2', _clientRowId: 'client-row-2', _rowUuid: 'backend-row-new-2', _gridRowIndex: 2 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 1, ColumnA: 'bottom' }
    ])
  })

  it('preserves canonical _gridRowIndex values instead of array reindexing', () => {
    const rows = [
      { _id: 'row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, ColumnA: 'top' },
      { ColumnA: 'blank spacer', _gridRowIndex: 8 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 1, ColumnA: 'bottom' }
    ]

    const merged = mergeInsertedRowsAtIndex(rows, [{ _id: 'client-row-1', _gridRowIndex: 1 }], 1)

    expect(merged).toEqual([
      { _id: 'row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, ColumnA: 'top' },
      { _id: 'client-row-1', _gridRowIndex: 1 },
      { ColumnA: 'blank spacer', _gridRowIndex: 8 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 1, ColumnA: 'bottom' }
    ])
  })
})
