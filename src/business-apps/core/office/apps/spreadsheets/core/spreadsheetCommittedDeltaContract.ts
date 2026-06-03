import { parseSpreadsheetDirtyRegions, type SpreadsheetDirtyRegion } from '../utils/spreadsheetDirtyRegions'
import { parseCommittedGridRowPlacements } from '../utils/spreadsheetCommittedGridRowPlacements'

export const SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION = 1

export type { SpreadsheetDirtyRegion }

export type SpreadsheetDeltaReplayMode = 'off' | 'shadow' | 'enabled'

export type SpreadsheetCommittedOperation = {
  operationId?: string
  operationLogId?: string
  type: string
  data: Record<string, unknown>
  result?: Record<string, unknown>
  baseVersion?: number
  appliedVersion?: number
}

export type SpreadsheetCommittedBatchEnvelope = {
  sheetId: string
  workbookId?: string
  batchId?: string
  actorId?: string
  clientMutationId?: string
  baseVersion: number
  appliedVersion: number
  operations: SpreadsheetCommittedOperation[]
  payloadSchemaVersion: number
  requiresSnapshot?: boolean
  traceId?: string
  traceSessionId?: string
  sessionId?: string
  tabId?: string
  /** Authoritative dirty regions from backend batch commit (when present). */
  dirtyRegions?: SpreadsheetDirtyRegion[]
  /** Identity-keyed canonical row placements from the backend commit. */
  gridRowIndexByRowUuid?: Record<string, number>
  removedRowUuids?: string[]
  rowMappings?: Array<{ clientRowId: string; rowUuid: string; gridRowIndex?: number }>
}

export type SpreadsheetCommittedBatchValidationResult =
  | { ok: true }
  | {
      ok: false
      reason:
        | 'invalid_envelope'
        | 'unsupported_payload_schema'
        | 'requires_snapshot'
        | 'missing_version'
        | 'version_gap'
        | 'stale_version'
        | 'duplicate'
    }

const toFiniteVersion = (value: unknown): number | null => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return null
  return Math.trunc(numeric)
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const optionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function getSpreadsheetDeltaReplayMode(): SpreadsheetDeltaReplayMode {
  try {
    const value = globalThis.localStorage?.getItem('gba.spreadsheets.deltaReplay')
    if (value === 'off' || value === 'shadow' || value === 'enabled') return value
  } catch {
    /* localStorage can be unavailable in tests/SSR. */
  }
  return 'enabled'
}

export function buildCommittedBatchDedupeKey(batch: SpreadsheetCommittedBatchEnvelope): string {
  const id =
    batch.batchId || batch.clientMutationId || batch.operations.map(op => op.operationLogId || op.operationId).join(',')
  return `${batch.sheetId}:${batch.appliedVersion}:${id || 'no-id'}`
}

export function normalizeCommittedBatchEnvelope(params: {
  operation: { data?: unknown; baseVersion?: number; version?: number }
  incomingVersion?: number
  actorId?: string
  fallbackWorkbookId?: string
}): SpreadsheetCommittedBatchEnvelope | null {
  const data = asRecord(params.operation.data)
  if (!data) return null
  const operations = Array.isArray(data.operations) ? data.operations : []
  if (operations.length === 0) return null

  const appliedVersion =
    toFiniteVersion(data.appliedVersion) ??
    toFiniteVersion(params.operation.version) ??
    toFiniteVersion(params.incomingVersion)
  const baseVersion =
    toFiniteVersion(data.baseVersion) ??
    toFiniteVersion(params.operation.baseVersion) ??
    (appliedVersion != null ? Math.max(0, appliedVersion - 1) : null)
  const sheetId = optionalString(data.sheetId)
  if (!sheetId || baseVersion == null || appliedVersion == null) return null

  return {
    sheetId,
    workbookId: optionalString(data.workbookId) ?? params.fallbackWorkbookId,
    batchId: optionalString(data.batchId),
    actorId: optionalString(data.actorId) ?? params.actorId,
    clientMutationId: optionalString(data.clientMutationId),
    baseVersion,
    appliedVersion,
    payloadSchemaVersion:
      toFiniteVersion(data.payloadSchemaVersion) ?? SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION,
    requiresSnapshot: data.requiresSnapshot === true,
    traceId: optionalString(data.traceId),
    traceSessionId: optionalString(data.traceSessionId),
    sessionId: optionalString(data.sessionId),
    tabId: optionalString(data.tabId),
    ...(() => {
      const dirtyRegions = parseSpreadsheetDirtyRegions(data.dirtyRegions)
      return dirtyRegions.length > 0 ? { dirtyRegions } : {}
    })(),
    ...(() => {
      const gridRowIndexByRowUuid = parseCommittedGridRowPlacements(data.gridRowIndexByRowUuid)
      return gridRowIndexByRowUuid ? { gridRowIndexByRowUuid } : {}
    })(),
    ...(() => {
      const removedRowUuids = Array.isArray(data.removedRowUuids)
        ? data.removedRowUuids.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
        : []
      return removedRowUuids.length > 0 ? { removedRowUuids } : {}
    })(),
    ...(() => {
      const rowMappings = Array.isArray(data.rowMappings)
        ? data.rowMappings
            .map(entry => {
              const mapping = asRecord(entry)
              const clientRowId = optionalString(mapping?.clientRowId)
              const rowUuid = optionalString(mapping?.rowUuid)
              if (!clientRowId || !rowUuid) return null
              const gridRowIndex = toFiniteVersion(mapping?.gridRowIndex)
              return gridRowIndex != null ? { clientRowId, rowUuid, gridRowIndex } : { clientRowId, rowUuid }
            })
            .filter((entry): entry is { clientRowId: string; rowUuid: string; gridRowIndex?: number } => entry != null)
        : []
      return rowMappings.length > 0 ? { rowMappings } : {}
    })(),
    operations: operations
      .map((entry): SpreadsheetCommittedOperation | null => {
        const op = asRecord(entry)
        if (!op) return null
        const type = optionalString(op.type)
        const opData = asRecord(op.data)
        if (!type || !opData) return null
        return {
          type,
          data: opData,
          operationId: optionalString(op.operationId),
          operationLogId: optionalString(op.operationLogId),
          result: asRecord(op.result) ?? undefined,
          baseVersion: toFiniteVersion(op.baseVersion) ?? baseVersion,
          appliedVersion: toFiniteVersion(op.appliedVersion) ?? appliedVersion
        }
      })
      .filter((op): op is SpreadsheetCommittedOperation => op != null)
  }
}

