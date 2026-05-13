import {
  buildUiToBackendRowIdMap,
  getClientRowIdentity,
  getViewerRowIdentityCandidates,
  resolveBackendRowIdForViewerRow,
  rowMatchesRemoteId
} from '../spreadsheetRowIdentity'

describe('spreadsheetRowIdentity', () => {
  const isUuid = (value: string): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

  it('returns all stable viewer row identity candidates', () => {
    expect(
      getViewerRowIdentityCandidates({
        _id: 'client_row_1',
        id: '11111111-1111-4111-8111-111111111111',
        _rowUuid: '11111111-1111-4111-8111-111111111111'
      })
    ).toEqual(['client_row_1', '11111111-1111-4111-8111-111111111111'])
  })

  it('resolves the explicit or inferred client row identity', () => {
    expect(getClientRowIdentity({ _clientRowId: 'client_explicit' })).toBe('client_explicit')
    expect(getClientRowIdentity({ _id: 'client_fallback' })).toBe('client_fallback')
    expect(getClientRowIdentity({ _id: 'backend-id' })).toBe('')
  })

  it('resolves the persisted backend row id from known identity fields', () => {
    expect(
      resolveBackendRowIdForViewerRow(
        {
          _id: 'client_123',
          _rowUuid: '11111111-1111-4111-8111-111111111111'
        },
        isUuid
      )
    ).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('matches remote ids against any known viewer-row identity field', () => {
    expect(
      rowMatchesRemoteId(
        {
          _id: 'client_123',
          id: '11111111-1111-4111-8111-111111111111'
        },
        '11111111-1111-4111-8111-111111111111'
      )
    ).toBe(true)
  })

  it('builds a ui-to-backend row id map across all identity aliases', () => {
    const rows = [
      {
        _id: 'client_123',
        id: '11111111-1111-4111-8111-111111111111',
        _rowUuid: '11111111-1111-4111-8111-111111111111'
      },
      {
        _id: '22222222-2222-4222-8222-222222222222'
      }
    ]

    expect(buildUiToBackendRowIdMap(rows, isUuid)).toEqual(
      new Map([
        ['client_123', '11111111-1111-4111-8111-111111111111'],
        ['11111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111'],
        ['22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222']
      ])
    )
  })
})
