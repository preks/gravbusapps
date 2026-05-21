import { useCallback } from 'react'

import type { SpreadsheetMutationFacade } from '../core'
import type { SpreadsheetApp, SpreadsheetColumn } from '../types'

export interface UseSpreadsheetColumnLabelSyncParams {
  canEditWithLock: boolean
  activeSheetId: string
  activeSheetColumns: SpreadsheetColumn[]
  mutationFacade: SpreadsheetMutationFacade
  onSheetUpdate?: ((appId: string, sheetId: string, updates: Record<string, unknown>) => Promise<unknown>) | null
  onLocalAppUpdate?: ((updater: (app: SpreadsheetApp) => SpreadsheetApp) => void) | null
  onAppUpdate?: ((app: SpreadsheetApp) => unknown) | null
  applyLocalAppUpdate: (updater: (currentApp: SpreadsheetApp) => SpreadsheetApp) => void
  getActiveSessionRows: () => Record<string, unknown>[]
}

export interface UseSpreadsheetColumnLabelSyncResult {
  onBulkCollectionColumnLabelsUpdate: (updates: Array<{ columnId: string; newLabel: string }>) => Promise<void>
}

export function useSpreadsheetColumnLabelSync(
  params: UseSpreadsheetColumnLabelSyncParams
): UseSpreadsheetColumnLabelSyncResult {
  const {
    canEditWithLock,
    activeSheetId,
    activeSheetColumns,
    mutationFacade,
    onSheetUpdate,
    onLocalAppUpdate,
    onAppUpdate,
    applyLocalAppUpdate,
    getActiveSessionRows
  } = params

  const onBulkCollectionColumnLabelsUpdate = useCallback(
    async (updates: Array<{ columnId: string; newLabel: string }>) => {
      if (!canEditWithLock || updates.length === 0) return
      const byId = new Map(updates.map(update => [update.columnId, update.newLabel]))
      const nextColumns = activeSheetColumns.map(column => {
        const label = byId.get(column.id)
        if (label === undefined) return column
        return { ...column, label }
      })
      if (onSheetUpdate) {
        await mutationFacade.updateSheetMetadata(activeSheetId, { columns: nextColumns })
        return
      }
      if (onLocalAppUpdate || onAppUpdate) {
        applyLocalAppUpdate(currentApp => ({
          ...currentApp,
          sheets: currentApp.sheets.map(sheet =>
            sheet.id === activeSheetId ? { ...sheet, columns: nextColumns, data: getActiveSessionRows() } : sheet
          )
        }))
      }
    },
    [
      activeSheetColumns,
      activeSheetId,
      applyLocalAppUpdate,
      canEditWithLock,
      getActiveSessionRows,
      mutationFacade,
      onAppUpdate,
      onLocalAppUpdate,
      onSheetUpdate
    ]
  )

  return { onBulkCollectionColumnLabelsUpdate }
}
