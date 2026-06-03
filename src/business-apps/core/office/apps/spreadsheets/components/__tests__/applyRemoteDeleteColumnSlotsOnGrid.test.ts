import { applyRemoteDeleteColumnSlotsOnGrid } from '../applyRemoteDeleteColumnSlotsOnGrid'

describe('applyRemoteDeleteColumnSlotsOnGrid', () => {
  it('runs sheet.mutation.remove-col at the committed slot', () => {
    const syncExecuteCommand = jest.fn(() => true)

    const result = applyRemoteDeleteColumnSlotsOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          setActiveSheet: jest.fn()
        }),
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      deleteSlots: { startGridColumnIndex: 1, count: 3 },
      rowCount: 20
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenCalledWith(
      'sheet.mutation.remove-col',
      expect.objectContaining({
        unitId: 'unit-1',
        subUnitId: 'sheet-1',
        range: expect.objectContaining({
          startRow: 0,
          endRow: 99,
          startColumn: 1,
          endColumn: 3
        })
      })
    )
  })

  it('reports failure when remove-col mutation returns false', () => {
    const result = applyRemoteDeleteColumnSlotsOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          setActiveSheet: jest.fn()
        }),
        syncExecuteCommand: jest.fn(() => false)
      },
      sheetId: 'sheet-1',
      deleteSlots: { startGridColumnIndex: 2, count: 1 },
      rowCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'remove_col_mutation_failed' })
  })
})
