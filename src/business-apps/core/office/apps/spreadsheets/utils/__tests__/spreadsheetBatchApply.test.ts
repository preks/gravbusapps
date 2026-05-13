import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../../services/SpreadsheetApiService'
import { applyAuthoritativeBatchResponseToRows } from '../spreadsheetBatchApply'

describe('applyAuthoritativeBatchResponseToRows', () => {
  it('advances the persisted baseline using only the acknowledged batch payload', () => {
    const startingBaseline = [
      { _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 0 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', ColumnA: 0 },
      { _id: 'row-3', _rowUuid: 'backend-row-3', ColumnA: 0 }
    ]

    const firstBatch: SpreadsheetBatchOperation[] = [
      {
        operationId: 'set-range-1',
        type: 'set_range',
        data: {
          cells: [{ rowId: 'backend-row-1', columnName: 'ColumnA', value: 5 }]
        }
      }
    ]
    const firstResponse: SpreadsheetBatchOperationResponse = {
      sheetId: 'sheet-1',
      newVersion: 2,
      appliedOperations: [{ operationId: 'set-range-1', type: 'set_range' }],
      operationResults: [{ operationId: 'set-range-1', type: 'set_range', result: {} }],
      idempotentReplay: false
    }

    const baselineAfterFirstBatch = applyAuthoritativeBatchResponseToRows(startingBaseline, firstBatch, firstResponse)

    expect(baselineAfterFirstBatch).toEqual([
      { _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 5 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', ColumnA: 0 },
      { _id: 'row-3', _rowUuid: 'backend-row-3', ColumnA: 0 }
    ])

    const secondBatch: SpreadsheetBatchOperation[] = [
      {
        operationId: 'set-range-2',
        type: 'set_range',
        data: {
          cells: [
            { rowId: 'backend-row-2', columnName: 'ColumnA', value: 7 },
            { rowId: 'backend-row-3', columnName: 'ColumnA', value: 9 }
          ]
        }
      }
    ]
    const secondResponse: SpreadsheetBatchOperationResponse = {
      sheetId: 'sheet-1',
      newVersion: 3,
      appliedOperations: [{ operationId: 'set-range-2', type: 'set_range' }],
      operationResults: [{ operationId: 'set-range-2', type: 'set_range', result: {} }],
      idempotentReplay: false
    }

    expect(applyAuthoritativeBatchResponseToRows(baselineAfterFirstBatch, secondBatch, secondResponse)).toEqual([
      { _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 5 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', ColumnA: 7 },
      { _id: 'row-3', _rowUuid: 'backend-row-3', ColumnA: 9 }
    ])
  })

  it('removes cleared cells from the persisted baseline', () => {
    const startingBaseline = [{ _id: 'row-1', _rowUuid: 'backend-row-1', ColumnA: 5, legacyA: 5 }]
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'clear-cell-1',
        type: 'clear_cell',
        data: { rowId: 'backend-row-1', columnName: 'ColumnA' }
      }
    ]
    const response: SpreadsheetBatchOperationResponse = {
      sheetId: 'sheet-1',
      newVersion: 4,
      appliedOperations: [{ operationId: 'clear-cell-1', type: 'clear_cell' }],
      operationResults: [{ operationId: 'clear-cell-1', type: 'clear_cell', result: {} }],
      idempotentReplay: false
    }

    expect(applyAuthoritativeBatchResponseToRows(startingBaseline, operations, response)).toEqual([
      { _id: 'row-1', _rowUuid: 'backend-row-1', legacyA: 5 }
    ])
  })

  it('replaces optimistic row placeholders in-place for insert_rows_at responses', () => {
    const startingBaseline = [
      { _id: 'row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, ColumnA: 'top' },
      { _id: 'client-row-new', _gridRowIndex: 1 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, ColumnA: 'bottom' }
    ]
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'insert-row-1',
        type: 'insert_rows_at',
        data: {
          insertAt: 1,
          rows: [{ _clientRowId: 'client-row-new', _gridRowIndex: 1 }]
        }
      }
    ]
    const response: SpreadsheetBatchOperationResponse = {
      sheetId: 'sheet-1',
      newVersion: 5,
      appliedOperations: [{ operationId: 'insert-row-1', type: 'insert_rows_at' }],
      operationResults: [
        {
          operationId: 'insert-row-1',
          type: 'insert_rows_at',
          result: {
            insertAt: 1,
            rows: [{ id: 'backend-row-new', data: { _clientRowId: 'client-row-new', _gridRowIndex: 1 } }]
          }
        }
      ],
      idempotentReplay: false
    }

    expect(applyAuthoritativeBatchResponseToRows(startingBaseline, operations, response)).toEqual([
      { _id: 'row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 0, ColumnA: 'top' },
      { _id: 'client-row-new', _rowUuid: 'backend-row-new', _clientRowId: 'client-row-new', _gridRowIndex: 1 },
      { _id: 'row-2', _rowUuid: 'backend-row-2', _gridRowIndex: 2, ColumnA: 'bottom' }
    ])
  })
})
