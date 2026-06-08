import { applyRemoteColumnReorderOnGrid } from '../applyRemoteColumnReorderOnGrid'
import type { SpreadsheetColumn } from '../../types/spreadsheet'

const column = (id: string, order: number): SpreadsheetColumn => ({
  id,
  name: id,
  label: id,
  type: 'text',
  order,
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  width: 100
})

describe('applyRemoteColumnReorderOnGrid', () => {
  it('passes a column range so move-cols does not depend on the active selection', () => {
    const syncExecuteCommand = jest.fn(() => true)
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]

    const result = applyRemoteColumnReorderOnGrid({
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
      previousColumns: previous,
      nextColumns: next,
      rows: [{ _id: 'row-1', a: '1', b: '2', c: '3' }]
    })

    expect(result).toEqual({ ok: true, moveCount: 1, appliedMoveCount: 1, status: 'moves_applied' })
    expect(syncExecuteCommand).toHaveBeenCalledWith(
      'sheet.command.move-cols',
      expect.objectContaining({
        unitId: 'unit-1',
        subUnitId: 'sheet-1',
        range: expect.objectContaining({
          rangeType: 2,
          startColumn: 2,
          endColumn: 2
        }),
        fromRange: expect.objectContaining({ startColumn: 2, endColumn: 2 }),
        toRange: expect.objectContaining({ startColumn: 1, endColumn: 1 })
      })
    )
  })

  it('reports failure when move-cols returns false', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]

    const result = applyRemoteColumnReorderOnGrid({
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
      previousColumns: previous,
      nextColumns: next,
      rows: []
    })

    expect(result).toEqual({ ok: false, reason: 'move_cols_command_failed' })
  })

  it('reports unplannable_reorder when the target order cannot be reached from planned moves', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('d', 2)]
    const syncExecuteCommand = jest.fn(() => true)

    const result = applyRemoteColumnReorderOnGrid({
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
      previousColumns: previous,
      nextColumns: next,
      rows: []
    })

    expect(result).toEqual({ ok: false, reason: 'unplannable_reorder' })
    expect(syncExecuteCommand).not.toHaveBeenCalled()
  })

  it('reports partial_move_failure when only some move-cols commands succeed', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2), column('d', 3)]
    const next = [column('d', 0), column('c', 1), column('a', 2), column('b', 3)]
    const syncExecuteCommand = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false)

    const result = applyRemoteColumnReorderOnGrid({
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
      previousColumns: previous,
      nextColumns: next,
      rows: []
    })

    expect(result).toEqual({ ok: false, reason: 'partial_move_failure' })
    expect(syncExecuteCommand).toHaveBeenCalledTimes(2)
  })

  it('treats an already matching visible order as a healthy no-op', () => {
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('b', 1), column('c', 2)]

    const result = applyRemoteColumnReorderOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          setActiveSheet: jest.fn()
        }),
        syncExecuteCommand: jest.fn(() => true)
      },
      sheetId: 'sheet-1',
      previousColumns: previous,
      nextColumns: next,
      rows: []
    })

    expect(result).toEqual({ ok: true, moveCount: 0, appliedMoveCount: 0, status: 'already_in_order' })
  })

  it('blocks native move-cols when the source move would split a merge', () => {
    const syncExecuteCommand = jest.fn(() => true)
    const previous = [column('a', 0), column('b', 1), column('c', 2)]
    const next = [column('a', 0), column('c', 1), column('b', 2)]

    const result = applyRemoteColumnReorderOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          save: () => ({
            sheets: {
              'sheet-1': {
                mergeData: [{ startRow: 6, endRow: 14, startColumn: 1, endColumn: 2 }]
              }
            }
          }),
          setActiveSheet: jest.fn()
        }),
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      previousColumns: previous,
      nextColumns: next,
      rows: []
    })

    expect(result).toEqual({ ok: false, reason: 'move_cols_merge_unsupported' })
    expect(syncExecuteCommand).not.toHaveBeenCalled()
  })

  it('allows native move-cols when an explicit move carries a whole merged block', () => {
    const syncExecuteCommand = jest.fn(() => true)
    const previous = [column('a', 0), column('b', 1), column('c', 2), column('d', 3)]
    const next = [column('b', 0), column('c', 1), column('a', 2), column('d', 3)]

    const result = applyRemoteColumnReorderOnGrid({
      api: {
        getActiveWorkbook: () => ({
          getUnitId: () => 'unit-1',
          getSheetBySheetId: () => ({
            getMaxRows: () => 100,
            getMaxColumns: () => 10
          }),
          save: () => ({
            sheets: {
              'sheet-1': {
                mergeData: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }]
              }
            }
          }),
          setActiveSheet: jest.fn()
        }),
        syncExecuteCommand
      },
      sheetId: 'sheet-1',
      previousColumns: previous,
      nextColumns: next,
      rows: [],
      moves: [{ sourceStartColumn: 1, count: 2, destinationStartColumn: 0 }]
    })

    expect(result).toEqual({ ok: true, moveCount: 1, appliedMoveCount: 1, status: 'moves_applied' })
    expect(syncExecuteCommand).toHaveBeenCalledWith(
      'sheet.command.move-cols',
      expect.objectContaining({
        fromRange: expect.objectContaining({ startColumn: 1, endColumn: 2 }),
        toRange: expect.objectContaining({ startColumn: 0, endColumn: 1 })
      })
    )
  })
})
