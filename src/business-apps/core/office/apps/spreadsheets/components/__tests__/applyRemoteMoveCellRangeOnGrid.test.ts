import { applyRemoteMoveCellRangeOnGrid } from '../applyRemoteMoveCellRangeOnGrid'

const mockWorkbook = () => ({
  getUnitId: () => 'unit-1',
  getSheetBySheetId: () => ({}),
  setActiveSheet: jest.fn()
})

describe('applyRemoteMoveCellRangeOnGrid', () => {
  it('runs sheet.command.move-range with unitId, subUnitId, fromRange, and toRange', () => {
    const syncExecuteCommand = jest.fn(() => true)

    const result = applyRemoteMoveCellRangeOnGrid({
      api: {
        getActiveWorkbook: mockWorkbook,
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      visibleColumnCount: 10,
      fromRange: { startRow: 4, endRow: 4, startColumn: 7, endColumn: 7 },
      toRange: { startRow: 6, endRow: 6, startColumn: 6, endColumn: 6 }
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenCalledWith('sheet.command.move-range', {
      unitId: 'unit-1',
      subUnitId: 'sheet-1',
      fromRange: { startRow: 4, endRow: 4, startColumn: 7, endColumn: 7 },
      toRange: { startRow: 6, endRow: 6, startColumn: 6, endColumn: 6 }
    })
    expect(syncExecuteCommand).toHaveBeenCalledTimes(1)
  })

  it('rejects ranges outside the visible column count before calling Univer', () => {
    const syncExecuteCommand = jest.fn(() => true)

    const result = applyRemoteMoveCellRangeOnGrid({
      api: {
        getActiveWorkbook: mockWorkbook,
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      visibleColumnCount: 3,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 0, endRow: 0, startColumn: 5, endColumn: 5 }
    })

    expect(result).toEqual({ ok: false, reason: 'invalid_visible_grid_range:column_out_of_bounds' })
    expect(syncExecuteCommand).not.toHaveBeenCalled()
  })

  it('falls back to sheet.mutation.move-range when the command returns false', () => {
    const syncExecuteCommand = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)

    const result = applyRemoteMoveCellRangeOnGrid({
      api: {
        getActiveWorkbook: mockWorkbook,
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      visibleColumnCount: 4,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 }
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenNthCalledWith(1, 'sheet.command.move-range', expect.any(Object))
    expect(syncExecuteCommand).toHaveBeenNthCalledWith(2, 'sheet.mutation.move-range', expect.any(Object))
  })

  it('falls back to sheet.mutation.move-cell for single-cell moves when range command and mutation fail', () => {
    const syncExecuteCommand = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValueOnce(true)

    const result = applyRemoteMoveCellRangeOnGrid({
      api: {
        getActiveWorkbook: mockWorkbook,
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      visibleColumnCount: 10,
      fromRange: { startRow: 4, endRow: 4, startColumn: 7, endColumn: 7 },
      toRange: { startRow: 6, endRow: 6, startColumn: 6, endColumn: 6 }
    })

    expect(result).toEqual({ ok: true })
    expect(syncExecuteCommand).toHaveBeenNthCalledWith(3, 'sheet.mutation.move-cell', {
      unitId: 'unit-1',
      subUnitId: 'sheet-1',
      from: { row: 4, column: 7 },
      to: { row: 6, column: 6 }
    })
  })

  it('does not try move-cell mutation for multi-cell rectangles', () => {
    const syncExecuteCommand = jest.fn(() => false)

    applyRemoteMoveCellRangeOnGrid({
      api: {
        getActiveWorkbook: mockWorkbook,
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      visibleColumnCount: 4,
      fromRange: { startRow: 0, endRow: 1, startColumn: 0, endColumn: 1 },
      toRange: { startRow: 2, endRow: 3, startColumn: 2, endColumn: 3 }
    })

    expect(syncExecuteCommand).toHaveBeenCalledTimes(2)
    expect(syncExecuteCommand).not.toHaveBeenCalledWith('sheet.mutation.move-cell', expect.anything())
  })

  it('reports failure when all structural attempts fail', () => {
    const result = applyRemoteMoveCellRangeOnGrid({
      api: {
        getActiveWorkbook: mockWorkbook,
        syncExecuteCommand: jest.fn(() => false)
      },
      sheetId: 'sheet-1',
      visibleColumnCount: 4,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }
    })

    expect(result).toEqual({ ok: false, reason: 'move_range_command_failed' })
  })

  it('rejects async executeCommand — structural applies require syncExecuteCommand', () => {
    const result = applyRemoteMoveCellRangeOnGrid({
      api: {
        getActiveWorkbook: mockWorkbook,
        executeCommand: jest.fn(async () => true)
      },
      sheetId: 'sheet-1',
      visibleColumnCount: 4,
      fromRange: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 },
      toRange: { startRow: 0, endRow: 0, startColumn: 1, endColumn: 1 }
    })

    expect(result).toEqual({ ok: false, reason: 'missing_sync_execute_command' })
  })
})
