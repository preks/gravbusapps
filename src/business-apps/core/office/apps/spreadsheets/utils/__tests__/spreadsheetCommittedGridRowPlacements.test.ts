import {
  applyCommittedGridRowPlacements,
  mergeGridRowPlacementsFromReplayChanges,
  parseCommittedGridRowPlacements
} from '../spreadsheetCommittedGridRowPlacements'

describe('spreadsheetCommittedGridRowPlacements', () => {
  it('applies identity-keyed placements without array reindexing', () => {
    const rows = applyCommittedGridRowPlacements(
      [
        { _rowUuid: 'row-a', _gridRowIndex: 1, ColumnA: 'a' },
        { _rowUuid: 'row-b', _gridRowIndex: 5, ColumnA: 'b' }
      ],
      { 'row-a': 10, 'row-b': 11 }
    )

    expect(rows[0]._gridRowIndex).toBe(10)
    expect(rows[1]._gridRowIndex).toBe(11)
  })

  it('merges placement maps from replay changes in appliedVersion order', () => {
    const merged = mergeGridRowPlacementsFromReplayChanges([
      {
        appliedVersion: 2,
        payload: { gridRowIndexByRowUuid: { 'row-a': 1 } }
      },
      {
        appliedVersion: 3,
        gridRowIndexByRowUuid: { 'row-a': 5, 'row-b': 6 }
      }
    ])

    expect(merged).toEqual({ 'row-a': 5, 'row-b': 6 })
  })

  it('parses committed placement maps from wire payloads', () => {
    expect(parseCommittedGridRowPlacements({ 'row-a': 3, 'row-b': '4' })).toEqual({
      'row-a': 3,
      'row-b': 4
    })
  })
})
