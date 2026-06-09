import type { SpreadsheetMergeRange, SpreadsheetSheet } from '../types/spreadsheet'

export function normalizeWorksheetMergeRanges(ranges: unknown): SpreadsheetMergeRange[] {
  if (!Array.isArray(ranges)) return []
  return ranges
    .filter(
      (range): range is SpreadsheetMergeRange =>
        Boolean(range) &&
        typeof range === 'object' &&
        Number.isFinite((range as SpreadsheetMergeRange).startRow) &&
        Number.isFinite((range as SpreadsheetMergeRange).endRow) &&
        Number.isFinite((range as SpreadsheetMergeRange).startColumn) &&
        Number.isFinite((range as SpreadsheetMergeRange).endColumn)
    )
    .map(range => ({
      startRow: Math.trunc(range.startRow),
      endRow: Math.trunc(range.endRow),
      startColumn: Math.trunc(range.startColumn),
      endColumn: Math.trunc(range.endColumn)
    }))
}

export function extractWorksheetMergeRangesFromWorkbookSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  sheetId: string
): SpreadsheetMergeRange[] {
  const sheets =
    snapshot?.sheets && typeof snapshot.sheets === 'object' && !Array.isArray(snapshot.sheets)
      ? (snapshot.sheets as Record<string, unknown>)
      : null
  const worksheet = sheets?.[sheetId]
  if (!worksheet || typeof worksheet !== 'object' || Array.isArray(worksheet)) return []
  return normalizeWorksheetMergeRanges((worksheet as Record<string, unknown>).mergeData)
}

export function resolveAuthoritativeWorksheetMergeRanges(
  sheet: SpreadsheetSheet,
  initialSnapshot?: Record<string, unknown> | null
): SpreadsheetMergeRange[] {
  const initialSnapshotRanges = extractWorksheetMergeRangesFromWorkbookSnapshot(initialSnapshot ?? null, sheet.id)
  if (initialSnapshotRanges.length > 0) return initialSnapshotRanges
  const worksheetSnapshotRanges =
    sheet.worksheetSnapshot && typeof sheet.worksheetSnapshot === 'object' && !Array.isArray(sheet.worksheetSnapshot)
      ? normalizeWorksheetMergeRanges((sheet.worksheetSnapshot as Record<string, unknown>).mergeData)
      : []
  if (worksheetSnapshotRanges.length > 0) return worksheetSnapshotRanges
  return normalizeWorksheetMergeRanges(sheet.settings.mergeData)
}

export function resolveColumnReorderMergeRanges(params: {
  targetSheetId: string
  liveSnapshot?: Record<string, unknown> | null
  initialSnapshot?: Record<string, unknown> | null
  sheet?: SpreadsheetSheet | null
}): SpreadsheetMergeRange[] {
  const liveMergeRanges = extractWorksheetMergeRangesFromWorkbookSnapshot(
    params.liveSnapshot ?? null,
    params.targetSheetId
  )
  if (liveMergeRanges.length > 0) return liveMergeRanges

  if (params.sheet && params.sheet.id === params.targetSheetId) {
    return resolveAuthoritativeWorksheetMergeRanges(params.sheet, params.initialSnapshot)
  }

  return extractWorksheetMergeRangesFromWorkbookSnapshot(params.initialSnapshot ?? null, params.targetSheetId)
}
