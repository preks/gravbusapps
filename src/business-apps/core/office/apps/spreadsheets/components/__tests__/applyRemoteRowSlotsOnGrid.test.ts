import { applyRemoteRowSlotsOnGrid } from '../applyRemoteRowSlotsOnGrid'

describe('applyRemoteRowSlotsOnGrid', () => {
  it('passes fromRange and toRange so move-rows does not depend on the active selection', () => {
    const syncExecuteCommand = jest.fn(() => true)

    const result = applyRemoteRowSlotsOnGrid({
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
      move: {
        sourceStartGridRowIndex: 2,
        count: 16,
        destinationGridRowIndex: 1
      },
      rows: [{ _id: 'row-1' }],
      visibleColumnCount: 4
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenCalledWith(
      'sheet.command.move-rows',
      expect.objectContaining({
        unitId: 'unit-1',
        subUnitId: 'sheet-1',
        range: expect.objectContaining({
          rangeType: 1,
          startRow: 2,
          endRow: 17
        }),
        fromRange: expect.objectContaining({ startRow: 2, endRow: 17, startColumn: 0, endColumn: 9 }),
        toRange: expect.objectContaining({ startRow: 1, endRow: 16, startColumn: 0, endColumn: 9 })
      })
    )
  })

  it('reports failure when move-rows returns false', () => {
    const result = applyRemoteRowSlotsOnGrid({
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
      move: {
        sourceStartGridRowIndex: 2,
        count: 1,
        destinationGridRowIndex: 10
      },
      rows: [],
      visibleColumnCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'move_rows_command_failed' })
  })
})
