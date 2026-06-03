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

    expect(result).toEqual({ ok: true, moveCount: 1, appliedMoveCount: 1 })
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
})
