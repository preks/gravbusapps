import {
  buildCellPersistenceOperations,
  buildOperationsFromMutationPlan,
  normalizeCellValueForBatchPersistence,
  normalizeUniverCellForRowPersistence,
  SPREADSHEET_MAX_SET_RANGE_CELLS_PER_OPERATION,
  SPREADSHEET_MAX_SET_STYLE_CELLS_PER_OPERATION
} from '../spreadsheetBatchBuilders'
import type { SpreadsheetColumn } from '../../types'

const numericColumn: SpreadsheetColumn = {
  id: 'amount',
  name: 'amount',
  label: 'Amount',
  type: 'number',
  isVisible: true,
  isEditable: true,
  isRequired: false,
  isUnique: false,
  order: 0
}

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

  it('strips inline Univer formatting from row persistence payloads', () => {
    expect(normalizeUniverCellForRowPersistence({ v: 1, s: 'x', ff: 'Arial', fs: 12 })).toEqual({ v: 1 })
    expect(normalizeUniverCellForRowPersistence({ s: 'style-only' })).toBeUndefined()
  })

  it('preserves typed metadata and coerces numeric strings for numeric columns', () => {
    expect(normalizeCellValueForBatchPersistence('42', numericColumn)).toBe(42)
    expect(normalizeUniverCellForRowPersistence({ v: '42', t: 2, s: 'style-1' }, numericColumn)).toEqual({
      v: 42,
      t: 2
    })
  })

  it('coerces numeric-column set_range payloads before persistence', () => {
    const operations = buildOperationsFromMutationPlan({
      plan: {
        sheetId: 'sheet-1',
        cells: [
          {
            rowId: 'row-1',
            columnName: 'amount',
            rowIndex: 0,
            colIndex: 0,
            valueAction: 'set',
            value: { v: '42', t: 2 }
          }
        ]
      },
      columns: [numericColumn],
      createOperationId: prefix => `${prefix}-1`
    })

    expect(operations).toEqual([
      {
        operationId: 'set_range-1',
        type: 'set_range',
        data: {
          cells: [{ rowId: 'row-1', columnName: 'amount', value: { v: 42, t: 2 }, row: 0, col: 0 }]
        }
      }
    ])
  })

  it('assigns distinct grid coordinates for multiple columns in the same row', () => {
    const operations = buildOperationsFromMutationPlan({
      plan: {
        sheetId: 'sheet-1',
        cells: [
          {
            rowId: 'row-1',
            columnName: 'column_6',
            rowIndex: 242,
            colIndex: 2,
            cellRef: 'C243',
            valueAction: 'set',
            value: 7
          },
          {
            rowId: 'row-1',
            columnName: 'column_12',
            rowIndex: 242,
            colIndex: 3,
            cellRef: 'D243',
            valueAction: 'set',
            value: 8
          },
          {
            rowId: 'row-1',
            columnName: 'column_19',
            rowIndex: 242,
            colIndex: 4,
            cellRef: 'E243',
            valueAction: 'set',
            value: 9
          }
        ]
      },
      createOperationId: prefix => `${prefix}-1`
    })

    const setRange = operations.find(operation => operation.type === 'set_range')
    expect(setRange?.data.cells).toEqual([
      { rowId: 'row-1', columnName: 'column_6', value: 7, row: 242, col: 2, cellRef: 'C243' },
      { rowId: 'row-1', columnName: 'column_12', value: 8, row: 242, col: 3, cellRef: 'D243' },
      { rowId: 'row-1', columnName: 'column_19', value: 9, row: 242, col: 4, cellRef: 'E243' }
    ])
  })

  it('merges clears into set_range with null values and grid coordinates', () => {
    const operations = buildOperationsFromMutationPlan({
      plan: {
        sheetId: 'sheet-1',
        cells: [
          {
            rowId: 'row-1',
            columnName: 'column_17',
            rowIndex: 30,
            colIndex: 6,
            cellRef: 'G31',
            valueAction: 'set',
            value: 1
          },
          {
            rowId: 'row-2',
            columnName: 'column_18',
            rowIndex: 32,
            colIndex: 7,
            cellRef: 'H33',
            valueAction: 'clear'
          }
        ]
      },
      createOperationId: prefix => `${prefix}-1`
    })

    expect(operations).toEqual([
      {
        operationId: 'set_range-1',
        type: 'set_range',
        data: {
          cells: [
            { rowId: 'row-1', columnName: 'column_17', value: 1, row: 30, col: 6, cellRef: 'G31' },
            { rowId: 'row-2', columnName: 'column_18', value: null, row: 32, col: 7, cellRef: 'H33' }
          ]
        }
      }
    ])
    expect(operations.some(operation => operation.type === 'clear_cell')).toBe(false)
  })

  it('builds a single set_range op for mixed sets and clears', () => {
    const createOperationId = jest.fn().mockReturnValueOnce('set-range-1')

    const operations = buildCellPersistenceOperations({
      setUpdatesByBackendRowId: new Map([['row-1', { ColumnA: 'value' }]]),
      clearCells: [{ rowId: 'row-2', columnName: 'ColumnB' }],
      createOperationId
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
      createOperationId: prefix => `${prefix}-${++sequence}`
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
      createOperationId: prefix => `${prefix}-${++sequence}`
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

  it('emits client row handles from the stable row identity transport path', () => {
    const operations = buildOperationsFromMutationPlan({
      plan: {
        sheetId: 'sheet-1',
        cells: [
          {
            rowId: 'client-row-1',
            rowRef: { kind: 'clientHandle', clientRowId: 'client-row-1' },
            columnName: 'ColumnA',
            rowIndex: 1,
            colIndex: 0,
            valueAction: 'set',
            value: 'draft'
          }
        ]
      },
      createOperationId: prefix => `${prefix}-1`
    })

    expect(operations).toEqual([
      {
        operationId: 'set_range-1',
        type: 'set_range',
        data: {
          cells: [
            {
              rowRef: { kind: 'clientHandle', clientRowId: 'client-row-1' },
              columnName: 'ColumnA',
              value: 'draft',
              row: 1,
              col: 0
            }
          ]
        }
      }
    ])
  })
})
