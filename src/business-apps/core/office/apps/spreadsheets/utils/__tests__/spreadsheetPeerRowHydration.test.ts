import {
  findViewerRowVisualIndex,
  getFiniteNonNegativeGridRowIndex,
  hydrateCachedRowsWithServerIdentities,
  getViewerRowVisualIndex,
  sortRowsByCanonicalVisualOrder
} from '../spreadsheetPeerRowHydration'

describe('getFiniteNonNegativeGridRowIndex', () => {
  it('returns truncated index when valid', () => {
    expect(getFiniteNonNegativeGridRowIndex({ _gridRowIndex: 7 })).toBe(7)
    expect(getFiniteNonNegativeGridRowIndex({ _gridRowIndex: 7.9 })).toBe(7)
  })

  it('returns undefined when missing or invalid', () => {
    expect(getFiniteNonNegativeGridRowIndex({})).toBeUndefined()
    expect(getFiniteNonNegativeGridRowIndex({ _gridRowIndex: -1 })).toBeUndefined()
    expect(getFiniteNonNegativeGridRowIndex({ _gridRowIndex: Number.NaN })).toBeUndefined()
  })
})

describe('getViewerRowVisualIndex', () => {
  it('uses _gridRowIndex when finite and non-negative', () => {
    expect(getViewerRowVisualIndex({ _gridRowIndex: 7 }, 0)).toBe(7)
  })

  it('falls back to index when _gridRowIndex missing', () => {
    expect(getViewerRowVisualIndex({}, 3)).toBe(3)
  })
})

describe('hydrateCachedRowsWithServerIdentities', () => {
  it('returns cached rows unchanged when server rows empty', () => {
    const cached = [{ _id: 'client_a', _gridRowIndex: 0 }]
    expect(hydrateCachedRowsWithServerIdentities(cached, [])).toEqual(cached)
    expect(hydrateCachedRowsWithServerIdentities(cached, undefined)).toEqual(cached)
  })

  it('maps client ids to server canonical ids by visual index', () => {
    const cached = [{ _id: 'client_x', _gridRowIndex: 0, Name: 'A' }]
    const server = [{ _id: 'srv-uuid', id: 'srv-uuid', Name: 'A', _gridRowIndex: 0 }]
    expect(hydrateCachedRowsWithServerIdentities(cached, server)).toEqual([
      expect.objectContaining({
        _id: 'srv-uuid',
        _rowUuid: 'srv-uuid',
        Name: 'A'
      })
    ])
  })

  it('does not overwrite non-client persisted ids', () => {
    const cached = [{ _id: '550e8400-e29b-41d4-a716-446655440000', _gridRowIndex: 0 }]
    const server = [{ _id: 'other', _gridRowIndex: 0 }]
    expect(hydrateCachedRowsWithServerIdentities(cached, server)).toEqual(cached)
  })
})

describe('sortRowsByCanonicalVisualOrder', () => {
  it('sorts rows by explicit visual row index while preserving ties', () => {
    const rows = [
      { _id: 'row-3', _gridRowIndex: 2 },
      { _id: 'row-1', _gridRowIndex: 0 },
      { _id: 'row-2', _gridRowIndex: 1 }
    ]

    expect(sortRowsByCanonicalVisualOrder(rows).map(row => row._id)).toEqual(['row-1', 'row-2', 'row-3'])
  })

  it('keeps original order for rows without explicit visual indices', () => {
    const rows = [{ _id: 'row-a' }, { _id: 'row-b' }]
    expect(sortRowsByCanonicalVisualOrder(rows)).toEqual(rows)
  })
})

describe('findViewerRowVisualIndex', () => {
  it('resolves visual row index from canonical row identity instead of array order', () => {
    const rows = [
      { _id: 'row-3', _rowUuid: 'row-3', _gridRowIndex: 2 },
      { _id: 'row-1', _rowUuid: 'row-1', _gridRowIndex: 0 },
      { _id: 'row-2', _rowUuid: 'row-2', _gridRowIndex: 1 }
    ]

    expect(findViewerRowVisualIndex(rows, { _id: 'row-2', _rowUuid: 'row-2' })).toBe(1)
  })
})
