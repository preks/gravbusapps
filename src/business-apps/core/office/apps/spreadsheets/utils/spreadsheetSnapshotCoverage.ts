export type SpreadsheetSnapshotCoversVersions = Record<string, number>

const SNAPSHOT_META_KEY = '__meta'
const SNAPSHOT_COVERS_VERSIONS_KEY = 'coversVersions'

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export const normalizeSnapshotCoversVersions = (value: unknown): SpreadsheetSnapshotCoversVersions => {
  const record = toRecord(value)
  if (!record) return {}

  const normalized: SpreadsheetSnapshotCoversVersions = {}
  for (const [sheetId, rawVersion] of Object.entries(record)) {
    const numericVersion = Number(rawVersion)
    if (typeof sheetId !== 'string' || sheetId.length === 0) continue
    if (!Number.isFinite(numericVersion) || numericVersion < 0) continue
    normalized[sheetId] = Math.trunc(numericVersion)
  }
  return normalized
}

export const mergeSnapshotCoversVersions = (
  ...maps: Array<SpreadsheetSnapshotCoversVersions | null | undefined>
): SpreadsheetSnapshotCoversVersions => {
  const merged: SpreadsheetSnapshotCoversVersions = {}
  for (const map of maps) {
    if (!map) continue
    for (const [sheetId, rawVersion] of Object.entries(map)) {
      const numericVersion = Number(rawVersion)
      if (!sheetId || !Number.isFinite(numericVersion) || numericVersion < 0) continue
      const nextVersion = Math.trunc(numericVersion)
      if ((merged[sheetId] ?? 0) < nextVersion) {
        merged[sheetId] = nextVersion
      }
    }
  }
  return merged
}

export const getSnapshotCoversVersions = (
  snapshot: Record<string, unknown> | null | undefined
): SpreadsheetSnapshotCoversVersions => {
  const meta = toRecord(snapshot?.[SNAPSHOT_META_KEY])
  return normalizeSnapshotCoversVersions(meta?.[SNAPSHOT_COVERS_VERSIONS_KEY])
}

export const attachSnapshotCoversVersions = (
  snapshot: Record<string, unknown> | null | undefined,
  coversVersions: SpreadsheetSnapshotCoversVersions
): Record<string, unknown> | null => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return snapshot ?? null
  }
  return {
    ...snapshot,
    [SNAPSHOT_META_KEY]: {
      ...(toRecord(snapshot[SNAPSHOT_META_KEY]) ?? {}),
      [SNAPSHOT_COVERS_VERSIONS_KEY]: { ...coversVersions }
    }
  }
}

export const getSheetCoverageVersion = (
  coversVersions: SpreadsheetSnapshotCoversVersions | null | undefined,
  sheetId: string
): number => {
  const version = Number(coversVersions?.[sheetId] ?? 0)
  return Number.isFinite(version) && version >= 0 ? Math.trunc(version) : 0
}

export const hasSheetCoverageVersion = (
  coversVersions: SpreadsheetSnapshotCoversVersions | null | undefined,
  sheetId: string
): boolean => {
  return Object.prototype.hasOwnProperty.call(coversVersions ?? {}, sheetId)
}

export const snapshotHasFormattingSignal = (snapshot: Record<string, unknown> | null | undefined): boolean => {
  if (!snapshot || typeof snapshot !== 'object') return false
  const styles = toRecord(snapshot.styles)
  if (styles && Object.keys(styles).length > 0) {
    return true
  }

  const sheets = toRecord(snapshot.sheets)
  if (!sheets) return false
  return Object.values(sheets).some(sheetValue => {
    const sheet = toRecord(sheetValue)
    const cellData = toRecord(sheet?.cellData)
    if (!cellData) return false
    return Object.values(cellData).some(rowValue => {
      const row = toRecord(rowValue)
      if (!row) return false
      return Object.values(row).some(cellValue => {
        const cell = toRecord(cellValue)
        if (!cell) return false
        return Object.keys(cell).some(key => key === 's' || key === 'bg' || key === 'cl' || key === 'bd')
      })
    })
  })
}
