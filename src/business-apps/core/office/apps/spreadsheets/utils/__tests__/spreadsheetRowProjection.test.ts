import { resolveViewerRowIndexForRemoteId } from '../spreadsheetRowProjection'

describe('resolveViewerRowIndexForRemoteId', () => {
  it('returns _gridRowIndex when row identity matches', () => {
    const rows = [
      { _id: 'row-a', _rowUuid: 'row-a', _gridRowIndex: 2 },
      { _id: 'row-b', _rowUuid: 'row-b', _gridRowIndex: 0 }
    ]
    expect(resolveViewerRowIndexForRemoteId(rows, 'row-a')).toBe(2)
    expect(resolveViewerRowIndexForRemoteId(rows, 'row-b')).toBe(0)
  })

  it('returns undefined when identity is unknown', () => {
    expect(resolveViewerRowIndexForRemoteId([{ _id: 'row-a' }], 'missing')).toBeUndefined()
  })
})
