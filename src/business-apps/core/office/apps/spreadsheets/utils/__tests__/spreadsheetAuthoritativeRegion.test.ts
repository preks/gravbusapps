import {
  computeAuthoritativeRegionForMaterializedRows,
  tryComputeAuthoritativeRegionsFromReplayDeltas,
  tryComputeAuthoritativeRegionFromReplayDeltas
} from '../spreadsheetAuthoritativeRegion'
import type { SpreadsheetColumn } from '../../types/spreadsheet'
import type { SpreadsheetReplayDelta } from '../../core'

function col(partial: Partial<SpreadsheetColumn> & Pick<SpreadsheetColumn, 'id' | 'name'>): SpreadsheetColumn {
  return {
    type: 'text',
    label: partial.name,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    order: 0,
    isVisible: true,
    ...partial
  }
}

describe('tryComputeAuthoritativeRegionFromReplayDeltas', () => {
  const columns: SpreadsheetColumn[] = [
    col({ id: 'col-a', name: 'ColumnA', order: 0 }),
    col({ id: 'col-b', name: 'ColumnB', order: 1 }),
    col({ id: 'col-c', name: 'ColumnC', order: 2 })
  ]

  it('returns multiple disjoint regions instead of gap-bridging a single bbox', () => {
    const rows: Record<string, unknown>[] = [
      { _id: 'r0', ColumnA: 1, ColumnC: 3 },
      { _id: 'r1', ColumnA: 2 },
      { _id: 'r2', ColumnC: 9 }
    ]
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'set_range',
        appliedVersion: 2,
        payload: {
          cells: [
            { rowId: 'r0', columnName: 'ColumnA', value: 10 },
            { rowId: 'r0', columnName: 'ColumnC', value: 30 },
            { rowId: 'r2', columnName: 'ColumnC', value: 90 }
          ]
        }
      }
    ]
    expect(tryComputeAuthoritativeRegionsFromReplayDeltas({ changes, columns, rows })).toEqual([
      { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 },
      { minRow: 0, maxRow: 0, minCol: 2, maxCol: 2 },
      { minRow: 2, maxRow: 2, minCol: 2, maxCol: 2 }
    ])
  })

  it('compacts contiguous cells into compact horizontal and rectangular regions', () => {
    const rows: Record<string, unknown>[] = [
      { _id: 'r0', ColumnA: 1, ColumnB: 2 },
      { _id: 'r1', ColumnA: 3, ColumnB: 4 },
      { _id: 'r2', ColumnC: 5 }
    ]
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'set_range',
        appliedVersion: 1,
        payload: {
          cells: [
            { rowId: 'r0', columnName: 'ColumnA', value: 11 },
            { rowId: 'r0', columnName: 'ColumnB', value: 12 },
            { rowId: 'r1', columnName: 'ColumnA', value: 13 },
            { rowId: 'r1', columnName: 'ColumnB', value: 14 },
            { rowId: 'r2', columnName: 'ColumnC', value: 15 }
          ]
        }
      }
    ]
    expect(tryComputeAuthoritativeRegionsFromReplayDeltas({ changes, columns, rows })).toEqual([
      { minRow: 0, maxRow: 1, minCol: 0, maxCol: 1 },
      { minRow: 2, maxRow: 2, minCol: 2, maxCol: 2 }
    ])
  })

  it('bounds add_rows regions to touched columns on the created rows only', () => {
    const rows: Record<string, unknown>[] = [
      { _id: 'row-existing', _gridRowIndex: 0, ColumnA: 'old' },
      { _id: 'row-new-1', _gridRowIndex: 5, ColumnB: 'b5' },
      { _id: 'row-new-2', _gridRowIndex: 6, ColumnB: 'b6', ColumnC: 'c6' }
    ]
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'add_rows',
        appliedVersion: 4,
        payload: {
          rows: [
            { id: 'row-new-1', data: { _id: 'row-new-1', ColumnB: 'b5' } },
            { id: 'row-new-2', data: { _id: 'row-new-2', ColumnB: 'b6', ColumnC: 'c6' } }
          ]
        }
      }
    ]

    expect(tryComputeAuthoritativeRegionsFromReplayDeltas({ changes, columns, rows })).toEqual([
      { minRow: 5, maxRow: 5, minCol: 1, maxCol: 1 },
      { minRow: 6, maxRow: 6, minCol: 1, maxCol: 2 }
    ])
  })

  it('keeps the single-region helper as a compatibility wrapper around the multi-region output', () => {
    const rows: Record<string, unknown>[] = [
      { _id: 'r0', ColumnA: 1, ColumnC: 3 },
      { _id: 'r2', ColumnC: 9 }
    ]
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'set_range',
        appliedVersion: 2,
        payload: {
          cells: [
            { rowId: 'r0', columnName: 'ColumnA', value: 10 },
            { rowId: 'r0', columnName: 'ColumnC', value: 30 },
            { rowId: 'r2', columnName: 'ColumnC', value: 90 }
          ]
        }
      }
    ]

    expect(tryComputeAuthoritativeRegionFromReplayDeltas({ changes, columns, rows })).toEqual({
      minRow: 0,
      maxRow: 1,
      minCol: 0,
      maxCol: 2
    })
  })

  it('returns undefined when no resolvable coordinates', () => {
    const rows: Record<string, unknown>[] = []
    const changes: SpreadsheetReplayDelta[] = [
      {
        operationType: 'set_range',
        appliedVersion: 1,
        payload: { cells: [{ rowId: 'missing', columnName: 'ColumnA', value: 1 }] }
      }
    ]
    expect(tryComputeAuthoritativeRegionFromReplayDeltas({ changes, columns, rows })).toBeUndefined()
  })
})

describe('computeAuthoritativeRegionForMaterializedRows', () => {
  const columns: SpreadsheetColumn[] = [
    col({ id: 'col-p', name: 'column_p', order: 0 }),
    col({ id: 'col-t', name: 'column_t', order: 1 })
  ]

  it('returns a single-cell region when only one column has a materialized value', () => {
    const rows = [{ _id: 'row-1', _gridRowIndex: 5, column_p: 4 }]
    const region = computeAuthoritativeRegionForMaterializedRows({
      createdGridRowIndices: [5],
      rows,
      columns,
      createdRows: [{ _clientRowId: 'client-1', column_p: 4 }],
      sourceUniverRows: [{ _clientRowId: 'client-1', column_p: 4 }]
    })
    expect(region).toEqual({ minRow: 5, maxRow: 5, minCol: 0, maxCol: 0 })
  })

  it('returns undefined for identity-only materialization with no populated columns', () => {
    const rows = [{ _id: 'row-1', _gridRowIndex: 5 }]
    expect(
      computeAuthoritativeRegionForMaterializedRows({
        createdGridRowIndices: [5],
        rows,
        columns,
        createdRows: [{ _clientRowId: 'client-1' }],
        sourceUniverRows: [{ _clientRowId: 'client-1' }]
      })
    ).toBeUndefined()
  })

  it('does not include peer column values from unrelated rows', () => {
    const rows = [
      { _id: 'row-1', _gridRowIndex: 5, column_p: 1 },
      { _id: 'row-2', _gridRowIndex: 6, column_t: 9 }
    ]
    const region = computeAuthoritativeRegionForMaterializedRows({
      createdGridRowIndices: [5],
      rows,
      columns
    })
    expect(region).toEqual({ minRow: 5, maxRow: 5, minCol: 0, maxCol: 0 })
  })
})
