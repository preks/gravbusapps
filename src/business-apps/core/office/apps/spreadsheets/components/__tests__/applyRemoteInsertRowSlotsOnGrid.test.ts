import { applyRemoteInsertRowSlotsOnGrid } from '../applyRemoteInsertRowSlotsOnGrid'

describe('applyRemoteInsertRowSlotsOnGrid', () => {
  it('runs sheet.mutation.insert-row at the committed slot', () => {
    const syncExecuteCommand = jest.fn(() => true)

    const result = applyRemoteInsertRowSlotsOnGrid({
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
      insert: { startGridRowIndex: 1, count: 3 },
      visibleColumnCount: 4
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenCalledWith(
      'sheet.mutation.insert-row',
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

  it('reports failure when insert-row mutation returns false', () => {
    const result = applyRemoteInsertRowSlotsOnGrid({
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
      insert: { startGridRowIndex: 2, count: 1 },
      visibleColumnCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'insert_row_mutation_failed' })
  })

  it('rejects async executeCommand — structural applies require syncExecuteCommand', () => {
    const result = applyRemoteInsertRowSlotsOnGrid({
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
      insert: { startGridRowIndex: 0, count: 1 },
      visibleColumnCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'missing_sync_execute_command' })
  })

  it('rejects when syncExecuteCommand returns a promise', () => {
    const result = applyRemoteInsertRowSlotsOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          setActiveSheet: jest.fn()
        }),
        syncExecuteCommand: jest.fn(() => Promise.resolve(true))
      },
      sheetId: 'sheet-1',
      insert: { startGridRowIndex: 0, count: 1 },
      visibleColumnCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'insert_row_mutation_failed' })
  })

  it('treats syncExecuteCommand throw (async command handler) as mutation failure', () => {
    const result = applyRemoteInsertRowSlotsOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          setActiveSheet: jest.fn()
        }),
        syncExecuteCommand: jest.fn(() => {
          throw new TypeError('[CommandService]: Command handler should not return a promise.')
        })
      },
      sheetId: 'sheet-1',
      insert: { startGridRowIndex: 0, count: 1 },
      visibleColumnCount: 1
    })

    expect(result).toEqual({ ok: false, reason: 'insert_row_mutation_failed' })
  })
})
