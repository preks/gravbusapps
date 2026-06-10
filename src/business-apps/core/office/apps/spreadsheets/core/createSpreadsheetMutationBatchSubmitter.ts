import {
  getSpreadsheetBatchConflictServerVersion,
  SpreadsheetApiRequestError,
  SpreadsheetApiService,
  type SpreadsheetBatchOperation,
  type SpreadsheetBatchOperationResponse
} from '../services/SpreadsheetApiService'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetMutationBatchRequest, SpreadsheetMutationFacade } from './SpreadsheetMutationFacade'
import {
  collectKnownRowIdFieldMatches,
  detectTemporaryRowIdsInKnownRowIdFields
} from '../utils/spreadsheetUnifiedBatchSubmitUtils'
import { normalizeBatchOperationsWithRowRefs } from '../utils/spreadsheetBatchOperationRowRemap'
import { isSpreadsheetBackendRowUuid } from '../utils/spreadsheetRowIdentity'

type SpreadsheetTraceContext = {
  traceSessionId?: string
  sessionId?: string
  tabId?: string
}

interface CreateSpreadsheetMutationBatchSubmitterOptions {
  appId: string
  createBatchId: (prefix: string) => string
  getTraceContext: () => SpreadsheetTraceContext
  shouldKeepalive: () => boolean
  /** Normalize route sheet id (e.g. temp Univer id → persisted server id) before HTTP + bookkeeping. */
  normalizeTargetSheetId?: (sheetId: string) => string
  isActiveSheet: (sheetId: string) => boolean
  resolveBaseVersion: (sheetId: string) => number
  getActiveSheetVersion: () => number
  refreshBaseVersionBeforeWrite: (sheetId: string, baseVersion: number) => Promise<number>
  fetchSheetVersion: (sheetId: string) => Promise<number>
  rememberRecentLocalBatchId: (batchId: string, tabId?: string) => void
  rememberKnownSheetVersion: (sheetId: string, version: number) => void
  rememberSheetVersion: (sheetId: string, version: number) => void
  rememberLocalCommittedVersion: (version: number) => void
  setActiveSheetVersion: (version: number) => void
  applyLocalCommittedBatch?: (params: {
    sheetId: string
    operations: SpreadsheetBatchOperation[]
    response: SpreadsheetBatchOperationResponse
    batchId: string
    traceId: string
    baseVersion: number
  }) => boolean
  applyMutationToSession: (
    sheetId: string,
    operations: SpreadsheetBatchOperation[],
    response: SpreadsheetBatchOperationResponse
  ) => void
  applyResponseRowsToLocalBaseline: (
    sheetId: string,
    operations: SpreadsheetBatchOperation[],
    response: SpreadsheetBatchOperationResponse
  ) => void
  incrementConflictCount: () => void
  recoverFromVersionConflict: () => Promise<boolean>
  scheduleSnapshotCheckpointFromPersistence: () => void
  emitTraceEvent: (event: SpreadsheetTraceEventInput) => void
  /** Called immediately after a successful HTTP batch so collab/queue versions advance before WS echo. */
  onLocalBatchCommitted?: (sheetId: string, version: number) => void
  releaseMutationOwnershipFromResponse?: (params: {
    sheetId: string
    operations: SpreadsheetBatchOperation[]
    response: SpreadsheetBatchOperationResponse
  }) => void
}

const applyOperationBatch = async ({
  appId,
  targetSheetId,
  baseVersion,
  operations,
  batchId,
  clientMutationId,
  traceId,
  traceContext,
  keepalive
}: {
  appId: string
  targetSheetId: string
  baseVersion: number
  operations: SpreadsheetBatchOperation[]
  batchId: string
  clientMutationId?: string
  traceId: string
  traceContext: SpreadsheetTraceContext
  keepalive?: boolean
}): Promise<SpreadsheetBatchOperationResponse> =>
  SpreadsheetApiService.applyOperationBatch(
    appId,
    targetSheetId,
    {
      baseVersion,
      operations,
      batchId,
      clientMutationId: clientMutationId ?? batchId,
      traceSessionId: traceContext.traceSessionId,
      traceId,
      sessionId: traceContext.sessionId,
      tabId: traceContext.tabId
    },
    keepalive ? { keepalive: true } : undefined
  )

const getRetryableBatchErrorCode = (error: unknown): string | undefined => {
  if (!(error instanceof SpreadsheetApiRequestError)) return undefined
  if (!error.details || typeof error.details !== 'object') return undefined
  const code = (error.details as { code?: unknown }).code
  const retryable = (error.details as { retryable?: unknown }).retryable
  return retryable === true && typeof code === 'string' ? code : undefined
}

