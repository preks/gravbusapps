import {
  getSpreadsheetBatchConflictServerVersion,
  SpreadsheetApiRequestError,
  SpreadsheetApiService,
  type SpreadsheetBatchOperation,
  type SpreadsheetBatchOperationResponse
} from '../services/SpreadsheetApiService'
import type { SpreadsheetTraceEventInput } from '../services/spreadsheetDiagnostics'
import type { SpreadsheetMutationBatchRequest, SpreadsheetMutationFacade } from './SpreadsheetMutationFacade'

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
}

const applyOperationBatch = async ({
  appId,
  targetSheetId,
  baseVersion,
  operations,
  batchId,
  traceId,
  traceContext,
  keepalive
}: {
  appId: string
  targetSheetId: string
  baseVersion: number
  operations: SpreadsheetBatchOperation[]
  batchId: string
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
      traceSessionId: traceContext.traceSessionId,
      traceId,
      sessionId: traceContext.sessionId,
      tabId: traceContext.tabId
    },
    keepalive ? { keepalive: true } : undefined
  )

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
    options.applyMutationToSession(targetSheetId, operations, response)
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
      options.applyResponseRowsToLocalBaseline(targetSheetId, operations, response)
      return response
    }

    options.rememberSheetVersion(targetSheetId, response.newVersion)
    return response
  }

  return async (request: SpreadsheetMutationBatchRequest): Promise<SpreadsheetBatchOperationResponse> => {
    const { sheetId: rawSheetId, operations, batchIdOverride, traceMeta } = request
    const targetSheetId = options.normalizeTargetSheetId ? options.normalizeTargetSheetId(rawSheetId) : rawSheetId
    const batchIdPrefix = request.batchIdPrefix ?? 'batch'
    const batchId = batchIdOverride ?? options.createBatchId(batchIdPrefix)
    const traceId = traceMeta?.traceId ?? batchId
    const isActiveTarget = options.isActiveSheet(targetSheetId)

    try {
      const baseVersion = await options.refreshBaseVersionBeforeWrite(
        targetSheetId,
        options.resolveBaseVersion(targetSheetId)
      )
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
          operations,
          sourceTraceIds: traceMeta?.sourceTraceIds ?? []
        }
      })

      const response = await applyOperationBatch({
        appId: options.appId,
        targetSheetId,
        baseVersion,
        operations,
        batchId,
        traceId,
        traceContext: options.getTraceContext(),
        keepalive: options.shouldKeepalive()
      })

      return handleSuccess({
        targetSheetId,
        operations,
        response,
        batchId,
        traceId,
        batchIdPrefix,
        baseVersion,
        traceMetaOperationType: traceMeta?.operationType
      })
    } catch (error) {
      if (error instanceof SpreadsheetApiRequestError && error.status === 409) {
        const serverVersion = getSpreadsheetBatchConflictServerVersion(error.details)
        if (serverVersion != null) {
          options.rememberKnownSheetVersion(targetSheetId, serverVersion)
        }

        if (serverVersion != null && isActiveTarget) {
          options.setActiveSheetVersion(serverVersion)
          options.rememberSheetVersion(targetSheetId, serverVersion)
          try {
            const quickRetryBatchId = options.createBatchId(`${batchIdPrefix}_cv_retry`)
            const quickRetry = await applyOperationBatch({
              appId: options.appId,
              targetSheetId,
              baseVersion: serverVersion,
              operations,
              batchId: quickRetryBatchId,
              traceId,
              traceContext: options.getTraceContext()
            })
            options.scheduleSnapshotCheckpointFromPersistence()
            return handleSuccess({
              targetSheetId,
              operations,
              response: quickRetry,
              batchId: quickRetryBatchId,
              traceId,
              batchIdPrefix,
              baseVersion: serverVersion,
              traceMetaOperationType: traceMeta?.operationType,
              extraPayload: { retriedBatchId: batchId }
            })
          } catch {
            // Fall through to full conflict recovery.
          }
        }

        if (isActiveTarget) {
          options.incrementConflictCount()
          const recovered = await options.recoverFromVersionConflict()
          if (!recovered) {
            throw error
          }
          const retryBatchId = options.createBatchId(
            batchIdOverride ? `${batchIdPrefix}_retry_after_restore` : `${batchIdPrefix}_retry`
          )
          const retry = await applyOperationBatch({
            appId: options.appId,
            targetSheetId,
            baseVersion: options.getActiveSheetVersion(),
            operations,
            batchId: retryBatchId,
            traceId,
            traceContext: options.getTraceContext(),
            keepalive: options.shouldKeepalive()
          })
          return handleSuccess({
            targetSheetId,
            operations,
            response: retry,
            batchId: retryBatchId,
            traceId,
            batchIdPrefix,
            baseVersion: options.getActiveSheetVersion(),
            traceMetaOperationType: traceMeta?.operationType
          })
        }

        try {
          const latestSheetVersion = await options.fetchSheetVersion(targetSheetId)
          options.rememberKnownSheetVersion(targetSheetId, latestSheetVersion)
          const retryBatchId = options.createBatchId(
            batchIdOverride ? `${batchIdPrefix}_retry_after_restore` : `${batchIdPrefix}_retry`
          )
          const retry = await applyOperationBatch({
            appId: options.appId,
            targetSheetId,
            baseVersion: latestSheetVersion,
            operations,
            batchId: retryBatchId,
            traceId,
            traceContext: options.getTraceContext(),
            keepalive: options.shouldKeepalive()
          })
          return handleSuccess({
            targetSheetId,
            operations,
            response: retry,
            batchId: retryBatchId,
            traceId,
            batchIdPrefix,
            traceMetaOperationType: traceMeta?.operationType
          })
        } catch {
          throw error
        }
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
