import type { SpreadsheetColumn } from '../types'
import type { SpreadsheetBatchOperation } from '../services/SpreadsheetApiService'
import type { CellDimensionsPayload } from '../components/UniverSheetGrid.types'

/**
 * Dimension snapshot representation used as the diff baseline by
 * dimension change handlers. Tracks exactly the subset of fields Univer
 * reports back via `CellDimensionsPayload` so the diff is symmetric.
 */
export interface DimensionBaselineSnapshot {
  defaultRowHeight: number
  defaultColWidth: number
  rowHeights: Map<number, number>
  colWidths: Map<number, number>
}

export const applyColumnWidthsFromDimensions = (
  columns: SpreadsheetColumn[],
  payload: CellDimensionsPayload
): { nextColumns: SpreadsheetColumn[]; changedColumns: Array<{ columnId: string; width: number }> } | null => {
  const changedColumns: Array<{ columnId: string; width: number }> = []
  let visibleIndex = 0

  const nextColumns = columns.map(column => {
    if (column.isVisible === false) return column
    const entry = payload.columnData[visibleIndex] ?? payload.columnData[String(visibleIndex)]
    const rawWidth = entry?.w ?? payload.defaultColWidth
    visibleIndex += 1
    if (typeof rawWidth !== 'number' || !Number.isFinite(rawWidth) || rawWidth <= 0) return column
    const nextWidth = Math.round(rawWidth)
    const currentWidth =
      typeof column.width === 'number' && Number.isFinite(column.width) ? Math.round(column.width) : null
    if (currentWidth === nextWidth) return column
    changedColumns.push({ columnId: column.id, width: nextWidth })
    return { ...column, width: nextWidth }
  })

  return changedColumns.length > 0 ? { nextColumns, changedColumns } : null
}

export const areColumnWidthPatchesEquivalent = (
  columns: SpreadsheetColumn[],
  pendingOverrides: Record<string, number>,
  changedColumns: Array<{ columnId: string; width: number }>
): boolean =>
  changedColumns.every(change => {
    const currentColumn = columns.find(column => column.id === change.columnId)
    const currentWidth =
      typeof currentColumn?.width === 'number' && Number.isFinite(currentColumn.width)
        ? Math.round(currentColumn.width)
        : undefined
    const pendingWidth = pendingOverrides[change.columnId]
    return currentWidth === change.width || Math.round(pendingWidth ?? NaN) === change.width
  })

export const buildDimensionPayloadFromSnapshot = (
  snapshotToSave: unknown,
  activeSheetId: string
): CellDimensionsPayload | null => {
  try {
    const snap = snapshotToSave as Record<string, unknown>
    const sheetOrder = snap?.sheetOrder as string[] | undefined
    const sheets = snap?.sheets as Record<string, Record<string, unknown>> | undefined
    let sheetSnapRaw: unknown
    if (sheets?.[activeSheetId]) {
      sheetSnapRaw = sheets[activeSheetId]
    } else if (sheetOrder?.[0] && sheets) {
      sheetSnapRaw = sheets[sheetOrder[0]]
    } else if (sheets) {
      sheetSnapRaw = Object.values(sheets)[0]
    }
    const sheetSnap = sheetSnapRaw as Record<string, unknown> | undefined
    if (!sheetSnap) return null
    const rowHeader = sheetSnap.rowHeader as { width?: number } | undefined
    const columnHeader = sheetSnap.columnHeader as { height?: number } | undefined
    return {
      sheetId: activeSheetId,
      defaultColWidth: (sheetSnap.defaultColumnWidth as number | undefined) ?? 73,
      defaultRowHeight: (sheetSnap.defaultRowHeight as number | undefined) ?? 23,
      columnData: (sheetSnap.columnData as Record<string | number, { w?: number; hd?: number }>) ?? {},
      rowData: (sheetSnap.rowData as Record<string | number, { h?: number; hd?: number }>) ?? {},
      rowHeaderWidth: rowHeader?.width ?? 48,
      columnHeaderHeight: columnHeader?.height ?? 28,
      zoomRatio: (sheetSnap.zoomRatio as number | undefined) ?? 1
    }
  } catch {
    return null
  }
}