const assertNoTemporaryRowIdsInKnownFields = ({
  operations,
  targetSheetId,
  traceId,
  emitTraceEvent
}: {
  operations: SpreadsheetBatchOperation[]
  targetSheetId: string
  traceId: string
  emitTraceEvent: (event: SpreadsheetTraceEventInput) => void
}): void => {
  const knownRowIdFields = collectKnownRowIdFieldMatches(operations)
  const temporaryRowIdMatches = detectTemporaryRowIdsInKnownRowIdFields(operations)
  emitTraceEvent({
    source: 'client',
    stage: 'http_batch_pre_submit_row_id_check',
    traceId,
    payload: {
      targetSheetId,
      temporaryRowIdMatches,
      hasTemporaryRowIdsInKnownFields: temporaryRowIdMatches.length > 0,
      submittedRowIds: knownRowIdFields.map(match => ({
        operationType: match.operationType,
        fieldPath: match.fieldPath,
        submittedRowId: match.rowId,
        submittedRowIdIsBackendUuid: isSpreadsheetBackendRowUuid(match.rowId),
        containsTemporaryClientRowId: temporaryRowIdMatches.some(
          temporaryMatch =>
            temporaryMatch.operationIndex === match.operationIndex &&
            temporaryMatch.fieldPath === match.fieldPath &&
            temporaryMatch.rowId === match.rowId
        )
      }))
    }
  })

  if (temporaryRowIdMatches.length === 0) return

  throw new Error(
    `Blocked spreadsheet /operations/batch submit because known semantic row-id fields still contain temporary client ids: ${temporaryRowIdMatches
      .map(match => `${match.operationType}:${match.fieldPath}=${match.rowId}`)
      .join(', ')}`
  )
}