type ReplayDeltaLike = {
  operationType: string
  payload: Record<string, unknown>
  result?: Record<string, unknown>
  operationId?: string
  operationLogId?: string
  baseVersion?: number
  appliedVersion: number
}

const replayDeltaBatchGroupKey = (change: ReplayDeltaLike): string => {
  const appliedVersion = Math.trunc(change.appliedVersion)
  const baseVersion =
    change.baseVersion != null && Number.isFinite(change.baseVersion)
      ? Math.trunc(change.baseVersion)
      : Math.max(0, appliedVersion - 1)
  const batchId = change.operationLogId ?? change.operationId
  return batchId ? `${appliedVersion}:${baseVersion}:${batchId}` : `${appliedVersion}:${baseVersion}`
}

/**
 * Groups HTTP replay deltas into committed-batch envelopes (version order, then batch identity).
 */
export function replayDeltasAsCommittedBatches(params: {
  changes: ReplayDeltaLike[]
  sheetId: string
}): SpreadsheetCommittedBatchEnvelope[] {
  const { changes, sheetId } = params
  if (!sheetId || changes.length === 0) return []

  const sorted = [...changes].sort((left, right) => {
    if (left.appliedVersion !== right.appliedVersion) return left.appliedVersion - right.appliedVersion
    const leftBase = left.baseVersion ?? Math.max(0, left.appliedVersion - 1)
    const rightBase = right.baseVersion ?? Math.max(0, right.appliedVersion - 1)
    if (leftBase !== rightBase) return leftBase - rightBase
    const leftId = left.operationLogId ?? left.operationId ?? ''
    const rightId = right.operationLogId ?? right.operationId ?? ''
    return leftId.localeCompare(rightId)
  })

  const batches: SpreadsheetCommittedBatchEnvelope[] = []
  let current: SpreadsheetCommittedBatchEnvelope | null = null
  let currentGroupKey: string | null = null

  for (const change of sorted) {
    const groupKey = replayDeltaBatchGroupKey(change)
    const appliedVersion = Math.trunc(change.appliedVersion)
    const baseVersion =
      change.baseVersion != null && Number.isFinite(change.baseVersion)
        ? Math.trunc(change.baseVersion)
        : Math.max(0, appliedVersion - 1)
    const batchId = change.operationLogId ?? change.operationId

    if (!current || currentGroupKey !== groupKey) {
      if (current) batches.push(current)
      currentGroupKey = groupKey
      current = {
        sheetId,
        batchId,
        baseVersion,
        appliedVersion,
        operations: [],
        payloadSchemaVersion: SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION
      }
    }

    current.operations.push({
      type: change.operationType,
      data: change.payload,
      result: change.result,
      operationId: change.operationId,
      operationLogId: change.operationLogId,
      baseVersion,
      appliedVersion
    })
  }

  if (current) batches.push(current)
  return batches
}

export function validateCommittedBatchForLiveApply(params: {
  batch: SpreadsheetCommittedBatchEnvelope
  localAppliedVersion: number | null | undefined
  alreadyApplied: boolean
}): SpreadsheetCommittedBatchValidationResult {
  const { batch, localAppliedVersion, alreadyApplied } = params
  if (alreadyApplied) return { ok: false, reason: 'duplicate' }
  if (batch.requiresSnapshot) return { ok: false, reason: 'requires_snapshot' }
  if (batch.payloadSchemaVersion !== SPREADSHEET_COMMITTED_DELTA_PAYLOAD_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported_payload_schema' }
  }
  if (localAppliedVersion == null || !Number.isFinite(localAppliedVersion)) {
    return { ok: false, reason: 'missing_version' }
  }
  const normalizedLocalVersion = Math.trunc(localAppliedVersion)
  const appliedVersion = Math.trunc(batch.appliedVersion)
  const expectedNextVersion = normalizedLocalVersion + 1
  if (batch.operations.length === 0) {
    return { ok: false, reason: 'invalid_envelope' }
  }
  if (appliedVersion === expectedNextVersion) {
    return { ok: true }
  }
  // Fast local typing can advance the sheet version ahead of slower peers. A peer batch whose
  // appliedVersion is already "in the past" may still carry cell ops we never painted — apply it
  // live when this client has not yet recorded the batch idempotency key.
  if (appliedVersion <= normalizedLocalVersion) {
    return { ok: true }
  }
  if (appliedVersion > expectedNextVersion) {
    return { ok: false, reason: 'version_gap' }
  }
  return { ok: false, reason: 'stale_version' }
}
