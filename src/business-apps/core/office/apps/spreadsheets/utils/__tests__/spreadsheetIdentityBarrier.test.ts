import { assertLocalPersistIdentityBarrier, findUnresolvedRowIdsInBatchOperations } from '../spreadsheetIdentityBarrier'
import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'

describe('spreadsheetIdentityBarrier', () => {
  it('detects temporary client row ids in cell-targeting operations', () => {
    const operations = [
      {
        type: 'set_cell',
        data: { rowId: 'client_row_1', columnName: 'A', value: 1 }
      }
    ] as unknown as SpreadsheetBatchOperation[]

    expect(findUnresolvedRowIdsInBatchOperations(operations)).toEqual(['client_row_1'])
    expect(() => assertLocalPersistIdentityBarrier(operations)).toThrow(/barrier/)
  })

  it('flags clientHandle row refs in cell-targeting operations', () => {
    const operations = [
      {
        type: 'set_range',
        data: {
          cells: [{ rowRef: { kind: 'clientHandle', clientRowId: 'client_row_1' }, columnName: 'A', value: 1 }]
        }
      }
    ] as unknown as SpreadsheetBatchOperation[]

    expect(findUnresolvedRowIdsInBatchOperations(operations)).toEqual(['client_row_1'])
  })

  it('allows clientHandle set_range when the same batch seeds the row via add_rows', () => {
    const operations = [
      {
        type: 'add_rows',
        data: { rows: [{ _clientRowId: 'client_row_1', A: 1 }] }
      },
      {
        type: 'set_range',
        data: {
          cells: [{ rowRef: { kind: 'clientHandle', clientRowId: 'client_row_1' }, columnName: 'B', value: 2 }]
        }
      }
    ] as unknown as SpreadsheetBatchOperation[]

    expect(findUnresolvedRowIdsInBatchOperations(operations)).toEqual([])
    expect(() => assertLocalPersistIdentityBarrier(operations)).not.toThrow()
  })

  it('allows backend row uuid cell writes', () => {
    const operations = [
      {
        type: 'set_cell',
        data: { rowId: '550e8400-e29b-41d4-a716-446655440000', columnName: 'A', value: 1 }
      }
    ] as unknown as SpreadsheetBatchOperation[]

    expect(findUnresolvedRowIdsInBatchOperations(operations)).toEqual([])
    expect(() => assertLocalPersistIdentityBarrier(operations)).not.toThrow()
  })
})
