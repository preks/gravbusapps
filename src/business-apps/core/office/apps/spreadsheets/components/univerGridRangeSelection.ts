export type ClearAllRectangle = { startRow: number; endRow: number; startColumn: number; endColumn: number }

export type ClearAllGridBounds = {
  maxRowIndex: number
  maxColIndex: number
}

export function resolveWorksheetGridBounds(worksheet: unknown): ClearAllGridBounds | null {
  const ws = worksheet as { getMaxRows?: () => number; getMaxColumns?: () => number } | null | undefined
  if (!ws) return null
  const maxRows = typeof ws.getMaxRows === 'function' ? ws.getMaxRows() : null
  const maxColumns = typeof ws.getMaxColumns === 'function' ? ws.getMaxColumns() : null
  if (maxRows == null || maxColumns == null || !Number.isFinite(maxRows) || !Number.isFinite(maxColumns)) {
    return null
  }
  const rowCount = Math.max(0, Math.trunc(maxRows))
  const colCount = Math.max(0, Math.trunc(maxColumns))
  if (rowCount === 0 || colCount === 0) return null
  return {
    maxRowIndex: rowCount - 1,
    maxColIndex: colCount - 1
  }
}

export function clampClearAllRangeToBounds(range: ClearAllRectangle, bounds: ClearAllGridBounds): ClearAllRectangle {
  const startRow = Math.max(0, Math.min(Math.trunc(range.startRow), bounds.maxRowIndex))
  const endRow = Math.max(startRow, Math.min(Math.trunc(range.endRow), bounds.maxRowIndex))
  const startColumn = Math.max(0, Math.min(Math.trunc(range.startColumn), bounds.maxColIndex))
  const endColumn = Math.max(startColumn, Math.min(Math.trunc(range.endColumn), bounds.maxColIndex))
  return { startRow, endRow, startColumn, endColumn }
}

