import type { MutableRefObject } from 'react'

import type { UniverSheetGridHandle } from '../components/UniverSheetGrid.types'
import type { SpreadsheetApp, SpreadsheetColumn, SpreadsheetSheet } from '../types'
import { applyRemoteColumnUpdate } from '../utils/spreadsheetViewerRows'

export interface SpreadsheetRemoteColumnUpdateHandlerDeps {
  activeSheetId: string
  pendingColumnWidthOverrides: Record<string, number>
  appSheetsRef: MutableRefObject<SpreadsheetSheet[]>
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  onAppUpdate?: (app: SpreadsheetApp) => void
  onLocalAppUpdate?: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  spreadsheetGridRef: MutableRefObject<UniverSheetGridHandle | null>
  recentLocalColumnResizeRef: MutableRefObject<Map<string, { width: number; at: number }>>
  baselineColWidthsRef: MutableRefObject<Map<number, number>>
}

export function handleSpreadsheetRemoteColumnUpdate(
  data: Record<string, unknown>,
  deps: SpreadsheetRemoteColumnUpdateHandlerDeps
): void {
  const d = data as {
    sheetId?: string
    columnId?: string
    columnPatch?: Partial<SpreadsheetColumn>
    label?: string
    columns?: SpreadsheetColumn[]
    skipGridConversionContextSync?: boolean
  }
  const targetSheetId = typeof d.sheetId === 'string' ? d.sheetId : ''
  if (!targetSheetId) return
  const targetSheet = deps.appSheetsRef.current.find(sheet => sheet.id === targetSheetId)
  if (!targetSheet) return
  const nextWidth =
    typeof d.columnPatch?.width === 'number' && Number.isFinite(d.columnPatch.width)
      ? Math.round(d.columnPatch.width)
      : undefined
  const currentColumn = targetSheet.columns.find(column => column.id === d.columnId)
  const currentWidth =
    typeof currentColumn?.width === 'number' && Number.isFinite(currentColumn.width)
      ? Math.round(currentColumn.width)
      : undefined
  const pendingWidth =
    targetSheetId === deps.activeSheetId ? deps.pendingColumnWidthOverrides[d.columnId ?? ''] : undefined
  const localResizeKey = `${targetSheetId}:${d.columnId ?? ''}`
  const recentLocalResize = deps.recentLocalColumnResizeRef.current.get(localResizeKey)
  if (
    nextWidth != null &&
    (currentWidth === nextWidth ||
      Math.round(pendingWidth ?? NaN) === nextWidth ||
      (recentLocalResize && recentLocalResize.width === nextWidth && Date.now() - recentLocalResize.at < 5000))
  ) {
    return
  }
  const nextColumns = applyRemoteColumnUpdate(targetSheet.columns, d)
  if (!nextColumns || (!deps.onLocalAppUpdate && !deps.onAppUpdate)) return
  if (targetSheetId === deps.activeSheetId && d.skipGridConversionContextSync !== true) {
    deps.spreadsheetGridRef.current?.syncGridConversionContext?.(nextColumns)
  }
  deps.applyLocalAppUpdate(currentApp => ({
    ...currentApp,
    sheets: currentApp.sheets.map(sheet => (sheet.id === targetSheetId ? { ...sheet, columns: nextColumns } : sheet))
  }))
  if (targetSheetId === deps.activeSheetId && nextWidth != null) {
    let visibleIndex = 0
    let targetVisibleIndex: number | undefined
    for (const column of nextColumns) {
      if (column.isVisible === false) continue
      if (column.id === d.columnId) {
        targetVisibleIndex = visibleIndex
        break
      }
      visibleIndex += 1
    }
    if (targetVisibleIndex != null) {
      deps.baselineColWidthsRef.current.set(targetVisibleIndex, nextWidth)
      deps.spreadsheetGridRef.current?.applyRemoteDimensions?.({
        sheetId: targetSheetId,
        defaultColWidth: 0,
        defaultRowHeight: 0,
        columnData: { [String(targetVisibleIndex)]: { w: nextWidth } },
        rowData: {},
        rowHeaderWidth: 0,
        columnHeaderHeight: 0,
        zoomRatio: 0
      })
    }
  }
}
