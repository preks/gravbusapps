import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'
import { remapBatchOperationsWithUiToBackendRowMap } from '../spreadsheetBatchOperationRowRemap'

describe('remapBatchOperationsWithUiToBackendRowMap', () => {
  it('rewrites set_range rowId values using the UI→backend map', () => {
    const backend = 'f2988a73-80e3-47d7-9535-e086b61e60f0'
    const client = 'client_f8c16680-4fc8-4357-80b8-1175a108ddc4'
    const map = new Map<string, string>([[client, backend]])
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'op-1',
        type: 'set_range',
        data: {
          cells: [
            { rowId: client, columnName: 'column_a', value: 1 },
            { rowId: backend, columnName: 'column_b', value: 2 }
          ]
        }
      }
    ]
    const next = remapBatchOperationsWithUiToBackendRowMap(operations, map)
    const cells = (next[0]?.data as { cells: Array<{ rowId: string }> }).cells
    expect(cells[0]?.rowId).toBe(backend)
    expect(cells[1]?.rowId).toBe(backend)
  })

  it('rewrites set_cell and clear_cell rowId values', () => {
    const backend = '4353823a-03a4-4710-ab36-d8b935540862'
    const client = 'client_abc'
    const map = new Map([[client, backend]])
    const operations: SpreadsheetBatchOperation[] = [
      { operationId: 'a', type: 'set_cell', data: { rowId: client, columnName: 'x', value: 1 } },
      { operationId: 'b', type: 'clear_cell', data: { rowId: client, columnName: 'y' } }
    ]
    const next = remapBatchOperationsWithUiToBackendRowMap(operations, map)
    expect((next[0]?.data as { rowId: string }).rowId).toBe(backend)
    expect((next[1]?.data as { rowId: string }).rowId).toBe(backend)
  })
})