export const extractDimensionBaselineFromSnapshot = (snapshot: unknown, sheetId: string): DimensionBaselineSnapshot => {
  const rowHeights = new Map<number, number>()
  const colWidths = new Map<number, number>()
  let defaultRowHeight = 23
  let defaultColWidth = 73

  const dp = snapshot ? buildDimensionPayloadFromSnapshot(snapshot, sheetId) : null
  if (!dp) return { defaultRowHeight, defaultColWidth, rowHeights, colWidths }

  defaultRowHeight = dp.defaultRowHeight
  defaultColWidth = dp.defaultColWidth
  for (const [key, v] of Object.entries(dp.rowData ?? {})) {
    const idx = Number(key)
    if (!Number.isFinite(idx) || idx < 0) continue
    const h = (v as { h?: number } | undefined)?.h
    if (typeof h === 'number' && Number.isFinite(h)) {
      rowHeights.set(idx, Math.round(h))
    }
  }
  for (const [key, v] of Object.entries(dp.columnData ?? {})) {
    const idx = Number(key)
    if (!Number.isFinite(idx) || idx < 0) continue
    const w = (v as { w?: number } | undefined)?.w
    if (typeof w === 'number' && Number.isFinite(w)) {
      colWidths.set(idx, Math.round(w))
    }
  }
  return { defaultRowHeight, defaultColWidth, rowHeights, colWidths }
}

/**
 * Diff an incoming Univer `CellDimensionsPayload` against the baseline and build the
 * minimal list of `set_row_height` / `set_col_width` batch ops needed to bring the
 * server snapshot into the post-change state.
 */
export const buildDimensionDeltaOps = (
  payload: CellDimensionsPayload,
  baseline: DimensionBaselineSnapshot,
  skippedColIndices: ReadonlySet<number>
): SpreadsheetBatchOperation[] => {
  const ops: SpreadsheetBatchOperation[] = []
  const makeOpId = (prefix: string): string => {
    try {
      return `${prefix}_${crypto.randomUUID()}`
    } catch {
      return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
    }
  }

  const rowKeys = new Set<number>()
  for (const key of Object.keys(payload.rowData ?? {})) {
    const n = Number(key)
    if (Number.isFinite(n) && n >= 0) rowKeys.add(n)
  }
  for (const n of baseline.rowHeights.keys()) rowKeys.add(n)

  for (const rowIndex of rowKeys) {
    const currentEntry = (payload.rowData ?? {})[rowIndex] ?? (payload.rowData ?? {})[String(rowIndex)]
    if (typeof (currentEntry as { hd?: unknown } | undefined)?.hd === 'number') continue
    const rawHeight = (currentEntry as { h?: number } | undefined)?.h
    const currentHeight =
      typeof rawHeight === 'number' && Number.isFinite(rawHeight) ? Math.round(rawHeight) : baseline.defaultRowHeight
    const baseHeight = baseline.rowHeights.get(rowIndex) ?? baseline.defaultRowHeight
    if (currentHeight === baseHeight) continue
    ops.push({
      operationId: makeOpId('set_row_height'),
      type: 'set_row_height',
      data: { sheetId: payload.sheetId, rowIndex, height: currentHeight }
    })
  }

  const colKeys = new Set<number>()
  for (const key of Object.keys(payload.columnData ?? {})) {
    const n = Number(key)
    if (Number.isFinite(n) && n >= 0) colKeys.add(n)
  }
  for (const n of baseline.colWidths.keys()) colKeys.add(n)

  for (const colIndex of colKeys) {
    if (skippedColIndices.has(colIndex)) continue
    const currentEntry = (payload.columnData ?? {})[colIndex] ?? (payload.columnData ?? {})[String(colIndex)]
    if (typeof (currentEntry as { hd?: unknown } | undefined)?.hd === 'number') continue
    const rawWidth = (currentEntry as { w?: number } | undefined)?.w
    const currentWidth =
      typeof rawWidth === 'number' && Number.isFinite(rawWidth) ? Math.round(rawWidth) : baseline.defaultColWidth
    const baseWidth = baseline.colWidths.get(colIndex) ?? baseline.defaultColWidth
    if (currentWidth === baseWidth) continue
    ops.push({
      operationId: makeOpId('set_col_width'),
      type: 'set_col_width',
      data: { sheetId: payload.sheetId, colIndex, width: currentWidth }
    })
  }

  return ops
}
