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
    const cells = (next.operations[0]?.data as { cells: Array<{ rowId: string }> }).cells
    expect(cells[0]?.rowId).toBe(backend)
    expect(cells[1]?.rowId).toBe(backend)
    expect(next.remappedEntries).toEqual([
      expect.objectContaining({
        operationType: 'set_range',
        fieldPath: 'data.cells[0].rowId',
        fromRowId: client,
        toRowId: backend
      })
    ])
  })

  it('rewrites set_cell, clear_cell, and delete_rows rowId values', () => {
    const backend = '4353823a-03a4-4710-ab36-d8b935540862'
    const client = 'client_abc'
    const map = new Map([[client, backend]])
    const operations: SpreadsheetBatchOperation[] = [
      { operationId: 'a', type: 'set_cell', data: { rowId: client, columnName: 'x', value: 1 } },
      { operationId: 'b', type: 'clear_cell', data: { rowId: client, columnName: 'y' } },
      { operationId: 'c', type: 'delete_rows', data: { rowIds: [client, backend] } }
    ]
    const next = remapBatchOperationsWithUiToBackendRowMap(operations, map)
    expect((next.operations[0]?.data as { rowId: string }).rowId).toBe(backend)
    expect((next.operations[1]?.data as { rowId: string }).rowId).toBe(backend)
    expect((next.operations[2]?.data as { rowIds: string[] }).rowIds).toEqual([backend, backend])
  })

  it('preserves operation shape and does not touch formulas or unrelated strings', () => {
    const backend = '11111111-1111-4111-8111-111111111111'
    const client = 'client_formula_row'
    const map = new Map([[client, backend]])
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'range-1',
        type: 'set_range',
        data: {
          cells: [
            {
              rowId: client,
              columnName: 'formula',
              value: '=IF(A1=\"client_formula_row\",1,0)',
              note: 'keep client_formula_row literal'
            }
          ],
          comment: 'client_formula_row should not be rewritten here'
        }
      }
    ]

    const next = remapBatchOperationsWithUiToBackendRowMap(operations, map)
    expect(next.operations).toEqual([
      {
        operationId: 'range-1',
        type: 'set_range',
        data: {
          cells: [
            {
              rowId: backend,
              columnName: 'formula',
              value: '=IF(A1=\"client_formula_row\",1,0)',
              note: 'keep client_formula_row literal'
            }
          ],
          comment: 'client_formula_row should not be rewritten here'
        }
      }
    ])
    expect(next.unresolvedTemporaryRowIdMatches).toEqual([])
  })

  it('rewrites client rowRef handles to backend ids when the map becomes available', () => {
    const backend = '22222222-2222-4222-8222-222222222222'
    const client = 'client_handle_1'
    const map = new Map([[client, backend]])
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'range-1',
        type: 'set_range',
        data: {
          cells: [{ rowRef: { kind: 'clientHandle', clientRowId: client }, columnName: 'formula', value: 'x' }]
        }
      }
    ]

    const next = remapBatchOperationsWithUiToBackendRowMap(operations, map)
    expect(next.operations).toEqual([
      {
        operationId: 'range-1',
        type: 'set_range',
        data: {
          cells: [
            {
              rowId: backend,
              rowRef: { kind: 'backendUuid', rowUuid: backend },
              columnName: 'formula',
              value: 'x'
            }
          ]
        }
      }
    ])
  })
})
