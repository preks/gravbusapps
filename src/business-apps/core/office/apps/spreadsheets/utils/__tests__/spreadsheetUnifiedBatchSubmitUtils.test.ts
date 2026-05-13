import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'
import {
  detectTemporaryRowIdsInKnownRowIdFields,
  findSuspiciousClientIdsAnywhereForDiagnostics,
  splitBatchOperationsByApproxJsonSize,
  summarizeUnifiedBatchOperationsForDiagnostics
} from '../spreadsheetUnifiedBatchSubmitUtils'

describe('spreadsheetUnifiedBatchSubmitUtils', () => {
  it('splits operations when cumulative JSON size exceeds the byte budget', () => {
    const heavy: SpreadsheetBatchOperation = {
      operationId: 'set-style-1',
      type: 'set_style',
      data: {
        sheetId: 'sheet-1',
        cells: Array.from({ length: 400 }, () => ({
          row: 0,
          col: 0,
          stylePatch: { set: { s: { ff: 'Arial'.repeat(200) } }, unset: [] }
        }))
      }
    }
    const light: SpreadsheetBatchOperation = {
      operationId: 'set-range-1',
      type: 'set_range',
      data: { cells: [{ rowId: '00000000-0000-4000-8000-000000000001', columnName: 'a', value: 1 }] }
    }
    const chunks = splitBatchOperationsByApproxJsonSize([heavy, light], 12_000)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks.flat()).toEqual([heavy, light])
  })

  it('summarizes batch diagnostics including non-backend row ids', () => {
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'r1',
        type: 'set_range',
        data: { cells: [{ rowId: 'client_x', columnName: 'a', value: 1 }] }
      }
    ]
    const summary = summarizeUnifiedBatchOperationsForDiagnostics(operations)
    expect(summary.operationCount).toBe(1)
    expect(summary.operationTypes).toEqual(['set_range'])
    expect(summary.hasNonBackendRowIdInSetRange).toBe(true)
    expect(summary.temporaryRowIdCount).toBe(1)
    expect(summary.temporaryRowIdMatches).toEqual([
      expect.objectContaining({
        operationType: 'set_range',
        fieldPath: 'data.cells[0].rowId',
        rowId: 'client_x'
      })
    ])
    expect(summary.approximatePayloadBytes).toBeGreaterThan(0)
  })

  it('detects temporary ids only in known semantic row-id fields', () => {
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'set-range-1',
        type: 'set_range',
        data: {
          cells: [{ rowId: 'client_row', columnName: 'a', value: '=IF(A1=\"client_row\",1,0)' }],
          note: 'client_row in note should not block'
        }
      },
      {
        operationId: 'delete-1',
        type: 'delete_rows',
        data: { rowIds: ['client_row'] }
      }
    ]

    expect(detectTemporaryRowIdsInKnownRowIdFields(operations)).toEqual([
      expect.objectContaining({
        operationType: 'set_range',
        fieldPath: 'data.cells[0].rowId',
        rowId: 'client_row'
      }),
      expect.objectContaining({
        operationType: 'delete_rows',
        fieldPath: 'data.rowIds[0]',
        rowId: 'client_row'
      })
    ])
  })

  it('finds suspicious client ids recursively for diagnostics without assuming they are row ids', () => {
    const operations: SpreadsheetBatchOperation[] = [
      {
        operationId: 'set-range-1',
        type: 'set_range',
        data: {
          cells: [{ rowId: '11111111-1111-4111-8111-111111111111', columnName: 'a', value: 'client_literal' }],
          comment: 'client_literal'
        }
      }
    ]

    expect(findSuspiciousClientIdsAnywhereForDiagnostics(operations)).toEqual([
      { path: 'operations[0].data.cells[0].value', value: 'client_literal' },
      { path: 'operations[0].data.comment', value: 'client_literal' }
    ])
  })
})
