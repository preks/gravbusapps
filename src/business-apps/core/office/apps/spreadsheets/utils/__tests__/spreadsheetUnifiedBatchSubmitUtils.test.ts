import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'
import {
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
    expect(summary.approximatePayloadBytes).toBeGreaterThan(0)
  })
})
