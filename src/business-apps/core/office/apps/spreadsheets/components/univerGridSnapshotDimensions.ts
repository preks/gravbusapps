import type { SnapshotDimensions } from './univerGridInternalTypes'
import {
  CURSOR_OVERLAY_COL_WIDTH_PX,
  CURSOR_OVERLAY_HEADER_HEIGHT_PX,
  CURSOR_OVERLAY_ROW_HEIGHT_PX,
  CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX
} from './univerGridLayoutConstants'

export function extractWorkbookStylesFromSnapshot(snapshot: Record<string, unknown> | null): Record<string, unknown> {
  if (!snapshot?.styles || typeof snapshot.styles !== 'object' || Array.isArray(snapshot.styles)) return {}
  return snapshot.styles as Record<string, unknown>
}

export function areDimensionMapsEqual(
  a: Record<string | number, { w?: number; h?: number; hd?: number }>,
  b: Record<string | number, { w?: number; h?: number; hd?: number }>,
  key: 'w' | 'h'
): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const entryKey of aKeys) {
    if (!(entryKey in b)) return false
    const aValue = a[entryKey]?.[key]
    const bValue = b[entryKey]?.[key]
    if ((aValue ?? null) !== (bValue ?? null)) return false
    if ((a[entryKey]?.hd ?? null) !== (b[entryKey]?.hd ?? null)) return false
  }
  return true
}

export function areSnapshotDimensionsEqual(a: SnapshotDimensions | null, b: SnapshotDimensions | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.defaultColWidth === b.defaultColWidth &&
    a.defaultRowHeight === b.defaultRowHeight &&
    a.rowHeaderWidth === b.rowHeaderWidth &&
    a.columnHeaderHeight === b.columnHeaderHeight &&
    a.zoomRatio === b.zoomRatio &&
    areDimensionMapsEqual(a.columnData, b.columnData, 'w') &&
    areDimensionMapsEqual(a.rowData, b.rowData, 'h')
  )
}

export function extractDimensionsFromSnapshot(
  snap: Record<string, unknown>,
  preferredSheetId?: string | null
): SnapshotDimensions | null {
  const sheetOrder = snap?.sheetOrder as string[] | undefined
  const sheets = snap?.sheets as Record<string, Record<string, unknown>> | undefined
  const firstSheetId = sheetOrder?.[0]
  let sheetSnap: Record<string, unknown> | undefined
  if (preferredSheetId && sheets?.[preferredSheetId]) {
    sheetSnap = sheets[preferredSheetId]
  } else if (firstSheetId && sheets) {
    sheetSnap = sheets[firstSheetId]
  } else if (sheets) {
    sheetSnap = Object.values(sheets)[0]
  }
  if (!sheetSnap) return null
  const rawCol = sheetSnap.columnData as Record<string | number, { w?: number; hd?: number }> | undefined
  const rawRow = sheetSnap.rowData as Record<string | number, { h?: number; hd?: number }> | undefined
  const rowHeader = sheetSnap.rowHeader as { width?: number } | undefined
  const columnHeader = sheetSnap.columnHeader as { height?: number } | undefined
  const zoomRatio = (sheetSnap.zoomRatio as number | undefined) ?? 1
  return {
    defaultColWidth: (sheetSnap.defaultColumnWidth as number | undefined) ?? CURSOR_OVERLAY_COL_WIDTH_PX,
    defaultRowHeight: (sheetSnap.defaultRowHeight as number | undefined) ?? CURSOR_OVERLAY_ROW_HEIGHT_PX,
    columnData: rawCol ?? {},
    rowData: rawRow ?? {},
    rowHeaderWidth: rowHeader?.width ?? CURSOR_OVERLAY_ROW_INDEX_WIDTH_PX,
    columnHeaderHeight: columnHeader?.height ?? CURSOR_OVERLAY_HEADER_HEIGHT_PX,
    zoomRatio
  }
}
