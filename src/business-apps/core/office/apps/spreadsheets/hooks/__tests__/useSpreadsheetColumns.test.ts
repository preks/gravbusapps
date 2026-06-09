import { act, renderHook } from '@testing-library/react'
import { useSpreadsheetColumns } from '../useSpreadsheetColumns'
import type { SpreadsheetApp, SpreadsheetColumn, SpreadsheetMergeRange, SpreadsheetSheet } from '../../types'

const column = (id: string, name: string, order: number, width = 150): SpreadsheetColumn => ({
  id,
  name,
  label: name.toUpperCase(),
  type: 'text',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  width,
  order
})

const makeSheet = (columns: SpreadsheetColumn[], mergeData?: SpreadsheetMergeRange[]): SpreadsheetSheet => ({
  id: 'sheet-1',
  name: 'Sheet 1',
  viewType: 'table',
  columns,
  views: [],
  data: [{ _id: 'row-1', column_a: 'A', column_e: 'E' }],
  settings: mergeData ? { mergeData } : {}
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
        data: expect.objectContaining({ sheetId: 'sheet-1', columnId: 'col-b' })
      })
    )
  })

  it('moves visible columns right using original-grid destination semantics', () => {
    const columns = [
      column('col-a', 'column_a', 0),
      column('col-b', 'column_b', 1),
      { ...column('col-hidden', 'column_hidden', 2), isVisible: false },
      column('col-c', 'column_c', 3),
      column('col-d', 'column_d', 4)
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
      result.current.handleColumnsMove(1, 1, 3)
    })

    const updatedColumns = onAppUpdate.mock.calls[0][0].sheets[0].columns as SpreadsheetColumn[]
    expect(updatedColumns.map(col => `${col.id}:${col.order}`)).toEqual([
      'col-a:0',
      'col-hidden:1',
      'col-c:2',
      'col-b:3',
      'col-d:4'
    ])
    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'columns_reorder',
        data: expect.objectContaining({
          sheetId: 'sheet-1',
          columns: expect.arrayContaining([expect.objectContaining({ id: 'col-b', order: 3 })])
        })
      })
    )
  })

  it('emits reordered columns with effective width overrides instead of stale base widths', () => {
    const columns = [
      column('col-a', 'column_a', 0, 100),
      column('col-b', 'column_b', 1, 100),
      column('col-c', 'column_c', 2, 100)
    ]
    const effectiveColumns = [
      column('col-a', 'column_a', 0, 220),
      column('col-b', 'column_b', 1, 180),
      column('col-c', 'column_c', 2, 140)
    ]
    const sheet = makeSheet(columns)
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        effectiveActiveSheetColumns: effectiveColumns,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsMove(1, 1, 0)
    })

    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'columns_reorder',
        data: expect.objectContaining({
          columns: expect.arrayContaining([
            expect.objectContaining({ id: 'col-a', width: 220 }),
            expect.objectContaining({ id: 'col-b', width: 180 }),
            expect.objectContaining({ id: 'col-c', width: 140 })
          ])
        })
      })
    )
  })

  it('inherits nearby effective width for inserted columns', () => {
    const columns = [column('col-a', 'column_a', 0, 100), column('col-b', 'column_b', 1, 100)]
    const effectiveColumns = [column('col-a', 'column_a', 0, 240), column('col-b', 'column_b', 1, 180)]
    const sheet = makeSheet(columns)
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        effectiveActiveSheetColumns: effectiveColumns,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsInsert(0, 1, 'lefttop')
    })

    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'column_add',
        data: expect.objectContaining({
          column: expect.objectContaining({ width: 240 })
        })
      })
    )
  })

  it('moves visible columns left without changing hidden-column placement', () => {
    const columns = [
      column('col-a', 'column_a', 0),
      { ...column('col-hidden', 'column_hidden', 1), isVisible: false },
      column('col-b', 'column_b', 2),
      column('col-c', 'column_c', 3),
      column('col-d', 'column_d', 4)
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
      result.current.handleColumnsMove(2, 1, 0)
    })

    const updatedColumns = onAppUpdate.mock.calls[0][0].sheets[0].columns as SpreadsheetColumn[]
    expect(updatedColumns.map(col => `${col.id}:${col.order}`)).toEqual([
      'col-c:0',
      'col-a:1',
      'col-hidden:2',
      'col-b:3',
      'col-d:4'
    ])
    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'columns_reorder',
        data: expect.objectContaining({
          sheetId: 'sheet-1',
          columns: expect.arrayContaining([expect.objectContaining({ id: 'col-c', order: 0 })])
        })
      })
    )
  })

  it('blocks column moves that would split a merged range', () => {
    const columns = [column('col-a', 'column_a', 0), column('col-b', 'column_b', 1), column('col-c', 'column_c', 2)]
    const sheet = makeSheet(columns, [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }])
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const onBlockedColumnReorder = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        onBlockedColumnReorder,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsMove(2, 1, 1)
    })

    expect(onAppUpdate).not.toHaveBeenCalled()
    expect(emitColumnBatchOperation).not.toHaveBeenCalled()
    expect(onBlockedColumnReorder).toHaveBeenCalledWith('source_partially_spans_merge')
  })

  it('blocks column moves when merge ranges only exist in worksheetSnapshot', () => {
    const columns = [column('col-a', 'column_a', 0), column('col-b', 'column_b', 1), column('col-c', 'column_c', 2)]
    const sheet = {
      ...makeSheet(columns),
      worksheetSnapshot: {
        mergeData: [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }]
      }
    } as SpreadsheetSheet
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const onBlockedColumnReorder = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        onBlockedColumnReorder,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsMove(2, 1, 1)
    })

    expect(onAppUpdate).not.toHaveBeenCalled()
    expect(emitColumnBatchOperation).not.toHaveBeenCalled()
    expect(onBlockedColumnReorder).toHaveBeenCalledWith('source_partially_spans_merge')
  })

  it('blocks rightward column moves that cross a merge span', () => {
    const columns = [
      column('col-a', 'column_a', 0),
      column('col-b', 'column_b', 1),
      column('col-c', 'column_c', 2),
      column('col-d', 'column_d', 3),
      column('col-e', 'column_e', 4)
    ]
    const sheet = makeSheet(columns, [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 3 }])
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const onBlockedColumnReorder = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        onBlockedColumnReorder,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsMove(1, 1, 5)
    })

    expect(onAppUpdate).not.toHaveBeenCalled()
    expect(emitColumnBatchOperation).not.toHaveBeenCalled()
    expect(onBlockedColumnReorder).toHaveBeenCalledWith('shifted_range_intersects_merge')
  })

  it('blocks rightward column moves when only the raw destination path crosses a merge span', () => {
    const columns = Array.from({ length: 12 }, (_, index) => column(`col-${index}`, `column_${index}`, index))
    const sheet = makeSheet(columns, [{ startRow: 0, endRow: 0, startColumn: 10, endColumn: 11 }])
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const onBlockedColumnReorder = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        onBlockedColumnReorder,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsMove(8, 1, 10)
    })

    expect(onAppUpdate).not.toHaveBeenCalled()
    expect(emitColumnBatchOperation).not.toHaveBeenCalled()
    expect(onBlockedColumnReorder).toHaveBeenCalledWith('shifted_range_intersects_merge')
  })

  it('allows moving a whole merged column block when the explicit move fully contains it', () => {
    const columns = [
      column('col-a', 'column_a', 0),
      column('col-b', 'column_b', 1),
      column('col-c', 'column_c', 2),
      column('col-d', 'column_d', 3)
    ]
    const sheet = makeSheet(columns, [{ startRow: 0, endRow: 0, startColumn: 1, endColumn: 2 }])
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const onBlockedColumnReorder = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: sheet.data },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: jest.fn() },
        onAppUpdate,
        onBlockedColumnReorder,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsMove(1, 2, 0)
    })

    const updatedColumns = onAppUpdate.mock.calls[0][0].sheets[0].columns as SpreadsheetColumn[]
    expect(updatedColumns.map(col => `${col.id}:${col.order}`)).toEqual(['col-b:0', 'col-c:1', 'col-a:2', 'col-d:3'])
    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'columns_reorder',
        data: expect.objectContaining({
          count: 2,
          normalizedDestinationIndex: 0
        })
      })
    )
    expect(onBlockedColumnReorder).not.toHaveBeenCalled()
  })

  it('emits explicit move indices for handleReorderColumns when the drag is a single native-equivalent move', () => {
    const columns = [
      column('col-a', 'column_a', 0),
      column('col-b', 'column_b', 1),
      column('col-c', 'column_c', 2),
      column('col-d', 'column_d', 3)
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
      result.current.handleReorderColumns('col-b', 'col-d')
    })

    expect(emitColumnBatchOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'columns_reorder',
        data: expect.objectContaining({
          sheetId: 'sheet-1',
          sourceStartIndex: 1,
          count: 1,
          normalizedDestinationIndex: 3,
          destinationIndex: 4
        })
      })
    )
  })

  it('does not auto-create another column for an immediate edit in a freshly inserted structural slot', async () => {
    const columns = [
      column('col-a', 'column_a', 0),
      column('col-b', 'column_b', 1),
      column('col-c', 'column_c', 2),
      column('col-d', 'column_d', 3)
    ]
    const sheet = makeSheet(columns)
    const onAppUpdate = jest.fn()
    const emitColumnBatchOperation = jest.fn()
    const commitOptimisticActiveSheetRows = jest.fn()
    const handleCellChange = jest.fn()

    const { result } = renderHook(() =>
      useSpreadsheetColumns({
        app: makeApp(sheet),
        activeSheet: sheet,
        localSheetDataRef: { current: [{ _id: 'row-1', column_a: 'A', column_b: 'B', column_c: 'C', column_d: 'D' }] },
        commitOptimisticActiveSheetRows,
        handleCellChangeRef: { current: handleCellChange },
        onAppUpdate,
        emitColumnBatchOperation
      })
    )

    act(() => {
      result.current.handleColumnsInsert(1, 1, 'rightbottom')
    })

    const insertedColumn = (onAppUpdate.mock.calls[0][0].sheets[0].columns as SpreadsheetColumn[])[2]

    await act(async () => {
      await result.current.handleAutoColumnAdd(2, 'typed', 0)
    })

    expect(handleCellChange).toHaveBeenCalledWith('row-1', insertedColumn.name, 'typed')
    expect(emitColumnBatchOperation).toHaveBeenCalledTimes(1)
    expect(emitColumnBatchOperation).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: 'column_add',
        data: expect.objectContaining({
          sheetId: 'sheet-1',
          column: expect.objectContaining({ name: insertedColumn.name, order: 2 })
        })
      })
    )
  })
})
