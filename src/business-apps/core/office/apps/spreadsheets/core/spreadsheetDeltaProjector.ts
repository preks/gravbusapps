import type { SpreadsheetColumn } from '../types'
import type { SpreadsheetCommittedBatchEnvelope } from './spreadsheetCommittedDeltaContract'
import { applySpreadsheetSessionDeltaChangesToRows } from './spreadsheetSessionDeltaApply'
import type { SpreadsheetViewerRow } from './SpreadsheetSession'

export type SpreadsheetSessionProjectionPatch = {
  sheetId: string
  rows: SpreadsheetViewerRow[]
  version: number
}

export function projectCommittedBatchToSpreadsheetSession(params: {
  batch: SpreadsheetCommittedBatchEnvelope
  baseRows: SpreadsheetViewerRow[]
  columns?: SpreadsheetColumn[]
}): SpreadsheetSessionProjectionPatch {
  const changes = params.batch.operations.map(operation => ({
    operationType: operation.type,
    operationId: operation.operationId,
    operationLogId: operation.operationLogId,
    payload: operation.data,
    result: operation.result ?? operation.data,
    baseVersion: operation.baseVersion ?? params.batch.baseVersion,
    appliedVersion: operation.appliedVersion ?? params.batch.appliedVersion
  }))
  return {
    sheetId: params.batch.sheetId,
    rows: applySpreadsheetSessionDeltaChangesToRows(params.baseRows, changes, params.columns),
    version: params.batch.appliedVersion
  }
}
