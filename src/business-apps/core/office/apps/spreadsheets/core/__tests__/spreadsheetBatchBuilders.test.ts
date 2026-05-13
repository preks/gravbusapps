import {
  buildCellPersistenceOperations,
  buildOperationsFromMutationPlan,
  normalizeCellValueForBatchPersistence,
  SPREADSHEET_MAX_SET_RANGE_CELLS_PER_OPERATION,
  SPREADSHEET_MAX_SET_STYLE_CELLS_PER_OPERATION
} from '../spreadsheetBatchBuilders'

describe('spreadsheetBatchBuilders', () => {
  it('normalizes formula strings into batch persistence payloads', () => {
    expect(normalizeCellValueForBatchPersistence('=SUM(A1:A2)')).toEqual({
      f: '=SUM(A1:A2)'
    })
    expect(normalizeCellValueForBatchPersistence('plain value')).toBe('plain value')
    expect(normalizeCellValueForBatchPersistence({ f: 'SUM(A1:A2)', v: 3 })).toEqual({
      f: '=SUM(A1:A2)',
      v: 3
    })
  })

  it('builds a set_range op when clear cells should collapse into the batch payload', () => {
    const createOperationId = jest.fn().mockReturnValueOnce('set-range-1')

    const operations = buildCellPersistenceOperations({
      setUpdatesByBackendRowId: new Map([['row-1', { ColumnA: 'value' }]]),
      clearCells: [{ rowId: 'row-2', columnName: 'ColumnB' }],
      createOperationId,
      maxIndividualClearCellOps: 0
    })

    expect(operations).toEqual([
      {
        operationId: 'set-range-1',
        type: 'set_range',
        data: {
          cells: [
            { rowId: 'row-1', columnName: 'ColumnA', value: 'value' },
            { rowId: 'row-2', columnName: 'ColumnB', value: null }
          ]
        }
      }
    ])
  })

  it('builds individual clear_cell ops when the clear threshold is not exceeded', () => {
    const createOperationId = jest
      .fn()
      .mockReturnValueOnce('set-range-1')
      .mockReturnValueOnce('clear-cell-1')
      .mockReturnValueOnce('clear-cell-2')

    const operations = buildCellPersistenceOperations({
      setUpdatesByBackendRowId: new Map([['row-1', { ColumnA: '=SUM(A1:A2)' }]]),
      clearCells: [
        { rowId: 'row-2', columnName: 'ColumnB' },
        { rowId: 'row-3', columnName: 'ColumnC' }
      ],
      createOperationId,
      maxIndividualClearCellOps: 10
    })

    expect(operations).toEqual([
      {
        operationId: 'set-range-1',
        type: 'set_range',
        data: {
          cells: [{ rowId: 'row-1', columnName: 'ColumnA', value: { f: '=SUM(A1:A2)' } }]
        }
      },
      {
        operationId: 'clear-cell-1',
        type: 'clear_cell',
        data: { rowId: 'row-2', columnName: 'ColumnB' }
      },
      {
        operationId: 'clear-cell-2',
        type: 'clear_cell',
        data: { rowId: 'row-3', columnName: 'ColumnC' }
      }
    ])
  })

  it('splits large set_style payloads into bounded chunks after value operations', () => {
    const styleCellCount = 50000
    let sequence = 0
    const operations = buildOperationsFromMutationPlan({
      plan: {
        sheetId: 'sheet-1',
        traceId: 'trace-large-style',
        styles: {
          'style-a': { bg: { rgb: '#00ff00' } },
          'style-b': { cl: { rgb: '#ff0000' } }
        },
        cells: Array.from({ length: styleCellCount }, (_, index) => ({
          rowId: `row-${index}`,
          columnName: 'ColumnA',
          rowIndex: index,
          colIndex: 0,
          valueAction: index === 0 ? 'set' : 'none',
          value: index === 0 ? 'first value' : undefined,
          stylePatch: { set: { s: index % 2 === 0 ? 'style-a' : 'style-b' } }
        }))
      },
      createOperationId: prefix => `${prefix}-${++sequence}`,
      maxIndividualClearCellOps: 100
    })

    expect(operations[0]?.type).toBe('set_range')
    const styleOps = operations.filter(operation => operation.type === 'set_style')
    expect(styleOps).toHaveLength(Math.ceil(styleCellCount / SPREADSHEET_MAX_SET_STYLE_CELLS_PER_OPERATION))
    expect(
      styleOps.every(operation => {
        const cells = (operation.data as { cells?: unknown[] }).cells ?? []
        return cells.length > 0 && cells.length <= SPREADSHEET_MAX_SET_STYLE_CELLS_PER_OPERATION
      })
    ).toBe(true)
    expect(
      styleOps.reduce((sum, operation) => sum + ((operation.data as { cells?: unknown[] }).cells?.length ?? 0), 0)
    ).toBe(styleCellCount)
    expect((styleOps[0]?.data as { styles?: Record<string, unknown> }).styles).toEqual({
      'style-a': { bg: { rgb: '#00ff00' } },
      'style-b': { cl: { rgb: '#ff0000' } }
    })
  })

  it('splits large set_range cell lists into bounded chunks', () => {
    const cellCount = SPREADSHEET_MAX_SET_RANGE_CELLS_PER_OPERATION + 50
    let sequence = 0
    const operations = buildOperationsFromMutationPlan({
      plan: {
        sheetId: 'sheet-1',
        cells: Array.from({ length: cellCount }, (_, index) => ({
          rowId: `row-${index}`,
          columnName: 'ColumnA',
          rowIndex: index,
          colIndex: 0,
          valueAction: 'set' as const,
          value: index
        }))
      },
      createOperationId: prefix => `${prefix}-${++sequence}`,
      maxIndividualClearCellOps: 100
    })
    const setRangeOps = operations.filter(operation => operation.type === 'set_range')
    expect(setRangeOps.length).toBe(Math.ceil(cellCount / SPREADSHEET_MAX_SET_RANGE_CELLS_PER_OPERATION))
    expect(
      setRangeOps.reduce((sum, operation) => sum + ((operation.data as { cells?: unknown[] }).cells?.length ?? 0), 0)
    ).toBe(cellCount)
    expect(
      setRangeOps.every(operation => {
        const cells = (operation.data as { cells?: unknown[] }).cells ?? []
        return cells.length > 0 && cells.length <= SPREADSHEET_MAX_SET_RANGE_CELLS_PER_OPERATION
      })
    ).toBe(true)
  })
})
