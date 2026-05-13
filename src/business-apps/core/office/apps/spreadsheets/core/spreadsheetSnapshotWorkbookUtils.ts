/** Pure helpers shared by snapshot checkpoint persistence and the viewer. */
import { tryStructuredClone } from '../utils/tryStructuredClone'

export type SnapshotCellCoordinate = { row: number; col: number }

export const getKnownCellValueCount = (row: Record<string, unknown>): number =>
  Object.entries(row).filter(([key, value]) => {
    if (key.startsWith('_') || key === 'id') return false
    if (value == null) return false
    if (typeof value === 'string') return value.length > 0
    return true
  }).length

export const getWorksheetFromSnapshot = (
  snapshot: unknown,
  activeSheetId: string
): Record<string, unknown> | undefined => {
  const workbook = snapshot as Record<string, unknown>
  const sheets = workbook.sheets as Record<string, unknown> | undefined
  if (!sheets) return undefined
  if (sheets[activeSheetId] != null) return sheets[activeSheetId] as Record<string, unknown>
  return Object.values(sheets).find(
    sheet => sheet && typeof sheet === 'object' && String((sheet as { id?: unknown }).id ?? '') === activeSheetId
  ) as Record<string, unknown> | undefined
}

export const isBlankSnapshotCellValue = (value: unknown): boolean =>
  value == null || (typeof value === 'string' && value.length === 0)

export const readSnapshotCellValue = (cell: unknown): unknown => {
  if (cell == null) return undefined
  if (typeof cell !== 'object' || Array.isArray(cell)) return cell
  const record = cell as Record<string, unknown>
  if (typeof record.f === 'string' && record.f.trim()) {
    const formula = record.f.trim()
    return formula.startsWith('=') ? formula : `=${formula}`
  }
  if (Object.prototype.hasOwnProperty.call(record, 'v')) return record.v
  if (Object.prototype.hasOwnProperty.call(record, 'm')) return record.m
  if (Object.prototype.hasOwnProperty.call(record, 'p')) return record.p
  return undefined
}

export const countLiveWorksheetSnapshotValues = (
  snapshot: Record<string, unknown> | null | undefined,
  sheetId: string
): number => {
  const worksheet = getWorksheetFromSnapshot(snapshot, sheetId)
  const cellData = worksheet?.cellData as Record<string, Record<string, unknown>> | undefined
  if (!cellData || typeof cellData !== 'object') return 0

  let valueCount = 0
  for (const rowKey of Object.keys(cellData)) {
    const rowCells = cellData[rowKey]
    if (!rowCells || typeof rowCells !== 'object') continue
    for (const colKey of Object.keys(rowCells)) {
      if (!isBlankSnapshotCellValue(readSnapshotCellValue(rowCells[colKey]))) {
        valueCount += 1
      }
    }
  }
  return valueCount
}

export const getSnapshotSizeBytes = (snapshot: unknown): number | null => {
  try {
    return new Blob([JSON.stringify(snapshot)]).size
  } catch {
    try {
      return JSON.stringify(snapshot).length
    } catch {
      return null
    }
  }
}

export function cloneSnapshot<T>(value: T): T {
  if (value == null) return value
  return tryStructuredClone(value) ?? value
}

export const SNAPSHOT_CELL_VALUE_KEYS = ['v', 'f', 'm', 'p', 'si', 'custom', 'ct'] as const

export const clearSnapshotCellsByCoordinate = (
  workbookSnapshot: Record<string, unknown>,
  activeSheetId: string,
  cells: SnapshotCellCoordinate[]
): Record<string, unknown> => {
  if (cells.length === 0) return workbookSnapshot
  const worksheet = getWorksheetFromSnapshot(workbookSnapshot, activeSheetId)
  if (!worksheet) return workbookSnapshot
  const cellData = worksheet.cellData as Record<string, Record<string, unknown>> | undefined
  if (!cellData || typeof cellData !== 'object') return workbookSnapshot

  for (const cell of cells) {
    const rowKey = String(cell.row)
    const rowEntry = cellData[rowKey] ?? cellData[cell.row]
    if (!rowEntry || typeof rowEntry !== 'object') continue
    const colKey = String(cell.col)
    const cellEntry = (rowEntry[colKey] ?? rowEntry[cell.col]) as Record<string, unknown> | undefined
    if (cellEntry && typeof cellEntry === 'object' && !Array.isArray(cellEntry)) {
      for (const key of SNAPSHOT_CELL_VALUE_KEYS) {
        delete cellEntry[key]
      }
      if (Object.keys(cellEntry).length > 0) {
        rowEntry[colKey] = cellEntry
      } else {
        delete rowEntry[cell.col]
        delete rowEntry[colKey]
      }
    } else {
      delete rowEntry[cell.col]
      delete rowEntry[colKey]
    }
    if (Object.keys(rowEntry).length === 0) {
      delete cellData[cell.row]
      delete cellData[rowKey]
    }
  }

  worksheet.cellData = cellData
  return workbookSnapshot
}

export const getPendingSnapshotClearCoordinates = (
  pending: Map<string, Set<string>>,
  sheetId: string
): SnapshotCellCoordinate[] => {
  const current = pending.get(sheetId)
  if (!current || current.size === 0) return []
  return Array.from(current)
    .map(entry => {
      const [rowRaw, colRaw] = entry.split(':')
      const row = Number(rowRaw)
      const col = Number(colRaw)
      return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : null
    })
    .filter((cell): cell is SnapshotCellCoordinate => cell != null)
}

export const clearPendingSnapshotClearCoordinates = (pending: Map<string, Set<string>>, sheetId: string): void => {
  pending.delete(sheetId)
}

/**
 * Deep-clone a cell record from a workbook snapshot (`sheets[sheetId].cellData`).
 * Used when the Univer facade cannot read a cell (e.g. mutation targets a non-active worksheet).
 */
export function cloneSnapshotCellRecordAt(
  snapshot: Record<string, unknown> | null | undefined,
  sheetId: string,
  row: number,
  col: number
): Record<string, unknown> | null {
  const worksheet = getWorksheetFromSnapshot(snapshot ?? null, sheetId)
  const cellData = worksheet?.cellData as Record<string | number, Record<string | number, unknown>> | undefined
  if (!cellData || typeof cellData !== 'object') return null
  const rowEntry = cellData[row] ?? cellData[String(row)]
  if (!rowEntry || typeof rowEntry !== 'object') return null
  const raw = rowEntry[col] ?? rowEntry[String(col)]
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return cloneSnapshot(raw) as Record<string, unknown>
}
