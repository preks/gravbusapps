import type { SpreadsheetColumn } from '../types'

/** Aligned with spreadsheetViewerRows.UUID_RE — persisted row ids from document-service. */
const BACKEND_ROW_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const isSpreadsheetBackendRowUuid = (value: string): boolean => BACKEND_ROW_UUID_RE.test(value)

export type ViewerRow = Record<string, unknown>

export const getCanonicalRowId = (row: ViewerRow): string => {
  const idField = row._id ?? row.id
  if (idField != null) {
    const rowId = String(idField)
    if (rowId) return rowId
  }

  return typeof row._rowUuid === 'string' && row._rowUuid ? row._rowUuid : ''
}

export const getViewerRowIdentityCandidates = (row: ViewerRow): string[] =>
  Array.from(new Set([row._id, row.id, row._rowUuid].map(value => String(value ?? '')).filter(Boolean)))

export const rowMatchesRemoteId = (row: ViewerRow, remoteRowId: string): boolean => {
  if (!remoteRowId) return false
  return getViewerRowIdentityCandidates(row).includes(remoteRowId)
}

export const getClientRowIdentity = (row: ViewerRow): string => {
  const explicit = row._clientRowId
  if (typeof explicit === 'string' && explicit) return explicit
  const id = row._id
  if (typeof id === 'string' && id.startsWith('client_')) return id
  return ''
}

export const resolveBackendRowIdForViewerRow = (
  row: ViewerRow,
  isUuid: (value: string) => boolean
): string | undefined => {
  const fields = [String(row._id ?? ''), String(row._rowUuid ?? ''), String(row.id ?? '')]
  return fields.find(field => field !== '' && isUuid(field))
}

export const buildUiToBackendRowIdMap = (
  rows: ViewerRow[],
  isUuid: (value: string) => boolean
): Map<string, string> => {
  const map = new Map<string, string>()
  rows.forEach(row => {
    const backend = resolveBackendRowIdForViewerRow(row, isUuid)
    if (!backend) return
    getViewerRowIdentityCandidates(row).forEach(candidateId => {
      map.set(candidateId, backend)
    })
  })
  return map
}

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
