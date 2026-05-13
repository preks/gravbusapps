import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import { isSpreadsheetBackendRowUuid } from './spreadsheetRowIdentity'

/** UTF-8 byte length for JSON size estimates (Node Jest may lack global TextEncoder at module load). */
function utf8ByteLength(value: string): number {
  if (typeof globalThis.TextEncoder !== 'undefined') {
    return new globalThis.TextEncoder().encode(value).length
  }
  return Buffer.byteLength(value, 'utf8')
}

export const SPREADSHEET_UNIFIED_MUTATION_SUBMIT_MAX_BYTES = 24 * 1024 * 1024

export function splitBatchOperationsByApproxJsonSize(
  operations: SpreadsheetBatchOperation[],
  maxBytes: number
): SpreadsheetBatchOperation[][] {
  if (operations.length === 0) return []
  const chunks: SpreadsheetBatchOperation[][] = []
  let current: SpreadsheetBatchOperation[] = []
  let size = 0
  for (const op of operations) {
    const opSize = utf8ByteLength(JSON.stringify(op))
    if (current.length > 0 && size + opSize > maxBytes) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(op)
    size += opSize
  }
  if (current.length > 0) chunks.push(current)
  return chunks
}

export function summarizeUnifiedBatchOperationsForDiagnostics(operations: SpreadsheetBatchOperation[]): {
  approximatePayloadBytes: number
  operationCount: number
  operationTypes: string[]
  hasNonBackendRowIdInSetRange: boolean
} {
  let approximatePayloadBytes = 0
  let hasNonBackendRowIdInSetRange = false
  for (const op of operations) {
    approximatePayloadBytes += utf8ByteLength(JSON.stringify(op))
    if (op.type === 'set_range' && Array.isArray(op.data?.cells)) {
      for (const c of op.data.cells as Array<{ rowId?: unknown }>) {
        const id = String(c.rowId ?? '')
        if (id && !isSpreadsheetBackendRowUuid(id)) {
          hasNonBackendRowIdInSetRange = true
          break
        }
      }
    }
  }
  return {
    approximatePayloadBytes,
    operationCount: operations.length,
    operationTypes: operations.map(o => o.type),
    hasNonBackendRowIdInSetRange
  }
}
