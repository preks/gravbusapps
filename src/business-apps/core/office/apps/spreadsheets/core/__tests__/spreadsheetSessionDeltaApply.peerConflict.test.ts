import { applySpreadsheetSessionDeltaChangesToRows } from '../spreadsheetSessionDeltaApply'

describe('applySpreadsheetSessionDeltaChangesToRows peer conflict', () => {
  it('does not apply peer value to wrong row when only visual index would match', () => {
    const rows = [
      { _id: 'row-a', _rowUuid: 'row-a', _gridRowIndex: 0, ColumnA: 'keep-a' },
      { _id: 'row-b', _rowUuid: 'row-b', _gridRowIndex: 1, ColumnA: 'keep-b' }
    ]

    const nextRows = applySpreadsheetSessionDeltaChangesToRows(rows, [
      {
        operationType: 'set_cell',
        payload: { rowId: 'row-b', columnName: 'ColumnA', value: 'peer-b' }
      }
    ])

    expect(nextRows[0].ColumnA).toBe('keep-a')
    expect(nextRows[1].ColumnA).toBe('peer-b')
  })
})
