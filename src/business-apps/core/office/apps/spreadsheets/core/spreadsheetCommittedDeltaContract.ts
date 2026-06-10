import { parseSpreadsheetDirtyRegions, type SpreadsheetDirtyRegion } from '../utils/spreadsheetDirtyRegions'
import { parseCommittedGridRowPlacements } from '../utils/spreadsheetCommittedGridRowPlacements'
import type { SpreadsheetColumn } from '../types'

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

export type SpreadsheetCommittedWorksheetMetadataPatch = {
  sheetId: string
  keys: Record<string, unknown>
}

export type SpreadsheetCommittedCommentAnchorPatch = {
  entityType?: string
  entityId?: string
  id: string
  cellReference?: string | null
  sheetId?: string
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
  columns?: SpreadsheetColumn[]
  visibleColumnIds?: string[]
  gridColumnIndexByColumnId?: Record<string, number>
  worksheetMetadataPatch?: SpreadsheetCommittedWorksheetMetadataPatch
  commentAnchorPatches?: SpreadsheetCommittedCommentAnchorPatch[]
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

const normalizeCommittedColumns = (value: unknown): SpreadsheetColumn[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((entry, index): SpreadsheetColumn | null => {
      const column = asRecord(entry)
      const id = optionalString(column?.id)
      const name = optionalString(column?.name)
      if (!id || !name) return null
      const label = optionalString(column?.label) ?? name
      const order = toFiniteVersion(column?.order) ?? index
      return {
        ...(column as SpreadsheetColumn),
        id,
        name,
        label,
        type: optionalString(column?.type) ?? 'text',
        isVisible: column?.isVisible !== false,
        isEditable: column?.isEditable !== false,
        isRequired: column?.isRequired === true,
        isUnique: column?.isUnique === true,
        order
      }
    })
    .filter((column): column is SpreadsheetColumn => column != null)
    .sort((left, right) => left.order - right.order)
}

const parseCommittedGridColumnPlacements = (value: unknown): Record<string, number> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const placements: Record<string, number> = {}
  for (const [columnId, rawIndex] of Object.entries(value as Record<string, unknown>)) {
    const normalized = Number(rawIndex)
    if (!columnId || !Number.isFinite(normalized) || normalized < 0) continue
    placements[columnId] = Math.trunc(normalized)
  }
  return Object.keys(placements).length > 0 ? placements : undefined
}

const parseVisibleColumnIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map(entry => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean)
}

const parseWorksheetMetadataPatch = (value: unknown): SpreadsheetCommittedWorksheetMetadataPatch | undefined => {
  const patch = asRecord(value)
  const sheetId = optionalString(patch?.sheetId)
  const keys = asRecord(patch?.keys)
  if (!sheetId || !keys || Object.keys(keys).length === 0) {
    return undefined
  }
  return {
    sheetId,
    keys: { ...keys }
  }
}

const parseCommentAnchorPatches = (value: unknown): SpreadsheetCommittedCommentAnchorPatch[] => {
  if (!Array.isArray(value)) return []
  return value
    .map(entry => {
      const patch = asRecord(entry)
      const id = optionalString(patch?.id)
      if (!id) return null
      const entityType = optionalString(patch?.entityType)
      const entityId = optionalString(patch?.entityId)
      const sheetId = optionalString(patch?.sheetId)
      const cellReference =
        typeof patch?.cellReference === 'string'
          ? patch.cellReference
          : patch?.cellReference === null
            ? null
            : undefined
      return {
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        id,
        ...(sheetId ? { sheetId } : {}),
        ...(cellReference !== undefined ? { cellReference } : {})
      }
    })
    .filter((patch): patch is SpreadsheetCommittedCommentAnchorPatch => patch != null)
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

const resolveCommittedOperationIdentity = (
  operations: readonly Pick<SpreadsheetCommittedOperation, 'operationId' | 'operationLogId'>[]
): string | null => {
  const identities = operations
    .map(operation => operation.operationLogId ?? operation.operationId ?? '')
    .map(identity => identity.trim())
    .filter(Boolean)
  if (identities.length === 0) {
    return null
  }
  return Array.from(new Set(identities)).join(',')
}

export function buildCommittedBatchDedupeKey(batch: SpreadsheetCommittedBatchEnvelope): string {
  const id = resolveCommittedOperationIdentity(batch.operations) ?? batch.clientMutationId ?? batch.batchId ?? 'no-id'
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
    ...(() => {
      const columns = normalizeCommittedColumns(data.columns)
      return columns.length > 0 ? { columns } : {}
    })(),
    ...(() => {
      const visibleColumnIds = parseVisibleColumnIds(data.visibleColumnIds)
      return visibleColumnIds.length > 0 ? { visibleColumnIds } : {}
    })(),
    ...(() => {
      const gridColumnIndexByColumnId = parseCommittedGridColumnPlacements(data.gridColumnIndexByColumnId)
      return gridColumnIndexByColumnId ? { gridColumnIndexByColumnId } : {}
    })(),
    ...(() => {
      const worksheetMetadataPatch = parseWorksheetMetadataPatch(data.worksheetMetadataPatch)
      return worksheetMetadataPatch ? { worksheetMetadataPatch } : {}
    })(),
    ...(() => {
      const commentAnchorPatches = parseCommentAnchorPatches(data.commentAnchorPatches)
      return commentAnchorPatches.length > 0 ? { commentAnchorPatches } : {}
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

const extractCommittedColumnStructureFromChange = (
  change: ReplayDeltaLike
): {
  columns: SpreadsheetColumn[]
  visibleColumnIds?: string[]
  gridColumnIndexByColumnId?: Record<string, number>
} | null => {
  const result = asRecord(change.result)
  if (!result) return null
  const columns = normalizeCommittedColumns(result.columns)
  if (columns.length === 0) return null
  const visibleColumnIds = parseVisibleColumnIds(result.visibleColumnIds)
  const gridColumnIndexByColumnId = parseCommittedGridColumnPlacements(result.gridColumnIndexByColumnId)
  return {
    columns,
    ...(visibleColumnIds.length > 0 ? { visibleColumnIds } : {}),
    ...(gridColumnIndexByColumnId ? { gridColumnIndexByColumnId } : {})
  }
}

const replayDeltaBatchGroupKey = (change: ReplayDeltaLike): string => {
  const appliedVersion = Math.trunc(change.appliedVersion)
  const baseVersion =
    change.baseVersion != null && Number.isFinite(change.baseVersion)
      ? Math.trunc(change.baseVersion)
      : Math.max(0, appliedVersion - 1)
  if (change.operationType === 'column_add' || change.operationType === 'column_delete') {
    return `${appliedVersion}:${baseVersion}:column-structure:${change.operationType}`
  }
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
    const batchId =
      change.operationType === 'column_add' || change.operationType === 'column_delete'
        ? undefined
        : (change.operationLogId ?? change.operationId)

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
    const columnStructure = extractCommittedColumnStructureFromChange(change)
    if (columnStructure) {
      current = {
        ...current,
        ...columnStructure
      }
    }
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
