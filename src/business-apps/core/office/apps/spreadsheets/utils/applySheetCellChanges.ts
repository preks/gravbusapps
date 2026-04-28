import type { SpreadsheetColumn } from '../types'

type ViewerRow = Record<string, unknown>
type SheetCellChange = {
  rowId: string
  columnName: string
  value: unknown
}

const getViewerRowIdentityCandidates = (row: ViewerRow): string[] =>
  Array.from(new Set([row._id, row.id, row._rowUuid].map(value => String(value ?? '')).filter(Boolean)))

const collectViewerRowUpdates = (
  row: ViewerRow,
  updatesByRowId: Map<string, Record<string, unknown>>
): Record<string, unknown> | null => {
  const mergedUpdates: Record<string, unknown> = {}
  for (const candidateId of getViewerRowIdentityCandidates(row)) {
    Object.assign(mergedUpdates, updatesByRowId.get(candidateId) ?? {})
  }
  return Object.keys(mergedUpdates).length > 0 ? mergedUpdates : null
}

const resolveColumnAliasInfo = (
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

const stripEquivalentColumnKeysFromRow = (
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

const applyColumnUpdatesToViewerRow = (
  row: ViewerRow,
  updates: Record<string, unknown>,
  columns?: SpreadsheetColumn[]
): ViewerRow => {
  let nextRow: ViewerRow = { ...row }
  for (const [columnName, value] of Object.entries(updates)) {
    const cleared = stripEquivalentColumnKeysFromRow(nextRow, columnName, columns)
    nextRow = cleared.nextRow
    if (value !== undefined) {
      nextRow[cleared.targetColumnName] = value
    }
  }
  return nextRow
}

export function applySheetCellChanges(
  rows: ViewerRow[],
  cells: SheetCellChange[],
  columns?: SpreadsheetColumn[]
): { nextRows: ViewerRow[]; mutatedAnyRow: boolean } {
  if (cells.length === 0 || rows.length === 0) {
    return { nextRows: rows, mutatedAnyRow: false }
  }

  const updatesByUiRowId = new Map<string, Record<string, unknown>>()
  for (const cell of cells) {
    const uiRowId = String(cell.rowId)
    if (!uiRowId) continue
    const uiUpdates = updatesByUiRowId.get(uiRowId) ?? {}
    uiUpdates[cell.columnName] = cell.value
    updatesByUiRowId.set(uiRowId, uiUpdates)
  }

  let mutatedAnyRow = false
  const updatedAt = new Date().toISOString()
  const nextRows = rows.map(row => {
    const updates = collectViewerRowUpdates(row, updatesByUiRowId)
    if (!updates) return row
    mutatedAnyRow = true
    return {
      ...applyColumnUpdatesToViewerRow(row, updates, columns),
      _updatedAt: updatedAt
    }
  })

  return { nextRows, mutatedAnyRow }
}
