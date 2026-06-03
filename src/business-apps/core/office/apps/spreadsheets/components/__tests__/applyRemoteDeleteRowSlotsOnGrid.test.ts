import { applyRemoteDeleteRowSlotsOnGrid } from '../applyRemoteDeleteRowSlotsOnGrid'

describe('applyRemoteDeleteRowSlotsOnGrid', () => {
  it('runs sheet.mutation.remove-rows at the committed slot', () => {
    const syncExecuteCommand = jest.fn(() => true)

    const result = applyRemoteDeleteRowSlotsOnGrid({
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
      deleteSlots: { startGridRowIndex: 1, count: 3 },
      visibleColumnCount: 4
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenCalledWith(
      'sheet.mutation.remove-rows',
      expect.objectContaining({
        unitId: 'unit-1',
        subUnitId: 'sheet-1',
        range: expect.objectContaining({
          startRow: 1,
          endRow: 3,
          startColumn: 0,
          endColumn: 9
        })
      })
    )
  })

  it('reports failure when remove-rows mutation returns false', () => {
    const result = applyRemoteDeleteRowSlotsOnGrid({
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
      deleteSlots: { startGridRowIndex: 2, count: 1 },
      visibleColumnCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'remove_rows_mutation_failed' })
  })

  it('rejects async executeCommand — structural applies require syncExecuteCommand', () => {
    const result = applyRemoteDeleteRowSlotsOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          setActiveSheet: jest.fn()
        }),
        executeCommand: jest.fn(async () => true)
      },
      sheetId: 'sheet-1',
      deleteSlots: { startGridRowIndex: 0, count: 1 },
      visibleColumnCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'missing_sync_execute_command' })
  })
})