export const createSpreadsheetMutationBatchSubmitter = (
  options: CreateSpreadsheetMutationBatchSubmitterOptions
): SpreadsheetMutationFacade['submitBatch'] => {
  const handleSuccess = ({
    targetSheetId,
    operations,
    response,
    batchId,
    traceId,
    batchIdPrefix,
    baseVersion,
    traceMetaOperationType,
    extraPayload
  }: {
    targetSheetId: string
    operations: SpreadsheetBatchOperation[]
    response: SpreadsheetBatchOperationResponse
    batchId: string
    traceId: string
    batchIdPrefix: string
    baseVersion?: number
    traceMetaOperationType?: string
    extraPayload?: Record<string, unknown>
  }): SpreadsheetBatchOperationResponse => {
    const isActiveTarget = options.isActiveSheet(targetSheetId)
    options.rememberKnownSheetVersion(targetSheetId, response.newVersion)
    const shouldReleaseOwnershipBeforeLocalApply = baseVersion != null
    if (shouldReleaseOwnershipBeforeLocalApply) {
      options.releaseMutationOwnershipFromResponse?.({
        sheetId: targetSheetId,
        operations,
        response
      })
    }
    const committedBatchHandled =
      baseVersion != null
        ? (options.applyLocalCommittedBatch?.({
            sheetId: targetSheetId,
            operations,
            response,
            batchId,
            traceId,
            baseVersion
          }) ?? false)
        : false
    if (!committedBatchHandled) {
      options.applyMutationToSession(targetSheetId, operations, response)
    }
    if (!shouldReleaseOwnershipBeforeLocalApply) {
      options.releaseMutationOwnershipFromResponse?.({
        sheetId: targetSheetId,
        operations,
        response
      })
    }
    options.emitTraceEvent({
      source: 'client',
      stage: 'http_batch_submit_succeeded',
      traceSessionId: options.getTraceContext().traceSessionId ?? null,
      traceId,
      batchId,
      operationType: traceMetaOperationType ?? batchIdPrefix,
      ...(baseVersion != null ? { baseVersion } : {}),
      version: response.newVersion,
      payload: extraPayload
        ? {
            ...(response as unknown as Record<string, unknown>),
            ...extraPayload
          }
        : (response as unknown as Record<string, unknown>)
    })
    if (isActiveTarget) {
      options.setActiveSheetVersion(response.newVersion)
      options.rememberSheetVersion(targetSheetId, response.newVersion)
      options.rememberLocalCommittedVersion(response.newVersion)
      if (!committedBatchHandled) {
        options.applyResponseRowsToLocalBaseline(targetSheetId, operations, response)
      }
      options.onLocalBatchCommitted?.(targetSheetId, response.newVersion)
      return response
    }

    options.rememberSheetVersion(targetSheetId, response.newVersion)
    options.onLocalBatchCommitted?.(targetSheetId, response.newVersion)
    return response
  }

  return async (request: SpreadsheetMutationBatchRequest): Promise<SpreadsheetBatchOperationResponse> => {
    const { sheetId: rawSheetId, operations, batchIdOverride, traceMeta } = request
    const targetSheetId = options.normalizeTargetSheetId ? options.normalizeTargetSheetId(rawSheetId) : rawSheetId
    const batchIdPrefix = request.batchIdPrefix ?? 'batch'
    const batchId = batchIdOverride ?? options.createBatchId(batchIdPrefix)
    const traceId = traceMeta?.traceId ?? batchId
    const isActiveTarget = options.isActiveSheet(targetSheetId)
    const preparedOperations = normalizeBatchOperationsWithRowRefs(operations, new Map())
    const callerProvidedBaseVersion =
      typeof request.baseVersion === 'number' && Number.isFinite(request.baseVersion)
        ? Math.trunc(request.baseVersion)
        : undefined

    try {
      // Honor a caller-authored base version verbatim (the sheet work queue
      // passes its invariant-validated `queueClientAppliedVersion` so the
      // wire-sent base matches exactly what the queue gate authorized).
      // Legacy callers that omit `baseVersion` keep the prior behavior.
      const baseVersion =
        callerProvidedBaseVersion ??
        (await options.refreshBaseVersionBeforeWrite(targetSheetId, options.resolveBaseVersion(targetSheetId)))
      if (isActiveTarget) {
        options.rememberRecentLocalBatchId(batchId, options.getTraceContext().tabId)
      }
      options.emitTraceEvent({
        source: 'client',
        stage: 'http_batch_submit_started',
        traceSessionId: options.getTraceContext().traceSessionId ?? null,
        traceId,
        batchId,
        operationType: traceMeta?.operationType ?? batchIdPrefix,
        baseVersion,
        payload: {
          targetSheetId,
          operations: preparedOperations,
          sourceTraceIds: traceMeta?.sourceTraceIds ?? []
        }
      })
      assertNoTemporaryRowIdsInKnownFields({
        operations: preparedOperations,
        targetSheetId,
        traceId,
        emitTraceEvent: options.emitTraceEvent
      })

      const response = await applyOperationBatch({
        appId: options.appId,
        targetSheetId,
        baseVersion,
        operations: preparedOperations,
        batchId,
        clientMutationId: traceMeta?.clientMutationId,
        traceId,
        traceContext: options.getTraceContext(),
        keepalive: options.shouldKeepalive()
      })

      return handleSuccess({
        targetSheetId,
        operations: preparedOperations,
        response,
        batchId,
        traceId,
        batchIdPrefix,
        baseVersion,
        traceMetaOperationType: traceMeta?.operationType
      })
    } catch (error) {
      const retryableErrorCode = getRetryableBatchErrorCode(error)
      if (retryableErrorCode === 'unknown_client_row_handle' || retryableErrorCode === 'dependency_not_ready') {
        const retryBatchId = options.createBatchId(`${batchIdPrefix}_retry_wait`)
        const retryBaseVersion = await options.refreshBaseVersionBeforeWrite(
          targetSheetId,
          options.resolveBaseVersion(targetSheetId)
        )
        const retry = await applyOperationBatch({
          appId: options.appId,
          targetSheetId,
          baseVersion: retryBaseVersion,
          operations: preparedOperations,
          batchId: retryBatchId,
          clientMutationId: traceMeta?.clientMutationId ?? batchId,
          traceId,
          traceContext: options.getTraceContext(),
          keepalive: options.shouldKeepalive()
        })
        return handleSuccess({
          targetSheetId,
          operations: preparedOperations,
          response: retry,
          batchId: retryBatchId,
          traceId,
          batchIdPrefix,
          baseVersion: retryBaseVersion,
          traceMetaOperationType: traceMeta?.operationType,
          extraPayload: { retriedBatchId: batchId, retryReason: retryableErrorCode }
        })
      }

      // Tier 1 conflict resolution shipped: the backend resolves per-(rowId,
      // columnName) conflicts inline and returns 200 with `results[]`. A 409
      // now means a true exception (`structural_conflict`, `version_too_stale`,
      // `partial_operation_id_overlap`, etc.) that the client cannot rebase —
      // we surface the version (if any) so the caller can refetch and bubble
      // the error up; no quick-retry, no destructive `recoverFromVersionConflict`
      // dance, no full resubmit storm.
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        const serverVersion = getSpreadsheetBatchConflictServerVersion(error.details)
        if (serverVersion != null) {
          options.rememberKnownSheetVersion(targetSheetId, serverVersion)
          if (isActiveTarget) {
            options.setActiveSheetVersion(serverVersion)
            options.rememberSheetVersion(targetSheetId, serverVersion)
          }
        }
        throw error
      }

      options.emitTraceEvent({
        source: 'client',
        stage: 'http_batch_submit_failed',
        severity: 'error',
        traceSessionId: options.getTraceContext().traceSessionId ?? null,
        traceId,
        batchId,
        operationType: traceMeta?.operationType ?? batchIdPrefix,
        payload: {
          message: error instanceof Error ? error.message : String(error)
        }
      })
      throw error
    }
  }
}
