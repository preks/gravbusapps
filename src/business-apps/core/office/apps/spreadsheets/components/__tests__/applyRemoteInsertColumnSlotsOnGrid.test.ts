import { applyRemoteInsertColumnSlotsOnGrid } from '../applyRemoteInsertColumnSlotsOnGrid'

describe('applyRemoteInsertColumnSlotsOnGrid', () => {
  it('runs sheet.mutation.insert-col at the committed slot', () => {
    const syncExecuteCommand = jest.fn(() => true)
    const getActiveSheet = jest.fn(() => ({ getSheetId: () => 'sheet-1' }))
    const api = {
      getActiveWorkbook: () => ({
        getUnitId: () => 'unit-1',
        getSheetBySheetId: () => ({}),
        getActiveSheet,
        setActiveSheet: jest.fn()
      }),
      syncExecuteCommand
    }

    const result = applyRemoteInsertColumnSlotsOnGrid({
      api,
      sheetId: 'sheet-1',
      insert: { startGridColumnIndex: 2, count: 1 },
      rowCount: 10
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenCalledWith(
      'sheet.mutation.insert-col',
      expect.objectContaining({
        unitId: 'unit-1',
        subUnitId: 'sheet-1',
        range: {
          startRow: 0,
          endRow: 9,
          startColumn: 2,
          endColumn: 2
        }
      })
    )
  })

  it('returns ok when count is zero', () => {
    const result = applyRemoteInsertColumnSlotsOnGrid({
      api: { syncExecuteCommand: jest.fn() },
      sheetId: 'sheet-1',
      insert: { startGridColumnIndex: 0, count: 0 },
      rowCount: 1
    })
    expect(result).toEqual({ ok: true })
  })
})
