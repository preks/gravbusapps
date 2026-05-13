import { act, renderHook } from '@testing-library/react'
import { useSpreadsheetColumns } from '../useSpreadsheetColumns'
import type { SpreadsheetApp, SpreadsheetColumn, SpreadsheetSheet } from '../../types'

const column = (id: string, name: string, order: number): SpreadsheetColumn => ({
  id,
  name,
  label: name.toUpperCase(),
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order
})

const makeSheet = (columns: SpreadsheetColumn[]): SpreadsheetSheet => ({
  id: 'sheet-1',
  name: 'Sheet 1',
  viewType: 'table',
  columns,
  views: [],
  data: [{ _id: 'row-1', column_a: 'A', column_e: 'E' }],
  settings: {}
})

const makeApp = (sheet: SpreadsheetSheet): SpreadsheetApp =>
  ({
    id: 'app-1',
    name: 'App',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
    createdBy: 'user-1',
    sheets: [sheet],
    sharedWith: []
  }) as SpreadsheetApp

describe('useSpreadsheetColumns', () => {
  it('inserts between existing columns without changing following column identity', () => {
    const columns = [
      column('col-a', 'column_a', 0),
      column('col-b', 'column_b', 1),
      column('col-c', 'column_c', 2),
      column('col-d', 'column_d', 3),
      column('col-e', 'column_e', 4)
    ]
    const sheet = makeSheet(columns)
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()

    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsInsert(3, 1, 'rightbottom')
    })

    const updatedColumns = onAppUpdate.mock.calls[0][0].sheets[0].columns as SpreadsheetColumn[]
    expect(updatedColumns.map(col => col.id)).toEqual(['col-a', 'col-b', 'col-c', 'col-d', expect.any(String), 'col-e'])
    expect(updatedColumns.find(col => col.id === 'col-e')).toMatchObject({ name: 'column_e', order: 5 })
    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'column_add',
        data: expect.objectContaining({
          sheetId: 'sheet-1',
          column: expect.objectContaining({ order: 4 })
        })
      })
    )
  })

  it('deletes visible columns without changing remaining column ids or order', () => {
    const columns = [column('col-a', 'column_a', 0), column('col-b', 'column_b', 1), column('col-c', 'column_c', 2)]
    const sheet = makeSheet(columns)
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: [{ _id: 'row-1', column_a: 'A', column_b: 'B', column_c: 'C' }] },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsDelete(1, 1)
    })

    const updatedColumns = onAppUpdate.mock.calls[0][0].sheets[0].columns as SpreadsheetColumn[]
    expect(updatedColumns.map(col => `${col.id}:${col.order}`)).toEqual(['col-a:0', 'col-c:1'])
    expect(commitOptimisticActiveSheetRows).toHaveBeenCalledWith([{ _id: 'row-1', column_a: 'A', column_c: 'C' }])
    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'column_delete',
        data: { sheetId: 'sheet-1', columnId: 'col-b' }
      })
    )
  })
})
