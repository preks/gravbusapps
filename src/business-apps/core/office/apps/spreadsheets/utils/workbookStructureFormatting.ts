import { stripWorkbookSnapshotValuesPreservingFormatting } from './univerAdapter'
import { tryStructuredClone } from './tryStructuredClone'

const UNIVER_CELL_VALUE_KEYS = ['v', 'f', 'm', 'p', 'ct', 'si', 'custom'] as const

function cloneJson<T>(value: T): T {
  return tryStructuredClone(value) ?? value
}

function extractWorkbookStylesFromSnapshot(
  snapshot: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!snapshot?.styles || typeof snapshot.styles !== 'object' || Array.isArray(snapshot.styles)) return {}
  return snapshot.styles as Record<string, unknown>
}

function inlineResolvedStyle(cell: Record<string, unknown>, style: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(style)) {
    cell[key] = cloneJson(value)
  }
  delete cell.s
}

/**
 * Match legacy duplicate payload shaping from UniverSheetGrid: inline workbook styles into cells,
 * then strip value/formula keys so the duplicate POST carries formatting-only visual snapshot.
 */
export function stripWorksheetValueKeysForDuplicatePayload(
  worksheet: Record<string, unknown>,
  sheetId: string,
  sheetName: string,
  styles: Record<string, unknown> = {}
): Record<string, unknown> {
  const cloned = cloneJson(worksheet)
  cloned.id = sheetId
  cloned.name = sheetName
  const cellData = cloned.cellData
  if (!cellData || typeof cellData !== 'object' || Array.isArray(cellData)) return cloned

  for (const rowCells of Object.values(cellData)) {
    if (!rowCells || typeof rowCells !== 'object' || Array.isArray(rowCells)) continue
    for (const cell of Object.values(rowCells)) {
      if (!cell || typeof cell !== 'object' || Array.isArray(cell)) continue
      const cellRecord = cell as Record<string, unknown>
      const styleId = typeof cellRecord.s === 'string' ? cellRecord.s : ''
      const styleDefinition = styleId ? styles[styleId] : undefined
      if (styleDefinition && typeof styleDefinition === 'object' && Array.isArray(styleDefinition) === false) {
        inlineResolvedStyle(cellRecord, styleDefinition as Record<string, unknown>)
      }
      for (const key of UNIVER_CELL_VALUE_KEYS) {
        delete cellRecord[key]
      }
    }
  }

  return cloned
}

/**
 * Builds `visualWorksheetSnapshot` for POST duplicate from the live workbook (formatting-only).
 */
export function buildDuplicateVisualWorksheetSnapshot(
  workbookSnapshot: Record<string, unknown> | null | undefined,
  sourceSheetId: string,
  newSheetId: string,
  newSheetName: string
): Record<string, unknown> | undefined {
  if (!workbookSnapshot) return undefined
  const strippedBook = stripWorkbookSnapshotValuesPreservingFormatting(cloneJson(workbookSnapshot))
  const sheets = strippedBook.sheets as Record<string, Record<string, unknown>> | undefined
  if (!sheets || typeof sheets !== 'object') return undefined
  const source = sheets[sourceSheetId]
  if (!source || typeof source !== 'object') return undefined
  const styles = extractWorkbookStylesFromSnapshot(strippedBook)
  return stripWorksheetValueKeysForDuplicatePayload({ ...source }, newSheetId, newSheetName, styles)
}

export function proposeDuplicateSheetDisplayName(sourceName: string, takenNames: ReadonlySet<string>): string {
  const baseName = sourceName.trim() || 'Sheet'
  let candidate = `${baseName} (copy)`
  let i = 2
  while (takenNames.has(candidate)) {
    candidate = `${baseName} (copy ${i})`
    i += 1
  }
  return candidate
}
