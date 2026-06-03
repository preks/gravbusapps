import type { SpreadsheetBatchOperation, SpreadsheetBatchOperationResponse } from '../services/SpreadsheetApiService'
import {
  normalizeCommittedBatchEnvelope,
  SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION,
  type SpreadsheetCommittedBatchEnvelope
} from './spreadsheetCommittedDeltaContract'

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const optionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function buildCommittedBatchEnvelopeFromHttpResponse(params: {
  workbookId: string
  sheetId: string
  requestOperations: SpreadsheetBatchOperation[]
  response: SpreadsheetBatchOperationResponse
  batchId?: string
  clientMutationId?: string
  actorId?: string
  baseVersion: number
  traceId?: string
  traceSessionId?: string
  sessionId?: string
  tabId?: string
}): SpreadsheetCommittedBatchEnvelope {
  const committedBatchOperation = asRecord(params.response.committedBatch)
  const normalizedCommittedBatch =
    committedBatchOperation != null
      ? normalizeCommittedBatchEnvelope({
          operation: committedBatchOperation as {
            data?: unknown
            baseVersion?: number
            version?: number
          },
          incomingVersion: params.response.newVersion,
          actorId: params.actorId,
          fallbackWorkbookId: params.workbookId
        })
      : null
  if (normalizedCommittedBatch) {
    return normalizedCommittedBatch
  }

  const resultByOperationId = new Map(
    (params.response.operationResults ?? []).map(entry => [entry.operationId, entry.result as Record<string, unknown>])
  )

  return {
    sheetId: params.sheetId,
    workbookId: params.workbookId,
    batchId: params.batchId,
    clientMutationId: params.clientMutationId,
    actorId: params.actorId,
    baseVersion: params.baseVersion,
    appliedVersion: params.response.newVersion,
    payloadSchemaVersion: SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION,
    ...(params.response.dirtyRegions && params.response.dirtyRegions.length > 0
      ? { dirtyRegions: params.response.dirtyRegions }
      : {}),
    ...(params.response.gridRowIndexByRowUuid ? { gridRowIndexByRowUuid: params.response.gridRowIndexByRowUuid } : {}),
    ...(params.response.removedRowUuids && params.response.removedRowUuids.length > 0
      ? { removedRowUuids: params.response.removedRowUuids }
      : {}),
    ...(params.response.rowMappings && params.response.rowMappings.length > 0
      ? { rowMappings: params.response.rowMappings }
      : {}),
    ...(optionalString(params.traceId) ? { traceId: params.traceId } : {}),
    ...(optionalString(params.traceSessionId) ? { traceSessionId: params.traceSessionId } : {}),
    ...(optionalString(params.sessionId) ? { sessionId: params.sessionId } : {}),
    ...(optionalString(params.tabId) ? { tabId: params.tabId } : {}),
    operations: params.requestOperations.map(operation => ({
      operationId: operation.operationId,
      type: operation.type,
      data: operation.data,
      result: resultByOperationId.get(operation.operationId),
      baseVersion: params.baseVersion,
      appliedVersion: params.response.newVersion
    }))
  }
}

export function buildRejectedConflictCommittedBatchEnvelope(params: {
  workbookId: string
  sheetId: string
  response: SpreadsheetBatchOperationResponse
  baseBatchId?: string
  actorId?: string
  traceId?: string
  traceSessionId?: string
  sessionId?: string
  tabId?: string
}): SpreadsheetCommittedBatchEnvelope | null {
  const rejectedResults = params.response.results?.filter(
    (entry): entry is Extract<typeof entry, { status: 'rejected_conflict' }> => entry.status === 'rejected_conflict'
  )
  if (!rejectedResults || rejectedResults.length === 0) return null

  const operations = rejectedResults.flatMap(rejected =>
    rejected.serverState
      .filter(cell => cell.field === 'value')
      .map(cell => ({
        operationId: `reject_${rejected.operationId}_${cell.rowId}_${cell.columnName}`,
        type: 'set_cell',
        data: {
          rowId: cell.rowId,
          columnName: cell.columnName,
          value: cell.value
        },
        baseVersion: params.response.newVersion,
        appliedVersion: params.response.newVersion
      }))
  )
  if (operations.length === 0) return null

  return {
    sheetId: params.sheetId,
    workbookId: params.workbookId,
    batchId: params.baseBatchId ? `${params.baseBatchId}:tier1_conflicts` : undefined,
    actorId: params.actorId,
    baseVersion: params.response.newVersion,
    appliedVersion: params.response.newVersion,
    payloadSchemaVersion: SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION,
    ...(optionalString(params.traceId) ? { traceId: params.traceId } : {}),
    ...(optionalString(params.traceSessionId) ? { traceSessionId: params.traceSessionId } : {}),
    ...(optionalString(params.sessionId) ? { sessionId: params.sessionId } : {}),
    ...(optionalString(params.tabId) ? { tabId: params.tabId } : {}),
    operations
  }
}
