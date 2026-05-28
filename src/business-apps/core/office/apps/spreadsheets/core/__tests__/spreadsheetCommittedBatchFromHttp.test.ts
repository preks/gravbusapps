import type { SpreadsheetBatchOperationResponse } from '../../services/SpreadsheetApiService'
import {
  buildCommittedBatchEnvelopeFromHttpResponse,
  buildRejectedConflictCommittedBatchEnvelope
} from '../spreadsheetCommittedBatchFromHttp'

const buildResponse = (overrides?: Partial<SpreadsheetBatchOperationResponse>): SpreadsheetBatchOperationResponse => ({
  sheetId: 'sheet-1',
  newVersion: 7,
  appliedOperations: [],
  operationResults: [],
  idempotentReplay: false,
  ...overrides
})

describe('spreadsheetCommittedBatchFromHttp', () => {
  it('prefers the server committedBatch envelope when present', () => {
    const batch = buildCommittedBatchEnvelopeFromHttpResponse({
      workbookId: 'workbook-1',
      sheetId: 'sheet-1',
      requestOperations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }],
      response: buildResponse({
        committedBatch: {
          type: 'batch_operations',
          data: {
            sheetId: 'sheet-1',
            workbookId: 'workbook-1',
            batchId: 'batch-1',
            baseVersion: 6,
            appliedVersion: 7,
            payloadSchemaVersion: 1,
            operations: [
              {
                operationId: 'op-1',
                type: 'set_range',
                data: { cells: [] },
                result: { updatedCellCount: 3 },
                baseVersion: 6,
                appliedVersion: 7
              }
            ]
          },
          version: 7
        }
      }),
      batchId: 'fallback-batch',
      baseVersion: 6
    })

    expect(batch.batchId).toBe('batch-1')
    expect(batch.operations[0]?.result).toEqual({ updatedCellCount: 3 })
  })

  it('builds a fallback envelope from request operations and operationResults', () => {
    const batch = buildCommittedBatchEnvelopeFromHttpResponse({
      workbookId: 'workbook-1',
      sheetId: 'sheet-1',
      requestOperations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [{ rowId: 'row-1' }] } }],
      response: buildResponse({
        operationResults: [{ operationId: 'op-1', type: 'set_range', result: { updatedCellCount: 1 } }]
      }),
      batchId: 'batch-1',
      baseVersion: 6,
      traceId: 'trace-1'
    })

    expect(batch).toEqual(
      expect.objectContaining({
        batchId: 'batch-1',
        baseVersion: 6,
        appliedVersion: 7,
        traceId: 'trace-1',
        operations: [
          expect.objectContaining({
            operationId: 'op-1',
            result: { updatedCellCount: 1 }
          })
        ]
      })
    )
  })

  it('builds a tiny committed batch for rejected Tier 1 conflict paints', () => {
    const batch = buildRejectedConflictCommittedBatchEnvelope({
      workbookId: 'workbook-1',
      sheetId: 'sheet-1',
      response: buildResponse({
        results: [
          {
            operationId: 'op-1',
            status: 'rejected_conflict',
            serverState: [{ rowId: 'row-1', columnName: 'A', field: 'value', value: 'server' }]
          }
        ]
      }),
      baseBatchId: 'batch-1'
    })

    expect(batch).toEqual(
      expect.objectContaining({
        batchId: 'batch-1:tier1_conflicts',
        appliedVersion: 7,
        operations: [
          expect.objectContaining({
            type: 'set_cell',
            data: { rowId: 'row-1', columnName: 'A', value: 'server' }
          })
        ]
      })
    )
  })
})
