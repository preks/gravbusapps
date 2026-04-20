import { sortSpreadsheetRowsBySheetSettings } from '../useSpreadsheetViewerState'

describe('sortSpreadsheetRowsBySheetSettings', () => {
  it('falls back to backend row ids when persisted rows share a duplicate client row id', () => {
    const rows = [
      {
        _id: 'client_duplicate',
        _rowUuid: '83c21db0-99b0-45c4-bc54-a2571d860c41',
        _clientRowId: 'client_duplicate',
        column_c: 'old'
      },
      {
        _id: 'client_duplicate',
        _rowUuid: '209ed253-0768-4582-a1f3-3b5e151971d4',
        _clientRowId: 'client_duplicate',
        column_c: 'new'
      }
    ]

    expect(sortSpreadsheetRowsBySheetSettings(rows)).toEqual([
      {
        _id: '83c21db0-99b0-45c4-bc54-a2571d860c41',
        _rowUuid: '83c21db0-99b0-45c4-bc54-a2571d860c41',
        _clientRowId: 'client_duplicate',
        column_c: 'old'
      },
      {
        _id: '209ed253-0768-4582-a1f3-3b5e151971d4',
        _rowUuid: '209ed253-0768-4582-a1f3-3b5e151971d4',
        _clientRowId: 'client_duplicate',
        column_c: 'new'
      }
    ])
  })
})
