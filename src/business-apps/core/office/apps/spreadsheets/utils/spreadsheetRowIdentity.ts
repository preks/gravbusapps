import type { SpreadsheetColumn } from '../types'

/** Aligned with spreadsheetViewerRows.UUID_RE — persisted row ids from document-service. */
const BACKEND_ROW_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isSpreadsheetBackendRowUuid = (value: string): boolean => BACKEND_ROW_UUID_RE.test(value)
export const isSpreadsheetTemporaryClientRowId = (value: string): boolean => value.startsWith('client_')
export const toRowIdString = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

export type SpreadsheetBackendRowRef = {
  kind: 'backendUuid'
  rowUuid: string
}

export type SpreadsheetClientRowRef = {
  kind: 'clientHandle'
  clientRowId: string
}

export type SpreadsheetRowRef = SpreadsheetBackendRowRef | SpreadsheetClientRowRef

export const createBackendRowRef = (rowUuid: string): SpreadsheetBackendRowRef => ({
  kind: 'backendUuid',
  rowUuid
})

export const createClientRowRef = (clientRowId: string): SpreadsheetClientRowRef => ({
  kind: 'clientHandle',
  clientRowId
})

export const isSpreadsheetBackendRowRef = (value: unknown): value is SpreadsheetBackendRowRef =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { kind?: unknown }).kind === 'backendUuid' &&
      typeof (value as { rowUuid?: unknown }).rowUuid === 'string' &&
      (value as { rowUuid: string }).rowUuid
  )

export const isSpreadsheetClientRowRef = (value: unknown): value is SpreadsheetClientRowRef =>
  Boolean(
    value &&
      typeof value === 'object' &&
      (value as { kind?: unknown }).kind === 'clientHandle' &&
      typeof (value as { clientRowId?: unknown }).clientRowId === 'string' &&
      (value as { clientRowId: string }).clientRowId
  )

export const resolveSpreadsheetRowRef = (value: unknown): SpreadsheetRowRef | undefined => {
  if (isSpreadsheetBackendRowRef(value)) return value
  if (isSpreadsheetClientRowRef(value)) return value
  return undefined
}

export const createSpreadsheetRowRefFromRowId = (rowId: string): SpreadsheetRowRef | undefined => {
  if (!rowId) return undefined
  if (isSpreadsheetBackendRowUuid(rowId)) {
    return createBackendRowRef(rowId)
  }
  if (isSpreadsheetTemporaryClientRowId(rowId)) {
    return createClientRowRef(rowId)
  }
  return undefined
}

export const getSpreadsheetRowRefIdentity = (rowRef: SpreadsheetRowRef): string =>
  rowRef.kind === 'backendUuid' ? rowRef.rowUuid : rowRef.clientRowId

export type ViewerRow = Record<string, unknown>
export type ViewerRowBackendIdentitySource = '_rowUuid' | 'UUID' | 'uuid' | '_id' | 'id'

export interface ViewerRowBackendIdentity {
  backendRowUuid: string
  identitySource: ViewerRowBackendIdentitySource
}

export interface SpreadsheetRowIdentityDiagnostic {
  uiRowId: string
  backendRowUuid: string | null
  identitySource: ViewerRowBackendIdentitySource | 'remap_map' | 'create_row_response' | 'readiness_coordinator' | null
  hasBackendUuid: boolean
  canRemap: boolean
  remapEntry?: { from: string; to: string }
}

export const getCanonicalRowId = (row: ViewerRow): string => {
  if (typeof row._rowUuid === 'string' && row._rowUuid) return row._rowUuid
  const idField = row._id ?? row.id
  if (idField != null) {
    const rowId = String(idField)
    if (rowId) return rowId
  }
  return ''
}

export const getViewerRowIdentityCandidates = (row: ViewerRow): string[] =>
  Array.from(
    new Set([row._id, row.id, row._rowUuid, row._clientRowId, row.UUID, row.uuid].map(toRowIdString).filter(Boolean))
  )

export const rowMatchesRemoteId = (row: ViewerRow, remoteRowId: string): boolean => {
  if (!remoteRowId) return false
  return getViewerRowIdentityCandidates(row).includes(remoteRowId)
}

export const getClientRowIdentity = (row: ViewerRow): string => {
  const explicit = row._clientRowId
  if (typeof explicit === 'string' && explicit) return explicit
  const id = row._id
  if (typeof id === 'string' && isSpreadsheetTemporaryClientRowId(id)) return id
  return ''
}