export function dedupeClearAllRanges(ranges: ClearAllRectangle[]): ClearAllRectangle[] {
  const seen = new Set<string>()
  const deduped: ClearAllRectangle[] = []
  for (const range of ranges) {
    const key = `${range.startRow}:${range.endRow}:${range.startColumn}:${range.endColumn}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(range)
  }
  return deduped
}

export function normalizeClearAllRectangle(candidate: unknown): ClearAllRectangle | null {
  if (!candidate || typeof candidate !== 'object') return null
  const rec = candidate as {
    startRow?: number
    endRow?: number
    startColumn?: number
    endColumn?: number
    getRange?: () => { startRow?: number; endRow?: number; startColumn?: number; endColumn?: number } | null
  }
  let startRow = rec.startRow
  let endRow = rec.endRow
  let startColumn = rec.startColumn
  let endColumn = rec.endColumn
  if (
    (typeof startRow !== 'number' ||
      typeof endRow !== 'number' ||
      typeof startColumn !== 'number' ||
      typeof endColumn !== 'number') &&
    typeof rec.getRange === 'function'
  ) {
    const inner = rec.getRange?.()
    if (inner && typeof inner === 'object') {
      startRow = startRow ?? inner.startRow
      endRow = endRow ?? inner.endRow
      startColumn = startColumn ?? inner.startColumn
      endColumn = endColumn ?? inner.endColumn
    }
  }
  if (
    typeof startRow !== 'number' ||
    typeof endRow !== 'number' ||
    typeof startColumn !== 'number' ||
    typeof endColumn !== 'number'
  ) {
    return null
  }
  if (!Number.isFinite(startRow) || !Number.isFinite(endRow)) return null
  if (!Number.isFinite(startColumn) || !Number.isFinite(endColumn)) return null
  if (endRow < startRow || endColumn < startColumn) return null
  return {
    startRow: Math.max(0, Math.trunc(startRow)),
    endRow: Math.max(0, Math.trunc(endRow)),
    startColumn: Math.max(0, Math.trunc(startColumn)),
    endColumn: Math.max(0, Math.trunc(endColumn))
  }
}

export function extractActiveRangeBounds(
  workbook: unknown
): { startRow: number; startColumn: number; endRow: number; endColumn: number } | null {
  const facadeWorkbook = workbook as
    | {
        getActiveSheet?: () => {
          getSelection?: () => {
            getActiveRangeList?: () => Array<unknown> | null
            getActiveRange?: () => unknown
          } | null
          getActiveRangeList?: () => Array<unknown> | null
          getActiveRange?: () => unknown
        } | null
        getActiveRange?: () => unknown
      }
    | null
    | undefined
  if (!facadeWorkbook) return null

  const worksheet = facadeWorkbook.getActiveSheet?.() ?? null
  const selection = worksheet?.getSelection?.() ?? null

  const candidates: unknown[] = []
  const activeList = selection?.getActiveRangeList?.() ?? worksheet?.getActiveRangeList?.() ?? null
  if (Array.isArray(activeList)) candidates.push(...activeList)
  const activeRange =
    selection?.getActiveRange?.() ?? worksheet?.getActiveRange?.() ?? facadeWorkbook.getActiveRange?.()
  if (activeRange) candidates.push(activeRange)

  for (const candidate of candidates) {
    const rect = normalizeClearAllRectangle(candidate)
    if (!rect) continue
    return {
      startRow: rect.startRow,
      startColumn: rect.startColumn,
      endRow: rect.endRow,
      endColumn: rect.endColumn
    }
  }
  return null
}

export function extractActiveRangePosition(workbook: unknown): { row: number; col: number } | null {
  const bounds = extractActiveRangeBounds(workbook)
  if (!bounds) return null
  return { row: bounds.startRow, col: bounds.startColumn }
}

/**
 * Resolve the ranges affected by a Univer clear-all command.
 */
export function resolveClearAllRanges(
  workbook: unknown,
  commandParams: { ranges?: unknown[]; range?: unknown | unknown[] } | undefined
): ClearAllRectangle[] {
  const rangeProp = commandParams?.range
  const rangeAsArray = Array.isArray(rangeProp)
    ? rangeProp
    : rangeProp !== undefined && rangeProp !== null && typeof rangeProp === 'object'
      ? [rangeProp]
      : []
  const collected: ClearAllRectangle[] = []
  const directCandidates = Array.isArray(commandParams?.ranges)
    ? commandParams!.ranges
    : rangeAsArray.length > 0
      ? rangeAsArray
      : null
  if (directCandidates) {
    for (const candidate of directCandidates) {
      const rect = normalizeClearAllRectangle(candidate)
      if (rect) collected.push(rect)
    }
  }
  if (collected.length > 0) return collected

  const facadeWorkbook = workbook as
    | {
        getActiveSheet?: () => {
          getSelection?: () => {
            getActiveRangeList?: () => Array<unknown> | null
            getActiveRange?: () => unknown
            getCurrentCell?: () => unknown
          } | null
          getActiveRange?: () => unknown
          getActiveRangeList?: () => Array<unknown> | null
        } | null
        getActiveRange?: () => unknown
        getActiveRangeList?: () => Array<unknown> | null
      }
    | null
    | undefined
  if (!facadeWorkbook) return collected

  const worksheet = facadeWorkbook.getActiveSheet?.() ?? null
  const selection = worksheet?.getSelection?.() ?? null

  const candidateLists: Array<unknown> = []
  const activeList =
    selection?.getActiveRangeList?.() ??
    worksheet?.getActiveRangeList?.() ??
    facadeWorkbook.getActiveRangeList?.() ??
    null
  if (Array.isArray(activeList)) candidateLists.push(...activeList)
  const activeRange =
    selection?.getActiveRange?.() ?? worksheet?.getActiveRange?.() ?? facadeWorkbook.getActiveRange?.() ?? null
  if (activeRange) candidateLists.push(activeRange)

  for (const candidate of candidateLists) {
    const rect = normalizeClearAllRectangle(candidate)
    if (rect) collected.push(rect)
  }
  return collected
}

export function rectanglesIntersect(a: ClearAllRectangle, b: ClearAllRectangle): boolean {
  return (
    a.startRow <= b.endRow && a.endRow >= b.startRow && a.startColumn <= b.endColumn && a.endColumn >= b.startColumn
  )
}

export function getWorksheetSnapshotFromWorkbookSnapshot(
  snapshot: unknown,
  sheetId: string
): { mergeData?: unknown[] } | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null
  const sheets = (snapshot as Record<string, unknown>).sheets
  if (!sheets || typeof sheets !== 'object' || Array.isArray(sheets)) return null
  const sheetRecord = sheets as Record<string, unknown>
  const exact = sheetRecord[sheetId]
  if (exact && typeof exact === 'object' && !Array.isArray(exact)) return exact as { mergeData?: unknown[] }
  const fallback = Object.values(sheetRecord).find(
    candidate =>
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      (candidate as Record<string, unknown>).id === sheetId
  )
  return fallback && typeof fallback === 'object' && !Array.isArray(fallback)
    ? (fallback as { mergeData?: unknown[] })
    : null
}

export function selectionIntersectsMergedRange(
  snapshot: unknown,
  sheetId: string,
  ranges: ClearAllRectangle[]
): boolean {
  if (ranges.length === 0) return false
  const mergeData = getWorksheetSnapshotFromWorkbookSnapshot(snapshot, sheetId)?.mergeData
  if (!Array.isArray(mergeData)) return false
  const merges = mergeData.map(normalizeClearAllRectangle).filter((range): range is ClearAllRectangle => range != null)
  return ranges.some(range => merges.some(merge => rectanglesIntersect(range, merge)))
}
