import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'
import {
  batchOperationOnlyReferencesSeededClientRows,
  collectClientRowIdsFromAddRowsOperations,
  isNewRowMaterializationBundle,
  mergeAddRowsOperationsInPlace
} from '../spreadsheetNewRowPersistBundle'

const op = (type: string, data: Record<string, unknown> = {}): SpreadsheetBatchOperation =>
  ({
    operationId: `${type}-1`,
    type,
    data
  }) as SpreadsheetBatchOperation

describe('spreadsheetNewRowPersistBundle', () => {
  it('detects new-row bundles with dependent set_range on client handles', () => {
    const operations = [
      op('add_rows', { rows: [{ _clientRowId: 'client_a', ColumnA: 'x' }] }),
      op('set_range', {
        cells: [{ rowRef: { kind: 'clientHandle', clientRowId: 'client_a' }, columnName: 'ColumnB', value: 'y' }]
      })
    ]
    expect(isNewRowMaterializationBundle(operations)).toBe(true)
    expect(collectClientRowIdsFromAddRowsOperations(operations)).toEqual(new Set(['client_a']))
  })

  it('rejects bundles when set_range targets a row not seeded by add_rows', () => {
    const operations = [
      op('add_rows', { rows: [{ _clientRowId: 'client_a' }] }),
      op('set_range', {
        cells: [{ rowRef: { kind: 'clientHandle', clientRowId: 'client_other' }, columnName: 'A', value: 1 }]
      })
    ]
    expect(isNewRowMaterializationBundle(operations)).toBe(false)
  })

  it('merges multiple add_rows ops by client row id', () => {
    const merged = mergeAddRowsOperationsInPlace([
      op('add_rows', { rows: [{ _clientRowId: 'client_a', A: 1 }] }),
      op('add_rows', { rows: [{ _clientRowId: 'client_a', B: 2 }, { _clientRowId: 'client_b' }] })
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.type).toBe('add_rows')
    const rows = merged[0]?.data?.rows as Array<Record<string, unknown>>
    expect(rows).toHaveLength(2)
    expect(rows.find(row => row._clientRowId === 'client_a')).toEqual(expect.objectContaining({ B: 2 }))
  })

  it('allows cell ops that only reference backend uuids', () => {
    const seeded = new Set(['client_a'])
    const setRange = op('set_range', {
      cells: [{ rowId: '550e8400-e29b-41d4-a716-446655440000', columnName: 'A', value: 1 }]
    })
    expect(batchOperationOnlyReferencesSeededClientRows(setRange, seeded)).toBe(true)
  })
})
