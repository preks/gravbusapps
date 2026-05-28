import {
  dropSetRangeCellsRedundantAfterMaterialization,
  dropSetRangeCellsRedundantWithAddRows
} from '../spreadsheetBatchOperationCellDedup'
import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const isUuid = (value: string) => UUID_RE.test(value)

const ROW_A = '7eec64e8-bf38-4752-8b49-90f46a40be63'
const ROW_B = 'cbe1dd37-5512-43af-96c5-6bdd41dd93ea'

const setRangeOp = (cells: Array<Record<string, unknown>>): SpreadsheetBatchOperation => ({
  operationId: `set_range_${Math.random()}`,
  type: 'set_range',
  data: { cells }
})

describe('dropSetRangeCellsRedundantAfterMaterialization', () => {
  it('drops set_range cells whose value already matches the persisted row', () => {
    const ops: SpreadsheetBatchOperation[] = [setRangeOp([{ rowId: ROW_A, columnName: 'column_b', value: 1 }])]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: { v: 1, t: 2 } }]
    const materialized = new Set([ROW_A])

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toEqual([])
    expect(result.droppedCellCount).toBe(1)
    expect(result.droppedSetRangeOpCount).toBe(1)
    expect(result.droppedCellKeys).toEqual([`${ROW_A}\u0000column_b`])
  })

  it('keeps cells when the persisted row value differs', () => {
    const ops: SpreadsheetBatchOperation[] = [setRangeOp([{ rowId: ROW_A, columnName: 'column_b', value: 2 }])]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: { v: 1, t: 2 } }]
    const materialized = new Set([ROW_A])

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toHaveLength(1)
    expect(result.droppedCellCount).toBe(0)
    expect(result.retainedMismatchedCellKeys).toEqual([`${ROW_A}\u0000column_b`])
  })

  it('does not touch cells on rows that were not materialized this dispatch (Fix F scope)', () => {
    const ops: SpreadsheetBatchOperation[] = [setRangeOp([{ rowId: ROW_A, columnName: 'column_b', value: 1 }])]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: { v: 1, t: 2 } }]
    const materialized = new Set<string>()

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toEqual(ops)
    expect(result.droppedCellCount).toBe(0)
  })

  it('partial drop preserves non-matching cells in the same op', () => {
    const ops: SpreadsheetBatchOperation[] = [
      setRangeOp([
        { rowId: ROW_A, columnName: 'column_b', value: 1 },
        { rowId: ROW_A, columnName: 'column_c', value: 'fresh' }
      ])
    ]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: { v: 1, t: 2 }, column_c: { v: 'old', t: 1 } }]
    const materialized = new Set([ROW_A])

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toHaveLength(1)
    const opData = result.operations[0]?.data as { cells: Array<Record<string, unknown>> }
    expect(opData.cells).toHaveLength(1)
    expect(opData.cells[0]?.columnName).toBe('column_c')
    expect(result.droppedCellCount).toBe(1)
    expect(result.droppedSetRangeOpCount).toBe(0)
  })

  it('treats {v, t} envelope as equivalent to raw scalar', () => {
    const ops: SpreadsheetBatchOperation[] = [
      setRangeOp([{ rowId: ROW_A, columnName: 'column_b', value: { v: 1, t: 2 } }])
    ]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: 1 }]
    const materialized = new Set([ROW_A])

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toEqual([])
    expect(result.droppedCellCount).toBe(1)
  })

  it('leaves non-set_range ops untouched', () => {
    const styleOp: SpreadsheetBatchOperation = {
      operationId: 'set_style_1',
      type: 'set_style',
      data: { rowId: ROW_A, columnName: 'column_b', style: { bold: true } }
    }
    const ops: SpreadsheetBatchOperation[] = [styleOp, setRangeOp([{ rowId: ROW_A, columnName: 'column_b', value: 1 }])]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: { v: 1, t: 2 } }]
    const materialized = new Set([ROW_A])

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toHaveLength(1)
    expect(result.operations[0]).toBe(styleOp)
  })

  it('keeps cells for materialized rows that are not present in the rows snapshot', () => {
    const ops: SpreadsheetBatchOperation[] = [setRangeOp([{ rowId: ROW_B, columnName: 'column_b', value: 1 }])]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: { v: 1, t: 2 } }]
    const materialized = new Set([ROW_B])

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toHaveLength(1)
    expect(result.droppedCellCount).toBe(0)
  })

  it('drops the entire op only when every cell is redundant', () => {
    const ops: SpreadsheetBatchOperation[] = [
      setRangeOp([
        { rowId: ROW_A, columnName: 'column_b', value: 1 },
        { rowId: ROW_A, columnName: 'column_c', value: 'x' }
      ])
    ]
    const rows = [{ _id: ROW_A, _rowUuid: ROW_A, column_b: { v: 1, t: 2 }, column_c: { v: 'x', t: 1 } }]
    const materialized = new Set([ROW_A])

    const result = dropSetRangeCellsRedundantAfterMaterialization(ops, rows, materialized, isUuid)

    expect(result.operations).toEqual([])
    expect(result.droppedCellCount).toBe(2)
    expect(result.droppedSetRangeOpCount).toBe(1)
  })

  it('is a no-op when there are no operations or no materialized rows', () => {
    expect(dropSetRangeCellsRedundantAfterMaterialization([], [], new Set(), isUuid).operations).toEqual([])
    expect(
      dropSetRangeCellsRedundantAfterMaterialization(
        [setRangeOp([{ rowId: ROW_A, columnName: 'column_b', value: 1 }])],
        [],
        new Set(),
        isUuid
      ).droppedCellCount
    ).toBe(0)
  })
})

describe('dropSetRangeCellsRedundantWithAddRows', () => {
  it('drops set_range cells already seeded by same-batch add_rows payloads', () => {
    const result = dropSetRangeCellsRedundantWithAddRows([
      {
        operationId: 'add_rows_1',
        type: 'add_rows',
        data: {
          rows: [{ _clientRowId: 'client-row-1', ColumnA: 'burst' }]
        }
      },
      setRangeOp([
        {
          rowRef: { kind: 'clientHandle', clientRowId: 'client-row-1' },
          columnName: 'ColumnA',
          value: 'burst'
        }
      ])
    ])

    expect(result.operations).toHaveLength(1)
    expect(result.operations[0]?.type).toBe('add_rows')
    expect(result.droppedCellCount).toBe(1)
    expect(result.droppedSetRangeOpCount).toBe(1)
  })

  it('keeps same-batch value writes when add_rows seeded a different value', () => {
    const result = dropSetRangeCellsRedundantWithAddRows([
      {
        operationId: 'add_rows_1',
        type: 'add_rows',
        data: {
          rows: [{ _clientRowId: 'client-row-1', ColumnA: 'old' }]
        }
      },
      setRangeOp([
        {
          rowRef: { kind: 'clientHandle', clientRowId: 'client-row-1' },
          columnName: 'ColumnA',
          value: 'new'
        }
      ])
    ])

    expect(result.operations).toHaveLength(2)
    expect(result.droppedCellCount).toBe(0)
    expect(result.retainedMismatchedCellKeys).toEqual(['client-row-1\u0000ColumnA'])
  })
})