export const resolveBackendRowIdentityForViewerRow = (
  row: ViewerRow,
  isUuid: (value: string) => boolean
): ViewerRowBackendIdentity | undefined => {
  const fields: Array<{ source: ViewerRowBackendIdentitySource; value: unknown }> = [
    { source: '_rowUuid', value: row._rowUuid },
    { source: 'UUID', value: row.UUID },
    { source: 'uuid', value: row.uuid },
    { source: '_id', value: row._id },
    { source: 'id', value: row.id }
  ]

  for (const field of fields) {
    const value = toRowIdString(field.value)
    if (value !== '' && isUuid(value)) {
      return { backendRowUuid: value, identitySource: field.source }
    }
  }

  return undefined
}

export const resolveBackendRowIdForViewerRow = (
  row: ViewerRow,
  isUuid: (value: string) => boolean
): string | undefined => resolveBackendRowIdentityForViewerRow(row, isUuid)?.backendRowUuid

export const buildUiToBackendRowIdMap = (
  rows: ViewerRow[],
  isUuid: (value: string) => boolean
): Map<string, string> => {
  const map = new Map<string, string>()
  rows.forEach(row => {
    const backend = resolveBackendRowIdentityForViewerRow(row, isUuid)?.backendRowUuid
    if (!backend) return
    getViewerRowIdentityCandidates(row).forEach(candidateId => {
      map.set(candidateId, backend)
    })
  })
  return map
}

export const buildRowIdentityDiagnostics = ({
  uiRowIds,
  rows,
  uiToBackend,
  isUuid,
  identityOverrides
}: {
  uiRowIds: string[]
  rows: ViewerRow[]
  uiToBackend?: Map<string, string>
  isUuid: (value: string) => boolean
  identityOverrides?: Map<
    string,
    { backendRowUuid: string; identitySource: SpreadsheetRowIdentityDiagnostic['identitySource'] }
  >
}): SpreadsheetRowIdentityDiagnostic[] =>
  Array.from(new Set(uiRowIds.filter(Boolean))).map(uiRowId => {
    const override = identityOverrides?.get(uiRowId)
    const matchingRow = rows.find(row => {
      if (getClientRowIdentity(row) === uiRowId) return true
      return getViewerRowIdentityCandidates(row).includes(uiRowId)
    })
    const resolveIdentity = () => {
      if (override) {
        return { backendRowUuid: override.backendRowUuid, identitySource: override.identitySource }
      }
      if (matchingRow) return resolveBackendRowIdentityForViewerRow(matchingRow, isUuid)
      return undefined
    }
    const resolvedIdentity = resolveIdentity()
    const remapped = uiToBackend?.get(uiRowId) ?? resolvedIdentity?.backendRowUuid

    return {
      uiRowId,
      backendRowUuid: resolvedIdentity?.backendRowUuid ?? null,
      identitySource: resolvedIdentity?.identitySource ?? null,
      hasBackendUuid: Boolean(resolvedIdentity?.backendRowUuid),
      canRemap: Boolean(remapped),
      ...(remapped ? { remapEntry: { from: uiRowId, to: remapped } } : {})
    }
  })

export const resolveColumnAliasInfo = (
  columnKey: string,
  columns?: SpreadsheetColumn[]
): { targetColumnName: string; normalizedAliases: Set<string> } => {
  const targetColumn = columns?.find(column => column.id === columnKey || column.name === columnKey)
  const aliases = [columnKey, targetColumn?.name, targetColumn?.id]
    .map(value => (value == null ? '' : String(value).trim()))
    .filter(Boolean)
    .map(value => value.toLowerCase())

  return {
    targetColumnName: targetColumn?.name ?? String(columnKey),
    normalizedAliases: new Set(aliases)
  }
}

export const stripEquivalentColumnKeysFromRow = (
  row: ViewerRow,
  columnKey: string,
  columns?: SpreadsheetColumn[]
): { nextRow: ViewerRow; targetColumnName: string } => {
  const { targetColumnName, normalizedAliases } = resolveColumnAliasInfo(columnKey, columns)
  const nextRow: ViewerRow = { ...row }

  for (const rowKey of Object.keys(nextRow)) {
    if (!normalizedAliases.has(rowKey.toLowerCase())) continue
    delete nextRow[rowKey]
  }

  return { nextRow, targetColumnName }
}
