import { createSpreadsheetTraceId } from '../services/spreadsheetDiagnostics'
import type { SheetRangeShape } from './cellMatrixUtils'
import type { UniverGridController } from './useUniverGridController'

export type GridClearRangeOpKind = 'clear_all' | 'clear_format'

type ClearRangeEmitRefs = Pick<
  UniverGridController,
  'propsRef' | 'callbacksRef' | 'lastClearAllEmitAtBySignatureRef' | 'lastClearFormatEmitAtBySignatureRef'
>

/** Deduped clear_all / clear_format mutation batch from command or cell-matrix shape detection. */
export function tryEmitGridClearRangeOpFromCommand(
  refs: ClearRangeEmitRefs,
  args: {
    kind: GridClearRangeOpKind
    ranges: SheetRangeShape[]
    targetSheetId: string
    source: 'command-id' | 'cell-matrix-shape'
    commandId: string
  }
): void {
  const { kind, ranges, targetSheetId, source, commandId } = args
  const { propsRef, callbacksRef, lastClearAllEmitAtBySignatureRef, lastClearFormatEmitAtBySignatureRef } = refs
  if (ranges.length === 0) return
  const batchEmit = propsRef.current.onMutationBatchOp
  if (!batchEmit) return
  const dedupRef = kind === 'clear_all' ? lastClearAllEmitAtBySignatureRef : lastClearFormatEmitAtBySignatureRef
  const dedupKey = `${targetSheetId}|${ranges
    .map(r => `${r.startRow}:${r.endRow}:${r.startColumn}:${r.endColumn}`)
    .join(',')}`
  const emitNow = Date.now()
  const lastEmitAt = dedupRef.current.get(dedupKey) ?? 0
  if (emitNow - lastEmitAt < 1000) return
  dedupRef.current.set(dedupKey, emitNow)
  if (dedupRef.current.size > 32) {
    for (const [key, timestamp] of dedupRef.current) {
      if (emitNow - timestamp > 5000) dedupRef.current.delete(key)
    }
  }
  const traceId = createSpreadsheetTraceId(kind === 'clear_all' ? 'grid_clear_all' : 'grid_clear_format')
  try {
    batchEmit({
      sheetId: targetSheetId,
      traceId,
      operations: [
        {
          type: kind,
          data: {
            sheetId: targetSheetId,
            ranges
          }
        }
      ]
    })
  } catch (emitErr) {
    console.error(`[UniverSheetGrid] unified ${kind} mutation batch failed`, emitErr)
  }
  callbacksRef.current.onDiagnosticsTraceEvent?.({
    source: 'client',
    stage: 'grid_unified_mutation_emit',
    traceId,
    payload: {
      commandId,
      targetSheetId,
      detectionSource: source,
      ranges,
      operationTypes: [kind]
    }
  })
}
